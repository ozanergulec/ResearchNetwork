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

# ---------------------------------------------------------------------------
# Pre-compiled patterns
# ---------------------------------------------------------------------------

MAX_CITATION_NUM = 300

_MATH_PREFIX = re.compile(
    r'(?:[UNBPFGXuΓβχ𝒰𝒩ℕ]|Bin|Poi|Exp|Var|log|diag|dim)\s*$'
    r'|[=×~≈∼<>≤≥±∓]\s*$'
)

_BRACKET_SINGLE = re.compile(r'\[(\d+)\]')
_BRACKET_MULTI  = re.compile(r'\[(\d[\d\s,.*-]*)\]')
_BRACKET_RANGE  = re.compile(r'\[(\d+)\s*[-–—]\s*(\d+)\]')

# Author building blocks — supports both "Smith" and "A. N. Smith" formats
_INITIAL  = r'(?:[A-Z]\.\s*)+'                # A.  /  A. N.  /  A. B. C.
_SURNAME  = r'[A-Z][a-zA-Z\'\u2019-]+'        # Smith, Murray-Clay, O'Brien
_SINGLE   = rf'(?:{_INITIAL}{_SURNAME}|{_SURNAME})'
_PAIR     = rf'(?:{_SINGLE}\s*(?:&|and)\s*{_SINGLE})'
_AUTHOR   = rf'(?:{_PAIR}|{_SINGLE})(?:\s+et\s+al\.?)?'
_ONE_CITE = rf'{_AUTHOR},?\s*\d{{4}}[a-z]?'
_PREFIX   = r'(?:(?:e\.g\.,?|see|cf\.?|i\.e\.,?)\s*)?'

# Full parenthetical group: (Author Year) or (Author Year; Author Year)
_PAREN_RE = re.compile(
    rf'\({_PREFIX}(?:{_ONE_CITE})(?:\s*;\s*{_PREFIX}{_ONE_CITE})*\)',
    re.UNICODE,
)

# Inline format: Author (Year)
_INLINE_RE = re.compile(
    rf'\b({_AUTHOR})\s*\((\d{{4}}[a-z]?)\)',
    re.UNICODE,
)

# Extract individual Author Year pairs from inside a matched group
_INDIVIDUAL_RE = re.compile(
    rf'({_AUTHOR}),?\s*(\d{{4}}[a-z]?)',
    re.UNICODE,
)

# PDF hyphenation artifact: "Git- tins" → "Gittins"
_HYPHEN_ARTIFACT = re.compile(r'([a-z])-\s+([a-z])')


# ---------------------------------------------------------------------------
# Sentence splitter that preserves parenthetical content
# ---------------------------------------------------------------------------

def _split_sentences(text: str) -> list[str]:
    """
    Split text into sentences without breaking inside parentheses.
    Parenthetical content (citations, e.g., et al.) is temporarily replaced
    with placeholders before splitting on '. ' boundaries.
    """
    placeholders: dict[str, str] = {}
    counter = [0]

    def _protect(m: re.Match) -> str:
        key = f"__P{counter[0]}__"
        placeholders[key] = m.group(0)
        counter[0] += 1
        return key

    # Protect innermost parens first (non-nested); repeat to handle nesting
    protected = text
    prev = None
    while prev != protected:
        prev = protected
        protected = re.sub(r'\([^()]*\)', _protect, protected)

    # Now split safely: end-of-sentence punctuation + space + capital letter
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z])', protected)

    # Restore placeholders
    sentences = []
    for part in parts:
        restored = part
        for key, val in placeholders.items():
            restored = restored.replace(key, val)
        restored = restored.strip()
        if restored:
            sentences.append(restored)

    return sentences


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------

