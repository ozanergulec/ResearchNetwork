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

