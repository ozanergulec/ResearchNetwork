import React from 'react';
import { API_SERVER_URL } from '../../services/apiClient';
import type { Publication } from '../../services/publicationService';
import { useTranslation } from '../../translations/translations';

interface SearchPublicationCardProps {
    publication: Publication;
    onPublicationClick: (pub: Publication) => void;
    onAuthorClick: (authorId: string) => void;
}

const getImageUrl = (url?: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_SERVER_URL}${url}`;
};

const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const truncateAbstract = (text?: string | null, maxLength = 150) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
};

const SearchPublicationCard: React.FC<SearchPublicationCardProps> = React.memo(
    ({ publication: pub, onPublicationClick, onAuthorClick }) => {
        const t = useTranslation();

        return (
            <div
                className="search-pub-card"
                onClick={() => onPublicationClick(pub)}
            >
                <h3 className="search-pub-title">{pub.title}</h3>
                {pub.abstract && (
                    <p className="search-pub-abstract">
                        {truncateAbstract(pub.abstract)}
                    </p>
                )}
                <div className="search-pub-footer">
                    <div
                        className="search-pub-author"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAuthorClick(pub.author.id);
                        }}
                    >
                        {pub.author.profileImageUrl ? (
                            <img
                                src={getImageUrl(pub.author.profileImageUrl)!}
                                alt={pub.author.fullName}
                                className="search-pub-author-avatar"
                            />
                        ) : (
                            <div className="search-pub-author-placeholder">
                                {getInitials(pub.author.fullName)}
                            </div>
                        )}
                        <span>{pub.author.fullName}</span>
                    </div>
                    <div className="search-pub-stats">
                        {pub.averageRating > 0 && (
                            <span className="search-pub-stat">
                                ⭐ {pub.averageRating.toFixed(1)}
                            </span>
                        )}
                        {pub.citationCount > 0 && (
                            <span className="search-pub-stat">
                                {t.search.citations}: {pub.citationCount}
                            </span>
                        )}
                        {pub.saveCount > 0 && (
                            <span className="search-pub-stat">
                                {t.search.saved}: {pub.saveCount}
                            </span>
                        )}
                    </div>
                </div>
                {pub.tags && pub.tags.length > 0 && (
                    <div className="search-pub-tags">
                        {pub.tags.map((tag, i) => (
                            <span key={i} className="search-pub-tag">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    }
);

export default SearchPublicationCard;
