import logging
from groq import Groq
from config import settings

logger = logging.getLogger(__name__)

SCIENTIFIC_SUMMARY_PROMPT = """You are an expert academic paper summarizer. Analyze the following scientific paper text and produce a clear, concise summary.

Your summary MUST include:
1. The research objective or problem being addressed
2. The methodology or approach used
3. Key findings and results
4. The main contribution or significance of the work

Guidelines:
- Write in a formal, academic tone
- Be concise but preserve important technical details
- Do NOT include generic filler phrases
- Target approximately {target_words} words
- Write the summary as a single cohesive paragraph (or two if the paper is complex)
- Do NOT use markdown formatting, bullet points, or numbered lists — write plain prose only

Paper text:
{text}"""

MAX_INPUT_WORDS = 4500


class SummarizationService:
    def __init__(self):
        self.client: Groq | None = None

    def load_model(self):
        if not settings.GROQ_API_KEY:
            logger.warning(
                "GROQ_API_KEY is not set — summarization will not work. "
                "Get a free key at https://console.groq.com/keys"
            )
            return
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        logger.info(f"Groq client initialized with model: {settings.GROQ_MODEL}")

    def summarize(
        self,
        text: str,
        max_length: int | None = None,
        min_length: int | None = None,
    ) -> str:
        if not self.client:
            logger.error("Groq client not initialized — returning truncated text")
            return text[:500] + "..."

        word_count = len(text.split())
        if word_count < 30:
            return text

        target_words = max_length or 250
        input_text = self._smart_trim(text, MAX_INPUT_WORDS)

        prompt = SCIENTIFIC_SUMMARY_PROMPT.format(
            target_words=target_words,
            text=input_text,
        )

        try:
            logger.info(
                f"[Groq Summarize] original_words={word_count}, "
                f"trimmed_words={len(input_text.split())}, "
                f"target_words={target_words}, model={settings.GROQ_MODEL}"
            )
            response = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1024,
            )
            summary = response.choices[0].message.content.strip()
            logger.info(
                f"[Groq Summarize] output_words={len(summary.split())}"
            )
            return summary
        except Exception as e:
            logger.error(f"[Groq Summarize] API error: {e}")
            return self._fallback_summary(text, target_words)

    def _smart_trim(self, text: str, max_words: int) -> str:
        """Keep the beginning (intro/methodology) and end (results/conclusion)
        of the paper so the LLM sees the most informative sections."""
        words = text.split()
        if len(words) <= max_words:
            return text

        head_size = int(max_words * 0.6)
        tail_size = max_words - head_size

        head = " ".join(words[:head_size])
        tail = " ".join(words[-tail_size:])
        return head + "\n\n[...]\n\n" + tail

    def _fallback_summary(self, text: str, target_words: int) -> str:
        """Simple extractive fallback if the API call fails."""
        sentences = text.replace("\n", " ").split(". ")
        summary_sentences = []
        current_words = 0
        for sentence in sentences:
            words = len(sentence.split())
            if current_words + words > target_words * 2:
                break
            summary_sentences.append(sentence)
            current_words += words
        return ". ".join(summary_sentences).strip()


summarization_service = SummarizationService()
