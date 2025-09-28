// =====================
// Student Data
// =====================
const students = {
    Ram: {
        name: "Ram Kumar",
        proficiency: { Listening: 52, Grasping: 53, Retention: 51, Application: 54 },
        history: [],
        performance: "Good"
    },
    Shyam: {
        name: "Shyam Patel",
        proficiency: { Listening: 50, Grasping: 52, Retention: 47, Application: 50 },
        history: [],
        performance: "Average"
    },
    Sanga: {
        name: "Sanga Singh",
        proficiency: { Listening: 50, Grasping: 47, Retention: 50, Application: 46 },
        history: [],
        performance: "Needs Improvement"
    }
};

// =====================
// Question Bank
// =====================
const questionBank = [
    {
        id: 1,
        fundamental: "Grasping",
        difficulty: 40,
        topic: "Time & Distance",
        text: "If a car travels 120 km in 2 hours, what is its average speed?",
        options: ["40 km/h", "60 km/h", "80 km/h", "100 km/h"],
        correct: 1,
        explanation: "Speed = Distance ÷ Time = 120 km ÷ 2 hours = 60 km/h"
    },
    {
        id: 2,
        fundamental: "Application",
        difficulty: 65,
        topic: "Time & Distance",
        text: "A train leaves station A at 10 AM traveling at 80 km/h. Another train leaves station B at 11 AM traveling toward A at 60 km/h. If the distance between stations is 420 km, at what time do they meet?",
        options: ["1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM"],
        correct: 2,
        explanation: "When the second train starts, the first has traveled 80 km. Remaining distance: 340 km. Combined speed: 140 km/h. Time to meet ≈ 2 hours 26 min → 1:30 PM"
    },
    {
        id: 3,
        fundamental: "Retention",
        difficulty: 55,
        topic: "Time & Distance",
        text: "What is the formula for calculating distance when speed and time are known?",
        options: ["Distance = Speed × Time", "Distance = Speed ÷ Time", "Distance = Time ÷ Speed", "Distance = Speed + Time"],
        correct: 0,
        explanation: "Distance = Speed × Time"
    },
    {
        id: 4,
        fundamental: "Listening",
        difficulty: 45,
        topic: "Time & Distance",
        text: "Listen carefully: A cyclist travels 15 km in the first hour, then 20 km in the second hour. What is the total distance covered?",
        options: ["30 km", "35 km", "40 km", "25 km"],
        correct: 1,
        explanation: "Total distance = 15 km + 20 km = 35 km"
    },
    {
        id: 5,
        fundamental: "Application",
        difficulty: 30,
        topic: "Time & Distance",
        text: "A person walks 4 km north, then 3 km east. What is the straight-line distance from the starting point?",
        options: ["5 km", "6 km", "7 km", "8 km"],
        correct: 0,
        explanation: "Using Pythagorean theorem: √(4² + 3²) = 5 km"
    }
];

// =====================
// Assessment State
// =====================
let currentStudent = null;
let currentQuestionIndex = 0;
let currentQuestion = null;
let selectedAnswer = null;
let assessmentResults = [];

// =====================
// Tab Switching
// =====================
function switchTab(tabName, evt) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    if (evt) evt.target.classList.add('active');

    if (tabName === 'analytics') {
        setTimeout(renderCharts, 100);
    }
}

