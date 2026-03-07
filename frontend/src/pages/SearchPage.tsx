import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    // Filter state
    const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
    const [selectedTitles, setSelectedTitles] = useState<string[]>([]);

    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState<'default' | 'newest' | 'oldest' | 'rating' | 'cited'>('default');
    const [openFilter, setOpenFilter] = useState<string | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);

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
            resetFilters();
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle q param from navbar "View All" navigation
    const [searchParams] = useSearchParams();
    useEffect(() => {
        const q = searchParams.get('q');
        if (q && q.trim().length >= 2) {
            setQuery(q);
            performSearch(q);
        }
    }, [searchParams, performSearch]);

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
        resetFilters();
    };

    // ===== Filter Logic =====
    const resetFilters = () => {
        setSelectedInstitutions([]);
        setSelectedTitles([]);
        setSelectedTags([]);
        setMinRating(0);
        setSortBy('default');
        setOpenFilter(null);
    };

    const hasActiveFilters = selectedInstitutions.length > 0 || selectedTitles.length > 0 || selectedTags.length > 0 || minRating > 0 || sortBy !== 'default';

    // Close filter dropdown on outside click  
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setOpenFilter(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get unique filter options from search results
    const getUniqueInstitutions = (userList: UserSummary[]) => {
        return [...new Set(userList.map(u => u.institution).filter(Boolean))] as string[];
    };
    const getUniqueTitles = (userList: UserSummary[]) => {
        return [...new Set(userList.map(u => u.title).filter(Boolean))] as string[];
    };
    const getUniqueTags = (pubList: Publication[]) => {
        return [...new Set(pubList.flatMap(p => p.tags || []))];
    };

    // Apply filters to users
    const filterUsers = (userList: UserSummary[]) => {
        let filtered = [...userList];
        if (selectedInstitutions.length > 0) {
            filtered = filtered.filter(u => u.institution && selectedInstitutions.includes(u.institution));
        }
        if (selectedTitles.length > 0) {
            filtered = filtered.filter(u => u.title && selectedTitles.includes(u.title));
        }
        return filtered;
    };

    // Apply filters to publications
    const filterPublications = (pubList: Publication[]) => {
        let filtered = [...pubList];
        if (selectedTags.length > 0) {
            filtered = filtered.filter(p => p.tags && p.tags.some(tag => selectedTags.includes(tag)));
        }
        if (minRating > 0) {
            filtered = filtered.filter(p => p.averageRating >= minRating);
        }
        // Sort
        if (sortBy === 'newest') {
            filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else if (sortBy === 'oldest') {
            filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        } else if (sortBy === 'rating') {
            filtered.sort((a, b) => b.averageRating - a.averageRating);
        } else if (sortBy === 'cited') {
            filtered.sort((a, b) => b.citationCount - a.citationCount);
        }
        return filtered;
    };

    const toggleFilterItem = (_list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
        setCurrentPage(1);
    };

    // Get filtered data
    const filteredUsers = filterUsers(users);
    const filteredPublications = filterPublications(publications);
    const filteredTagUsers = filterUsers(tagUsers);
    const filteredTagPublications = filterPublications(tagPublications);
    const filteredTagTotalCount = filteredTagPublications.length + filteredTagUsers.length;

    // Filter chip dropdown component
    const renderMultiSelect = (id: string, label: string, options: string[], selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
        if (options.length === 0) return null;
        const isOpen = openFilter === id;
        return (
            <div className={`search-filter-chip ${selected.length > 0 ? 'active' : ''} ${isOpen ? 'open' : ''}`}
                onClick={() => setOpenFilter(isOpen ? null : id)}>
                {label}{selected.length > 0 && ` (${selected.length})`}
                <span className="filter-arrow">▼</span>
                {isOpen && (
                    <div className="search-filter-dropdown" onClick={e => e.stopPropagation()}>
                        {options.map(opt => (
                            <div key={opt} className="search-filter-option"
                                onClick={() => toggleFilterItem(selected, setSelected, opt)}>
                                <span className={`search-filter-checkbox ${selected.includes(opt) ? 'checked' : ''}`}>
                                    {selected.includes(opt) && '✓'}
                                </span>
                                {opt}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Render filters bar based on active tab
    const renderFilters = () => {
        if (!searched) return null;

        return (
            <div className="search-filters" ref={filterRef}>
                {(activeTab === 'users' || activeTab === 'tags') && (
                    <>
                        {renderMultiSelect('institution', t.search.filterInstitution,
                            getUniqueInstitutions(activeTab === 'users' ? users : tagUsers),
                            selectedInstitutions, setSelectedInstitutions)}
                        {renderMultiSelect('title', t.search.filterTitle,
                            getUniqueTitles(activeTab === 'users' ? users : tagUsers),
                            selectedTitles, setSelectedTitles)}
                    </>
                )}
                {(activeTab === 'publications' || activeTab === 'tags') && (
                    <>
                        {renderMultiSelect('tags', t.search.filterTags,
                            getUniqueTags(activeTab === 'publications' ? publications : tagPublications),
                            selectedTags, setSelectedTags)}
                        <select className="search-filter-select"
                            value={minRating}
                            onChange={e => { setMinRating(Number(e.target.value)); setCurrentPage(1); }}>
                            <option value={0}>{t.search.filterMinRating}: -</option>
                            {[1, 2, 3, 4, 5].map(n => (
                                <option key={n} value={n}>≥ {n}.0</option>
                            ))}
                        </select>
                        <select className="search-filter-select"
                            value={sortBy}
                            onChange={e => { setSortBy(e.target.value as any); setCurrentPage(1); }}>
                            <option value="default">{t.search.filterSortBy}</option>
                            <option value="newest">{t.search.sortNewest}</option>
                            <option value="oldest">{t.search.sortOldest}</option>
                            <option value="rating">{t.search.sortHighestRating}</option>
                            <option value="cited">{t.search.sortMostCited}</option>
                        </select>
                    </>
                )}
                {hasActiveFilters && (
                    <button className="search-clear-filters" onClick={resetFilters}>
                        ✕ {t.search.clearFilters}
                    </button>
                )}
            </div>
        );
    };

    // Render active filter chips
    const renderActiveFilters = () => {
        if (!hasActiveFilters) return null;
        return (
            <div className="search-active-filters">
                <span className="search-active-filter-label">{t.search.activeFilters}:</span>
                {selectedInstitutions.map(inst => (
                    <span key={inst} className="search-active-filter-chip">
                        {inst}
                        <span className="remove-filter" onClick={() => setSelectedInstitutions(prev => prev.filter(i => i !== inst))}>✕</span>
                    </span>
                ))}
                {selectedTitles.map(title => (
                    <span key={title} className="search-active-filter-chip">
                        {title}
                        <span className="remove-filter" onClick={() => setSelectedTitles(prev => prev.filter(i => i !== title))}>✕</span>
                    </span>
                ))}
                {selectedTags.map(tag => (
                    <span key={tag} className="search-active-filter-chip">
                        {tag}
                        <span className="remove-filter" onClick={() => setSelectedTags(prev => prev.filter(i => i !== tag))}>✕</span>
                    </span>
                ))}
                {minRating > 0 && (
                    <span className="search-active-filter-chip">
                        ≥ {minRating}.0
                        <span className="remove-filter" onClick={() => setMinRating(0)}>✕</span>
                    </span>
                )}
                {sortBy !== 'default' && (
                    <span className="search-active-filter-chip">
                        {sortBy === 'newest' ? t.search.sortNewest : sortBy === 'oldest' ? t.search.sortOldest : sortBy === 'rating' ? t.search.sortHighestRating : t.search.sortMostCited}
                        <span className="remove-filter" onClick={() => setSortBy('default')}>✕</span>
                    </span>
                )}
            </div>
        );
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
                            <span className="search-tab-count">{filteredUsers.length}</span>
                        )}
                    </button>
                    <button
                        className={`search-tab ${activeTab === 'publications' ? 'active' : ''}`}
                        onClick={() => handleTabChange('publications')}
                    >
                        {t.search.publications}
                        {searched && (
                            <span className="search-tab-count">{filteredPublications.length}</span>
                        )}
                    </button>
                    <button
                        className={`search-tab ${activeTab === 'tags' ? 'active' : ''}`}
                        onClick={() => handleTabChange('tags')}
                    >
                        {t.search.tags}
                        {searched && (
                            <span className="search-tab-count">{filteredTagTotalCount}</span>
                        )}
                    </button>
                </div>

                {/* Filters */}
                {renderFilters()}
                {renderActiveFilters()}

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
                                {filteredUsers.length === 0 ? (
                                    <div className="search-empty">
                                        <h3>{hasActiveFilters ? t.search.noFilterResults : t.search.noUsersFound}</h3>
                                        <p>{hasActiveFilters ? t.search.clearFilters : t.search.tryDifferent}</p>
                                    </div>
                                ) : (
                                    <>
                                        {paginate(filteredUsers).map((user) => (
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
                                        {renderPagination(filteredUsers.length)}
                                    </>
                                )}
                            </>
                        )}

                        {/* Publications Tab */}
                        {activeTab === 'publications' && (
                            <>
                                {filteredPublications.length === 0 ? (
                                    <div className="search-empty">
                                        <h3>{hasActiveFilters ? t.search.noFilterResults : t.search.noPubsFound}</h3>
                                        <p>{hasActiveFilters ? t.search.clearFilters : t.search.tryDifferent}</p>
                                    </div>
                                ) : (
                                    <>
                                        {paginate(filteredPublications).map((pub) => (
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
                                        {renderPagination(filteredPublications.length)}
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
                                        {filteredTagPublications.length > 0 && (
                                            <div className="search-tag-section">
                                                {paginate(filteredTagPublications).map((pub) => (
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
                                                {renderPagination(filteredTagPublications.length)}
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
