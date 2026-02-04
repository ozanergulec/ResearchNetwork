import React from 'react';
import type { Publication } from '../services/publicationService';
import '../styles/PublicationComponents.css';

interface PublicationCardProps {
    publication: Publication;
}

const PublicationCard: React.FC<PublicationCardProps> = ({ publication }) => {
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

    return (
        <div className="publication-card">
            <div className="publication-header">
                <h3 className="publication-title">{publication.title}</h3>
                <span className="publication-date">
                    {publication.publishedDate
                        ? formatDate(publication.publishedDate)
                        : formatDate(publication.createdAt)
                    }
                </span>
            </div>

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
                            href={publication.fileUrl}
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
