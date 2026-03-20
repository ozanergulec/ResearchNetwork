import logging
from transformers import pipeline

from config import settings

logger = logging.getLogger(__name__)


class SummarizationService:
    def __init__(self):
        self.summarizer = None

    def load_model(self):
        self.summarizer = pipeline(
            "summarization",
            model=settings.SUMMARIZATION_MODEL,
            device=-1,
            truncation=True,
        )

    def summarize(
        self,
        text: str,
        max_length: int | None = None,
        min_length: int | None = None,
    ) -> str:
        max_len = max_length or settings.MAX_SUMMARY_LENGTH
        min_len = min_length or settings.MIN_SUMMARY_LENGTH

        if len(text.split()) < min_len:
            return text

        chunks = self._chunk_text(text, max_words=500)
        to_process = chunks[:settings.MAX_SUMMARY_CHUNKS]
        logger.info(
            f"[Summarize] total_chunks={len(chunks)}, "
            f"processing={len(to_process)}, "
            f"chunk_words={[len(c.split()) for c in to_process]}"
        )

        chunk_summaries = self._summarize_chunks(to_process, max_len, min_len)
        logger.info(
            f"[Summarize] pass1 summaries: "
            f"count={len(chunk_summaries)}, "
            f"words={[len(s.split()) for s in chunk_summaries]}"
        )

        combined = " ".join(chunk_summaries)
        if len(combined.split()) > max_len and len(chunk_summaries) > 1:
            final_chunks = self._chunk_text(combined, max_words=500)
            final_summaries = self._summarize_chunks(final_chunks, max_len, min_len)
            logger.info(
                f"[Summarize] pass2 summaries: "
                f"count={len(final_summaries)}, "
                f"words={[len(s.split()) for s in final_summaries]}"
            )
            return " ".join(final_summaries)

        logger.info(f"[Summarize] final summary: {len(combined.split())} words")
        return combined

    def _summarize_chunks(
        self, chunks: list[str], max_len: int, min_len: int
    ) -> list[str]:
        summaries = []
        for chunk in chunks:
            word_count = len(chunk.split())
            if word_count < min_len:
                summaries.append(chunk)
                continue
            result = self.summarizer(
                chunk,
                max_length=max_len,
                min_length=min(min_len, max(10, word_count // 4)),
                do_sample=False,
                truncation=True,
            )
            summaries.append(result[0]["summary_text"])
        return summaries

    def _chunk_text(self, text: str, max_words: int = 500) -> list[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), max_words):
            chunk = " ".join(words[i : i + max_words])
            if chunk.strip():
                chunks.append(chunk)
        return chunks if chunks else [text]


summarization_service = SummarizationService()
