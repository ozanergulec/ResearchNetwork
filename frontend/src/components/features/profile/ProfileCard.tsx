import React from 'react';
import { Avatar, Button, Tag } from '../../ui';
import type { User } from '../../../services/api';
import './ProfileComponents.css';

export interface ProfileCardProps {
    user: User;
    onEdit?: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user, onEdit }) => {
    return (
        <div className="profile-card">
            <div className="profile-header">
                <Avatar name={user.fullName} size="large" />
                <div className="profile-header-info">
                    <h1 className="profile-name">{user.fullName}</h1>
                    <p className="profile-email">{user.email}</p>
                </div>
            </div>

            <div className="profile-details">
                <div className="profile-detail-row">
                    <span className="profile-detail-label">Title:</span>
                    <span>{user.title || 'Not specified'}</span>
                </div>
                <div className="profile-detail-row">
                    <span className="profile-detail-label">Institution:</span>
                    <span>{user.institution || 'Not specified'}</span>
                </div>
                <div className="profile-detail-row">
                    <span className="profile-detail-label">Department:</span>
                    <span>{user.department || 'Not specified'}</span>
                </div>
                <div className="profile-detail-row">
                    <span className="profile-detail-label">Bio:</span>
                    <span>{user.bio || 'No bio yet'}</span>
                </div>
                <div className="profile-detail-row">
                    <span className="profile-detail-label">Interest Tags:</span>
                    <div className="profile-tags">
                        {user.interestTags.length > 0 ? (
                            user.interestTags.map((tag, i) => (
                                <Tag key={i} variant="primary">{tag}</Tag>
                            ))
                        ) : (
                            <span>None</span>
                        )}
                    </div>
                </div>
            </div>

            {onEdit && (
                <Button onClick={onEdit} variant="primary">
                    Edit Profile
                </Button>
            )}
        </div>
    );
};

export default ProfileCard;
