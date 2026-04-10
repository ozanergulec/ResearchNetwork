from pydantic import BaseModel


class IndexArticleRequest(BaseModel):
    publication_id: str
    pdf_text: str


class IndexArticleResponse(BaseModel):
    publication_id: str
    chunk_count: int
    status: str


class AskQuestionRequest(BaseModel):
    publication_id: str
    question: str


class SourceChunk(BaseModel):
    chunk_index: int
    text: str
    score: float


class AskQuestionResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    from_cache: bool


class DeleteIndexResponse(BaseModel):
    publication_id: str
    deleted_chunks: int
    status: str
