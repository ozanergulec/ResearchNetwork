from pydantic import BaseModel


class SummarizeRequest(BaseModel):
    text: str
    max_length: int = 200
    min_length: int = 50


class SummarizeResponse(BaseModel):
    summary: str
