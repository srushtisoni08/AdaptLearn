import React, { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';
import AppContext from './context/AppContext';
import apiService from './services/apiService';

// Components
import LoginForm from './components/LoginForm';
import Navigation from './components/Navigation';
import StudentDashboard from './components/dashboard/StudentDashboard';
import TeacherDashboard from './components/dashboard/TeacherDashboard';
import ParentDashboard from './components/dashboard/ParentDashboard';
import AssessmentComponent from './components/assessment/AssessmentComponent';

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check for stored authentication
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    // Initialize database
    const initDB = async () => {
      try {
        await apiService.initDatabase();
      } catch (error) {
        console.error('Database initialization error:', error);
      }
      setIsInitialized(true);
    };

    initDB();
  }, []);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    if (!user) return null;

    switch (user.role) {
      case 'student':
        if (currentView === 'assessment') return <AssessmentComponent />;
        return <StudentDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      case 'parent':
        return <ParentDashboard />;
      default:
        return <div>Invalid user role</div>;
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing platform...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <AppContext.Provider value={{ user, token, currentView, setCurrentView }}>
      <div className="min-h-screen bg-gray-50">
        <Navigation
          user={user}
          currentView={currentView}
          setCurrentView={setCurrentView}
          onLogout={handleLogout}
        />
        <main className="max-w-7xl mx-auto py-6 px-4">
          {renderContent()}
        </main>
      </div>
    </AppContext.Provider>
  );
};

export default App;
