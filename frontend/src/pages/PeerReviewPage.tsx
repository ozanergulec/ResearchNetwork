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

const PAGE_SIZE = 10;

const PeerReviewPage: React.FC = () => {
    const t = useTranslation();
    const [searchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as Tab) || 'browse';
    const highlightPubId = searchParams.get('highlight') || null;
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

    // Highlight publication that is not on the current page (fetched on-demand).
    const [highlightPublication, setHighlightPublication] = useState<ReviewablePublication | null>(null);

    // Modals
    const [applyModal, setApplyModal] = useState<{ pubId: string; pubTitle: string } | null>(null);
    const [submitModal, setSubmitModal] = useState<{ requestId: string; pubTitle: string } | null>(null);
    const [detailPub, setDetailPub] = useState<Publication | null>(null);

    // Eligibility
    const [canReview, setCanReview] = useState(false);

    // Sekmeye özel fetch. `page` argümanı varsa onu kullanır; yoksa default page 1.
    const fetchBrowse = useCallback(async (page: number) => {
        setLoading(true);
        try {
            const res = await reviewApi.getLookingForReviewers(page, PAGE_SIZE);
            setPublications(res.data.items);
            setBrowseTotalCount(res.data.totalCount);
            setBrowseTotalPages(Math.max(1, Math.ceil(res.data.totalCount / PAGE_SIZE)));
            setBrowsePage(page);
        } catch (err) {
            console.error('Failed to fetch publications', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMyRequests = useCallback(async () => {
        setLoading(true);
        try {
            const res = await reviewApi.getMyRequests();
            setMyRequests(res.data);
        } catch (err) {
            console.error('Failed to fetch my requests', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMyPublications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await reviewApi.getMyPublications();
            setMyPublications(res.data);
        } catch (err) {
            console.error('Failed to fetch my publications', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Sekme değiştikçe yalnızca o sekmenin verisini çek.
    useEffect(() => {
        if (activeTab === 'browse') {
            fetchBrowse(1);
        } else if (activeTab === 'my-applications') {
            fetchMyRequests();
        } else if (activeTab === 'my-publications') {
            fetchMyPublications();
        }
    }, [activeTab, fetchBrowse, fetchMyRequests, fetchMyPublications]);

    // Highlight'lı publication mevcut sayfa listesinde yoksa tek başına fetch et.
    useEffect(() => {
        if (activeTab !== 'browse' || !highlightPubId) {
            setHighlightPublication(null);
            return;
        }
        if (publications.some(p => p.id === highlightPubId)) {
            setHighlightPublication(null);
            return;
        }
        let cancelled = false;
        reviewApi.getReviewablePublication(highlightPubId)
            .then(res => {
                if (!cancelled) setHighlightPublication(res.data);
            })
            .catch(() => {
                if (!cancelled) setHighlightPublication(null);
            });
        return () => { cancelled = true; };
    }, [activeTab, highlightPubId, publications]);

    useEffect(() => {
        reviewApi.canReview()
            .then(res => setCanReview(res.data.canReview))
            .catch(() => setCanReview(false));
    }, []);

    const handleToggleSearch = useCallback(async (pubId: string, isDoubleBlind?: boolean) => {
        try {
            await reviewApi.toggleReviewSearch(pubId, isDoubleBlind);
            if (activeTab === 'browse') {
                fetchBrowse(browsePage);
            } else if (activeTab === 'my-publications') {
                fetchMyPublications();
            }
        } catch (err) {
            console.error('Failed to toggle review search', err);
        }
    }, [activeTab, browsePage, fetchBrowse, fetchMyPublications]);

    const handleBrowsePageChange = useCallback((page: number) => {
        fetchBrowse(page);
    }, [fetchBrowse]);

    const handleOpenApply = useCallback((pubId: string, pubTitle: string) => {
        setApplyModal({ pubId, pubTitle });
    }, []);

    const handleOpenSubmit = useCallback((requestId: string, pubTitle: string) => {
        setSubmitModal({ requestId, pubTitle });
    }, []);

    const handleShowDetail = useCallback((pub: Publication) => {
        setDetailPub(pub);
    }, []);

    const handleApplySuccess = useCallback(() => {
        setApplyModal(null);
        if (activeTab === 'browse') fetchBrowse(browsePage);
    }, [activeTab, browsePage, fetchBrowse]);

    const handleSubmitSuccess = useCallback(() => {
        setSubmitModal(null);
        if (activeTab === 'my-applications') fetchMyRequests();
    }, [activeTab, fetchMyRequests]);

    const handleAcceptInvitation = useCallback(async (requestId: string) => {
        try {
            await reviewApi.acceptInvitation(requestId);
            // Locally flip the status to Accepted so the reviewer can submit right away.
            setMyRequests(prev => prev.map(r =>
                r.id === requestId
                    ? { ...r, status: 'Accepted', updatedAt: new Date().toISOString() }
                    : r
            ));
        } catch (err) {
            console.error('Failed to accept invitation', err);
        }
    }, []);

    const handleDeclineInvitation = useCallback(async (requestId: string) => {
        try {
            await reviewApi.declineInvitation(requestId);
            setMyRequests(prev => prev.map(r =>
                r.id === requestId
                    ? { ...r, status: 'Rejected', updatedAt: new Date().toISOString() }
                    : r
            ));
        } catch (err) {
            console.error('Failed to decline invitation', err);
        }
    }, []);

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
                                highlightPublication={highlightPublication}
                                canReview={canReview}
                                onApply={handleOpenApply}
                                onShowDetail={handleShowDetail}
                                onCloseReview={handleToggleSearch}
                                currentPage={browsePage}
                                totalPages={browseTotalPages}
                                totalCount={browseTotalCount}
                                onPageChange={handleBrowsePageChange}
                                highlightPubId={highlightPubId}
                            />
                        )}
                        {activeTab === 'my-applications' && (
                            <MyApplicationsTab
                                myRequests={myRequests}
                                canReview={canReview}
                                onSubmitReview={handleOpenSubmit}
                                onAcceptInvitation={handleAcceptInvitation}
                                onDeclineInvitation={handleDeclineInvitation}
                                highlightPubId={highlightPubId}
                            />
                        )}
                        {activeTab === 'my-publications' && (
                            <MyPublicationsTab
                                myPublications={myPublications}
                                onToggleSearch={handleToggleSearch}
                                highlightPubId={highlightPubId}
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
                    onSuccess={handleApplySuccess}
                />
            )}

            {submitModal && (
                <SubmitReviewModal
                    requestId={submitModal.requestId}
                    pubTitle={submitModal.pubTitle}
                    onClose={() => setSubmitModal(null)}
                    onSuccess={handleSubmitSuccess}
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
