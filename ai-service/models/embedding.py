from pydantic import BaseModel


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: list[float]


class BatchEmbedRequest(BaseModel):
    texts: list[str]


class BatchEmbedResponse(BaseModel):
    embeddings: list[list[float]]


class SimilarityRequest(BaseModel):
    vector_a: list[float]
    vector_b: list[float]


class SimilarityResponse(BaseModel):
    cosine_similarity: float


class RankCandidate(BaseModel):
    id: str
    vector: list[float]


class RankRequest(BaseModel):
    query_vector: list[float]
    candidates: list[RankCandidate]
    top_n: int = 10


class RankedItem(BaseModel):
    id: str
    score: float


class RankResponse(BaseModel):
    ranked: list[RankedItem]
