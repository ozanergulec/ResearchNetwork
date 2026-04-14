import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../../services/searchService';
import { notificationApi } from '../../services/notificationService';
import { messageApi } from '../../services/messageService';
import signalRService from '../../services/signalRService';
import { API_SERVER_URL } from '../../services/apiClient';
import type { UserSummary, Publication } from '../../services/publicationService';
import PublicationDetailModal from '../feed/PublicationDetailModal';
import { useTranslation } from '../../translations/translations';
import '../../styles/common/Navbar.css';

interface NavbarProps {
    currentPage: 'home' | 'search' | 'profile' | 'recommendations' | 'notifications' | 'settings' | 'peer-review' | 'messages' | 'none';
}

const Navbar: React.FC<NavbarProps> = ({ currentPage }) => {
    const navigate = useNavigate();
    const t = useTranslation();
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuBtnRef = useRef<HTMLButtonElement>(null);

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
            setUsers(usersRes.data.items || []);
            setPublications(pubsRes.data.items || []);
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

    // Close search dropdown & hamburger menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
            if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
                menuBtnRef.current && !menuBtnRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch initial unread counts & setup SignalR listeners
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch initial counts via REST (one-time)
        const fetchInitialCounts = async () => {
            try {
                const [notifRes, msgRes] = await Promise.all([
                    notificationApi.getUnreadCount(),
                    messageApi.getUnreadCount(),
                ]);
                setUnreadCount(notifRes.data.count);
                setUnreadMessages(msgRes.data.count);
            } catch {
                // Silently fail
            }
        };
        fetchInitialCounts();

        // Start SignalR connection & register live push listeners
        signalRService.start();

        const handleUnreadCount = (count: number) => setUnreadCount(count);
        const handleMessageUnreadCount = (count: number) => setUnreadMessages(count);

        signalRService.on('UpdateUnreadCount', handleUnreadCount);
        signalRService.on('UpdateMessageUnreadCount', handleMessageUnreadCount);

        return () => {
            signalRService.off('UpdateUnreadCount', handleUnreadCount);
            signalRService.off('UpdateMessageUnreadCount', handleMessageUnreadCount);
        };
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
        setMenuOpen(false);
        navigate(path);
    };

    const handleViewAll = () => {
        setShowDropdown(false);
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
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
                        <span className="navbar-search-icon">&#x2315;</span>
                        <input
                            ref={inputRef}
                            type="text"
                            className="navbar-search-input"
                            placeholder={t.navbar.searchPlaceholder}
                            value={query}
                            onChange={handleInputChange}
                            onFocus={handleFocus}
                        />
                        {showDropdown && (query.trim().length >= 2) && (
                            <div className="navbar-search-dropdown" ref={dropdownRef}>
                                {loading ? (
                                    <div className="nsd-loading">
                                        <div className="nsd-spinner" />
                                        <span>{t.navbar.searching}</span>
                                    </div>
                                ) : !searched ? null : !hasResults ? (
                                    <div className="nsd-empty">{t.navbar.noResults}</div>
                                ) : (
                                    <>
                                        {users.length > 0 && (
                                            <div className="nsd-section">
                                                <div className="nsd-section-title">{t.navbar.people}</div>
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
                                                <div className="nsd-section-title">{t.navbar.publications}</div>
                                                {publications.slice(0, 5).map((pub) => (
                                                    <div
                                                        key={pub.id}
                                                        className="nsd-pub-item"
                                                        onClick={() => handlePublicationClick(pub)}
                                                    >
                                                        <span className="nsd-pub-icon"></span>
                                                        <div className="nsd-pub-info">
                                                            <span className="nsd-pub-title">{pub.title}</span>
                                                            <span className="nsd-pub-author">{pub.author.fullName}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {(users.length > 5 || publications.length > 5) && (
                                            <div className="nsd-view-all" onClick={handleViewAll}>
                                                {t.navbar.viewAll}
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
                        {t.navbar.home}
                    </button>
                    <button
                        onClick={() => navigate('/search')}
                        className={`navbar-button ${currentPage === 'search' ? 'active' : ''}`}
                    >
                        {t.navbar.search}
                    </button>
                    <button
                        onClick={() => navigate('/notifications')}
                        className={`navbar-button navbar-notif-btn ${currentPage === 'notifications' ? 'active' : ''}`}
                    >
                        {t.navbar.notifications}
                        {unreadCount > 0 && (
                            <span className="navbar-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        className={`navbar-button ${currentPage === 'profile' ? 'active' : ''}`}
                    >
                        {t.navbar.profile}
                    </button>

                    {/* Hamburger Menu */}
                    <div className="navbar-menu-wrapper">
                        <button
                            ref={menuBtnRef}
                            className={`navbar-hamburger ${menuOpen ? 'open' : ''}`}
                            onClick={() => setMenuOpen(prev => !prev)}
                            aria-label="More menu"
                        >
                            <span /><span /><span />
                        </button>
                        <div ref={menuRef} className={`navbar-dropdown-menu ${menuOpen ? 'open' : ''}`}>
                            <button
                                onClick={() => { setMenuOpen(false); navigate('/messages'); }}
                                className={`navbar-dropdown-item navbar-dropdown-messages ${currentPage === 'messages' ? 'active' : ''}`}
                            >
                                {t.navbar.messages}
                                {unreadMessages > 0 && (
                                    <span className="navbar-dropdown-badge">
                                        {unreadMessages > 9 ? '9+' : unreadMessages}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => { setMenuOpen(false); navigate('/recommendations'); }}
                                className={`navbar-dropdown-item ${currentPage === 'recommendations' ? 'active' : ''}`}
                            >
                                {t.navbar.recommendations}
                            </button>
                            <button
                                onClick={() => { setMenuOpen(false); navigate('/peer-review'); }}
                                className={`navbar-dropdown-item ${currentPage === 'peer-review' ? 'active' : ''}`}
                            >
                                {t.navbar.peerReview}
                            </button>
                            <button
                                onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                                className={`navbar-dropdown-item ${currentPage === 'settings' ? 'active' : ''}`}
                            >
                                {t.navbar.settings}
                            </button>
                            <div className="navbar-dropdown-divider" />
                            <button
                                onClick={handleLogout}
                                className="navbar-dropdown-item navbar-dropdown-logout"
                            >
                                {t.navbar.logout}
                            </button>
                        </div>
                    </div>
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
