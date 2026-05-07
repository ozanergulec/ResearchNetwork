import api from './apiClient';
import type { UserSummary, Publication } from './publicationService';

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface TagSearchResult {
    publications: PagedResult<Publication>;
    users: PagedResult<UserSummary>;
}

export interface UserSearchFilters {
    institution?: string;
    titles?: string[];
}

export interface PublicationSearchFilters {
    tag?: string;
    minRating?: number;
    sortBy?: string;
}

export interface TagSearchFilters extends UserSearchFilters {
    tagFilter?: string;
    minRating?: number;
    sortBy?: string;
}

const buildFilterQuery = (filters: Record<string, unknown>): string => {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value)) {
            for (const v of value) {
                if (v !== undefined && v !== null && v !== '') {
                    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
                }
            }
        } else {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
    }
    return parts.length ? `&${parts.join('&')}` : '';
};

// Search API
export const searchApi = {
    searchUsers: (query: string, page = 1, pageSize = 10, filters: UserSearchFilters = {}) =>
        api.get<PagedResult<UserSummary>>(
            `/search/users?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}` +
                buildFilterQuery({ institution: filters.institution, title: filters.titles })
        ),

    searchPublications: (query: string, page = 1, pageSize = 10, filters: PublicationSearchFilters = {}) =>
        api.get<PagedResult<Publication>>(
            `/search/publications?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}` +
                buildFilterQuery({ tag: filters.tag, minRating: filters.minRating, sortBy: filters.sortBy })
        ),

    searchByTag: (tag: string, page = 1, pageSize = 10, filters: TagSearchFilters = {}) =>
        api.get<TagSearchResult>(
            `/search/by-tag?tag=${encodeURIComponent(tag)}&page=${page}&pageSize=${pageSize}` +
                buildFilterQuery({
                    institution: filters.institution,
                    title: filters.titles,
                    tagFilter: filters.tagFilter,
                    minRating: filters.minRating,
                    sortBy: filters.sortBy,
                })
        ),

    getTitles: () => api.get<string[]>('/search/titles'),
};
