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
}
