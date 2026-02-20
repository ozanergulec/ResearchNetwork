import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi, type User } from '../../services/userService';
import { API_SERVER_URL } from '../../services/apiClient';
import '../../styles/feed/HomeProfileSidebar.css';

const HomeProfileSidebar: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await usersApi.getProfile();
                setUser(res.data);
            } catch {
                // Silently fail — sidebar is supplementary
            }
        };
        fetchUser();
    }, []);

    if (!user) return null;

    const profileImgUrl = user.profileImageUrl
        ? `${API_SERVER_URL}${user.profileImageUrl}`
        : null;

    const coverImgUrl = user.coverImageUrl
        ? `${API_SERVER_URL}${user.coverImageUrl}`
        : null;

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <aside className="home-profile-sidebar" onClick={() => navigate(`/profile/${user.id}`)}>
            {/* Cover */}
            <div
                className="hps-cover"
                style={coverImgUrl
                    ? { backgroundImage: `url(${coverImgUrl})` }
                    : undefined
                }
            />

            {/* Avatar */}
            <div className="hps-avatar-wrapper">
                {profileImgUrl ? (
                    <img src={profileImgUrl} alt={user.fullName} className="hps-avatar" />
                ) : (
                    <div className="hps-avatar-placeholder">
                        {getInitials(user.fullName)}
                    </div>
                )}
            </div>

            {/* User Info */}
            <div className="hps-info">
                <h3 className="hps-name">
                    {user.fullName}
                    {user.isVerified && <span className="hps-verified">✓</span>}
                </h3>

                {(user.title || user.institution) && (
                    <p className="hps-detail">
                        {[user.title, user.institution].filter(Boolean).join(': ')}
                    </p>
                )}

                {user.department && (
                    <p className="hps-department">{user.department}</p>
                )}
            </div>

            {/* Divider */}
            <div className="hps-divider" />

            {/* Stats */}
            <div className="hps-stats">
                <div className="hps-stat">
                    <span className="hps-stat-value">{user.followerCount}</span>
                    <span className="hps-stat-label">Followers</span>
                </div>
                <div className="hps-stat">
                    <span className="hps-stat-value">{user.followingCount}</span>
                    <span className="hps-stat-label">Following</span>
                </div>
            </div>
        </aside>
    );
};

export default HomeProfileSidebar;
