import api from './apiClient';

// Types
export interface Tag {
    id: string;
    name: string;
    usageCount: number;
}

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
    tags: Tag[];
}

export interface UpdateUserData {
    fullName?: string;
    title?: string;
    institution?: string;
    department?: string;
    bio?: string;
    profileImageUrl?: string;
}

// Users API
export const usersApi = {
    // Get current user's profile (requires authentication)
    getProfile: () =>
        api.get<User>('/users/profile'),

    // Update current user's profile (requires authentication)
    updateProfile: (data: UpdateUserData) =>
        api.put<User>('/users/profile', data),

    // Legacy endpoints (still available)
    getAll: () =>
        api.get<User[]>('/users'),

    getById: (id: string) =>
        api.get<User>(`/users/${id}`),

    update: (id: string, data: UpdateUserData) =>
        api.put<User>(`/users/${id}`, data),

    delete: (id: string) =>
        api.delete(`/users/${id}`),
};
