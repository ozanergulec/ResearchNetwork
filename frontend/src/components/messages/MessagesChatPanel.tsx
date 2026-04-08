import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConversationData, MessageData } from '../../services/messageService';
import type { Publication } from '../../services/publicationService';
import type { Translations } from '../../translations/translations';
import { getImageUrl, getInitials, formatMessageTime } from './messagesUtils';

interface MessagesChatPanelProps {
    selectedUserId: string | null;
    selectedConversation: ConversationData | undefined;
    messages: MessageData[];
    loadingMessages: boolean;
    currentUserId: string;
    newMessage: string;
    sending: boolean;
    hasMore: boolean;
    loadingOlder: boolean;
    attachedPublication: Publication | null;
    showAttachPicker: boolean;
    attachTab: 'mine' | 'theirs';
    attachSearch: string;
    loadingPubs: boolean;
    activePubs: Publication[];
    loadingModal: boolean;
    t: Translations;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    chatContainerRef: React.RefObject<HTMLDivElement | null>;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    attachPickerRef: React.RefObject<HTMLDivElement | null>;
    onMessageChange: (value: string) => void;
    onSendMessage: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onLoadOlderMessages: () => void;
    onOpenPublicationModal: (pubId: string) => void;
    onRemoveAttachment: () => void;
    onToggleAttachPicker: () => void;
    onCloseAttachPicker: () => void;
    onAttachTabChange: (tab: 'mine' | 'theirs') => void;
    onAttachSearchChange: (value: string) => void;
    onSelectPublication: (pub: Publication) => void;
}

