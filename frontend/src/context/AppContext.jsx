import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/apiService';

const AppContext = createContext();

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [currentView, setCurrentView] = useState('dashboard');
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Load stored auth data
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
            } finally {
                setIsInitialized(true);
            }
        };

        initDB();
    }, []);

    const handleLogin = (userData, userToken) => {
        setUser(userData);
        setToken(userToken);
        setCurrentView('dashboard');
        localStorage.setItem('token', userToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        setToken(null);
        setCurrentView('dashboard');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AppContext.Provider
            value={{
                user,
                token,
                currentView,
                setCurrentView,
                isInitialized,
                handleLogin,
                handleLogout
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export default AppContext;