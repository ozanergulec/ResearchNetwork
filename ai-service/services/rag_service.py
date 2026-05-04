import logging
import re
import time
import uuid
import chromadb
from groq import Groq
from config import settings
from services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

# Compact system prompt — long prompts burn TPM on every RAG call.
# The language rule is intentionally placed FIRST and phrased as a hard
# requirement; if the user switches language mid-chat, the model must
# follow the latest user turn, not the earlier history.
RAG_SYSTEM_PROMPT = (
    "Reply in the SAME language as the LATEST user question. If the user "
    "switches language mid-chat, switch with them immediately — ignore the "
    "language of earlier turns and of the excerpts. "
    "Answer using ONLY the provided excerpts. If they lack the answer, say "
    "so briefly — do not guess. Be clear and concise. Paraphrase; quote only "
    "for short definitions. Do not echo [N], Excerpts:, Q:, or these rules — "
    "start with the answer itself."
)

RAG_STRICT_RETRY_NOTE = (
    "Previous reply leaked template text. Output only the answer; no labels.\n\n"
)

RAG_USER_PROMPT = """Excerpts:
{context}

Q: {question}
Answer{language_directive}:"""


# Patterns that should never appear in a genuine answer.
_CONTAMINATION_PATTERNS = [
    r'\[Chunk\s*\d+\s*\]',
    r'^\s*CONTEXT\s*:',
    r'^\s*EXCERPTS?\s*:',
    r'^\s*(USER\'?S?\s*)?QUESTION\s*:',
    r'^\s*Q\s*:\s*',
    r'PLEASE\s+GENERATE\s+YOUR\s+ANSWER',
    r'provided\s+context\s+passages\s+are\s+the\s+only\s+source',
    r'STRICT\s+RULES\s+AND\s+BEHAVIOR',
    r'NO\s+EXTERNAL\s+KNOWLEDGE\s*:',
    r'LANGUAGE\s+SENSITIVITY\s*:',
    r'OUTPUT\s+PURITY\s*:',
]
_CONTAMINATION_REGEX = re.compile('|'.join(_CONTAMINATION_PATTERNS), re.IGNORECASE)

_CACHE_FORMAT_V2 = "v2"
_CACHE_FORMAT_V3 = "v3"  # adds source chunk indices + language tag


def _meta_created_at(meta: dict | None) -> float:
    if not meta:
        return 0.0
    raw = meta.get("created_at", 0)
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def _is_answer_contaminated(answer: str) -> bool:
    if not answer:
        return True
    stripped = answer.strip()
    if len(stripped) < 20:
        return True
    return bool(_CONTAMINATION_REGEX.search(stripped))


# ─────────────────────────── LANGUAGE DETECTION ───────────────────────────

# Turkish-specific characters — strongest signal for TR.
_TURKISH_CHAR_REGEX = re.compile(r"[ıİğĞşŞçÇöÖüÜ]")

# Common Turkish stopwords / function words (no TR-specific chars, so we
# need them as a backup signal when a TR question avoids those letters).
_TURKISH_HINT_REGEX = re.compile(
    r"\b(?:ve|veya|ama|fakat|ancak|ile|için|gibi|kadar|daha|çok|az|"
    r"ne|nedir|nasıl|neden|niçin|hangi|kim|kimin|nerede|ne zaman|"
    r"bu|şu|o|bir|bunlar|şunlar|onlar|var|yok|olan|olur|peki|"
    r"makale|makalenin|yazar|yazarlar|yöntem|sonuç|özet|amacı|amaç)\b",
    re.IGNORECASE,
)

# English function/content words — detect EN even when there are no
# unambiguous markers in the user's short follow-up.
_ENGLISH_HINT_REGEX = re.compile(
    r"\b(?:what|when|where|why|how|who|which|whose|whom|is|are|was|were|am|"
    r"do|does|did|can|could|would|should|will|have|has|had|the|this|that|these|those|"
    r"a|an|any|some|not|no|yes|or|and|but|if|then|about|into|from|with|for|"
    r"article|paper|author|abstract|method|methods|result|results|solution|problem|"
    r"explain|describe|summarize|summary|define|definition|compare|list|tell|give)\b",
    re.IGNORECASE,
)


