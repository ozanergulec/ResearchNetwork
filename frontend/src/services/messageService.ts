import api from './apiClient';

export interface AttachedPublicationData {
    id: string;
    title: string;
    abstract: string | null;
    authorName: string;
    authorProfileImageUrl: string | null;
    authorIsVerified: boolean;
    averageRating: number;
    citationCount: number;
    publishedDate: string | null;
}

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
    attachedPublication: AttachedPublicationData | null;
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
    sendMessage: (receiverId: string, content: string, attachedPublicationId?: string) =>
        api.post<MessageData>('/messages', {
            receiverId,
            content,
            attachedPublicationId: attachedPublicationId ?? null,
        }),
    getUnreadCount: () => api.get<{ count: number }>('/messages/unread-count'),
    markAsRead: (otherUserId: string) => api.put(`/messages/${otherUserId}/read`),
};
