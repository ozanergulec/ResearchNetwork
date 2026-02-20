import React, { useState } from 'react';
import type { User } from '../../services/userService';
import FollowListModal from './FollowListModal';

interface ProfileStatsProps {
    user: User;
    onRefresh?: () => void;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ user, onRefresh }) => {
    const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);

    const handleModalClose = () => {
        setFollowModal(null);
    };

    const handleCountsChanged = () => {
        if (onRefresh) onRefresh();
    };

    return (
        <div className="profile-info-section">
            <h2 className="profile-info-section-title">Statistics</h2>
            <div className="profile-stats">
                <div
                    className="profile-stat profile-stat-clickable"
                    onClick={() => setFollowModal('followers')}
                >
                    <span className="stat-value">{user.followerCount}</span>
                    <span className="stat-label">Followers</span>
                </div>
                <div
                    className="profile-stat profile-stat-clickable"
                    onClick={() => setFollowModal('following')}
                >
                    <span className="stat-value">{user.followingCount}</span>
                    <span className="stat-label">Following</span>
                </div>
                <div className="profile-stat">
                    <span className="stat-value">{user.avgScore.toFixed(1)}</span>
                    <span className="stat-label">Avg Score</span>
                </div>
            </div>

            {followModal && (
                <FollowListModal
                    userId={user.id}
                    initialTab={followModal}
                    followerCount={user.followerCount}
                    followingCount={user.followingCount}
                    onClose={handleModalClose}
                    onCountsChanged={handleCountsChanged}
                />
            )}
        </div>
    );
};

export default ProfileStats;
