import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchApi } from '../services/searchService';
import { Navbar } from '../components';
import type { UserSummary, Publication } from '../services/publicationService';
import PublicationDetailModal from '../components/feed/PublicationDetailModal';
import {
    SearchUserCard,
    SearchPublicationCard,
    SearchPagination,
    SearchFilters,
} from '../components/search';
import type { FilterState } from '../components/search';
import { useTranslation } from '../translations/translations';
import '../styles/pages/SearchPage.css';

type TabType = 'users' | 'publications' | 'tags';
type SortByType = 'default' | 'newest' | 'oldest' | 'rating' | 'cited';

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
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalPublications, setTotalPublications] = useState(0);
    const [totalTagUsers, setTotalTagUsers] = useState(0);
    const [totalTagPublications, setTotalTagPublications] = useState(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Filter state
    const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
    const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState<SortByType>('default');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    const resetFilters = useCallback(() => {
        setSelectedInstitutions([]);
        setSelectedTitles([]);
        setSelectedTags([]);
        setMinRating(0);
        setSortBy('default');
    }, []);

    const performSearch = useCallback(async (searchQuery: string, page: number = 1, fetchAll: boolean = true, targetTab?: TabType) => {
        if (searchQuery.trim().length < 2) {
            setUsers([]);
            setPublications([]);
            setTagUsers([]);
            setTagPublications([]);
            setTotalUsers(0);
            setTotalPublications(0);
            setTotalTagUsers(0);
            setTotalTagPublications(0);
            setSearched(false);
            return;
        }

        setLoading(true);
        try {
            const currentTab = targetTab || activeTab;

            if (fetchAll) {
                const [usersRes, pubsRes, tagRes] = await Promise.all([
                    searchApi.searchUsers(searchQuery, 1, ITEMS_PER_PAGE),
                    searchApi.searchPublications(searchQuery, 1, ITEMS_PER_PAGE),
                    searchApi.searchByTag(searchQuery, 1, ITEMS_PER_PAGE),
                ]);

                setUsers(usersRes.data.items || []);
                setTotalUsers(usersRes.data.totalCount || 0);

                setPublications(pubsRes.data.items || []);
                setTotalPublications(pubsRes.data.totalCount || 0);

                setTagPublications(tagRes.data.publications?.items || []);
                setTotalTagPublications(tagRes.data.publications?.totalCount || 0);

                setTagUsers(tagRes.data.users?.items || []);
                setTotalTagUsers(tagRes.data.users?.totalCount || 0);
            } else {
                if (currentTab === 'users') {
                    const res = await searchApi.searchUsers(searchQuery, page, ITEMS_PER_PAGE);
                    setUsers(res.data.items || []);
                    setTotalUsers(res.data.totalCount || 0);
                } else if (currentTab === 'publications') {
                    const res = await searchApi.searchPublications(searchQuery, page, ITEMS_PER_PAGE);
                    setPublications(res.data.items || []);
                    setTotalPublications(res.data.totalCount || 0);
                } else if (currentTab === 'tags') {
                    const res = await searchApi.searchByTag(searchQuery, page, ITEMS_PER_PAGE);
                    setTagPublications(res.data.publications?.items || []);
                    setTotalTagPublications(res.data.publications?.totalCount || 0);
                    setTagUsers(res.data.users?.items || []);
                    setTotalTagUsers(res.data.users?.totalCount || 0);
                }
            }

            setSearched(true);
            setCurrentPage(page);
            if (page === 1 && fetchAll) resetFilters();
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, resetFilters]);

    // Handle q param from navbar "View All" navigation
    const [searchParams] = useSearchParams();
    useEffect(() => {
        const q = searchParams.get('q');
        if (q && q.trim().length >= 2) {
            setQuery(q);
            performSearch(q, 1, true);
        }
    }, [searchParams, performSearch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            performSearch(value, 1, true);
        }, 300);
    };

    const handlePageChange = useCallback((page: number) => {
        performSearch(query, page, false, activeTab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [performSearch, query, activeTab]);

    const handleTabChange = useCallback((tab: TabType) => {
        setActiveTab(tab);
        setCurrentPage(1);
        resetFilters();
        if (searched) {
            performSearch(query, 1, false, tab);
        }
    }, [resetFilters, searched, performSearch, query]);

    const handleUserClick = useCallback((userId: string) => {
        navigate(`/profile/${userId}`);
    }, [navigate]);

    const handleAuthorClick = useCallback((authorId: string) => {
        navigate(`/profile/${authorId}`);
    }, [navigate]);

    const handlePublicationClick = useCallback((pub: Publication) => {
        setSelectedPublication(pub);
    }, []);

    // Filter logic
    const filterUsers = useCallback((userList: UserSummary[]) => {
        let filtered = [...userList];
        if (selectedInstitutions.length > 0) {
            filtered = filtered.filter(u => u.institution && selectedInstitutions.includes(u.institution));
        }
        if (selectedTitles.length > 0) {
            filtered = filtered.filter(u => u.title && selectedTitles.includes(u.title));
        }
        return filtered;
    }, [selectedInstitutions, selectedTitles]);

    const filterPublications = useCallback((pubList: Publication[]) => {
        let filtered = [...pubList];
        if (selectedTags.length > 0) {
            filtered = filtered.filter(p => p.tags && p.tags.some(tag => selectedTags.includes(tag)));
        }
        if (minRating > 0) {
            filtered = filtered.filter(p => p.averageRating >= minRating);
        }
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
    }, [selectedTags, minRating, sortBy]);

    const filteredUsers = useMemo(() => filterUsers(users), [filterUsers, users]);
    const filteredPublications = useMemo(() => filterPublications(publications), [filterPublications, publications]);
    const filteredTagPublications = useMemo(() => filterPublications(tagPublications), [filterPublications, tagPublications]);

    const filterState: FilterState = useMemo(() => ({
        selectedInstitutions,
        selectedTitles,
        selectedTags,
        minRating,
        sortBy,
    }), [selectedInstitutions, selectedTitles, selectedTags, minRating, sortBy]);

    const hasActiveFilters = selectedInstitutions.length > 0 || selectedTitles.length > 0 || selectedTags.length > 0 || minRating > 0 || sortBy !== 'default';

    const handlePageReset = useCallback(() => setCurrentPage(1), []);

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
                        {searched && <span className="search-tab-count">{totalUsers}</span>}
                    </button>
                    <button
                        className={`search-tab ${activeTab === 'publications' ? 'active' : ''}`}
                        onClick={() => handleTabChange('publications')}
                    >
                        {t.search.publications}
                        {searched && <span className="search-tab-count">{totalPublications}</span>}
                    </button>
                    <button
                        className={`search-tab ${activeTab === 'tags' ? 'active' : ''}`}
                        onClick={() => handleTabChange('tags')}
                    >
                        {t.search.tags}
                        {searched && <span className="search-tab-count">{totalTagPublications + totalTagUsers}</span>}
                    </button>
                </div>

                {/* Filters */}
                {searched && (
                    <SearchFilters
                        activeTab={activeTab}
                        filters={filterState}
                        users={users}
                        tagUsers={tagUsers}
                        publications={publications}
                        tagPublications={tagPublications}
                        onInstitutionsChange={setSelectedInstitutions}
                        onTitlesChange={setSelectedTitles}
                        onTagsChange={setSelectedTags}
                        onMinRatingChange={setMinRating}
                        onSortByChange={setSortBy}
                        onResetFilters={resetFilters}
                        onPageReset={handlePageReset}
                    />
                )}

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
                                        {filteredUsers.map(user => (
                                            <SearchUserCard
                                                key={user.id}
                                                user={user}
                                                onClick={handleUserClick}
                                            />
                                        ))}
                                        <SearchPagination
                                            currentPage={currentPage}
                                            totalItems={totalUsers}
                                            itemsPerPage={ITEMS_PER_PAGE}
                                            onPageChange={handlePageChange}
                                        />
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
                                        {filteredPublications.map(pub => (
                                            <SearchPublicationCard
                                                key={pub.id}
                                                publication={pub}
                                                onPublicationClick={handlePublicationClick}
                                                onAuthorClick={handleAuthorClick}
                                            />
                                        ))}
                                        <SearchPagination
                                            currentPage={currentPage}
                                            totalItems={totalPublications}
                                            itemsPerPage={ITEMS_PER_PAGE}
                                            onPageChange={handlePageChange}
                                        />
                                    </>
                                )}
                            </>
                        )}

                        {/* Tags Tab */}
                        {activeTab === 'tags' && (
                            <>
                                {totalTagPublications + totalTagUsers === 0 ? (
                                    <div className="search-empty">
                                        <div className="search-empty-icon">{t.search.noTagsFound}</div>
                                        <h3>{t.search.noTagsFound}</h3>
                                        <p>{t.search.tryDifferentTag}</p>
                                    </div>
                                ) : (
                                    <>
                                        {filteredTagPublications.length > 0 && (
                                            <div className="search-tag-section">
                                                {filteredTagPublications.map(pub => (
                                                    <SearchPublicationCard
                                                        key={pub.id}
                                                        publication={pub}
                                                        onPublicationClick={handlePublicationClick}
                                                        onAuthorClick={handleAuthorClick}
                                                    />
                                                ))}
                                                <SearchPagination
                                                    currentPage={currentPage}
                                                    totalItems={totalTagPublications}
                                                    itemsPerPage={ITEMS_PER_PAGE}
                                                    onPageChange={handlePageChange}
                                                />
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
