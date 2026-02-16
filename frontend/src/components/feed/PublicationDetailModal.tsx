import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import type { Publication } from '../../services/publicationService';
import { API_SERVER_URL } from '../../services/apiClient';
import '../../styles/feed/PublicationDetailModal.css';

interface PublicationDetailModalProps {
    publication: Publication;
    onClose: () => void;
}

const PublicationDetailModal: React.FC<PublicationDetailModalProps> = ({ publication, onClose }) => {
    const [downloading, setDownloading] = useState(false);
    const [wordHtml, setWordHtml] = useState<string | null>(null);
    const [wordLoading, setWordLoading] = useState(false);
    const [wordError, setWordError] = useState<string | null>(null);

    const fileUrl = publication.fileUrl ? `${API_SERVER_URL}${publication.fileUrl}` : null;
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

    // Load .docx preview — abort on unmount
    useEffect(() => {
        if (!isDocx || !fileUrl) return;

        const controller = new AbortController();
        let cancelled = false;

        const loadDocx = async () => {
            setWordLoading(true);
            setWordError(null);
            try {
                const response = await fetch(fileUrl, { signal: controller.signal });
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
    }, [fileUrl, isDocx]);

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!fileUrl) return;
        setDownloading(true);
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${publication.title}.${fileExtension || 'pdf'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            window.open(fileUrl, '_blank');
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
                        {/* Author */}
                        <div className="pub-detail-author">
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
                                <p>{publication.abstract}</p>
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
                        {fileUrl && (
                            <button
                                className="pub-detail-download-btn"
                                onClick={handleDownload}
                                disabled={downloading}
                            >
                                {downloading ? 'Downloading...' : 'Download File'}
                            </button>
                        )}
                    </div>

                    {/* Right side: Document Preview (first page) */}
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
        </div>
    );
};

export default PublicationDetailModal;
