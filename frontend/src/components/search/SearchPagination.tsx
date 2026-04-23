import React from 'react';
import { useTranslation } from '../../translations/translations';

interface SearchPaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

const SearchPagination: React.FC<SearchPaginationProps> = React.memo(
    ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
        const t = useTranslation();
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages <= 1) return null;

        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);

        // Build page numbers with ellipsis
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }

        return (
            <div className="search-pagination">
                <span className="search-pagination-info">
                    {startItem}-{endItem} / {totalItems}
                </span>
                <div className="search-pagination-controls">
                    <button
                        className="search-pagination-btn"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        ‹ {t.search.previous}
                    </button>
                    {pages.map((page, idx) =>
                        typeof page === 'string' ? (
                            <span key={`ellipsis-${idx}`} className="search-pagination-ellipsis">...</span>
                        ) : (
                            <button
                                key={page}
                                className={`search-pagination-page ${currentPage === page ? 'active' : ''}`}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </button>
                        )
                    )}
                    <button
                        className="search-pagination-btn"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        {t.search.next} ›
                    </button>
                </div>
            </div>
        );
    }
);

export default SearchPagination;
