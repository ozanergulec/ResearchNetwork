import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReviewRequest } from '../../services/reviewService';
import { renderAvatar, renderStatus, renderVerdict, formatDate } from './prHelpers';

interface ReviewDetailModalProps {
    request: ReviewRequest;
    canReview: boolean;
    viewAs?: 'reviewer' | 'author';
    onClose: () => void;
    onSubmitReview: (requestId: string, pubTitle: string) => void;
    onAccept?: (requestId: string) => void;
    onReject?: (requestId: string) => void;
}

const ReviewDetailModal: React.FC<ReviewDetailModalProps> = ({
    request, canReview, viewAs = 'reviewer', onClose, onSubmitReview, onAccept, onReject
}) => {
    const navigate = useNavigate();
    const isAuthorView = viewAs === 'author';
    const person = isAuthorView ? request.reviewer : request.author;
    const personLabel = isAuthorView ? 'Reviewer' : 'Publication Author';

    return (
        <div className="pr-modal-overlay" onClick={onClose}>
            <div className="pr-detail-modal" onClick={e => e.stopPropagation()}>
                <button className="pr-detail-close" onClick={onClose}>×</button>

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
                        <span>{renderStatus(request.status)}</span>
                    </div>
                    <div className="pr-detail-row">
                        <span className="pr-detail-label">Applied</span>
                        <span className="pr-detail-value">{formatDate(request.createdAt)}</span>
                    </div>
                    {request.updatedAt && (
                        <div className="pr-detail-row">
                            <span className="pr-detail-label">Last Updated</span>
                            <span className="pr-detail-value">{formatDate(request.updatedAt)}</span>
                        </div>
                    )}
                </div>

                {/* Application Message */}
                {request.message && (
                    <>
                        <div className="pr-detail-divider" />
                        <div className="pr-detail-section">
                            <h4 className="pr-detail-section-title">
                                {isAuthorView ? 'Application Message' : 'Your Application Message'}
                            </h4>
                            <div className="pr-detail-message">"{request.message}"</div>
                        </div>
                    </>
                )}

                {/* Review (if submitted) */}
                {request.reviewComment && (
                    <>
                        <div className="pr-detail-divider" />
                        <div className="pr-detail-section">
                            <h4 className="pr-detail-section-title">
                                {isAuthorView ? 'Review' : 'Your Review'} {renderVerdict(request.verdict)}
                            </h4>
                            <div className="pr-detail-review-text">{request.reviewComment}</div>
                        </div>
                    </>
                )}

                {/* Actions */}
                <div className="pr-detail-divider" />
                <div className="pr-detail-actions">
                    {/* Author view: accept/reject pending requests */}
                    {isAuthorView && request.status === 'Pending' && onAccept && onReject && (
                        <>
                            <button
                                className="pr-btn pr-btn-success"
                                onClick={() => { onAccept(request.id); onClose(); }}
                            >
                                Accept
                            </button>
                            <button
                                className="pr-btn pr-btn-danger"
                                onClick={() => { onReject(request.id); onClose(); }}
                            >
                                Reject
                            </button>
                        </>
                    )}
                    {/* Reviewer view: submit review */}
                    {!isAuthorView && request.status === 'Accepted' && canReview && (
                        <button
                            className="pr-btn pr-btn-primary"
                            onClick={() => {
                                onClose();
                                onSubmitReview(request.id, request.publicationTitle);
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
