import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Publication } from '../../services/publicationService';
import { publicationsApi } from '../../services/publicationService';
import { API_SERVER_URL } from '../../services/apiClient';
import PublicationDetailModal from './PublicationDetailModal';
import '../../styles/feed/FeedPublicationCard.css';

interface FeedPublicationCardProps {
    publication: Publication;
}

const FeedPublicationCard: React.FC<FeedPublicationCardProps> = ({ publication }) => {
    const [showDetail, setShowDetail] = useState(false);
    const [showRatingPopup, setShowRatingPopup] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);
    const [userRating, setUserRating] = useState<number | null>(publication.userRating);
    const [averageRating, setAverageRating] = useState(publication.averageRating);
    const [isSaved, setIsSaved] = useState(publication.isSaved);
    const [saveCount, setSaveCount] = useState(publication.saveCount);
    const [isShared, setIsShared] = useState(publication.isShared);
    const [shareCount, setShareCount] = useState(publication.shareCount);
    const [savingAction, setSavingAction] = useState(false);
    const ratingRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close rating popup on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ratingRef.current && !ratingRef.current.contains(e.target as Node)) {
                setShowRatingPopup(false);
            }
        };
        if (showRatingPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showRatingPopup]);

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

    const authorImageUrl = publication.author.profileImageUrl
        ? `${API_SERVER_URL}${publication.author.profileImageUrl}`
        : null;

    const handleCardClick = () => {
        setShowDetail(true);
    };

    const handleAuthorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${publication.author.id}`);
    };

    const handleRateClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (userRating) {
            // Already rated — remove rating directly
            try {
                const res = await publicationsApi.rate(publication.id, 0);
                setUserRating(res.data.userRating);
                setAverageRating(res.data.averageRating);
            } catch (err) {
                console.error('Failed to remove rating', err);
            }
        } else {
            setShowRatingPopup(!showRatingPopup);
        }
    };

    const handleStarClick = async (score: number) => {
        try {
            // If clicking the same star, remove rating (send 0)
            const newScore = score === userRating ? 0 : score;
            const res = await publicationsApi.rate(publication.id, newScore);
            setUserRating(res.data.userRating);
            setAverageRating(res.data.averageRating);
            setShowRatingPopup(false);
        } catch (err) {
            console.error('Failed to rate publication', err);
        }
    };

    const handleSaveClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (savingAction) return;
        setSavingAction(true);
        try {
            const res = await publicationsApi.toggleSave(publication.id);
            setIsSaved(res.data.saved);
            setSaveCount(res.data.saveCount);
        } catch (err) {
            console.error('Failed to toggle save', err);
        } finally {
            setSavingAction(false);
        }
    };

    const handleShareClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isShared || savingAction) return;

        const confirmed = window.confirm('Share this publication to your profile?');
        if (!confirmed) return;

        setSavingAction(true);
        try {
            const res = await publicationsApi.share(publication.id);
            setIsShared(res.data.shared);
            setShareCount(res.data.shareCount);
        } catch (err) {
            console.error('Failed to share publication', err);
        } finally {
            setSavingAction(false);
        }
    };

    return (
        <>
            <article className="feed-card" onClick={handleCardClick}>
                {/* Author Header */}
                <div className="feed-card-author">
                    <div className="feed-card-avatar-wrapper" onClick={handleAuthorClick}>
                        {authorImageUrl ? (
                            <img
                                src={authorImageUrl}
                                alt={publication.author.fullName}
                                className="feed-card-avatar"
                            />
                        ) : (
                            <div className="feed-card-avatar-placeholder">
                                {publication.author.fullName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="feed-card-author-info">
                        <h4 className="feed-card-author-name">
                            <span className="feed-card-author-link" onClick={handleAuthorClick}>
                                {publication.author.fullName}
                            </span>
                            {publication.author.isVerified && (
                                <span className="feed-card-verified" title="Verified">✓</span>
                            )}
                        </h4>
                        <p className="feed-card-author-detail">
                            {[publication.author.title, publication.author.institution]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                        <span className="feed-card-time">{getTimeAgo(publication.createdAt)}</span>
                    </div>
                </div>

                {/* Publication Content */}
                <div className="feed-card-content">
                    <h3 className="feed-card-title">{publication.title}</h3>
                    {publication.abstract && (
                        <p className="feed-card-abstract">
                            {truncateText(publication.abstract, 300)}
                        </p>
                    )}
                </div>

                {/* Tags */}
                {publication.tags.length > 0 && (
                    <div className="feed-card-tags">
                        {publication.tags.map((tag, index) => (
                            <span key={index} className="feed-card-tag">{tag}</span>
                        ))}
                    </div>
                )}

                {/* File indicator */}
                {publication.fileUrl && (
                    <div className="feed-card-file-indicator">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>Attached document</span>
                    </div>
                )}

                {/* Interactive Stats Bar */}
                <div className="feed-card-stats" onClick={(e) => e.stopPropagation()}>
                    {/* Rating */}
                    <div className="feed-card-stat-wrapper" ref={ratingRef}>
                        <button
                            className={`feed-card-stat feed-card-stat-btn ${userRating ? 'feed-card-stat-active' : ''}`}
                            onClick={handleRateClick}
                            title={userRating ? `Your rating: ${userRating}/5` : 'Rate this publication'}
                        >
                            <svg viewBox="0 0 24 24" fill={userRating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span>{averageRating.toFixed(1)}</span>
                        </button>

                        {/* Star Rating Popup */}
                        {showRatingPopup && (
                            <div className="feed-card-rating-popup">
                                <div className="feed-card-rating-stars">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            className={`feed-card-star ${(hoverRating || userRating || 0) >= star ? 'feed-card-star-filled' : ''
                                                }`}
                                            onClick={() => handleStarClick(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            title={`${star} star${star > 1 ? 's' : ''}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <span className="feed-card-rating-label">
                                    {hoverRating > 0
                                        ? `${hoverRating}/5`
                                        : userRating
                                            ? `Your rating: ${userRating}/5`
                                            : 'Select a rating'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Citations - static for now */}
                    <div className="feed-card-stat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        <span>{publication.citationCount} citations</span>
                    </div>

                    {/* Save/Bookmark */}
                    <button
                        className={`feed-card-stat feed-card-stat-btn ${isSaved ? 'feed-card-stat-active' : ''}`}
                        onClick={handleSaveClick}
                        disabled={savingAction}
                        title={isSaved ? 'Unsave' : 'Save to your library'}
                    >
                        <svg viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{saveCount} saves</span>
                    </button>

                    {/* Share */}
                    <button
                        className={`feed-card-stat feed-card-stat-btn ${isShared ? 'feed-card-stat-active' : ''}`}
                        onClick={handleShareClick}
                        disabled={savingAction || isShared}
                        title={isShared ? 'Already shared' : 'Share to your profile'}
                    >
                        <svg viewBox="0 0 24 24" fill={isShared ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        <span>{shareCount} shares</span>
                    </button>
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

export default FeedPublicationCard;
