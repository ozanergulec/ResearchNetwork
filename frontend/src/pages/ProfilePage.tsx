import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usersApi } from '../services/userService';
import type { User, UpdateUserData } from '../services/userService';
import { publicationsApi, type Publication, type SharedPublication } from '../services/publicationService';
import {
    Navbar,
    Loading,
    ProfileHeader,
    ProfileInfo,
    ProfileEditForm,
    TagManagementPopup,
    AddPublicationModal,
    Toast
} from '../components';
import ProfileStats from '../components/profile/ProfileStats';
import ProfileTabContent from '../components/profile/ProfileTabContent';
import type { ProfileTab } from '../components/profile/ProfileTabContent';
import '../styles/pages/ProfilePage.css';

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
    const [sharedPublications, setSharedPublications] = useState<SharedPublication[]>([]);
    const [savedPublications, setSavedPublications] = useState<Publication[]>([]);
    const [loadingPublications, setLoadingPublications] = useState(false);
    const [showAllPublications, setShowAllPublications] = useState(false);
    const [showAddPublicationModal, setShowAddPublicationModal] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isOwnProfile, setIsOwnProfile] = useState(true);
    const [activeTab, setActiveTab] = useState<ProfileTab>('publications');
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

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
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const ownProfile = currentUser.id === userId;
                    setIsOwnProfile(ownProfile);
                    const response = await usersApi.getById(userId);
                    setUser(response.data);

                    if (!ownProfile) {
                        const followingRes = await usersApi.getFollowingIds();
                        setIsFollowing(followingRes.data.includes(userId));
                    }
                } else {
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
                const [authoredRes, sharedRes] = await Promise.all([
                    publicationsApi.getLatestByAuthor(user.id, 4),
                    publicationsApi.getShared(user.id),
                ]);
                setPublications(authoredRes.data);
                setSharedPublications(sharedRes.data);
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
            localStorage.setItem('user', JSON.stringify(response.data));
            setEditing(false);
        } catch (err: any) {
            console.error('Update failed', err);
            setError('Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
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

    const handleTagsUpdated = async () => {
        try {
            const response = await usersApi.getProfile();
            setUser(response.data);
        } catch (err) {
            console.error('Failed to refresh profile', err);
        }
    };

    const handleRefreshUser = async () => {
        try {
            const response = userId && !isOwnProfile
                ? await usersApi.getById(userId)
                : await usersApi.getProfile();
            setUser(response.data);
        } catch (err) {
            console.error('Failed to refresh user', err);
        }
    };

    const handleFollowToggle = async () => {
        if (!user || followLoading) return;
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await usersApi.unfollow(user.id);
                setIsFollowing(false);
                setUser(prev => prev ? { ...prev, followerCount: Math.max(0, prev.followerCount - 1) } : prev);
            } else {
                await usersApi.follow(user.id);
                setIsFollowing(true);
                setUser(prev => prev ? { ...prev, followerCount: prev.followerCount + 1 } : prev);
            }
        } catch (err) {
            console.error('Failed to toggle follow', err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleTogglePublications = async () => {
        if (!user) return;
        const newShowAll = !showAllPublications;
        setShowAllPublications(newShowAll);
        try {
            setLoadingPublications(true);
            const [authoredRes, sharedRes] = await Promise.all([
                newShowAll
                    ? publicationsApi.getByAuthor(user.id)
                    : publicationsApi.getLatestByAuthor(user.id, 4),
                publicationsApi.getShared(user.id),
            ]);
            setPublications(authoredRes.data);
            setSharedPublications(sharedRes.data);
        } catch (err) {
            console.error('Failed to fetch publications', err);
        } finally {
            setLoadingPublications(false);
        }
    };

    const handleOpenAddPublication = async () => {
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

    const handlePublicationAdded = async () => {
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

    const handleDeletePublication = async () => {
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

    const handleTabChange = async (tab: ProfileTab) => {
        if (!user) return;
        setActiveTab(tab);
        try {
            setLoadingPublications(true);
            if (tab === 'saved') {
                const response = await publicationsApi.getSaved();
                setSavedPublications(response.data);
            } else if (tab === 'my-publications') {
                const response = await publicationsApi.getByAuthor(user.id);
                setPublications(response.data);
            } else {
                const [authoredRes, sharedRes] = await Promise.all([
                    showAllPublications
                        ? publicationsApi.getByAuthor(user.id)
                        : publicationsApi.getLatestByAuthor(user.id, 4),
                    publicationsApi.getShared(user.id),
                ]);
                setPublications(authoredRes.data);
                setSharedPublications(sharedRes.data);
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
                {/* Header Card */}
                <div className="profile-card">
                    {error && <div className="profile-error-message">{error}</div>}

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
                                onCancel={() => { setEditing(false); setError(null); }}
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
                            onEditClick={isOwnProfile ? () => { setEditing(true); setError(null); } : undefined}
                            onImageUpload={isOwnProfile ? handleImageUpload : undefined}
                            onImageRemove={isOwnProfile ? handleImageRemove : undefined}
                            isFollowing={isFollowing}
                            followLoading={followLoading}
                            onFollowToggle={!isOwnProfile ? handleFollowToggle : undefined}
                        />
                    )}
                </div>

                {/* Two Column Layout */}
                {!editing && (
                    <div className="profile-body">
                        <div className="profile-sidebar">
                            <div className="profile-card">
                                <ProfileInfo user={user} onEditTags={isOwnProfile ? () => setShowTagManagement(true) : undefined} />
                            </div>
                            <div className="profile-card">
                                <ProfileStats user={user} onRefresh={handleRefreshUser} />
                            </div>
                        </div>

                        <div className="profile-main">
                            <ProfileTabContent
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                isOwnProfile={isOwnProfile}
                                loading={loadingPublications}
                                publications={publications}
                                sharedPublications={sharedPublications}
                                savedPublications={savedPublications}
                                showAllPublications={showAllPublications}
                                onToggleShowAll={handleTogglePublications}
                                onAddPublication={handleOpenAddPublication}
                                onDeletePublication={handleDeletePublication}
                                onSharedDeleted={(shareId) => {
                                    setSharedPublications(prev => prev.filter(sp => sp.shareId !== shareId));
                                }}
                            />
                        </div>
                    </div>
                )}

                {showTagManagement && (
                    <TagManagementPopup
                        userTags={user.tags}
                        onClose={() => setShowTagManagement(false)}
                        onTagsUpdated={handleTagsUpdated}
                    />
                )}

                {showAddPublicationModal && (
                    <AddPublicationModal
                        onClose={() => setShowAddPublicationModal(false)}
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
