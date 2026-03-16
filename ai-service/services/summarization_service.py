from transformers import pipeline
from config import settings


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
        summaries = []
        for chunk in chunks[:3]:
            result = self.summarizer(
                chunk,
                max_length=max_len,
                min_length=min(min_len, max(10, len(chunk.split()) // 4)),
                do_sample=False,
                truncation=True,
            )
            summaries.append(result[0]["summary_text"])
        return " ".join(summaries)

    def _chunk_text(self, text: str, max_words: int = 500) -> list[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), max_words):
            chunk = " ".join(words[i : i + max_words])
            if chunk.strip():
                chunks.append(chunk)
        return chunks if chunks else [text]


summarization_service = SummarizationService()
