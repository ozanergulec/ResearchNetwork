import React, { useEffect, useState } from 'react';
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
}

const FollowListModal: React.FC<FollowListModalProps> = ({
    userId,
    initialTab,
    followerCount,
    followingCount,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState<FollowListTab>(initialTab);
    const [followers, setFollowers] = useState<UserSummary[]>([]);
    const [following, setFollowing] = useState<UserSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

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

    const handleUserClick = (id: string) => {
        onClose();
        navigate(`/profile/${id}`);
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
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
                            Followers ({followerCount})
                        </button>
                        <button
                            className={`follow-modal-tab ${activeTab === 'following' ? 'follow-modal-tab-active' : ''}`}
                            onClick={() => setActiveTab('following')}
                        >
                            Following ({followingCount})
                        </button>
                    </div>
                    <button className="follow-modal-close" onClick={onClose}>&times;</button>
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
