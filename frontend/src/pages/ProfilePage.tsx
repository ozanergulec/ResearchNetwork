import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/api';
import type { User, UpdateUserData } from '../services/api';
import { Navbar, Avatar, Loading, FormInput } from '../components';
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
            });
        } else {
            navigate('/login');
        }
    }, [navigate]);

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
        return <Loading message="Loading profile..." />;
    }

    return (
        <div className="profile-container">
            <Navbar currentPage="profile" />

            <div className="profile-content">
                <div className="profile-card">
                    <div className="profile-header">
                        <Avatar name={user.fullName} size="large" />
                        <div>
                            <h1 className="profile-name">{user.fullName}</h1>
                            <p className="profile-email">{user.email}</p>
                        </div>
                    </div>

                    {editing ? (
                        <div className="profile-edit-form">
                            <FormInput
                                label="Full Name"
                                value={updateData.fullName || ''}
                                onChange={(e) => setUpdateData({ ...updateData, fullName: e.target.value })}
                            />
                            <FormInput
                                label="Title"
                                value={updateData.title || ''}
                                onChange={(e) => setUpdateData({ ...updateData, title: e.target.value })}
                            />
                            <FormInput
                                label="Institution"
                                value={updateData.institution || ''}
                                onChange={(e) => setUpdateData({ ...updateData, institution: e.target.value })}
                            />
                            <FormInput
                                label="Department"
                                value={updateData.department || ''}
                                onChange={(e) => setUpdateData({ ...updateData, department: e.target.value })}
                            />
                            <FormInput
                                label="Bio"
                                value={updateData.bio || ''}
                                onChange={(e) => setUpdateData({ ...updateData, bio: e.target.value })}
                                multiline
                            />
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
                                <span className="profile-detail-label">Verified:</span>
                                <span>{user.isVerified ? 'Yes' : 'No'}</span>
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
