import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

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

// Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  title?: string;
  institution?: string;
  department?: string;
  bio?: string;
  interestTags: string[];
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  title?: string;
  institution?: string;
  department?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateUserData {
  fullName?: string;
  title?: string;
  institution?: string;
  department?: string;
  bio?: string;
  interestTags?: string[];
}

export interface Publication {
  id: string;
  title: string;
  abstract?: string;
  doi?: string;
  publishedDate?: string;
  keywords: string[];
  authorId: string;
  createdAt: string;
}

// Auth API
export const authApi = {
  register: (data: RegisterData) => 
    api.post<AuthResponse>('/auth/register', data),
  
  login: (data: LoginData) => 
    api.post<AuthResponse>('/auth/login', data),
};

// Users API
export const usersApi = {
  getAll: () => 
    api.get<User[]>('/users'),
  
  getById: (id: string) => 
    api.get<User>(`/users/${id}`),
  
  update: (id: string, data: UpdateUserData) => 
    api.put<User>(`/users/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/users/${id}`),
};

// Publications API
export const publicationsApi = {
  getAll: () => 
    api.get<Publication[]>('/publications'),
  
  getById: (id: string) => 
    api.get<Publication>(`/publications/${id}`),
  
  getByAuthor: (authorId: string) => 
    api.get<Publication[]>(`/publications/author/${authorId}`),
  
  create: (data: Partial<Publication>) => 
    api.post<Publication>('/publications', data),
  
  delete: (id: string) => 
    api.delete(`/publications/${id}`),
};

export default api;
