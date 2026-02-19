import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicationsApi, type FeedItem } from '../services/publicationService';
import { Navbar, Loading } from '../components';
import { FeedPublicationCard, SharedFeedCard } from '../components/feed';
import '../styles/pages/HomePage.css';

const PAGE_SIZE = 10;

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const fetchedRef = useRef(false);
    const pageRef = useRef(1);
    const loadingMoreRef = useRef(false);
    const hasMoreRef = useRef(true);

    // Initial load — guarded against StrictMode double-mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const fetchInitialFeed = async () => {
            try {
                setLoading(true);
                const response = await publicationsApi.getFeed(1, PAGE_SIZE);
                setFeedItems(response.data.items);
                setHasMore(response.data.hasMore);
                hasMoreRef.current = response.data.hasMore;
                pageRef.current = 1;
                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch feed', err);
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                } else {
                    setError('Failed to load feed. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchInitialFeed();
    }, [navigate]);

    // Stable loadMore — uses refs to avoid recreating on every render
    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current || !hasMoreRef.current) return;

        const nextPage = pageRef.current + 1;
        loadingMoreRef.current = true;
        setLoadingMore(true);

        try {
            const response = await publicationsApi.getFeed(nextPage, PAGE_SIZE);
            setFeedItems(prev => [...prev, ...response.data.items]);
            setHasMore(response.data.hasMore);
            hasMoreRef.current = response.data.hasMore;
            pageRef.current = nextPage;
        } catch (err) {
            console.error('Failed to load more publications', err);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, []);

    // Refresh feed from scratch (e.g. after sharing)
    const refreshFeed = useCallback(async () => {
        try {
            const response = await publicationsApi.getFeed(1, PAGE_SIZE);
            setFeedItems(response.data.items);
            setHasMore(response.data.hasMore);
            hasMoreRef.current = response.data.hasMore;
            pageRef.current = 1;
        } catch (err) {
            console.error('Failed to refresh feed', err);
        }
    }, []);

    // Intersection Observer for infinite scroll — stable, no dependency churn
    useEffect(() => {
        if (loading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        const currentSentinel = sentinelRef.current;
        if (currentSentinel) {
            observer.observe(currentSentinel);
        }

        return () => {
            if (currentSentinel) {
                observer.unobserve(currentSentinel);
            }
        };
    }, [loading, loadMore]);

    if (loading) {
        return <Loading message="Loading feed..." />;
    }

    return (
        <div className="home-container">
            <Navbar currentPage="home" />

            <div className="home-content">
                <div className="home-header">
                    <h1 className="home-title">Feed</h1>
                    <p className="home-subtitle">Latest publications from the research community</p>
                </div>

                {error && (
                    <div className="home-empty">
                        <p>{error}</p>
                    </div>
                )}

                {!error && feedItems.length === 0 ? (
                    <div className="home-empty">
                        <div className="home-empty-icon">📚</div>
                        <h3>No Publications Yet</h3>
                        <p>Be the first to share your research with the community!</p>
                    </div>
                ) : (
                    <div className="home-feed">
                        {feedItems.map((item) => {
                            if (item.type === 'share' && item.sharedPublication) {
                                return (
                                    <SharedFeedCard
                                        key={`share-${item.sharedPublication.shareId}`}
                                        sharedPublication={item.sharedPublication}
                                        onDeleted={(shareId) => {
                                            setFeedItems(prev => prev.filter(
                                                fi => !(fi.type === 'share' && fi.sharedPublication?.shareId === shareId)
                                            ));
                                        }}
                                    />
                                );
                            } else if (item.publication) {
                                return (
                                    <FeedPublicationCard
                                        key={`pub-${item.publication.id}`}
                                        publication={item.publication}
                                        onDeleted={(pubId) => {
                                            setFeedItems(prev => prev.filter(
                                                fi => !(fi.type === 'publication' && fi.publication?.id === pubId)
                                            ));
                                        }}
                                        onShared={refreshFeed}
                                    />
                                );
                            }
                            return null;
                        })}

                        {/* Infinite Scroll Sentinel */}
                        {hasMore && (
                            <>
                                <div ref={sentinelRef} className="home-scroll-sentinel" />
                                {loadingMore && (
                                    <div className="home-loading-more">
                                        <div className="home-loading-spinner" />
                                        <span>Loading more...</span>
                                    </div>
                                )}
                            </>
                        )}

                        {!hasMore && feedItems.length > 0 && (
                            <div className="home-end">
                                You've reached the end of the feed
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;

