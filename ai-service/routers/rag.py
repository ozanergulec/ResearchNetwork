from fastapi import APIRouter
from models.rag import (
    IndexArticleRequest,
    IndexArticleResponse,
    AskQuestionRequest,
    AskQuestionResponse,
    SourceChunk,
    DeleteIndexResponse,
)
from services.rag_service import rag_service

router = APIRouter(prefix="/api/rag", tags=["RAG"])


@router.post("/index", response_model=IndexArticleResponse)
def index_article(request: IndexArticleRequest):
    """Makale metnini parçalayıp vektör veritabanına indeksle."""
    chunk_count = rag_service.index_article(request.publication_id, request.pdf_text)
    return IndexArticleResponse(
        publication_id=request.publication_id,
        chunk_count=chunk_count,
        status="indexed",
    )


@router.post("/ask", response_model=AskQuestionResponse)
def ask_question(request: AskQuestionRequest):
    """Makale hakkında soru sor (semantic cache + RAG pipeline)."""
    result = rag_service.ask_question(request.publication_id, request.question)
    return AskQuestionResponse(
        answer=result["answer"],
        sources=[SourceChunk(**s) for s in result["sources"]],
        from_cache=result["from_cache"],
    )


@router.delete("/index/{publication_id}", response_model=DeleteIndexResponse)
def delete_index(publication_id: str):
    """Bir makalenin vektör indeksini ve cache'ini sil."""
    deleted = rag_service.delete_article(publication_id)
    return DeleteIndexResponse(
        publication_id=publication_id,
        deleted_chunks=deleted,
        status="deleted",
    )


@router.get("/status/{publication_id}")
def check_index_status(publication_id: str):
    """Makalenin indekslenip indekslenmediğini kontrol et."""
    is_indexed = rag_service.is_article_indexed(publication_id)
    return {"publication_id": publication_id, "is_indexed": is_indexed}
