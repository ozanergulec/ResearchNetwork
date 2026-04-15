from pydantic import BaseModel


class CitationContext(BaseModel):
    sentence: str
    citation_numbers: list[int]
    citation_labels: list[str] = []


class ExtractContextsRequest(BaseModel):
    full_text: str


class ExtractContextsResponse(BaseModel):
    contexts: list[CitationContext]


class ClassifyIntentRequest(BaseModel):
    citation_context: str


class ClassifyIntentResponse(BaseModel):
    intent: str
    confidence: float
    all_scores: dict[str, float]


class CitationAnalysisItem(BaseModel):
    sentence: str
    citation_numbers: list[int]
    citation_labels: list[str] = []
    intent: str
    confidence: float


class AnalyzeCitationsRequest(BaseModel):
    full_text: str


class AnalyzeCitationsResponse(BaseModel):
    citations: list[CitationAnalysisItem]
