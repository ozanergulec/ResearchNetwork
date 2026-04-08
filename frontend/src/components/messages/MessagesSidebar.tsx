import React from 'react';
import type { ConversationData } from '../../services/messageService';
import type { Translations } from '../../translations/translations';
import { getImageUrl, getInitials, formatTimeTranslated } from './messagesUtils';

interface MessagesSidebarProps {
    conversations: ConversationData[];
    selectedUserId: string | null;
    loadingConversations: boolean;
    t: Translations;
    onSelectConversation: (userId: string) => void;
    onOpenNewChat: () => void;
}

const MessagesSidebar: React.FC<MessagesSidebarProps> = ({
    conversations,
    selectedUserId,
    loadingConversations,
    t,
    onSelectConversation,
    onOpenNewChat,
}) => {
    return (
        <div className="conv-list-panel">
            <div className="conv-list-header">
                <h2 className="conv-list-title">{t.messages.title}</h2>
                <button className="new-chat-btn" onClick={onOpenNewChat} title={t.messages.newChat}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        <line x1="12" y1="8" x2="12" y2="14"/>
                        <line x1="9" y1="11" x2="15" y2="11"/>
                    </svg>
                </button>
            </div>

            {loadingConversations ? (
                <div className="conv-loading">
                    <div className="conv-spinner" />
                </div>
            ) : conversations.length === 0 ? (
                <div className="conv-empty">
                    <span className="conv-empty-icon">💬</span>
                    <p>{t.messages.noConversations}</p>
                    <span className="conv-empty-hint">{t.messages.noConversationsHint}</span>
                </div>
            ) : (
                <div className="conv-list">
                    {conversations.map(conv => (
                        <div
                            key={conv.userId}
                            className={`conv-item ${selectedUserId === conv.userId ? 'active' : ''} ${conv.unreadCount > 0 ? 'has-unread' : ''}`}
                            onClick={() => onSelectConversation(conv.userId)}
                        >
                            <div className="conv-avatar-wrap">
                                {conv.userProfileImageUrl ? (
                                    <img
                                        src={getImageUrl(conv.userProfileImageUrl)!}
                                        alt={conv.userName}
                                        className="conv-avatar"
                                    />
                                ) : (
                                    <div className="conv-avatar-placeholder">
                                        {getInitials(conv.userName)}
                                    </div>
                                )}
                                {conv.unreadCount > 0 && (
                                    <span className="conv-unread-badge">
                                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="conv-info">
                                <div className="conv-info-top">
                                    <span className="conv-name">
                                        {conv.userName}
                                        {conv.userIsVerified && <span className="conv-verified">✓</span>}
                                    </span>
                                    <span className="conv-time">{formatTimeTranslated(conv.lastMessageAt, t)}</span>
                                </div>
                                <span className={`conv-last-msg ${conv.unreadCount > 0 ? 'unread' : ''}`}>
                                    {conv.lastMessage.length > 45
                                        ? conv.lastMessage.slice(0, 45) + '...'
                                        : conv.lastMessage}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MessagesSidebar;