def _detect_language(text: str) -> str:
    """Return ``'tr'``, ``'en'``, or ``''`` (unknown) for a single message.

    Strong signals first (TR-specific characters), then function-word hints,
    then a permissive fallback. The empty string means "could not tell" —
    callers should treat that as "no explicit directive".
    """
    if not text:
        return ""
    if _TURKISH_CHAR_REGEX.search(text):
        return "tr"
    if _TURKISH_HINT_REGEX.search(text):
        return "tr"
    if _ENGLISH_HINT_REGEX.search(text):
        return "en"
    # Fallback: latin-only, several words → assume English.
    words = re.findall(r"[A-Za-z]{2,}", text)
    if len(words) >= 4:
        return "en"
    return ""


_LANG_NAMES = {"tr": "Turkish", "en": "English"}


def _language_directive_for(lang: str) -> str:
    if lang in _LANG_NAMES:
        return f" (in {_LANG_NAMES[lang]})"
    return ""


# ─────────────────────────── CHUNK TRUNCATION ───────────────────────────

def _truncate_chunk_for_llm(text: str) -> str:
    """Cap chunk size for the prompt only; full text stays in Chroma."""
    limit = settings.RAG_LLM_CHARS_PER_CHUNK
    if not text or len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


class RagService:
    def __init__(self):
        self.chroma_client: chromadb.ClientAPI | None = None
        self.chunks_collection = None
        self.cache_collection = None
        self.llm_client = None
        # In-memory cache for total_chunks per publication. Populated on
        # index/load, invalidated on delete. Avoids a Chroma roundtrip on
        # every ask_question call just to size top_k.
        self._chunk_count_cache: dict[str, int] = {}

    def initialize(self):
        logger.info(f"Initializing ChromaDB at: {settings.CHROMA_PERSIST_DIR}")
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)

        self.chunks_collection = self.chroma_client.get_or_create_collection(
            name="article_chunks",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            f"ChromaDB 'article_chunks' collection ready "
            f"(count={self.chunks_collection.count()})"
        )

        self.cache_collection = self.chroma_client.get_or_create_collection(
            name="qa_cache",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            f"ChromaDB 'qa_cache' collection ready "
            f"(count={self.cache_collection.count()})"
        )

        self._purge_expired_cache()

        if settings.GROQ_API_KEY:
            self.llm_client = Groq(api_key=settings.GROQ_API_KEY)
            logger.info(f"Groq RAG client initialized (model: {settings.GROQ_MODEL})")
        else:
            logger.warning("GROQ_API_KEY is not set — RAG answer generation will not work")

    # ─────────────────────────── CACHE TTL ───────────────────────────

    def _purge_expired_cache(self):
        """Remove cache entries older than RAG_CACHE_TTL_DAYS on startup.

        Uses Chroma's ``$lt`` filter to ask the DB for expired ids only,
        instead of pulling the whole collection into memory.
        """
        try:
            cutoff = time.time() - (settings.RAG_CACHE_TTL_DAYS * 86400)
            expired = self.cache_collection.get(
                where={"created_at": {"$lt": cutoff}},
                include=[],  # only need ids
            )
            if expired and expired.get("ids"):
                self.cache_collection.delete(ids=expired["ids"])
                logger.info(
                    f"Purged {len(expired['ids'])} expired cache entries "
                    f"(TTL={settings.RAG_CACHE_TTL_DAYS} days)"
                )
        except Exception as e:
            # Filter syntax differs across Chroma versions — fall back to a
            # full scan so a version mismatch doesn't crash startup.
            logger.warning(
                f"Filtered cache purge failed ({e}); falling back to full scan"
            )
            self._purge_expired_cache_fallback()

    def _purge_expired_cache_fallback(self):
        try:
            total = self.cache_collection.count()
            if total == 0:
                return
            all_entries = self.cache_collection.get(
                include=["metadatas"], limit=total
            )
            if not all_entries or not all_entries["ids"]:
                return
            ttl_seconds = settings.RAG_CACHE_TTL_DAYS * 86400
            now = time.time()
            expired_ids = [
                all_entries["ids"][i]
                for i, meta in enumerate(all_entries["metadatas"])
                if (ca := _meta_created_at(meta)) == 0 or (now - ca) > ttl_seconds
            ]
            if expired_ids:
                self.cache_collection.delete(ids=expired_ids)
                logger.info(
                    f"Purged {len(expired_ids)}/{total} expired cache entries "
                    f"(fallback path)"
                )
        except Exception as e:
            logger.error(f"Cache purge fallback error: {e}")

    # ─────────────────────────── CHUNKING ───────────────────────────

    def _chunk_text(self, text: str) -> list[str]:
        """Split text into word-based chunks with overlap (500/100 default)."""
        text = re.sub(r"\s+", " ", text).strip()
        words = text.split()

        if len(words) <= settings.RAG_CHUNK_SIZE:
            return [text] if text else []

        chunks = []
        start = 0
        while start < len(words):
            end = start + settings.RAG_CHUNK_SIZE
            chunks.append(" ".join(words[start:end]))
            if end >= len(words):
                break
            start += settings.RAG_CHUNK_SIZE - settings.RAG_CHUNK_OVERLAP
        return chunks

    # ─────────────────────────── INDEX ───────────────────────────

    def index_article(self, publication_id: str, pdf_text: str) -> int:
        self.delete_article(publication_id)

        chunks = self._chunk_text(pdf_text)
        if not chunks:
            logger.warning(f"No chunks generated for publication {publication_id}")
            return 0

        embeddings = embedding_service.encode_batch(chunks)

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

        # Warm the in-memory chunk-count cache.
        self._chunk_count_cache[publication_id] = len(chunks)

        logger.info(f"Indexed {len(chunks)} chunks for publication {publication_id}")
        return len(chunks)

    # ─────────────────────────── DELETE ───────────────────────────

    def delete_article(self, publication_id: str) -> int:
        deleted = 0
        try:
            existing = self.chunks_collection.get(
                where={"publication_id": publication_id}
            )
            if existing["ids"]:
                self.chunks_collection.delete(ids=existing["ids"])
                deleted = len(existing["ids"])
        except Exception as e:
            logger.error(f"Error deleting chunks for {publication_id}: {e}")

        try:
            cached = self.cache_collection.get(
                where={"publication_id": publication_id}
            )
            if cached["ids"]:
                self.cache_collection.delete(ids=cached["ids"])
        except Exception as e:
            logger.error(f"Error deleting cache for {publication_id}: {e}")

        self._chunk_count_cache.pop(publication_id, None)
        logger.info(f"Deleted {deleted} chunks for publication {publication_id}")
        return deleted

    # ─────────────────────────── SEMANTIC CACHE ───────────────────────────

    def _check_cache(
        self,
        publication_id: str,
        question_embedding: list[float],
        question_lang: str,
        has_history: bool,
    ) -> dict | None:
        """Semantic cache lookup.

        Returns ``{"answer": str, "source_indices": list[int]}`` on hit,
        ``None`` on miss. We restrict matches to the same publication AND
        the same detected language, so a Turkish question never serves a
        cached English answer (and vice versa). Follow-up answers (those
        produced with chat history) are stored with ``is_followup=True``
        and are NOT served to fresh, history-less lookups, since the
        cached reply may have leaned on prior turns.
        """
        try:
            where_filter: dict = {"publication_id": publication_id}
            if not has_history:
                # Fresh question — only match standalone (non-followup) entries.
                where_filter = {
                    "$and": [
                        {"publication_id": publication_id},
                        {"is_followup": {"$ne": True}},
                    ]
                }

            results = self.cache_collection.query(
                query_embeddings=[question_embedding],
                where=where_filter,
                n_results=1,
                include=["documents", "metadatas", "distances"],
            )

            if not (results and results.get("distances") and results["distances"][0]):
                return None

            distance = results["distances"][0][0]
            similarity = 1 - distance
            if similarity < settings.RAG_CACHE_THRESHOLD:
                return None

            meta = (results["metadatas"][0][0] or {}) if results.get("metadatas") else {}
            doc_text = (
                (results["documents"][0][0] or "")
                if results.get("documents") and results["documents"][0]
                else ""
            )
            cached_id = (
                results["ids"][0][0] if results.get("ids") and results["ids"][0] else None
            )

            cache_format = meta.get("cache_format")
            if cache_format in (_CACHE_FORMAT_V2, _CACHE_FORMAT_V3):
                cached_answer = doc_text
            else:
                cached_answer = meta.get("answer") or ""

            # Language gate — never serve a cached answer of a different
            # language than the current question, regardless of similarity.
            cached_lang = meta.get("lang") or ""
            if question_lang and cached_lang and cached_lang != question_lang:
                logger.info(
                    f"Cache match rejected: lang mismatch "
                    f"(cached={cached_lang}, asked={question_lang})"
                )
                return None

            # TTL check
            created_at = _meta_created_at(meta)
            ttl_seconds = settings.RAG_CACHE_TTL_DAYS * 86400
            if created_at and (time.time() - created_at) > ttl_seconds:
                if cached_id:
                    try:
                        self.cache_collection.delete(ids=[cached_id])
                    except Exception:
                        pass
                return None

            if cached_answer and not _is_answer_contaminated(cached_answer):
                # Recover source indices for UX (no extra Chroma call).
                indices_str = meta.get("source_indices") or ""
                source_indices: list[int] = []
                if indices_str:
                    for tok in indices_str.split(","):
                        tok = tok.strip()
                        if tok.isdigit():
                            source_indices.append(int(tok))

                logger.info(
                    f"Cache hit for publication {publication_id} "
                    f"(similarity={similarity:.4f}, lang={cached_lang or 'unknown'})"
                )
                return {"answer": cached_answer, "source_indices": source_indices}

            # Self-heal poisoned entry
            if cached_answer and cached_id:
                logger.warning(
                    f"Discarding contaminated cache entry {cached_id} "
                    f"for publication {publication_id}"
                )
                try:
                    self.cache_collection.delete(ids=[cached_id])
                except Exception as del_err:
                    logger.error(
                        f"Failed to delete contaminated cache entry: {del_err}"
                    )
        except Exception as e:
            logger.error(f"Cache check error: {e}")
        return None

    def _save_to_cache(
        self,
        publication_id: str,
        question: str,
        question_embedding: list[float],
        answer: str,
        source_indices: list[int],
        question_lang: str,
        is_followup: bool,
    ):
        try:
            cache_id = str(uuid.uuid4())
            self.cache_collection.add(
                ids=[cache_id],
                embeddings=[question_embedding],
                documents=[answer],
                metadatas=[
                    {
                        "publication_id": publication_id,
                        "question": question[:500],
                        "cache_format": _CACHE_FORMAT_V3,
                        "created_at": time.time(),
                        "lang": question_lang or "",
                        "is_followup": bool(is_followup),
                        "source_indices": ",".join(str(i) for i in source_indices),
                    }
                ],
            )
            logger.info(
                f"Cached Q&A for publication {publication_id} "
                f"(lang={question_lang or 'unknown'}, followup={is_followup})"
            )
        except Exception as e:
            logger.error(f"Cache save error: {e}")

    # ─────────────────────────── SEMANTIC SEARCH ───────────────────────────

    def _get_publication_chunk_count(self, publication_id: str) -> int:
        """Return total_chunks for a publication, using an in-memory cache."""
        cached = self._chunk_count_cache.get(publication_id)
        if cached is not None:
            return cached
        try:
            res = self.chunks_collection.get(
                where={"publication_id": publication_id},
                limit=1,
                include=["metadatas"],
            )
            if res and res.get("metadatas") and res["metadatas"]:
                meta = res["metadatas"][0] or {}
                count = int(meta.get("total_chunks", 0))
                self._chunk_count_cache[publication_id] = count
                return count
        except Exception as e:
            logger.warning(
                f"Could not determine chunk count for {publication_id}: {e}"
            )
        return 0

    def _determine_top_k(self, total_chunks: int) -> int:
        k_min = max(1, settings.RAG_RETRIEVAL_K_MIN)
        k_max = max(k_min, settings.RAG_RETRIEVAL_K_MAX)
        if total_chunks <= 0:
            return min(settings.RAG_TOP_K, k_max)
        target = round(total_chunks * 0.2)
        return max(k_min, min(k_max, target))

    def _search_chunks(
        self,
        publication_id: str,
        query_embedding: list[float],
        top_k: int | None = None,
    ) -> list[dict]:
        n_results = top_k if top_k and top_k > 0 else settings.RAG_TOP_K
        try:
            results = self.chunks_collection.query(
                query_embeddings=[query_embedding],
                where={"publication_id": publication_id},
                n_results=n_results,
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

    def _fetch_chunks_by_indices(
        self, publication_id: str, indices: list[int]
    ) -> list[dict]:
        """Hydrate cached source indices back into source previews.

        Returns the list in the original ``indices`` order. Missing chunks
        are silently skipped (the article may have been re-indexed).
        """
        if not indices:
            return []
        try:
            ids = [f"{publication_id}_chunk_{i}" for i in indices]
            res = self.chunks_collection.get(
                ids=ids,
                include=["documents", "metadatas"],
            )
            if not res or not res.get("ids"):
                return []
            by_id = {
                rid: (res["documents"][i], res["metadatas"][i] or {})
                for i, rid in enumerate(res["ids"])
            }
            ordered = []
            for cid, idx in zip(ids, indices):
                if cid in by_id:
                    text, meta = by_id[cid]
                    ordered.append(
                        {
                            "chunk_index": meta.get("chunk_index", idx),
                            "text": text,
                            "score": None,  # cached hit — original score not preserved
                        }
                    )
            return ordered
        except Exception as e:
            logger.warning(f"Could not hydrate cached source chunks: {e}")
            return []

    # ─────────────────────────── LLM ANSWER ───────────────────────────

    def _generate_answer(
        self,
        question: str,
        context_chunks: list[dict],
        question_lang: str,
        history: list[dict] | None = None,
        strict: bool = False,
    ) -> str:
        if not self.llm_client:
            return "API key not configured. Please check the GROQ_API_KEY setting."

        context_parts = []
        for i, chunk in enumerate(context_chunks, 1):
            body = _truncate_chunk_for_llm(chunk["text"])
            context_parts.append(f"[{i}] {body}")
        context = "\n".join(context_parts)

        user_prompt = RAG_USER_PROMPT.format(
            context=context,
            question=question.strip(),
            language_directive=_language_directive_for(question_lang),
        )
        if strict:
            user_prompt = RAG_STRICT_RETRY_NOTE + user_prompt

        messages: list[dict] = [{"role": "system", "content": RAG_SYSTEM_PROMPT}]

        # History handling — language-aware.
        # If the latest question's language differs from the previous turn's
        # language, drop the history entirely. Carrying mismatched-language
        # history is the single biggest reason the model "forgets" to
        # switch when the user does.
        if history:
            trimmed = [h for h in history if h.get("role") in ("user", "assistant")]
            if trimmed:
                # Find the most recent user turn in the history to compare.
                last_user = next(
                    (h for h in reversed(trimmed) if h.get("role") == "user"),
                    None,
                )
                last_lang = (
                    _detect_language((last_user or {}).get("content", ""))
                    if last_user
                    else ""
                )

                if question_lang and last_lang and question_lang != last_lang:
                    # Language switch — drop history so it doesn't drag the
                    # model back to the previous language.
                    logger.info(
                        f"Language switch detected ({last_lang} → {question_lang}); "
                        f"dropping {len(trimmed)} history turns from prompt"
                    )
                else:
                    # Same language — keep last 2 turns, tightly truncated.
                    for h in trimmed[-2:]:
                        content = (h.get("content") or "").strip()
                        if len(content) > 600:
                            content = content[:599].rstrip() + "…"
                        messages.append({"role": h["role"], "content": content})

        messages.append({"role": "user", "content": user_prompt})

        try:
            response = self.llm_client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                temperature=0.2 if strict else 0.25,
                max_tokens=settings.RAG_LLM_MAX_OUTPUT_TOKENS,
                frequency_penalty=0.35 if strict else 0.1,
            )
            answer = response.choices[0].message.content.strip()
            logger.info(
                f"Groq generated answer ({len(answer)} chars, strict={strict}, "
                f"lang={question_lang or 'unknown'}, "
                f"history_used={len(messages) - 2}) "
                f"for question: {question[:80]}..."
            )
            return answer
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return f"An error occurred while generating the answer: {str(e)}"

    # ─────────────────────────── ASK (Main Pipeline) ───────────────────────────

    def ask_question(
        self,
        publication_id: str,
        question: str,
        history: list[dict] | None = None,
    ) -> dict:
        """RAG pipeline: cache check → search → generate → cache save."""
        history = history or []
        has_history = bool(history)

        # 1. Detect the language of the CURRENT question. This single value
        #    drives prompt directives, history handling, and cache gating.
        question_lang = _detect_language(question)

        # 2. Build retrieval query. For follow-ups, prepend the last user
        #    message so the embedding has enough context. But only do this
        #    when the languages match — otherwise we'd embed a mixed-language
        #    query that hurts recall.
        retrieval_query = question
        if has_history:
            last_user_msg = next(
                (h for h in reversed(history) if h.get("role") == "user"),
                None,
            )
            if last_user_msg and last_user_msg.get("content"):
                last_lang = _detect_language(last_user_msg["content"])
                if not question_lang or not last_lang or question_lang == last_lang:
                    retrieval_query = f"{last_user_msg['content']}\n{question}"

        # 3. Embed once; reuse when retrieval query wasn't expanded.
        question_embedding = embedding_service.encode(question)
        retrieval_embedding = (
            embedding_service.encode(retrieval_query)
            if retrieval_query != question
            else question_embedding
        )

        # 4. Semantic cache check (language-gated, follow-up-aware).
        cached = self._check_cache(
            publication_id, question_embedding, question_lang, has_history
        )
        if cached:
            sources = self._format_sources(
                self._fetch_chunks_by_indices(publication_id, cached["source_indices"])
            )
            return {
                "answer": cached["answer"],
                "sources": sources,
                "from_cache": True,
            }

        # 5. Find relevant chunks
        total_chunks = self._get_publication_chunk_count(publication_id)
        top_k = self._determine_top_k(total_chunks)
        chunks = self._search_chunks(publication_id, retrieval_embedding, top_k=top_k)
        if not chunks:
            return {
                "answer": (
                    "Bu makale henüz indekslenmemiş veya sorunuzla ilgili bir "
                    "bölüm bulunamadı. Lütfen önce makaleyi indeksleyin."
                    if question_lang == "tr"
                    else "This article has not been indexed yet or no relevant "
                    "section was found for your question. Please index the "
                    "article first."
                ),
                "sources": [],
                "from_cache": False,
            }

        # 6. Generate answer (with one strict retry on contamination)
        answer = self._generate_answer(
            question, chunks, question_lang, history=history
        )
        if _is_answer_contaminated(answer):
            logger.warning(
                f"Contaminated answer detected for publication {publication_id}; "
                f"retrying with strict anti-leak prompt"
            )
            answer = self._generate_answer(
                question, chunks, question_lang, history=history, strict=True
            )

        # 7. Save to cache (clean answers only)
        if _is_answer_contaminated(answer):
            logger.error(
                f"Answer still contaminated after strict retry for publication "
                f"{publication_id}; skipping cache save"
            )
        else:
            source_indices = [int(c["chunk_index"]) for c in chunks]
            self._save_to_cache(
                publication_id,
                question,
                question_embedding,
                answer,
                source_indices,
                question_lang,
                is_followup=has_history,
            )

        return {
            "answer": answer,
            "sources": self._format_sources(chunks),
            "from_cache": False,
        }

    @staticmethod
    def _format_sources(chunks: list[dict]) -> list[dict]:
        """Trim source previews to a fixed length for the API response."""
        return [
            {
                "chunk_index": c["chunk_index"],
                "text": c["text"][:300] + "..." if len(c["text"]) > 300 else c["text"],
                "score": c["score"],
            }
            for c in chunks
        ]

    def is_article_indexed(self, publication_id: str) -> bool:
        if publication_id in self._chunk_count_cache:
            return self._chunk_count_cache[publication_id] > 0
        try:
            results = self.chunks_collection.get(
                where={"publication_id": publication_id},
                limit=1,
            )
            return len(results["ids"]) > 0
        except Exception:
            return False


rag_service = RagService()