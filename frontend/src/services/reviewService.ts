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
    reviewScore: number | null;
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

// Suggested Reviewer from AI-powered hybrid matching
export interface SuggestedReviewer {
    userId: string;
    fullName: string;
    title: string | null;
    institution: string | null;
    department: string | null;
    profileImageUrl: string | null;
    isVerified: boolean;
    similarity: number;
    commonTags: string[];
    completedReviews: number;
    isRecommended: boolean;
}

// Review API
export const reviewApi = {
    // Toggle "looking for reviewers" on a publication
    toggleReviewSearch: (publicationId: string) =>
        api.put<{ isLookingForReviewers: boolean }>(`/review/publication/${publicationId}/toggle-search`),

    // Get publications looking for reviewers (paginated)
    getLookingForReviewers: (page: number = 1, pageSize: number = 10) =>
        api.get<{ items: ReviewablePublication[]; totalCount: number; page: number; pageSize: number; hasMore: boolean }>(`/review/looking-for-reviewers?page=${page}&pageSize=${pageSize}`),

    // Get a single reviewable publication by id (used for notification-driven highlights)
    getReviewablePublication: (publicationId: string) =>
        api.get<ReviewablePublication>(`/review/looking-for-reviewers/${publicationId}`),

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

    // Get a specific review request by ID
    getReviewRequest: (requestId: string) =>
        api.get<ReviewRequest>(`/review/${requestId}`),

    // Get review requests for a specific publication
    getPublicationReviewRequests: (publicationId: string) =>
        api.get<ReviewRequest[]>(`/review/publication/${publicationId}`),

    // Get my publications for review management
    getMyPublications: () =>
        api.get<MyPublicationForReview[]>('/review/my-publications'),

    // Check if current user is eligible to review
    canReview: () =>
        api.get<{ canReview: boolean }>('/review/can-review'),

    // Rate a completed review (1-5)
    rateReview: (requestId: string, score: number) =>
        api.put<{ message: string; score: number }>(`/review/${requestId}/rate`, { score }),

    // Get reviewer's average score
    getReviewerScore: (userId: string) =>
        api.get<{ reviewerAvgScore: number; totalCompletedReviews: number }>(`/review/reviewer/${userId}/score`),

    // Get suggested reviewers for a publication (AI-powered hybrid matching)
    suggestReviewers: (publicationId: string) =>
        api.get<SuggestedReviewer[]>(`/ai/publications/${publicationId}/suggest-reviewers`),

    // Send review invitation to a suggested reviewer
    inviteReviewer: (publicationId: string, reviewerId: string) =>
        api.post<{ message: string; isRecommended: boolean }>(`/review/publication/${publicationId}/invite-reviewer`, { reviewerId }),
};
