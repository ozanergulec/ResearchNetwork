import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import type { ResearcherMatch } from '../../services/aiService';
import { openFloatingChatWithUser } from '../../services/chatEvents';
import { useTranslation } from '../../translations/translations';
import '../../styles/recommendations/ResearcherMatchCard.css';

interface ResearcherMatchCardProps {
    match: ResearcherMatch;
    onFollow?: (userId: string) => void;
    isFollowing?: boolean;
}

const ResearcherMatchCard: React.FC<ResearcherMatchCardProps> = ({ match, onFollow, isFollowing }) => {
    const navigate = useNavigate();
    const t = useTranslation();
    const similarityPercent = Math.round(match.similarity * 100);

    const getSimilarityColor = () => {
        if (similarityPercent >= 70) return '#2e7d32';
        if (similarityPercent >= 40) return '#ed6c02';
        return '#757575';
    };

    const handleMessageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        openFloatingChatWithUser({
            userId: match.userId,
            fullName: match.fullName,
            profileImageUrl: match.profileImageUrl ?? null,
            isVerified: match.isVerified,
            title: match.title ?? null,
            institution: match.institution ?? null,
        });
    };

    return (
        <div className="rmc-card" onClick={() => navigate(`/profile/${match.userId}`)}>
            <div className="rmc-similarity-badge" style={{ background: getSimilarityColor() }}>
                {similarityPercent}% Match
            </div>

            <div className="rmc-profile">
                <Avatar
                    name={match.fullName}
                    imageUrl={match.profileImageUrl}
                    size="medium"
                />
                <h3 className="rmc-name">
                    {match.fullName}
                    {match.isVerified && <span className="rmc-verified" title="Verified">✓</span>}
                </h3>
                <p className="rmc-title">{match.title || 'Researcher'}</p>
                {match.institution && <p className="rmc-institution">{match.institution}</p>}
                {match.department && <p className="rmc-department">{match.department}</p>}
            </div>

            {match.commonTags.length > 0 && (
                <div className="rmc-tags">
                    {match.commonTags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rmc-tag">{tag}</span>
                    ))}
                    {match.commonTags.length > 4 && (
                        <span className="rmc-tag rmc-tag-more">+{match.commonTags.length - 4}</span>
                    )}
                </div>
            )}

            <div className="rmc-similarity-bar">
                <div className="rmc-bar-bg">
                    <div
                        className="rmc-bar-fill"
                        style={{ width: `${similarityPercent}%`, background: getSimilarityColor() }}
                    />
                </div>
            </div>

            {onFollow && (
                <div className="rmc-actions">
                    <button
                        className={`rmc-follow-btn ${isFollowing ? 'rmc-following' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onFollow(match.userId);
                        }}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>

                    {isFollowing && (
                        <button
                            type="button"
                            className="rmc-message-btn"
                            onClick={handleMessageClick}
                            aria-label={t.recommendations.messageAria}
                        >
                            <svg
                                width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            {t.recommendations.message}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ResearcherMatchCard;
