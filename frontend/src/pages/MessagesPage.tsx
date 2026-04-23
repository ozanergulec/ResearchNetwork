import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { HomeProfileSidebar } from '../components/feed';
import PublicationDetailModal from '../components/feed/PublicationDetailModal';
import MessagesSidebar from '../components/messages/MessagesSidebar';
import MessagesChatPanel from '../components/messages/MessagesChatPanel';
import NewChatModal from '../components/messages/NewChatModal';
import { messageApi, type ConversationData, type MessageData } from '../services/messageService';
import { usersApi } from '../services/userService';
import { publicationsApi, type Publication, type UserSummary } from '../services/publicationService';
import { searchApi } from '../services/searchService';
import signalRService from '../services/signalRService';
import { useTranslation } from '../translations/translations';
import '../styles/pages/MessagesPage.css';

const toConversationStub = (user: UserSummary): ConversationData => ({
    userId: user.id,
    userName: user.fullName,
    userProfileImageUrl: user.profileImageUrl ?? null,
    userIsVerified: user.isVerified,
    userTitle: user.title ?? null,
    userInstitution: user.institution ?? null,
    lastMessage: '',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
});

const MessagesPage: React.FC = () => {
    const navigate = useNavigate();
    const t = useTranslation();
    const [searchParams] = useSearchParams();

    // --- Core state ---
    const [conversations, setConversations] = useState<ConversationData[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedConversationStub, setSelectedConversationStub] = useState<ConversationData | null>(null);
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

    // Contact search effect
    useEffect(() => {
        if (!showNewChat) return;
        const trimmed = contactSearch.trim();
        if (!trimmed) { setContacts(baseContacts); return; }

        const localMatches = baseContacts.filter(u =>
            u.fullName.toLowerCase().includes(trimmed.toLowerCase()) ||
            (u.institution ?? '').toLowerCase().includes(trimmed.toLowerCase()) ||
            (u.title ?? '').toLowerCase().includes(trimmed.toLowerCase())
        );
        setContacts(localMatches);

        const timer = setTimeout(async () => {
            setLoadingContacts(true);
            try {
                const res = await searchApi.searchUsers(trimmed, 1, 8);
                const apiResults = res.data.items;
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

    // Publication detail modal
    const [modalPublication, setModalPublication] = useState<Publication | null>(null);
    const [loadingModal, setLoadingModal] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const attachPickerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const publicationsCacheRef = useRef<Map<string, { mine: Publication[]; theirs: Publication[] }>>(new Map());

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // --- Data fetching ---
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    const fetchConversations = useCallback(async () => {
        try {
            const res = await messageApi.getConversations();
            setConversations(res.data);
        } catch (err) {
            console.error('Failed to fetch conversations', err);
        } finally {
            setLoadingConversations(false);
        }
    }, []);

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

    // --- Init ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        fetchConversations();
        const initUserId = searchParams.get('userId');
        if (initUserId) setSelectedUserId(initUserId);
    }, [fetchConversations, navigate, searchParams]);

    useEffect(() => {
        if (selectedUserId) {
            fetchMessages(selectedUserId);
        }
    }, [fetchMessages, selectedUserId]);

    useEffect(() => {
        if (!selectedUserId) {
            setSelectedConversationStub(null);
            return;
        }

        const existing = conversations.find(c => c.userId === selectedUserId);
        if (existing) {
            setSelectedConversationStub(null);
            return;
        }

        if (selectedConversationStub?.userId === selectedUserId) return;

        let cancelled = false;
        (async () => {
            try {
                const res = await usersApi.getById(selectedUserId);
                if (cancelled) return;
                const user = res.data;
                setSelectedConversationStub(toConversationStub({
                    id: user.id,
                    fullName: user.fullName,
                    profileImageUrl: user.profileImageUrl,
                    isVerified: user.isVerified,
                    title: user.title,
                    institution: user.institution,
                }));
            } catch {
                // no-op: header stays loading if user lookup fails
            }
        })();

        return () => { cancelled = true; };
    }, [conversations, selectedConversationStub?.userId, selectedUserId]);

    useEffect(() => {
        if (shouldAutoScrollRef.current) {
            scrollToBottom();
        }
        shouldAutoScrollRef.current = true;
    }, [messages]);

    const loadOlderMessages = async () => {
        if (!selectedUserId || loadingOlder || !hasMore) return;
        setLoadingOlder(true);
        shouldAutoScrollRef.current = false;
        const nextPage = currentPage + 1;
        const container = chatContainerRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;
        try {
            const res = await messageApi.getConversation(selectedUserId, nextPage, 30);
            setMessages(prev => [...res.data.items, ...prev]);
            setCurrentPage(nextPage);
            setHasMore(res.data.hasMore);
            requestAnimationFrame(() => {
                if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
            });
        } catch (err) {
            console.error('Failed to load older messages', err);
        } finally {
            setLoadingOlder(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const handleReceiveMessage = (msg: MessageData) => {
            if (!selectedUserId) {
                fetchConversations();
                return;
            }

            const belongsToActiveConversation =
                (msg.senderId === selectedUserId && msg.receiverId === currentUser.id) ||
                (msg.receiverId === selectedUserId && msg.senderId === currentUser.id);

            if (belongsToActiveConversation) {
                setMessages(prev => {
                    const exists = prev.some(m => m.id === msg.id);
                    if (exists) return prev;
                    return [...prev, msg];
                });

                if (msg.senderId === selectedUserId) {
                    messageApi.markAsRead(selectedUserId).catch(() => {});
                }
            }

            fetchConversations();
        };

        signalRService.on('ReceiveMessage', handleReceiveMessage);
        return () => signalRService.off('ReceiveMessage', handleReceiveMessage);
    }, [selectedUserId, currentUser.id, fetchConversations]);

    // --- Handlers ---
    const handleSelectConversation = (userId: string) => {
        setSelectedConversationStub(null);
        setSelectedUserId(userId);
    };

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
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
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
            const all = [...followersRes.data, ...followingRes.data];
            const seen = new Set<string>();
            const unique = all.filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; });
            setBaseContacts(unique);
            setContacts(unique);
        } catch (err) {
            console.error('Failed to load contacts', err);
        } finally {
            setLoadingContacts(false);
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    };

    const closeNewChat = () => { setShowNewChat(false); setContactSearch(''); };
    const handleStartChat = (user: UserSummary) => {
        closeNewChat();
        setSelectedConversationStub(toConversationStub(user));
        setSelectedUserId(user.id);
    };

    const openAttachPicker = async () => {
        if (!selectedUserId) return;
        setShowAttachPicker(true);
        setAttachSearch('');
        setAttachTab('mine');
        const cached = publicationsCacheRef.current.get(selectedUserId);
        if (cached) {
            setMyPublications(cached.mine);
            setTheirPublications(cached.theirs);
            return;
        }
        setLoadingPubs(true);
        try {
            const [myRes, theirRes] = await Promise.all([
                publicationsApi.getByAuthor(currentUser.id, 1, 50),
                publicationsApi.getByAuthor(selectedUserId, 1, 50),
            ]);
            setMyPublications(myRes.data.items);
            setTheirPublications(theirRes.data.items);
            publicationsCacheRef.current.set(selectedUserId, {
                mine: myRes.data.items,
                theirs: theirRes.data.items,
            });
        } catch (err) {
            console.error('Failed to load publications', err);
        } finally {
            setLoadingPubs(false);
        }
    };

    const closeAttachPicker = () => { setShowAttachPicker(false); setAttachSearch(''); };

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

    const selectedConversation = conversations.find(c => c.userId === selectedUserId)
        ?? (selectedConversationStub?.userId === selectedUserId ? selectedConversationStub : undefined);

    // --- Render ---
    return (
        <>
            <div className="messages-page">
                <Navbar currentPage="messages" />
                <div className="messages-layout">
                    <div className="messages-sidebar">
                        <HomeProfileSidebar />
                    </div>

                    <div className="messages-container">
                        <MessagesSidebar
                            conversations={conversations}
                            selectedUserId={selectedUserId}
                            loadingConversations={loadingConversations}
                            t={t}
                            onSelectConversation={handleSelectConversation}
                            onOpenNewChat={openNewChat}
                        />

                        <MessagesChatPanel
                            selectedUserId={selectedUserId}
                            selectedConversation={selectedConversation}
                            messages={messages}
                            loadingMessages={loadingMessages}
                            currentUserId={currentUser.id}
                            newMessage={newMessage}
                            sending={sending}
                            hasMore={hasMore}
                            loadingOlder={loadingOlder}
                            attachedPublication={attachedPublication}
                            showAttachPicker={showAttachPicker}
                            attachTab={attachTab}
                            attachSearch={attachSearch}
                            loadingPubs={loadingPubs}
                            activePubs={activePubs}
                            loadingModal={loadingModal}
                            t={t}
                            messagesEndRef={messagesEndRef}
                            chatContainerRef={chatContainerRef}
                            textareaRef={textareaRef}
                            attachPickerRef={attachPickerRef}
                            onMessageChange={setNewMessage}
                            onSendMessage={handleSendMessage}
                            onKeyDown={handleKeyDown}
                            onLoadOlderMessages={loadOlderMessages}
                            onOpenPublicationModal={openPublicationModal}
                            onRemoveAttachment={() => setAttachedPublication(null)}
                            onToggleAttachPicker={() => showAttachPicker ? closeAttachPicker() : openAttachPicker()}
                            onCloseAttachPicker={closeAttachPicker}
                            onAttachTabChange={setAttachTab}
                            onAttachSearchChange={setAttachSearch}
                            onSelectPublication={handleSelectPublication}
                        />
                    </div>
                </div>
            </div>

            {showNewChat && (
                <NewChatModal
                    contactSearch={contactSearch}
                    contacts={contacts}
                    loadingContacts={loadingContacts}
                    t={t}
                    searchInputRef={searchInputRef}
                    onClose={closeNewChat}
                    onSearchChange={setContactSearch}
                    onStartChat={handleStartChat}
                />
            )}

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
