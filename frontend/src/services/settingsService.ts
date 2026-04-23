import api from './apiClient';

// Types
export interface UserSettings {
    fullName: string;
    email: string;
    title?: string;
    institution?: string;
    department?: string;
    bio?: string;
    profileImageUrl?: string;
    isVerified: boolean;
    privacyLevel: number; // 0=Public, 1=ConnectionsOnly, 2=Private
    language: string;
    notificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    createdAt: string;
}

export interface UpdateProfileSettings {
    fullName?: string;
    title?: string;
    institution?: string;
    department?: string;
    bio?: string;
}

export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}

export interface ChangeEmailData {
    newEmail: string;
    password: string;
}

export interface UpdatePrivacySettings {
    privacyLevel: number;
}

export interface UpdateNotificationSettings {
    notificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
}

// Settings API
export const settingsApi = {
    getSettings: () =>
        api.get<UserSettings>('/settings'),

    updateProfile: (data: UpdateProfileSettings) =>
        api.put<UserSettings>('/settings/profile', data),

    changePassword: (data: ChangePasswordData) =>
        api.put('/settings/password', data),

    changeEmail: (data: ChangeEmailData) =>
        api.put<UserSettings>('/settings/email', data),

    updatePrivacy: (data: UpdatePrivacySettings) =>
        api.put<UserSettings>('/settings/privacy', data),

    updateNotifications: (data: UpdateNotificationSettings) =>
        api.put<UserSettings>('/settings/notifications', data),

    deleteAccount: () =>
        api.delete('/settings/account'),
};
