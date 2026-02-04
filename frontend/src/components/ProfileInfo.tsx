import React from 'react';
import type { User } from '../services/userService';
import TagBadge from './TagBadge';
import '../styles/ProfileComponents.css';

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
                    <h2 className="profile-info-section-title">Hakkında</h2>
                    <div className="profile-info-item">
                        <span className="profile-info-label">Unvan</span>
                        <span className="profile-info-value">{user.title || 'Belirtilmemiş'}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="profile-info-label">Kurum</span>
                        <span className="profile-info-value">{user.institution || 'Belirtilmemiş'}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="profile-info-label">Bölüm</span>
                        <span className="profile-info-value">{user.department || 'Belirtilmemiş'}</span>
                    </div>
                    {user.bio && (
                        <div className="profile-info-item">
                            <span className="profile-info-label">Biyografi</span>
                            <span className="profile-info-value">{user.bio}</span>
                        </div>
                    )}
                </div>

                {/* Tags Section */}
                <div className="profile-tags-section">
                    <div className="profile-tags-header">
                        <span className="profile-info-label">İlgi Alanları</span>
                        {onEditTags && (
                            <button className="edit-tags-button" onClick={onEditTags}>
                                Düzenle
                            </button>
                        )}
                    </div>
                    {user.tags && user.tags.length > 0 ? (
                        <div className="profile-tags">
                            {user.tags.map(tag => (
                                <TagBadge key={tag.id} name={tag.name} usageCount={tag.usageCount} />
                            ))}
                        </div>
                    ) : (
                        <span className="profile-info-value">Henüz ilgi alanı eklenmemiş</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileInfo;
