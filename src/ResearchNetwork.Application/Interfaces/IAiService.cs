using ResearchNetwork.Application.DTOs;

namespace ResearchNetwork.Application.Interfaces;

public interface IAiService
{
    Task<float[]> GetEmbeddingAsync(string text);
    Task<List<float[]>> GetBatchEmbeddingsAsync(List<string> texts);
    Task<string> SummarizeAsync(string text, int maxLength = 200, int minLength = 50);
    Task<AiSimilarityResponse> CompareVectorsAsync(float[] vectorA, float[] vectorB);
    Task<AiPdfProcessResponse> ProcessPdfAsync(byte[] pdfBytes, string fileName);
    Task<AiCitationAnalysisResponse> AnalyzeCitationsAsync(string fullText);
    Task<List<AiParsedReference>> ParseReferencesAsync(List<string> rawReferences);
    Task<List<string>> SuggestTagsAsync(string text, List<string> existingTags, int maxSuggestions = 6);
    Task<List<string>> SuggestTagsFromFileAsync(byte[] fileBytes, string fileName, List<string> existingTags, int maxSuggestions = 6);

    // RAG
    Task<RagIndexResponse> IndexArticleForRagAsync(string publicationId, string pdfText);
    Task<RagAskResponse> AskArticleQuestionAsync(
        string publicationId,
        string question,
        List<RagConversationTurn>? history = null);
    Task<RagStatusResponse> GetRagIndexStatusAsync(string publicationId);
}
