import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewApi } from '../../services/reviewService';
import type { MyPublicationForReview, ReviewRequest, SuggestedReviewer } from '../../services/reviewService';
import { renderAvatar, renderStatus, renderVerdict, formatDate } from './prHelpers';
import ReviewDetailModal from './ReviewDetailModal';
import { useTranslation } from '../../translations/translations';

interface MyPublicationsTabProps {
    myPublications: MyPublicationForReview[];
    onToggleSearch: (pubId: string) => void;
    highlightPubId?: string | null;
}

const MyPublicationsTab: React.FC<MyPublicationsTabProps> = ({ myPublications, onToggleSearch, highlightPubId }) => {
    const t = useTranslation();
    const navigate = useNavigate();
    const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
    const [pubReviewRequests, setPubReviewRequests] = useState<ReviewRequest[]>([]);
    const [loadingPubRequests, setLoadingPubRequests] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null);

    const [suggestPubId, setSuggestPubId] = useState<string | null>(null);
    const [suggestedReviewers, setSuggestedReviewers] = useState<SuggestedReviewer[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
    const [invitingId, setInvitingId] = useState<string | null>(null);
    const highlightRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (highlightPubId && highlightRef.current) {
            setTimeout(() => {
                highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, [highlightPubId, myPublications]);

    const loadPubRequests = async (pubId: string) => {
        if (selectedPubId === pubId) {
            setSelectedPubId(null);
            setPubReviewRequests([]);
            return;
        }
        setSelectedPubId(pubId);
        setLoadingPubRequests(true);
        try {
            const res = await reviewApi.getPublicationReviewRequests(pubId);
            setPubReviewRequests(res.data);
        } catch (err) {
            console.error('Failed to load review requests', err);
        } finally {
            setLoadingPubRequests(false);
        }
    };

    const loadSuggestions = async (pubId: string) => {
        if (suggestPubId === pubId) {
            setSuggestPubId(null);
            setSuggestedReviewers([]);
            return;
        }
        setSuggestPubId(pubId);
        setLoadingSuggestions(true);
        try {
            const res = await reviewApi.suggestReviewers(pubId);
            setSuggestedReviewers(res.data);
        } catch (err) {
            console.error('Failed to load suggestions', err);
            setSuggestedReviewers([]);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleToggleAndSuggest = async (pubId: string, isCurrentlyLooking: boolean) => {
        onToggleSearch(pubId);
        if (!isCurrentlyLooking) {
            setTimeout(() => loadSuggestions(pubId), 300);
        } else {
            if (suggestPubId === pubId) {
                setSuggestPubId(null);
                setSuggestedReviewers([]);
            }
        }
    };

    const handleInvite = async (pubId: string, reviewerId: string) => {
        setInvitingId(reviewerId);
        try {
            await reviewApi.inviteReviewer(pubId, reviewerId);
            setInvitedIds(prev => new Set(prev).add(reviewerId));
        } catch (err: any) {
            alert(err.response?.data?.message || err.response?.data || t.reviewerMatch.inviteError);
        } finally {
            setInvitingId(null);
        }
    };

    const handleAccept = async (requestId: string) => {
        try {
            await reviewApi.acceptReviewer(requestId);
            if (selectedPubId) {
                const res = await reviewApi.getPublicationReviewRequests(selectedPubId);
                setPubReviewRequests(res.data);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to accept');
        }
    };

    const handleReject = async (requestId: string) => {
        try {
            await reviewApi.rejectReviewer(requestId);
            if (selectedPubId) {
                const res = await reviewApi.getPublicationReviewRequests(selectedPubId);
                setPubReviewRequests(res.data);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to reject');
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 0.5) return '#059669';
        if (score >= 0.2) return '#d97706';
        return '#6b7280';
    };

    if (myPublications.length === 0) {
        return (
            <div className="pr-empty">
                <div className="pr-empty-icon">📚</div>
                <h3>No publications yet</h3>
                <p>Create a publication first, then you can enable reviewer search.</p>
            </div>
        );
    }

    return (
        <>
            <div className="pr-info-banner">
                <span className="pr-info-banner-icon">💡</span>
                <span>
                    {t.reviewerMatch.infoBanner}
                </span>
            </div>

            {myPublications.map(pub => {
                const isHighlighted = highlightPubId === pub.id;
                return (
                <div key={pub.id}>
                    <div
                        ref={isHighlighted ? highlightRef : undefined}
                        className={`pr-my-pub-card ${isHighlighted ? 'pr-pub-highlight' : ''}`}
                    >
                        <div className="pr-my-pub-info">
                            <h4 className="pr-my-pub-title">{pub.title}</h4>
                            <div className="pr-my-pub-meta">
                                {pub.reviewRequestCount} review request{pub.reviewRequestCount !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div className="pr-my-pub-actions">
                            <div className="pr-toggle" onClick={() => handleToggleAndSuggest(pub.id, pub.isLookingForReviewers)}>
                                <div className={`pr-toggle-track ${pub.isLookingForReviewers ? 'active' : ''}`}>
                                    <div className="pr-toggle-thumb" />
                                </div>
                                <span className="pr-toggle-label">
                                    {pub.isLookingForReviewers ? 'Seeking reviewers' : 'Not seeking'}
                                </span>
                            </div>
                            <button
                                className={`pr-btn pr-btn-sm ${suggestPubId === pub.id ? 'pr-btn-outline' : 'pr-btn-primary'}`}
                                onClick={() => loadSuggestions(pub.id)}
                            >
                                🔍 {suggestPubId === pub.id ? t.reviewerMatch.hideSuggestions : t.reviewerMatch.findReviewers}
                            </button>
                            {pub.reviewRequestCount > 0 && (
                                <button
                                    className="pr-btn pr-btn-outline pr-btn-sm"
                                    onClick={() => loadPubRequests(pub.id)}
                                >
                                    {selectedPubId === pub.id ? 'Hide' : 'View'} Applications
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ===== INLINE SUGGESTED REVIEWERS ===== */}
                    {suggestPubId === pub.id && (
                        <div className="pr-suggest-inline">
                            <div className="pr-suggest-inline-header">
                                <h4 className="pr-suggest-inline-title">
                                    ✨ {t.reviewerMatch.title}
                                </h4>
                                <span className="pr-suggest-inline-subtitle">
                                    {t.reviewerMatch.inlineDesc}
                                </span>
                            </div>

                            {loadingSuggestions ? (
                                <div className="pr-loading" style={{ padding: '1.5rem' }}>
                                    <div className="pr-spinner" />
                                    <span>{t.reviewerMatch.loading}</span>
                                </div>
                            ) : suggestedReviewers.length === 0 ? (
                                <div className="pr-suggest-inline-empty">
                                    <span>🔍</span>
                                    <p>{t.reviewerMatch.noMatchDesc}</p>
                                </div>
                            ) : (
                                <div className="pr-suggest-inline-list">
                                    {suggestedReviewers.map(reviewer => (
                                        <div
                                            key={reviewer.userId}
                                            className={`pr-suggest-card ${reviewer.isRecommended ? 'pr-suggest-recommended' : ''}`}
                                        >
                                            {reviewer.isRecommended && (
                                                <div className="pr-suggest-recommended-badge">
                                                    ★ {t.reviewerMatch.recommended}
                                                </div>
                                            )}

                                            <div className="pr-suggest-card-header">
                                                <div
                                                    className="pr-suggest-user"
                                                    onClick={() => navigate(`/profile/${reviewer.userId}`)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {renderAvatar(reviewer.fullName, reviewer.profileImageUrl, 42)}
                                                    <div className="pr-suggest-user-info">
                                                        <span className="pr-suggest-user-name">
                                                            {reviewer.fullName}
                                                            {reviewer.isVerified && <span className="pr-suggest-verified" title="Verified">✓</span>}
                                                        </span>
                                                        <span className="pr-suggest-user-title">
                                                            {[reviewer.title, reviewer.institution].filter(Boolean).join(' • ')}
                                                        </span>
                                                        {reviewer.department && (
                                                            <span className="pr-suggest-user-dept">{reviewer.department}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="pr-suggest-score" style={{ color: getScoreColor(reviewer.similarity) }}>
                                                    {(reviewer.similarity * 100).toFixed(0)}%
                                                    <span className="pr-suggest-score-label">{t.reviewerMatch.score}</span>
                                                </div>
                                            </div>

                                            {reviewer.commonTags.length > 0 && (
                                                <div className="pr-suggest-tags">
                                                    {reviewer.commonTags.map(tag => (
                                                        <span key={tag} className="pr-pub-tag">{tag}</span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="pr-suggest-stats">
                                                {reviewer.completedReviews > 0 && (
                                                    <span className="pr-suggest-stat pr-suggest-stat-review">
                                                        📋 {reviewer.completedReviews} {t.reviewerMatch.reviewsInField}
                                                    </span>
                                                )}
                                                {reviewer.commonTags.length > 0 && (
                                                    <span className="pr-suggest-stat">
                                                        🏷️ {reviewer.commonTags.length} {t.reviewerMatch.tagsMatched}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="pr-suggest-card-actions">
                                                {invitedIds.has(reviewer.userId) ? (
                                                    <button className="pr-btn pr-btn-sm pr-btn-invited" disabled>
                                                        ✓ {t.reviewerMatch.invited}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="pr-btn pr-btn-primary pr-btn-sm"
                                                        onClick={() => handleInvite(pub.id, reviewer.userId)}
                                                        disabled={invitingId === reviewer.userId}
                                                    >
                                                        {invitingId === reviewer.userId
                                                            ? t.reviewerMatch.sending
                                                            : t.reviewerMatch.sendInvite}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Expanded review requests */}
                    {selectedPubId === pub.id && (
                        <div style={{ marginLeft: '1rem', marginBottom: '1rem' }}>
                            {loadingPubRequests ? (
                                <div className="pr-loading">
                                    <div className="pr-spinner" />
                                    <span>Loading...</span>
                                </div>
                            ) : pubReviewRequests.length === 0 ? (
                                <div style={{ padding: '1rem', fontSize: '0.85rem', opacity: 0.5 }}>No applications yet.</div>
                            ) : (
                                pubReviewRequests.map(req => (
                                    <div
                                        key={req.id}
                                        className="pr-request-card pr-request-card-clickable"
                                        onClick={() => setSelectedRequest(req)}
                                    >
                                        <div className="pr-request-header">
                                            <div className="pr-request-user" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${req.reviewer.id}`); }} style={{ cursor: 'pointer' }}>
                                                {renderAvatar(req.reviewer.fullName, req.reviewer.profileImageUrl, 36)}
                                                <div className="pr-request-user-info">
                                                    <span className="pr-request-user-name">{req.reviewer.fullName}</span>
                                                    <span className="pr-request-user-title">
                                                        {[req.reviewer.title, req.reviewer.institution].filter(Boolean).join(' • ')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="pr-request-actions" onClick={e => e.stopPropagation()}>
                                                {renderStatus(req.status)}
                                                {req.status === 'Pending' && (
                                                    <>
                                                        <button className="pr-btn pr-btn-success pr-btn-sm" onClick={() => handleAccept(req.id)}>
                                                            Accept
                                                        </button>
                                                        <button className="pr-btn pr-btn-danger pr-btn-sm" onClick={() => handleReject(req.id)}>
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {req.message && <div className="pr-request-message">"{req.message}"</div>}
                                        {req.reviewComment && (
                                            <div className="pr-request-review-content">
                                                <div className="pr-request-review-label">
                                                    Review {renderVerdict(req.verdict)}
                                                    {req.reviewScore != null && (
                                                        <span className="pr-rating-inline">
                                                            <span className="pr-star pr-star-filled" style={{ fontSize: '14px' }}>★</span>
                                                            <span className="pr-rating-inline-score">{req.reviewScore}/5</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="pr-request-review-text">{req.reviewComment}</p>
                                            </div>
                                        )}
                                        <div className="pr-request-time">{formatDate(req.createdAt)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            );
            })}

            {selectedRequest && (
                <ReviewDetailModal
                    request={selectedRequest}
                    canReview={false}
                    viewAs="author"
                    onClose={() => setSelectedRequest(null)}
                    onSubmitReview={() => { }}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onRated={async () => {
                        if (selectedPubId) {
                            const res = await reviewApi.getPublicationReviewRequests(selectedPubId);
                            setPubReviewRequests(res.data);
                        }
                    }}
                />
            )}
        </>
    );
};

export default memo(MyPublicationsTab);
