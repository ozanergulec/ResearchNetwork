import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiApi } from '../services/aiService';
import type { ResearcherMatch } from '../services/aiService';
import { usersApi } from '../services/userService';
import type { User } from '../services/userService';
import { Navbar, Loading } from '../components';
import ResearcherMatchCard from '../components/recommendations/ResearcherMatchCard';
import { useTranslation } from '../translations/translations';
import '../styles/pages/RecommendationsPage.css';

function computeTagMatch(currentTags: string[], otherTags: string[]): { similarity: number; commonTags: string[] } {
    const setA = new Set(currentTags.map(t => t.toLowerCase()));
    const setB = new Set(otherTags.map(t => t.toLowerCase()));
    const common = [...setA].filter(t => setB.has(t));
    const union = new Set([...setA, ...setB]);
    const similarity = union.size > 0 ? common.length / union.size : 0;
    return { similarity, commonTags: common };
}

function userToMatch(user: User, similarity: number, commonTags: string[]): ResearcherMatch {
    return {
        userId: user.id,
        fullName: user.fullName,
        title: user.title,
        institution: user.institution,
        department: user.department,
        profileImageUrl: user.profileImageUrl,
        isVerified: user.isVerified,
        similarity,
        commonTags,
    };
}

const RecommendationsPage: React.FC = () => {
    const navigate = useNavigate();
    const t = useTranslation();

    const [matches, setMatches] = useState<ResearcherMatch[]>([]);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isAiPowered, setIsAiPowered] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const followRes = await usersApi.getFollowingIds();
                setFollowingIds(new Set(followRes.data));

                try {
                    const aiRes = await aiApi.getResearcherMatches(currentUser.id, 12);
                    if (aiRes.data && aiRes.data.length > 0) {
                        setMatches(aiRes.data);
                        setIsAiPowered(true);
                        return;
                    }
                } catch { /* AI not available, fall through to tag-based */ }

                await loadTagBasedMatches();
            } catch (err) {
                console.error('Failed to load recommendations', err);
            } finally {
                setLoading(false);
            }
        };

        const loadTagBasedMatches = async () => {
            const [profileRes, allUsersRes] = await Promise.all([
                usersApi.getProfile(),
                usersApi.getAll(),
            ]);

            const myTags = profileRes.data.tags?.map(t => t.name) || [];
            const others = allUsersRes.data.filter((u: User) => u.id !== currentUser.id);

            const scored = others.map((user) => {
                const userTags = user.tags?.map(t => t.name) || [];
                const { similarity, commonTags } = computeTagMatch(myTags, userTags);
                return userToMatch(user, similarity, commonTags);
            });

            scored.sort((a, b) => b.similarity - a.similarity);

            const withTags = scored.filter(m => m.commonTags.length > 0);
            setMatches(withTags);
        };

        fetchData();
    }, [navigate, currentUser.id]);

    const handleFollow = useCallback(async (userId: string) => {
        try {
            if (followingIds.has(userId)) {
                await usersApi.unfollow(userId);
                setFollowingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                });
            } else {
                await usersApi.follow(userId);
                setFollowingIds((prev) => new Set(prev).add(userId));
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
