import api from './apiClient';

export interface NotificationData {
    id: string;
    title: string;
    message: string;
    targetUrl: string | null;
    type: number;
    isRead: boolean;
    createdAt: string;
    actorId: string | null;
    actorName: string | null;
    actorProfileImageUrl: string | null;
}

export const notificationApi = {
    getNotifications: () => api.get<NotificationData[]>('/notifications'),
    getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
    markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
};
