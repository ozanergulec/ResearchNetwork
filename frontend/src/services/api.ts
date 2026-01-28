import axios from 'axios';

const API_BASE_URL = 'http://localhost:5051/api';

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
  profileImageUrl?: string;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  avgScore: number;
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
  profileImageUrl?: string;
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

export interface RegisterResponse {
  userId: string;
  email: string;
  message: string;
  isVerified: boolean;
}

export interface VerifyEmailData {
  email: string;
  code: string;
}

// Auth API
export const authApi = {
  register: (data: RegisterData) =>
    api.post<RegisterResponse>('/auth/register', data),

  login: (data: LoginData) =>
    api.post<AuthResponse>('/auth/login', data),

  verifyEmail: (data: VerifyEmailData) =>
    api.post<AuthResponse>('/auth/verify-email', data),

  resendVerificationCode: (email: string) =>
    api.post('/auth/resend-code', { email }),
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
