from typing import Literal, Optional
from pydantic import BaseModel, field_validator


class IndexArticleRequest(BaseModel):
    publication_id: str
    pdf_text: str


class IndexArticleResponse(BaseModel):
    publication_id: str
    chunk_count: int
    status: str


class ConversationTurn(BaseModel):
    """A single past turn in the article-chat conversation."""
    role: Literal["user", "assistant"]
    content: str


class AskQuestionRequest(BaseModel):
    publication_id: str
    question: str
    # Optional prior turns (oldest first). Used to make retrieval and
    # generation context-aware for follow-up questions. ``None`` and missing
    # are both treated as an empty list so callers (e.g. the .NET client
    # serializing ``History = null``) don't trip validation.
    history: Optional[list[ConversationTurn]] = None

    @field_validator("history", mode="before")
    @classmethod
    def _coerce_history(cls, v):
        if v is None:
            return []
        return v


class SourceChunk(BaseModel):
    chunk_index: int
    text: str
    # ``None`` for cached responses where the original retrieval score is
    # not preserved. Live retrieval always produces a float.
    score: Optional[float] = None


class AskQuestionResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    from_cache: bool


class DeleteIndexResponse(BaseModel):
    publication_id: str
    deleted_chunks: int
    status: str
