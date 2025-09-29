// src/components/dashboard/ParentDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Award, Eye, Brain, BookOpen, Target } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import apiService from '../../services/apiService';

const ParentDashboard = () => {
    const { token } = useAppContext();
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const data = await apiService.getParentChildren(token);
                setChildren(data.children || []);
            } catch (error) {
                console.error('Error fetching children:', error);
            }
            setLoading(false);
        };
        fetchChildren();
    }, [token]);

    if (loading) return <div>Loading...</div>;

    const getTrendIcon = (trend) => {
        if (trend === 'improving') return <TrendingUp className="w-5 h-5 text-green-500" />;
        if (trend === 'declining') return <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />;
        return <TrendingUp className="w-5 h-5 text-gray-500 rotate-90" />;
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            {children.map((child) => (
                <div key={child.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">{child.name}</h3>
                            <p className="text-gray-600">{child.grade} • {child.school}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-indigo-600">{child.attendance_rate.toFixed(0)}%</div>
                                <div className="text-sm text-gray-600">Attendance</div>
                            </div>
                            <div className="flex items-center space-x-1">
                                {getTrendIcon(child.progress_trend)}
                                <span className="text-sm text-gray-600 capitalize">{child.progress_trend}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Skill Scores</h4>
                            {[
                                { name: 'Listening', score: child.skill_scores.listening, icon: <Eye /> },
                                { name: 'Grasping', score: child.skill_scores.grasping, icon: <Brain /> },
                                { name: 'Retention', score: child.skill_scores.retention, icon: <BookOpen /> },
                                { name: 'Application', score: child.skill_scores.application, icon: <Target /> },
                            ].map((skill, idx) => (
                                <div key={idx} className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">{skill.icon}<span>{skill.name}</span></div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-32 bg-gray-200 h-2 rounded-full">
                                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${skill.score}%` }}></div>
                                        </div>
                                        <span className={getScoreColor(skill.score)}>{skill.score.toFixed(0)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Areas Needing Attention</h4>
                            {child.weak_areas.length > 0 ? (
                                child.weak_areas.map((area, idx) => (
                                    <div key={idx} className={`p-3 rounded-lg border ${area.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'} mb-2`}>
                                        <div className="flex justify-between">
                                            <span className="capitalize font-medium">{area.skill}</span>
                                            <span className="px-2 py-1 rounded text-xs font-medium">{area.severity} priority</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">Current score: {area.score.toFixed(0)}%</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Award className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                    <p className="text-gray-600">Great job! No weak areas identified.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ParentDashboard;
