import React from 'react';
import type { User } from '../../services/userService';

interface ProfileStatsProps {
    user: User;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ user }) => {
    return (
        <div className="profile-info-section">
            <h2 className="profile-info-section-title">Statistics</h2>
            <div className="profile-stats">
                <div className="profile-stat">
                    <span className="stat-value">{user.followerCount}</span>
                    <span className="stat-label">Followers</span>
                </div>
                <div className="profile-stat">
                    <span className="stat-value">{user.followingCount}</span>
                    <span className="stat-label">Following</span>
                </div>
                <div className="profile-stat">
                    <span className="stat-value">{user.avgScore.toFixed(1)}</span>
                    <span className="stat-label">Avg Score</span>
                </div>
            </div>
        </div>
    );
};

export default ProfileStats;
