import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReviewRequest } from '../../services/reviewService';
import { reviewApi } from '../../services/reviewService';
import { renderAvatar, renderStatus, renderVerdict, formatDate } from './prHelpers';

interface ReviewDetailModalProps {
    request: ReviewRequest;
    canReview: boolean;
    viewAs?: 'reviewer' | 'author';
    onClose: () => void;
    onSubmitReview: (requestId: string, pubTitle: string) => void;
    onAccept?: (requestId: string) => void;
    onReject?: (requestId: string) => void;
    onRated?: () => void;
}

const StarRating: React.FC<{
    value: number;
    onChange?: (val: number) => void;
    readonly?: boolean;
    size?: number;
}> = ({ value, onChange, readonly = false, size = 24 }) => {
    const [hovered, setHovered] = useState(0);

    return (
        <div className="pr-star-rating" style={{ display: 'flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map(star => (
                <span
                    key={star}
                    className={`pr-star ${star <= (hovered || value) ? 'pr-star-filled' : 'pr-star-empty'}`}
                    style={{
                        fontSize: size,
                        cursor: readonly ? 'default' : 'pointer',
                        transition: 'transform 0.15s ease, color 0.15s ease',
                        transform: !readonly && star <= hovered ? 'scale(1.15)' : 'scale(1)',
                    }}
                    onClick={() => !readonly && onChange?.(star)}
                    onMouseEnter={() => !readonly && setHovered(star)}
                    onMouseLeave={() => !readonly && setHovered(0)}
                >
                    {star <= (hovered || value) ? '★' : '☆'}
                </span>
            ))}
        </div>
    );
};

