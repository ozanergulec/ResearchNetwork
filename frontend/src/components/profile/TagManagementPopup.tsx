import React, { useState, useEffect } from 'react';
import { usersApi } from '../../services/userService';
import { tagsApi } from '../../services/tagService';
import type { Tag } from '../../services/userService';
import '../../styles/TagManagementPopup.css';

interface TagManagementPopupProps {
    userTags: Tag[];
    onClose: () => void;
    onTagsUpdated: () => void;
}

const TagManagementPopup: React.FC<TagManagementPopupProps> = ({
    userTags,
    onClose,
    onTagsUpdated,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            setLoading(true);
            const response = await tagsApi.getAll();
            setAvailableTags(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch tags', err);
            setError('Failed to load tags');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);

        if (query.trim() === '') {
            fetchTags();
            return;
        }

        try {
            setLoading(true);
            const response = await tagsApi.search(query);
            setAvailableTags(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to search tags', err);
            setError('Failed to search tags');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = async (tagName: string) => {
        try {
            setActionLoading(true);
            await usersApi.addTag(tagName);
            onTagsUpdated();
            setSearchQuery('');
            fetchTags(); // Refresh available tags
            setError(null);
        } catch (err: any) {
            console.error('Failed to add tag', err);
            setError(err.response?.data?.message || 'Failed to add tag');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveTag = async (tagId: string) => {
        try {
            setActionLoading(true);
            await usersApi.removeTag(tagId);
            onTagsUpdated();
            setError(null);
        } catch (err: any) {
            console.error('Failed to remove tag', err);
            setError(err.response?.data?.message || 'Failed to remove tag');
        } finally {
            setActionLoading(false);
        }
    };

    const userTagIds = new Set(userTags.map(tag => tag.id));
    const filteredTags = availableTags.filter(tag => !userTagIds.has(tag.id));

    // Check if we can add new tag from search
    const canAddNewTag = searchQuery.trim() !== '' &&
        !availableTags.some(tag => tag.name.toLowerCase() === searchQuery.toLowerCase()) &&
        !userTags.some(tag => tag.name.toLowerCase() === searchQuery.toLowerCase());

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                <div className="popup-header">
                    <h2>İlgi Alanlarını Düzenle</h2>
                    <button className="popup-close" onClick={onClose}>×</button>
                </div>

                {error && (
                    <div className="popup-error">{error}</div>
                )}

                <div className="popup-body">
                    {/* Current Tags Section */}
                    <div className="current-tags-section">
                        <h3>Mevcut Etiketler</h3>
                        {userTags.length === 0 ? (
                            <p className="no-tags">Henüz etiket eklenmemiş</p>
                        ) : (
                            <div className="tags-list">
                                {userTags.map(tag => (
                                    <span key={tag.id} className="tag-item user-tag">
                                        {tag.name}
                                        <button
                                            className="tag-remove"
                                            onClick={() => handleRemoveTag(tag.id)}
                                            disabled={actionLoading}
                                            aria-label="Remove tag"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Search Section */}
                    <div className="search-section">
                        <h3>Etiket Ara</h3>
                        <input
                            type="text"
                            className="tag-search-input"
                            placeholder="Etiket adı girin (örn: AI, NLP, Machine Learning)"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            disabled={actionLoading}
                        />
                    </div>

                    {/* Available Tags Section */}
                    <div className="available-tags-section">
                        <h3>Mevcut Etiketler</h3>
                        {loading ? (
                            <p className="loading-text">Yükleniyor...</p>
                        ) : filteredTags.length === 0 && !canAddNewTag ? (
                            <p className="no-tags">Etiket bulunamadı</p>
                        ) : (
                            <div className="tags-list">
                                {canAddNewTag && (
                                    <span
                                        className="tag-item new-tag"
                                        onClick={() => handleAddTag(searchQuery.trim())}
                                    >
                                        + "{searchQuery.trim()}" ekle
                                    </span>
                                )}
                                {filteredTags.map(tag => (
                                    <span
                                        key={tag.id}
                                        className="tag-item available-tag"
                                        onClick={() => handleAddTag(tag.name)}
                                    >
                                        {tag.name}
                                        {tag.usageCount > 0 && (
                                            <span className="tag-count">({tag.usageCount})</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TagManagementPopup;
