from pydantic import BaseModel
from datetime import datetime


class UserProfile(BaseModel):
    id: str
    fullName: str
    interestTags: list[str]
    institution: str | None = None
    department: str | None = None


class MatchRequest(BaseModel):
    userId: str
    userProfile: UserProfile
    allUsers: list[UserProfile]
    topN: int = 5


class MatchResult(BaseModel):
    userId: str
    fullName: str
    score: float
    matchedTags: list[str]


class MatchResponse(BaseModel):
    userId: str
    recommendations: list[MatchResult]
    timestamp: datetime
