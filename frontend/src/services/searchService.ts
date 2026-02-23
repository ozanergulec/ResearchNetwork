import api from './apiClient';
import type { UserSummary, Publication } from './publicationService';

export interface TagSearchResult {
    publications: Publication[];
    users: UserSummary[];
}

// Search API
export const searchApi = {
    searchUsers: (query: string) =>
        api.get<UserSummary[]>(`/search/users?q=${encodeURIComponent(query)}`),

    searchPublications: (query: string) =>
        api.get<Publication[]>(`/search/publications?q=${encodeURIComponent(query)}`),

    searchByTag: (tag: string) =>
        api.get<TagSearchResult>(`/search/by-tag?tag=${encodeURIComponent(tag)}`),
};
