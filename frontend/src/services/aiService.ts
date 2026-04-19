import api from './apiClient';

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface ResearcherMatch {
    userId: string;
    fullName: string;
    title?: string;
    institution?: string;
    department?: string;
    profileImageUrl?: string;
    isVerified: boolean;
    similarity: number;
    commonTags: string[];
}

export interface SimilarPublication {
    publicationId: string;
    title: string;
    abstract?: string;
    tags: string[];
    author: {
        id: string;
        fullName: string;
        title?: string;
        institution?: string;
        profileImageUrl?: string;
        coverImageUrl?: string;
        isVerified: boolean;
    };
    similarity: number;
}

export interface CitationAnalysisItem {
    sentence: string;
    citationNumbers: number[];
    citationLabels: string[];
    intent: string;
    confidence: number;
}

export interface CitationGraphNode {
    id: string;
    title: string;
    type: 'source' | 'reference';
}

export interface CitationGraphEdge {
    source: string;
    target: string;
    intent?: string;
    confidence?: number;
}

export interface CitationGraph {
    nodes: CitationGraphNode[];
    edges: CitationGraphEdge[];
}

export interface AutoCitationMatch {
    matchedPublicationId: string;
    matchedTitle: string;
    matchMethod: string;
    confidence: number;
}

export interface AutoCitationResult {
    totalReferences: number;
    matchedCount: number;
    matches: AutoCitationMatch[];
}

export interface PdfProcessResult {
    abstract?: string;
    keywords: string[];
    summary: string;
    referenceCount: number;
}

export const aiApi = {
    getResearcherMatches: (userId: string, page: number = 1, pageSize: number = 12) =>
        api.get<PagedResult<ResearcherMatch>>(
            `/ai/researchers/${userId}/matches?page=${page}&pageSize=${pageSize}`
        ),

    getTagResearcherMatches: (userId: string, page: number = 1, pageSize: number = 12) =>
        api.get<PagedResult<ResearcherMatch>>(
            `/ai/researchers/${userId}/tag-matches?page=${page}&pageSize=${pageSize}`
        ),

    getSimilarPublications: (publicationId: string, topK: number = 5) =>
        api.get<SimilarPublication[]>(`/ai/publications/${publicationId}/similar?topK=${topK}`),

    getReviewerPublicationScores: (publicationIds: string[]) =>
        api.post<Record<string, number>>('/ai/reviewer/publication-scores', publicationIds),

    summarizePublication: (publicationId: string) =>
        api.post<{ summary: string }>(`/ai/publications/${publicationId}/summarize`),

    processPdf: (publicationId: string) =>
        api.post<PdfProcessResult>(`/ai/publications/${publicationId}/process-pdf`),

    getCitationAnalysis: (publicationId: string) =>
        api.get<CitationAnalysisItem[]>(`/ai/publications/${publicationId}/citation-analysis`),

    analyzeCitations: (publicationId: string) =>
        api.post<CitationAnalysisItem[]>(`/ai/publications/${publicationId}/analyze-citations?force=true`),

    getCitationGraph: (publicationId: string) =>
        api.get<CitationGraph>(`/ai/publications/${publicationId}/citation-graph`),

    autoCite: (publicationId: string) =>
        api.post<AutoCitationResult>(`/ai/publications/${publicationId}/auto-cite`),

    suggestTags: (text: string, existingTags: string[] = [], maxSuggestions: number = 6) =>
        api.post<string[]>('/ai/suggest-tags', { text, existingTags, maxSuggestions }),

    suggestTagsFromFile: (file: File, existingTags: string[] = [], maxSuggestions: number = 6) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('existingTags', existingTags.join(','));
        formData.append('maxSuggestions', maxSuggestions.toString());
        return api.post<string[]>('/ai/suggest-tags-from-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    // ==================== RAG — Article Chat ====================

    indexArticleForRag: (publicationId: string) =>
        api.post<{ chunkCount: number; status: string }>(
            `/ai/publications/${publicationId}/rag/index`
        ),

    askArticleQuestion: (
        publicationId: string,
        question: string,
        history?: Array<{ role: 'user' | 'assistant'; content: string }>
    ) =>
        api.post<{
            answer: string;
            sources: Array<{ chunkIndex: number; text: string; score: number }>;
            fromCache: boolean;
        }>(`/ai/publications/${publicationId}/rag/ask`, {
            question,
            history: history && history.length > 0 ? history : undefined,
        }),

    getRagIndexStatus: (publicationId: string) =>
        api.get<{ isIndexed: boolean }>(
            `/ai/publications/${publicationId}/rag/status`
        ),
};
