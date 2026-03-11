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

// Search API
export const searchApi = {
    searchUsers: (query: string, page = 1, pageSize = 10) =>
        api.get<PagedResult<UserSummary>>(
            `/search/users?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`
        ),

    searchPublications: (query: string, page = 1, pageSize = 10) =>
        api.get<PagedResult<Publication>>(
            `/search/publications?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`
        ),

    searchByTag: (tag: string, page = 1, pageSize = 10) =>
        api.get<TagSearchResult>(
            `/search/by-tag?tag=${encodeURIComponent(tag)}&page=${page}&pageSize=${pageSize}`
        ),
};
