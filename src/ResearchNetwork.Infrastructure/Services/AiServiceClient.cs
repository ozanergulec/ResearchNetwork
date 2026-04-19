using System.Net.Http.Json;
using System.Text.Json;
using ResearchNetwork.Application.DTOs;
using ResearchNetwork.Application.Interfaces;

namespace ResearchNetwork.Infrastructure.Services;

public class AiServiceClient : IAiService
{
    private readonly HttpClient _httpClient;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public AiServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<float[]> GetEmbeddingAsync(string text)
    {
        var response = await _httpClient.PostAsJsonAsync("/api/embed", new AiEmbedRequest(text), JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AiEmbedResponse>(JsonOptions);
        return result?.Embedding ?? Array.Empty<float>();
    }

    public async Task<List<float[]>> GetBatchEmbeddingsAsync(List<string> texts)
    {
        var response = await _httpClient.PostAsJsonAsync("/api/embed-batch", new AiBatchEmbedRequest(texts), JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AiBatchEmbedResponse>(JsonOptions);
        return result?.Embeddings ?? new List<float[]>();
    }

    public async Task<string> SummarizeAsync(string text, int maxLength = 200, int minLength = 50)
    {
        var request = new AiSummarizeRequest(text, maxLength, minLength);
        var response = await _httpClient.PostAsJsonAsync("/api/summarize", request, JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AiSummarizeResponse>(JsonOptions);
        return result?.Summary ?? string.Empty;
    }

    public async Task<AiSimilarityResponse> CompareVectorsAsync(float[] vectorA, float[] vectorB)
    {
        var request = new AiSimilarityRequest(vectorA, vectorB);
        var response = await _httpClient.PostAsJsonAsync("/api/similarity/compare", request, JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AiSimilarityResponse>(JsonOptions);
        return result ?? new AiSimilarityResponse(0);
    }

    public async Task<AiPdfProcessResponse> ProcessPdfAsync(byte[] pdfBytes, string fileName)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pdfBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", fileName);

        var response = await _httpClient.PostAsync("/api/pdf/process", content);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AiPdfProcessResponse>(JsonOptions);
        return result!;
    }

    public async Task<AiCitationAnalysisResponse> AnalyzeCitationsAsync(string fullText)
    {
        var request = new AiCitationAnalysisRequest(fullText);
        var response = await _httpClient.PostAsJsonAsync("/api/citation/analyze", request, JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AiCitationAnalysisResponse>(JsonOptions);
        return result ?? new AiCitationAnalysisResponse(new List<AiCitationItem>());
    }

    public async Task<List<AiParsedReference>> ParseReferencesAsync(List<string> rawReferences)
    {
        var request = new AiParseReferencesRequest(rawReferences);
        var response = await _httpClient.PostAsJsonAsync("/api/pdf/parse-references", request, JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AiParseReferencesResponse>(JsonOptions);
        return result?.Parsed ?? new List<AiParsedReference>();
    }

    public async Task<List<string>> SuggestTagsAsync(string text, List<string> existingTags, int maxSuggestions = 6)
    {
        var request = new AiTagSuggestRequest(text, existingTags, maxSuggestions);
        var response = await _httpClient.PostAsJsonAsync("/api/tags/suggest", request, JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AiTagSuggestResponse>(JsonOptions);
        return result?.Suggested_tags ?? new List<string>();
    }

    public async Task<List<string>> SuggestTagsFromFileAsync(byte[] fileBytes, string fileName, List<string> existingTags, int maxSuggestions = 6)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", fileName);
        content.Add(new StringContent(string.Join(",", existingTags)), "existing_tags");
        content.Add(new StringContent(maxSuggestions.ToString()), "max_suggestions");

        var response = await _httpClient.PostAsync("/api/tags/suggest-from-file", content);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AiTagSuggestResponse>(JsonOptions);
        return result?.Suggested_tags ?? new List<string>();
    }

    // ==================== RAG ====================

    public async Task<RagIndexResponse> IndexArticleForRagAsync(string publicationId, string pdfText)
    {
        var request = new RagIndexRequest(publicationId, pdfText);
        var response = await _httpClient.PostAsJsonAsync("/api/rag/index", request, JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<RagIndexResponse>(JsonOptions);
        return result!;
    }

    public async Task<RagAskResponse> AskArticleQuestionAsync(
        string publicationId,
        string question,
        List<RagConversationTurn>? history = null)
    {
        var request = new RagAskRequest(publicationId, question, history);
        var response = await _httpClient.PostAsJsonAsync("/api/rag/ask", request, JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<RagAskResponse>(JsonOptions);
        return result!;
    }

    public async Task<RagStatusResponse> GetRagIndexStatusAsync(string publicationId)
    {
        var response = await _httpClient.GetAsync($"/api/rag/status/{publicationId}");
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<RagStatusResponse>(JsonOptions);
        return result!;
    }
}
