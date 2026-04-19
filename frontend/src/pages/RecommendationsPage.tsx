import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiApi } from '../services/aiService';
import type { ResearcherMatch } from '../services/aiService';
import { usersApi } from '../services/userService';
import { Navbar, Loading } from '../components';
import ResearcherMatchCard from '../components/recommendations/ResearcherMatchCard';
import { useTranslation } from '../translations/translations';
import '../styles/pages/RecommendationsPage.css';

const PAGE_SIZE = 12;

type FetchMode = 'ai' | 'tag';

const RecommendationsPage: React.FC = () => {
    const navigate = useNavigate();
    const t = useTranslation();

    const [matches, setMatches] = useState<ResearcherMatch[]>([]);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [mode, setMode] = useState<FetchMode>('ai');
    const [isAiPowered, setIsAiPowered] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId: string | undefined = currentUser.id;

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    // Refs mirror state so the IntersectionObserver callback always sees the
    // latest values without needing to re-create the observer on every change.
    const loadingMoreRef = useRef(false);
    const hasMoreRef = useRef(false);
    const pageRef = useRef(1);
    const modeRef = useRef<FetchMode>('ai');

    useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
    useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
    useEffect(() => { pageRef.current = page; }, [page]);
    useEffect(() => { modeRef.current = mode; }, [mode]);

    const fetchPage = useCallback(
        async (fetchMode: FetchMode, pageNumber: number): Promise<{ items: ResearcherMatch[]; hasMore: boolean }> => {
            if (!userId) return { items: [], hasMore: false };
            const call = fetchMode === 'ai'
                ? aiApi.getResearcherMatches(userId, pageNumber, PAGE_SIZE)
                : aiApi.getTagResearcherMatches(userId, pageNumber, PAGE_SIZE);
            const res = await call;
            return {
                items: res.data.items ?? [],
                hasMore: res.data.hasMore ?? false,
            };
        },
        [userId]
    );

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const initialLoad = async () => {
            try {
                const followRes = await usersApi.getFollowingIds();
                setFollowingIds(new Set(followRes.data));

                // Try AI (embedding-aware) first. Fall back to pure-tag mode
                // only if the AI endpoint returns an empty first page, which
                // means the user has neither embeddings nor any shared tags.
                let active: FetchMode = 'ai';
                let first = await fetchPage('ai', 1);

                if (first.items.length === 0) {
                    active = 'tag';
                    first = await fetchPage('tag', 1);
                }

                setMode(active);
                setIsAiPowered(active === 'ai');
                setMatches(first.items);
                setHasMore(first.hasMore);
                setPage(1);
            } catch (err) {
                console.error('Failed to load recommendations', err);
            } finally {
                setLoading(false);
            }
        };

        initialLoad();
    }, [navigate, fetchPage]);

    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current || !hasMoreRef.current) return;
        setLoadingMore(true);
        try {
            const next = pageRef.current + 1;
            const res = await fetchPage(modeRef.current, next);
            setMatches((prev) => {
                const seen = new Set(prev.map((m) => m.userId));
                const merged = [...prev];
                for (const item of res.items) {
                    if (!seen.has(item.userId)) merged.push(item);
                }
                return merged;
            });
            setHasMore(res.hasMore);
            setPage(next);
        } catch (err) {
            console.error('Failed to load more recommendations', err);
        } finally {
            setLoadingMore(false);
        }
    }, [fetchPage]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
                    loadMore();
                }
            },
            { rootMargin: '200px 0px' }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore, loading]);

    const handleFollow = useCallback(async (targetId: string) => {
        try {
            if (followingIds.has(targetId)) {
                await usersApi.unfollow(targetId);
                setFollowingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(targetId);
                    return next;
                });
            } else {
                await usersApi.follow(targetId);
                setFollowingIds((prev) => new Set(prev).add(targetId));
            }
        } catch (err) {
            console.error('Follow action failed', err);
        }
    }, [followingIds]);

    return (
        <div className="rec-container">
            <Navbar currentPage="recommendations" />

            <div className="rec-content">
                <h1 className="rec-title">{t.recommendations.title}</h1>
                <p className="rec-subtitle">
                    {isAiPowered
                        ? t.recommendations.aiSubtitle
                        : t.recommendations.tagSubtitle
                    }
                </p>

                {loading ? (
                    <Loading message={t.recommendations.loadingRec} />
                ) : matches.length === 0 ? (
                    <div className="rec-empty-state">
                        <div className="rec-empty-icon">👥</div>
                        <h3>{t.recommendations.noResearchers}</h3>
                        <p>{t.recommendations.noResearchersDesc}</p>
                    </div>
                ) : (
                    <>
                        <div className="rec-grid">
                            {matches.map((match) => (
                                <ResearcherMatchCard
                                    key={match.userId}
                                    match={match}
                                    onFollow={handleFollow}
                                    isFollowing={followingIds.has(match.userId)}
                                />
                            ))}
                        </div>

                        <div ref={sentinelRef} className="rec-sentinel" aria-hidden="true">
                            {loadingMore && <Loading message={t.recommendations.loadingRec} />}
                        </div>

                        <div className={`rec-ai-note ${isAiPowered ? 'rec-ai-active' : ''}`}>
                            <div className="rec-ai-icon">{isAiPowered ? '✨' : '🏷️'}</div>
                            <div>
                                <h4 className="rec-ai-title">
                                    {isAiPowered ? t.recommendations.aiActiveTitle : t.recommendations.tagTitle}
                                </h4>
                                <p className="rec-ai-text">
                                    {isAiPowered ? t.recommendations.aiActiveText : t.recommendations.tagText}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RecommendationsPage;
