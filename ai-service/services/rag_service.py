import logging
import re
import chromadb
from groq import Groq
from config import settings
from services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

# ─── System prompt for RAG answer generation ───
RAG_SYSTEM_PROMPT = """You are an expert academic researcher and article analysis assistant. Your task is to read the provided scientific article excerpts and deliver the most accurate, clear, and in-depth answers to the user's questions.

STRICT RULES AND BEHAVIOR:
1. NO EXTERNAL KNOWLEDGE: Base your answers SOLELY on the provided context passages. Never incorporate your own general knowledge or academic expertise unless it appears in the context.
2. KNOWLEDGE GAPS: If the provided context does not contain a clear answer to the question, honestly state: "The answer to this question was not found in the provided article excerpts." rather than fabricating or guessing.
3. PARAPHRASING: Instead of copying sentences verbatim from the context, understand and explain them in your own words. You may quote critical definitions in quotation marks.
4. STRUCTURE AND FORMAT: Unless the user requests otherwise, write your answers as well-structured, easy-to-read, smooth paragraphs. Use **bold text** or bullet points for emphasis when needed. Never use Markdown tables or overly complex formatting.
5. ACADEMIC TONE: Always maintain an objective, analytical, and professional tone in the third person.
6. LANGUAGE SENSITIVITY: Respond in the same language the user asks the question in."""

RAG_USER_PROMPT = """Carefully examine the following article context passages and then answer the question.

CONTEXT (Relevant excerpts from the article):
--------------------------------------------------
{context}
--------------------------------------------------

USER'S QUESTION: {question}

PLEASE GENERATE YOUR ANSWER NOW (Using only the context above):"""


