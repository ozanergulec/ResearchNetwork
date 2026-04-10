import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import type { Publication } from '../../services/publicationService';
import { API_SERVER_URL } from '../../services/apiClient';
import '../../styles/feed/PublicationDetailModal.css';
import PublicationCitationGraph from './PublicationCitationGraph';
import ArticleChat from '../publications/ArticleChat';

interface PublicationDetailModalProps {
    publication: Publication;
    onClose: () => void;
}

const PublicationDetailModal: React.FC<PublicationDetailModalProps> = ({ publication, onClose }) => {
    const navigate = useNavigate();
    const [downloading, setDownloading] = useState(false);
    const [wordHtml, setWordHtml] = useState<string | null>(null);
    const [wordLoading, setWordLoading] = useState(false);
    const [wordError, setWordError] = useState<string | null>(null);
    const [abstractExpanded, setAbstractExpanded] = useState(false);
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    const [citationViewType, setCitationViewType] = useState<'list' | 'graph'>('list');
    const [citationsExpanded, setCitationsExpanded] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    
    // Add missing citations state back
    const [citationsData, setCitationsData] = useState(publication.citationAnalysis || []);
    const [loadingCitations, setLoadingCitations] = useState(!publication.citationAnalysis || publication.citationAnalysis.length === 0);

    const ABSTRACT_LIMIT = 250;
    const SUMMARY_LIMIT = 200;

    useEffect(() => {
        const loadCitations = async () => {
            if (publication.citationAnalysis && publication.citationAnalysis.length > 0) {
                setCitationsData(publication.citationAnalysis);
                setLoadingCitations(false);
                return;
            }
            try {
                // Fetch up to 50 citations for See More capability
                const res = await publicationsApi.getCitationAnalysis(publication.id, 1, 50);
                setCitationsData(res.data.items || []);
            } catch (err) {
                console.error('Failed to fetch citations', err);
            } finally {
                setLoadingCitations(false);
            }
        };
        loadCitations();
    }, [publication.id, publication.citationAnalysis]);

    const fileUrl = publication.fileUrl ? `${API_SERVER_URL}${publication.fileUrl}` : null;
    const downloadUrl = publication.fileUrl
        ? `${API_SERVER_URL}/api/publications/download?fileUrl=${encodeURIComponent(publication.fileUrl)}`
        : null;
    const fileExtension = publication.fileUrl?.split('.').pop()?.toLowerCase();
    const isPDF = fileExtension === 'pdf';
    const isDocx = fileExtension === 'docx';

    const authorImageUrl = publication.author.profileImageUrl
        ? `${API_SERVER_URL}${publication.author.profileImageUrl}`
        : null;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleAuthorClick = () => {
        onClose();
        navigate(`/profile/${publication.author.id}`);
    };

    // Load .docx preview — abort on unmount
    useEffect(() => {
        if (!isDocx || !downloadUrl) return;

        const controller = new AbortController();
        let cancelled = false;

        const loadDocx = async () => {
            setWordLoading(true);
            setWordError(null);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(downloadUrl, {
                    signal: controller.signal,
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                });
                if (!response.ok) throw new Error('Failed to load file');
                const arrayBuffer = await response.arrayBuffer();
                if (cancelled) return;
                const result = await mammoth.convertToHtml({ arrayBuffer });
                if (cancelled) return;
                setWordHtml(result.value);
            } catch (error: any) {
                if (error.name === 'AbortError' || cancelled) return;
                console.error('Word preview error:', error);
                setWordError('Failed to load document preview.');
            } finally {
                if (!cancelled) setWordLoading(false);
            }
        };

        loadDocx();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [isDocx, downloadUrl]);

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = downloadUrl || fileUrl;
        if (!url) return;
        setDownloading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${publication.title}.${fileExtension || 'pdf'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download error:', error);
            if (fileUrl) window.open(fileUrl, '_blank');
        } finally {
            setDownloading(false);
        }
    };

    // Lock background scroll & close on Escape key
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    return (
        <div className="pub-detail-overlay" onClick={onClose}>
            <div className="pub-detail-modal" onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className="pub-detail-close" onClick={onClose}>×</button>

                <div className="pub-detail-body">
                    {/* Left side: Publication Info */}
                    <div className="pub-detail-info">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            {/* Author - clickable */}
                            <div
                                className="pub-detail-author pub-detail-author-clickable"
                                onClick={handleAuthorClick}
                                title="View profile"
                                style={{ marginBottom: 0 }}
                            >
                                <div className="pub-detail-avatar-wrapper">
                                    {authorImageUrl ? (
                                        <img
                                            src={authorImageUrl}
                                            alt={publication.author.fullName}
                                            className="pub-detail-avatar"
                                        />
                                    ) : (
                                        <div className="pub-detail-avatar-placeholder">
                                            {publication.author.fullName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="pub-detail-author-name">
                                        {publication.author.fullName}
                                        {publication.author.isVerified && (
                                            <span className="pub-detail-verified">✓</span>
                                        )}
                                    </h4>
                                    <p className="pub-detail-author-meta">
                                        {[publication.author.title, publication.author.institution]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                </div>
                            </div>

                            {/* AI Assistant Button at Top */}
                            {(fileUrl || downloadUrl) && isPDF && (
                                <button
                                    className="pub-detail-download-btn pub-detail-chat-btn"
                                    onClick={() => setChatOpen(true)}
                                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                >
                                    🤖 AI Asistan
                                </button>
                            )}
                        </div>

                        {/* Title */}
                        <h2 className="pub-detail-title">{publication.title}</h2>

                        {/* Date */}
                        <p className="pub-detail-date">
                            {publication.publishedDate
                                ? formatDate(publication.publishedDate)
                                : formatDate(publication.createdAt)}
                        </p>

                        {/* Abstract */}
                        {publication.abstract && (
                            <div className="pub-detail-abstract">
                                <h5>Abstract</h5>
                                <p>
                                    {abstractExpanded || publication.abstract.length <= ABSTRACT_LIMIT
                                        ? publication.abstract
                                        : publication.abstract.substring(0, ABSTRACT_LIMIT) + '...'}
                                </p>
                                {publication.abstract.length > ABSTRACT_LIMIT && (
                                    <button
                                        className="pub-detail-toggle-btn"
                                        onClick={() => setAbstractExpanded(!abstractExpanded)}
                                    >
                                        {abstractExpanded ? 'Show less' : 'See more'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* AI Summary */}
                        {publication.summary && (
                            <div className="pub-detail-summary">
                                <h5>
                                    <span className="pub-detail-summary-icon">✨</span>
                                    AI Summary
                                </h5>
                                <p>
                                    {summaryExpanded || publication.summary.length <= SUMMARY_LIMIT
                                        ? publication.summary
                                        : publication.summary.substring(0, SUMMARY_LIMIT) + '...'}
                                </p>
                                {publication.summary.length > SUMMARY_LIMIT && (
                                    <button
                                        className="pub-detail-toggle-btn"
                                        onClick={() => setSummaryExpanded(!summaryExpanded)}
                                    >
                                        {summaryExpanded ? 'Show less' : 'See more'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Citation Analysis */}
                        {(citationsData.length > 0 || loadingCitations) && (
                            <div className="pub-detail-citation-analysis">
                                <div className="pub-detail-citation-header">
                                    <h5>
                                        <span className="pub-detail-summary-icon">🔍</span>
                                        Citation Analysis
                                    </h5>
                                    <div className="pub-detail-citation-toggle">
                                        <button 
                                            className={citationViewType === 'list' ? 'active' : ''} 
                                            onClick={() => setCitationViewType('list')}
                                        >
                                            List
                                        </button>
                                        <button 
                                            className={citationViewType === 'graph' ? 'active' : ''} 
                                            onClick={() => setCitationViewType('graph')}
                                        >
                                            Graph
                                        </button>
                                    </div>
                                </div>
                                
                                {citationViewType === 'list' ? (
                                    <>
                                        {loadingCitations ? (
                                            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>
                                                Loading citations...
                                            </div>
                                        ) : (
                                            <>
                                                <ul className="pub-detail-citation-list">
                                                    {citationsData
                                                        .slice(0, citationsExpanded ? citationsData.length : 5)
                                                        .map((citation, idx) => {
                                                        const lowerIntent = citation.intent.toLowerCase();
                                                        let intentClass = 'intent-neutral';
                                                        if (lowerIntent.includes('support')) intentClass = 'intent-support';
                                                        else if (lowerIntent.includes('contradict') || lowerIntent.includes('dispute')) intentClass = 'intent-dispute';
                                                        else if (lowerIntent.includes('method')) intentClass = 'intent-method';
                                                        else if (lowerIntent.includes('extend')) intentClass = 'intent-extend';

                                                        return (
                                                            <li key={idx} className={`pub-detail-citation-item ${intentClass}`}>
                                                                <span className="citation-intent-badge">{citation.intent}</span>
                                                                <span className="citation-sentence">"{citation.sentence}"</span>
                                                                {citation.citationNumbers && citation.citationNumbers.length > 0 && (
                                                                    <span className="citation-numbers">
                                                                        [{citation.citationNumbers.join(', ')}]
                                                                    </span>
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>

                                                {citationsData.length > 5 && (
                                                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                                        <button 
                                                            className="pub-detail-toggle-btn"
                                                            onClick={() => setCitationsExpanded(!citationsExpanded)}
                                                        >
                                                            {citationsExpanded ? 'Show less' : 'See more'}
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <PublicationCitationGraph publicationId={publication.id} />
                                )}
                            </div>
                        )}

                        {/* DOI */}
                        {publication.doi && (
                            <div className="pub-detail-doi">
                                <strong>DOI: </strong>
                                <a
                                    href={`https://doi.org/${publication.doi}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {publication.doi}
                                </a>
                            </div>
                        )}

                        {/* Tags */}
                        {publication.tags.length > 0 && (
                            <div className="pub-detail-tags">
                                {publication.tags.map((tag, i) => (
                                    <span key={i} className="pub-detail-tag">{tag}</span>
                                ))}
                            </div>
                        )}

                        {/* Stats */}
                        <div className="pub-detail-stats">
                            <div className="pub-detail-stat-item">
                                <span className="pub-detail-stat-value">{publication.averageRating.toFixed(1)}</span>
                                <span className="pub-detail-stat-label">Rating</span>
                            </div>
                            <div className="pub-detail-stat-item">
                                <span className="pub-detail-stat-value">{publication.citationCount}</span>
                                <span className="pub-detail-stat-label">Citations</span>
                            </div>
                            <div className="pub-detail-stat-item">
                                <span className="pub-detail-stat-value">{publication.saveCount}</span>
                                <span className="pub-detail-stat-label">Saves</span>
                            </div>
                            <div className="pub-detail-stat-item">
                                <span className="pub-detail-stat-value">{publication.shareCount}</span>
                                <span className="pub-detail-stat-label">Shares</span>
                            </div>
                        </div>

                        {/* Download Button */}
                        {(fileUrl || downloadUrl) && (
                            <button
                                className="pub-detail-download-btn"
                                onClick={handleDownload}
                                disabled={downloading}
                            >
                                {downloading ? 'Downloading...' : 'Download File'}
                            </button>
                        )}
                    </div>

                    {/* Right side: Document Preview */}
                    {fileUrl && (
                        <div className="pub-detail-preview">
                            <h5 className="pub-detail-preview-title">Document Preview</h5>
                            <div className="pub-detail-preview-container">
                                {isPDF ? (
                                    <iframe
                                        src={`${fileUrl}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                        className="pub-detail-preview-iframe"
                                        title={`Preview: ${publication.title}`}
                                    />
                                ) : isDocx ? (
                                    wordLoading ? (
                                        <div className="pub-detail-preview-loading">
                                            <div className="pub-detail-preview-spinner" />
                                            <span>Loading preview...</span>
                                        </div>
                                    ) : wordError ? (
                                        <div className="pub-detail-preview-error">
                                            <p>{wordError}</p>
                                        </div>
                                    ) : wordHtml ? (
                                        <div
                                            className="pub-detail-preview-word"
                                            dangerouslySetInnerHTML={{ __html: wordHtml }}
                                        />
                                    ) : null
                                ) : (
                                    <div className="pub-detail-preview-error">
                                        <p>Preview not available for this file type.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Article Chat Panel */}
            <ArticleChat
                publicationId={publication.id}
                publicationTitle={publication.title}
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
            />
        </div>
    );
};

export default PublicationDetailModal;
