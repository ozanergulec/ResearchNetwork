import React from 'react';
import '../../styles/profile/ProfileHeader.css';

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
    // Get initials for avatar
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="profile-header">
            {/* Cover Photo */}
            <div className="profile-cover"></div>

            {/* Header Content */}
            <div className="profile-header-content">
                <div className="profile-header-top">
                    <div className="profile-header-left">
                        {/* Avatar */}
                        <div className="profile-avatar">
                            {getInitials(fullName)}
                        </div>

                        {/* User Info */}
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

                    {/* Edit Button */}
                    <button onClick={onEditClick} className="profile-edit-button">
                        Profili Düzenle
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;
