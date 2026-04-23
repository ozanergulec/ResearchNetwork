import React from 'react';
import { API_SERVER_URL } from '../../services/apiClient';
import type { UserSummary } from '../../services/publicationService';

interface SearchUserCardProps {
    user: UserSummary;
    onClick: (userId: string) => void;
}

const getImageUrl = (url?: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_SERVER_URL}${url}`;
};

const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const SearchUserCard: React.FC<SearchUserCardProps> = React.memo(({ user, onClick }) => (
    <div
        className="search-user-card"
        onClick={() => onClick(user.id)}
    >
        {user.profileImageUrl ? (
            <img
                src={getImageUrl(user.profileImageUrl)!}
                alt={user.fullName}
                className="search-user-avatar"
            />
        ) : (
            <div className="search-user-avatar-placeholder">
                {getInitials(user.fullName)}
            </div>
        )}
        <div className="search-user-info">
            <p className="search-user-name">
                {user.fullName}
                {user.isVerified && (
                    <span className="search-user-verified">✓</span>
                )}
            </p>
            <p className="search-user-meta">
                {[user.title, user.institution]
                    .filter(Boolean)
                    .join(' • ') || 'User'}
            </p>
        </div>
        <span className="search-user-arrow">›</span>
    </div>
));

export default SearchUserCard;
