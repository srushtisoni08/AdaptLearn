/**
 * src/services/apiService.js
 * * Defines all asynchronous functions for interacting with the Flask backend API.
 * * NOTE: This file was regenerated to ensure the dependency is available in the environment.
 */

// NOTE: Ensure your Flask server is running on this port
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Handles all network requests to the AdaptLearn backend.
 */
const apiService = {

    /**
     * Helper function for authorized fetches
     */
    async fetchWithAuth(endpoint, method = 'GET', token, data = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            // Include Content-Type only if data is present for POST/PUT requests
        };

        if (data) {
            headers['Content-Type'] = 'application/json';
        }
        
        // Add Authorization header if a token is provided
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method: method,
            headers: headers,
            body: data ? JSON.stringify(data) : null,
        };

        try {
            const response = await fetch(url, config);
            
            // Basic error handling check
            if (response.status === 401) {
                console.error('Authentication failed (401). Token expired or invalid.');
            }
            if (!response.ok) {
                console.error(`HTTP Error: ${response.status} for ${url}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API call failed for ${url}:`, error);
            return { error: 'Network error or service unavailable' };
        }
    },


    // --- Authentication ---
    async login(credentials) {
        // login endpoint expects POST, data, no token
        return this.fetchWithAuth('/login', 'POST', null, credentials);
    },

    async register(userData) {
        // register endpoint expects POST, data, no token
        return this.fetchWithAuth('/register', 'POST', null, userData);
    },


    // --- Student Routes ---
    async getStudentAnalytics(token) {
        // getStudentAnalytics endpoint expects GET, no data, needs token
        return this.fetchWithAuth('/student/analytics', 'GET', token);
    },

    async startAssessment(token, data) {
        // startAssessment endpoint expects POST, data, needs token
        return this.fetchWithAuth('/start-assessment', 'POST', token, data);
    },

    async submitAnswer(token, data) {
        // submitAnswer endpoint expects POST, data, needs token
        return this.fetchWithAuth('/submit-answer', 'POST', token, data);
    },
    
    // --- Teacher Routes ---
    async getTeacherStudents(token) {
        // getTeacherStudents endpoint expects GET, no data, needs token
        return this.fetchWithAuth('/teacher/students', 'GET', token);
    },

    // --- Parent Routes ---
    async getParentChildren(token) {
        // getParentChildren endpoint expects GET, no data, needs token
        return this.fetchWithAuth('/parent/children', 'GET', token);
    },

    // --- Utility ---
    async initDatabase() {
        // initDatabase endpoint expects POST, no data, no token
        const url = `${API_BASE_URL}/init-db`;
        try {
            const response = await fetch(url, { method: 'POST' });
            return response.json();
        } catch (error) {
            console.error(`API call failed for ${url}:`, error);
            return { error: 'Network error or service unavailable' };
        }
    }
};

export default apiService;
