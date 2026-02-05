import React, { useState } from 'react';
import type { Publication } from '../services/publicationService';
import { API_SERVER_URL } from '../services/apiClient';
import '../styles/PublicationComponents.css';

interface PublicationCardProps {
    publication: Publication;
    currentUserId?: string;
    onDelete?: (id: string) => void;
}

const PublicationCard: React.FC<PublicationCardProps> = ({ publication, currentUserId, onDelete }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

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

    return (
        <div className="publication-card">
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
                                🗑️
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="delete-confirmation">
                    <p>Bu yayını silmek istediğinizden emin misiniz?</p>
                    <div className="delete-confirmation-actions">
                        <button
                            className="btn-secondary"
                            onClick={handleCancelDelete}
                            disabled={deleting}
                        >
                            İptal
                        </button>
                        <button
                            className="btn-danger"
                            onClick={handleConfirmDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Siliniyor...' : 'Evet, Sil'}
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
                            href={`${API_SERVER_URL}${publication.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-link"
                        >
                            📄 Dosyayı Görüntüle
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
                    ⭐ {publication.averageRating.toFixed(1)}
                </span>
                <span className="stat-item">
                    📚 {publication.citationCount} alıntı
                </span>
                <span className="stat-item">
                    💾 {publication.saveCount} kayıt
                </span>
            </div>
        </div>
    );
};

export default PublicationCard;
