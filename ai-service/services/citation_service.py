import re
from transformers import pipeline
from config import settings

INTENT_LABELS = [
    "background information",
    "uses methodology from",
    "compares results with",
    "supports findings of",
    "contradicts findings of",
    "extends work of",
]


class CitationService:
    def __init__(self):
        self.classifier = None

    def load_model(self):
        self.classifier = pipeline(
            "zero-shot-classification",
            model=settings.CLASSIFICATION_MODEL,
            device=-1,
        )

    def extract_citation_contexts(self, full_text: str) -> list[dict]:
        sentences = re.split(r"(?<=[.!?])\s+", full_text)
        contexts = []
        for sent in sentences:
            citation_nums = re.findall(r"\[(\d+)\]", sent)
            if citation_nums:
                contexts.append(
                    {
                        "sentence": sent.strip(),
                        "citation_numbers": [int(c) for c in citation_nums],
                    }
                )
        return contexts

    def classify_intent(self, citation_context: str) -> dict:
        result = self.classifier(
            citation_context,
            candidate_labels=INTENT_LABELS,
        )
        return {
            "intent": result["labels"][0],
            "confidence": round(result["scores"][0], 4),
            "all_scores": {
                label: round(score, 4)
                for label, score in zip(result["labels"], result["scores"])
            },
        }

    def analyze_full_text(self, full_text: str) -> list[dict]:
        contexts = self.extract_citation_contexts(full_text)
        results = []
        for ctx in contexts:
            intent_result = self.classify_intent(ctx["sentence"])
            results.append(
                {
                    "sentence": ctx["sentence"],
                    "citation_numbers": ctx["citation_numbers"],
                    "intent": intent_result["intent"],
                    "confidence": intent_result["confidence"],
                }
            )
        return results


citation_service = CitationService()
