import numpy as np
from sentence_transformers import SentenceTransformer
from config import settings


class EmbeddingService:
    def __init__(self):
        self.model: SentenceTransformer | None = None

    def load_model(self):
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)

    def encode(self, text: str) -> list[float]:
        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        embeddings = self.model.encode(
            texts, normalize_embeddings=True, batch_size=32
        )
        return embeddings.tolist()

    def cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        a = np.array(vec_a)
        b = np.array(vec_b)
        dot = np.dot(a, b)
        norm = np.linalg.norm(a) * np.linalg.norm(b)
        if norm == 0:
            return 0.0
        return float(dot / norm)

    def rank_by_similarity(
        self,
        query_vector: list[float],
        candidates: list[dict],
        top_n: int = 10,
    ) -> list[dict]:
        scored = []
        for candidate in candidates:
            score = self.cosine_similarity(query_vector, candidate["vector"])
            scored.append({"id": candidate["id"], "score": round(score, 6)})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_n]


embedding_service = EmbeddingService()
