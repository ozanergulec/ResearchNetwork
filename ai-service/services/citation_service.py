import re
import logging
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
from config import settings
from services.pdf_service import pdf_service

logger = logging.getLogger(__name__)

# Maximum input length in tokens for the classifier (SciBERT = 512).
# Sentences longer than this are truncated by the tokenizer.
MAX_CLASSIFIER_TOKENS = 512

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
        model_path = settings.CITATION_MODEL_PATH
        logger.info("[Citation] Loading SciBERT classifier from: %s", model_path)

        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForSequenceClassification.from_pretrained(model_path)

        # top_k=None returns scores for every label (replacement for the
        # deprecated return_all_scores=True).
        self.classifier = pipeline(
            "text-classification",
            model=model,
            tokenizer=tokenizer,
            device=-1,
            top_k=None,
            truncation=True,
            max_length=MAX_CLASSIFIER_TOKENS,
        )

        labels = list(model.config.id2label.values())
        logger.info("[Citation] Classifier ready. Labels: %s", labels)

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
        # With top_k=None the pipeline returns a list-of-lists: one inner list
        # per input, each containing {"label", "score"} for every class.
        raw = self.classifier(citation_context)
        scores = raw[0] if isinstance(raw[0], list) else raw
        scores_sorted = sorted(scores, key=lambda x: x["score"], reverse=True)

        top = scores_sorted[0]
        return {
            "intent": top["label"],
            "confidence": round(float(top["score"]), 4),
            "all_scores": {
                s["label"]: round(float(s["score"]), 4) for s in scores_sorted
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