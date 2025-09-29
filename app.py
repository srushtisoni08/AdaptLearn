from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
import jwt
import random
import json
from functools import wraps
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:admin@localhost:5432/learn'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
CORS(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    role = db.Column(db.String(20), nullable=False)  # student, teacher, parent
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Specify which foreign key is used for each relationship
    student_profile = db.relationship('StudentProfile', backref='user', uselist=False, foreign_keys='StudentProfile.user_id')
    teacher_profile = db.relationship('TeacherProfile', backref='user', uselist=False, foreign_keys='TeacherProfile.user_id')
    parent_profile = db.relationship('ParentProfile', backref='user', uselist=False, foreign_keys='ParentProfile.user_id')

class StudentProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    grade = db.Column(db.String(10))
    school = db.Column(db.String(100))
    parent_id = db.Column(db.Integer, db.ForeignKey('parent_profile.id'))
    listening_score = db.Column(db.Float, default=50.0)
    grasping_score = db.Column(db.Float, default=50.0)
    retention_score = db.Column(db.Float, default=50.0)
    application_score = db.Column(db.Float, default=50.0)
    overall_level = db.Column(db.Integer, default=1)
    assessments = db.relationship('Assessment', backref='student', cascade='all, delete-orphan')
    practice_sessions = db.relationship('PracticeSession', backref='student', cascade='all, delete-orphan')

class TeacherProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    school = db.Column(db.String(100))
    subjects = db.Column(db.Text)  # JSON string of subjects
    
    # Relationships
    students = db.relationship('StudentProfile', secondary='teacher_student', backref='teachers')

class ParentProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    children = db.relationship('StudentProfile', backref='parent', cascade='all, delete-orphan')

# Association table for teacher-student relationship
teacher_student = db.Table('teacher_student',
    db.Column('teacher_id', db.Integer, db.ForeignKey('teacher_profile.id'), primary_key=True),
    db.Column('student_id', db.Integer, db.ForeignKey('student_profile.id'), primary_key=True)
)

class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    chapters = db.relationship('Chapter', backref='subject')

class Chapter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    questions = db.relationship('Question', backref='chapter')

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chapter_id = db.Column(db.Integer, db.ForeignKey('chapter.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(20))  # multiple_choice, true_false, short_answer
    options = db.Column(db.Text)  # JSON string for options
    correct_answer = db.Column(db.Text, nullable=False)
    difficulty_level = db.Column(db.Integer, default=1)  # 1-5 scale
    skill_type = db.Column(db.String(20))  # listening, grasping, retention, application
    
class Assessment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profile.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'))
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    current_level = db.Column(db.Integer, default=1)
    score = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='in_progress')  # in_progress, completed, abandoned
    
    responses = db.relationship('AssessmentResponse', backref='assessment')

class AssessmentResponse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessment.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    student_answer = db.Column(db.Text)
    is_correct = db.Column(db.Boolean)
    time_taken = db.Column(db.Integer)  # seconds
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    question = db.relationship('Question')

class PracticeSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profile.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'))
    mode = db.Column(db.String(20))  # adaptive, custom_difficulty, mixed_chapters
    difficulty_level = db.Column(db.Integer)
    chapters = db.Column(db.Text)  # JSON string of chapter IDs
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    score = db.Column(db.Float)
    
# JWT token decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            token = token.split(' ')[1]  # Remove 'Bearer ' prefix
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
        except:
            return jsonify({'message': 'Token is invalid'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/')
def home():
    return {"message": "AdaptLearn API is running!"}

# Authentication Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Check if user exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already registered'}), 400
    
    # Create user
    password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    user = User(
        email=data['email'],
        password_hash=password_hash,
        role=data['role'],
        name=data['name']
    )
    db.session.add(user)
    db.session.commit()
    
    # Create profile based on role
    if data['role'] == 'student':
        profile = StudentProfile(
            user_id=user.id,
            grade=data.get('grade'),
            school=data.get('school')
        )
        db.session.add(profile)
    elif data['role'] == 'teacher':
        profile = TeacherProfile(
            user_id=user.id,
            school=data.get('school'),
            subjects=json.dumps(data.get('subjects', []))
        )
        db.session.add(profile)
    elif data['role'] == 'parent':
        profile = ParentProfile(user_id=user.id)
        db.session.add(profile)
    
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if user and bcrypt.check_password_hash(user.password_hash, data['password']):
        token = jwt.encode({
            'user_id': user.id,
            'role': user.role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        
        return jsonify({
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role
            }
        }), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401

# Assessment Routes
@app.route('/api/start-assessment', methods=['POST'])
@token_required
def start_assessment(current_user):
    if current_user.role != 'student':
        return jsonify({'message': 'Only students can take assessments'}), 403
    
    data = request.get_json()
    assessment = Assessment(
        student_id=current_user.student_profile.id,
        subject_id=data.get('subject_id')
    )
    db.session.add(assessment)
    db.session.commit()
    
    # Get first question (easy level)
    first_question = get_next_question(assessment.id, 1)
    
    return jsonify({
        'assessment_id': assessment.id,
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
    
    # Get assessment and question
    assessment = Assessment.query.get(assessment_id)
    question = Question.query.get(question_id)
    
    # Check if answer is correct
    is_correct = check_answer(question, student_answer)
    
    # Save response
    response = AssessmentResponse(
        assessment_id=assessment_id,
        question_id=question_id,
        student_answer=student_answer,
        is_correct=is_correct,
        time_taken=time_taken
    )
    db.session.add(response)
    
    # Update assessment level and get next question
    if is_correct:
        assessment.current_level = min(assessment.current_level + 1, 5)
    else:
        assessment.current_level = max(assessment.current_level - 1, 1)
    
    db.session.commit()
    
    # Check if assessment should continue
    response_count = AssessmentResponse.query.filter_by(assessment_id=assessment_id).count()
    if response_count >= 20:  # End after 20 questions
        return complete_assessment(assessment)
    
    # Get next question
    next_question = get_next_question(assessment_id, assessment.current_level)
    
    return jsonify({
        'is_correct': is_correct,
        'current_level': assessment.current_level,
        'next_question': next_question
    }), 200

def get_next_question(assessment_id, difficulty_level):
    """Get next question based on adaptive algorithm"""
    # Get questions not yet answered in this assessment
    answered_questions = db.session.query(AssessmentResponse.question_id)\
        .filter_by(assessment_id=assessment_id).all()
    answered_ids = [q[0] for q in answered_questions]
    
    # Get question at appropriate difficulty level
    query = Question.query.filter(Question.difficulty_level == difficulty_level)
    if answered_ids:
        query = query.filter(~Question.id.in_(answered_ids))
    
    question = query.order_by(db.func.random()).first()
    
    if question:
        return {
            'id': question.id,
            'text': question.question_text,
            'type': question.question_type,
            'options': json.loads(question.options) if question.options else None,
            'skill_type': question.skill_type
        }
    return None

def check_answer(question, student_answer):
    """Check if student answer is correct"""
    if question.question_type == 'multiple_choice':
        return student_answer.lower().strip() == question.correct_answer.lower().strip()
    elif question.question_type == 'true_false':
        return student_answer.lower() == question.correct_answer.lower()
    else:  # short_answer
        # Simple text matching - can be enhanced with NLP
        return student_answer.lower().strip() in question.correct_answer.lower()

def complete_assessment(assessment):
    """Complete assessment and update student analytics"""
    assessment.completed_at = datetime.utcnow()
    assessment.status = 'completed'
    
    # Calculate scores by skill type
    responses = AssessmentResponse.query.filter_by(assessment_id=assessment.id).all()
    skill_scores = {'listening': [], 'grasping': [], 'retention': [], 'application': []}
    
    for response in responses:
        skill = response.question.skill_type
        skill_scores[skill].append(1 if response.is_correct else 0)
    
    # Update student profile
    student = assessment.student
    if skill_scores['listening']:
        student.listening_score = sum(skill_scores['listening']) / len(skill_scores['listening']) * 100
    if skill_scores['grasping']:
        student.grasping_score = sum(skill_scores['grasping']) / len(skill_scores['grasping']) * 100
    if skill_scores['retention']:
        student.retention_score = sum(skill_scores['retention']) / len(skill_scores['retention']) * 100
    if skill_scores['application']:
        student.application_score = sum(skill_scores['application']) / len(skill_scores['application']) * 100
    
    # Calculate overall score
    overall_score = sum(1 if r.is_correct else 0 for r in responses) / len(responses) * 100
    assessment.score = overall_score
    
    db.session.commit()
    
    return jsonify({
        'assessment_completed': True,
        'score': overall_score,
        'skill_breakdown': {
            'listening': student.listening_score,
            'grasping': student.grasping_score,
            'retention': student.retention_score,
            'application': student.application_score
        }
    }), 200

# Student Analytics Routes
@app.route('/api/student/analytics', methods=['GET'])
@token_required
def get_student_analytics(current_user):
    if current_user.role != 'student':
        return jsonify({'message': 'Access denied'}), 403
    
    profile = current_user.student_profile
    assessments = Assessment.query.filter_by(student_id=profile.id, status='completed').all()
    
    return jsonify({
        'skill_scores': {
            'listening': profile.listening_score,
            'grasping': profile.grasping_score,
            'retention': profile.retention_score,
            'application': profile.application_score
        },
        'overall_level': profile.overall_level,
        'total_assessments': len(assessments),
        'recent_assessments': [
            {
                'id': a.id,
                'score': a.score,
                'completed_at': a.completed_at.isoformat(),
                'subject': a.subject.name if a.subject else 'General'
            } for a in assessments[-5:]  # Last 5 assessments
        ],
        'weak_areas': get_weak_areas(profile)
    }), 200

def get_weak_areas(student_profile):
    """Identify weak areas for targeted practice"""
    scores = {
        'listening': student_profile.listening_score,
        'grasping': student_profile.grasping_score,
        'retention': student_profile.retention_score,
        'application': student_profile.application_score
    }
    
    weak_areas = []
    for skill, score in scores.items():
        if score < 60:  # Threshold for weak areas
            weak_areas.append({
                'skill': skill,
                'score': score,
                'severity': 'high' if score < 40 else 'medium'
            })
    
    return weak_areas

# Teacher Routes
@app.route('/api/teacher/students', methods=['GET'])
@token_required
def get_teacher_students(current_user):
    if current_user.role != 'teacher':
        return jsonify({'message': 'Access denied'}), 403
    
    students = current_user.teacher_profile.students
    
    return jsonify({
        'students': [
            {
                'id': s.id,
                'name': s.user.name,
                'grade': s.grade,
                'skill_scores': {
                    'listening': s.listening_score,
                    'grasping': s.grasping_score,
                    'retention': s.retention_score,
                    'application': s.application_score
                },
                'recent_assessment_count': len(s.assessments[-3:]),
                'weak_areas': get_weak_areas(s)
            } for s in students
        ]
    }), 200

# Parent Routes
@app.route('/api/parent/children', methods=['GET'])
@token_required
def get_parent_children(current_user):
    if current_user.role != 'parent':
        return jsonify({'message': 'Access denied'}), 403
    
    children = current_user.parent_profile.children
    
    return jsonify({
        'children': [
            {
                'id': child.id,
                'name': child.user.name,
                'grade': child.grade,
                'school': child.school,
                'skill_scores': {
                    'listening': child.listening_score,
                    'grasping': child.grasping_score,
                    'retention': child.retention_score,
                    'application': child.application_score
                },
                'attendance_rate': calculate_attendance(child),
                'weak_areas': get_weak_areas(child),
                'progress_trend': get_progress_trend(child)
            } for child in children
        ]
    }), 200

def calculate_attendance(student):
    """Calculate attendance rate based on assessment frequency"""
    # This is a simplified calculation - in real implementation,
    # you'd track actual attendance data
    recent_assessments = Assessment.query.filter(
        Assessment.student_id == student.id,
        Assessment.created_at >= datetime.utcnow() - timedelta(days=30)
    ).count()
    
    # Assume 1 assessment per week is good attendance
    expected_assessments = 4  # 4 weeks
    return min((recent_assessments / expected_assessments) * 100, 100)

def get_progress_trend(student):
    """Get progress trend over time"""
    assessments = Assessment.query.filter_by(
        student_id=student.id, 
        status='completed'
    ).order_by(Assessment.completed_at.desc()).limit(10).all()
    
    if len(assessments) < 2:
        return 'stable'
    
    recent_avg = sum(a.score for a in assessments[:5]) / 5
    older_avg = sum(a.score for a in assessments[5:]) / len(assessments[5:])
    
    if recent_avg > older_avg + 5:
        return 'improving'
    elif recent_avg < older_avg - 5:
        return 'declining'
    else:
        return 'stable'

# Practice Session Routes
@app.route('/api/start-practice', methods=['POST'])
@token_required
def start_practice(current_user):
    if current_user.role != 'student':
        return jsonify({'message': 'Only students can practice'}), 403
    
    data = request.get_json()
    practice_session = PracticeSession(
        student_id=current_user.student_profile.id,
        subject_id=data.get('subject_id'),
        mode=data['mode'],
        difficulty_level=data.get('difficulty_level'),
        chapters=json.dumps(data.get('chapters', []))
    )
    db.session.add(practice_session)
    db.session.commit()
    
    return jsonify({
        'session_id': practice_session.id,
        'message': 'Practice session started'
    }), 200

# Initialize database
@app.route('/api/init-db', methods=['POST'])
def init_database():
    """Initialize database with sample data"""
    db.create_all()
    
    # Add sample subjects and chapters
    if not Subject.query.first():
        math_subject = Subject(name='Mathematics', description='Basic Mathematics')
        science_subject = Subject(name='Science', description='General Science')
        
        db.session.add(math_subject)
        db.session.add(science_subject)
        db.session.commit()
        
        # Add chapters
        algebra_chapter = Chapter(subject_id=math_subject.id, name='Algebra', description='Basic Algebra')
        geometry_chapter = Chapter(subject_id=math_subject.id, name='Geometry', description='Basic Geometry')
        
        db.session.add(algebra_chapter)
        db.session.add(geometry_chapter)
        db.session.commit()
        
        # Add sample questions
        questions = [
            Question(
                chapter_id=algebra_chapter.id,
                question_text="What is 2 + 2?",
                question_type="multiple_choice",
                options='["3", "4", "5", "6"]',
                correct_answer="4",
                difficulty_level=1,
                skill_type="grasping"
            ),
            Question(
                chapter_id=algebra_chapter.id,
                question_text="What is x if 2x + 4 = 10?",
                question_type="short_answer",
                correct_answer="3",
                difficulty_level=3,
                skill_type="application"
            )
        ]
        
        for question in questions:
            db.session.add(question)
        
        db.session.commit()
    
    return jsonify({'message': 'Database initialized successfully'}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)