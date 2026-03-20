import re
import fitz  # PyMuPDF


class PDFService:
    def extract_text(self, pdf_bytes: bytes) -> str:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text

    def extract_abstract(self, full_text: str) -> str | None:
        patterns = [
            r"(?i)abstract\s*[:\-—]?\s*\n?(.*?)(?=\n\s*(?:introduction|keywords?|1[\.\s]|I[\.\s]))",
            r"(?i)abstract\s*[:\-—]?\s*(.*?)(?=\n\n)",
        ]
        for pattern in patterns:
            match = re.search(pattern, full_text, re.DOTALL)
            if match:
                abstract = match.group(1).strip()
                if len(abstract) > 50:
                    return abstract
        return None

    def extract_keywords(self, full_text: str) -> list[str]:
        pattern = r"(?i)keywords?\s*[:\-—]\s*(.*?)(?=\n\s*(?:introduction|1[\.\s]|I[\.\s]|\n\n))"
        match = re.search(pattern, full_text, re.DOTALL)
        if match:
            raw = match.group(1).strip()
            return [kw.strip() for kw in re.split(r"[;,·•]", raw) if kw.strip()]
        return []

    def extract_references(self, full_text: str) -> list[str]:
        pattern = r"(?i)(?:references|bibliography)\s*\n(.*)"
        match = re.search(pattern, full_text, re.DOTALL)
        if match:
            ref_text = match.group(1)
            refs = re.split(r"\n\s*\[\d+\]|\n\s*\d+\.", ref_text)
            return [r.strip() for r in refs if len(r.strip()) > 20]
        return []

    def parse_reference(self, raw_ref: str) -> dict:
        """Parse a raw reference string into structured data (title, DOI, year, authors)."""
        result = {"raw": raw_ref, "title": None, "doi": None, "year": None, "authors": None}

        doi_match = re.search(
            r"(?:doi[:\s]*|https?://doi\.org/)(10\.\d{4,}/[^\s,;\"'\]]+)",
            raw_ref,
            re.IGNORECASE,
        )
        if doi_match:
            result["doi"] = doi_match.group(1).rstrip(".")

        year_match = re.search(r"\b(19|20)\d{2}\b", raw_ref)
        if year_match:
            result["year"] = int(year_match.group(0))

        title = self._extract_title_from_ref(raw_ref)
        if title:
            result["title"] = title

        authors = self._extract_authors_from_ref(raw_ref)
        if authors:
            result["authors"] = authors

        return result

    def _extract_title_from_ref(self, raw_ref: str) -> str | None:
        # IEEE style: "Title in quotes"
        quoted = re.search(r'"([^"]{10,})"', raw_ref)
        if quoted:
            return quoted.group(1).strip().rstrip(".")

        # APA style: Authors (Year). Title. Journal...
        apa = re.search(
            r"\(\d{4}\)\.\s*([^.]{10,?}\.)",
            raw_ref,
        )
        if apa:
            return apa.group(1).strip().rstrip(".")

        # Fallback: text after year, before journal/venue indicators
        fallback = re.search(
            r"\b(?:19|20)\d{2}\b[.)]*\s*[,.]?\s*([^,]{10,?})[.,]",
            raw_ref,
        )
        if fallback:
            candidate = fallback.group(1).strip().rstrip(".")
            if len(candidate) > 10:
                return candidate

        return None

    def _extract_authors_from_ref(self, raw_ref: str) -> str | None:
        # Try to get text before the year as authors
        match = re.match(r"^(.+?)(?:\(?\b(?:19|20)\d{2}\b)", raw_ref)
        if match:
            authors = match.group(1).strip().rstrip(".,;")
            if 3 < len(authors) < 200:
                return authors
        return None

    def strip_references(self, full_text: str) -> str:
        """Remove references/bibliography section from the end of the text."""
        last_match = None
        for match in re.finditer(
            r"(?i)\n\s*(?:references|bibliography)\s*\n", full_text
        ):
            last_match = match
        if last_match:
            return full_text[: last_match.start()].strip()
        return full_text

    def get_body_text(self, full_text: str) -> str:
        """Extract the main body: strip abstract/preamble from the start and references from the end."""
        body = self.strip_references(full_text)

        intro_match = re.search(
            r"(?i)\n\s*(?:1[\.\s]+\s*introduction|introduction)\s*\n",
            body,
        )
        if intro_match:
            body = body[intro_match.start():].strip()

        return body

    def parse_all_references(self, full_text: str) -> list[dict]:
        raw_refs = self.extract_references(full_text)
        return [self.parse_reference(ref) for ref in raw_refs]


pdf_service = PDFService()
