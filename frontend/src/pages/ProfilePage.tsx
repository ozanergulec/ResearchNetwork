import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/api';
import type { User, UpdateUserData } from '../services/api';
import '../styles/ProfilePage.css';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [updateData, setUpdateData] = useState<UpdateUserData>({});

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setUpdateData({
                fullName: parsed.fullName,
                title: parsed.title || '',
                institution: parsed.institution || '',
                department: parsed.department || '',
                bio: parsed.bio || '',
                interestTags: parsed.interestTags || [],
            });
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await usersApi.update(user.id, updateData);
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
            setEditing(false);
        } catch (err) {
            console.error('Update failed', err);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <div className="profile-loading">Loading...</div>;
    }

    return (
        <div className="profile-container">
            <nav className="profile-nav">
                <h2 className="profile-logo">Research Network</h2>
                <div className="profile-nav-links">
                    <button onClick={() => navigate('/profile')} className="profile-nav-button">Profile</button>
                    <button onClick={() => navigate('/recommendations')} className="profile-nav-button">Recommendations</button>
                    <button onClick={handleLogout} className="profile-logout-button">Logout</button>
                </div>
            </nav>

            <div className="profile-content">
                <div className="profile-card">
                    <div className="profile-header">
                        <div className="profile-avatar">{user.fullName.charAt(0).toUpperCase()}</div>
                        <div>
                            <h1 className="profile-name">{user.fullName}</h1>
                            <p className="profile-email">{user.email}</p>
                        </div>
                    </div>

                    {editing ? (
                        <div className="profile-edit-form">
                            <label className="profile-label">
                                Full Name
                                <input
                                    type="text"
                                    value={updateData.fullName || ''}
                                    onChange={(e) => setUpdateData({ ...updateData, fullName: e.target.value })}
                                    className="profile-input"
                                />
                            </label>
                            <label className="profile-label">
                                Title
                                <input
                                    type="text"
                                    value={updateData.title || ''}
                                    onChange={(e) => setUpdateData({ ...updateData, title: e.target.value })}
                                    className="profile-input"
                                />
                            </label>
                            <label className="profile-label">
                                Institution
                                <input
                                    type="text"
                                    value={updateData.institution || ''}
                                    onChange={(e) => setUpdateData({ ...updateData, institution: e.target.value })}
                                    className="profile-input"
                                />
                            </label>
                            <label className="profile-label">
                                Department
                                <input
                                    type="text"
                                    value={updateData.department || ''}
                                    onChange={(e) => setUpdateData({ ...updateData, department: e.target.value })}
                                    className="profile-input"
                                />
                            </label>
                            <label className="profile-label">
                                Bio
                                <textarea
                                    value={updateData.bio || ''}
                                    onChange={(e) => setUpdateData({ ...updateData, bio: e.target.value })}
                                    className="profile-input profile-textarea"
                                />
                            </label>
                            <div className="profile-button-group">
                                <button onClick={handleSave} className="profile-save-button" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button onClick={() => setEditing(false)} className="profile-cancel-button">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
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
                                <span>{user.interestTags.length > 0 ? user.interestTags.join(', ') : 'None'}</span>
                            </div>
                            <button onClick={() => setEditing(true)} className="profile-edit-button">
                                Edit Profile
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