class RagService:
    def __init__(self):
        self.chroma_client: chromadb.ClientAPI | None = None
        self.chunks_collection = None
        self.cache_collection = None
        self.llm_client = None

    def initialize(self):
        # ChromaDB
        logger.info(f"Initializing ChromaDB at: {settings.CHROMA_PERSIST_DIR}")
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)

        self.chunks_collection = self.chroma_client.get_or_create_collection(
            name="article_chunks",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"ChromaDB 'article_chunks' collection ready (count={self.chunks_collection.count()})")

        self.cache_collection = self.chroma_client.get_or_create_collection(
            name="qa_cache",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"ChromaDB 'qa_cache' collection ready (count={self.cache_collection.count()})")

        # Groq (LLM)
        if settings.GROQ_API_KEY:
            self.llm_client = Groq(api_key=settings.GROQ_API_KEY)
            logger.info(f"Groq RAG client initialized (model: {settings.GROQ_MODEL})")
        else:
            logger.warning("GROQ_API_KEY is not set — RAG answer generation will not work")

    # ─────────────────────────── CHUNKING ───────────────────────────

    def _chunk_text(self, text: str) -> list[str]:
        """Split text into word-based chunks with overlap."""
        # Clean up unnecessary whitespace
        text = re.sub(r"\s+", " ", text).strip()
        words = text.split()

        if len(words) <= settings.RAG_CHUNK_SIZE:
            return [text]

        chunks = []
        start = 0
        while start < len(words):
            end = start + settings.RAG_CHUNK_SIZE
            chunk = " ".join(words[start:end])
            chunks.append(chunk)

            if end >= len(words):
                break
            start += settings.RAG_CHUNK_SIZE - settings.RAG_CHUNK_OVERLAP

        return chunks

    # ─────────────────────────── INDEX ───────────────────────────

    def index_article(self, publication_id: str, pdf_text: str) -> int:
        """Chunk article text and index it in ChromaDB."""
        # Delete previous chunks
        self.delete_article(publication_id)

        chunks = self._chunk_text(pdf_text)
        if not chunks:
            logger.warning(f"No chunks generated for publication {publication_id}")
            return 0

        # Generate embeddings
        embeddings = embedding_service.encode_batch(chunks)

        # Add to ChromaDB
        ids = [f"{publication_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "publication_id": publication_id,
                "chunk_index": i,
                "total_chunks": len(chunks),
            }
            for i in range(len(chunks))
        ]

        self.chunks_collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )

        logger.info(
            f"Indexed {len(chunks)} chunks for publication {publication_id}"
        )
        return len(chunks)

    # ─────────────────────────── DELETE ───────────────────────────

    def delete_article(self, publication_id: str) -> int:
        """Delete all chunks and cache entries for an article."""
        deleted = 0

        # Delete chunks
        try:
            existing = self.chunks_collection.get(
                where={"publication_id": publication_id}
            )
            if existing["ids"]:
                self.chunks_collection.delete(ids=existing["ids"])
                deleted = len(existing["ids"])
        except Exception as e:
            logger.error(f"Error deleting chunks for {publication_id}: {e}")

        # Delete cache
        try:
            cached = self.cache_collection.get(
                where={"publication_id": publication_id}
            )
            if cached["ids"]:
                self.cache_collection.delete(ids=cached["ids"])
        except Exception as e:
            logger.error(f"Error deleting cache for {publication_id}: {e}")

        logger.info(f"Deleted {deleted} chunks for publication {publication_id}")
        return deleted

    # ─────────────────────────── SEMANTIC CACHE ───────────────────────────

    def _check_cache(
        self, publication_id: str, question_embedding: list[float]
    ) -> str | None:
        """Semantic cache check. Returns cached answer if a similar question exists."""
        try:
            cache_count = self.cache_collection.count()
            if cache_count == 0:
                return None

            results = self.cache_collection.query(
                query_embeddings=[question_embedding],
                where={"publication_id": publication_id},
                n_results=1,
            )

            if (
                results
                and results["distances"]
                and results["distances"][0]
            ):
                # ChromaDB cosine distance = 1 - similarity
                distance = results["distances"][0][0]
                similarity = 1 - distance

                if similarity >= settings.RAG_CACHE_THRESHOLD:
                    cached_answer = results["metadatas"][0][0].get("answer", "")
                    if cached_answer:
                        logger.info(
                            f"Cache hit for publication {publication_id} "
                            f"(similarity={similarity:.4f})"
                        )
                        return cached_answer
        except Exception as e:
            logger.error(f"Cache check error: {e}")

        return None

    def _save_to_cache(
        self,
        publication_id: str,
        question: str,
        question_embedding: list[float],
        answer: str,
    ):
        """Save question-answer pair to cache."""
        import uuid

        try:
            cache_id = str(uuid.uuid4())
            self.cache_collection.add(
                ids=[cache_id],
                embeddings=[question_embedding],
                documents=[question],
                metadatas=[
                    {
                        "publication_id": publication_id,
                        "question": question[:500],
                        "answer": answer[:5000],
                    }
                ],
            )
            logger.info(f"Cached Q&A for publication {publication_id}")
        except Exception as e:
            logger.error(f"Cache save error: {e}")

    # ─────────────────────────── SEMANTIC SEARCH ───────────────────────────

    def _search_chunks(
        self, publication_id: str, query_embedding: list[float]
    ) -> list[dict]:
        """Find the most relevant chunks in the vector database."""
        try:
            results = self.chunks_collection.query(
                query_embeddings=[query_embedding],
                where={"publication_id": publication_id},
                n_results=settings.RAG_TOP_K,
            )

            if not results or not results["documents"] or not results["documents"][0]:
                return []

            chunks = []
            for i in range(len(results["documents"][0])):
                distance = results["distances"][0][i] if results["distances"] else 0
                similarity = 1 - distance

                chunks.append(
                    {
                        "chunk_index": results["metadatas"][0][i].get("chunk_index", i),
                        "text": results["documents"][0][i],
                        "score": round(similarity, 4),
                    }
                )

            return chunks
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []

    # ─────────────────────────── LLM ANSWER ───────────────────────────

    def _generate_answer(self, question: str, context_chunks: list[dict]) -> str:
        """Generate answer using Groq Llama."""
        if not self.llm_client:
            return "API key not configured. Please check the GROQ_API_KEY setting."

        # Build context text
        context_parts = []
        for i, chunk in enumerate(context_chunks, 1):
            context_parts.append(f"[Chunk {i}]:\n{chunk['text']}")
        context = "\n\n".join(context_parts)

        prompt = RAG_USER_PROMPT.format(context=context, question=question)

        try:
            response = self.llm_client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": RAG_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2048,
            )
            answer = response.choices[0].message.content.strip()
            logger.info(
                f"Groq generated answer ({len(answer)} chars) "
                f"for question: {question[:80]}..."
            )
            return answer
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return f"An error occurred while generating the answer: {str(e)}"

    # ─────────────────────────── ASK (Ana Pipeline) ───────────────────────────

    def ask_question(
        self, publication_id: str, question: str
    ) -> dict:
        """RAG pipeline: cache check → search → generate → cache save."""

        # 1. Generate question embedding
        question_embedding = embedding_service.encode(question)

        # 2. Check cache
        cached_answer = self._check_cache(publication_id, question_embedding)
        if cached_answer:
            return {
                "answer": cached_answer,
                "sources": [],
                "from_cache": True,
            }

        # 3. Find relevant chunks
        chunks = self._search_chunks(publication_id, question_embedding)
        if not chunks:
            return {
                "answer": "This article has not been indexed yet or no relevant section was found for your question. Please index the article first.",
                "sources": [],
                "from_cache": False,
            }

        # 4. Generate answer with LLM
        answer = self._generate_answer(question, chunks)

        # 5. Save to cache
        self._save_to_cache(publication_id, question, question_embedding, answer)

        # 6. Return results
        sources = [
            {
                "chunk_index": c["chunk_index"],
                "text": c["text"][:300] + "..." if len(c["text"]) > 300 else c["text"],
                "score": c["score"],
            }
            for c in chunks
        ]

        return {
            "answer": answer,
            "sources": sources,
            "from_cache": False,
        }

    def is_article_indexed(self, publication_id: str) -> bool:
        """Check whether the article has been indexed."""
        try:
            results = self.chunks_collection.get(
                where={"publication_id": publication_id},
                limit=1,
            )
            return len(results["ids"]) > 0
        except Exception:
            return False


rag_service = RagService()
