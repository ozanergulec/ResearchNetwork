from pydantic import BaseModel


class TagSuggestRequest(BaseModel):
    text: str
    existing_tags: list[str] = []
    max_suggestions: int = 6


class TagSuggestResponse(BaseModel):
    suggested_tags: list[str]
