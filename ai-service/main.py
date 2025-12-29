from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(
    title="Research Network AI Service",
    description="AI-powered matching engine for academic collaboration",
    version="1.0.0"
)

# CORS configuration for .NET backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:5001",
        "https://localhost:5000",
        "https://localhost:5001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class UserProfile(BaseModel):
    id: str
    fullName: str
    interestTags: List[str]
    institution: Optional[str] = None
    department: Optional[str] = None

class MatchRequest(BaseModel):
    userId: str
    userProfile: UserProfile
    allUsers: List[UserProfile]
    topN: int = 5

class MatchResult(BaseModel):
    userId: str
    fullName: str
    score: float
    matchedTags: List[str]

class MatchResponse(BaseModel):
    userId: str
    recommendations: List[MatchResult]
    timestamp: datetime


# Endpoints
@app.get("/health")
def health_check():
    """Health check endpoint for service monitoring"""
    return {
        "status": "healthy",
        "service": "ai-service",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/hello")
def hello():
    """Hello World endpoint for testing .NET integration"""
    return {
        "message": "Hello from AI Service!",
        "description": "This is the Research Network AI Matching Engine",
        "version": "1.0.0"
    }


@app.post("/api/match", response_model=MatchResponse)
def find_matches(request: MatchRequest):
    """
    Find matching researchers based on interest tags.
    
    This is a simple tag-matching algorithm as a placeholder.
    In production, this would use NLP and ML models for better matching.
    """
    recommendations = []
    user_tags = set(tag.lower() for tag in request.userProfile.interestTags)
    
    for candidate in request.allUsers:
        # Skip the requesting user
        if candidate.id == request.userId:
            continue
        
        candidate_tags = set(tag.lower() for tag in candidate.interestTags)
        matched_tags = user_tags.intersection(candidate_tags)
        
        if matched_tags:
            # Simple Jaccard similarity
            union_tags = user_tags.union(candidate_tags)
            score = len(matched_tags) / len(union_tags) if union_tags else 0
            
            recommendations.append(MatchResult(
                userId=candidate.id,
                fullName=candidate.fullName,
                score=round(score, 3),
                matchedTags=list(matched_tags)
            ))
    
    # Sort by score descending and take top N
    recommendations.sort(key=lambda x: x.score, reverse=True)
    recommendations = recommendations[:request.topN]
    
    return MatchResponse(
        userId=request.userId,
        recommendations=recommendations,
        timestamp=datetime.utcnow()
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
