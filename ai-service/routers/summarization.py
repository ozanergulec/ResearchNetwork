from fastapi import APIRouter
from models.summarization import SummarizeRequest, SummarizeResponse
from services.summarization_service import summarization_service

router = APIRouter(prefix="/api", tags=["Summarization"])


@router.post("/summarize", response_model=SummarizeResponse)
def summarize_text(request: SummarizeRequest):
    summary = summarization_service.summarize(
        request.text,
        max_length=request.max_length,
        min_length=request.min_length,
    )
    return SummarizeResponse(summary=summary)
