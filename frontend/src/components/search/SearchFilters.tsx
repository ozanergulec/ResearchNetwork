import React, { useRef, useEffect } from 'react';
import type { UserSummary, Publication } from '../../services/publicationService';
import { useTranslation } from '../../translations/translations';

type SortByType = 'default' | 'newest' | 'oldest' | 'rating' | 'cited';

export interface FilterState {
    selectedInstitutions: string[];
    selectedTitles: string[];
    selectedTags: string[];
    minRating: number;
    sortBy: SortByType;
}

interface SearchFiltersProps {
    activeTab: 'users' | 'publications' | 'tags';
    filters: FilterState;
    users: UserSummary[];
    tagUsers: UserSummary[];
    publications: Publication[];
    tagPublications: Publication[];
    onInstitutionsChange: (v: string[]) => void;
    onTitlesChange: (v: string[]) => void;
    onTagsChange: (v: string[]) => void;
    onMinRatingChange: (v: number) => void;
    onSortByChange: (v: SortByType) => void;
    onResetFilters: () => void;
    onPageReset: () => void;
}

// Get unique filter options from search results
const getUniqueInstitutions = (userList: UserSummary[]) =>
    [...new Set(userList.map(u => u.institution).filter(Boolean))] as string[];

const getUniqueTitles = (userList: UserSummary[]) =>
    [...new Set(userList.map(u => u.title).filter(Boolean))] as string[];

const getUniqueTags = (pubList: Publication[]) =>
    [...new Set(pubList.flatMap(p => p.tags || []))];

const SearchFilters: React.FC<SearchFiltersProps> = ({
    activeTab,
    filters,
    users,
    tagUsers,
    publications,
    tagPublications,
    onInstitutionsChange,
    onTitlesChange,
    onTagsChange,
    onMinRatingChange,
    onSortByChange,
    onResetFilters,
    onPageReset,
}) => {
    const t = useTranslation();
    const [openFilter, setOpenFilter] = React.useState<string | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    const { selectedInstitutions, selectedTitles, selectedTags, minRating, sortBy } = filters;

    const hasActiveFilters =
        selectedInstitutions.length > 0 ||
        selectedTitles.length > 0 ||
        selectedTags.length > 0 ||
        minRating > 0 ||
        sortBy !== 'default';

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

    const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
        setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
        onPageReset();
    };

    const renderMultiSelect = (
        id: string,
        label: string,
        options: string[],
        selected: string[],
        setSelected: (v: string[]) => void
    ) => {
        if (options.length === 0) return null;
        const isOpen = openFilter === id;
        return (
            <div
                className={`search-filter-chip ${selected.length > 0 ? 'active' : ''} ${isOpen ? 'open' : ''}`}
                onClick={() => setOpenFilter(isOpen ? null : id)}
            >
                {label}{selected.length > 0 && ` (${selected.length})`}
                <span className="filter-arrow">▼</span>
                {isOpen && (
                    <div className="search-filter-dropdown" onClick={e => e.stopPropagation()}>
                        {options.map(opt => (
                            <div
                                key={opt}
                                className="search-filter-option"
                                onClick={() => toggleItem(selected, setSelected, opt)}
                            >
                                <span className={`search-filter-checkbox ${selected.includes(opt) ? 'checked' : ''}`}>
                                    {selected.includes(opt) && '✓'}
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
                        {renderMultiSelect(
                            'institution',
                            t.search.filterInstitution,
                            getUniqueInstitutions(activeTab === 'users' ? users : tagUsers),
                            selectedInstitutions,
                            onInstitutionsChange
                        )}
                        {renderMultiSelect(
                            'title',
                            t.search.filterTitle,
                            getUniqueTitles(activeTab === 'users' ? users : tagUsers),
                            selectedTitles,
                            onTitlesChange
                        )}
                    </>
                )}
                {(activeTab === 'publications' || activeTab === 'tags') && (
                    <>
                        {renderMultiSelect(
                            'tags',
                            t.search.filterTags,
                            getUniqueTags(activeTab === 'publications' ? publications : tagPublications),
                            selectedTags,
                            onTagsChange
                        )}
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
                    {selectedInstitutions.map(inst => (
                        <span key={inst} className="search-active-filter-chip">
                            {inst}
                            <span className="remove-filter" onClick={() => onInstitutionsChange(selectedInstitutions.filter(i => i !== inst))}>✕</span>
                        </span>
                    ))}
                    {selectedTitles.map(title => (
                        <span key={title} className="search-active-filter-chip">
                            {title}
                            <span className="remove-filter" onClick={() => onTitlesChange(selectedTitles.filter(i => i !== title))}>✕</span>
                        </span>
                    ))}
                    {selectedTags.map(tag => (
                        <span key={tag} className="search-active-filter-chip">
                            {tag}
                            <span className="remove-filter" onClick={() => onTagsChange(selectedTags.filter(i => i !== tag))}>✕</span>
                        </span>
                    ))}
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