class CitationService:
    def __init__(self):
        self.classifier = None

    def load_model(self):
        self.classifier = pipeline(
            "zero-shot-classification",
            model=settings.CLASSIFICATION_MODEL,
            device=-1,
        )

    # ------------------------------------------------------------------
    # Reference-entry filter
    # ------------------------------------------------------------------

    def _is_reference_entry(self, sentence: str) -> bool:
        stripped = sentence.strip()
        if len(stripped) < 15:
            return True
        if re.match(r'^\[\d+\]\s*[A-Z]\.\s', stripped):
            return True
        if re.match(r'^\[\d+\]\s*[A-Z][a-z]+,\s*[A-Z]\.', stripped):
            return True
        if re.match(r'^\[\d+\]', stripped):
            bib_markers = [
                'doi:', 'doi.org', 'ISBN', 'ISSN', 'arXiv:',
                'vol.', 'Vol.', 'pp.', 'no.', 'No.',
                'Proceedings of', 'Journal of', 'IEEE Trans',
            ]
            if any(m in stripped for m in bib_markers):
                return True
        return False

    # ------------------------------------------------------------------
    # Bracket citation extraction
    # ------------------------------------------------------------------

    def _extract_bracket_citations(self, sentence: str) -> list[int]:
        found: list[int] = []

        def _valid(n: int) -> bool:
            return 1 <= n <= MAX_CITATION_NUM

        def _math_prefix(m: re.Match) -> bool:
            return bool(_MATH_PREFIX.search(sentence[: m.start()]))

        for m in _BRACKET_SINGLE.finditer(sentence):
            if _math_prefix(m):
                continue
            n = int(m.group(1))
            if _valid(n) and n not in found:
                found.append(n)

        for m in _BRACKET_MULTI.finditer(sentence):
            content = m.group(1)
            if _math_prefix(m):
                continue
            if re.search(r'\d+\.\d+', content):
                continue
            nums = [int(x) for x in re.findall(r'\d+', content)]
            if not nums or any(not _valid(n) for n in nums):
                continue
            if len(nums) == 2 and abs(nums[1] - nums[0]) > 20:
                continue
            for n in nums:
                if n not in found:
                    found.append(n)

        for m in _BRACKET_RANGE.finditer(sentence):
            if _math_prefix(m):
                continue
            s, e = int(m.group(1)), int(m.group(2))
            if not _valid(e) or (e - s) > 20:
                continue
            for n in range(s, e + 1):
                if n not in found:
                    found.append(n)

        return found

    # ------------------------------------------------------------------
    # Author-year citation extraction
    # ------------------------------------------------------------------

    def _extract_author_year_citations(self, sentence: str) -> list[str]:
        clean = _HYPHEN_ARTIFACT.sub(r'\1\2', sentence)
        labels: list[str] = []
        seen: set[str] = set()

        # Parenthetical: (Author Year) or (Author Year; Author Year)
        for m in _PAREN_RE.finditer(clean):
            inner = m.group(0)[1:-1]
            for am in _INDIVIDUAL_RE.finditer(inner):
                label = f"{am.group(1).strip()} {am.group(2)}"
                if label not in seen:
                    seen.add(label)
                    labels.append(label)

        # Inline: Author (Year)
        for m in _INLINE_RE.finditer(clean):
            label = f"{m.group(1).strip()} {m.group(2)}"
            if label not in seen:
                seen.add(label)
                labels.append(label)

        return labels

    # ------------------------------------------------------------------
    # Main extraction
    # ------------------------------------------------------------------

    def extract_citation_contexts(self, full_text: str) -> list[dict]:
        body_text = pdf_service.strip_references(full_text)
        logger.info(
            "[Citation] Original: %d chars, after stripping refs: %d chars",
            len(full_text), len(body_text),
        )

        sentences = _split_sentences(body_text)
        logger.info("[Citation] Total sentences: %d", len(sentences))

        contexts: list[dict] = []
        skipped = 0

        for sent in sentences:
            if self._is_reference_entry(sent):
                skipped += 1
                continue

            citation_nums = self._extract_bracket_citations(sent)
            if citation_nums:
                contexts.append({
                    "sentence": sent,
                    "citation_numbers": citation_nums,
                    "citation_labels": [],
                })
                continue

            author_year_labels = self._extract_author_year_citations(sent)
            if author_year_labels:
                contexts.append({
                    "sentence": sent,
                    "citation_numbers": [0],  # sentinel: author-year style
                    "citation_labels": author_year_labels,
                })

        logger.info(
            "[Citation] Contexts: %d, skipped ref entries: %d",
            len(contexts), skipped,
        )
        return contexts

    # ------------------------------------------------------------------
    # Classification
    # ------------------------------------------------------------------

    def classify_intent(self, citation_context: str) -> dict:
        result = self.classifier(citation_context, candidate_labels=INTENT_LABELS)
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
        results: list[dict] = []

        for i, ctx in enumerate(contexts):
            logger.info(
                "[Citation] Classifying %d/%d: %s...",
                i + 1, len(contexts), ctx["sentence"][:80],
            )
            intent_result = self.classify_intent(ctx["sentence"])
            results.append({
                "sentence": ctx["sentence"],
                "citation_numbers": ctx["citation_numbers"],
                "citation_labels": ctx.get("citation_labels", []),
                "intent": intent_result["intent"],
                "confidence": intent_result["confidence"],
            })

        logger.info("[Citation] Done: %d classified", len(results))
        return results


citation_service = CitationService()