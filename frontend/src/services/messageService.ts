import api from './apiClient';

export interface MessageData {
    id: string;
    senderId: string;
    senderName: string;
    senderProfileImageUrl: string | null;
    receiverId: string;
    receiverName: string;
    content: string;
    sentAt: string;
    isRead: boolean;
}

export interface ConversationData {
    userId: string;
    userName: string;
    userProfileImageUrl: string | null;
    userIsVerified: boolean;
    userTitle: string | null;
    userInstitution: string | null;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}

export const messageApi = {
    getConversations: () => api.get<ConversationData[]>('/messages/conversations'),
    getConversation: (otherUserId: string) => api.get<MessageData[]>(`/messages/${otherUserId}`),
    sendMessage: (receiverId: string, content: string) =>
        api.post<MessageData>('/messages', { receiverId, content }),
    getUnreadCount: () => api.get<{ count: number }>('/messages/unread-count'),
    markAsRead: (otherUserId: string) => api.put(`/messages/${otherUserId}/read`),
};
