from fastapi import APIRouter
from models.embedding import (
    EmbedRequest,
    EmbedResponse,
    BatchEmbedRequest,
    BatchEmbedResponse,
    SimilarityRequest,
    SimilarityResponse,
    RankRequest,
    RankResponse,
    RankedItem,
)
from services.embedding_service import embedding_service

router = APIRouter(prefix="/api", tags=["Embedding"])


@router.post("/embed", response_model=EmbedResponse)
def create_embedding(request: EmbedRequest):
    vector = embedding_service.encode(request.text)
    return EmbedResponse(embedding=vector)


@router.post("/embed-batch", response_model=BatchEmbedResponse)
def create_batch_embeddings(request: BatchEmbedRequest):
    vectors = embedding_service.encode_batch(request.texts)
    return BatchEmbedResponse(embeddings=vectors)


@router.post("/similarity/compare", response_model=SimilarityResponse)
def compare_vectors(request: SimilarityRequest):
    score = embedding_service.cosine_similarity(request.vector_a, request.vector_b)
    return SimilarityResponse(cosine_similarity=round(score, 6))


@router.post("/similarity/rank", response_model=RankResponse)
def rank_candidates(request: RankRequest):
    candidates = [{"id": c.id, "vector": c.vector} for c in request.candidates]
    ranked = embedding_service.rank_by_similarity(
        request.query_vector, candidates, request.top_n
    )
    return RankResponse(
        ranked=[RankedItem(id=r["id"], score=r["score"]) for r in ranked]
    )
