import React from 'react';
import type { ConversationData } from '../../services/messageService';
import { getImageUrl, getInitials, formatTime } from './chatUtils';

interface ConversationListProps {
    conversations: ConversationData[];
    currentUser: any;
    totalUnread: number;
    isExpanded: boolean;
    onToggleWindow: () => void;
    onSelectConversation: (conv: ConversationData) => void;
    onOpenNewChat: (e: React.MouseEvent) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
    conversations,
    currentUser,
    totalUnread,
    isExpanded,
    onToggleWindow,
    onSelectConversation,
    onOpenNewChat,
}) => {
    return (
        <>
            <div className="fc-header" onClick={onToggleWindow}>
                <div className="fc-header-left">
                    <div className="fc-header-avatar-wrap">
                        {currentUser?.profileImageUrl ? (
                            <img
                                src={getImageUrl(currentUser.profileImageUrl)!}
                                alt="Me"
                                className="fc-header-avatar"
                            />
                        ) : (
                            <div className="fc-header-avatar-placeholder" style={{ backgroundColor: '#ccc', color: '#fff' }}>
                                {getInitials(currentUser?.fullName || 'Me')}
                            </div>
                        )}
                    </div>
                    <span className="fc-header-name">Messaging</span>
                    {totalUnread > 0 && !isExpanded && (
                        <span className="fc-header-badge">{totalUnread}</span>
                    )}
                </div>
                <div className="fc-header-right">
                    <button className="fc-icon-btn" onClick={onOpenNewChat} title="New Chat" style={{ width: 24, height: 24, marginRight: 4 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--heading-color)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            <line x1="12" y1="8" x2="12" y2="14"/>
                            <line x1="9" y1="11" x2="15" y2="11"/>
                        </svg>
                    </button>
                    <span className="fc-header-icon">{isExpanded ? '▼' : '▲'}</span>
                </div>
            </div>

            {isExpanded && (
                <div className="fc-content">
                    {conversations.length === 0 ? (
                        <div className="fc-empty-state">
                            No messages yet.
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.userId}
                                className={`fc-conv-item ${conv.unreadCount > 0 ? 'unread' : ''}`}
                                onClick={() => onSelectConversation(conv)}
                            >
                                <div className="fc-conv-avatar-wrap">
                                    {conv.userProfileImageUrl ? (
                                        <img
                                            src={getImageUrl(conv.userProfileImageUrl)!}
                                            alt={conv.userName}
                                            className="fc-conv-avatar"
                                        />
                                    ) : (
                                        <div className="fc-conv-avatar-placeholder">
                                            {getInitials(conv.userName)}
                                        </div>
                                    )}
                                    {conv.unreadCount > 0 && (
                                        <span className="fc-header-badge fc-abs-badge">
                                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="fc-conv-info">
                                    <div className="fc-conv-top">
                                        <span className="fc-conv-name">{conv.userName}</span>
                                        <span className="fc-conv-time">{formatTime(conv.lastMessageAt)}</span>
                                    </div>
                                    <span className="fc-conv-last-msg">
                                        {conv.lastMessage}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </>
    );
};

export default ConversationList;
