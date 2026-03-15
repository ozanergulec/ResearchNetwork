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


class ParsedReference(BaseModel):
    raw: str
    title: str | None = None
    doi: str | None = None
    year: int | None = None
    authors: str | None = None


class ParseReferencesRequest(BaseModel):
    references: list[str]


class ParseReferencesResponse(BaseModel):
    parsed: list[ParsedReference]
