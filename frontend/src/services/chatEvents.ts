// Global event bridge that lets any page request the FloatingChat component
// to open a conversation with a specific user. Keeps FloatingChat decoupled
// from the rest of the app: callers don't need a ref/context, they just
// dispatch and FloatingChat listens.

export const OPEN_CHAT_EVENT = 'rn:open-chat-with-user';

export interface OpenChatDetail {
    userId: string;
    fullName: string;
    profileImageUrl?: string | null;
    isVerified?: boolean;
    title?: string | null;
    institution?: string | null;
}

export const openFloatingChatWithUser = (detail: OpenChatDetail): void => {
    window.dispatchEvent(
        new CustomEvent<OpenChatDetail>(OPEN_CHAT_EVENT, { detail })
    );
};
