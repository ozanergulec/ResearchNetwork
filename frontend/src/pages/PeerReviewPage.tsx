import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { reviewApi } from '../services/reviewService';
import type { ReviewablePublication, ReviewRequest, MyPublicationForReview } from '../services/reviewService';
import { publicationsApi } from '../services/publicationService';
import type { Publication } from '../services/publicationService';
import PublicationDetailModal from '../components/feed/PublicationDetailModal';
import { API_SERVER_URL } from '../services/apiClient';
import '../styles/pages/PeerReviewPage.css';

type Tab = 'browse' | 'my-applications' | 'my-publications';

const PeerReviewPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('browse');
    const [loading, setLoading] = useState(true);

    // Browse tab
    const [publications, setPublications] = useState<ReviewablePublication[]>([]);

    // My applications tab
    const [myRequests, setMyRequests] = useState<ReviewRequest[]>([]);

    // My publications tab
    const [myPublications, setMyPublications] = useState<MyPublicationForReview[]>([]);
    const [selectedPubId, setSelectedPubId] = useState<string | null>(null);
    const [pubReviewRequests, setPubReviewRequests] = useState<ReviewRequest[]>([]);
    const [loadingPubRequests, setLoadingPubRequests] = useState(false);

    // Modals
    const [applyModal, setApplyModal] = useState<{ pubId: string; pubTitle: string } | null>(null);
    const [applyMessage, setApplyMessage] = useState('');
    const [submitModal, setSubmitModal] = useState<{ requestId: string; pubTitle: string } | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewVerdict, setReviewVerdict] = useState('Approve');
    const [submitting, setSubmitting] = useState(false);

    // Eligibility
    const [canReview, setCanReview] = useState(false);

    // Publication detail modal
    const [detailPub, setDetailPub] = useState<Publication | null>(null);

    const getImageUrl = (url?: string | null) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_SERVER_URL}${url}`;
    };

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Fetch data based on active tab
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'browse') {
                const res = await reviewApi.getLookingForReviewers();
                setPublications(res.data);
            } else if (activeTab === 'my-applications') {
                const res = await reviewApi.getMyRequests();
                setMyRequests(res.data);
            } else if (activeTab === 'my-publications') {
                const res = await reviewApi.getMyPublications();
                setMyPublications(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch reviewer eligibility on mount
    useEffect(() => {
        reviewApi.canReview()
            .then(res => setCanReview(res.data.canReview))
            .catch(() => setCanReview(false));
    }, []);

    // Load review requests for a selected publication
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

    // Actions
    const handleApply = async () => {
        if (!applyModal) return;
        setSubmitting(true);
        try {
            await reviewApi.applyToReview(applyModal.pubId, applyMessage);
            setApplyModal(null);
            setApplyMessage('');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || err.response?.data || 'Failed to apply');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleSearch = async (pubId: string) => {
        try {
            await reviewApi.toggleReviewSearch(pubId);
            fetchData();
        } catch (err) {
            console.error('Failed to toggle review search', err);
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

    const handleSubmitReview = async () => {
        if (!submitModal || !reviewComment.trim()) return;
        setSubmitting(true);
        try {
            await reviewApi.submitReview(submitModal.requestId, reviewComment, reviewVerdict);
            setSubmitModal(null);
            setReviewComment('');
            setReviewVerdict('Approve');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    // Render helpers
    const renderAvatar = (name: string, imageUrl?: string | null, size = 28) => {
        const url = getImageUrl(imageUrl);
        if (url) {
            return <img src={url} alt={name} className="pr-pub-author-avatar" style={{ width: size, height: size }} />;
        }
        return (
            <div className="pr-pub-author-initials" style={{ width: size, height: size, fontSize: size * 0.22 }}>
                {getInitials(name)}
            </div>
        );
    };

    const renderStatus = (status: string) => (
        <span className={`pr-status pr-status-${status.toLowerCase()}`}>{status}</span>
    );

    const renderVerdict = (verdict: string | null) => {
        if (!verdict) return null;
        const labels: Record<string, string> = {
            Approve: 'Approved',
            MinorRevision: 'Minor Revision',
            MajorRevision: 'Major Revision',
            Reject: 'Rejected'
        };
        return <span className={`pr-verdict pr-verdict-${verdict}`}>{labels[verdict] || verdict}</span>;
    };

    // ==================== BROWSE TAB ====================
    const renderBrowseTab = () => {
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
                            onClick={async () => {
                                try {
                                    const res = await publicationsApi.getById(pub.id);
                                    setDetailPub(res.data);
                                } catch (err) {
                                    console.error('Failed to load publication details', err);
                                }
                            }}
                        >
                            <div className="pr-pub-header">
                                <div>
                                    <h3 className="pr-pub-title">{pub.title}</h3>
                                </div>
                                <div className="pr-pub-actions" onClick={e => e.stopPropagation()}>
                                    {pub.isOwner ? (
                                        <span className="pr-btn pr-btn-sm" style={{ opacity: 0.5, cursor: 'default' }}>Your publication</span>
                                    ) : pub.hasApplied ? (
                                        <span className="pr-btn pr-btn-sm" style={{ background: '#d1fae5', color: '#065f46' }}>Applied ✓</span>
                                    ) : canReview ? (
                                        <button
                                            className="pr-btn pr-btn-primary pr-btn-sm"
                                            onClick={() => setApplyModal({ pubId: pub.id, pubTitle: pub.title })}
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

    // ==================== MY APPLICATIONS TAB ====================
    const renderMyApplicationsTab = () => {
        if (myRequests.length === 0) {
            return (
                <div className="pr-empty">
                    <div className="pr-empty-icon">📋</div>
                    <h3>No review applications yet</h3>
                    <p>Browse publications looking for reviewers and apply to review them.</p>
                </div>
            );
        }

        return myRequests.map(req => (
            <div key={req.id} className="pr-request-card">
                <div className="pr-request-header">
                    <div>
                        <div className="pr-request-pub-title">📄 {req.publicationTitle}</div>
                        <div className="pr-pub-author" onClick={() => navigate(`/profile/${req.author.id}`)} style={{ cursor: 'pointer', marginTop: '0.25rem' }}>
                            {renderAvatar(req.author.fullName, req.author.profileImageUrl, 22)}
                            <span style={{ fontSize: '0.8rem' }}>by {req.author.fullName}</span>
                        </div>
                    </div>
                    <div className="pr-request-actions">
                        {renderStatus(req.status)}
                        {req.status === 'Accepted' && canReview && (
                            <button
                                className="pr-btn pr-btn-primary pr-btn-sm"
                                onClick={() => setSubmitModal({ requestId: req.id, pubTitle: req.publicationTitle })}
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
        ));
    };

    // ==================== MY PUBLICATIONS TAB ====================
    const renderMyPublicationsTab = () => {
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
                                <div className="pr-toggle" onClick={() => handleToggleSearch(pub.id)}>
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

    return (
        <div className="peer-review-page">
            <Navbar currentPage="peer-review" />

            <div className="pr-container">
                <div className="pr-header">
                    <h1 className="pr-title">Peer Review</h1>
                    <p className="pr-subtitle">Review publications or find reviewers for your work</p>
                </div>

                {/* Tabs */}
                <div className="pr-tabs">
                    <button
                        className={`pr-tab ${activeTab === 'browse' ? 'active' : ''}`}
                        onClick={() => setActiveTab('browse')}
                    >
                        Looking for Reviewers
                    </button>
                    <button
                        className={`pr-tab ${activeTab === 'my-applications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('my-applications')}
                    >
                        My Applications
                        {myRequests.length > 0 && activeTab !== 'my-applications' && (
                            <span className="pr-tab-badge">{myRequests.length}</span>
                        )}
                    </button>
                    <button
                        className={`pr-tab ${activeTab === 'my-publications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('my-publications')}
                    >
                        My Publications
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="pr-loading">
                        <div className="pr-spinner" />
                        <span>Loading...</span>
                    </div>
                ) : (
                    <>
                        {activeTab === 'browse' && renderBrowseTab()}
                        {activeTab === 'my-applications' && renderMyApplicationsTab()}
                        {activeTab === 'my-publications' && renderMyPublicationsTab()}
                    </>
                )}
            </div>

            {/* Apply Modal */}
            {applyModal && (
                <div className="pr-modal-overlay" onClick={() => setApplyModal(null)}>
                    <div className="pr-modal" onClick={e => e.stopPropagation()}>
                        <h3>Apply to Review</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', opacity: 0.7, marginBottom: '1rem' }}>
                            You are applying to review: <strong>{applyModal.pubTitle}</strong>
                        </p>
                        <label>Message (optional)</label>
                        <textarea
                            value={applyMessage}
                            onChange={e => setApplyMessage(e.target.value)}
                            placeholder="Describe your expertise and why you'd like to review this publication..."
                        />
                        <div className="pr-modal-actions">
                            <button className="pr-btn pr-btn-outline" onClick={() => setApplyModal(null)}>Cancel</button>
                            <button
                                className="pr-btn pr-btn-primary"
                                onClick={handleApply}
                                disabled={submitting}
                            >
                                {submitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submit Review Modal */}
            {submitModal && (
                <div className="pr-modal-overlay" onClick={() => setSubmitModal(null)}>
                    <div className="pr-modal" onClick={e => e.stopPropagation()}>
                        <h3>Submit Review</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', opacity: 0.7, marginBottom: '1rem' }}>
                            Reviewing: <strong>{submitModal.pubTitle}</strong>
                        </p>
                        <label>Verdict</label>
                        <select value={reviewVerdict} onChange={e => setReviewVerdict(e.target.value)}>
                            <option value="Approve">Approve</option>
                            <option value="MinorRevision">Minor Revision</option>
                            <option value="MajorRevision">Major Revision</option>
                            <option value="Reject">Reject</option>
                        </select>
                        <label>Review Comments</label>
                        <textarea
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            placeholder="Write your detailed review comments here..."
                            style={{ minHeight: '150px' }}
                        />
                        <div className="pr-modal-actions">
                            <button className="pr-btn pr-btn-outline" onClick={() => setSubmitModal(null)}>Cancel</button>
                            <button
                                className="pr-btn pr-btn-primary"
                                onClick={handleSubmitReview}
                                disabled={submitting || !reviewComment.trim()}
                            >
                                {submitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Publication Detail Modal */}
            {detailPub && (
                <PublicationDetailModal
                    publication={detailPub}
                    onClose={() => setDetailPub(null)}
                />
            )}
        </div>
    );
};

export default PeerReviewPage;
