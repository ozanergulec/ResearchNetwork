import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReviewablePublication } from '../../services/reviewService';
import { publicationsApi } from '../../services/publicationService';
import { aiApi } from '../../services/aiService';
import type { Publication } from '../../services/publicationService';
import { renderAvatar } from './prHelpers';

interface BrowseTabProps {
    publications: ReviewablePublication[];
    highlightPublication: ReviewablePublication | null;
    canReview: boolean;
    onApply: (pubId: string, pubTitle: string) => void;
    onShowDetail: (pub: Publication) => void;
    onCloseReview: (pubId: string) => void;
    currentPage: number;
    totalPages: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    highlightPubId?: string | null;
}

const ITEMS_PER_PAGE = 10;

const BrowseTab: React.FC<BrowseTabProps> = ({
    publications, highlightPublication, canReview, onApply, onShowDetail, onCloseReview,
    currentPage, totalPages, totalCount, onPageChange, highlightPubId
}) => {
    const navigate = useNavigate();
    const highlightRef = useRef<HTMLDivElement | null>(null);
    const [matchScores, setMatchScores] = useState<Record<string, number>>({});

    // Mevcut sayfa listesi + (varsa) başa eklenmiş highlight'lı publication.
    const displayedPubs = useMemo<ReviewablePublication[]>(() => {
        if (highlightPublication && !publications.some(p => p.id === highlightPublication.id)) {
            return [highlightPublication, ...publications];
        }
        return publications;
    }, [publications, highlightPublication]);

    useEffect(() => {
        if (highlightPubId && highlightRef.current) {
            const id = window.setTimeout(() => {
                highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
            return () => window.clearTimeout(id);
        }
    }, [highlightPubId, displayedPubs]);

    useEffect(() => {
        if (!canReview || displayedPubs.length === 0) {
            setMatchScores({});
            return;
        }
        const nonOwnedIds = displayedPubs.filter(p => !p.isOwner).map(p => p.id);
        if (nonOwnedIds.length === 0) {
            setMatchScores({});
            return;
        }

        let cancelled = false;
        aiApi.getReviewerPublicationScores(nonOwnedIds)
            .then(res => { if (!cancelled) setMatchScores(res.data); })
            .catch(() => { if (!cancelled) setMatchScores({}); });
        return () => { cancelled = true; };
    }, [displayedPubs, canReview]);

    const handleCardClick = async (pubId: string) => {
        try {
            const res = await publicationsApi.getById(pubId);
            onShowDetail(res.data);
        } catch (err) {
            console.error('Failed to load publication details', err);
        }
    };

    const goToPage = (page: number) => {
        onPageChange(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getPageNumbers = (): (number | '...')[] => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const getMatchColor = (score: number) => {
        if (score >= 0.5) return '#059669';
        if (score >= 0.2) return '#d97706';
        return '#6b7280';
    };

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    return (
        <>
            {!canReview && (
                <div className="pr-info-banner">
                    <span className="pr-info-banner-icon">ℹ️</span>
                    <span>Only Professor, Associate Professor and Assistant Professor can apply as reviewers. You can request reviewers for your own publications from the "My Publications" tab.</span>
                </div>
            )}
            {displayedPubs.length === 0 ? (
                <div className="pr-empty">
                    <div className="pr-empty-icon">🔍</div>
                    <h3>No publications looking for reviewers</h3>
                    <p>Check back later or enable reviewer search on your own publications.</p>
                </div>
            ) : (
                <>
                    <div className="pr-pagination-info">
                        Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, totalCount)} of {totalCount} publications
                    </div>

                    {displayedPubs.map(pub => {
                        const isHighlighted = highlightPubId === pub.id;
                        const score = matchScores[pub.id];
                        return (
                            <div
                                key={pub.id}
                                ref={isHighlighted ? highlightRef : undefined}
                                className={`pr-pub-card pr-pub-card-clickable ${isHighlighted ? 'pr-pub-highlight' : ''}`}
                                onClick={() => handleCardClick(pub.id)}
                            >
                                <div className="pr-pub-header">
                                    <div style={{ flex: 1 }}>
                                        <h3 className="pr-pub-title">{pub.title}</h3>
                                    </div>
                                    <div className="pr-pub-actions" onClick={e => e.stopPropagation()}>
                                        {score != null && score > 0 && (
                                            <span
                                                className="pr-match-badge"
                                                style={{ color: getMatchColor(score) }}
                                            >
                                                {(score * 100).toFixed(0)}% match
                                            </span>
                                        )}
                                        {pub.isOwner ? (
                                            <button
                                                className="pr-btn pr-btn-danger pr-btn-sm"
                                                onClick={() => onCloseReview(pub.id)}
                                            >
                                                Close Review
                                            </button>
                                        ) : pub.hasApplied ? (
                                            <span className="pr-btn pr-btn-sm" style={{ background: '#d1fae5', color: '#065f46' }}>Applied ✓</span>
                                        ) : canReview ? (
                                            <button
                                                className="pr-btn pr-btn-primary pr-btn-sm"
                                                onClick={() => onApply(pub.id, pub.title)}
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
                        );
                    })}

                    {totalPages > 1 && (
                        <div className="pr-pagination">
                            <button
                                className="pr-pagination-btn"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                ‹ Prev
                            </button>
                            {getPageNumbers().map((page, idx) =>
                                page === '...' ? (
                                    <span key={`dots-${idx}`} className="pr-pagination-dots">...</span>
                                ) : (
                                    <button
                                        key={page}
                                        className={`pr-pagination-btn ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </button>
                                )
                            )}
                            <button
                                className="pr-pagination-btn"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Next ›
                            </button>
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default memo(BrowseTab);
