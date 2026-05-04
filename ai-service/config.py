from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    # Local fine-tuned SciBERT (SciCite) model for citation intent classification.
    # Can be either a local folder path or a Hugging Face repo id.
    CITATION_MODEL_PATH: str = "./local_models/scibert-scicite"
    VECTOR_DIMENSION: int = 384

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # RAG settings
    CHROMA_PERSIST_DIR: str = "./chroma_data"
    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 100
    RAG_TOP_K: int = 5
    # Retrieval: how many chunks to send to the LLM (clamped in rag_service).
    RAG_RETRIEVAL_K_MIN: int = 2
    RAG_RETRIEVAL_K_MAX: int = 4
    # Truncate each retrieved chunk for the LLM prompt only (full text stays in Chroma).
    RAG_LLM_CHARS_PER_CHUNK: int = 1000
    RAG_LLM_MAX_OUTPUT_TOKENS: int = 512
    RAG_CACHE_THRESHOLD: float = 0.92
    RAG_CACHE_TTL_DAYS: int = 7  # Cache entries older than this are evicted

    ALLOWED_ORIGINS: str = "http://localhost:5000,http://localhost:5001,http://localhost:5051"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
