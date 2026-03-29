import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { messageApi, type ConversationData, type MessageData } from '../../services/messageService';
import { publicationsApi, type Publication, type UserSummary } from '../../services/publicationService';
import { usersApi } from '../../services/userService';
import { searchApi } from '../../services/searchService';
import { API_SERVER_URL } from '../../services/apiClient';
import PublicationDetailModal from '../feed/PublicationDetailModal';
import './FloatingChat.css';

const FloatingChat: React.FC = () => {
    const location = useLocation();

    const [isMainExpanded, setIsMainExpanded] = useState(false);
    const [conversations, setConversations] = useState<ConversationData[]>([]);
    const [totalUnread, setTotalUnread] = useState(0);

    const [activeChatUser, setActiveChatUser] = useState<ConversationData | null>(null);
    const [isActiveExpanded, setIsActiveExpanded] = useState(false);
    const [messages, setMessages] = useState<MessageData[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);

    // New Chat
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

    const activeChatUserRef = useRef<ConversationData | null>(activeChatUser);
    const isActiveExpandedRef = useRef(isActiveExpanded);
    useEffect(() => {
        activeChatUserRef.current = activeChatUser;
        isActiveExpandedRef.current = isActiveExpanded;
    }, [activeChatUser, isActiveExpanded]);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    // Do not show on auth pages or if not logged in
    const isAuthPage = ['/login', '/register', '/forgot-password', '/verify-email'].some(path => location.pathname.startsWith(path));
    // Optionally don't show on the main messages page if you want to avoid redundancy.
    const isMessagesPage = location.pathname.startsWith('/messages');

    useEffect(() => {
        if (!token || isAuthPage || isMessagesPage) {
            stopPolling();
            return;
        }

        fetchConversations();
        startPolling();

        return () => stopPolling();
    }, [token, isAuthPage, isMessagesPage]);

    useEffect(() => {
        if (activeChatUser && isActiveExpanded) {
            fetchMessages(activeChatUser.userId);
            scrollToBottom();
        }
    }, [activeChatUser, isActiveExpanded]);

    useEffect(() => {
        if (isActiveExpanded) {
            scrollToBottom();
        }
    }, [messages, isActiveExpanded]);

    const startPolling = () => {
        stopPolling();
        pollingRef.current = setInterval(() => {
            fetchConversations();
            if (activeChatUserRef.current && isActiveExpandedRef.current) {
                pollActiveMessages(activeChatUserRef.current.userId);
            }
        }, 5000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const fetchConversations = async () => {
        try {
            const res = await messageApi.getConversations();
            setConversations(res.data);
            const unread = res.data.reduce((acc, curr) => acc + curr.unreadCount, 0);
            setTotalUnread(unread);

            // Update active user data if needed
            const currentActive = activeChatUserRef.current;
            if (currentActive) {
                const updatedActive = res.data.find(c => c.userId === currentActive.userId);
                if (updatedActive) {
                    setActiveChatUser(updatedActive);
                }
            }
        } catch (err) {
            // silent fail for polling
        }
    };

    const fetchMessages = async (userId: string) => {
        try {
            const res = await messageApi.getConversation(userId, 1, 30);
            setMessages(res.data.items);
            // reset unread for this user locally
            setConversations(prev =>
                prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c)
            );
        } catch (err) {
            console.error('Failed to fetch messages', err);
        }
    };

    const pollActiveMessages = async (userId: string) => {
        try {
            const res = await messageApi.getConversation(userId, 1, 30);
            const latestItems = res.data.items;
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newMsgs = latestItems.filter(m => !existingIds.has(m.id));
                if (newMsgs.length === 0) return prev;
                return [...prev, ...newMsgs];
            });
        } catch {
            // silent fail
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    const handleSelectConversation = (conv: ConversationData) => {
        setActiveChatUser(conv);
        setIsActiveExpanded(true);
        setIsMainExpanded(false); // Optionally close main list when opening a chat
    };

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && !attachedPublication) || !activeChatUser || sending) return;

        const content = newMessage.trim();
        const pubId = attachedPublication?.id;
        setNewMessage('');
        setAttachedPublication(null);
        setSending(true);

        try {
            const res = await messageApi.sendMessage(activeChatUser.userId, content, pubId);
            setMessages(prev => [...prev, res.data]);
            fetchConversations();
            scrollToBottom();
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

    const openNewChat = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowNewChat(true);
        setContactSearch('');
        setLoadingContacts(true);
        try {
            const [followersRes, followingRes] = await Promise.all([
                usersApi.getFollowers(currentUser.id),
                usersApi.getFollowing(currentUser.id),
            ]);
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

    const closeNewChat = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setShowNewChat(false);
        setContactSearch('');
    };

    const handleStartChat = (user: UserSummary) => {
        closeNewChat();
        const dummyConv: ConversationData = {
            userId: user.id,
            userName: user.fullName,
            userProfileImageUrl: user.profileImageUrl || null,
            userIsVerified: user.isVerified || false,
            userTitle: user.title || null,
            userInstitution: user.institution || null,
            lastMessage: '',
            lastMessageAt: new Date().toISOString(),
            unreadCount: 0
        };
        handleSelectConversation(dummyConv);
    };

    const openAttachPicker = async () => {
        if (!activeChatUser) return;
        setShowAttachPicker(true);
        setAttachSearch('');
        setAttachTab('mine');
        setLoadingPubs(true);
        try {
            const [myRes, theirRes] = await Promise.all([
                publicationsApi.getByAuthor(currentUser.id, 1, 50),
                publicationsApi.getByAuthor(activeChatUser.userId, 1, 50),
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

        if (diffMin < 1) return '0m';
        if (diffMin < 60) return `${diffMin}m`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (!token || isAuthPage || isMessagesPage) return null;

    // Single pane logic:
    // If activeChatUser is set, we show the chat view.
    // Otherwise, we show the list view.
    const isShowingChat = activeChatUser !== null;
    const isExpanded = isShowingChat ? isActiveExpanded : isMainExpanded;

    const toggleWindow = () => {
        if (isShowingChat) {
            setIsActiveExpanded(!isActiveExpanded);
        } else {
            setIsMainExpanded(!isMainExpanded);
        }
    };

    return (
        <div className="floating-chat-wrapper single-pane">
            <div className={`floating-window fc-main-window ${isExpanded ? 'expanded' : 'collapsed'}`}>
                
                {/* --- CHAT VIEW --- */}
                {isShowingChat ? (
                    <>
                        <div className="fc-header" onClick={toggleWindow}>
                            <div className="fc-header-left">
                                <button
                                    className="fc-back-btn" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveChatUser(null);
                                        // Once we go back, ensure the main list stays expanded
                                        setIsMainExpanded(true);
                                    }}
                                    title="Geri Dön"
                                >
                                    &#8592;
                                </button>
                                <div className="fc-header-avatar-wrap">
                                    {activeChatUser.userProfileImageUrl ? (
                                        <img
                                            src={getImageUrl(activeChatUser.userProfileImageUrl)!}
                                            alt={activeChatUser.userName}
                                            className="fc-header-avatar"
                                        />
                                    ) : (
                                        <div className="fc-header-avatar-placeholder">
                                            {getInitials(activeChatUser.userName)}
                                        </div>
                                    )}
                                </div>
                                <span className="fc-header-name">{activeChatUser.userName}</span>
                            </div>
                            <div className="fc-header-right">
                                <span className="fc-header-icon">{isExpanded ? '▼' : '▲'}</span>
                                <button 
                                    className="fc-icon-btn" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveChatUser(null);
                                        setIsMainExpanded(false);
                                    }}
                                    title="Kapat"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="fc-content">
                                <div className="fc-messages-area">
                                    {messages.map(msg => {
                                        const isMine = msg.senderId === currentUser.id;
                                        return (
                                            <div key={msg.id} className={`fc-msg-row ${isMine ? 'mine' : 'theirs'}`}>
                                                {!isMine && (
                                                    <div className="fc-conv-avatar-wrap">
                                                        {activeChatUser.userProfileImageUrl ? (
                                                            <img
                                                                src={getImageUrl(activeChatUser.userProfileImageUrl)!}
                                                                alt={msg.senderName}
                                                                className="fc-conv-avatar-small"
                                                            />
                                                        ) : (
                                                            <div className="fc-header-avatar-placeholder">
                                                                {getInitials(msg.senderName)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    {msg.attachedPublication && (
                                                        <div className="fc-pub-card" onClick={() => openPublicationModal(msg.attachedPublication!.id)}>
                                                            <span className="fc-pub-card-title">{msg.attachedPublication.title}</span>
                                                            <span className="fc-pub-card-author">{msg.attachedPublication.authorName}</span>
                                                        </div>
                                                    )}
                                                    {msg.content && (
                                                        <div className="fc-bubble">
                                                            {msg.content}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="fc-input-wrapper">
                                    {attachedPublication && (
                                        <div className="fc-attach-preview">
                                            <span style={{ fontSize: 12 }}>📎 {attachedPublication.title}</span>
                                            <button className="fc-attach-preview-remove" onClick={() => setAttachedPublication(null)}>×</button>
                                        </div>
                                    )}
                                    <div className="fc-input-area">
                                        <div className="fc-attach-wrap" ref={attachPickerRef}>
                                            <button 
                                                className={`fc-attach-btn ${showAttachPicker ? 'active' : ''}`} 
                                                onClick={() => showAttachPicker ? closeAttachPicker() : openAttachPicker()}
                                                title="Makale Ekle"
                                            >
                                                📎
                                            </button>
                                            
                                            {showAttachPicker && (
                                                <div className="fc-attach-picker-panel">
                                                    <div className="fc-attach-picker-header">
                                                        <span className="fc-attach-picker-title">Makale Seç</span>
                                                        <button className="fc-attach-picker-close" onClick={closeAttachPicker}>×</button>
                                                    </div>
                                                    <div className="fc-attach-picker-tabs">
                                                        <button className={`fc-attach-tab ${attachTab === 'mine' ? 'active' : ''}`} onClick={() => setAttachTab('mine')}>Benim</button>
                                                        <button className={`fc-attach-tab ${attachTab === 'theirs' ? 'active' : ''}`} onClick={() => setAttachTab('theirs')}>Onun</button>
                                                    </div>
                                                    <div className="fc-attach-picker-search-wrap">
                                                        <input type="text" className="fc-attach-picker-search" placeholder="Makalelerde ara..." value={attachSearch} onChange={e => setAttachSearch(e.target.value)} />
                                                    </div>
                                                    <div className="fc-attach-picker-list">
                                                        {loadingPubs ? (
                                                            <div className="fc-spinner" style={{ margin: '10px auto' }} />
                                                        ) : activePubs.length === 0 ? (
                                                            <div className="fc-empty-state" style={{ padding: 10, fontSize: 13 }}>Makale bulunamadı.</div>
                                                        ) : activePubs.map(pub => (
                                                            <div key={pub.id} className="fc-attach-pub-item" onClick={() => handleSelectPublication(pub)}>
                                                                <span className="fc-attach-pub-title">📄 {pub.title}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <textarea
                                            ref={textareaRef}
                                            className="fc-input"
                                            placeholder={attachedPublication ? "Açıklama ekle..." : "Mesaj yazın..."}
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            rows={1}
                                        />
                                        <button
                                            className="fc-send-btn"
                                            onClick={handleSendMessage}
                                            disabled={(!newMessage.trim() && !attachedPublication) || sending}
                                        >
                                            {sending ? (
                                                <div className="fc-spinner" style={{ margin: 0, width: 16, height: 16 }} />
                                            ) : (
                                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="22" y1="2" x2="11" y2="13" />
                                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* --- LIST VIEW --- */
                    <>
                        {showNewChat ? (
                            <>
                                <div className="fc-header" onClick={() => setIsMainExpanded(!isMainExpanded)}>
                                    <div className="fc-header-left">
                                        <button className="fc-back-btn" onClick={closeNewChat} title="Geri">
                                            &#8592;
                                        </button>
                                        <span className="fc-header-name">Kişiler</span>
                                    </div>
                                    <div className="fc-header-right">
                                        <span className="fc-header-icon">{isExpanded ? '▼' : '▲'}</span>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="fc-content">
                                        <div className="fc-search-wrap">
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                className="fc-search-input"
                                                placeholder="Kişi ara..."
                                                value={contactSearch}
                                                onChange={e => setContactSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="fc-contacts-list">
                                            {loadingContacts ? (
                                                <div className="fc-spinner" />
                                            ) : contacts.length === 0 ? (
                                                <div className="fc-empty-state">Kişi bulunamadı.</div>
                                            ) : (
                                                contacts.map(user => (
                                                    <div key={user.id} className="fc-conv-item" onClick={() => handleStartChat(user)}>
                                                        <div className="fc-conv-avatar-wrap">
                                                            {user.profileImageUrl ? (
                                                                <img src={getImageUrl(user.profileImageUrl)!} alt={user.fullName} className="fc-conv-avatar-small" />
                                                            ) : (
                                                                <div className="fc-header-avatar-placeholder" style={{ width: 28, height: 28, fontSize: 10 }}>
                                                                    {getInitials(user.fullName)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="fc-conv-info">
                                                            <span className="fc-conv-name">{user.fullName}</span>
                                                            {(user.title || user.institution) && (
                                                                <span className="fc-conv-time" style={{display:'block'}}>{[user.title, user.institution].filter(Boolean).join(' · ')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="fc-header" onClick={toggleWindow}>
                                    <div className="fc-header-left">
                                        <div className="fc-header-avatar-wrap">
                                            {currentUser?.profileImageUrl ? (
                                                <img
                                                    src={getImageUrl(currentUser.profileImageUrl)!}
                                                    alt="Me"
                                                    className="fc-header-avatar"
                                                />
                                            ) : (
                                                <div className="fc-header-avatar-placeholder" style={{ backgroundColor: '#ccc', color: '#fff' }}>
                                                    {getInitials(currentUser?.fullName || 'Me')}
                                                </div>
                                            )}
                                        </div>
                                        <span className="fc-header-name">Mesajlaşma</span>
                                        {totalUnread > 0 && !isExpanded && (
                                            <span className="fc-header-badge">{totalUnread}</span>
                                        )}
                                    </div>
                                    <div className="fc-header-right">
                                        <button className="fc-icon-btn" onClick={openNewChat} title="Yeni Sohbet" style={{ width: 24, height: 24, marginRight: 4 }}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--heading-color)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                                <line x1="12" y1="8" x2="12" y2="14"/>
                                                <line x1="9" y1="11" x2="15" y2="11"/>
                                            </svg>
                                        </button>
                                        <span className="fc-header-icon">{isExpanded ? '▼' : '▲'}</span>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="fc-content">
                                        {conversations.length === 0 ? (
                                            <div className="fc-empty-state">
                                                Hiç mesajınız yok.
                                            </div>
                                        ) : (
                                            conversations.map(conv => (
                                                <div
                                                    key={conv.userId}
                                                    className={`fc-conv-item ${conv.unreadCount > 0 ? 'unread' : ''}`}
                                                    onClick={() => handleSelectConversation(conv)}
                                                >
                                                    <div className="fc-conv-avatar-wrap">
                                                        {conv.userProfileImageUrl ? (
                                                            <img
                                                                src={getImageUrl(conv.userProfileImageUrl)!}
                                                                alt={conv.userName}
                                                                className="fc-conv-avatar"
                                                            />
                                                        ) : (
                                                            <div className="fc-conv-avatar-placeholder">
                                                                {getInitials(conv.userName)}
                                                            </div>
                                                        )}
                                                        {conv.unreadCount > 0 && (
                                                            <span className="fc-header-badge fc-abs-badge">
                                                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="fc-conv-info">
                                                        <div className="fc-conv-top">
                                                            <span className="fc-conv-name">{conv.userName}</span>
                                                            <span className="fc-conv-time">{formatTime(conv.lastMessageAt)}</span>
                                                        </div>
                                                        <span className="fc-conv-last-msg">
                                                            {conv.lastMessage}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {loadingModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="fc-spinner" />
                </div>,
                document.body
            )}
            {modalPublication && createPortal(
                <div style={{ position: 'relative', zIndex: 10001 }}>
                    <PublicationDetailModal
                        publication={modalPublication}
                        onClose={() => setModalPublication(null)}
                    />
                </div>,
                document.body
            )}
        </div>
    );
};

export default FloatingChat;
