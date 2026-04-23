import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReviewRequest } from '../../services/reviewService';
import { renderAvatar, renderStatus, renderVerdict, formatDate } from './prHelpers';
import ReviewDetailModal from './ReviewDetailModal';

interface MyApplicationsTabProps {
    myRequests: ReviewRequest[];
    canReview: boolean;
    onSubmitReview: (requestId: string, pubTitle: string) => void;
    onAcceptInvitation: (requestId: string) => void;
    onDeclineInvitation: (requestId: string) => void;
    highlightPubId?: string | null;
}

const MyApplicationsTab: React.FC<MyApplicationsTabProps> = ({
    myRequests,
    canReview,
    onSubmitReview,
    onAcceptInvitation,
    onDeclineInvitation,
    highlightPubId
}) => {
    const navigate = useNavigate();
    const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null);
    const highlightRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (highlightPubId && highlightRef.current) {
            const timer = window.setTimeout(() => {
                highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
            return () => window.clearTimeout(timer);
        }
    }, [highlightPubId, myRequests]);

    if (myRequests.length === 0) {
        return (
            <div className="pr-empty">
                <div className="pr-empty-icon">📋</div>
                <h3>No review applications yet</h3>
                <p>Browse publications looking for reviewers and apply to review them.</p>
            </div>
        );
    }

    return (
        <>
            {myRequests.map(req => {
                const isHighlighted = highlightPubId === req.publicationId;
                const isInvitation = req.status === 'Invited';
                return (
                    <div
                        key={req.id}
                        ref={isHighlighted ? highlightRef : undefined}
                        className={`pr-request-card pr-request-card-clickable ${isHighlighted ? 'pr-pub-highlight' : ''} ${isInvitation ? 'pr-request-card-invited' : ''}`}
                        onClick={() => setSelectedRequest(req)}
                    >
                        <div className="pr-request-header">
                            <div>
                                <div className="pr-request-pub-title">
                                    {isInvitation && (
                                        <span className="pr-invitation-badge">Invitation</span>
                                    )}
                                    {req.publicationTitle}
                                </div>
                                <div className="pr-pub-author" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${req.author.id}`); }} style={{ cursor: 'pointer', marginTop: '0.25rem' }}>
                                    {renderAvatar(req.author.fullName, req.author.profileImageUrl, 22)}
                                    <span style={{ fontSize: '0.8rem' }}>by {req.author.fullName}</span>
                                </div>
                            </div>
                            <div className="pr-request-actions" onClick={e => e.stopPropagation()}>
                                {renderStatus(req.status)}
                                {isInvitation && canReview && (
                                    <>
                                        <button
                                            className="pr-btn pr-btn-success pr-btn-sm"
                                            onClick={() => onAcceptInvitation(req.id)}
                                        >
                                            Accept Invitation
                                        </button>
                                        <button
                                            className="pr-btn pr-btn-outline pr-btn-sm"
                                            onClick={() => onDeclineInvitation(req.id)}
                                        >
                                            Decline
                                        </button>
                                    </>
                                )}
                                {req.status === 'Accepted' && canReview && (
                                    <button
                                        className="pr-btn pr-btn-primary pr-btn-sm"
                                        onClick={() => onSubmitReview(req.id, req.publicationTitle)}
                                    >
                                        Submit Review
                                    </button>
                                )}
                            </div>
                        </div>
                        {req.message && <div className="pr-request-message">"{req.message}"</div>}
                        {req.reviewComment && (
                            <div className="pr-request-review-content">
                                <div className="pr-request-review-label">Your Review {renderVerdict(req.verdict)}</div>
                                <p className="pr-request-review-text">{req.reviewComment}</p>
                            </div>
                        )}
                        <div className="pr-request-time">{formatDate(req.createdAt)}</div>
                    </div>
                );
            })}

            {selectedRequest && (
                <ReviewDetailModal
                    request={selectedRequest}
                    canReview={canReview}
                    onClose={() => setSelectedRequest(null)}
                    onSubmitReview={onSubmitReview}
                    onAcceptInvitation={onAcceptInvitation}
                    onDeclineInvitation={onDeclineInvitation}
                />
            )}
        </>
    );
};

export default memo(MyApplicationsTab);
