import re
import logging
from transformers import pipeline
from config import settings
from services.pdf_service import pdf_service

logger = logging.getLogger(__name__)

INTENT_LABELS = [
    "background information",
    "uses methodology from",
    "compares results with",
    "supports findings of",
    "contradicts findings of",
    "extends work of",
    "critiques approach of",
    "builds theoretical framework from",
    "provides empirical evidence for",
    "identifies limitations of",
    "proposes alternative to",
    "replicates study of",
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

    def _is_reference_entry(self, sentence: str) -> bool:
        """Filter out only obvious bibliography/reference list entries."""
        stripped = sentence.strip()
        
        # Too short to be meaningful
        if len(stripped) < 15:
            return True
        
        # Starts with [n] then author initial pattern: "[1] A. Smith" or "[1] Smith, A."
        if re.match(r'^\[\d+\]\s*[A-Z]\.\s', stripped):
            return True
        if re.match(r'^\[\d+\]\s*[A-Z][a-z]+,\s*[A-Z]\.', stripped):
            return True
        
        # Starts with [n] and contains strong bibliographic markers
        if re.match(r'^\[\d+\]', stripped):
            bib_markers = ['doi:', 'doi.org', 'ISBN', 'ISSN', 'arXiv:',
                          'vol.', 'Vol.', 'pp.', 'no.', 'No.',
                          'Proceedings of', 'Journal of', 'IEEE Trans']
            for marker in bib_markers:
                if marker in stripped:
                    return True
        
        return False

    def extract_citation_contexts(self, full_text: str) -> list[dict]:
        # Use the PDF service's proven reference stripping
        body_text = pdf_service.strip_references(full_text)
        
        logger.info(f"[Citation] Original text: {len(full_text)} chars, "
                     f"After stripping refs: {len(body_text)} chars")
        
        # Split into sentences — support both period-space and newline splits
        sentences = re.split(r"(?<=[.!?])\s+", body_text)
        logger.info(f"[Citation] Total sentences found: {len(sentences)}")
        
        contexts = []
        skipped = 0
        for sent in sentences:
            # Skip reference entries that slipped through
            if self._is_reference_entry(sent):
                skipped += 1
                continue
            
            # Find [n] style citations
            citation_nums = re.findall(r"\[(\d+)\]", sent)
            
            # Also find [n, m] style (multiple in one bracket)
            multi_citations = re.findall(r"\[(\d+(?:\s*,\s*\d+)+)\]", sent)
            for mc in multi_citations:
                for num in re.findall(r"\d+", mc):
                    if int(num) not in [int(c) for c in citation_nums]:
                        citation_nums.append(num)
            
            # Also find [n-m] range style citations
            range_citations = re.findall(r"\[(\d+)\s*[-–—]\s*(\d+)\]", sent)
            for start, end in range_citations:
                for num in range(int(start), int(end) + 1):
                    if str(num) not in citation_nums:
                        citation_nums.append(str(num))
            
            # Also try author-year style: (Author, 2021) or (Author et al., 2021)
            author_year_matches = re.findall(
                r'\(([A-Z][a-z]+(?:\s+(?:et\s+al\.|and\s+[A-Z][a-z]+))?(?:,\s*\d{4}))\)',
                sent
            )
            
            if citation_nums:
                # Deduplicate
                unique_nums = list(dict.fromkeys([int(c) for c in citation_nums]))
                contexts.append({
                    "sentence": sent.strip(),
                    "citation_numbers": unique_nums,
                })
            elif author_year_matches:
                contexts.append({
                    "sentence": sent.strip(),
                    "citation_numbers": [0],
                })
        
        logger.info(f"[Citation] Contexts found: {len(contexts)}, "
                     f"Skipped as ref entries: {skipped}")
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
        for i, ctx in enumerate(contexts):
            logger.info(f"[Citation] Classifying {i+1}/{len(contexts)}: "
                        f"{ctx['sentence'][:80]}...")
            intent_result = self.classify_intent(ctx["sentence"])
            results.append(
                {
                    "sentence": ctx["sentence"],
                    "citation_numbers": ctx["citation_numbers"],
                    "intent": intent_result["intent"],
                    "confidence": intent_result["confidence"],
                }
            )
        logger.info(f"[Citation] Analysis complete: {len(results)} citations classified")
        return results


citation_service = CitationService()

