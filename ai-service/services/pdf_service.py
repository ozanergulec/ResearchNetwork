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


pdf_service = PDFService()
