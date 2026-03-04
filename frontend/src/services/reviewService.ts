import api from './apiClient';
import type { UserSummary } from './publicationService';

// Review Request Interface
export interface ReviewRequest {
    id: string;
    publicationId: string;
    publicationTitle: string;
    author: UserSummary;
    reviewer: UserSummary;
    status: 'Pending' | 'Accepted' | 'Completed' | 'Rejected';
    message: string | null;
    reviewComment: string | null;
    verdict: 'Approve' | 'MinorRevision' | 'MajorRevision' | 'Reject' | null;
    createdAt: string;
    updatedAt: string | null;
}

// Publication looking for reviewers
export interface ReviewablePublication {
    id: string;
    title: string;
    abstract: string | null;
    publishedDate: string | null;
    tags: string[];
    author: UserSummary;
    reviewRequestCount: number;
    hasApplied: boolean;
    isOwner: boolean;
}

// My publication for review management
export interface MyPublicationForReview {
    id: string;
    title: string;
    abstract: string | null;
    isLookingForReviewers: boolean;
    createdAt: string;
    reviewRequestCount: number;
}

// Review API
export const reviewApi = {
    // Toggle "looking for reviewers" on a publication
    toggleReviewSearch: (publicationId: string) =>
        api.put<{ isLookingForReviewers: boolean }>(`/review/publication/${publicationId}/toggle-search`),

    // Get publications looking for reviewers (paginated)
    getLookingForReviewers: (page: number = 1, pageSize: number = 10) =>
        api.get<{ items: ReviewablePublication[]; totalCount: number; page: number; pageSize: number; hasMore: boolean }>(`/review/looking-for-reviewers?page=${page}&pageSize=${pageSize}`),

    // Apply to review a publication
    applyToReview: (publicationId: string, message?: string) =>
        api.post<{ message: string }>(`/review/${publicationId}/apply`, { message: message || null }),

    // Accept a reviewer
    acceptReviewer: (requestId: string) =>
        api.put<{ message: string }>(`/review/${requestId}/accept`),

    // Reject a reviewer
    rejectReviewer: (requestId: string) =>
        api.put<{ message: string }>(`/review/${requestId}/reject`),

    // Submit a review
    submitReview: (requestId: string, reviewComment: string, verdict: string) =>
        api.put<{ message: string }>(`/review/${requestId}/submit`, { reviewComment, verdict }),

    // Get my review applications
    getMyRequests: () =>
        api.get<ReviewRequest[]>('/review/my-requests'),

    // Get review requests for a specific publication
    getPublicationReviewRequests: (publicationId: string) =>
        api.get<ReviewRequest[]>(`/review/publication/${publicationId}`),

    // Get my publications for review management
    getMyPublications: () =>
        api.get<MyPublicationForReview[]>('/review/my-publications'),

    // Check if current user is eligible to review
    canReview: () =>
        api.get<{ canReview: boolean }>('/review/can-review'),
};
