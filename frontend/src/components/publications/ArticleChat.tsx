import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { aiApi } from '../../services/aiService';
import '../../styles/publications/ArticleChat.css';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: Array<{ chunkIndex: number; text: string; score: number }>;
    fromCache?: boolean;
}

interface ArticleChatProps {
    publicationId: string;
    publicationTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

const SUGGESTION_QUESTIONS = [
    "What is the main research question of this article?",
    "What methodology was used and what are its limitations?",
    "What are the key findings and conclusions?",
    "What is this study's contribution to the literature?",
];

// ───────────── Chat persistence (localStorage) ─────────────
// The article chat is scoped per user AND per publication, so each user has
// an isolated history per article. Storage survives modal close, page
// navigation, and browser restarts (until the user clears it via the
// "New chat" button or localStorage is pruned by the browser).

const CHAT_STORAGE_PREFIX = 'rn:article-chat';
const MAX_STORED_MESSAGES = 50;
const STORAGE_DEBOUNCE_MS = 500;

interface StoredChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    sources?: Array<{ chunkIndex: number; text: string; score: number }>;
    fromCache?: boolean;
}

interface StoredChat {
    messages: StoredChatMessage[];
    updatedAt: string;
}

const getChatStorageKey = (userId: string, publicationId: string): string =>
    `${CHAT_STORAGE_PREFIX}:${userId}:${publicationId}`;

const loadStoredChat = (key: string): ChatMessage[] | null => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredChat;
        if (!parsed || !Array.isArray(parsed.messages) || parsed.messages.length === 0) {
            return null;
        }
        return parsed.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
            sources: m.sources,
            fromCache: m.fromCache,
        }));
    } catch {
        return null;
    }
};

const saveStoredChat = (key: string, messages: ChatMessage[]): void => {
    try {
        const trimmed = messages.slice(-MAX_STORED_MESSAGES);
        const payload: StoredChat = {
            messages: trimmed.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp.toISOString(),
                sources: m.sources,
                fromCache: m.fromCache,
            })),
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(payload));
    } catch {
        // Quota exceeded or storage disabled — fail silently; the in-memory
        // state keeps working for the current session.
    }
};

const clearStoredChat = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
};

