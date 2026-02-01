import React from 'react';
import type { User } from '../services/userService';
import TagBadge from './TagBadge';
import '../styles/ProfileComponents.css';

interface ProfileInfoProps {
    user: User;
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({ user }) => {
    return (
        <div className="profile-info">
            <div className="profile-info-grid">
                <div className="profile-info-item">
                    <span className="profile-info-label">Title:</span>
                    <span className="profile-info-value">{user.title || 'Not specified'}</span>
                </div>

                <div className="profile-info-item">
                    <span className="profile-info-label">Institution:</span>
                    <span className="profile-info-value">{user.institution || 'Not specified'}</span>
                </div>

                <div className="profile-info-item">
                    <span className="profile-info-label">Department:</span>
                    <span className="profile-info-value">{user.department || 'Not specified'}</span>
                </div>

                <div className="profile-info-item">
                    <span className="profile-info-label">Bio:</span>
                    <span className="profile-info-value">{user.bio || 'No bio yet'}</span>
                </div>

                {user.tags && user.tags.length > 0 && (
                    <div className="profile-info-item profile-tags-section">
                        <span className="profile-info-label">Research Interests:</span>
                        <div className="profile-tags">
                            {user.tags.map(tag => (
                                <TagBadge key={tag.id} name={tag.name} usageCount={tag.usageCount} />
                            ))}
                        </div>
                    </div>
                )}

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
        </div>
    );
};

export default ProfileInfo;
