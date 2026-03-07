import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../services/searchService';
import { Navbar } from '../components';
import { API_SERVER_URL } from '../services/apiClient';
import type { UserSummary, Publication } from '../services/publicationService';
import PublicationDetailModal from '../components/feed/PublicationDetailModal';
import { useTranslation } from '../translations/translations';
import '../styles/pages/SearchPage.css';

type TabType = 'users' | 'publications' | 'tags';

const ITEMS_PER_PAGE = 10;

const SearchPage: React.FC = () => {
    const navigate = useNavigate();
    const t = useTranslation();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('users');
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [tagUsers, setTagUsers] = useState<UserSummary[]>([]);
    const [tagPublications, setTagPublications] = useState<Publication[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.trim().length < 2) {
            setUsers([]);
            setPublications([]);
            setTagUsers([]);
            setTagPublications([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        try {
            const [usersRes, pubsRes, tagRes] = await Promise.all([
                searchApi.searchUsers(searchQuery),
                searchApi.searchPublications(searchQuery),
                searchApi.searchByTag(searchQuery),
            ]);
            setUsers(usersRes.data);
            setPublications(pubsRes.data);
            setTagPublications(tagRes.data.publications);
            setTagUsers(tagRes.data.users);
            setSearched(true);
            setCurrentPage(1);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getImageUrl = (url?: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${API_SERVER_URL}${url}`;
    };

    const truncateAbstract = (text?: string | null, maxLength = 150) => {
        if (!text) return '';
        return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    };

    const tagTotalCount = tagPublications.length + tagUsers.length;

    // Pagination helpers
    const paginate = <T,>(items: T[]) => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    };

    const getTotalPages = (totalItems: number) => Math.ceil(totalItems / ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setCurrentPage(1);
    };

    const renderPagination = (totalItems: number) => {
        const totalPages = getTotalPages(totalItems);
        if (totalPages <= 1) return null;

        const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
        const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

        // Build page numbers with ellipsis
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }

        return (
            <div className="search-pagination">
                <span className="search-pagination-info">
                    {startItem}-{endItem} / {totalItems}
                </span>
                <div className="search-pagination-controls">
                    <button
                        className="search-pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        ‹ {t.search.previous}
                    </button>
                    {pages.map((page, idx) =>
                        typeof page === 'string' ? (
                            <span key={`ellipsis-${idx}`} className="search-pagination-ellipsis">...</span>
                        ) : (
                            <button
                                key={page}
                                className={`search-pagination-page ${currentPage === page ? 'active' : ''}`}
                                onClick={() => handlePageChange(page)}
                            >
                                {page}
                            </button>
                        )
                    )}
                    <button
                        className="search-pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        {t.search.next} ›
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="search-container">
            <Navbar currentPage="search" />

            <div className="search-layout">
                <div className="search-header">
                    <h1>{t.search.title}</h1>
                    <p>{t.search.subtitle}</p>
                </div>

                {/* Search Bar */}
                <div className="search-bar-wrapper">
                    <span className="search-icon">&#x2315;</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t.search.placeholder}
                        value={query}
                        onChange={handleInputChange}
                        autoFocus
                    />
                </div>

                {/* Tabs */}
                <div className="search-tabs">
                    <button
                        className={`search-tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => handleTabChange('users')}
                    >
                        {t.search.people}
                        {searched && (
                            <span className="search-tab-count">{users.length}</span>
                        )}
                    </button>
                    <button
                        className={`search-tab ${activeTab === 'publications' ? 'active' : ''}`}
                        onClick={() => handleTabChange('publications')}
                    >
                        {t.search.publications}
                        {searched && (
                            <span className="search-tab-count">{publications.length}</span>
                        )}
                    </button>
                    <button
                        className={`search-tab ${activeTab === 'tags' ? 'active' : ''}`}
                        onClick={() => handleTabChange('tags')}
                    >
                        {t.search.tags}
                        {searched && (
                            <span className="search-tab-count">{tagTotalCount}</span>
                        )}
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="search-loading">
                        <div className="search-spinner" />
                        <span>{t.search.searching}</span>
                    </div>
                ) : !searched ? (
                    <div className="search-prompt">
                        <div className="search-prompt-icon">&#x2315;</div>
                        <h3>{t.search.startSearching}</h3>
                        <p>{t.search.minChars}</p>
                    </div>
                ) : (
                    <div className="search-results">
                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <>
                                {users.length === 0 ? (
                                    <div className="search-empty">
                                        <div className="search-empty-icon">{t.search.noUsersFound}</div>
                                        <h3>{t.search.noUsersFound}</h3>
                                        <p>{t.search.tryDifferent}</p>
                                    </div>
                                ) : (
                                    <>
                                        {paginate(users).map((user) => (
                                            <div
                                                key={user.id}
                                                className="search-user-card"
                                                onClick={() => navigate(`/profile/${user.id}`)}
                                            >
                                                {user.profileImageUrl ? (
                                                    <img
                                                        src={getImageUrl(user.profileImageUrl)!}
                                                        alt={user.fullName}
                                                        className="search-user-avatar"
                                                    />
                                                ) : (
                                                    <div className="search-user-avatar-placeholder">
                                                        {getInitials(user.fullName)}
                                                    </div>
                                                )}
                                                <div className="search-user-info">
                                                    <p className="search-user-name">
                                                        {user.fullName}
                                                        {user.isVerified && (
                                                            <span className="search-user-verified">✓</span>
                                                        )}
                                                    </p>
                                                    <p className="search-user-meta">
                                                        {[user.title, user.institution]
                                                            .filter(Boolean)
                                                            .join(' • ') || 'User'}
                                                    </p>
                                                </div>
                                                <span className="search-user-arrow">›</span>
                                            </div>
                                        ))}
                                        {renderPagination(users.length)}
                                    </>
                                )}
                            </>
                        )}

                        {/* Publications Tab */}
                        {activeTab === 'publications' && (
                            <>
                                {publications.length === 0 ? (
                                    <div className="search-empty">
                                        <div className="search-empty-icon">{t.search.noPubsFound}</div>
                                        <h3>{t.search.noPubsFound}</h3>
                                        <p>{t.search.tryDifferent}</p>
                                    </div>
                                ) : (
                                    <>
                                        {paginate(publications).map((pub) => (
                                            <div
                                                key={pub.id}
                                                className="search-pub-card"
                                                onClick={() => setSelectedPublication(pub)}
                                            >
                                                <h3 className="search-pub-title">{pub.title}</h3>
                                                {pub.abstract && (
                                                    <p className="search-pub-abstract">
                                                        {truncateAbstract(pub.abstract)}
                                                    </p>
                                                )}
                                                <div className="search-pub-footer">
                                                    <div
                                                        className="search-pub-author"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/profile/${pub.author.id}`);
                                                        }}
                                                    >
                                                        {pub.author.profileImageUrl ? (
                                                            <img
                                                                src={getImageUrl(pub.author.profileImageUrl)!}
                                                                alt={pub.author.fullName}
                                                                className="search-pub-author-avatar"
                                                            />
                                                        ) : (
                                                            <div className="search-pub-author-placeholder">
                                                                {getInitials(pub.author.fullName)}
                                                            </div>
                                                        )}
                                                        <span>{pub.author.fullName}</span>
                                                    </div>
                                                    <div className="search-pub-stats">
                                                        {pub.averageRating > 0 && (
                                                            <span className="search-pub-stat">
                                                                ⭐ {pub.averageRating.toFixed(1)}
                                                            </span>
                                                        )}
                                                        {pub.citationCount > 0 && (
                                                            <span className="search-pub-stat">
                                                                Citations: {pub.citationCount}
                                                            </span>
                                                        )}
                                                        {pub.saveCount > 0 && (
                                                            <span className="search-pub-stat">
                                                                {t.search.saved}: {pub.saveCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {pub.tags && pub.tags.length > 0 && (
                                                    <div className="search-pub-tags">
                                                        {pub.tags.map((tag, i) => (
                                                            <span key={i} className="search-pub-tag">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {renderPagination(publications.length)}
                                    </>
                                )}
                            </>
                        )}

                        {/* Tags Tab */}
                        {activeTab === 'tags' && (
                            <>
                                {tagTotalCount === 0 ? (
                                    <div className="search-empty">
                                        <div className="search-empty-icon">{t.search.noTagsFound}</div>
                                        <h3>{t.search.noTagsFound}</h3>
                                        <p>{t.search.tryDifferentTag}</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Tag Publications */}
                                        {tagPublications.length > 0 && (
                                            <div className="search-tag-section">
                                                <div className="search-tag-section-header">
                                                    <span className="search-tag-section-icon">{t.search.publications}</span>
                                                    <h3>{t.search.pubsWithTag}</h3>
                                                    <span className="search-tag-section-count">{tagPublications.length}</span>
                                                </div>
                                                {tagPublications.map((pub) => (
                                                    <div
                                                        key={pub.id}
                                                        className="search-pub-card"
                                                        onClick={() => setSelectedPublication(pub)}
                                                    >
                                                        <h3 className="search-pub-title">{pub.title}</h3>
                                                        {pub.abstract && (
                                                            <p className="search-pub-abstract">
                                                                {truncateAbstract(pub.abstract)}
                                                            </p>
                                                        )}
                                                        <div className="search-pub-footer">
                                                            <div
                                                                className="search-pub-author"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/profile/${pub.author.id}`);
                                                                }}
                                                            >
                                                                {pub.author.profileImageUrl ? (
                                                                    <img
                                                                        src={getImageUrl(pub.author.profileImageUrl)!}
                                                                        alt={pub.author.fullName}
                                                                        className="search-pub-author-avatar"
                                                                    />
                                                                ) : (
                                                                    <div className="search-pub-author-placeholder">
                                                                        {getInitials(pub.author.fullName)}
                                                                    </div>
                                                                )}
                                                                <span>{pub.author.fullName}</span>
                                                            </div>
                                                            <div className="search-pub-stats">
                                                                {pub.averageRating > 0 && (
                                                                    <span className="search-pub-stat">
                                                                        ⭐ {pub.averageRating.toFixed(1)}
                                                                    </span>
                                                                )}
                                                                {pub.citationCount > 0 && (
                                                                    <span className="search-pub-stat">
                                                                        {t.search.citations}: {pub.citationCount}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {pub.tags && pub.tags.length > 0 && (
                                                            <div className="search-pub-tags">
                                                                {pub.tags.map((tag, i) => (
                                                                    <span key={i} className="search-pub-tag">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Tag Users */}
                                        {tagUsers.length > 0 && (
                                            <div className="search-tag-section">
                                                <div className="search-tag-section-header">
                                                    <span className="search-tag-section-icon">{t.search.people}</span>
                                                    <h3>{t.search.peopleWithTag}</h3>
                                                    <span className="search-tag-section-count">{tagUsers.length}</span>
                                                </div>
                                                {tagUsers.map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className="search-user-card"
                                                        onClick={() => navigate(`/profile/${user.id}`)}
                                                    >
                                                        {user.profileImageUrl ? (
                                                            <img
                                                                src={getImageUrl(user.profileImageUrl)!}
                                                                alt={user.fullName}
                                                                className="search-user-avatar"
                                                            />
                                                        ) : (
                                                            <div className="search-user-avatar-placeholder">
                                                                {getInitials(user.fullName)}
                                                            </div>
                                                        )}
                                                        <div className="search-user-info">
                                                            <p className="search-user-name">
                                                                {user.fullName}
                                                                {user.isVerified && (
                                                                    <span className="search-user-verified">✓</span>
                                                                )}
                                                            </p>
                                                            <p className="search-user-meta">
                                                                {[user.title, user.institution]
                                                                    .filter(Boolean)
                                                                    .join(' • ') || 'User'}
                                                            </p>
                                                        </div>
                                                        <span className="search-user-arrow">›</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Publication Detail Modal */}
            {selectedPublication && (
                <PublicationDetailModal
                    publication={selectedPublication}
                    onClose={() => setSelectedPublication(null)}
                />
            )}
        </div>
    );
};

export default SearchPage;
