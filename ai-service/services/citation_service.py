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
            
            # Filter out mathematical notation from bracket-style matches
            # Skip brackets preceded by math/stats symbols: U [0,1], N [0,1], = [...], × [...]
            # Skip brackets containing decimals: [0.5, 4.0]
            MATH_PREFIX = re.compile(r'(?:[UNBPFGXuΓβχ𝒰𝒩ℕ]|Bin|Poi|Exp|Var|log|diag|dim)\s*$|[=×~≈∼<>≤≥±∓]\s*$')
            MAX_CITATION_NUM = 300

            # Find [n] style citations
            citation_nums = []
            for m in re.finditer(r'\[(\d+)\]', sent):
                num = int(m.group(1))
                prefix = sent[:m.start()]
                if MATH_PREFIX.search(prefix):
                    continue
                if num > MAX_CITATION_NUM:
                    continue
                citation_nums.append(str(num))
            
            # Also find [n, m] style (multiple in one bracket)
            for m in re.finditer(r'\[(\d[\d\s,.*-]*)\]', sent):
                bracket_content = m.group(1)
                prefix = sent[:m.start()]
                # Skip if preceded by math symbol
                if MATH_PREFIX.search(prefix):
                    continue
                # Skip if bracket contains decimal numbers (e.g., [0.5, 4.0])
                if re.search(r'\d+\.\d+', bracket_content):
                    continue
                # Extract individual numbers
                nums_in_bracket = [int(x) for x in re.findall(r'\d+', bracket_content)]
                if not nums_in_bracket:
                    continue
                # Skip if any number exceeds citation range
                if any(n > MAX_CITATION_NUM for n in nums_in_bracket):
                    continue
                # Skip if numbers look like a numeric interval (e.g., [0, 100], [10, 500]) 
                # — real multi-citations have close consecutive numbers like [1, 2, 3]
                if len(nums_in_bracket) == 2:
                    gap = abs(nums_in_bracket[1] - nums_in_bracket[0])
                    if gap > 20:
                        continue
                for num in nums_in_bracket:
                    if num not in [int(c) for c in citation_nums]:
                        citation_nums.append(str(num))
            
            # Also find [n-m] range style citations
            for m in re.finditer(r'\[(\d+)\s*[-–—]\s*(\d+)\]', sent):
                prefix = sent[:m.start()]
                if MATH_PREFIX.search(prefix):
                    continue
                start_n, end_n = int(m.group(1)), int(m.group(2))
                # Skip large ranges (likely not citations)
                if end_n > MAX_CITATION_NUM or (end_n - start_n) > 20:
                    continue
                for num in range(start_n, end_n + 1):
                    if str(num) not in citation_nums:
                        citation_nums.append(str(num))
            
            # Also try author-year style citations, covering common formats:
            # (Author 2001), (Author, 2001), (Author & Author 2001),
            # (Author and Author 2001), (Author et al. 2001),
            # (Author et al., 2001), (e.g., Author 2001; Author 2002)
            # Also handles year suffixes like 2022a, 2022b
            # Also handles "see Author 2001" prefix forms
            
            # Fix PDF line-break hyphenation artifacts: "Git- tins" or "Git-\ntins" → "Gittins"
            sent_clean = re.sub(r'([a-z])-\s+([a-z])', r'\1\2', sent)
            
            author_year_matches = re.findall(
                r'\('
                r'(?:(?:e\.g\.,?|see|cf\.?|c\.f\.|i\.e\.,?)\s*)?'  # optional prefix
                r'(?:'
                r'[A-Z][a-zA-Z\x27\u2019-]+'                        # first author surname
                r'(?:'
                r'(?:\s+(?:&|and)\s+[A-Z][a-zA-Z\x27\u2019-]+)'    # & / and second author
                r'|(?:\s+et\s+al\.?)'                                # et al.
                r')?'
                r',?\s*\d{4}[a-z]?'                                  # optional comma + year + optional suffix
                r')'
                r'(?:\s*;\s*'                                        # semicolon separator
                r'(?:(?:e\.g\.,?|see|cf\.?|c\.f\.|i\.e\.,?)\s*)?'
                r'[A-Z][a-zA-Z\x27\u2019-]+'
                r'(?:'
                r'(?:\s+(?:&|and)\s+[A-Z][a-zA-Z\x27\u2019-]+)'
                r'|(?:\s+et\s+al\.?)'
                r')?'
                r',?\s*\d{4}[a-z]?'
                r')*'                                                # zero or more additional citations
                r'\)',
                sent_clean
            )
            
            # Extract individual author-year labels from matched parenthetical groups
            author_year_labels = []
            if author_year_matches:
                # Pattern to extract individual "Author Year" entries from inside parens
                individual_pattern = re.compile(
                    r'([A-Z][a-zA-Z\x27\u2019-]+'
                    r'(?:\s+(?:&|and)\s+[A-Z][a-zA-Z\x27\u2019-]+)?'
                    r'(?:\s+et\s+al\.?)?'
                    r'),?\s*(\d{4}[a-z]?)'
                )
                for match_text in author_year_matches:
                    # Remove outer parens for parsing
                    inner = match_text[1:-1] if match_text.startswith('(') else match_text
                    for m in individual_pattern.finditer(inner if inner else match_text):
                        label = f"{m.group(1).strip()} {m.group(2)}"
                        if label not in author_year_labels:
                            author_year_labels.append(label)
            
            if citation_nums:
                # Deduplicate
                unique_nums = list(dict.fromkeys([int(c) for c in citation_nums]))
                contexts.append({
                    "sentence": sent.strip(),
                    "citation_numbers": unique_nums,
                    "citation_labels": [],
                })
            elif author_year_labels:
                contexts.append({
                    "sentence": sent.strip(),
                    "citation_numbers": [0],
                    "citation_labels": author_year_labels,
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
                    "citation_labels": ctx.get("citation_labels", []),
                    "intent": intent_result["intent"],
                    "confidence": intent_result["confidence"],
                }
            )
        logger.info(f"[Citation] Analysis complete: {len(results)} citations classified")
        return results


citation_service = CitationService()

