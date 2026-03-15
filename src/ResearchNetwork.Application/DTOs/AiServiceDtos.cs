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

public record ResearcherMatchDto(
    Guid UserId,
    string FullName,
    string? Title,
    string? Institution,
    string? Department,
    string? ProfileImageUrl,
    bool IsVerified,
    double Similarity,
    List<string> CommonTags
);

public record PdfProcessResultDto(
    string? Abstract,
    List<string> Keywords,
    string Summary,
    int ReferenceCount
);

public record AiCitationAnalysisRequest(string Full_text);

public record AiCitationItem(
    string Sentence,
    List<int> Citation_numbers,
    string Intent,
    double Confidence
);

public record AiCitationAnalysisResponse(List<AiCitationItem> Citations);

public record CitationAnalysisDto(
    string Sentence,
    List<int> CitationNumbers,
    string Intent,
    double Confidence
);

public record CitationGraphNodeDto(
    Guid Id,
    string Title,
    string Type
);

public record CitationGraphEdgeDto(
    Guid Source,
    Guid Target,
    string? Intent,
    double? Confidence
);

public record CitationGraphDto(
    List<CitationGraphNodeDto> Nodes,
    List<CitationGraphEdgeDto> Edges
);

// Reference parsing
public record AiParsedReference(
    string Raw,
    string? Title,
    string? Doi,
    int? Year,
    string? Authors
);

public record AiParseReferencesRequest(List<string> References);
public record AiParseReferencesResponse(List<AiParsedReference> Parsed);

// Auto-citation result
public record AutoCitationMatchDto(
    Guid MatchedPublicationId,
    string MatchedTitle,
    string MatchMethod,
    double Confidence
);

public record AutoCitationResultDto(
    int TotalReferences,
    int MatchedCount,
    List<AutoCitationMatchDto> Matches
);
