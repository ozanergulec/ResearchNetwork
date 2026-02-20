import React from 'react';
import type { User } from '../../services/userService';
import TagBadge from '../common/TagBadge';
import '../../styles/profile/ProfileInfo.css';

interface ProfileInfoProps {
    user: User;
    onEditTags?: () => void;
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({ user, onEditTags }) => {
    return (
        <div className="profile-info">
            <div className="profile-info-grid">
                {/* About Section */}
                <div className="profile-info-section">
                    <h2 className="profile-info-section-title">About</h2>
                    <div className="profile-info-item">
                        <span className="profile-info-label">Title</span>
                        <span className="profile-info-value">{user.title || 'Not specified'}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="profile-info-label">Institution</span>
                        <span className="profile-info-value">{user.institution || 'Not specified'}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="profile-info-label">Department</span>
                        <span className="profile-info-value">{user.department || 'Not specified'}</span>
                    </div>
                    {user.bio && (
                        <div className="profile-info-item">
                            <span className="profile-info-label">Biography</span>
                            <span className="profile-info-value">{user.bio}</span>
                        </div>
                    )}
                </div>

                {/* Tags Section */}
                <div className="profile-tags-section">
                    <div className="profile-tags-header">
                        <span className="profile-info-label">Research Interests</span>
                        {onEditTags && (
                            <button className="edit-tags-button" onClick={onEditTags}>
                                Edit
                            </button>
                        )}
                    </div>
                    {user.tags && user.tags.length > 0 ? (
                        <div className="profile-tags">
                            {user.tags.map(tag => (
                                <TagBadge key={tag.id} name={tag.name} />
                            ))}
                        </div>
                    ) : (
                        <span className="profile-info-value">No research interests added yet</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileInfo;