const ReviewDetailModal: React.FC<ReviewDetailModalProps> = ({
    request, canReview, viewAs = 'reviewer', onClose, onSubmitReview, onAccept, onReject, onRated
}) => {
    const navigate = useNavigate();
    const isAuthorView = viewAs === 'author';
    const person = isAuthorView ? request.reviewer : request.author;
    const personLabel = isAuthorView ? 'Reviewer' : 'Publication Author';

    // Rating state
    const [ratingScore, setRatingScore] = useState(0);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [ratingError, setRatingError] = useState<string | null>(null);
    const [ratingSuccess, setRatingSuccess] = useState(false);

    // Live request state (fetched on mount)
    const [liveRequest, setLiveRequest] = useState<ReviewRequest>(request);
    const [loadingLive, setLoadingLive] = useState(true);

    React.useEffect(() => {
        const fetchRequest = async () => {
            try {
                const res = await reviewApi.getReviewRequest(request.id);
                setLiveRequest(res.data);
                if (res.data.reviewScore) {
                    setRatingScore(res.data.reviewScore);
                }
            } catch (err) {
                console.error("Failed to fetch fresh review request", err);
            } finally {
                setLoadingLive(false);
            }
        };
        fetchRequest();
    }, [request.id]);

    const handleRateReview = async () => {
        if (ratingScore < 1 || ratingScore > 5) {
            setRatingError('Please select a score between 1 and 5.');
            return;
        }
        setRatingSubmitting(true);
        setRatingError(null);
        try {
            await reviewApi.rateReview(request.id, ratingScore);
            setRatingSuccess(true);
            onRated?.();
        } catch (err: any) {
            setRatingError(err.response?.data || 'Failed to rate review.');
        } finally {
            setRatingSubmitting(false);
        }
    };

    const alreadyRated = request.reviewScore !== null && request.reviewScore !== undefined;

    return (
        <div className="pr-modal-overlay" onClick={onClose}>
            <div className="pr-detail-modal" onClick={e => e.stopPropagation()}>
                <button className="pr-detail-close" onClick={onClose}>×</button>

                {loadingLive && (
                    <div style={{ position: 'absolute', top: '10px', right: '40px', fontSize: '0.8rem', opacity: 0.5 }}>
                        Fetching latest...
                    </div>
                )}

                {/* Header */}
                <div className="pr-detail-header">
                    <h2 className="pr-detail-title">{request.publicationTitle}</h2>
                    <div className="pr-detail-status">{renderStatus(request.status)}</div>
                </div>

                {/* Person */}
                <div
                    className="pr-detail-author"
                    onClick={() => { onClose(); navigate(`/profile/${person.id}`); }}
                >
                    {renderAvatar(person.fullName, person.profileImageUrl, 36)}
                    <div className="pr-detail-author-info">
                        <span className="pr-detail-author-name">{person.fullName}</span>
                        <span className="pr-detail-author-sub">
                            {personLabel}
                            {person.title && ` · ${person.title}`}
                            {person.institution && ` · ${person.institution}`}
                        </span>
                    </div>
                </div>

                <div className="pr-detail-divider" />

                {/* Application Details */}
                <div className="pr-detail-section">
                    <h4 className="pr-detail-section-title">Application Details</h4>
                    <div className="pr-detail-row">
                        <span className="pr-detail-label">Status</span>
                        <span>{renderStatus(liveRequest.status)}</span>
                    </div>
                    <div className="pr-detail-row">
                        <span className="pr-detail-label">Applied</span>
                        <span className="pr-detail-value">{formatDate(liveRequest.createdAt)}</span>
                    </div>
                    {liveRequest.updatedAt && (
                        <div className="pr-detail-row">
                            <span className="pr-detail-label">Last Updated</span>
                            <span className="pr-detail-value">{formatDate(liveRequest.updatedAt)}</span>
                        </div>
                    )}
                </div>

                {/* Application Message */}
                {liveRequest.message && (
                    <>
                        <div className="pr-detail-divider" />
                        <div className="pr-detail-section">
                            <h4 className="pr-detail-section-title">
                                {isAuthorView ? 'Application Message' : 'Your Application Message'}
                            </h4>
                            <div className="pr-detail-message">"{liveRequest.message}"</div>
                        </div>
                    </>
                )}

                {/* Review (if submitted) */}
                {liveRequest.reviewComment && (
                    <>
                        <div className="pr-detail-divider" />
                        <div className="pr-detail-section">
                            <h4 className="pr-detail-section-title">
                                {isAuthorView ? 'Review' : 'Your Review'} {renderVerdict(liveRequest.verdict)}
                            </h4>
                            <div className="pr-detail-review-text">{liveRequest.reviewComment}</div>
                        </div>
                    </>
                )}

                {/* Review Rating Section — shown for author on completed reviews */}
                {isAuthorView && liveRequest.status === 'Completed' && (
                    <>
                        <div className="pr-detail-divider" />
                        <div className="pr-detail-section">
                            <h4 className="pr-detail-section-title">Rate This Review</h4>
                            {ratingSuccess ? (
                                <div className="pr-rating-display pr-rating-success">
                                    <StarRating value={ratingScore} readonly size={22} />
                                    <span className="pr-rating-label">
                                        Rating saved! ({ratingScore}/5)
                                    </span>
                                </div>
                            ) : (
                                <div className="pr-rating-form">
                                    <p className="pr-rating-hint">
                                        {alreadyRated
                                            ? 'You previously rated this review. Select a new score to update:'
                                            : 'How would you rate this review? (1 = Poor, 5 = Excellent)'}
                                    </p>
                                    <StarRating
                                        value={ratingScore || (liveRequest.reviewScore ?? 0)}
                                        onChange={setRatingScore}
                                        size={28}
                                    />
                                    {ratingError && (
                                        <div className="pr-rating-error">{ratingError}</div>
                                    )}
                                    <button
                                        className="pr-btn pr-btn-primary pr-btn-sm"
                                        style={{ marginTop: '0.75rem' }}
                                        onClick={handleRateReview}
                                        disabled={ratingScore === 0 || ratingSubmitting || (alreadyRated && ratingScore === liveRequest.reviewScore)}
                                    >
                                        {ratingSubmitting ? 'Saving...' : alreadyRated ? 'Update Rating' : 'Submit Rating'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Show rating for reviewer view (read-only) */}
                {!isAuthorView && alreadyRated && (
                    <>
                        <div className="pr-detail-divider" />
                        <div className="pr-detail-section">
                            <h4 className="pr-detail-section-title">Review Rating</h4>
                            <div className="pr-rating-display">
                                <StarRating value={liveRequest.reviewScore!} readonly size={22} />
                                <span className="pr-rating-label">
                                    The author rated your review {liveRequest.reviewScore}/5
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* Actions */}
                <div className="pr-detail-divider" />
                <div className="pr-detail-actions">
                    {/* Author view: accept/reject pending requests */}
                    {isAuthorView && liveRequest.status === 'Pending' && onAccept && onReject && (
                        <>
                            <button
                                className="pr-btn pr-btn-success"
                                onClick={() => { onAccept(liveRequest.id); onClose(); }}
                            >
                                Accept
                            </button>
                            <button
                                className="pr-btn pr-btn-danger"
                                onClick={() => { onReject(liveRequest.id); onClose(); }}
                            >
                                Reject
                            </button>
                        </>
                    )}
                    {/* Reviewer view: submit review */}
                    {!isAuthorView && liveRequest.status === 'Accepted' && canReview && (
                        <button
                            className="pr-btn pr-btn-primary"
                            onClick={() => {
                                onClose();
                                onSubmitReview(liveRequest.id, liveRequest.publicationTitle);
                            }}
                        >
                            Submit Review
                        </button>
                    )}
                    <button className="pr-btn pr-btn-outline" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewDetailModal;
