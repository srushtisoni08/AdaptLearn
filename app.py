from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from datetime import datetime, timedelta
import jwt
import json
from functools import wraps
import os
from dotenv import load_dotenv
from bson.objectid import ObjectId

# --- App Setup ---
app = Flask(__name__)
CORS(app)
load_dotenv()

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config["MONGO_URI"] = os.getenv("MONGO_URI") # e.g., "mongodb://localhost:27017/adaptlearn"

mongo = PyMongo(app)
bcrypt = Bcrypt(app)

# --- MongoDB Collections ---
# Instead of SQLAlchemy models, we define our collections.
users = mongo.db.users
students = mongo.db.students
teachers = mongo.db.teachers
parents = mongo.db.parents
subjects = mongo.db.subjects
chapters = mongo.db.chapters
questions = mongo.db.questions
assessments = mongo.db.assessments
assessment_responses = mongo.db.assessment_responses
practice_sessions = mongo.db.practice_sessions

# --- Helper Functions and Decorators ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            token = token.split(' ')[1]  # Remove 'Bearer ' prefix
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            # Fetch user by MongoDB's ObjectId
            current_user = users.find_one({'_id': ObjectId(data['user_id'])})
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
        except Exception as e:
            return jsonify({'message': f'Token is invalid: {str(e)}'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

def get_next_question(assessment_id, difficulty_level):
    """Get next question based on adaptive algorithm"""
    answered_responses = list(assessment_responses.find({'assessment_id': assessment_id}, {'question_id': 1}))
    answered_ids = [r['question_id'] for r in answered_responses]
    
    # Exclude answered questions and find one at the appropriate difficulty
    query = {
        'difficulty_level': difficulty_level,
        '_id': {'$nin': [ObjectId(q_id) for q_id in answered_ids]}
    }
    
    question = questions.find_one(query)
    
    if question:
        return {
            'id': str(question['_id']),
            'text': question['question_text'],
            'type': question['question_type'],
            'options': json.loads(question['options']) if question.get('options') else None,
            'skill_type': question['skill_type']
        }
    return None

def check_answer(question, student_answer):
    """Check if student answer is correct"""
    correct_answer = question['correct_answer']
    if question['question_type'] == 'multiple_choice':
        return student_answer.lower().strip() == correct_answer.lower().strip()
    elif question['question_type'] == 'true_false':
        return student_answer.lower() == correct_answer.lower()
    else:  # short_answer
        return student_answer.lower().strip() == correct_answer.lower().strip()

def complete_assessment(assessment):
    """Complete assessment and update student analytics"""
    assessment_id = assessment['_id']
    assessments.update_one({'_id': assessment_id}, {'$set': {
        'completed_at': datetime.utcnow(),
        'status': 'completed'
    }})

    # Calculate scores by skill type
    responses = list(assessment_responses.find({'assessment_id': str(assessment_id)}))
    skill_scores = {'listening': [], 'grasping': [], 'retention': [], 'application': []}

    for response in responses:
        question = questions.find_one({'_id': ObjectId(response['question_id'])})
        if question:
            skill = question['skill_type']
            skill_scores[skill].append(1 if response['is_correct'] else 0)

    # Update student profile
    student_profile = students.find_one({'_id': ObjectId(assessment['student_id'])})
    if not student_profile:
        return jsonify({'message': 'Student profile not found'}), 404

    # Use a dictionary to hold updates to the student document
    update_data = {}
    if skill_scores['listening']:
        update_data['listening_score'] = (sum(skill_scores['listening']) / len(skill_scores['listening'])) * 100
    if skill_scores['grasping']:
        update_data['grasping_score'] = (sum(skill_scores['grasping']) / len(skill_scores['grasping'])) * 100
    if skill_scores['retention']:
        update_data['retention_score'] = (sum(skill_scores['retention']) / len(skill_scores['retention'])) * 100
    if skill_scores['application']:
        update_data['application_score'] = (sum(skill_scores['application']) / len(skill_scores['application'])) * 100

    students.update_one({'_id': ObjectId(assessment['student_id'])}, {'$set': update_data})
    
    # Calculate and update overall score on the assessment document
    if responses:
        overall_score = sum(1 if r['is_correct'] else 0 for r in responses) / len(responses) * 100
        assessments.update_one({'_id': assessment_id}, {'$set': {'score': overall_score}})
    else:
        overall_score = 0.0

    return jsonify({
        'assessment_completed': True,
        'score': overall_score,
        'skill_breakdown': {
            'listening': update_data.get('listening_score', 50.0),
            'grasping': update_data.get('grasping_score', 50.0),
            'retention': update_data.get('retention_score', 50.0),
            'application': update_data.get('application_score', 50.0)
        }
    }), 200

def get_weak_areas(student_profile):
    """Identify weak areas for targeted practice"""
    scores = {
        'listening': student_profile.get('listening_score', 50),
        'grasping': student_profile.get('grasping_score', 50),
        'retention': student_profile.get('retention_score', 50),
        'application': student_profile.get('application_score', 50)
    }
    
    weak_areas = []
    for skill, score in scores.items():
        if score < 60:
            weak_areas.append({
                'skill': skill,
                'score': score,
                'severity': 'high' if score < 40 else 'medium'
            })
    return weak_areas

def calculate_attendance(student_id):
    """Calculate attendance rate based on assessment frequency"""
    recent_assessments_count = assessments.count_documents({
        'student_id': str(student_id),
        'started_at': {'$gte': datetime.utcnow() - timedelta(days=30)}
    })
    expected_assessments = 4  # 1 assessment per week
    return min((recent_assessments_count / expected_assessments) * 100, 100)

def get_progress_trend(student_id):
    """Get progress trend over time"""
    completed_assessments = list(assessments.find({
        'student_id': str(student_id),
        'status': 'completed'
    }).sort('completed_at', -1).limit(10))
    
    if len(completed_assessments) < 2:
        return 'stable'
    
    scores = [a.get('score', 0) for a in completed_assessments]
    recent_avg = sum(scores[:5]) / len(scores[:5])
    older_avg = sum(scores[5:]) / len(scores[5:]) if len(scores[5:]) > 0 else 0
    
    if recent_avg > older_avg + 5:
        return 'improving'
    elif recent_avg < older_avg - 5:
        return 'declining'
    else:
        return 'stable'

# --- Routes ---
@app.route('/')
def home():
    return {"message": "AdaptLearn API is running!"}

# --- Authentication Routes ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()

    required_fields = ['email', 'password', 'role', 'name']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required fields'}), 400

    email = data['email']
    role = data['role'].lower()

    if role not in ['student', 'teacher', 'parent']:
        return jsonify({'message': 'Invalid role specified'}), 400

    if users.find_one({"email": email}):
        return jsonify({'message': 'Email already registered'}), 400

    password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    user_doc = {
        'email': email,
        'password_hash': password_hash,
        'role': role,
        'name': data['name'],
        'created_at': datetime.utcnow()
    }
    result = users.insert_one(user_doc)
    user_id = result.inserted_id

    profile_doc = {'user_id': str(user_id)}

    if role == 'student':
        profile_doc.update({
            'grade': data.get('grade'),
            'school': data.get('school'),
            'listening_score': 50.0,
            'grasping_score': 50.0,
            'retention_score': 50.0,
            'application_score': 50.0,
            'overall_level': 1
        })
        students.insert_one(profile_doc)
    elif role == 'teacher':
        profile_doc.update({
            'school': data.get('school'),
            'subjects': data.get('subjects', []),
            'students_taught': []
        })
        teachers.insert_one(profile_doc)
        print(f"[INFO] Teacher registered: {email}")  # Debug log
    elif role == 'parent':
        parents.insert_one(profile_doc)

    return jsonify({'message': f'{role.capitalize()} registered successfully'}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = users.find_one({"email": data["email"]})
    
    if user and bcrypt.check_password_hash(user['password_hash'], data['password']):
        token = jwt.encode({
            'user_id': str(user['_id']),
            'role': user['role'],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {
                'id': str(user['_id']),
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401

# --- Assessment Routes ---
@app.route('/api/start-assessment', methods=['POST'])
@token_required
def start_assessment(current_user):
    if current_user['role'] != 'student':
        return jsonify({'message': 'Only students can take assessments'}), 403
    
    data = request.get_json()
    student_profile = students.find_one({'user_id': str(current_user['_id'])})
    
    assessment_doc = {
        'student_id': str(student_profile['_id']),
        'subject_id': data.get('subject_id'),
        'started_at': datetime.utcnow(),
        'completed_at': None,
        'current_level': 1,
        'score': 0.0,
        'status': 'in_progress'
    }
    result = assessments.insert_one(assessment_doc)
    assessment_id = result.inserted_id
    
    first_question = get_next_question(str(assessment_id), 1)
    
    return jsonify({
        'assessment_id': str(assessment_id),
        'question': first_question
    }), 200

@app.route('/api/submit-answer', methods=['POST'])
@token_required
def submit_answer(current_user):
    data = request.get_json()
    assessment_id = data['assessment_id']
    question_id = data['question_id']
    student_answer = data['answer']
    time_taken = data.get('time_taken', 0)
    
    assessment = assessments.find_one({'_id': ObjectId(assessment_id)})
    question = questions.find_one({'_id': ObjectId(question_id)})
    
    if not assessment or not question:
        return jsonify({'message': 'Assessment or question not found'}), 404
        
    is_correct = check_answer(question, student_answer)
    
    response_doc = {
        'assessment_id': assessment_id,
        'question_id': question_id,
        'student_answer': student_answer,
        'is_correct': is_correct,
        'time_taken': time_taken,
        'timestamp': datetime.utcnow()
    }
    assessment_responses.insert_one(response_doc)
    
    current_level = assessment['current_level']
    if is_correct:
        new_level = min(current_level + 1, 5)
    else:
        new_level = max(current_level - 1, 1)
    
    assessments.update_one({'_id': ObjectId(assessment_id)}, {'$set': {'current_level': new_level}})

    response_count = assessment_responses.count_documents({'assessment_id': assessment_id})
    if response_count >= 20:
        return complete_assessment(assessments.find_one({'_id': ObjectId(assessment_id)}))
    
    next_question = get_next_question(assessment_id, new_level)
    
    return jsonify({
        'is_correct': is_correct,
        'current_level': new_level,
        'next_question': next_question
    }), 200

# --- Student Analytics Routes ---
@app.route('/api/student/analytics', methods=['GET'])
@token_required
def get_student_analytics(current_user):
    if current_user['role'] != 'student':
        return jsonify({'message': 'Access denied'}), 403
    
    profile = students.find_one({'user_id': str(current_user['_id'])})
    if not profile:
        return jsonify({'message': 'Student profile not found'}), 404

    completed_assessments = list(assessments.find({'student_id': str(profile['_id']), 'status': 'completed'}).sort('completed_at', -1))
    
    recent_assessments = [{
        'id': str(a['_id']),
        'score': a.get('score', 0),
        'completed_at': a.get('completed_at').isoformat(),
        'subject': subjects.find_one({'_id': ObjectId(a.get('subject_id'))}).get('name', 'General') if a.get('subject_id') else 'General'
    } for a in completed_assessments[:5]]

    return jsonify({
        'skill_scores': {
            'listening': profile.get('listening_score', 50.0),
            'grasping': profile.get('grasping_score', 50.0),
            'retention': profile.get('retention_score', 50.0),
            'application': profile.get('application_score', 50.0)
        },
        'overall_level': profile.get('overall_level', 1),
        'total_assessments': len(completed_assessments),
        'recent_assessments': recent_assessments,
        'weak_areas': get_weak_areas(profile)
    }), 200

# --- Teacher Routes ---
@app.route('/api/teacher/students', methods=['GET'])
@token_required
def get_teacher_students(current_user):
    if current_user['role'] != 'teacher':
        return jsonify({'message': 'Access denied'}), 403
    
    teacher_profile = teachers.find_one({'user_id': str(current_user['_id'])})
    if not teacher_profile:
        return jsonify({'message': 'Teacher profile not found'}), 404
    
    # Assuming students are linked by a 'teacher_id' in their document
    teacher_id = str(teacher_profile['_id'])
    students_in_class = list(students.find({'teacher_id': teacher_id}))
    
    student_list = []
    for s_profile in students_in_class:
        user_info = users.find_one({'_id': ObjectId(s_profile['user_id'])})
        student_assessments = list(assessments.find({'student_id': str(s_profile['_id']), 'status': 'completed'}))
        student_list.append({
            'id': str(s_profile['_id']),
            'name': user_info['name'],
            'grade': s_profile.get('grade'),
            'skill_scores': {
                'listening': s_profile.get('listening_score', 50.0),
                'grasping': s_profile.get('grasping_score', 50.0),
                'retention': s_profile.get('retention_score', 50.0),
                'application': s_profile.get('application_score', 50.0)
            },
            'recent_assessment_count': len(student_assessments[-3:]),
            'weak_areas': get_weak_areas(s_profile)
        })

    return jsonify({'students': student_list}), 200

# --- Parent Routes ---
@app.route('/api/parent/children', methods=['GET'])
@token_required
def get_parent_children(current_user):
    if current_user['role'] != 'parent':
        return jsonify({'message': 'Access denied'}), 403
    
    parent_profile = parents.find_one({'user_id': str(current_user['_id'])})
    if not parent_profile:
        return jsonify({'message': 'Parent profile not found'}), 404
        
    # Assuming students are linked by a 'parent_id' in their document
    parent_id = str(parent_profile['_id'])
    children_profiles = list(students.find({'parent_id': parent_id}))

    children_list = []
    for child_profile in children_profiles:
        child_user_info = users.find_one({'_id': ObjectId(child_profile['user_id'])})
        children_list.append({
            'id': str(child_profile['_id']),
            'name': child_user_info['name'],
            'grade': child_profile.get('grade'),
            'school': child_profile.get('school'),
            'skill_scores': {
                'listening': child_profile.get('listening_score', 50.0),
                'grasping': child_profile.get('grasping_score', 50.0),
                'retention': child_profile.get('retention_score', 50.0),
                'application': child_profile.get('application_score', 50.0)
            },
            'attendance_rate': calculate_attendance(child_profile['_id']),
            'weak_areas': get_weak_areas(child_profile),
            'progress_trend': get_progress_trend(child_profile['_id'])
        })
    
    return jsonify({'children': children_list}), 200
    
# --- Practice Session Routes ---
@app.route('/api/start-practice', methods=['POST'])
@token_required
def start_practice(current_user):
    if current_user['role'] != 'student':
        return jsonify({'message': 'Only students can practice'}), 403
    
    data = request.get_json()
    student_profile = students.find_one({'user_id': str(current_user['_id'])})
    
    practice_session_doc = {
        'student_id': str(student_profile['_id']),
        'subject_id': data.get('subject_id'),
        'mode': data['mode'],
        'difficulty_level': data.get('difficulty_level'),
        'chapters': data.get('chapters', []),
        'started_at': datetime.utcnow(),
        'completed_at': None,
        'score': None
    }
    result = practice_sessions.insert_one(practice_session_doc)
    session_id = result.inserted_id
    
    return jsonify({
        'session_id': str(session_id),
        'message': 'Practice session started'
    }), 200

# --- Database Initialization ---
@app.route('/api/init-db', methods=['POST'])
def init_database():
    """Initialize database with sample data"""
    if subjects.find_one({}):
        return jsonify({'message': 'Database already initialized'}), 400

    math_subject_doc = {'name': 'Mathematics', 'description': 'Basic Mathematics'}
    science_subject_doc = {'name': 'Science', 'description': 'General Science'}

    math_id = subjects.insert_one(math_subject_doc).inserted_id
    science_id = subjects.insert_one(science_subject_doc).inserted_id
    
    algebra_chapter_doc = {'subject_id': str(math_id), 'name': 'Algebra', 'description': 'Basic Algebra'}
    geometry_chapter_doc = {'subject_id': str(math_id), 'name': 'Geometry', 'description': 'Basic Geometry'}
    
    algebra_id = chapters.insert_one(algebra_chapter_doc).inserted_id
    geometry_id = chapters.insert_one(geometry_chapter_doc).inserted_id

    questions_list = [
        {
            'chapter_id': str(algebra_id),
            'question_text': "What is 2 + 2?",
            'question_type': "multiple_choice",
            'options': json.dumps(["3", "4", "5", "6"]),
            'correct_answer': "4",
            'difficulty_level': 1,
            'skill_type': "grasping"
        },
        {
            'chapter_id': str(algebra_id),
            'question_text': "What is x if 2x + 4 = 10?",
            'question_type': "short_answer",
            'correct_answer': "3",
            'difficulty_level': 3,
            'skill_type': "application"
        }
    ]
    
    questions.insert_many(questions_list)
    
    return jsonify({'message': 'Database initialized successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True)