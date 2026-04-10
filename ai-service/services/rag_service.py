import logging
import re
import chromadb
from groq import Groq
from config import settings
from services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

# ─── Gemini ile cevap üretimi için system prompt ───
RAG_SYSTEM_PROMPT = """Sen uzman bir akademik araştırmacı ve makale analiz asistanısın. Görevin, sana sağlanan bilimsel makale parçalarını okuyarak kullanıcının sorularına en doğru, net ve derinlemesine yanıtları vermektir.

KESİN KURALLAR VE DAVRANIŞ BİÇİMİ:
1. DIŞ BİLGİ KULLANIMI YASAKTIR: SADECE ve SADECE sana verilen bağlam (context) metinlerine dayanarak cevap üret. Asla kendi genel kültür veya akademik bilgini (bağlamda geçmiyorsa) cevaba katma.
2. BİLGİ EKSİKLİĞİ: Eğer sana verilen bağlam parçalarında sorunun net bir cevabı yoksa, bunu uydurmak veya tahmin etmek yerine "Sana sağlanan makale parçalarında bu sorunun cevabı bulunmamaktadır." şeklinde dürüstçe belirt.
3. ALINTI YAPMA: Bağlamdaki cümleleri birebir kopyalamak yerine onları anlayıp kendi entelektüel ifadelerinle (paraphrase ederek) açıkla. Eğer makaleden çok kritik bir tanım veriyorsan tırnak içinde gösterebilirsin.
4. YAPI VE FORMAT: Kullanıcı aksi bir şey istemedikçe; cevaplarını okunması kolay, iyi yapılandırılmış pürüzsüz paragraflar halinde yaz. Gerekirse vurgu yapmak için **kalın yazılar** veya madde imleri kullan. Asla Markdown tablo veya çok karmaşık formatlar kullanma.
5. AKADEMİK DİL: Daima objektif, analitik ve üçüncü tekil şahıs diliyle profesyonel bir üslup takın.
6. DİL DUYARLILIĞI: Kullanıcı sana hangi dilde soru soruyorsa, sen de o dilde yanıt ver."""

RAG_USER_PROMPT = """Aşağıdaki makale bağlam parçalarını dikkatlice incele ve ardından soruyu yanıtla. 

BAĞLAM (Makaleden alınan ilgili kısımlar):
--------------------------------------------------
{context}
--------------------------------------------------

KULLANICININ SORUSU: {question}

LÜTFEN YANITINI ŞİMDİ OLUŞTUR (Sadece yukarıdaki bağlamı kullanarak):"""


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
        """Metni kelime bazlı parçalara böl (overlap ile)."""
        # Gereksiz boşlukları temizle
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
        """Makale metnini parçalayıp ChromaDB'ye indeksle."""
        # Önceki parçaları sil
        self.delete_article(publication_id)

        chunks = self._chunk_text(pdf_text)
        if not chunks:
            logger.warning(f"No chunks generated for publication {publication_id}")
            return 0

        # Embedding'leri oluştur
        embeddings = embedding_service.encode_batch(chunks)

        # ChromaDB'ye ekle
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
        """Bir makalenin tüm parçalarını ve cache'ini sil."""
        deleted = 0

        # Chunk'ları sil
        try:
            existing = self.chunks_collection.get(
                where={"publication_id": publication_id}
            )
            if existing["ids"]:
                self.chunks_collection.delete(ids=existing["ids"])
                deleted = len(existing["ids"])
        except Exception as e:
            logger.error(f"Error deleting chunks for {publication_id}: {e}")

        # Cache'i sil
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
        """Semantic cache kontrolü. Benzer soru varsa cevabı döndür."""
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
        """Soru-cevap çiftini cache'e kaydet."""
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
        """Vektör veritabanında en ilgili parçaları bul."""
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
        """Groq Llama ile cevap üret."""
        if not self.llm_client:
            return "API anahtarı yapılandırılmamış. Lütfen GROQ_API_KEY ayarını kontrol edin."

        # Bağlam metnini oluştur
        context_parts = []
        for i, chunk in enumerate(context_chunks, 1):
            context_parts.append(f"[Parça {i}]:\n{chunk['text']}")
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
            return f"Cevap üretilirken bir hata oluştu: {str(e)}"

    # ─────────────────────────── ASK (Ana Pipeline) ───────────────────────────

    def ask_question(
        self, publication_id: str, question: str
    ) -> dict:
        """RAG pipeline: cache → search → generate → cache save."""

        # 1. Soru embedding'i oluştur
        question_embedding = embedding_service.encode(question)

        # 2. Cache kontrolü
        cached_answer = self._check_cache(publication_id, question_embedding)
        if cached_answer:
            return {
                "answer": cached_answer,
                "sources": [],
                "from_cache": True,
            }

        # 3. İlgili parçaları bul
        chunks = self._search_chunks(publication_id, question_embedding)
        if not chunks:
            return {
                "answer": "Bu makale henüz indekslenmemiş veya sorunuzla ilgili bir bölüm bulunamadı. Lütfen makaleyi önce indeksleyin.",
                "sources": [],
                "from_cache": False,
            }

        # 4. LLM ile cevap üret
        answer = self._generate_answer(question, chunks)

        # 5. Cache'e kaydet
        self._save_to_cache(publication_id, question, question_embedding, answer)

        # 6. Sonuçları döndür
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
        """Makalenin indekslenip indekslenmediğini kontrol et."""
        try:
            results = self.chunks_collection.get(
                where={"publication_id": publication_id},
                limit=1,
            )
            return len(results["ids"]) > 0
        except Exception:
            return False


rag_service = RagService()
