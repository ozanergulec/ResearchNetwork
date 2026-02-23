import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../../services/searchService';
import { API_SERVER_URL } from '../../services/apiClient';
import type { UserSummary, Publication } from '../../services/publicationService';
import PublicationDetailModal from '../feed/PublicationDetailModal';
import '../../styles/common/Navbar.css';

interface NavbarProps {
    currentPage: 'home' | 'search' | 'profile' | 'recommendations' | 'none';
}

const Navbar: React.FC<NavbarProps> = ({ currentPage }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.trim().length < 2) {
            setUsers([]);
            setPublications([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        try {
            const [usersRes, pubsRes] = await Promise.all([
                searchApi.searchUsers(searchQuery),
                searchApi.searchPublications(searchQuery),
            ]);
            setUsers(usersRes.data);
            setPublications(pubsRes.data);
            setSearched(true);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        setShowDropdown(true);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            performSearch(value);
        }, 300);
    };

    const handleFocus = () => {
        if (query.trim().length >= 2) {
            setShowDropdown(true);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getInitials = (name: string) =>
        name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

    const getImageUrl = (url?: string | null) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_SERVER_URL}${url}`;
    };

    const navigateTo = (path: string) => {
        setShowDropdown(false);
        setQuery('');
        setSearched(false);
        navigate(path);
    };

    const handlePublicationClick = (pub: Publication) => {
        setShowDropdown(false);
        setSelectedPublication(pub);
    };

    const hasResults = users.length > 0 || publications.length > 0;

    return (
        <>
            <nav className="navbar">
                <div className="navbar-search-area">
                    <h2 className="navbar-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
                        Research Network
                    </h2>
                    <div className="navbar-search-container">
                        <span className="navbar-search-icon">🔍</span>
                        <input
                            ref={inputRef}
                            type="text"
                            className="navbar-search-input"
                            placeholder="Search people or publications..."
                            value={query}
                            onChange={handleInputChange}
                            onFocus={handleFocus}
                        />
                        {showDropdown && (query.trim().length >= 2) && (
                            <div className="navbar-search-dropdown" ref={dropdownRef}>
                                {loading ? (
                                    <div className="nsd-loading">
                                        <div className="nsd-spinner" />
                                        <span>Searching...</span>
                                    </div>
                                ) : !searched ? null : !hasResults ? (
                                    <div className="nsd-empty">No results found</div>
                                ) : (
                                    <>
                                        {users.length > 0 && (
                                            <div className="nsd-section">
                                                <div className="nsd-section-title">People</div>
                                                {users.slice(0, 5).map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className="nsd-user-item"
                                                        onClick={() => navigateTo(`/profile/${user.id}`)}
                                                    >
                                                        {user.profileImageUrl ? (
                                                            <img
                                                                src={getImageUrl(user.profileImageUrl)!}
                                                                alt={user.fullName}
                                                                className="nsd-avatar"
                                                            />
                                                        ) : (
                                                            <div className="nsd-avatar-placeholder">
                                                                {getInitials(user.fullName)}
                                                            </div>
                                                        )}
                                                        <div className="nsd-user-info">
                                                            <span className="nsd-user-name">
                                                                {user.fullName}
                                                                {user.isVerified && <span className="nsd-verified">✓</span>}
                                                            </span>
                                                            <span className="nsd-user-meta">
                                                                {[user.title, user.institution].filter(Boolean).join(' • ') || 'User'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {publications.length > 0 && (
                                            <div className="nsd-section">
                                                <div className="nsd-section-title">Publications</div>
                                                {publications.slice(0, 5).map((pub) => (
                                                    <div
                                                        key={pub.id}
                                                        className="nsd-pub-item"
                                                        onClick={() => handlePublicationClick(pub)}
                                                    >
                                                        <span className="nsd-pub-icon">📄</span>
                                                        <div className="nsd-pub-info">
                                                            <span className="nsd-pub-title">{pub.title}</span>
                                                            <span className="nsd-pub-author">{pub.author.fullName}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="navbar-links">
                    <button
                        onClick={() => navigate('/home')}
                        className={`navbar-button ${currentPage === 'home' ? 'active' : ''}`}
                    >
                        Home
                    </button>
                    <button
                        onClick={() => navigate('/search')}
                        className={`navbar-button ${currentPage === 'search' ? 'active' : ''}`}
                    >
                        Search
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        className={`navbar-button ${currentPage === 'profile' ? 'active' : ''}`}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => navigate('/recommendations')}
                        className={`navbar-button ${currentPage === 'recommendations' ? 'active' : ''}`}
                    >
                        Recommendations
                    </button>
                    <button onClick={handleLogout} className="navbar-logout-button">
                        Logout
                    </button>
                </div>
            </nav>

            {/* Publication Detail Modal */}
            {selectedPublication && (
                <PublicationDetailModal
                    publication={selectedPublication}
                    onClose={() => setSelectedPublication(null)}
                />
            )}
        </>
    );
};

export default Navbar;
