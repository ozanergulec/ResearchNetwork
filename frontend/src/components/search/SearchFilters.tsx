import React, { useRef, useEffect, useState } from 'react';
import { searchApi } from '../../services/searchService';
import { useTranslation } from '../../translations/translations';

type SortByType = 'default' | 'newest' | 'oldest' | 'rating' | 'cited';

export interface FilterState {
    institutionFilter: string;
    selectedTitles: string[];
    tagTextFilter: string;
    minRating: number;
    sortBy: SortByType;
}

interface SearchFiltersProps {
    activeTab: 'users' | 'publications' | 'tags';
    filters: FilterState;
    onInstitutionChange: (v: string) => void;
    onTitlesChange: (v: string[]) => void;
    onTagTextChange: (v: string) => void;
    onMinRatingChange: (v: number) => void;
    onSortByChange: (v: SortByType) => void;
    onResetFilters: () => void;
    onPageReset: () => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
    activeTab,
    filters,
    onInstitutionChange,
    onTitlesChange,
    onTagTextChange,
    onMinRatingChange,
    onSortByChange,
    onResetFilters,
    onPageReset,
}) => {
    const t = useTranslation();
    const [openFilter, setOpenFilter] = useState<string | null>(null);
    const [titleOptions, setTitleOptions] = useState<string[]>([]);
    const filterRef = useRef<HTMLDivElement>(null);

    const { institutionFilter, selectedTitles, tagTextFilter, minRating, sortBy } = filters;

    const hasActiveFilters =
        institutionFilter.length > 0 ||
        selectedTitles.length > 0 ||
        tagTextFilter.length > 0 ||
        minRating > 0 ||
        sortBy !== 'default';

    // Fetch distinct titles from backend once
    useEffect(() => {
        let cancelled = false;
        searchApi.getTitles()
            .then(res => {
                if (!cancelled) setTitleOptions(res.data || []);
            })
            .catch(err => console.error('Failed to load titles', err));
        return () => { cancelled = true; };
    }, []);

    // Close filter dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setOpenFilter(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleTitle = (item: string) => {
        const next = selectedTitles.includes(item)
            ? selectedTitles.filter(i => i !== item)
            : [...selectedTitles, item];
        onTitlesChange(next);
        onPageReset();
    };

    const renderTitleMultiSelect = () => {
        const isOpen = openFilter === 'title';
        return (
            <div
                className={`search-filter-chip ${selectedTitles.length > 0 ? 'active' : ''} ${isOpen ? 'open' : ''}`}
                onClick={() => setOpenFilter(isOpen ? null : 'title')}
            >
                {t.search.filterTitle}{selectedTitles.length > 0 && ` (${selectedTitles.length})`}
                <span className="filter-arrow">▼</span>
                {isOpen && (
                    <div className="search-filter-dropdown" onClick={e => e.stopPropagation()}>
                        {titleOptions.length === 0 ? (
                            <div className="search-filter-option" style={{ opacity: 0.6 }}>—</div>
                        ) : titleOptions.map(opt => (
                            <div
                                key={opt}
                                className="search-filter-option"
                                onClick={() => toggleTitle(opt)}
                            >
                                <span className={`search-filter-checkbox ${selectedTitles.includes(opt) ? 'checked' : ''}`}>
                                    {selectedTitles.includes(opt) && '✓'}
                                </span>
                                {opt}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="search-filters" ref={filterRef}>
                {(activeTab === 'users' || activeTab === 'tags') && (
                    <>
                        <input
                            type="text"
                            className="search-filter-input"
                            placeholder={t.search.filterInstitution}
                            value={institutionFilter}
                            onChange={e => { onInstitutionChange(e.target.value); onPageReset(); }}
                        />
                        {renderTitleMultiSelect()}
                    </>
                )}
                {(activeTab === 'publications' || activeTab === 'tags') && (
                    <>
                        <input
                            type="text"
                            className="search-filter-input"
                            placeholder={t.search.filterTags}
                            value={tagTextFilter}
                            onChange={e => { onTagTextChange(e.target.value); onPageReset(); }}
                        />
                        <select
                            className="search-filter-select"
                            value={minRating}
                            onChange={e => { onMinRatingChange(Number(e.target.value)); onPageReset(); }}
                        >
                            <option value={0}>{t.search.filterMinRating}: -</option>
                            {[1, 2, 3, 4, 5].map(n => (
                                <option key={n} value={n}>≥ {n}.0</option>
                            ))}
                        </select>
                        <select
                            className="search-filter-select"
                            value={sortBy}
                            onChange={e => { onSortByChange(e.target.value as SortByType); onPageReset(); }}
                        >
                            <option value="default">{t.search.filterSortBy}</option>
                            <option value="newest">{t.search.sortNewest}</option>
                            <option value="oldest">{t.search.sortOldest}</option>
                            <option value="rating">{t.search.sortHighestRating}</option>
                            <option value="cited">{t.search.sortMostCited}</option>
                        </select>
                    </>
                )}
                {hasActiveFilters && (
                    <button className="search-clear-filters" onClick={onResetFilters}>
                        ✕ {t.search.clearFilters}
                    </button>
                )}
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
                <div className="search-active-filters">
                    <span className="search-active-filter-label">{t.search.activeFilters}:</span>
                    {institutionFilter && (
                        <span className="search-active-filter-chip">
                            {t.search.filterInstitution}: {institutionFilter}
                            <span className="remove-filter" onClick={() => onInstitutionChange('')}>✕</span>
                        </span>
                    )}
                    {selectedTitles.map(title => (
                        <span key={title} className="search-active-filter-chip">
                            {title}
                            <span className="remove-filter" onClick={() => onTitlesChange(selectedTitles.filter(i => i !== title))}>✕</span>
                        </span>
                    ))}
                    {tagTextFilter && (
                        <span className="search-active-filter-chip">
                            {t.search.filterTags}: {tagTextFilter}
                            <span className="remove-filter" onClick={() => onTagTextChange('')}>✕</span>
                        </span>
                    )}
                    {minRating > 0 && (
                        <span className="search-active-filter-chip">
                            ≥ {minRating}.0
                            <span className="remove-filter" onClick={() => onMinRatingChange(0)}>✕</span>
                        </span>
                    )}
                    {sortBy !== 'default' && (
                        <span className="search-active-filter-chip">
                            {sortBy === 'newest' ? t.search.sortNewest : sortBy === 'oldest' ? t.search.sortOldest : sortBy === 'rating' ? t.search.sortHighestRating : t.search.sortMostCited}
                            <span className="remove-filter" onClick={() => onSortByChange('default')}>✕</span>
                        </span>
                    )}
                </div>
            )}
        </>
    );
};

export default SearchFilters;
