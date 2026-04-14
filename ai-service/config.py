from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    CLASSIFICATION_MODEL: str = "valhalla/distilbart-mnli-12-1"
    VECTOR_DIMENSION: int = 384

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Google Gemini (for RAG answer generation)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # RAG settings
    CHROMA_PERSIST_DIR: str = "./chroma_data"
    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 100
    RAG_TOP_K: int = 5
    RAG_CACHE_THRESHOLD: float = 0.92

    ALLOWED_ORIGINS: str = "http://localhost:5000,http://localhost:5001,http://localhost:5051"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
