import api from './apiClient';

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
    getResearcherMatches: (userId: string, topK: number = 10) =>
        api.get<ResearcherMatch[]>(`/ai/researchers/${userId}/matches?topK=${topK}`),

    getSimilarPublications: (publicationId: string, topK: number = 5) =>
        api.get<SimilarPublication[]>(`/ai/publications/${publicationId}/similar?topK=${topK}`),

    summarizePublication: (publicationId: string) =>
        api.post<{ summary: string }>(`/ai/publications/${publicationId}/summarize`),

    processPdf: (publicationId: string) =>
        api.post<PdfProcessResult>(`/ai/publications/${publicationId}/process-pdf`),

    getCitationAnalysis: (publicationId: string) =>
        api.get<CitationAnalysisItem[]>(`/ai/publications/${publicationId}/citation-analysis`),

    analyzeCitations: (publicationId: string) =>
        api.post<CitationAnalysisItem[]>(`/ai/publications/${publicationId}/analyze-citations`),

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

    askArticleQuestion: (publicationId: string, question: string) =>
        api.post<{
            answer: string;
            sources: Array<{ chunkIndex: number; text: string; score: number }>;
            fromCache: boolean;
        }>(`/ai/publications/${publicationId}/rag/ask`, { question }),

    getRagIndexStatus: (publicationId: string) =>
        api.get<{ isIndexed: boolean }>(
            `/ai/publications/${publicationId}/rag/status`
        ),
};
