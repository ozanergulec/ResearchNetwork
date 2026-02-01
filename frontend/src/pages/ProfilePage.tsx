import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/userService';
import type { User, UpdateUserData } from '../services/userService';
import {
    Navbar,
    Loading,
    ProfileHeader,
    ProfileInfo,
    ProfileEditForm
} from '../components';
import '../styles/ProfilePage.css';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                setLoading(true);
                const response = await usersApi.getProfile();
                setUser(response.data);
                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch profile', err);
                if (err.response?.status === 401) {
                    // Unauthorized - redirect to login
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                } else {
                    setError('Failed to load profile. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleSave = async (data: UpdateUserData) => {
        setSaving(true);
        setError(null);

        try {
            const response = await usersApi.updateProfile(data);
            setUser(response.data);
            // Update localStorage with new user data
            localStorage.setItem('user', JSON.stringify(response.data));
            setEditing(false);
        } catch (err: any) {
            console.error('Update failed', err);
            setError('Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = () => {
        setEditing(true);
        setError(null);
    };

    const handleCancel = () => {
        setEditing(false);
        setError(null);
    };

    if (loading) {
        return <Loading message="Loading profile..." />;
    }

    if (!user) {
        return (
            <div className="profile-container">
                <Navbar currentPage="profile" />
                <div className="profile-content">
                    <div className="profile-error">
                        <p>{error || 'Failed to load profile'}</p>
                        <button onClick={() => navigate('/login')}>Go to Login</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <Navbar currentPage="profile" />

            <div className="profile-content">
                <div className="profile-card">
                    {error && (
                        <div className="profile-error-message">
                            {error}
                        </div>
                    )}

                    {editing ? (
                        <>
                            <ProfileHeader
                                fullName={user.fullName}
                                email={user.email}
                                isVerified={user.isVerified}
                                onEditClick={() => setEditing(false)}
                            />
                            <ProfileEditForm
                                initialData={{
                                    fullName: user.fullName,
                                    title: user.title || '',
                                    institution: user.institution || '',
                                    department: user.department || '',
                                    bio: user.bio || '',
                                }}
                                onSave={handleSave}
                                onCancel={handleCancel}
                                loading={saving}
                            />
                        </>
                    ) : (
                        <>
                            <ProfileHeader
                                fullName={user.fullName}
                                email={user.email}
                                isVerified={user.isVerified}
                                onEditClick={handleEditClick}
                            />
                            <ProfileInfo user={user} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
