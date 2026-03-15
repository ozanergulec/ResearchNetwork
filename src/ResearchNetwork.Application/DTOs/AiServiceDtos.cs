namespace ResearchNetwork.Application.DTOs;

public record AiEmbedRequest(string Text);
public record AiEmbedResponse(float[] Embedding);

public record AiBatchEmbedRequest(List<string> Texts);
public record AiBatchEmbedResponse(List<float[]> Embeddings);

public record AiSummarizeRequest(string Text, int Max_length = 200, int Min_length = 50);
public record AiSummarizeResponse(string Summary);

public record AiSimilarityRequest(float[] Vector_a, float[] Vector_b);
public record AiSimilarityResponse(double Cosine_similarity);

public record AiPdfProcessResponse(
    string Full_text,
    string? Abstract,
    List<string> Keywords,
    List<string> References,
    string Summary,
    float[] Embedding
);

public record SimilarPublicationDto(
    Guid PublicationId,
    string Title,
    string? Abstract,
    List<string> Tags,
    UserSummaryDto Author,
    double Similarity
);
