from datetime import datetime, timezone
from fastapi import APIRouter
from models.match import MatchRequest, MatchResponse, MatchResult

router = APIRouter(prefix="/api", tags=["Match"])


@router.post("/match", response_model=MatchResponse)
def find_matches(request: MatchRequest):
    """
    Tag-based matching (legacy).
    Will be superseded by vector-based matching via the .NET backend
    once embeddings are integrated.
    """
    recommendations = []
    user_tags = set(tag.lower() for tag in request.userProfile.interestTags)

    for candidate in request.allUsers:
        if candidate.id == request.userId:
            continue

        candidate_tags = set(tag.lower() for tag in candidate.interestTags)
        matched_tags = user_tags.intersection(candidate_tags)

        if matched_tags:
            union_tags = user_tags.union(candidate_tags)
            score = len(matched_tags) / len(union_tags) if union_tags else 0

            recommendations.append(
                MatchResult(
                    userId=candidate.id,
                    fullName=candidate.fullName,
                    score=round(score, 3),
                    matchedTags=list(matched_tags),
                )
            )

    recommendations.sort(key=lambda x: x.score, reverse=True)
    recommendations = recommendations[: request.topN]

    return MatchResponse(
        userId=request.userId,
        recommendations=recommendations,
        timestamp=datetime.now(timezone.utc),
    )
