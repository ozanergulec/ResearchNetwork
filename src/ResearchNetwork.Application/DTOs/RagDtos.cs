namespace ResearchNetwork.Application.DTOs;

// RAG Index
public record RagIndexRequest(string Publication_id, string Pdf_text);
public record RagIndexResponse(string Publication_id, int Chunk_count, string Status);

// RAG Ask
public record RagAskRequest(string Publication_id, string Question);

public record RagSourceChunk(int Chunk_index, string Text, float Score);

public record RagAskResponse(string Answer, List<RagSourceChunk> Sources, bool From_cache);

// RAG Status
public record RagStatusResponse(string Publication_id, bool Is_indexed);

// RAG Delete
public record RagDeleteResponse(string Publication_id, int Deleted_chunks, string Status);

// Frontend-facing DTOs (camelCase mapping)
public record ArticleChatRequest(string Question);

public record ArticleChatResponse(
    string Answer,
    List<ArticleChatSource> Sources,
    bool FromCache
);

public record ArticleChatSource(
    int ChunkIndex,
    string Text,
    double Score
);

public record ArticleIndexResponse(
    int ChunkCount,
    string Status
);

public record ArticleIndexStatusResponse(
    bool IsIndexed
);
