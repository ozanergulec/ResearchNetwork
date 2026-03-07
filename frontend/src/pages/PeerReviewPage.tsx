import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { useTranslation } from '../translations/translations';
import '../styles/pages/PeerReviewPage.css';

type Tab = 'browse' | 'my-applications' | 'my-publications';

const PeerReviewPage: React.FC = () => {
    const t = useTranslation();
    const [searchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as Tab) || 'browse';
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [loading, setLoading] = useState(true);

    // Data
    const [publications, setPublications] = useState<ReviewablePublication[]>([]);
    const [myRequests, setMyRequests] = useState<ReviewRequest[]>([]);
    const [myPublications, setMyPublications] = useState<MyPublicationForReview[]>([]);

    // Pagination for browse tab
    const [browsePage, setBrowsePage] = useState(1);
    const [browseTotalCount, setBrowseTotalCount] = useState(0);
    const [browseTotalPages, setBrowseTotalPages] = useState(1);

    // Modals
    const [applyModal, setApplyModal] = useState<{ pubId: string; pubTitle: string } | null>(null);
    const [submitModal, setSubmitModal] = useState<{ requestId: string; pubTitle: string } | null>(null);
    const [detailPub, setDetailPub] = useState<Publication | null>(null);

    // Eligibility
    const [canReview, setCanReview] = useState(false);

    // Fetch data based on active tab
    const fetchData = useCallback(async (page?: number) => {
        setLoading(true);
        try {
            if (activeTab === 'browse') {
                const p = page || browsePage;
                const res = await reviewApi.getLookingForReviewers(p, 10);
                setPublications(res.data.items);
                setBrowseTotalCount(res.data.totalCount);
                setBrowseTotalPages(Math.ceil(res.data.totalCount / 10));
                setBrowsePage(p);
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
    }, [activeTab, browsePage]);

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
                    <h1 className="pr-title">{t.peerReview.title}</h1>
                    <p className="pr-subtitle">{t.peerReview.subtitle}</p>
                </div>

                {/* Tabs */}
                <div className="pr-tabs">
                    <button
                        className={`pr-tab ${activeTab === 'browse' ? 'active' : ''}`}
                        onClick={() => setActiveTab('browse')}
                    >
                        {t.peerReview.lookingForReviewers}
                    </button>
                    <button
                        className={`pr-tab ${activeTab === 'my-applications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('my-applications')}
                    >
                        {t.peerReview.myApplications}
                    </button>
                    <button
                        className={`pr-tab ${activeTab === 'my-publications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('my-publications')}
                    >
                        {t.peerReview.myPublications}
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="pr-loading">
                        <div className="pr-spinner" />
                        <span>{t.peerReview.loading}</span>
                    </div>
                ) : (
                    <>
                        {activeTab === 'browse' && (
                            <BrowseTab
                                publications={publications}
                                canReview={canReview}
                                onApply={(pubId, pubTitle) => setApplyModal({ pubId, pubTitle })}
                                onShowDetail={setDetailPub}
                                onCloseReview={handleToggleSearch}
                                currentPage={browsePage}
                                totalPages={browseTotalPages}
                                totalCount={browseTotalCount}
                                onPageChange={(p: number) => fetchData(p)}
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