const MessagesChatPanel: React.FC<MessagesChatPanelProps> = ({
    selectedUserId,
    selectedConversation,
    messages,
    loadingMessages,
    currentUserId,
    newMessage,
    sending,
    hasMore,
    loadingOlder,
    attachedPublication,
    showAttachPicker,
    attachTab,
    attachSearch,
    loadingPubs,
    activePubs,
    loadingModal,
    t,
    messagesEndRef,
    chatContainerRef,
    textareaRef,
    attachPickerRef,
    onMessageChange,
    onSendMessage,
    onKeyDown,
    onLoadOlderMessages,
    onOpenPublicationModal,
    onRemoveAttachment,
    onToggleAttachPicker,
    onCloseAttachPicker,
    onAttachTabChange,
    onAttachSearchChange,
    onSelectPublication,
}) => {
    const navigate = useNavigate();

    if (!selectedUserId) {
        return (
            <div className="chat-panel">
                <div className="chat-empty-state">
                    <span className="chat-empty-icon">💬</span>
                    <h3>{t.messages.selectConversation}</h3>
                    <p>{t.messages.selectConversationHint}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-panel">
            {/* Chat header */}
            <div className="chat-header">
                {selectedConversation ? (
                    <>
                        {selectedConversation.userProfileImageUrl ? (
                            <img
                                src={getImageUrl(selectedConversation.userProfileImageUrl)!}
                                alt={selectedConversation.userName}
                                className="chat-header-avatar"
                            />
                        ) : (
                            <div className="chat-header-avatar-placeholder">
                                {getInitials(selectedConversation.userName)}
                            </div>
                        )}
                        <div className="chat-header-info">
                            <span className="chat-header-name">
                                {selectedConversation.userName}
                                {selectedConversation.userIsVerified && (
                                    <span className="chat-header-verified">✓</span>
                                )}
                            </span>
                            {(selectedConversation.userTitle || selectedConversation.userInstitution) && (
                                <span className="chat-header-meta">
                                    {[selectedConversation.userTitle, selectedConversation.userInstitution]
                                        .filter(Boolean).join(' · ')}
                                </span>
                            )}
                        </div>
                        <button
                            className="chat-profile-btn"
                            onClick={() => navigate(`/profile/${selectedUserId}`)}
                        >
                            {t.messages.viewProfile}
                        </button>
                    </>
                ) : (
                    <div className="chat-header-loading" />
                )}
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={chatContainerRef}>
                {loadingMessages ? (
                    <div className="chat-loading">
                        <div className="chat-spinner" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-no-messages">
                        <span>👋</span>
                        <p>{t.messages.startConversation}</p>
                    </div>
                ) : (
                    <>
                        {hasMore && (
                            <div className="chat-load-older">
                                <button
                                    className="chat-load-older-btn"
                                    onClick={onLoadOlderMessages}
                                    disabled={loadingOlder}
                                >
                                    {loadingOlder ? (
                                        <span className="chat-load-older-spinner" />
                                    ) : (
                                        t.messages.loadOlder || 'Load older messages'
                                    )}
                                </button>
                            </div>
                        )}
                        {messages.map((msg, idx) => {
                            const isMine = msg.senderId === currentUserId;
                            const prevMsg = messages[idx - 1];
                            const showDateSep = !prevMsg ||
                                new Date(msg.sentAt).toDateString() !==
                                new Date(prevMsg.sentAt).toDateString();

                            return (
                                <React.Fragment key={msg.id}>
                                    {showDateSep && (
                                        <div className="chat-date-sep">
                                            <span>{new Date(msg.sentAt).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                    )}
                                    <div className={`chat-msg-row ${isMine ? 'mine' : 'theirs'}`}>
                                        {!isMine && (
                                            <div className="chat-msg-avatar">
                                                {selectedConversation?.userProfileImageUrl ? (
                                                    <img
                                                        src={getImageUrl(selectedConversation.userProfileImageUrl)!}
                                                        alt={msg.senderName}
                                                        className="chat-msg-avatar-img"
                                                    />
                                                ) : (
                                                    <div className="chat-msg-avatar-placeholder">
                                                        {getInitials(msg.senderName)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="chat-bubble-wrap">
                                            {msg.attachedPublication && (
                                                <div
                                                    className={`chat-pub-card ${isMine ? 'mine' : 'theirs'} ${loadingModal ? 'loading' : ''}`}
                                                    onClick={() => onOpenPublicationModal(msg.attachedPublication!.id)}
                                                >
                                                    <div className="chat-pub-card-top">
                                                        <span className="chat-pub-card-icon">📄</span>
                                                        <div className="chat-pub-card-info">
                                                            <span className="chat-pub-card-title">{msg.attachedPublication.title}</span>
                                                            <span className="chat-pub-card-author">
                                                                {msg.attachedPublication.authorName}
                                                                {msg.attachedPublication.publishedDate && ` · ${new Date(msg.attachedPublication.publishedDate).getFullYear()}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {msg.attachedPublication.abstract && (
                                                        <p className="chat-pub-card-abstract">
                                                            {msg.attachedPublication.abstract.length > 120
                                                                ? msg.attachedPublication.abstract.slice(0, 120) + '...'
                                                                : msg.attachedPublication.abstract}
                                                        </p>
                                                    )}
                                                    <div className="chat-pub-card-stats">
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            {msg.attachedPublication.averageRating > 0 && (
                                                                <span>⭐ {msg.attachedPublication.averageRating.toFixed(1)}</span>
                                                            )}
                                                            {msg.attachedPublication.citationCount > 0 && (
                                                                <span>📚 {msg.attachedPublication.citationCount}</span>
                                                            )}
                                                        </div>
                                                        <span className="chat-pub-card-open-hint">Open →</span>
                                                    </div>
                                                </div>
                                            )}
                                            {msg.content && (
                                                <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                                                    {msg.content}
                                                </div>
                                            )}
                                            <span className="chat-msg-time">
                                                {formatMessageTime(msg.sentAt)}
                                                {isMine && (
                                                    <span className="chat-read-status">
                                                        {msg.isRead ? ' ✓✓' : ' ✓'}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input area */}
            <div className="chat-input-wrapper">
                {attachedPublication && (
                    <div className="chat-attach-preview">
                        <div className="chat-attach-preview-icon">📎</div>
                        <div className="chat-attach-preview-info">
                            <span className="chat-attach-preview-title">{attachedPublication.title}</span>
                            <span className="chat-attach-preview-author">{attachedPublication.author.fullName}</span>
                        </div>
                        <button className="chat-attach-preview-remove" onClick={onRemoveAttachment}>×</button>
                    </div>
                )}

                <div className="chat-input-area">
                    <div className="chat-attach-wrap" ref={attachPickerRef}>
                        <button
                            className={`chat-attach-btn ${showAttachPicker ? 'active' : ''}`}
                            onClick={onToggleAttachPicker}
                            title={t.messages.attachPublication}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                            </svg>
                        </button>

                        {showAttachPicker && (
                            <div className="attach-picker-panel">
                                <div className="attach-picker-header">
                                    <span className="attach-picker-title">{t.messages.attachTitle}</span>
                                    <button className="attach-picker-close" onClick={onCloseAttachPicker}>×</button>
                                </div>
                                <div className="attach-picker-tabs">
                                    <button
                                        className={`attach-tab ${attachTab === 'mine' ? 'active' : ''}`}
                                        onClick={() => onAttachTabChange('mine')}
                                    >
                                        {t.messages.myPublications}
                                    </button>
                                    <button
                                        className={`attach-tab ${attachTab === 'theirs' ? 'active' : ''}`}
                                        onClick={() => onAttachTabChange('theirs')}
                                    >
                                        {selectedConversation?.userName || t.messages.theirPublications}
                                    </button>
                                </div>
                                <div className="attach-picker-search-wrap">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="attach-picker-search-icon">
                                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                    </svg>
                                    <input
                                        type="text"
                                        className="attach-picker-search"
                                        placeholder={t.messages.searchPublications}
                                        value={attachSearch}
                                        onChange={e => onAttachSearchChange(e.target.value)}
                                    />
                                </div>
                                <div className="attach-picker-list">
                                    {loadingPubs ? (
                                        <div className="attach-picker-loading">
                                            <div className="attach-picker-spinner" />
                                        </div>
                                    ) : activePubs.length === 0 ? (
                                        <div className="attach-picker-empty">
                                            <span>{attachTab === 'mine' ? t.messages.noMyPubs : t.messages.noTheirPubs}</span>
                                        </div>
                                    ) : activePubs.map(pub => (
                                        <div
                                            key={pub.id}
                                            className="attach-pub-item"
                                            onClick={() => onSelectPublication(pub)}
                                        >
                                            <div className="attach-pub-icon">📄</div>
                                            <div className="attach-pub-info">
                                                <span className="attach-pub-title">{pub.title}</span>
                                                <span className="attach-pub-meta">
                                                    {pub.author.fullName}
                                                    {pub.publishedDate && ` · ${new Date(pub.publishedDate).getFullYear()}`}
                                                    {pub.averageRating > 0 && ` · ⭐ ${pub.averageRating.toFixed(1)}`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        placeholder={attachedPublication ? t.messages.addComment : t.messages.inputPlaceholder}
                        value={newMessage}
                        onChange={e => onMessageChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        rows={1}
                        maxLength={2000}
                    />
                    <button
                        className={`chat-send-btn ${(!newMessage.trim() && !attachedPublication) || sending ? 'disabled' : ''}`}
                        onClick={onSendMessage}
                        disabled={(!newMessage.trim() && !attachedPublication) || sending}
                    >
                        {sending ? (
                            <span className="chat-send-spinner" />
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessagesChatPanel;
