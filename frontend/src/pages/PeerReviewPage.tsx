import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/common/Navbar';
import { reviewApi } from '../services/reviewService';
import type { ReviewablePublication, ReviewRequest, MyPublicationForReview } from '../services/reviewService';
import type { Publication } from '../services/publicationService';
import PublicationDetailModal from '../components/feed/PublicationDetailModal';
import BrowseTab from '../components/peer-review/BrowseTab';
import MyApplicationsTab from '../components/peer-review/MyApplicationsTab';
import MyPublicationsTab from '../components/peer-review/MyPublicationsTab';
import ApplyModal from '../components/peer-review/ApplyModal';
import SubmitReviewModal from '../components/peer-review/SubmitReviewModal';
import '../styles/pages/PeerReviewPage.css';

type Tab = 'browse' | 'my-applications' | 'my-publications';

const PeerReviewPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('browse');
    const [loading, setLoading] = useState(true);

    // Data
    const [publications, setPublications] = useState<ReviewablePublication[]>([]);
    const [myRequests, setMyRequests] = useState<ReviewRequest[]>([]);
    const [myPublications, setMyPublications] = useState<MyPublicationForReview[]>([]);

    // Modals
    const [applyModal, setApplyModal] = useState<{ pubId: string; pubTitle: string } | null>(null);
    const [submitModal, setSubmitModal] = useState<{ requestId: string; pubTitle: string } | null>(null);
    const [detailPub, setDetailPub] = useState<Publication | null>(null);

    // Eligibility
    const [canReview, setCanReview] = useState(false);

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

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        reviewApi.canReview()
            .then(res => setCanReview(res.data.canReview))
            .catch(() => setCanReview(false));
    }, []);

    const handleToggleSearch = async (pubId: string) => {
        try {
            await reviewApi.toggleReviewSearch(pubId);
            fetchData();
        } catch (err) {
            console.error('Failed to toggle review search', err);
        }
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
                        {activeTab === 'browse' && (
                            <BrowseTab
                                publications={publications}
                                canReview={canReview}
                                onApply={(pubId, pubTitle) => setApplyModal({ pubId, pubTitle })}
                                onShowDetail={setDetailPub}
                            />
                        )}
                        {activeTab === 'my-applications' && (
                            <MyApplicationsTab
                                myRequests={myRequests}
                                canReview={canReview}
                                onSubmitReview={(requestId, pubTitle) => setSubmitModal({ requestId, pubTitle })}
                            />
                        )}
                        {activeTab === 'my-publications' && (
                            <MyPublicationsTab
                                myPublications={myPublications}
                                onToggleSearch={handleToggleSearch}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {applyModal && (
                <ApplyModal
                    pubId={applyModal.pubId}
                    pubTitle={applyModal.pubTitle}
                    onClose={() => setApplyModal(null)}
                    onSuccess={() => { setApplyModal(null); fetchData(); }}
                />
            )}

            {submitModal && (
                <SubmitReviewModal
                    requestId={submitModal.requestId}
                    pubTitle={submitModal.pubTitle}
                    onClose={() => setSubmitModal(null)}
                    onSuccess={() => { setSubmitModal(null); fetchData(); }}
                />
            )}

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
