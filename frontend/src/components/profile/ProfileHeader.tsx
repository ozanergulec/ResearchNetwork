import React, { useState } from 'react';
import { API_SERVER_URL } from '../../services/apiClient';
import ImagePreviewModal from './ImagePreviewModal';
import '../../styles/profile/ProfileHeader.css';

interface ProfileHeaderProps {
    fullName: string;
    email: string;
    isVerified: boolean;
    profileImageUrl?: string;
    coverImageUrl?: string;
    onEditClick?: () => void;
    onImageUpload?: (file: File, type: 'profile' | 'cover') => void;
    onImageRemove?: (type: 'profile' | 'cover') => void;
    isFollowing?: boolean;
    followLoading?: boolean;
    onFollowToggle?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    fullName,
    email,
    isVerified,
    profileImageUrl,
    coverImageUrl,
    onEditClick,
    onImageUpload,
    onImageRemove,
    isFollowing,
    followLoading,
    onFollowToggle,
}) => {
    const [previewModal, setPreviewModal] = useState<'profile' | 'cover' | null>(null);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleProfileClick = () => {
        if (onImageUpload) {
            setPreviewModal('profile');
        }
    };

    const handleCoverClick = () => {
        if (onImageUpload) {
            setPreviewModal('cover');
        }
    };

    const handleModalUpdate = (file: File) => {
        if (onImageUpload && previewModal) {
            onImageUpload(file, previewModal);
        }
        setPreviewModal(null);
    };

    const handleModalRemove = () => {
        if (onImageRemove && previewModal) {
            onImageRemove(previewModal);
        }
        setPreviewModal(null);
    };

    const getImageUrl = (url?: string) => url ? `${API_SERVER_URL}${url}` : null;

    const profileImgSrc = getImageUrl(profileImageUrl);
    const coverImgSrc = getImageUrl(coverImageUrl);

    return (
        <div className="profile-header">
            {/* Cover Photo */}
            <div
                className={`profile-cover ${onImageUpload ? 'cover-editable' : ''}`}
                onClick={handleCoverClick}
                style={coverImgSrc ? { backgroundImage: `url(${coverImgSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
            </div>

            {/* Header Content */}
            <div className="profile-header-content">
                <div className="profile-header-top">
                    <div className="profile-header-left">
                        {/* Avatar */}
                        <div
                            className={`profile-avatar ${onImageUpload ? 'avatar-editable' : ''}`}
                            onClick={handleProfileClick}
                        >
                            {profileImgSrc ? (
                                <img src={profileImgSrc} alt={fullName} className="avatar-image" />
                            ) : (
                                getInitials(fullName)
                            )}
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
                    {onEditClick && (
                        <button onClick={onEditClick} className="profile-edit-button">
                            Edit Profile
                        </button>
                    )}

                    {/* Follow Button */}
                    {onFollowToggle && (
                        <button
                            onClick={onFollowToggle}
                            disabled={followLoading}
                            className={`profile-follow-button ${isFollowing ? 'profile-follow-button-following' : ''}`}
                        >
                            {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                        </button>
                    )}
                </div>
            </div>

            {/* Image Preview Modal */}
            {previewModal && (
                <ImagePreviewModal
                    type={previewModal}
                    imageUrl={previewModal === 'profile' ? profileImgSrc : coverImgSrc}
                    onClose={() => setPreviewModal(null)}
                    onUpdate={handleModalUpdate}
                    onRemove={handleModalRemove}
                />
            )}
        </div>
    );
};

export default ProfileHeader;
