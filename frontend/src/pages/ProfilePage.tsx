import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/userService';
import type { User, UpdateUserData } from '../services/userService';
import { publicationsApi, type Publication } from '../services/publicationService';
import {
    Navbar,
    Loading,
    ProfileHeader,
    ProfileInfo,
    ProfileEditForm,
    TagManagementPopup,
    PublicationsList,
    AddPublicationModal
} from '../components';
import '../styles/ProfilePage.css';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTagManagement, setShowTagManagement] = useState(false);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [loadingPublications, setLoadingPublications] = useState(false);
    const [showAllPublications, setShowAllPublications] = useState(false);
    const [showAddPublicationModal, setShowAddPublicationModal] = useState(false);

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

    useEffect(() => {
        const fetchPublications = async () => {
            if (!user) return;

            try {
                setLoadingPublications(true);
                const response = await publicationsApi.getLatestByAuthor(user.id, 100); // Fetch all
                setPublications(response.data);
            } catch (err) {
                console.error('Failed to fetch publications', err);
            } finally {
                setLoadingPublications(false);
            }
        };

        fetchPublications();
    }, [user]);

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

    const handleEditTags = () => {
        setShowTagManagement(true);
    };

    const handleCloseTagManagement = () => {
        setShowTagManagement(false);
    };

    const handleTagsUpdated = async () => {
        // Refresh user profile to get updated tags
        try {
            const response = await usersApi.getProfile();
            setUser(response.data);
        } catch (err) {
            console.error('Failed to refresh profile', err);
        }
    };

    const handleTogglePublications = () => {
        setShowAllPublications(!showAllPublications);
    };

    const handleOpenAddPublication = async () => {
        // Refresh publications list when opening modal
        if (user) {
            try {
                const response = await publicationsApi.getLatestByAuthor(user.id, 100);
                setPublications(response.data);
            } catch (err) {
                console.error('Failed to refresh publications', err);
            }
        }

        setShowAddPublicationModal(true);
    };

    const handleCloseAddPublication = () => {
        setShowAddPublicationModal(false);
    };

    const handlePublicationAdded = async () => {
        // Refresh publications list
        if (!user) return;

        try {
            const response = await publicationsApi.getLatestByAuthor(user.id, 100);
            setPublications(response.data);
        } catch (err) {
            console.error('Failed to refresh publications', err);
        }
    };

    const handleDeletePublication = async (publicationId: string) => {
        try {
            await publicationsApi.delete(publicationId);

            // Refresh publications list after deletion
            if (user) {
                const response = await publicationsApi.getLatestByAuthor(user.id, 100);
                setPublications(response.data);
            }
        } catch (err: any) {
            console.error('Failed to delete publication', err);
            throw err; // Re-throw to let the component handle the error
        }
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
                            <ProfileInfo user={user} onEditTags={handleEditTags} />
                        </>
                    )}
                </div>

                {/* Publications Section */}
                {!editing && (
                    <div className="profile-card publications-section">
                        <div className="publications-section-header">
                            <h2 className="publications-section-title">📚 Yayınlarım</h2>
                            <button
                                className="add-publication-button"
                                onClick={handleOpenAddPublication}
                            >
                                ➕ Yeni Yayın Ekle
                            </button>
                        </div>

                        {loadingPublications ? (
                            <Loading message="Yayınlar yükleniyor..." />
                        ) : (
                            <PublicationsList
                                publications={publications}
                                showAll={showAllPublications}
                                onToggleShowAll={handleTogglePublications}
                                maxPreview={3}
                                currentUserId={user.id}
                                onDelete={handleDeletePublication}
                            />
                        )}
                    </div>
                )}

                {/* Stats Section - Separate card at the bottom */}
                {!editing && (
                    <div className="profile-card">
                        <div className="profile-info-section">
                            <h2 className="profile-info-section-title">İstatistikler</h2>
                            <div className="profile-stats">
                                <div className="profile-stat">
                                    <span className="stat-value">{user.followerCount}</span>
                                    <span className="stat-label">Takipçi</span>
                                </div>
                                <div className="profile-stat">
                                    <span className="stat-value">{user.followingCount}</span>
                                    <span className="stat-label">Takip</span>
                                </div>
                                <div className="profile-stat">
                                    <span className="stat-value">{user.avgScore.toFixed(1)}</span>
                                    <span className="stat-label">Ortalama Puan</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showTagManagement && (
                    <TagManagementPopup
                        userTags={user.tags}
                        onClose={handleCloseTagManagement}
                        onTagsUpdated={handleTagsUpdated}
                    />
                )}

                {showAddPublicationModal && (
                    <AddPublicationModal
                        onClose={handleCloseAddPublication}
                        onPublicationAdded={handlePublicationAdded}
                    />
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
