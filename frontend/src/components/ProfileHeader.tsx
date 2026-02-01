import React from 'react';
import Avatar from './Avatar';
import '../styles/ProfileComponents.css';

interface ProfileHeaderProps {
    fullName: string;
    email: string;
    isVerified: boolean;
    onEditClick: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    fullName,
    email,
    isVerified,
    onEditClick
}) => {
    return (
        <div className="profile-header">
            <div className="profile-header-left">
                <Avatar name={fullName} size="large" />
                <div className="profile-header-info">
                    <h1 className="profile-name">
                        {fullName}
                        {isVerified && (
                            <span className="verified-badge" title="Verified Account">✓</span>
                        )}
                    </h1>
                    <p className="profile-email">{email}</p>
                </div>
            </div>
            <button onClick={onEditClick} className="profile-edit-button">
                Edit Profile
            </button>
        </div>
    );
};

export default ProfileHeader;
