"""app.py — FastAPI application entrypoint.

Run with:
    cd backend
    uvicorn app:app --host 0.0.0.0 --port 8000

The frontend's default VITE_API_BASE_URL is http://localhost:8000/api,
which is why the router below is mounted at /api.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import ACTIVE_MODEL, OUTPUTS_DIR, LOGS_DIR
from settings import CORS_ORIGINS, LOG_FILE
from services.model_loader import preload_active_model
from services.image_utils import cleanup_expired_outputs
from routes.predict import router as predict_router

LOGS_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler(LOGS_DIR.parent / LOG_FILE)],
)
logger = logging.getLogger("plasticnet.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up, ACTIVE_MODEL=%s", ACTIVE_MODEL)
    preload_active_model()  # load once here, not on the first request
    removed = cleanup_expired_outputs()
    if removed:
        logger.info("Cleaned up %d expired output file(s)", removed)
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="PlasticNet AI Inference API",
    description="Segmentation inference service for PlasticNet AI. "
                 "See backend/README.md for endpoint documentation.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")
app.include_router(predict_router, prefix="/api")


@app.get("/api/health")
def health():
    from services.model_loader import _cache
    return {
        "status": "ok",
        "activeModel": ACTIVE_MODEL,
        "modelLoaded": ACTIVE_MODEL in _cache,
    }


@app.get("/")
def root():
    return {"service": "PlasticNet AI Inference API", "docs": "/docs", "health": "/api/health"}
