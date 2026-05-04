import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReviewRequest } from '../../services/reviewService';
import { renderAvatar, renderStatus, renderVerdict, formatDate } from './prHelpers';
import ReviewDetailModal from './ReviewDetailModal';
import { API_SERVER_URL } from '../../services/apiClient';

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
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const handleDownload = async (e: React.MouseEvent, req: ReviewRequest) => {
        e.stopPropagation();
        if (!req.publicationFileUrl) return;
        setDownloadingId(req.id);
        try {
            const downloadUrl = `${API_SERVER_URL}/api/publications/download?fileUrl=${encodeURIComponent(req.publicationFileUrl)}`;
            const token = localStorage.getItem('token');
            const response = await fetch(downloadUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            const ext = req.publicationFileUrl.split('.').pop() || 'pdf';
            link.download = `${req.publicationTitle}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            alert('Download failed. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

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
                                    {req.isDoubleBlind && (
                                        <span className="pr-blind-badge pr-blind-badge-inline" title="Double-blind review">🔒</span>
                                    )}
                                    {req.publicationTitle}
                                </div>
                                {req.author.id === '00000000-0000-0000-0000-000000000000' ? (
                                    <div className="pr-pub-author" style={{ marginTop: '0.25rem' }}>
                                        {renderAvatar('Anonymous Author', null, 22)}
                                        <span style={{ fontSize: '0.8rem' }}>by Anonymous Author</span>
                                    </div>
                                ) : (
                                    <div className="pr-pub-author" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${req.author.id}`); }} style={{ cursor: 'pointer', marginTop: '0.25rem' }}>
                                        {renderAvatar(req.author.fullName, req.author.profileImageUrl, 22)}
                                        <span style={{ fontSize: '0.8rem' }}>by {req.author.fullName}</span>
                                    </div>
                                )}
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
                                {req.status === 'Accepted' && req.publicationFileUrl && (
                                    <button
                                        className="pr-btn pr-btn-outline pr-btn-sm"
                                        onClick={e => handleDownload(e, req)}
                                        disabled={downloadingId === req.id}
                                        title="Download publication file"
                                    >
                                        {downloadingId === req.id ? 'Downloading...' : '⬇ Download File'}
                                    </button>
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
