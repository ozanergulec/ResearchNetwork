from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    SUMMARIZATION_MODEL: str = "sshleifer/distilbart-cnn-12-6"
    CLASSIFICATION_MODEL: str = "valhalla/distilbart-mnli-12-1"
    VECTOR_DIMENSION: int = 384
    MAX_SUMMARY_LENGTH: int = 300
    MIN_SUMMARY_LENGTH: int = 50
    MAX_SUMMARY_CHUNKS: int = 10
    ALLOWED_ORIGINS: str = "http://localhost:5000,http://localhost:5001,http://localhost:5051"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
