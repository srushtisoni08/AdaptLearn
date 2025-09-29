// src/components/assessment/AssessmentComponent.jsx
import React, { useState } from 'react';
import { Award, Brain } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import apiService from '../../services/apiService';

const AssessmentComponent = () => {
    const { token } = useAppContext();
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [assessmentId, setAssessmentId] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState('');
    const [questionCount, setQuestionCount] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [finalScore, setFinalScore] = useState(null);
    const [loading, setLoading] = useState(false);
    const [startTime, setStartTime] = useState(null);

    const startAssessment = async () => {
        setLoading(true);
        try {
            const result = await apiService.startAssessment(token, { subject_id: 1 });
            setAssessmentId(result.assessment_id);
            setCurrentQuestion(result.question);
            setStartTime(Date.now());
            setQuestionCount(1);
        } catch (error) {
            console.error('Error starting assessment:', error);
        }
        setLoading(false);
    };

    const submitAnswer = async () => {
        if (!selectedAnswer) return;
        setLoading(true);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);

        try {
            const result = await apiService.submitAnswer(token, {
                assessment_id: assessmentId,
                question_id: currentQuestion.id,
                answer: selectedAnswer,
                time_taken: timeSpent,
            });

            if (result.assessment_completed) {
                setIsComplete(true);
                setFinalScore(result.score);
            } else {
                setCurrentQuestion(result.next_question);
                setQuestionCount((prev) => prev + 1);
                setSelectedAnswer('');
                setStartTime(Date.now());
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
        setLoading(false);
    };

    if (isComplete) {
        return (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
                <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Assessment Complete!</h2>
                <div className="text-6xl font-bold text-indigo-600 mb-4">{finalScore?.toFixed(0)}%</div>
                <p className="text-gray-600 mb-6">You answered {questionCount} questions.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Take Another Assessment
                </button>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
                <Brain className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Adaptive Assessment</h2>
                <p className="text-gray-600 mb-6">This assessment adapts to your skill level.</p>
                <button
                    onClick={startAssessment}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Starting...' : 'Start Assessment'}
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">{currentQuestion.text}</h3>
            <div className="space-y-3 mb-6">
                {currentQuestion.options?.map((option, idx) => (
                    <label
                        key={idx}
                        className={`block p-4 border rounded-lg cursor-pointer transition-colors ${selectedAnswer === option ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                    >
                        <input
                            type="radio"
                            name="answer"
                            value={option}
                            checked={selectedAnswer === option}
                            onChange={(e) => setSelectedAnswer(e.target.value)}
                            className="sr-only"
                        />
                        <span className="text-gray-900">{option}</span>
                    </label>
                ))}
            </div>
            <button
                onClick={submitAnswer}
                disabled={!selectedAnswer || loading}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
                {loading ? 'Submitting...' : 'Submit Answer'}
            </button>
        </div>
    );
};

export default AssessmentComponent;
