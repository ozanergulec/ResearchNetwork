import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

from routers import health, embedding, summarization, pdf, citation, match
from services.embedding_service import embedding_service
from services.summarization_service import summarization_service
from services.citation_service import citation_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading ML models — this may take a minute on first run...")

    logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
    embedding_service.load_model()
    logger.info("Embedding model loaded.")

    logger.info(f"Loading summarization model: {settings.SUMMARIZATION_MODEL}")
    summarization_service.load_model()
    logger.info("Summarization model loaded.")

    logger.info(f"Loading classification model: {settings.CLASSIFICATION_MODEL}")
    citation_service.load_model()
    logger.info("Classification model loaded.")

    logger.info("All models ready.")
    yield
    logger.info("Shutting down AI service.")


app = FastAPI(
    title="Research Network AI Service",
    description="Stateless NLP computation engine: embeddings, summarization, PDF processing, citation analysis",
    version="2.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(embedding.router)
app.include_router(summarization.router)
app.include_router(pdf.router)
app.include_router(citation.router)
app.include_router(match.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
