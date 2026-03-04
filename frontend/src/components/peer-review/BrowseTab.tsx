import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReviewablePublication } from '../../services/reviewService';
import { publicationsApi } from '../../services/publicationService';
import type { Publication } from '../../services/publicationService';
import { renderAvatar } from './prHelpers';

interface BrowseTabProps {
    publications: ReviewablePublication[];
    canReview: boolean;
    onApply: (pubId: string, pubTitle: string) => void;
    onShowDetail: (pub: Publication) => void;
    onCloseReview: (pubId: string) => void;
}

const BrowseTab: React.FC<BrowseTabProps> = ({ publications, canReview, onApply, onShowDetail, onCloseReview }) => {
    const navigate = useNavigate();

    const handleCardClick = async (pubId: string) => {
        try {
            const res = await publicationsApi.getById(pubId);
            onShowDetail(res.data);
        } catch (err) {
            console.error('Failed to load publication details', err);
        }
    };

    return (
        <>
            {!canReview && (
                <div className="pr-info-banner">
                    <span className="pr-info-banner-icon">ℹ️</span>
                    <span>Only Professor, Associate Professor and Assistant Professor can apply as reviewers. You can request reviewers for your own publications from the "My Publications" tab.</span>
                </div>
            )}
            {publications.length === 0 ? (
                <div className="pr-empty">
                    <div className="pr-empty-icon">🔍</div>
                    <h3>No publications looking for reviewers</h3>
                    <p>Check back later or enable reviewer search on your own publications.</p>
                </div>
            ) : (
                publications.map(pub => (
                    <div
                        key={pub.id}
                        className="pr-pub-card pr-pub-card-clickable"
                        onClick={() => handleCardClick(pub.id)}
                    >
                        <div className="pr-pub-header">
                            <div>
                                <h3 className="pr-pub-title">{pub.title}</h3>
                            </div>
                            <div className="pr-pub-actions" onClick={e => e.stopPropagation()}>
                                {pub.isOwner ? (
                                    <button
                                        className="pr-btn pr-btn-danger pr-btn-sm"
                                        onClick={() => onCloseReview(pub.id)}
                                    >
                                        Close Review
                                    </button>
                                ) : pub.hasApplied ? (
                                    <span className="pr-btn pr-btn-sm" style={{ background: '#d1fae5', color: '#065f46' }}>Applied ✓</span>
                                ) : canReview ? (
                                    <button
                                        className="pr-btn pr-btn-primary pr-btn-sm"
                                        onClick={() => onApply(pub.id, pub.title)}
                                    >
                                        Apply to Review
                                    </button>
                                ) : null}
                            </div>
                        </div>
                        {pub.abstract && <p className="pr-pub-abstract">{pub.abstract}</p>}
                        <div className="pr-pub-meta">
                            <div className="pr-pub-author" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${pub.author.id}`); }} style={{ cursor: 'pointer' }}>
                                {renderAvatar(pub.author.fullName, pub.author.profileImageUrl)}
                                <span>{pub.author.fullName}</span>
                            </div>
                            {pub.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="pr-pub-tag">{tag}</span>
                            ))}
                            <span className="pr-pub-reviewers">
                                {pub.reviewRequestCount} application{pub.reviewRequestCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                ))
            )}
        </>
    );
};

export default BrowseTab;
