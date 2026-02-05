import axios from 'axios';

const API_BASE_URL = 'http://localhost:5051/api';

// Export for components that need to construct full URLs
export const API_SERVER_URL = 'http://localhost:5051';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add JWT token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
