import React, { useRef } from 'react';
import type { ConversationData, MessageData } from '../../services/messageService';
import type { Publication } from '../../services/publicationService';
import { getImageUrl, getInitials } from './chatUtils';

interface ChatViewProps {
    activeChatUser: ConversationData;
    isExpanded: boolean;
    messages: MessageData[];
    currentUserId: string;
    newMessage: string;
    sending: boolean;
    attachedPublication: Publication | null;
    showAttachPicker: boolean;
    attachTab: 'mine' | 'theirs';
    attachSearch: string;
    loadingPubs: boolean;
    activePubs: Publication[];
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onToggleWindow: () => void;
    onGoBack: () => void;
    onClose: () => void;
    onMessageChange: (value: string) => void;
    onSendMessage: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onOpenPublicationModal: (pubId: string) => void;
    onRemoveAttachment: () => void;
    onToggleAttachPicker: () => void;
    onCloseAttachPicker: () => void;
    onAttachTabChange: (tab: 'mine' | 'theirs') => void;
    onAttachSearchChange: (value: string) => void;
    onSelectPublication: (pub: Publication) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    attachPickerRef: React.RefObject<HTMLDivElement | null>;
}

const ChatView: React.FC<ChatViewProps> = ({
    activeChatUser,
    isExpanded,
    messages,
    currentUserId,
    newMessage,
    sending,
    attachedPublication,
    showAttachPicker,
    attachTab,
    attachSearch,
    loadingPubs,
    activePubs,
    messagesEndRef,
    onToggleWindow,
    onGoBack,
    onClose,
    onMessageChange,
    onSendMessage,
    onKeyDown,
    onOpenPublicationModal,
    onRemoveAttachment,
    onToggleAttachPicker,
    onCloseAttachPicker,
    onAttachTabChange,
    onAttachSearchChange,
    onSelectPublication,
    textareaRef,
    attachPickerRef,
}) => {
    return (
        <>
            <div className="fc-header" onClick={onToggleWindow}>
                <div className="fc-header-left">
                    <button
                        className="fc-back-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onGoBack();
                        }}
                        title="Go Back"
                    >
                        &#8592;
                    </button>
                    <div className="fc-header-avatar-wrap">
                        {activeChatUser.userProfileImageUrl ? (
                            <img
                                src={getImageUrl(activeChatUser.userProfileImageUrl)!}
                                alt={activeChatUser.userName}
                                className="fc-header-avatar"
                            />
                        ) : (
                            <div className="fc-header-avatar-placeholder">
                                {getInitials(activeChatUser.userName)}
                            </div>
                        )}
                    </div>
                    <span className="fc-header-name">{activeChatUser.userName}</span>
                </div>
                <div className="fc-header-right">
                    <span className="fc-header-icon">{isExpanded ? '▼' : '▲'}</span>
                    <button
                        className="fc-icon-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        title="Close"
                    >
                        ×
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="fc-content">
                    <div className="fc-messages-area">
                        {messages.map(msg => {
                            const isMine = msg.senderId === currentUserId;
                            return (
                                <div key={msg.id} className={`fc-msg-row ${isMine ? 'mine' : 'theirs'}`}>
                                    {!isMine && (
                                        <div className="fc-conv-avatar-wrap">
                                            {activeChatUser.userProfileImageUrl ? (
                                                <img
                                                    src={getImageUrl(activeChatUser.userProfileImageUrl)!}
                                                    alt={msg.senderName}
                                                    className="fc-conv-avatar-small"
                                                />
                                            ) : (
                                                <div className="fc-header-avatar-placeholder">
                                                    {getInitials(msg.senderName)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {msg.attachedPublication && (
                                            <div className="fc-pub-card" onClick={() => onOpenPublicationModal(msg.attachedPublication!.id)}>
                                                <span className="fc-pub-card-title">{msg.attachedPublication.title}</span>
                                                <span className="fc-pub-card-author">{msg.attachedPublication.authorName}</span>
                                            </div>
                                        )}
                                        {msg.content && (
                                            <div className="fc-bubble">
                                                {msg.content}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="fc-input-wrapper">
                        {attachedPublication && (
                            <div className="fc-attach-preview">
                                <span style={{ fontSize: 12 }}>📎 {attachedPublication.title}</span>
                                <button className="fc-attach-preview-remove" onClick={onRemoveAttachment}>×</button>
                            </div>
                        )}
                        <div className="fc-input-area">
                            <div className="fc-attach-wrap" ref={attachPickerRef}>
                                <button
                                    className={`fc-attach-btn ${showAttachPicker ? 'active' : ''}`}
                                    onClick={onToggleAttachPicker}
                                    title="Attach Publication"
                                >
                                    📎
                                </button>

                                {showAttachPicker && (
                                    <div className="fc-attach-picker-panel">
                                        <div className="fc-attach-picker-header">
                                            <span className="fc-attach-picker-title">Select Publication</span>
                                            <button className="fc-attach-picker-close" onClick={onCloseAttachPicker}>×</button>
                                        </div>
                                        <div className="fc-attach-picker-tabs">
                                            <button className={`fc-attach-tab ${attachTab === 'mine' ? 'active' : ''}`} onClick={() => onAttachTabChange('mine')}>Mine</button>
                                            <button className={`fc-attach-tab ${attachTab === 'theirs' ? 'active' : ''}`} onClick={() => onAttachTabChange('theirs')}>Theirs</button>
                                        </div>
                                        <div className="fc-attach-picker-search-wrap">
                                            <input type="text" className="fc-attach-picker-search" placeholder="Search publications..." value={attachSearch} onChange={e => onAttachSearchChange(e.target.value)} />
                                        </div>
                                        <div className="fc-attach-picker-list">
                                            {loadingPubs ? (
                                                <div className="fc-spinner" style={{ margin: '10px auto' }} />
                                            ) : activePubs.length === 0 ? (
                                                <div className="fc-empty-state" style={{ padding: 10, fontSize: 13 }}>No publications found.</div>
                                            ) : activePubs.map(pub => (
                                                <div key={pub.id} className="fc-attach-pub-item" onClick={() => onSelectPublication(pub)}>
                                                    <span className="fc-attach-pub-title">📄 {pub.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <textarea
                                ref={textareaRef}
                                className="fc-input"
                                placeholder={attachedPublication ? "Add a comment..." : "Type a message..."}
                                value={newMessage}
                                onChange={e => onMessageChange(e.target.value)}
                                onKeyDown={onKeyDown}
                                rows={1}
                            />
                            <button
                                className="fc-send-btn"
                                onClick={onSendMessage}
                                disabled={(!newMessage.trim() && !attachedPublication) || sending}
                            >
                                {sending ? (
                                    <div className="fc-spinner" style={{ margin: 0, width: 16, height: 16 }} />
                                ) : (
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatView;
