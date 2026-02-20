import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../services/userService';
import type { UserSummary } from '../../services/publicationService';
import { API_SERVER_URL } from '../../services/apiClient';
import '../../styles/profile/FollowListModal.css';

type FollowListTab = 'followers' | 'following';

interface FollowListModalProps {
    userId: string;
    initialTab: FollowListTab;
    followerCount: number;
    followingCount: number;
    onClose: () => void;
    onCountsChanged?: () => void;
}

const FollowListModal: React.FC<FollowListModalProps> = ({
    userId,
    initialTab,
    followerCount,
    followingCount,
    onClose,
    onCountsChanged,
}) => {
    const [activeTab, setActiveTab] = useState<FollowListTab>(initialTab);
    const [followers, setFollowers] = useState<UserSummary[]>([]);
    const [following, setFollowing] = useState<UserSummary[]>([]);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);
    const [localFollowingCount, setLocalFollowingCount] = useState(followingCount);
    const [localFollowerCount] = useState(followerCount);
    const [changed, setChanged] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = currentUser.id as string | undefined;
    const isOwnProfile = userId === currentUserId;

    const handleClose = useCallback(() => {
        if (changed && onCountsChanged) onCountsChanged();
        onClose();
    }, [changed, onCountsChanged, onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKey);
        };
    }, [handleClose]);

    useEffect(() => {
        usersApi.getFollowingIds()
            .then(res => setFollowingIds(new Set(res.data)))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'followers') {
                    const res = await usersApi.getFollowers(userId);
                    setFollowers(res.data);
                } else {
                    const res = await usersApi.getFollowing(userId);
                    setFollowing(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch follow list', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [activeTab, userId]);

    const handleFollowToggle = async (e: React.MouseEvent, targetId: string) => {
        e.stopPropagation();
        if (followLoadingId) return;
        setFollowLoadingId(targetId);
        try {
            if (followingIds.has(targetId)) {
                await usersApi.unfollow(targetId);
                setFollowingIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
                if (isOwnProfile) setLocalFollowingCount(prev => Math.max(0, prev - 1));
            } else {
                await usersApi.follow(targetId);
                setFollowingIds(prev => new Set(prev).add(targetId));
                if (isOwnProfile) setLocalFollowingCount(prev => prev + 1);
            }
            setChanged(true);
        } catch (err) {
            console.error('Failed to toggle follow', err);
        } finally {
            setFollowLoadingId(null);
        }
    };

    const handleUserClick = (id: string) => {
        handleClose();
        navigate(`/profile/${id}`);
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) handleClose();
    };

    const users = activeTab === 'followers' ? followers : following;

    return ReactDOM.createPortal(
        <div className="follow-modal-overlay" onClick={handleOverlayClick}>
            <div className="follow-modal">
                <div className="follow-modal-header">
                    <div className="follow-modal-tabs">
                        <button
                            className={`follow-modal-tab ${activeTab === 'followers' ? 'follow-modal-tab-active' : ''}`}
                            onClick={() => setActiveTab('followers')}
                        >
                            Followers ({localFollowerCount})
                        </button>
                        <button
                            className={`follow-modal-tab ${activeTab === 'following' ? 'follow-modal-tab-active' : ''}`}
                            onClick={() => setActiveTab('following')}
                        >
                            Following ({localFollowingCount})
                        </button>
                    </div>
                    <button className="follow-modal-close" onClick={handleClose}>&times;</button>
                </div>

                <div className="follow-modal-body">
                    {loading ? (
                        <div className="follow-modal-loading">Loading...</div>
                    ) : users.length === 0 ? (
                        <div className="follow-modal-empty">
                            {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                        </div>
                    ) : (
                        <ul className="follow-modal-list">
                            {users.map((user) => {
                                const imgUrl = user.profileImageUrl
                                    ? `${API_SERVER_URL}${user.profileImageUrl}`
                                    : null;
                                const isMe = user.id === currentUserId;
                                const isFollowed = followingIds.has(user.id);
                                return (
                                    <li
                                        key={user.id}
                                        className="follow-modal-item"
                                        onClick={() => handleUserClick(user.id)}
                                    >
                                        {imgUrl ? (
                                            <img src={imgUrl} alt={user.fullName} className="follow-modal-avatar" />
                                        ) : (
                                            <div className="follow-modal-avatar-placeholder">
                                                {user.fullName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="follow-modal-user-info">
                                            <span className="follow-modal-name">
                                                {user.fullName}
                                                {user.isVerified && <span className="follow-modal-verified">✓</span>}
                                            </span>
                                            <span className="follow-modal-detail">
                                                {[user.title, user.institution].filter(Boolean).join(' · ')}
                                            </span>
                                        </div>
                                        {!isMe && (
                                            <button
                                                className={`follow-modal-follow-btn ${isFollowed ? 'follow-modal-follow-btn-active' : ''}`}
                                                onClick={(e) => handleFollowToggle(e, user.id)}
                                                disabled={followLoadingId === user.id}
                                            >
                                                {followLoadingId === user.id ? '...' : isFollowed ? 'Unfollow' : 'Follow'}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FollowListModal;
