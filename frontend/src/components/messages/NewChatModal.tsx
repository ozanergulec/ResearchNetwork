import React from 'react';
import type { UserSummary } from '../../services/publicationService';
import type { Translations } from '../../translations/translations';
import { getImageUrl, getInitials } from './messagesUtils';

interface NewChatModalProps {
    contactSearch: string;
    contacts: UserSummary[];
    loadingContacts: boolean;
    t: Translations;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    onClose: () => void;
    onSearchChange: (value: string) => void;
    onStartChat: (userId: string) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({
    contactSearch,
    contacts,
    loadingContacts,
    t,
    searchInputRef,
    onClose,
    onSearchChange,
    onStartChat,
}) => {
    return (
        <div className="new-chat-overlay" onClick={onClose}>
            <div className="new-chat-modal" onClick={e => e.stopPropagation()}>
                <div className="new-chat-modal-header">
                    <h3 className="new-chat-modal-title">{t.messages.newChat}</h3>
                    <button className="new-chat-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="new-chat-search-wrap">
                    <svg className="new-chat-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="new-chat-search-input"
                        placeholder={t.messages.searchContacts}
                        value={contactSearch}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                    {contactSearch && (
                        <button className="new-chat-search-clear" onClick={() => onSearchChange('')}>×</button>
                    )}
                </div>

                <div className="new-chat-contacts">
                    {loadingContacts ? (
                        <div className="new-chat-loading">
                            <div className="new-chat-spinner" />
                            <span>{t.messages.loadingContacts}</span>
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="new-chat-no-contacts">
                            <span>🔍</span>
                            <p>{contactSearch ? t.messages.noContactsFound : t.messages.noContacts}</p>
                            {!contactSearch && <span className="new-chat-no-hint">{t.messages.noContactsHint}</span>}
                        </div>
                    ) : (
                        <>
                            {!contactSearch && (
                                <p className="new-chat-section-label">{t.messages.contactsSectionLabel}</p>
                            )}
                            {contacts.map(user => (
                                <div
                                    key={user.id}
                                    className="new-chat-contact-item"
                                    onClick={() => onStartChat(user.id)}
                                >
                                    <div className="new-chat-contact-avatar-wrap">
                                        {user.profileImageUrl ? (
                                            <img
                                                src={getImageUrl(user.profileImageUrl)!}
                                                alt={user.fullName}
                                                className="new-chat-contact-avatar"
                                            />
                                        ) : (
                                            <div className="new-chat-contact-avatar-placeholder">
                                                {getInitials(user.fullName)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="new-chat-contact-info">
                                        <span className="new-chat-contact-name">
                                            {user.fullName}
                                            {user.isVerified && <span className="new-chat-contact-verified">✓</span>}
                                        </span>
                                        {(user.title || user.institution) && (
                                            <span className="new-chat-contact-meta">
                                                {[user.title, user.institution].filter(Boolean).join(' · ')}
                                            </span>
                                        )}
                                    </div>
                                    <span className="new-chat-contact-arrow">→</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewChatModal;