// =====================
// Student Dashboard
// =====================
function selectStudent(studentName) {
    const student = students[studentName];
    const recommendations = document.getElementById('student-recommendations');

    const proficiencies = student.proficiency;
    const weakest = Object.keys(proficiencies).reduce((a, b) =>
        proficiencies[a] < proficiencies[b] ? a : b
    );

    const recommendationText = {
        Listening: "Practice active listening exercises, take notes during lessons, and minimize distractions during study time.",
        Grasping: "Work with visual aids, ask more questions, and break complex concepts into smaller parts.",
        Retention: "Use spaced repetition, create flashcards, and practice regular review sessions.",
        Application: "Solve more practice problems, work on real-world examples, and connect concepts to daily life."
    };

    recommendations.innerHTML = `
        <div class="recommendation-item animate-in">
            <h3>${student.name}'s Learning Profile</h3>
            <p><strong>Overall Performance:</strong> ${student.performance}</p>
            <p><strong>Strongest Area:</strong> ${Object.keys(proficiencies).reduce((a, b) => 
                proficiencies[a] > proficiencies[b] ? a : b
            )} (${Math.round(Math.max(...Object.values(proficiencies)))}%)</p>
            <p><strong>Area for Improvement:</strong> ${weakest} (${Math.round(proficiencies[weakest])}%)</p>
            <p><strong>Personalized Recommendation:</strong> ${recommendationText[weakest]}</p>
            <div style="margin-top: 15px;">
                <button class="btn btn-primary" onclick="document.getElementById('student-select').value='${studentName}'; switchTab('assessment')">Start Assessment</button>
                <button class="btn btn-secondary" onclick="switchTab('practice')">Practice Mode</button>
            </div>
        </div>
    `;
}

// =====================
// Assessment Functions
// =====================
function startAssessment() {
    const studentName = document.getElementById('student-select').value;
    if (!studentName) {
        alert('Please select a student first!');
        return;
    }

    currentStudent = studentName;
    currentQuestionIndex = 0;
    assessmentResults = [];

    document.getElementById('assessment-start').style.display = 'none';
    document.getElementById('current-question').style.display = 'block';

    loadNextQuestion();
}

function getAdaptiveQuestion() {
    const student = students[currentStudent];
    const fundamentals = Object.keys(student.proficiency);

    const weakestFundamental = fundamentals.reduce((a, b) => 
        student.proficiency[a] < student.proficiency[b] ? a : b
    );

    let targetDifficulty = student.proficiency[weakestFundamental];
    const recentAnswers = assessmentResults.slice(-3);
    if (recentAnswers.length > 0) {
        const recentCorrect = recentAnswers.filter(r => r.correct).length;
        const recentRate = recentCorrect / recentAnswers.length;

        if (recentRate > 0.7) targetDifficulty += 10;
        else if (recentRate < 0.3) targetDifficulty -= 10;
    }

    targetDifficulty = Math.max(20, Math.min(80, targetDifficulty));

    const suitableQuestions = questionBank.filter(q =>
        Math.abs(q.difficulty - targetDifficulty) <= 15 &&
        (q.fundamental === weakestFundamental || Math.random() < 0.3)
    );

    return suitableQuestions.length > 0 ?
        suitableQuestions[Math.floor(Math.random() * suitableQuestions.length)] :
        questionBank[0];
}

function loadNextQuestion() {
    if (currentQuestionIndex >= 10) {
        completeAssessment();
        return;
    }

    currentQuestion = getAdaptiveQuestion();
    selectedAnswer = null;

    document.getElementById('question-fundamental').textContent = `Fundamental: ${currentQuestion.fundamental}`;
    document.getElementById('question-difficulty').textContent = `Difficulty: ${currentQuestion.difficulty}%`;
    document.getElementById('question-progress').textContent = `Question ${currentQuestionIndex + 1} of 10`;
    document.getElementById('question-text').textContent = currentQuestion.text;

    const optionsContainer = document.getElementById('answer-options');
    optionsContainer.innerHTML = '';
    currentQuestion.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'answer-option';
        optionDiv.textContent = option;
        optionDiv.onclick = () => selectAnswer(index);
        optionsContainer.appendChild(optionDiv);
    });

    document.getElementById('submit-answer').disabled = true;
    document.getElementById('next-question').style.display = 'none';
    document.getElementById('question-feedback').style.display = 'none';
    document.getElementById('current-question').classList.add('animate-in');
}

function selectAnswer(answerIndex) {
    selectedAnswer = answerIndex;
    document.querySelectorAll('.answer-option').forEach((option, index) => {
        option.classList.remove('selected');
        if (index === answerIndex) option.classList.add('selected');
    });
    document.getElementById('submit-answer').disabled = false;
}

