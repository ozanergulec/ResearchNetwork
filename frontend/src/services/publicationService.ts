import api from './apiClient';

// User Summary Interface (matches backend)
export interface UserSummary {
    id: string;
    fullName: string;
    title?: string;
    institution?: string;
    profileImageUrl?: string;
    isVerified: boolean;
}

// Publication Interface (matches backend PublicationDto)
export interface Publication {
    id: string;
    title: string;
    abstract?: string;
    doi?: string;
    fileUrl?: string;
    publishedDate?: string;
    tags: string[];
    author: UserSummary;
    averageRating: number;
    citationCount: number;
    saveCount: number;
    shareCount: number;
    createdAt: string;
}

// Create Publication DTO
export interface CreatePublicationDto {
    title: string;
    abstract?: string;
    doi?: string;
    fileUrl?: string;
    publishedDate?: string;
    tags?: string[];
}

// Publications API
export const publicationsApi = {
    getAll: () =>
        api.get<Publication[]>('/publications'),

    getById: (id: string) =>
        api.get<Publication>(`/publications/${id}`),

    getByAuthor: (authorId: string) =>
        api.get<Publication[]>(`/publications/author/${authorId}`),

    getLatestByAuthor: (authorId: string, count: number = 3) =>
        api.get<Publication[]>(`/publications/author/${authorId}/latest?count=${count}`),

    uploadFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<{ fileUrl: string }>('/publications/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    create: (data: CreatePublicationDto) =>
        api.post<Publication>('/publications', data),

    delete: (id: string) =>
        api.delete(`/publications/${id}`),
};

