import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReviewRequest } from '../../services/reviewService';
import { renderAvatar, renderStatus, renderVerdict, formatDate } from './prHelpers';
import ReviewDetailModal from './ReviewDetailModal';

interface MyApplicationsTabProps {
    myRequests: ReviewRequest[];
    canReview: boolean;
    onSubmitReview: (requestId: string, pubTitle: string) => void;
}

const MyApplicationsTab: React.FC<MyApplicationsTabProps> = ({ myRequests, canReview, onSubmitReview }) => {
    const navigate = useNavigate();
    const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null);

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
            {myRequests.map(req => (
                <div
                    key={req.id}
                    className="pr-request-card pr-request-card-clickable"
                    onClick={() => setSelectedRequest(req)}
                >
                    <div className="pr-request-header">
                        <div>
                            <div className="pr-request-pub-title">{req.publicationTitle}</div>
                            <div className="pr-pub-author" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${req.author.id}`); }} style={{ cursor: 'pointer', marginTop: '0.25rem' }}>
                                {renderAvatar(req.author.fullName, req.author.profileImageUrl, 22)}
                                <span style={{ fontSize: '0.8rem' }}>by {req.author.fullName}</span>
                            </div>
                        </div>
                        <div className="pr-request-actions" onClick={e => e.stopPropagation()}>
                            {renderStatus(req.status)}
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
            ))}

            {selectedRequest && (
                <ReviewDetailModal
                    request={selectedRequest}
                    canReview={canReview}
                    onClose={() => setSelectedRequest(null)}
                    onSubmitReview={onSubmitReview}
                />
            )}
        </>
    );
};

export default MyApplicationsTab;
