import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { messageApi, type ConversationData, type MessageData } from '../../services/messageService';
import { publicationsApi, type Publication, type UserSummary } from '../../services/publicationService';
import { usersApi } from '../../services/userService';
import { searchApi } from '../../services/searchService';
import signalRService from '../../services/signalRService';
import PublicationDetailModal from '../feed/PublicationDetailModal';
import ChatView from './ChatView';
import ConversationList from './ConversationList';
import ContactSearch from './ContactSearch';
import './FloatingChat.css';

const FloatingChat: React.FC = () => {
    const location = useLocation();

    // Hide when any modal overlay is open (e.g. PublicationDetailModal)
    const [isModalOpen, setIsModalOpen] = useState(false);
    useEffect(() => {
        const check = () => setIsModalOpen(!!document.querySelector('.pub-detail-overlay'));
        check();
        const observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

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

        // Apply local filtering immediately (to avoid showing "not found" while typing first chars)
        const localMatches = baseContacts.filter(u =>
            u.fullName.toLowerCase().includes(trimmed.toLowerCase()) ||
            (u.institution ?? '').toLowerCase().includes(trimmed.toLowerCase()) ||
            (u.title ?? '').toLowerCase().includes(trimmed.toLowerCase())
        );

        // Show local results immediately while user is typing
        setContacts(localMatches);

        const timer = setTimeout(async () => {
            setLoadingContacts(true);
            try {
                const res = await searchApi.searchUsers(trimmed, 1, 8); // 8 contacts limit
                
                const apiResults = res.data.items;
                // Merge local results with API results (prevent duplicates)
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
    const isMessagesPage = location.pathname.startsWith('/messages');

    // --- SignalR & initial fetch ---
    useEffect(() => {
        if (!token || isAuthPage || isMessagesPage) {
            return;
        }
        fetchConversations();

        // Listen for incoming messages via SignalR
        const handleReceiveMessage = (msg: MessageData) => {
            // If this message is for the active chat, add it to messages
            const currentActive = activeChatUserRef.current;
            if (currentActive && msg.senderId === currentActive.userId && isActiveExpandedRef.current) {
                setMessages(prev => {
                    const exists = prev.some(m => m.id === msg.id);
                    if (exists) return prev;
                    return [...prev, msg];
                });
                // Mark as read since the chat window is open
                messageApi.markAsRead(msg.senderId).catch(() => {});
            }
            // Refresh conversations list to update last message & unread counts
            fetchConversations();
        };

        signalRService.on('ReceiveMessage', handleReceiveMessage);

        return () => {
            signalRService.off('ReceiveMessage', handleReceiveMessage);
        };
    }, [token, isAuthPage, isMessagesPage]);

    useEffect(() => {
        if (activeChatUser && isActiveExpanded) {
            fetchMessages(activeChatUser.userId);
            scrollToBottom();
        }
    }, [activeChatUser, isActiveExpanded]);

    useEffect(() => {
        if (isActiveExpanded) scrollToBottom();
    }, [messages, isActiveExpanded]);

    const fetchConversations = async () => {
        try {
            const res = await messageApi.getConversations();
            setConversations(res.data);
            const unread = res.data.reduce((acc, curr) => acc + curr.unreadCount, 0);
            setTotalUnread(unread);
            const currentActive = activeChatUserRef.current;
            if (currentActive) {
                const updatedActive = res.data.find(c => c.userId === currentActive.userId);
                if (updatedActive) setActiveChatUser(updatedActive);
            }
        } catch {
            // silent fail
        }
    };

    const fetchMessages = async (userId: string) => {
        try {
            const res = await messageApi.getConversation(userId, 1, 30);
            setMessages(res.data.items);
            setConversations(prev =>
                prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c)
            );
        } catch (err) {
            console.error('Failed to fetch messages', err);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    // --- Handlers ---
    const handleSelectConversation = (conv: ConversationData) => {
        setActiveChatUser(conv);
        setIsActiveExpanded(true);
        setIsMainExpanded(false);
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

    // --- Guard ---
    if (!token || isAuthPage || isMessagesPage || isModalOpen) return null;

    // Single pane logic
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

                {isShowingChat ? (
                    <ChatView
                        activeChatUser={activeChatUser}
                        isExpanded={isExpanded}
                        messages={messages}
                        currentUserId={currentUser.id}
                        newMessage={newMessage}
                        sending={sending}
                        attachedPublication={attachedPublication}
                        showAttachPicker={showAttachPicker}
                        attachTab={attachTab}
                        attachSearch={attachSearch}
                        loadingPubs={loadingPubs}
                        activePubs={activePubs}
                        messagesEndRef={messagesEndRef}
                        onToggleWindow={toggleWindow}
                        onGoBack={() => { setActiveChatUser(null); setIsMainExpanded(true); }}
                        onClose={() => { setActiveChatUser(null); setIsMainExpanded(false); }}
                        onMessageChange={setNewMessage}
                        onSendMessage={handleSendMessage}
                        onKeyDown={handleKeyDown}
                        onOpenPublicationModal={openPublicationModal}
                        onRemoveAttachment={() => setAttachedPublication(null)}
                        onToggleAttachPicker={() => showAttachPicker ? closeAttachPicker() : openAttachPicker()}
                        onCloseAttachPicker={closeAttachPicker}
                        onAttachTabChange={setAttachTab}
                        onAttachSearchChange={setAttachSearch}
                        onSelectPublication={handleSelectPublication}
                        textareaRef={textareaRef}
                        attachPickerRef={attachPickerRef}
                    />
                ) : showNewChat ? (
                    <ContactSearch
                        isExpanded={isExpanded}
                        contactSearch={contactSearch}
                        contacts={contacts}
                        loadingContacts={loadingContacts}
                        searchInputRef={searchInputRef}
                        onToggleExpanded={() => setIsMainExpanded(!isMainExpanded)}
                        onClose={closeNewChat}
                        onSearchChange={setContactSearch}
                        onStartChat={handleStartChat}
                    />
                ) : (
                    <ConversationList
                        conversations={conversations}
                        currentUser={currentUser}
                        totalUnread={totalUnread}
                        isExpanded={isExpanded}
                        onToggleWindow={toggleWindow}
                        onSelectConversation={handleSelectConversation}
                        onOpenNewChat={openNewChat}
                    />
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
