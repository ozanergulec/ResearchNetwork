import api from './apiClient';
import type { Tag } from './userService';

// Tags API
export const tagsApi = {
    // Get all tags
    getAll: () =>
        api.get<Tag[]>('/tags'),

    // Search tags by query
    search: (query: string) =>
        api.get<Tag[]>(`/tags/search?query=${encodeURIComponent(query)}`),
};
