import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    AddPublicationModal,
    Toast
} from '../components';
import '../styles/pages/ProfilePage.css';

type ProfileTab = 'publications' | 'saved';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { userId } = useParams<{ userId?: string }>();
    const [user, setUser] = useState<User | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTagManagement, setShowTagManagement] = useState(false);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [savedPublications, setSavedPublications] = useState<Publication[]>([]);

    const [loadingPublications, setLoadingPublications] = useState(false);
    const [showAllPublications, setShowAllPublications] = useState(false);
    const [showAddPublicationModal, setShowAddPublicationModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isOwnProfile, setIsOwnProfile] = useState(true);
    const [activeTab, setActiveTab] = useState<ProfileTab>('publications');

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                setLoading(true);
                if (userId) {
                    // Viewing another user's profile
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    setIsOwnProfile(currentUser.id === userId);
                    const response = await usersApi.getById(userId);
                    setUser(response.data);
                } else {
                    // Viewing own profile
                    setIsOwnProfile(true);
                    const response = await usersApi.getProfile();
                    setUser(response.data);
                }
                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch profile', err);
                if (err.response?.status === 401) {
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
    }, [navigate, userId]);

    useEffect(() => {
        const fetchPublications = async () => {
            if (!user) return;

            try {
                setLoadingPublications(true);
                // Fetch authored publications
                const authoredResponse = await publicationsApi.getLatestByAuthor(user.id, 4);
                // Fetch shared publications
                const sharedResponse = await publicationsApi.getShared(user.id);
                // Merge and sort by date descending
                const merged = [...authoredResponse.data, ...sharedResponse.data]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setPublications(merged);
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

    const handleImageUpload = async (file: File, type: 'profile' | 'cover') => {
        try {
            const response = await usersApi.uploadProfileImage(file, type);
            setUser(response.data);
        } catch (err: any) {
            console.error('Image upload failed:', err);
            const message = err?.response?.data?.message || err?.response?.data?.Message || 'Failed to upload image. Please try again.';
            setToastMessage(message);
        }
    };

    const handleImageRemove = async (type: 'profile' | 'cover') => {
        if (!user) return;
        try {
            const updateData: UpdateUserData = {
                fullName: user.fullName,
                ...(type === 'profile' ? { profileImageUrl: '' } : { coverImageUrl: '' }),
            };
            const response = await usersApi.updateProfile(updateData);
            setUser(response.data);
        } catch (err) {
            console.error('Image remove failed:', err);
            setToastMessage('Failed to remove image. Please try again.');
        }
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

    const handleTogglePublications = async () => {
        if (!user) return;

        const newShowAll = !showAllPublications;
        setShowAllPublications(newShowAll);

        // Fetch publications based on the new state
        try {
            setLoadingPublications(true);
            if (newShowAll) {
                // Fetch all authored + shared publications when showing all
                const [authoredRes, sharedRes] = await Promise.all([
                    publicationsApi.getByAuthor(user.id),
                    publicationsApi.getShared(user.id),
                ]);
                const merged = [...authoredRes.data, ...sharedRes.data]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setPublications(merged);
            } else {
                // Fetch limited when collapsing
                const [authoredRes, sharedRes] = await Promise.all([
                    publicationsApi.getLatestByAuthor(user.id, 4),
                    publicationsApi.getShared(user.id),
                ]);
                const merged = [...authoredRes.data, ...sharedRes.data]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setPublications(merged);
            }
        } catch (err) {
            console.error('Failed to fetch publications', err);
        } finally {
            setLoadingPublications(false);
        }
    };

    const handleOpenAddPublication = async () => {
        // Refresh publications list when opening modal
        if (user) {
            try {
                const response = showAllPublications
                    ? await publicationsApi.getByAuthor(user.id)
                    : await publicationsApi.getLatestByAuthor(user.id, 4);
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
            const response = showAllPublications
                ? await publicationsApi.getByAuthor(user.id)
                : await publicationsApi.getLatestByAuthor(user.id, 4);
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
                const response = showAllPublications
                    ? await publicationsApi.getByAuthor(user.id)
                    : await publicationsApi.getLatestByAuthor(user.id, 4);
                setPublications(response.data);
            }
        } catch (err: any) {
            console.error('Failed to delete publication', err);
            throw err; // Re-throw to let the component handle the error
        }
    };

    const handleUnshare = async (publicationId: string) => {
        try {
            await publicationsApi.unshare(publicationId);

            // Refresh publications list after unsharing
            if (user) {
                const [authoredRes, sharedRes] = await Promise.all([
                    showAllPublications
                        ? publicationsApi.getByAuthor(user.id)
                        : publicationsApi.getLatestByAuthor(user.id, 4),
                    publicationsApi.getShared(user.id),
                ]);
                const merged = [...authoredRes.data, ...sharedRes.data]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setPublications(merged);
            }
        } catch (err: any) {
            console.error('Failed to unshare publication', err);
            throw err;
        }
    };

    const handleTabChange = async (tab: ProfileTab) => {
        if (!user) return;
        setActiveTab(tab);

        try {
            setLoadingPublications(true);
            if (tab === 'saved') {
                // Saved is only for own profile
                const response = await publicationsApi.getSaved();
                setSavedPublications(response.data);
            } else {
                // Refresh authored + shared publications
                const [authoredRes, sharedRes] = await Promise.all([
                    showAllPublications
                        ? publicationsApi.getByAuthor(user.id)
                        : publicationsApi.getLatestByAuthor(user.id, 4),
                    publicationsApi.getShared(user.id),
                ]);
                const merged = [...authoredRes.data, ...sharedRes.data]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setPublications(merged);
            }
        } catch (err) {
            console.error('Failed to fetch tab data', err);
        } finally {
            setLoadingPublications(false);
        }
    };

    if (loading) {
        return <Loading message="Loading profile..." />;
    }

    if (!user) {
        return (
            <div className="profile-container">
                <Navbar currentPage={isOwnProfile ? "profile" : "none"} />
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
            <Navbar currentPage={isOwnProfile ? "profile" : "none"} />

            <div className="profile-content">
                {/* Header Card - Full Width */}
                <div className="profile-card">
                    {error && (
                        <div className="profile-error-message">
                            {error}
                        </div>
                    )}

                    {editing && isOwnProfile ? (
                        <>
                            <ProfileHeader
                                fullName={user.fullName}
                                email={user.email}
                                isVerified={user.isVerified}
                                profileImageUrl={user.profileImageUrl}
                                coverImageUrl={user.coverImageUrl}
                                onEditClick={() => setEditing(false)}
                                onImageUpload={handleImageUpload}
                                onImageRemove={handleImageRemove}
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
                        <ProfileHeader
                            fullName={user.fullName}
                            email={user.email}
                            isVerified={user.isVerified}
                            profileImageUrl={user.profileImageUrl}
                            coverImageUrl={user.coverImageUrl}
                            onEditClick={isOwnProfile ? handleEditClick : undefined}
                            onImageUpload={isOwnProfile ? handleImageUpload : undefined}
                            onImageRemove={isOwnProfile ? handleImageRemove : undefined}
                        />
                    )}
                </div>

                {/* Two Column Layout */}
                {!editing && (
                    <div className="profile-body">
                        {/* Left Sidebar */}
                        <div className="profile-sidebar">
                            {/* About + Tags */}
                            <div className="profile-card">
                                <ProfileInfo user={user} onEditTags={isOwnProfile ? handleEditTags : undefined} />
                            </div>

                            {/* Statistics */}
                            <div className="profile-card">
                                <div className="profile-info-section">
                                    <h2 className="profile-info-section-title">Statistics</h2>
                                    <div className="profile-stats">
                                        <div className="profile-stat">
                                            <span className="stat-value">{user.followerCount}</span>
                                            <span className="stat-label">Followers</span>
                                        </div>
                                        <div className="profile-stat">
                                            <span className="stat-value">{user.followingCount}</span>
                                            <span className="stat-label">Following</span>
                                        </div>
                                        <div className="profile-stat">
                                            <span className="stat-value">{user.avgScore.toFixed(1)}</span>
                                            <span className="stat-label">Avg Score</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Main Content */}
                        <div className="profile-main">
                            <div className="profile-card publications-section">
                                {/* Tab Navigation */}
                                <div className="profile-tabs">
                                    <button
                                        className={`profile-tab ${activeTab === 'publications' ? 'profile-tab-active' : ''}`}
                                        onClick={() => handleTabChange('publications')}
                                    >
                                        Posts
                                    </button>
                                    {isOwnProfile && (
                                        <button
                                            className={`profile-tab ${activeTab === 'saved' ? 'profile-tab-active' : ''}`}
                                            onClick={() => handleTabChange('saved')}
                                        >
                                            Saved
                                        </button>
                                    )}

                                    {isOwnProfile && activeTab === 'publications' && (
                                        <button
                                            className="add-publication-button"
                                            onClick={handleOpenAddPublication}
                                        >
                                            + Add New Publication
                                        </button>
                                    )}
                                </div>

                                {/* Tab Content */}
                                {loadingPublications ? (
                                    <Loading message="Loading..." />
                                ) : activeTab === 'publications' ? (
                                    <PublicationsList
                                        publications={publications}
                                        showAll={showAllPublications}
                                        onToggleShowAll={handleTogglePublications}
                                        maxPreview={3}
                                        currentUserId={user.id}
                                        onDelete={handleDeletePublication}
                                        onUnshare={isOwnProfile ? handleUnshare : undefined}
                                    />
                                ) : (
                                    <PublicationsList
                                        publications={savedPublications}
                                        showAll={true}
                                        maxPreview={100}
                                        currentUserId={user.id}
                                    />
                                )}
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

                {toastMessage && (
                    <Toast
                        message={toastMessage}
                        type="error"
                        onClose={() => setToastMessage(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
