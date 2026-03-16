import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import type { ResearcherMatch } from '../../services/aiService';
import '../../styles/recommendations/ResearcherMatchCard.css';

interface ResearcherMatchCardProps {
    match: ResearcherMatch;
    onFollow?: (userId: string) => void;
    isFollowing?: boolean;
}

const ResearcherMatchCard: React.FC<ResearcherMatchCardProps> = ({ match, onFollow, isFollowing }) => {
    const navigate = useNavigate();
    const similarityPercent = Math.round(match.similarity * 100);

    const getSimilarityColor = () => {
        if (similarityPercent >= 70) return '#2e7d32';
        if (similarityPercent >= 40) return '#ed6c02';
        return '#757575';
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
                <button
                    className={`rmc-follow-btn ${isFollowing ? 'rmc-following' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onFollow(match.userId);
                    }}
                >
                    {isFollowing ? 'Following' : 'Follow'}
                </button>
            )}
        </div>
    );
};

export default ResearcherMatchCard;
