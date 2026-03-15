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

        chunks = self._chunk_text(text, max_tokens=1024)
        summaries = []
        for chunk in chunks:
            result = self.summarizer(
                chunk,
                max_length=max_len,
                min_length=min_len,
                do_sample=False,
            )
            summaries.append(result[0]["summary_text"])
        return " ".join(summaries)

    def _chunk_text(self, text: str, max_tokens: int = 1024) -> list[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), max_tokens):
            chunk = " ".join(words[i : i + max_tokens])
            if chunk.strip():
                chunks.append(chunk)
        return chunks if chunks else [text]


summarization_service = SummarizationService()
