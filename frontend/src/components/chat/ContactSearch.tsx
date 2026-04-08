import React from 'react';
import type { UserSummary } from '../../services/publicationService';
import { getImageUrl, getInitials } from './chatUtils';

interface ContactSearchProps {
    isExpanded: boolean;
    contactSearch: string;
    contacts: UserSummary[];
    loadingContacts: boolean;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    onToggleExpanded: () => void;
    onClose: (e?: React.MouseEvent) => void;
    onSearchChange: (value: string) => void;
    onStartChat: (user: UserSummary) => void;
}

const ContactSearch: React.FC<ContactSearchProps> = ({
    isExpanded,
    contactSearch,
    contacts,
    loadingContacts,
    searchInputRef,
    onToggleExpanded,
    onClose,
    onSearchChange,
    onStartChat,
}) => {
    return (
        <>
            <div className="fc-header" onClick={onToggleExpanded}>
                <div className="fc-header-left">
                    <button className="fc-back-btn" onClick={onClose} title="Back">
                        &#8592;
                    </button>
                    <span className="fc-header-name">Contacts</span>
                </div>
                <div className="fc-header-right">
                    <span className="fc-header-icon">{isExpanded ? '▼' : '▲'}</span>
                </div>
            </div>
            {isExpanded && (
                <div className="fc-content">
                    <div className="fc-search-wrap">
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="fc-search-input"
                            placeholder="Search contacts..."
                            value={contactSearch}
                            onChange={e => onSearchChange(e.target.value)}
                        />
                    </div>
                    <div className="fc-contacts-list">
                        {loadingContacts ? (
                            <div className="fc-spinner" />
                        ) : contacts.length === 0 ? (
                            <div className="fc-empty-state">No contacts found.</div>
                        ) : (
                            contacts.map(user => (
                                <div key={user.id} className="fc-conv-item" onClick={() => onStartChat(user)}>
                                    <div className="fc-conv-avatar-wrap">
                                        {user.profileImageUrl ? (
                                            <img src={getImageUrl(user.profileImageUrl)!} alt={user.fullName} className="fc-conv-avatar-small" />
                                        ) : (
                                            <div className="fc-header-avatar-placeholder" style={{ width: 28, height: 28, fontSize: 10 }}>
                                                {getInitials(user.fullName)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="fc-conv-info">
                                        <span className="fc-conv-name">{user.fullName}</span>
                                        {(user.title || user.institution) && (
                                            <span className="fc-conv-time" style={{ display: 'block' }}>{[user.title, user.institution].filter(Boolean).join(' · ')}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ContactSearch;
