import { useState, useRef, useEffect, useCallback } from 'react';
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
    "Bu makalenin ana araştırma sorusu nedir?",
    "Kullanılan metodoloji nedir ve sınırlamaları nelerdir?",
    "Makalenin temel bulguları ve sonuçları nelerdir?",
    "Bu çalışmanın literatüre katkısı nedir?",
];

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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // İndeks durumunu kontrol et
    const checkIndexStatus = useCallback(async () => {
        try {
            const res = await aiApi.getRagIndexStatus(publicationId);
            setIsIndexed(res.data.isIndexed);
            if (!res.data.isIndexed) {
                await indexArticle();
            }
        } catch {
            setError('Makale durumu kontrol edilemedi.');
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
            const msg = err.response?.data?.message || 'Makale indekslenemedi.';
            setError(msg);
        } finally {
            setIsIndexing(false);
        }
    };

    // Panel açıldığında kontrol et
    useEffect(() => {
        if (isOpen) {
            setIsIndexed(null);
            setError(null);
            checkIndexStatus();
        }
    }, [isOpen, checkIndexStatus]);

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
            const res = await aiApi.askArticleQuestion(publicationId, q);
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
                content: 'Cevap üretilirken bir hata oluştu. Lütfen tekrar deneyin.',
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
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
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
                            <h3>Makale Asistanı</h3>
                            <p title={publicationTitle}>{publicationTitle}</p>
                        </div>
                    </div>
                    <button className="article-chat-close" onClick={onClose}>✕</button>
                </div>

                {/* İndeksleniyor */}
                {isIndexing && (
                    <div className="article-chat-indexing">
                        <div className="article-chat-indexing-spinner" />
                        <h4>Makale analiz ediliyor...</h4>
                        <p>PDF içeriği parçalanıp vektör veritabanına indeksleniyor. Bu işlem birkaç saniye sürebilir.</p>
                    </div>
                )}

                {/* Hata */}
                {error && !isIndexing && (
                    <div className="article-chat-error">
                        <div className="article-chat-error-icon">⚠️</div>
                        <h4>Bir sorun oluştu</h4>
                        <p>{error}</p>
                        <button onClick={() => { setError(null); checkIndexStatus(); }}>
                            Tekrar Dene
                        </button>
                    </div>
                )}

                {/* Chat Alanı */}
                {isIndexed && !isIndexing && !error && (
                    <>
                        <div className="article-chat-messages">
                            {messages.length === 0 ? (
                                <div className="article-chat-welcome">
                                    <div className="article-chat-welcome-icon">📄</div>
                                    <h4>Makale hakkında sorular sorun</h4>
                                    <p>
                                        Bu asistan yalnızca makalenin içeriğini kullanarak
                                        sorularınıza cevap verir. Dış kaynaklardan bilgi eklemez.
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
                                                    {msg.fromCache && (
                                                        <span className="article-chat-cache-badge">
                                                            ⚡ Önbellek
                                                        </span>
                                                    )}
                                                </div>
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="article-chat-sources">
                                                        <button
                                                            className="article-chat-sources-toggle"
                                                            onClick={() => toggleSources(msg.id)}
                                                        >
                                                            📑 {msg.sources.length} kaynak
                                                            {expandedSources.has(msg.id) ? ' ▲' : ' ▼'}
                                                        </button>
                                                        {expandedSources.has(msg.id) && (
                                                            <div className="article-chat-sources-list">
                                                                {msg.sources.map((src, i) => (
                                                                    <div key={i} className="article-chat-source-item">
                                                                        <div className="source-header">
                                                                            <span className="source-label">
                                                                                Parça #{src.chunkIndex + 1}
                                                                            </span>
                                                                            <span className="source-score">
                                                                                Benzerlik: {(src.score * 100).toFixed(1)}%
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
                                    placeholder="Makale hakkında bir soru sorun..."
                                    rows={1}
                                    disabled={isLoading}
                                />
                                <button
                                    className="article-chat-send-btn"
                                    onClick={() => sendQuestion()}
                                    disabled={!input.trim() || isLoading}
                                    title="Gönder"
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
