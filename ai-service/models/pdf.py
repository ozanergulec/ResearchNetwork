from pydantic import BaseModel


class PDFExtractResponse(BaseModel):
    full_text: str
    abstract: str | None = None
    keywords: list[str] = []
    references: list[str] = []


class PDFProcessResponse(BaseModel):
    full_text: str
    abstract: str | None = None
    keywords: list[str] = []
    references: list[str] = []
    summary: str
    embedding: list[float]
