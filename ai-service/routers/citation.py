from fastapi import APIRouter
from models.citation import (
    ExtractContextsRequest,
    ExtractContextsResponse,
    CitationContext,
    ClassifyIntentRequest,
    ClassifyIntentResponse,
    AnalyzeCitationsRequest,
    AnalyzeCitationsResponse,
    CitationAnalysisItem,
)
from services.citation_service import citation_service

router = APIRouter(prefix="/api/citation", tags=["Citation Analysis"])


@router.post("/extract-contexts", response_model=ExtractContextsResponse)
def extract_contexts(request: ExtractContextsRequest):
    contexts = citation_service.extract_citation_contexts(request.full_text)
    return ExtractContextsResponse(
        contexts=[
            CitationContext(
                sentence=c["sentence"], citation_numbers=c["citation_numbers"],
                citation_labels=c.get("citation_labels", [])
            )
            for c in contexts
        ]
    )


@router.post("/classify-intent", response_model=ClassifyIntentResponse)
def classify_intent(request: ClassifyIntentRequest):
    result = citation_service.classify_intent(request.citation_context)
    return ClassifyIntentResponse(
        intent=result["intent"],
        confidence=result["confidence"],
        all_scores=result["all_scores"],
    )


@router.post("/analyze", response_model=AnalyzeCitationsResponse)
def analyze_citations(request: AnalyzeCitationsRequest):
    results = citation_service.analyze_full_text(request.full_text)
    return AnalyzeCitationsResponse(
        citations=[
            CitationAnalysisItem(
                sentence=r["sentence"],
                citation_numbers=r["citation_numbers"],
                citation_labels=r.get("citation_labels", []),
                intent=r["intent"],
                confidence=r["confidence"],
            )
            for r in results
        ]
    )