function submitAnswer() {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === currentQuestion.correct;
    const student = students[currentStudent];

    assessmentResults.push({
        questionId: currentQuestion.id,
        fundamental: currentQuestion.fundamental,
        difficulty: currentQuestion.difficulty,
        correct: isCorrect,
        timeTaken: Date.now()
    });

    if (isCorrect) student.proficiency[currentQuestion.fundamental] = Math.min(100, student.proficiency[currentQuestion.fundamental] + 2);
    else student.proficiency[currentQuestion.fundamental] = Math.max(0, student.proficiency[currentQuestion.fundamental] - 1);

    const feedbackDiv = document.getElementById('question-feedback');
    feedbackDiv.style.display = 'block';
    feedbackDiv.className = isCorrect ? 'feedback-section' : 'feedback-section incorrect';
    feedbackDiv.innerHTML = `
        <h4>${isCorrect ? '✅ Correct!' : '❌ Incorrect'}</h4>
        <p><strong>Explanation:</strong> ${currentQuestion.explanation}</p>
        ${!isCorrect ? `<p><strong>Correct Answer:</strong> ${currentQuestion.options[currentQuestion.correct]}</p>` : ''}
    `;

    document.querySelectorAll('.answer-option').forEach((option, index) => {
        if (index === currentQuestion.correct) option.classList.add('correct');
        else if (index === selectedAnswer && !isCorrect) option.classList.add('incorrect');
        option.style.pointerEvents = 'none';
    });

    document.getElementById('submit-answer').style.display = 'none';
    document.getElementById('next-question').style.display = 'inline-block';
}

function nextQuestion() {
    currentQuestionIndex++;
    loadNextQuestion();
}

// =====================
// Complete Assessment
// =====================
function completeAssessment() {
    const student = students[currentStudent];
    const totalCorrect = assessmentResults.filter(r => r.correct).length;
    const accuracy = Math.round((totalCorrect / assessmentResults.length) * 100);

    const fundamentalPerformance = {};
    Object.keys(student.proficiency).forEach(f => {
        const results = assessmentResults.filter(r => r.fundamental === f);
        fundamentalPerformance[f] = results.length ? Math.round(results.filter(r => r.correct).length / results.length * 100) : 0;
    });

    const avgProficiency = Object.values(student.proficiency).reduce((a,b)=>a+b,0)/4;
    student.performance = avgProficiency >= 60 ? "Excellent" : avgProficiency >= 50 ? "Good" : avgProficiency >= 40 ? "Average" : "Needs Improvement";

    document.getElementById('current-question').style.display = 'none';
    document.getElementById('assessment-complete').style.display = 'block';

    document.getElementById('final-results').innerHTML = `
        <div class="animate-in">
            <h4>Assessment Results for ${student.name}</h4>
                        <div style="margin-top:10px;">
                <p><strong>Total Questions Correct:</strong> ${totalCorrect} / ${assessmentResults.length}</p>
                <p><strong>Accuracy:</strong> ${accuracy}%</p>
                <h5>Proficiency by Fundamental:</h5>
                <ul>
                    ${Object.keys(fundamentalPerformance).map(f => `<li>${f}: ${fundamentalPerformance[f]}%</li>`).join('')}
                </ul>
                <p><strong>Overall Performance:</strong> ${student.performance}</p>
            </div>
            <button class="btn btn-primary" onclick="switchTab('analytics')">View Analytics</button>
        </div>
    `;

    // Reset assessment UI for next time
    document.getElementById('submit-answer').style.display = 'inline-block';
    document.getElementById('next-question').style.display = 'none';
    document.getElementById('assessment-start').style.display = 'block';
}

// =====================
// Analytics Charts
// =====================
function renderCharts() {
    const student = currentStudent ? students[currentStudent] : null;
    if (!student) return;

    const chartContainer = document.getElementById('analytics-charts');
    chartContainer.innerHTML = ''; // Clear previous charts

    // Simple bar chart using divs
    Object.keys(student.proficiency).forEach(f => {
        const barWrapper = document.createElement('div');
        barWrapper.className = 'chart-bar-wrapper';
        const barLabel = document.createElement('div');
        barLabel.textContent = f;
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.width = `${student.proficiency[f]}%`;
        bar.textContent = `${student.proficiency[f]}%`;

        barWrapper.appendChild(barLabel);
        barWrapper.appendChild(bar);
        chartContainer.appendChild(barWrapper);
    });
}

