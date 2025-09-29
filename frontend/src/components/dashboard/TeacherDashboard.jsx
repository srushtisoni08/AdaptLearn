// src/components/dashboard/TeacherDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Lightbulb } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import apiService from '../../services/apiService';

const TeacherDashboard = () => {
    const { user, token } = useAppContext();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const data = await apiService.getTeacherStudents(token);
                setStudents(data.students || []);
            } catch (error) {
                console.error('Error fetching students:', error);
            }
            setLoading(false);
        };
        fetchStudents();
    }, [token]);

    if (loading) return <div>Loading...</div>;

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Teacher Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 rounded-lg p-6 text-center">
                        <Users className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900">{students.length}</div>
                        <div className="text-gray-600">Total Students</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-6 text-center">
                        <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900">
                            {students.filter((s) => s.recent_assessment_count > 0).length}
                        </div>
                        <div className="text-gray-600">Active This Week</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-6 text-center">
                        <Lightbulb className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900">
                            {students.reduce((sum, s) => sum + s.weak_areas.length, 0)}
                        </div>
                        <div className="text-gray-600">Areas Needing Help</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listening</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grasping</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retention</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weak Areas</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((student) => (
                            <tr key={student.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                        <div className="text-sm text-gray-500">{student.grade}</div>
                                    </div>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${getScoreColor(student.skill_scores.listening)}`}>
                                    {student.skill_scores.listening.toFixed(0)}%
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${getScoreColor(student.skill_scores.grasping)}`}>
                                    {student.skill_scores.grasping.toFixed(0)}%
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${getScoreColor(student.skill_scores.retention)}`}>
                                    {student.skill_scores.retention.toFixed(0)}%
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap ${getScoreColor(student.skill_scores.application)}`}>
                                    {student.skill_scores.application.toFixed(0)}%
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {student.weak_areas.map((area, idx) => (
                                            <span
                                                key={idx}
                                                className={`px-2 py-1 text-xs rounded-full ${area.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                            >
                                                {area.skill}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeacherDashboard;
