import api from './apiClient';

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

export interface ForgotPasswordData {
    email: string;
}

export interface VerifyResetCodeData {
    email: string;
    code: string;
}

export interface ResetPasswordData {
    email: string;
    code: string;
    newPassword: string;
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

    forgotPassword: (data: ForgotPasswordData) =>
        api.post('/auth/forgot-password', data),

    verifyResetCode: (data: VerifyResetCodeData) =>
        api.post('/auth/verify-reset-code', data),

    resetPassword: (data: ResetPasswordData) =>
        api.post('/auth/reset-password', data),
};
