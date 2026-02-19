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
    isSaved: boolean;
    isShared: boolean;
    userRating: number | null;
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

// Update Publication DTO
export interface UpdatePublicationDto {
    title: string;
    abstract?: string;
    doi?: string;
    publishedDate?: string;
    tags?: string[];
}

// Paged Result Interface (for feed pagination)
export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// Shared Publication Interface
export interface SharedPublication {
    shareId: string;
    sharedBy: UserSummary;
    note: string | null;
    sharedAt: string;
    publication: Publication;
}

// Feed Item (discriminated union)
export interface FeedItem {
    type: 'publication' | 'share';
    publication: Publication | null;
    sharedPublication: SharedPublication | null;
}

// Publications API
export const publicationsApi = {
    getAll: () =>
        api.get<Publication[]>('/publications'),

    getFeed: (page: number = 1, pageSize: number = 10) =>
        api.get<PagedResult<FeedItem>>(`/publications/feed?page=${page}&pageSize=${pageSize}`),

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

    update: (id: string, data: UpdatePublicationDto) =>
        api.put<Publication>(`/publications/${id}`, data),

    delete: (id: string) =>
        api.delete(`/publications/${id}`),

    // --- Rating ---
    rate: (publicationId: string, score: number) =>
        api.post<{ averageRating: number; userRating: number }>(
            `/publications/${publicationId}/rate`,
            { score }
        ),

    // --- Save/Bookmark ---
    toggleSave: (publicationId: string) =>
        api.post<{ saved: boolean; saveCount: number }>(
            `/publications/${publicationId}/save`
        ),

    getSaved: () =>
        api.get<Publication[]>('/publications/saved'),

    // --- Share ---
    share: (publicationId: string, note?: string) =>
        api.post<{ shared: boolean; shareCount: number }>(
            `/publications/${publicationId}/share`,
            { note: note || null }
        ),

    getShared: (userId: string) =>
        api.get<SharedPublication[]>(`/publications/shared/${userId}`),

    updateShareNote: (publicationId: string, note?: string) =>
        api.put<{ updated: boolean }>(
            `/publications/${publicationId}/share`,
            { note: note || null }
        ),

    unshare: (publicationId: string) =>
        api.delete<{ shared: boolean; shareCount: number }>(
            `/publications/${publicationId}/share`
        ),

    /**
     * Centralized function to handle the two-phase process:
     * 1. Upload file to server
     * 2. Create publication with the returned file URL
     * 
     * Provides better error handling and encapsulation of the async flow.
     */
    createPublicationWithFile: async (
        file: File,
        data: Omit<CreatePublicationDto, 'fileUrl'>
    ): Promise<Publication> => {
        let fileUrl: string | undefined;

        try {
            // Phase 1: Upload file
            const uploadResponse = await publicationsApi.uploadFile(file);
            fileUrl = uploadResponse.data.fileUrl;

            // Phase 2: Create publication with file URL
            const publicationData: CreatePublicationDto = {
                ...data,
                fileUrl,
            };

            const createResponse = await publicationsApi.create(publicationData);
            return createResponse.data;
        } catch (error: any) {
            // Enhanced error handling with phase-specific messages
            if (error.response) {
                const phase = fileUrl ? 'creating publication' : 'uploading file';
                const message = error.response.data?.message
                    || error.response.data
                    || `Error ${phase}`;

                throw new Error(typeof message === 'string' ? message : `Failed ${phase}`);
            }

            throw error;
        }
    },
};
