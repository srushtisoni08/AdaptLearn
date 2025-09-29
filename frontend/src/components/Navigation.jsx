// src/components/Navigation.jsx
import React from 'react';
import { Home, Play, BookOpen, Users, TrendingUp, Lightbulb, User, LogOut, Brain } from 'lucide-react';

const Navigation = ({ user, currentView, setCurrentView, onLogout }) => {
    const navItems = {
        student: [
            { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
            { id: 'assessment', label: 'Take Assessment', icon: <Play className="w-5 h-5" /> },
            { id: 'practice', label: 'Practice', icon: <BookOpen className="w-5 h-5" /> }
        ],
        teacher: [
            { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
            { id: 'students', label: 'Students', icon: <Users className="w-5 h-5" /> },
            { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-5 h-5" /> }
        ],
        parent: [
            { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
            { id: 'children', label: 'My Children', icon: <Users className="w-5 h-5" /> }
        ]
    };

    const items = navItems[user.role] || [];

    return (
        <nav className="bg-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center space-x-2">
                        <Brain className="w-8 h-8 text-indigo-600" />
                        <span className="text-xl font-bold text-gray-900">AdaptLearn</span>
                    </div>

                    <div className="flex items-center space-x-8">
                        {items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setCurrentView(item.id)}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === item.id ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <User className="w-5 h-5 text-gray-600" />
                            <span className="text-sm text-gray-700">{user.name}</span>
                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full capitalize">{user.role}</span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
