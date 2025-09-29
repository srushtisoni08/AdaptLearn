// src/components/dashboard/StudentDashboard.jsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Brain, BookOpen, Target, Award } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import apiService from '../../services/apiService';

const StudentDashboard = () => {
    const { user, token } = useAppContext();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const data = await apiService.getStudentAnalytics(token);
                setAnalytics(data);
            } catch (error) {
                console.error('Error fetching analytics:', error);
            }
            setLoading(false);
        };
        fetchAnalytics();
    }, [token]);

    if (loading) return <div>Loading...</div>;

    const skillData = analytics
        ? [
            { name: 'Listening', score: analytics.skill_scores.listening, icon: <Eye /> },
            { name: 'Grasping', score: analytics.skill_scores.grasping, icon: <Brain /> },
            { name: 'Retention', score: analytics.skill_scores.retention, icon: <BookOpen /> },
            { name: 'Application', score: analytics.skill_scores.application, icon: <Target /> },
        ]
        : [];

    const chartData = skillData.map((skill) => ({ name: skill.name, score: skill.score }));

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome back, {user.name}!</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {skillData.map((skill, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    {skill.icon}
                                    <span className="font-medium text-gray-700">{skill.name}</span>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getScoreColor(skill.score)}`}>
                                    {skill.score.toFixed(0)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${skill.score}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills Overview</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="score" fill="#4F46E5" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default StudentDashboard;
