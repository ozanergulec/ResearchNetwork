from fastapi import APIRouter, UploadFile, File
from models.pdf import (
    PDFExtractResponse,
    PDFProcessResponse,
    ParseReferencesRequest,
    ParseReferencesResponse,
    ParsedReference,
)
from services.pdf_service import pdf_service
from services.embedding_service import embedding_service
from services.summarization_service import summarization_service

router = APIRouter(prefix="/api/pdf", tags=["PDF Processing"])


@router.post("/extract", response_model=PDFExtractResponse)
async def extract_from_pdf(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    full_text = pdf_service.extract_text(pdf_bytes)
    abstract = pdf_service.extract_abstract(full_text)
    keywords = pdf_service.extract_keywords(full_text)
    references = pdf_service.extract_references(full_text)

    return PDFExtractResponse(
        full_text=full_text,
        abstract=abstract,
        keywords=keywords,
        references=references,
    )


@router.post("/process", response_model=PDFProcessResponse)
async def process_pdf(file: UploadFile = File(...)):
    """Extract text, generate summary, and create embedding in one call."""
    pdf_bytes = await file.read()

    full_text = pdf_service.extract_text(pdf_bytes)
    abstract = pdf_service.extract_abstract(full_text)
    keywords = pdf_service.extract_keywords(full_text)
    references = pdf_service.extract_references(full_text)

    text_for_summary = abstract or full_text[:5000]
    summary = summarization_service.summarize(text_for_summary)

    kw_text = ", ".join(keywords) if keywords else ""
    embed_input = f"{abstract or ''}. {kw_text}"
    if len(embed_input.strip()) < 10:
        embed_input = full_text[:2000]
    embedding = embedding_service.encode(embed_input)

    return PDFProcessResponse(
        full_text=full_text,
        abstract=abstract,
        keywords=keywords,
        references=references,
        summary=summary,
        embedding=embedding,
    )


@router.post("/parse-references", response_model=ParseReferencesResponse)
def parse_references(request: ParseReferencesRequest):
    """Parse raw reference strings into structured data (title, DOI, year, authors)."""
    parsed = [pdf_service.parse_reference(ref) for ref in request.references]
    return ParseReferencesResponse(
        parsed=[ParsedReference(**p) for p in parsed]
    )
