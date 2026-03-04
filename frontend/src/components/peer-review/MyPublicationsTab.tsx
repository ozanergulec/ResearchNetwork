import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewApi } from '../../services/reviewService';
import type { MyPublicationForReview, ReviewRequest } from '../../services/reviewService';
import { renderAvatar, renderStatus, renderVerdict, formatDate } from './prHelpers';

interface MyPublicationsTabProps {
    myPublications: MyPublicationForReview[];
    onToggleSearch: (pubId: string) => void;
}

const MyPublicationsTab: React.FC<MyPublicationsTabProps> = ({ myPublications, onToggleSearch }) => {
    const navigate = useNavigate();
    const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
    const [pubReviewRequests, setPubReviewRequests] = useState<ReviewRequest[]>([]);
    const [loadingPubRequests, setLoadingPubRequests] = useState(false);

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

    const handleAccept = async (requestId: string) => {
        try {
            await reviewApi.acceptReviewer(requestId);
            if (selectedPubId) loadPubRequests(selectedPubId);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to accept');
        }
    };

    const handleReject = async (requestId: string) => {
        try {
            await reviewApi.rejectReviewer(requestId);
            if (selectedPubId) loadPubRequests(selectedPubId);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to reject');
        }
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
            {myPublications.map(pub => (
                <div key={pub.id}>
                    <div className="pr-my-pub-card">
                        <div className="pr-my-pub-info">
                            <h4 className="pr-my-pub-title">{pub.title}</h4>
                            <div className="pr-my-pub-meta">
                                {pub.reviewRequestCount} review request{pub.reviewRequestCount !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div className="pr-my-pub-actions">
                            <div className="pr-toggle" onClick={() => onToggleSearch(pub.id)}>
                                <div className={`pr-toggle-track ${pub.isLookingForReviewers ? 'active' : ''}`}>
                                    <div className="pr-toggle-thumb" />
                                </div>
                                <span className="pr-toggle-label">
                                    {pub.isLookingForReviewers ? 'Seeking reviewers' : 'Not seeking'}
                                </span>
                            </div>
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
                                    <div key={req.id} className="pr-request-card">
                                        <div className="pr-request-header">
                                            <div className="pr-request-user" onClick={() => navigate(`/profile/${req.reviewer.id}`)} style={{ cursor: 'pointer' }}>
                                                {renderAvatar(req.reviewer.fullName, req.reviewer.profileImageUrl, 36)}
                                                <div className="pr-request-user-info">
                                                    <span className="pr-request-user-name">{req.reviewer.fullName}</span>
                                                    <span className="pr-request-user-title">
                                                        {[req.reviewer.title, req.reviewer.institution].filter(Boolean).join(' • ')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="pr-request-actions">
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
                                                <div className="pr-request-review-label">Review {renderVerdict(req.verdict)}</div>
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
            ))}
        </>
    );
};

export default MyPublicationsTab;
