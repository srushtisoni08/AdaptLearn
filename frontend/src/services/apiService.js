// src/services/apiService.js

const API_BASE_URL = 'http://localhost:5000/api';

const apiService = {
    async login(credentials) {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        return response.json();
    },

    async register(userData) {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        return response.json();
    },

    async getStudentAnalytics(token) {
        const response = await fetch(`${API_BASE_URL}/student/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.json();
    },

    async startAssessment(token, data) {
        const response = await fetch(`${API_BASE_URL}/start-assessment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    async submitAnswer(token, data) {
        const response = await fetch(`${API_BASE_URL}/submit-answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    async getTeacherStudents(token) {
        const response = await fetch(`${API_BASE_URL}/teacher/students`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.json();
    },

    async getParentChildren(token) {
        const response = await fetch(`${API_BASE_URL}/parent/children`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.json();
    },

    async initDatabase() {
        const response = await fetch(`${API_BASE_URL}/init-db`, {
            method: 'POST',
        });
        return response.json();
    }
};

export default apiService;