export default function ArticleChat({
    publicationId,
    publicationTitle,
    isOpen,
    onClose,
}: ArticleChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isIndexing, setIsIndexing] = useState(false);
    const [isIndexed, setIsIndexed] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
    const [hasResumedHistory, setHasResumedHistory] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Persistence key — scoped per user + publication so different users
    // on the same device don't see each other's chat history.
    const storageKey = useMemo(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (!user?.id) return null;
            return getChatStorageKey(user.id, publicationId);
        } catch {
            return null;
        }
    }, [publicationId]);

    // İndeks durumunu kontrol et
    const checkIndexStatus = useCallback(async () => {
        try {
            const res = await aiApi.getRagIndexStatus(publicationId);
            setIsIndexed(res.data.isIndexed);
            if (!res.data.isIndexed) {
                await indexArticle();
            }
        } catch {
            setError('Could not check article status.');
        }
    }, [publicationId]);

    // Makaleyi indeksle
    const indexArticle = async () => {
        setIsIndexing(true);
        setError(null);
        try {
            await aiApi.indexArticleForRag(publicationId);
            setIsIndexed(true);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Could not index the article.';
            setError(msg);
        } finally {
            setIsIndexing(false);
        }
    };

    // Panel açıldığında kontrol et + önceki konuşmayı geri yükle
    useEffect(() => {
        if (!isOpen) return;

        setIsIndexed(null);
        setError(null);
        checkIndexStatus();

        if (storageKey) {
            const restored = loadStoredChat(storageKey);
            if (restored && restored.length > 0) {
                setMessages(restored);
                setHasResumedHistory(true);
                return;
            }
        }
        setMessages([]);
        setHasResumedHistory(false);
    }, [isOpen, storageKey, checkIndexStatus]);

    // Mesajları localStorage'a debounced olarak yaz. Boş listede dokunmuyoruz
    // çünkü "Yeni sohbet" akışı zaten açık bir biçimde siliyor.
    useEffect(() => {
        if (!storageKey) return;
        if (messages.length === 0) return;
        const timer = window.setTimeout(() => {
            saveStoredChat(storageKey, messages);
        }, STORAGE_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [messages, storageKey]);

    // Mesaj sonuna scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Textarea otomatik boyutlandırma
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const ta = e.target;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    };

    // Soru gönder
    const sendQuestion = async (question?: string) => {
        const q = (question || input).trim();
        if (!q || isLoading) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: q,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Textarea'yı sıfırla
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            const history = messages
                .filter(m => m.content && (m.role === 'user' || m.role === 'assistant'))
                .slice(-6)
                .map(m => ({ role: m.role, content: m.content }));
            const res = await aiApi.askArticleQuestion(publicationId, q, history);
            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.data.answer,
                timestamp: new Date(),
                sources: res.data.sources,
                fromCache: res.data.fromCache,
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: any) {
            const errMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'An error occurred while generating the answer. Please try again.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    // Enter ile gönder (Shift+Enter yeni satır)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendQuestion();
        }
    };

    // Konuşmayı sıfırla — UI state + localStorage'dan siler. Backend'deki
    // semantic cache'e dokunmaz (farklı kullanıcı/soruların önbelleğe
    // alınmış cevapları kaybolmasın diye).
    const handleNewChat = () => {
        if (messages.length === 0 && !hasResumedHistory) return;
        const confirmed = window.confirm(
            'Start a new conversation? Your previous messages for this article will be cleared.'
        );
        if (!confirmed) return;
        if (storageKey) clearStoredChat(storageKey);
        setMessages([]);
        setHasResumedHistory(false);
        setExpandedSources(new Set());
        setError(null);
    };

    // Kaynak toggle
    const toggleSources = (messageId: string) => {
        setExpandedSources(prev => {
            const next = new Set(prev);
            if (next.has(messageId)) next.delete(messageId);
            else next.add(messageId);
            return next;
        });
    };

    // Zaman formatı
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;

    return (
        <div className="article-chat-overlay" onClick={onClose}>
            <div className="article-chat-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="article-chat-header">
                    <div className="article-chat-header-info">
                        <div className="article-chat-icon">🤖</div>
                        <div className="article-chat-header-text">
                            <h3>Article Assistant</h3>
                            <p title={publicationTitle}>{publicationTitle}</p>
                        </div>
                    </div>
                    <div className="article-chat-header-actions">
                        {messages.length > 0 && (
                            <button
                                className="article-chat-new-btn"
                                onClick={handleNewChat}
                                title="Start new conversation"
                                aria-label="Start new conversation"
                            >
                                ↻
                            </button>
                        )}
                        <button className="article-chat-close" onClick={onClose}>✕</button>
                    </div>
                </div>

                {/* Indexing */}
                {isIndexing && (
                    <div className="article-chat-indexing">
                        <div className="article-chat-indexing-spinner" />
                        <h4>Analyzing article...</h4>
                        <p>The PDF content is being processed and indexed. This may take a few seconds.</p>
                    </div>
                )}

                {/* Error */}
                {error && !isIndexing && (
                    <div className="article-chat-error">
                        <div className="article-chat-error-icon">⚠️</div>
                        <h4>Something went wrong</h4>
                        <p>{error}</p>
                        <button onClick={() => { setError(null); checkIndexStatus(); }}>
                            Try Again
                        </button>
                    </div>
                )}

                {/* Chat Alanı */}
                {isIndexed && !isIndexing && !error && (
                    <>
                        <div className="article-chat-messages">
                            {hasResumedHistory && messages.length > 0 && (
                                <div className="article-chat-resumed-banner">
                                    <span className="article-chat-resumed-icon">⏪</span>
                                    <span className="article-chat-resumed-text">
                                        Continuing your previous conversation
                                    </span>
                                </div>
                            )}
                            {messages.length === 0 ? (
                                <div className="article-chat-welcome">
                                    <div className="article-chat-welcome-icon">📄</div>
                                    <h4>Ask questions about this article</h4>
                                    <p>
                                        This assistant answers your questions using only the
                                        article's content. It does not use external sources.
                                    </p>
                                    <div className="article-chat-suggestions">
                                        {SUGGESTION_QUESTIONS.map((q, i) => (
                                            <button
                                                key={i}
                                                className="article-chat-suggestion"
                                                onClick={() => sendQuestion(q)}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`article-chat-message ${msg.role}`}
                                        >
                                            <div className="article-chat-message-avatar">
                                                {msg.role === 'user' ? '👤' : '🤖'}
                                            </div>
                                            <div className="article-chat-message-content">
                                                <div className="article-chat-message-bubble">
                                                    {msg.content}
                                                </div>
                                                <div className="article-chat-message-meta">
                                                    <span className="article-chat-message-time">
                                                        {formatTime(msg.timestamp)}
                                                    </span>
                                                </div>
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="article-chat-sources">
                                                        <button
                                                            className="article-chat-sources-toggle"
                                                            onClick={() => toggleSources(msg.id)}
                                                        >
                                                            📑 {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                                                            {expandedSources.has(msg.id) ? ' ▲' : ' ▼'}
                                                        </button>
                                                        {expandedSources.has(msg.id) && (
                                                            <div className="article-chat-sources-list">
                                                                {msg.sources.map((src, i) => (
                                                                    <div key={i} className="article-chat-source-item">
                                                                        <div className="source-header">
                                                                            <span className="source-label">
                                                                                Chunk #{src.chunkIndex + 1}
                                                                            </span>
                                                                            <span className="source-score">
                                                                                Similarity: {(src.score * 100).toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                        {src.text}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Typing indicator */}
                                    {isLoading && (
                                        <div className="article-chat-typing">
                                            <div className="article-chat-message-avatar">
                                                🤖
                                            </div>
                                            <div className="article-chat-typing-dots">
                                                <span /><span /><span />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="article-chat-input-area">
                            <div className="article-chat-input-wrapper">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask a question about this article..."
                                    rows={1}
                                    disabled={isLoading}
                                />
                                <button
                                    className="article-chat-send-btn"
                                    onClick={() => sendQuestion()}
                                    disabled={!input.trim() || isLoading}
                                    title="Send"
                                >
                                    ➤
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
