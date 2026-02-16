import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Publication } from '../../services/publicationService';
import { API_SERVER_URL } from '../../services/apiClient';
import DocumentViewerModal from './DocumentViewerModal';
import '../../styles/publications/PublicationCard.css';

interface PublicationCardProps {
    publication: Publication;
    currentUserId?: string;
    onDelete?: (id: string) => void;
    showAuthor?: boolean;
}

const PublicationCard: React.FC<PublicationCardProps> = ({ publication, currentUserId, onDelete, showAuthor }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDocumentViewer, setShowDocumentViewer] = useState(false);
    const navigate = useNavigate();

    const authorImageUrl = publication.author.profileImageUrl
        ? `${API_SERVER_URL}${publication.author.profileImageUrl}`
        : null;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const isOwner = currentUserId && publication.author.id === currentUserId;

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!onDelete) return;

        setDeleting(true);
        try {
            await onDelete(publication.id);
        } catch (error) {
            console.error('Delete failed:', error);
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    const handleViewDocument = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowDocumentViewer(true);
    };

    return (
        <div className="publication-card">
            {showAuthor && (
                <div className="publication-author-row" onClick={() => navigate(`/profile/${publication.author.id}`)}>
                    {authorImageUrl ? (
                        <img src={authorImageUrl} alt={publication.author.fullName} className="publication-author-avatar" />
                    ) : (
                        <div className="publication-author-avatar-placeholder">
                            {publication.author.fullName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="publication-author-info">
                        <span className="publication-author-name">{publication.author.fullName}</span>
                        {publication.author.title && (
                            <span className="publication-author-title">{publication.author.title}</span>
                        )}
                    </div>
                </div>
            )}
            <div className="publication-header">
                <h3 className="publication-title">{publication.title}</h3>
                <div className="publication-header-actions">
                    <span className="publication-date">
                        {publication.publishedDate
                            ? formatDate(publication.publishedDate)
                            : formatDate(publication.createdAt)
                        }
                    </span>
                    {isOwner && (
                        <div className="publication-actions">
                            <button
                                className="publication-action-btn delete-btn"
                                onClick={handleDeleteClick}
                                disabled={deleting}
                                title="Sil"
                            >
                                ✖
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="delete-confirmation">
                    <p>Are you sure you want to delete this publication?</p>
                    <div className="delete-confirmation-actions">
                        <button
                            className="btn-secondary"
                            onClick={handleCancelDelete}
                            disabled={deleting}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn-danger"
                            onClick={handleConfirmDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                    </div>
                </div>
            )}

            {publication.abstract && (
                <p className="publication-abstract">
                    {truncateText(publication.abstract, 200)}
                </p>
            )}

            <div className="publication-meta">
                {publication.doi && (
                    <div className="publication-doi">
                        <strong>DOI:</strong>
                        <a
                            href={`https://doi.org/${publication.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {publication.doi}
                        </a>
                    </div>
                )}

                {publication.fileUrl && (
                    <div className="publication-file">
                        <a
                            href="#"
                            onClick={handleViewDocument}
                            className="file-link"
                        >
                            View File
                        </a>
                    </div>
                )}

                {publication.tags.length > 0 && (
                    <div className="publication-tags">
                        {publication.tags.map((tag, index) => (
                            <span key={index} className="tag-badge">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="publication-stats">
                <span className="stat-item">
                    <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    {publication.averageRating.toFixed(1)}
                </span>
                <span className="stat-item">
                    <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                    {publication.citationCount} citations
                </span>
                <span className="stat-item">
                    <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                    {publication.saveCount} saves
                </span>
            </div>

            {showDocumentViewer && publication.fileUrl && (
                <DocumentViewerModal
                    fileUrl={`${API_SERVER_URL}${publication.fileUrl}`}
                    fileName={publication.title}
                    onClose={() => setShowDocumentViewer(false)}
                />
            )}
        </div>
    );
};

export default PublicationCard;
