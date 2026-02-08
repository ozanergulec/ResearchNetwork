import React from 'react';
import type { Publication } from '../../services/publicationService';
import PublicationCard from './PublicationCard';
import '../../styles/PublicationComponents.css';

interface PublicationsListProps {
    publications: Publication[];
    showAll?: boolean;
    onToggleShowAll?: () => void;
    maxPreview?: number;
    currentUserId?: string;
    onDelete?: (id: string) => void;
}

const PublicationsList: React.FC<PublicationsListProps> = ({
    publications,
    showAll = false,
    onToggleShowAll,
    maxPreview = 3,
    currentUserId,
    onDelete
}) => {
    const displayedPublications = showAll
        ? publications
        : publications.slice(0, maxPreview);

    const hasMore = publications.length > maxPreview;

    if (publications.length === 0) {
        return (
            <div className="publications-empty">
                <p>Henüz yayın eklenmemiş.</p>
            </div>
        );
    }

    return (
        <div className="publications-list">
            <div className="publications-grid">
                {displayedPublications.map((publication) => (
                    <PublicationCard
                        key={publication.id}
                        publication={publication}
                        currentUserId={currentUserId}
                        onDelete={onDelete}
                    />
                ))}
            </div>

            {hasMore && onToggleShowAll && (
                <div className="publications-toggle">
                    <button
                        className="toggle-button"
                        onClick={onToggleShowAll}
                    >
                        {showAll ? 'Daha Az Göster' : 'Tümünü Gör'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PublicationsList;
