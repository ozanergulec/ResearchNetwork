import React from 'react';
import type { Publication } from '../../services/publicationService';
import PublicationCard from './PublicationCard';
import '../../styles/publications/PublicationsList.css';

interface PublicationsListProps {
    publications: Publication[];
    showAll?: boolean;
    onToggleShowAll?: () => void;
    maxPreview?: number;
    currentUserId?: string;
    onDelete?: (id: string) => void;
    showAuthor?: boolean;
    onUnshare?: (id: string) => void;
}

const PublicationsList: React.FC<PublicationsListProps> = ({
    publications,
    showAll = false,
    onToggleShowAll,
    maxPreview = 3,
    currentUserId,
    onDelete,
    showAuthor,
    onUnshare
}) => {
    const displayedPublications = showAll
        ? publications
        : publications.slice(0, maxPreview);

    const hasMore = publications.length > maxPreview;

    if (publications.length === 0) {
        return (
            <div className="publications-empty">
                <p>No publications added yet.</p>
            </div>
        );
    }

    return (
        <div className="publications-list">
            <div className="publications-grid">
                {displayedPublications.map((publication) => {
                    const isSharedPost = currentUserId ? publication.author.id !== currentUserId : false;
                    return (
                        <PublicationCard
                            key={`${publication.id}-${isSharedPost ? 'shared' : 'own'}`}
                            publication={publication}
                            currentUserId={currentUserId}
                            onDelete={onDelete}
                            showAuthor={isSharedPost || showAuthor}
                            isSharedPost={isSharedPost}
                            onUnshare={isSharedPost ? onUnshare : undefined}
                        />
                    );
                })}
            </div>

            {hasMore && onToggleShowAll && (
                <div className="publications-toggle">
                    <button
                        className="toggle-button"
                        onClick={onToggleShowAll}
                    >
                        {showAll ? 'Show Less' : 'View All'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PublicationsList;
