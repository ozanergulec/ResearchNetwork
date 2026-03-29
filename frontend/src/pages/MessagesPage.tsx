import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { HomeProfileSidebar } from '../components/feed';
import PublicationDetailModal from '../components/feed/PublicationDetailModal';
import { messageApi, type ConversationData, type MessageData } from '../services/messageService';
import { usersApi } from '../services/userService';
import { publicationsApi, type Publication, type UserSummary } from '../services/publicationService';
import { searchApi } from '../services/searchService';
import { API_SERVER_URL } from '../services/apiClient';
import { useTranslation } from '../translations/translations';
import '../styles/pages/MessagesPage.css';

const MessagesPage: React.FC = () => {
    const navigate = useNavigate();
    const t = useTranslation();
    const [searchParams] = useSearchParams();

    const [conversations, setConversations] = useState<ConversationData[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<MessageData[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // New chat modal
    const [showNewChat, setShowNewChat] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [baseContacts, setBaseContacts] = useState<UserSummary[]>([]);
    const [contacts, setContacts] = useState<UserSummary[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);

    useEffect(() => {
        if (!showNewChat) return;

        const trimmed = contactSearch.trim();
        if (!trimmed) {
            setContacts(baseContacts);
            return;
        }

        // Hemen lokal filtreleme yap (İlk harf girildiğinde "bulunamadı" dememesi için)
        const localMatches = baseContacts.filter(u =>
            u.fullName.toLowerCase().includes(trimmed.toLowerCase()) ||
            (u.institution ?? '').toLowerCase().includes(trimmed.toLowerCase()) ||
            (u.title ?? '').toLowerCase().includes(trimmed.toLowerCase())
        );

        // Kullanıcı yazarken hemen lokal sonuçları göster
        setContacts(localMatches);

        const timer = setTimeout(async () => {
            setLoadingContacts(true);
            try {
                const res = await searchApi.searchUsers(trimmed, 1, 8); // 8 kişi limiti
                
                const apiResults = res.data.items;
                // Lokal sonuçlar ile API'yi birleştir (Mükerrerleri engelle)
                const seen = new Set<string>();
                const merged = [...localMatches, ...apiResults].filter(u => {
                    if (seen.has(u.id)) return false;
                    seen.add(u.id);
                    return true;
                });
                
                setContacts(merged);
            } catch (err) {
                console.error('Failed to search users', err);
            } finally {
                setLoadingContacts(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [contactSearch, showNewChat, baseContacts]);

    // Publication attach picker
    const [showAttachPicker, setShowAttachPicker] = useState(false);
    const [attachTab, setAttachTab] = useState<'mine' | 'theirs'>('mine');
    const [attachSearch, setAttachSearch] = useState('');
    const [myPublications, setMyPublications] = useState<Publication[]>([]);
    const [theirPublications, setTheirPublications] = useState<Publication[]>([]);
    const [loadingPubs, setLoadingPubs] = useState(false);
    const [attachedPublication, setAttachedPublication] = useState<Publication | null>(null);

    // Publication detail modal (click on card in chat)
    const [modalPublication, setModalPublication] = useState<Publication | null>(null);
    const [loadingModal, setLoadingModal] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const attachPickerRef = useRef<HTMLDivElement>(null);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchConversations();

        const initUserId = searchParams.get('userId');
        if (initUserId) {
            setSelectedUserId(initUserId);
        }
    }, []);

    useEffect(() => {
        if (selectedUserId) {
            fetchMessages(selectedUserId);
            startPolling(selectedUserId);
        }
        return () => stopPolling();
    }, [selectedUserId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async () => {
        try {
            const res = await messageApi.getConversations();
            setConversations(res.data);
        } catch (err) {
            console.error('Failed to fetch conversations', err);
        } finally {
            setLoadingConversations(false);
        }
    };

    const fetchMessages = useCallback(async (userId: string) => {
        setLoadingMessages(true);
        setCurrentPage(1);
        try {
            const res = await messageApi.getConversation(userId, 1, 30);
            setMessages(res.data.items);
            setHasMore(res.data.hasMore);
            setConversations(prev =>
                prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c)
            );
        } catch (err) {
            console.error('Failed to fetch messages', err);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    const loadOlderMessages = async () => {
        if (!selectedUserId || loadingOlder || !hasMore) return;
        setLoadingOlder(true);
        const nextPage = currentPage + 1;

        const container = chatContainerRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;

        try {
            const res = await messageApi.getConversation(selectedUserId, nextPage, 30);
            setMessages(prev => [...res.data.items, ...prev]);
            setCurrentPage(nextPage);
            setHasMore(res.data.hasMore);

            requestAnimationFrame(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight - prevScrollHeight;
                }
            });
        } catch (err) {
            console.error('Failed to load older messages', err);
        } finally {
            setLoadingOlder(false);
        }
    };

    const pollMessages = useCallback(async (userId: string) => {
        try {
            const res = await messageApi.getConversation(userId, 1, 30);
            const latestItems = res.data.items;
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newMsgs = latestItems.filter(m => !existingIds.has(m.id));
                if (newMsgs.length === 0) return prev;
                return [...prev, ...newMsgs];
            });
            fetchConversations();
        } catch {
            // Silently fail
        }
    }, []);

    const startPolling = (userId: string) => {
        stopPolling();
        pollingRef.current = setInterval(() => pollMessages(userId), 5000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const handleSelectConversation = (userId: string) => {
        setSelectedUserId(userId);
    };

    const openNewChat = async () => {
        setShowNewChat(true);
        setContactSearch('');
        setLoadingContacts(true);
        try {
            const [followersRes, followingRes] = await Promise.all([
                usersApi.getFollowers(currentUser.id),
                usersApi.getFollowing(currentUser.id),
            ]);
            // Merge and deduplicate
            const all = [...followersRes.data, ...followingRes.data];
            const seen = new Set<string>();
            const unique = all.filter(u => {
                if (seen.has(u.id)) return false;
                seen.add(u.id);
                return true;
            });
            setBaseContacts(unique);
            setContacts(unique);
        } catch (err) {
            console.error('Failed to load contacts', err);
        } finally {
            setLoadingContacts(false);
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    };

    const closeNewChat = () => {
        setShowNewChat(false);
        setContactSearch('');
    };

    const handleStartChat = (userId: string) => {
        closeNewChat();
        setSelectedUserId(userId);
    };

    // Attach picker
    const openAttachPicker = async () => {
        if (!selectedUserId) return;
        setShowAttachPicker(true);
        setAttachSearch('');
        setAttachTab('mine');
        setLoadingPubs(true);
        try {
            const [myRes, theirRes] = await Promise.all([
                publicationsApi.getByAuthor(currentUser.id, 1, 50),
                publicationsApi.getByAuthor(selectedUserId, 1, 50),
            ]);
            setMyPublications(myRes.data.items);
            setTheirPublications(theirRes.data.items);
        } catch (err) {
            console.error('Failed to load publications', err);
        } finally {
            setLoadingPubs(false);
        }
    };

    const closeAttachPicker = () => {
        setShowAttachPicker(false);
        setAttachSearch('');
    };

    const handleSelectPublication = (pub: Publication) => {
        setAttachedPublication(pub);
        closeAttachPicker();
        textareaRef.current?.focus();
    };

    const openPublicationModal = async (pubId: string) => {
        setLoadingModal(true);
        try {
            const res = await publicationsApi.getById(pubId);
            setModalPublication(res.data);
        } catch (err) {
            console.error('Failed to load publication', err);
        } finally {
            setLoadingModal(false);
        }
    };

    const activePubs = (attachTab === 'mine' ? myPublications : theirPublications).filter(p =>
        p.title.toLowerCase().includes(attachSearch.toLowerCase()) ||
        (p.abstract ?? '').toLowerCase().includes(attachSearch.toLowerCase())
    );

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && !attachedPublication) || !selectedUserId || sending) return;

        const content = newMessage.trim();
        const pubId = attachedPublication?.id;
        setNewMessage('');
        setAttachedPublication(null);
        setSending(true);

        try {
            const res = await messageApi.sendMessage(selectedUserId, content, pubId);
            setMessages(prev => [...prev, res.data]);
            fetchConversations();
        } catch (err) {
            console.error('Failed to send message', err);
            setNewMessage(content);
        } finally {
            setSending(false);
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const getImageUrl = (url?: string | null) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_SERVER_URL}${url}`;
    };

    const getInitials = (name: string) =>
        name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

    const formatTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return t.messages.justNow;
        if (diffMin < 60) return `${diffMin}${t.messages.minutesAgo}`;
        if (diffHour < 24) return `${diffHour}${t.messages.hoursAgo}`;
        if (diffDay < 7) return `${diffDay}${t.messages.daysAgo}`;
        return date.toLocaleDateString();
    };

    const formatMessageTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
            date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const selectedConversation = conversations.find(c => c.userId === selectedUserId);

    return (
        <>
        <div className="messages-page">
            <Navbar currentPage="messages" />
            <div className="messages-layout">
                <div className="messages-sidebar">
                    <HomeProfileSidebar />
                </div>

                <div className="messages-container">
                    {/* Conversation list */}
                    <div className="conv-list-panel">
                        <div className="conv-list-header">
                            <h2 className="conv-list-title">{t.messages.title}</h2>
                            <button className="new-chat-btn" onClick={openNewChat} title={t.messages.newChat}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    <line x1="12" y1="8" x2="12" y2="14"/>
                                    <line x1="9" y1="11" x2="15" y2="11"/>
                                </svg>
                            </button>
                        </div>

                        {loadingConversations ? (
                            <div className="conv-loading">
                                <div className="conv-spinner" />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="conv-empty">
                                <span className="conv-empty-icon">💬</span>
                                <p>{t.messages.noConversations}</p>
                                <span className="conv-empty-hint">{t.messages.noConversationsHint}</span>
                            </div>
                        ) : (
                            <div className="conv-list">
                                {conversations.map(conv => (
                                    <div
                                        key={conv.userId}
                                        className={`conv-item ${selectedUserId === conv.userId ? 'active' : ''} ${conv.unreadCount > 0 ? 'has-unread' : ''}`}
                                        onClick={() => handleSelectConversation(conv.userId)}
                                    >
                                        <div className="conv-avatar-wrap">
                                            {conv.userProfileImageUrl ? (
                                                <img
                                                    src={getImageUrl(conv.userProfileImageUrl)!}
                                                    alt={conv.userName}
                                                    className="conv-avatar"
                                                />
                                            ) : (
                                                <div className="conv-avatar-placeholder">
                                                    {getInitials(conv.userName)}
                                                </div>
                                            )}
                                            {conv.unreadCount > 0 && (
                                                <span className="conv-unread-badge">
                                                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="conv-info">
                                            <div className="conv-info-top">
                                                <span className="conv-name">
                                                    {conv.userName}
                                                    {conv.userIsVerified && <span className="conv-verified">✓</span>}
                                                </span>
                                                <span className="conv-time">{formatTime(conv.lastMessageAt)}</span>
                                            </div>
                                            <span className={`conv-last-msg ${conv.unreadCount > 0 ? 'unread' : ''}`}>
                                                {conv.lastMessage.length > 45
                                                    ? conv.lastMessage.slice(0, 45) + '...'
                                                    : conv.lastMessage}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Chat panel */}
                    <div className="chat-panel">
                        {!selectedUserId ? (
                            <div className="chat-empty-state">
                                <span className="chat-empty-icon">💬</span>
                                <h3>{t.messages.selectConversation}</h3>
                                <p>{t.messages.selectConversationHint}</p>
                            </div>
                        ) : (
                            <>
                                {/* Chat header */}
                                <div className="chat-header">
                                    {selectedConversation ? (
                                        <>
                                            {selectedConversation.userProfileImageUrl ? (
                                                <img
                                                    src={getImageUrl(selectedConversation.userProfileImageUrl)!}
                                                    alt={selectedConversation.userName}
                                                    className="chat-header-avatar"
                                                />
                                            ) : (
                                                <div className="chat-header-avatar-placeholder">
                                                    {getInitials(selectedConversation.userName)}
                                                </div>
                                            )}
                                            <div className="chat-header-info">
                                                <span className="chat-header-name">
                                                    {selectedConversation.userName}
                                                    {selectedConversation.userIsVerified && (
                                                        <span className="chat-header-verified">✓</span>
                                                    )}
                                                </span>
                                                {(selectedConversation.userTitle || selectedConversation.userInstitution) && (
                                                    <span className="chat-header-meta">
                                                        {[selectedConversation.userTitle, selectedConversation.userInstitution]
                                                            .filter(Boolean).join(' · ')}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                className="chat-profile-btn"
                                                onClick={() => navigate(`/profile/${selectedUserId}`)}
                                            >
                                                {t.messages.viewProfile}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="chat-header-loading" />
                                    )}
                                </div>

                                {/* Messages */}
                                <div className="chat-messages" ref={chatContainerRef}>
                                    {loadingMessages ? (
                                        <div className="chat-loading">
                                            <div className="chat-spinner" />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="chat-no-messages">
                                            <span>👋</span>
                                            <p>{t.messages.startConversation}</p>
                                        </div>
                                    ) : (
                                        <>
                                            {hasMore && (
                                                <div className="chat-load-older">
                                                    <button
                                                        className="chat-load-older-btn"
                                                        onClick={loadOlderMessages}
                                                        disabled={loadingOlder}
                                                    >
                                                        {loadingOlder ? (
                                                            <span className="chat-load-older-spinner" />
                                                        ) : (
                                                            t.messages.loadOlder || 'Load older messages'
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                            {messages.map((msg, idx) => {
                                                const isMine = msg.senderId === currentUser.id;
                                                const prevMsg = messages[idx - 1];
                                                const showDateSep = !prevMsg ||
                                                    new Date(msg.sentAt).toDateString() !==
                                                    new Date(prevMsg.sentAt).toDateString();

                                                return (
                                                    <React.Fragment key={msg.id}>
                                                        {showDateSep && (
                                                            <div className="chat-date-sep">
                                                                <span>{new Date(msg.sentAt).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                                            </div>
                                                        )}
                                                        <div className={`chat-msg-row ${isMine ? 'mine' : 'theirs'}`}>
                                                            {!isMine && (
                                                                <div className="chat-msg-avatar">
                                                                    {selectedConversation?.userProfileImageUrl ? (
                                                                        <img
                                                                            src={getImageUrl(selectedConversation.userProfileImageUrl)!}
                                                                            alt={msg.senderName}
                                                                            className="chat-msg-avatar-img"
                                                                        />
                                                                    ) : (
                                                                        <div className="chat-msg-avatar-placeholder">
                                                                            {getInitials(msg.senderName)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="chat-bubble-wrap">
                                                                {/* Publication card */}
                                                                {msg.attachedPublication && (
                                                                    <div
                                                                        className={`chat-pub-card ${isMine ? 'mine' : 'theirs'} ${loadingModal ? 'loading' : ''}`}
                                                                        onClick={() => openPublicationModal(msg.attachedPublication!.id)}
                                                                    >
                                                                        <div className="chat-pub-card-top">
                                                                            <span className="chat-pub-card-icon">📄</span>
                                                                            <div className="chat-pub-card-info">
                                                                                <span className="chat-pub-card-title">{msg.attachedPublication.title}</span>
                                                                                <span className="chat-pub-card-author">
                                                                                    {msg.attachedPublication.authorName}
                                                                                    {msg.attachedPublication.publishedDate && ` · ${new Date(msg.attachedPublication.publishedDate).getFullYear()}`}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {msg.attachedPublication.abstract && (
                                                                            <p className="chat-pub-card-abstract">
                                                                                {msg.attachedPublication.abstract.length > 120
                                                                                    ? msg.attachedPublication.abstract.slice(0, 120) + '...'
                                                                                    : msg.attachedPublication.abstract}
                                                                            </p>
                                                                        )}
                                                                        <div className="chat-pub-card-stats">
                                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                                {msg.attachedPublication.averageRating > 0 && (
                                                                                    <span>⭐ {msg.attachedPublication.averageRating.toFixed(1)}</span>
                                                                                )}
                                                                                {msg.attachedPublication.citationCount > 0 && (
                                                                                    <span>📚 {msg.attachedPublication.citationCount}</span>
                                                                                )}
                                                                            </div>
                                                                            <span className="chat-pub-card-open-hint">Aç →</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* Text bubble (only if there's content) */}
                                                                {msg.content && (
                                                                    <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                                                                        {msg.content}
                                                                    </div>
                                                                )}
                                                                <span className="chat-msg-time">
                                                                    {formatMessageTime(msg.sentAt)}
                                                                    {isMine && (
                                                                        <span className="chat-read-status">
                                                                            {msg.isRead ? ' ✓✓' : ' ✓'}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </>
                                    )}
                                </div>

                                {/* Input area */}
                                <div className="chat-input-wrapper">
                                    {/* Attached publication preview */}
                                    {attachedPublication && (
                                        <div className="chat-attach-preview">
                                            <div className="chat-attach-preview-icon">📎</div>
                                            <div className="chat-attach-preview-info">
                                                <span className="chat-attach-preview-title">{attachedPublication.title}</span>
                                                <span className="chat-attach-preview-author">{attachedPublication.author.fullName}</span>
                                            </div>
                                            <button
                                                className="chat-attach-preview-remove"
                                                onClick={() => setAttachedPublication(null)}
                                            >×</button>
                                        </div>
                                    )}

                                    <div className="chat-input-area">
                                        {/* Attach button */}
                                        <div className="chat-attach-wrap" ref={attachPickerRef}>
                                            <button
                                                className={`chat-attach-btn ${showAttachPicker ? 'active' : ''}`}
                                                onClick={() => showAttachPicker ? closeAttachPicker() : openAttachPicker()}
                                                title={t.messages.attachPublication}
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                                                </svg>
                                            </button>

                                            {/* Attach picker panel */}
                                            {showAttachPicker && (
                                                <div className="attach-picker-panel">
                                                    <div className="attach-picker-header">
                                                        <span className="attach-picker-title">{t.messages.attachTitle}</span>
                                                        <button className="attach-picker-close" onClick={closeAttachPicker}>×</button>
                                                    </div>

                                                    <div className="attach-picker-tabs">
                                                        <button
                                                            className={`attach-tab ${attachTab === 'mine' ? 'active' : ''}`}
                                                            onClick={() => setAttachTab('mine')}
                                                        >
                                                            {t.messages.myPublications}
                                                        </button>
                                                        <button
                                                            className={`attach-tab ${attachTab === 'theirs' ? 'active' : ''}`}
                                                            onClick={() => setAttachTab('theirs')}
                                                        >
                                                            {selectedConversation?.userName || t.messages.theirPublications}
                                                        </button>
                                                    </div>

                                                    <div className="attach-picker-search-wrap">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="attach-picker-search-icon">
                                                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                                        </svg>
                                                        <input
                                                            type="text"
                                                            className="attach-picker-search"
                                                            placeholder={t.messages.searchPublications}
                                                            value={attachSearch}
                                                            onChange={e => setAttachSearch(e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="attach-picker-list">
                                                        {loadingPubs ? (
                                                            <div className="attach-picker-loading">
                                                                <div className="attach-picker-spinner" />
                                                            </div>
                                                        ) : activePubs.length === 0 ? (
                                                            <div className="attach-picker-empty">
                                                                <span>{attachTab === 'mine' ? t.messages.noMyPubs : t.messages.noTheirPubs}</span>
                                                            </div>
                                                        ) : activePubs.map(pub => (
                                                            <div
                                                                key={pub.id}
                                                                className="attach-pub-item"
                                                                onClick={() => handleSelectPublication(pub)}
                                                            >
                                                                <div className="attach-pub-icon">📄</div>
                                                                <div className="attach-pub-info">
                                                                    <span className="attach-pub-title">{pub.title}</span>
                                                                    <span className="attach-pub-meta">
                                                                        {pub.author.fullName}
                                                                        {pub.publishedDate && ` · ${new Date(pub.publishedDate).getFullYear()}`}
                                                                        {pub.averageRating > 0 && ` · ⭐ ${pub.averageRating.toFixed(1)}`}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <textarea
                                            ref={textareaRef}
                                            className="chat-input"
                                            placeholder={attachedPublication ? t.messages.addComment : t.messages.inputPlaceholder}
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            rows={1}
                                            maxLength={2000}
                                        />
                                        <button
                                            className={`chat-send-btn ${(!newMessage.trim() && !attachedPublication) || sending ? 'disabled' : ''}`}
                                            onClick={handleSendMessage}
                                            disabled={(!newMessage.trim() && !attachedPublication) || sending}
                                        >
                                            {sending ? (
                                                <span className="chat-send-spinner" />
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="22" y1="2" x2="11" y2="13" />
                                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* New Chat Modal */}
        {showNewChat && (
            <div className="new-chat-overlay" onClick={closeNewChat}>
                <div className="new-chat-modal" onClick={e => e.stopPropagation()}>
                    <div className="new-chat-modal-header">
                        <h3 className="new-chat-modal-title">{t.messages.newChat}</h3>
                        <button className="new-chat-modal-close" onClick={closeNewChat}>×</button>
                    </div>

                    <div className="new-chat-search-wrap">
                        <svg className="new-chat-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="new-chat-search-input"
                            placeholder={t.messages.searchContacts}
                            value={contactSearch}
                            onChange={e => setContactSearch(e.target.value)}
                        />
                        {contactSearch && (
                            <button className="new-chat-search-clear" onClick={() => setContactSearch('')}>×</button>
                        )}
                    </div>

                    <div className="new-chat-contacts">
                        {loadingContacts ? (
                            <div className="new-chat-loading">
                                <div className="new-chat-spinner" />
                                <span>{t.messages.loadingContacts}</span>
                            </div>
                        ) : contacts.length === 0 ? (
                            <div className="new-chat-no-contacts">
                                <span>🔍</span>
                                <p>{contactSearch ? t.messages.noContactsFound : t.messages.noContacts}</p>
                                {!contactSearch && <span className="new-chat-no-hint">{t.messages.noContactsHint}</span>}
                            </div>
                        ) : (
                            <>
                                {!contactSearch && (
                                    <p className="new-chat-section-label">{t.messages.contactsSectionLabel}</p>
                                )}
                                {contacts.map(user => (
                                    <div
                                        key={user.id}
                                        className="new-chat-contact-item"
                                        onClick={() => handleStartChat(user.id)}
                                    >
                                        <div className="new-chat-contact-avatar-wrap">
                                            {user.profileImageUrl ? (
                                                <img
                                                    src={getImageUrl(user.profileImageUrl)!}
                                                    alt={user.fullName}
                                                    className="new-chat-contact-avatar"
                                                />
                                            ) : (
                                                <div className="new-chat-contact-avatar-placeholder">
                                                    {getInitials(user.fullName)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="new-chat-contact-info">
                                            <span className="new-chat-contact-name">
                                                {user.fullName}
                                                {user.isVerified && <span className="new-chat-contact-verified">✓</span>}
                                            </span>
                                            {(user.title || user.institution) && (
                                                <span className="new-chat-contact-meta">
                                                    {[user.title, user.institution].filter(Boolean).join(' · ')}
                                                </span>
                                            )}
                                        </div>
                                        <span className="new-chat-contact-arrow">→</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Publication detail modal */}
        {loadingModal && (
            <div className="pub-modal-loading-overlay">
                <div className="pub-modal-loading-spinner" />
            </div>
        )}
        {modalPublication && (
            <PublicationDetailModal
                publication={modalPublication}
                onClose={() => setModalPublication(null)}
            />
        )}
        </>
    );
};

export default MessagesPage;
