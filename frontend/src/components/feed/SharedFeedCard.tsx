import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SharedPublication } from '../../services/publicationService';
import { API_SERVER_URL } from '../../services/apiClient';
import PublicationDetailModal from './PublicationDetailModal';
import '../../styles/feed/SharedFeedCard.css';

interface SharedFeedCardProps {
    sharedPublication: SharedPublication;
}

const SharedFeedCard: React.FC<SharedFeedCardProps> = ({ sharedPublication }) => {
    const [showDetail, setShowDetail] = useState(false);
    const navigate = useNavigate();
    const { sharedBy, note, sharedAt, publication } = sharedPublication;

    const getTimeAgo = (dateString: string): string => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffWeek = Math.floor(diffDay / 7);
        const diffMonth = Math.floor(diffDay / 30);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        if (diffWeek < 5) return `${diffWeek}w ago`;
        return `${diffMonth}mo ago`;
    };

    const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const sharerImageUrl = sharedBy.profileImageUrl
        ? `${API_SERVER_URL}${sharedBy.profileImageUrl}`
        : null;

    const authorImageUrl = publication.author.profileImageUrl
        ? `${API_SERVER_URL}${publication.author.profileImageUrl}`
        : null;

    const handleSharerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${sharedBy.id}`);
    };

    const handleAuthorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${publication.author.id}`);
    };

    return (
        <>
            <article className="shared-feed-card" onClick={() => setShowDetail(true)}>
                {/* Sharer Header */}
                <div className="shared-feed-header">
                    <div className="shared-feed-avatar-wrapper" onClick={handleSharerClick}>
                        {sharerImageUrl ? (
                            <img
                                src={sharerImageUrl}
                                alt={sharedBy.fullName}
                                className="shared-feed-avatar"
                            />
                        ) : (
                            <div className="shared-feed-avatar-placeholder">
                                {sharedBy.fullName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="shared-feed-info">
                        <div className="shared-feed-info-top">
                            <span className="shared-feed-sharer-name" onClick={handleSharerClick}>
                                {sharedBy.fullName}
                            </span>
                            {sharedBy.isVerified && (
                                <span className="shared-feed-verified" title="Verified">✓</span>
                            )}
                            <span className="shared-feed-action">shared a publication</span>
                        </div>
                        <span className="shared-feed-time">{getTimeAgo(sharedAt)}</span>
                    </div>
                </div>

                {/* Sharer's Note */}
                {note && (
                    <div className="shared-feed-note">
                        <p>{note}</p>
                    </div>
                )}

                {/* Nested Original Publication Card */}
                <div className="shared-feed-nested" onClick={(e) => e.stopPropagation()}>
                    <div className="shared-feed-nested-card" onClick={() => setShowDetail(true)}>
                        {/* Original Author */}
                        <div className="shared-feed-original-author">
                            <div className="shared-feed-original-avatar-wrapper" onClick={handleAuthorClick}>
                                {authorImageUrl ? (
                                    <img
                                        src={authorImageUrl}
                                        alt={publication.author.fullName}
                                        className="shared-feed-original-avatar"
                                    />
                                ) : (
                                    <div className="shared-feed-original-avatar-placeholder">
                                        {publication.author.fullName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="shared-feed-original-info">
                                <span className="shared-feed-original-name" onClick={handleAuthorClick}>
                                    {publication.author.fullName}
                                </span>
                                {publication.author.isVerified && (
                                    <span className="shared-feed-verified" title="Verified">✓</span>
                                )}
                                <span className="shared-feed-original-detail">
                                    {[publication.author.title, publication.author.institution]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            </div>
                        </div>

                        {/* Publication Content */}
                        <div className="shared-feed-nested-content">
                            <h3 className="shared-feed-nested-title">{publication.title}</h3>
                            {publication.abstract && (
                                <p className="shared-feed-nested-abstract">
                                    {truncateText(publication.abstract, 250)}
                                </p>
                            )}
                        </div>

                        {/* Tags */}
                        {publication.tags.length > 0 && (
                            <div className="shared-feed-nested-tags">
                                {publication.tags.map((tag, index) => (
                                    <span key={index} className="shared-feed-nested-tag">{tag}</span>
                                ))}
                            </div>
                        )}

                        {/* Stats */}
                        <div className="shared-feed-nested-stats">
                            <span>⭐ {publication.averageRating.toFixed(1)}</span>
                            <span>📄 {publication.citationCount} citations</span>
                            <span>🔖 {publication.saveCount} saves</span>
                            <span>🔄 {publication.shareCount} shares</span>
                        </div>
                    </div>
                </div>
            </article>

            {showDetail && (
                <PublicationDetailModal
                    publication={publication}
                    onClose={() => setShowDetail(false)}
                />
            )}
        </>
    );
};

export default SharedFeedCard;
