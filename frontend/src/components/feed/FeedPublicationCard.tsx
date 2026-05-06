import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Publication } from '../../services/publicationService';
import { publicationsApi } from '../../services/publicationService';
import { usersApi } from '../../services/userService';
import { reviewApi } from '../../services/reviewService';
import { API_SERVER_URL } from '../../services/apiClient';
import { RESEARCH_TOPICS } from '../../data/researchTopics';
import PublicationDetailModal from './PublicationDetailModal';
import ShareModal from './ShareModal';
import '../../styles/feed/FeedPublicationCard.css';
import '../../styles/publications/AddPublicationModal.css';

const MAX_EDIT_TAGS = 6;

interface FeedPublicationCardProps {
    publication: Publication;
    isFollowing?: boolean;
    onFollowChange?: (authorId: string, following: boolean) => void;
    onDeleted?: (publicationId: string) => void;
    onUpdated?: (updatedPublication: Publication) => void;
    onShared?: () => void;
}

const FeedPublicationCard: React.FC<FeedPublicationCardProps> = ({ publication: initialPublication, isFollowing: initialIsFollowing = false, onFollowChange, onDeleted, onUpdated, onShared }) => {
    const [publication, setPublication] = useState(initialPublication);
    const [showDetail, setShowDetail] = useState(false);
    const [showRatingPopup, setShowRatingPopup] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);
    const [userRating, setUserRating] = useState<number | null>(publication.userRating);
    const [averageRating, setAverageRating] = useState(publication.averageRating);
    const [isSaved, setIsSaved] = useState(publication.isSaved);
    const [saveCount, setSaveCount] = useState(publication.saveCount);
    const [isShared, setIsShared] = useState(publication.isShared);
    const [shareCount, setShareCount] = useState(publication.shareCount);
    const [savingAction, setSavingAction] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(publication.title);
    const [editAbstract, setEditAbstract] = useState(publication.abstract || '');
    const [editTags, setEditTags] = useState<string[]>(publication.tags);
    const [editTagQuery, setEditTagQuery] = useState('');
    const [editTagFiltered, setEditTagFiltered] = useState<string[]>([]);
    const [editTagOpen, setEditTagOpen] = useState(false);
    const [editTagActiveIdx, setEditTagActiveIdx] = useState(-1);
    const editTagRef = useRef<HTMLDivElement>(null);
    const editTagListRef = useRef<HTMLUListElement>(null);
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [following, setFollowing] = useState(initialIsFollowing);
    const [followLoading, setFollowLoading] = useState(false);
    const [isLookingForReviewers, setIsLookingForReviewers] = useState(initialPublication.isLookingForReviewers ?? false);
    const ratingRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Get current user for ownership check
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isOwner = currentUser.id === publication.author.id;

    useEffect(() => {
        setFollowing(initialIsFollowing);
    }, [initialIsFollowing]);

    // Close rating popup on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ratingRef.current && !ratingRef.current.contains(e.target as Node)) {
                setShowRatingPopup(false);
            }
        };
        if (showRatingPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showRatingPopup]);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    // Close edit tag autocomplete on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (editTagRef.current && !editTagRef.current.contains(e.target as Node)) {
                setEditTagOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll active edit tag item into view
    useEffect(() => {
        if (editTagActiveIdx >= 0 && editTagListRef.current) {
            const el = editTagListRef.current.children[editTagActiveIdx] as HTMLElement;
            if (el) el.scrollIntoView({ block: 'nearest' });
        }
    }, [editTagActiveIdx]);

    const getTimeAgo = (dateString: string): string => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffWeek = Math.floor(diffDay / 7);
        const diffMonth = Math.floor(diffDay / 30);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        if (diffWeek < 5) return `${diffWeek}w ago`;
        return `${diffMonth}mo ago`;
    };

    const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const authorImageUrl = publication.author.profileImageUrl
        ? `${API_SERVER_URL}${publication.author.profileImageUrl}`
        : null;

    const handleCardClick = () => {
        setShowDetail(true);
    };

    const handleAuthorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${publication.author.id}`);
    };

    const handleRateClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (userRating) {
            // Already rated — remove rating directly
            try {
                const res = await publicationsApi.rate(publication.id, 0);
                setUserRating(res.data.userRating);
                setAverageRating(res.data.averageRating);
            } catch (err) {
                console.error('Failed to remove rating', err);
            }
        } else {
            setShowRatingPopup(!showRatingPopup);
        }
    };

    const handleStarClick = async (score: number) => {
        try {
            // If clicking the same star, remove rating (send 0)
            const newScore = score === userRating ? 0 : score;
            const res = await publicationsApi.rate(publication.id, newScore);
            setUserRating(res.data.userRating);
            setAverageRating(res.data.averageRating);
            setShowRatingPopup(false);
        } catch (err) {
            console.error('Failed to rate publication', err);
        }
    };

    const handleSaveClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (savingAction) return;
        setSavingAction(true);
        try {
            const res = await publicationsApi.toggleSave(publication.id);
            setIsSaved(res.data.saved);
            setSaveCount(res.data.saveCount);
        } catch (err) {
            console.error('Failed to toggle save', err);
        } finally {
            setSavingAction(false);
        }
    };

    const handleShareClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isShared || savingAction) return;
        setShowShareModal(true);
    };

    const handleShareSubmit = async (note: string) => {
        setSavingAction(true);
        try {
            const res = await publicationsApi.share(publication.id, note || undefined);
            setIsShared(res.data.shared);
            setShareCount(res.data.shareCount);
            setShowShareModal(false);
            if (onShared) onShared();
        } catch (err) {
            console.error('Failed to share publication', err);
        } finally {
            setSavingAction(false);
        }
    };

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(prev => !prev);
    };

    const handleEditOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        setEditTitle(publication.title);
        setEditAbstract(publication.abstract || '');
        setEditTags(publication.tags);
        setEditTagQuery('');
        setEditTagFiltered([]);
        setEditTagOpen(false);
        setEditTagActiveIdx(-1);
        setIsEditing(true);
    };

    const filterEditTopics = (query: string, currentTags: string[]) => {
        if (query.trim().length === 0) return [];
        const tagSet = new Set(currentTags.map(t => t.toLowerCase()));
        return RESEARCH_TOPICS.filter(t =>
            t.toLowerCase().includes(query.toLowerCase()) && !tagSet.has(t.toLowerCase())
        ).slice(0, 15);
    };

    const handleEditTagSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (editTags.length >= MAX_EDIT_TAGS) return;
        const q = e.target.value;
        setEditTagQuery(q);
        const matches = filterEditTopics(q, editTags);
        setEditTagFiltered(matches);
        setEditTagOpen(matches.length > 0);
        setEditTagActiveIdx(-1);
    };

    const handleEditTagSelect = (topic: string) => {
        if (editTags.length >= MAX_EDIT_TAGS) return;
        setEditTags(prev => [...prev, topic]);
        setEditTagQuery('');
        setEditTagFiltered([]);
        setEditTagOpen(false);
        setEditTagActiveIdx(-1);
    };

    const handleEditTagRemove = (topic: string) => {
        setEditTags(prev => prev.filter(t => t !== topic));
    };

    const handleEditTagKeyDown = (e: React.KeyboardEvent) => {
        if (!editTagOpen) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setEditTagActiveIdx(prev => (prev < editTagFiltered.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setEditTagActiveIdx(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && editTagActiveIdx >= 0) {
            e.preventDefault();
            handleEditTagSelect(editTagFiltered[editTagActiveIdx]);
        } else if (e.key === 'Escape') {
            setEditTagOpen(false);
        }
    };

    const handleEditSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!editTitle.trim()) return;
        setSaving(true);
        try {
            const res = await publicationsApi.update(publication.id, {
                title: editTitle.trim(),
                abstract: editAbstract.trim() || undefined,
                publishedDate: publication.publishedDate || undefined,
                tags: editTags,
            });
            setPublication(res.data);
            setIsEditing(false);
            if (onUpdated) onUpdated(res.data);
        } catch (err) {
            console.error('Failed to update publication', err);
        } finally {
            setSaving(false);
        }
    };

    const handleEditCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(false);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleting(true);
        try {
            await publicationsApi.delete(publication.id);
            setShowDeleteConfirm(false);
            if (onDeleted) onDeleted(publication.id);
        } catch (err) {
            console.error('Failed to delete publication', err);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteConfirm(false);
    };

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (followLoading) return;
        setFollowLoading(true);
        try {
            if (following) {
                await usersApi.unfollow(publication.author.id);
                setFollowing(false);
                onFollowChange?.(publication.author.id, false);
            } else {
                await usersApi.follow(publication.author.id);
                setFollowing(true);
                onFollowChange?.(publication.author.id, true);
            }
        } catch (err) {
            console.error('Failed to toggle follow', err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleToggleReview = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        try {
            const res = await reviewApi.toggleReviewSearch(publication.id);
            setIsLookingForReviewers(res.data.isLookingForReviewers);
        } catch (err) {
            console.error('Failed to toggle review search', err);
        }
    };

    return (
        <>
            <article className="feed-card" onClick={handleCardClick}>
                {/* Author Header */}
                <div className="feed-card-author">
                    <div className="feed-card-avatar-wrapper" onClick={handleAuthorClick}>
                        {authorImageUrl ? (
                            <img
                                src={authorImageUrl}
                                alt={publication.author.fullName}
                                className="feed-card-avatar"
                            />
                        ) : (
                            <div className="feed-card-avatar-placeholder">
                                {publication.author.fullName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="feed-card-author-info">
                        <h4 className="feed-card-author-name">
                            <span className="feed-card-author-link" onClick={handleAuthorClick}>
                                {publication.author.fullName}
                            </span>
                            {publication.author.isVerified && (
                                <span className="feed-card-verified" title="Verified">✓</span>
                            )}
                            {!isOwner && (
                                <button
                                    className={`feed-card-follow-btn ${following ? 'feed-card-follow-btn-following' : ''}`}
                                    onClick={handleFollowToggle}
                                    disabled={followLoading}
                                >
                                    {followLoading ? '...' : following ? 'Unfollow' : 'Follow'}
                                </button>
                            )}
                        </h4>
                        <p className="feed-card-author-detail">
                            {[publication.author.title, publication.author.institution]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                        <span className="feed-card-time">{getTimeAgo(publication.createdAt)}</span>
                    </div>

                    {/* 3-dot menu - only for owner */}
                    {isOwner && (
                        <div className="feed-card-menu-wrapper" ref={menuRef}>
                            <button
                                className="feed-card-menu-btn"
                                onClick={handleMenuToggle}
                                title="More options"
                            >
                                ⋮
                            </button>
                            {showMenu && (
                                <div className="feed-card-dropdown">
                                    <button className="feed-card-dropdown-item" onClick={handleEditOpen}>
                                        Edit
                                    </button>
                                    <button className="feed-card-dropdown-item" onClick={handleToggleReview}>
                                        {isLookingForReviewers ? 'Close Review' : 'Open for Review'}
                                    </button>
                                    <button className="feed-card-dropdown-item feed-card-dropdown-delete" onClick={handleDeleteClick}>
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Edit Form */}
                {isEditing ? (
                    <div className="feed-card-edit-form" onClick={(e) => e.stopPropagation()}>
                        <div className="feed-card-edit-field">
                            <label>Title</label>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Publication title"
                                autoFocus
                            />
                        </div>
                        <div className="feed-card-edit-field">
                            <label>Abstract</label>
                            <textarea
                                value={editAbstract}
                                onChange={(e) => setEditAbstract(e.target.value)}
                                placeholder="Abstract"
                                rows={3}
                            />
                        </div>
                        <div className="feed-card-edit-field">
                            <label>Tags ({editTags.length}/{MAX_EDIT_TAGS})</label>
                            {editTags.length > 0 && (
                                <div className="pub-tags-chips">
                                    {editTags.map(tag => (
                                        <span key={tag} className="pub-tag-chip">
                                            {tag}
                                            <button type="button" className="pub-tag-chip-remove" onClick={() => handleEditTagRemove(tag)}>×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="pub-tag-autocomplete-wrapper" ref={editTagRef}>
                                <input
                                    type="text"
                                    value={editTagQuery}
                                    onChange={handleEditTagSearch}
                                    onKeyDown={handleEditTagKeyDown}
                                    placeholder={editTags.length >= MAX_EDIT_TAGS ? `Maximum ${MAX_EDIT_TAGS} tags reached` : 'Search topics (e.g., Machine Learning...)'}
                                    autoComplete="off"
                                    disabled={editTags.length >= MAX_EDIT_TAGS}
                                />
                                {editTagOpen && editTagFiltered.length > 0 && (
                                    <ul className="pub-tag-autocomplete-list" ref={editTagListRef}>
                                        {editTagFiltered.map((topic, idx) => (
                                            <li
                                                key={topic}
                                                className={`pub-tag-autocomplete-item ${idx === editTagActiveIdx ? 'pub-tag-autocomplete-item-active' : ''}`}
                                                onMouseDown={(e) => { e.preventDefault(); handleEditTagSelect(topic); }}
                                                onMouseEnter={() => setEditTagActiveIdx(idx)}
                                            >
                                                {topic}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className="feed-card-edit-actions">
                            <button
                                className="feed-card-edit-save-btn"
                                onClick={handleEditSave}
                                disabled={saving || !editTitle.trim()}
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                className="feed-card-edit-cancel-btn"
                                onClick={handleEditCancel}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Publication Content */}
                        <div className="feed-card-content">
                            <h3 className="feed-card-title">{publication.title}</h3>
                            {publication.abstract && (
                                <p className="feed-card-abstract">
                                    {truncateText(publication.abstract, 300)}
                                </p>
                            )}
                        </div>

                        {/* Tags */}
                        {publication.tags.length > 0 && (
                            <div className="feed-card-tags">
                                {publication.tags.map((tag, index) => (
                                    <span key={index} className="feed-card-tag">{tag}</span>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                    <div className="feed-card-delete-confirm" onClick={(e) => e.stopPropagation()}>
                        <p>Are you sure you want to delete this publication?</p>
                        <div className="feed-card-delete-actions">
                            <button
                                className="feed-card-delete-yes"
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                            <button
                                className="feed-card-delete-no"
                                onClick={handleDeleteCancel}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* File indicator */}
                {publication.fileUrl && (
                    <div className="feed-card-file-indicator">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>Attached document</span>
                    </div>
                )}

                {/* Interactive Stats Bar */}
                <div className="feed-card-stats" onClick={(e) => e.stopPropagation()}>
                    {/* Rating */}
                    <div className="feed-card-stat-wrapper" ref={ratingRef}>
                        <button
                            className={`feed-card-stat feed-card-stat-btn ${userRating ? 'feed-card-stat-active' : ''}`}
                            onClick={handleRateClick}
                            title={userRating ? `Your rating: ${userRating}/5` : 'Rate this publication'}
                        >
                            <svg viewBox="0 0 24 24" fill={userRating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span>{averageRating.toFixed(1)}</span>
                        </button>

                        {/* Star Rating Popup */}
                        {showRatingPopup && (
                            <div className="feed-card-rating-popup">
                                <div className="feed-card-rating-stars">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            className={`feed-card-star ${(hoverRating || userRating || 0) >= star ? 'feed-card-star-filled' : ''
                                                }`}
                                            onClick={() => handleStarClick(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            title={`${star} star${star > 1 ? 's' : ''}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <span className="feed-card-rating-label">
                                    {hoverRating > 0
                                        ? `${hoverRating}/5`
                                        : userRating
                                            ? `Your rating: ${userRating}/5`
                                            : 'Select a rating'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Save/Bookmark */}
                    <button
                        className={`feed-card-stat feed-card-stat-btn ${isSaved ? 'feed-card-stat-active' : ''}`}
                        onClick={handleSaveClick}
                        disabled={savingAction}
                        title={isSaved ? 'Unsave' : 'Save to your library'}
                    >
                        <svg viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{saveCount} saves</span>
                    </button>

                    {/* Share */}
                    <button
                        className={`feed-card-stat feed-card-stat-btn ${isShared ? 'feed-card-stat-active' : ''}`}
                        onClick={handleShareClick}
                        disabled={savingAction || isShared}
                        title={isShared ? 'Already shared' : 'Share to your profile'}
                    >
                        <svg viewBox="0 0 24 24" fill={isShared ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        <span>{shareCount} shares</span>
                    </button>
                </div>
            </article>

            {showDetail && (
                <PublicationDetailModal
                    publication={publication}
                    onClose={() => setShowDetail(false)}
                />
            )}

            {showShareModal && (
                <ShareModal
                    publication={publication}
                    onShare={handleShareSubmit}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </>
    );
};

export default FeedPublicationCard;
