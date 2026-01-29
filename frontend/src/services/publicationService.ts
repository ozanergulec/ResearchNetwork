import api from './apiClient';

// Types
export interface Publication {
    id: string;
    title: string;
    abstract?: string;
    doi?: string;
    publishedDate?: string;
    keywords: string[];
    authorId: string;
    createdAt: string;
}

// Publications API
export const publicationsApi = {
    getAll: () =>
        api.get<Publication[]>('/publications'),

    getById: (id: string) =>
        api.get<Publication>(`/publications/${id}`),

    getByAuthor: (authorId: string) =>
        api.get<Publication[]>(`/publications/author/${authorId}`),

    create: (data: Partial<Publication>) =>
        api.post<Publication>('/publications', data),

    delete: (id: string) =>
        api.delete(`/publications/${id}`),
};
