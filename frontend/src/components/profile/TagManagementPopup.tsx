import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usersApi } from '../../services/userService';
import type { Tag } from '../../services/userService';
import { RESEARCH_TOPICS } from '../../data/researchTopics';
import '../../styles/profile/TagManagementPopup.css';

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
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [filteredTopics, setFilteredTopics] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll active item into view
    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const activeItem = listRef.current.children[activeIndex] as HTMLElement;
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex]);

    // Get user tag names for filtering
    const userTagNames = new Set(userTags.map(tag => tag.name.toLowerCase()));

    const filterTopics = useCallback((query: string) => {
        if (query.trim().length > 0) {
            const matches = RESEARCH_TOPICS.filter((topic) =>
                topic.toLowerCase().includes(query.toLowerCase()) &&
                !userTagNames.has(topic.toLowerCase())
            );
            setFilteredTopics(matches.slice(0, 15));
            setIsDropdownOpen(matches.length > 0);
        } else {
            setFilteredTopics([]);
            setIsDropdownOpen(false);
        }
    }, [userTagNames]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        filterTopics(query);
        setActiveIndex(-1);
    };

    const handleAddTag = async (tagName: string) => {
        try {
            setActionLoading(true);
            await usersApi.addTag(tagName);
            onTagsUpdated();
            setSearchQuery('');
            setFilteredTopics([]);
            setIsDropdownOpen(false);
            setActiveIndex(-1);
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isDropdownOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev < filteredTopics.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleAddTag(filteredTopics[activeIndex]);
        } else if (e.key === 'Escape') {
            setIsDropdownOpen(false);
        }
    };

    const handleFocus = () => {
        if (searchQuery.trim().length > 0) {
            filterTopics(searchQuery);
        }
    };

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                <div className="popup-header">
                    <h2>Edit Research Interests</h2>
                    <button className="popup-close" onClick={onClose}>×</button>
                </div>

                {error && (
                    <div className="popup-error">{error}</div>
                )}

                <div className="popup-body">
                    {/* Current Tags Section */}
                    <div className="current-tags-section">
                        <h3>Current Tags</h3>
                        {userTags.length === 0 ? (
                            <p className="no-tags">No tags added yet</p>
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

                    {/* Search Section with Autocomplete */}
                    <div className="search-section" ref={wrapperRef}>
                        <h3>Add Research Interest</h3>
                        <input
                            type="text"
                            className="tag-search-input"
                            placeholder="Search topics (e.g., Machine Learning, Data Science...)"
                            value={searchQuery}
                            onChange={handleSearch}
                            onKeyDown={handleKeyDown}
                            onFocus={handleFocus}
                            disabled={actionLoading}
                            autoComplete="off"
                        />
                        {isDropdownOpen && filteredTopics.length > 0 && (
                            <ul className="tag-autocomplete-list" ref={listRef}>
                                {filteredTopics.map((topic, index) => (
                                    <li
                                        key={topic}
                                        className={`tag-autocomplete-item ${index === activeIndex ? 'tag-autocomplete-item-active' : ''}`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleAddTag(topic);
                                        }}
                                        onMouseEnter={() => setActiveIndex(index)}
                                    >
                                        {topic}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TagManagementPopup;
