"""routes/predict.py — the one endpoint this phase of the project needs:
POST /segmentation/run, multipart file upload, matches exactly what
src/services/api.js's runInference() already posts to.
"""

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from services.segmentation_service import run_segmentation, list_available_models
from settings import ALLOWED_CONTENT_TYPES, ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES

logger = logging.getLogger("plasticnet.routes.predict")

router = APIRouter()


@router.post("/segmentation/run")
def segmentation_run(file: UploadFile = File(...)):
    filename = file.filename or "upload.jpg"
    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if file.content_type not in ALLOWED_CONTENT_TYPES and extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type or extension}'. "
                   f"Upload a JPG, PNG or WEBP image.",
        )

    # Plain `def` (not `async def`) is deliberate: FastAPI runs synchronous
    # path functions in a worker thread automatically, so a slow CPU-bound
    # inference call here doesn't block the event loop from handling other
    # requests (health checks, other uploads) at the same time. That's why
    # this reads via the underlying sync file object instead of `await
    # file.read()`.
    raw_bytes = file.file.read()

    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        size_mb = len(raw_bytes) / (1024 * 1024)
        limit_mb = MAX_UPLOAD_BYTES / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Image is {size_mb:.1f}MB, which is over the {limit_mb:.0f}MB limit.",
        )

    try:
        result = run_segmentation(raw_bytes, filename)
        return JSONResponse(content=result)

    except ValueError as exc:
        # Validation-level failure (bad image, too small, unreadable). Safe
        # to show this message directly, it never contains internals.
        logger.warning("Validation error for %s: %s", filename, exc)
        raise HTTPException(status_code=400, detail=str(exc))

    except FileNotFoundError as exc:
        # Missing weights file, a deployment/config problem, not the
        # caller's fault.
        logger.error("Model weights missing: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="The segmentation model is not available right now. Try again shortly.",
        )

    except RuntimeError as exc:
        message = str(exc)
        if "CUDA" in message or "out of memory" in message.lower():
            logger.error("GPU/memory error during inference: %s", exc)
            raise HTTPException(
                status_code=503,
                detail="The server ran out of memory processing this image. "
                       "Try a smaller image or try again shortly.",
            )
        logger.exception("Unexpected runtime error during inference")
        raise HTTPException(status_code=500, detail="Inference failed unexpectedly.")

    except Exception:
        logger.exception("Unhandled error in segmentation_run for %s", filename)
        raise HTTPException(status_code=500, detail="Something went wrong processing this image.")


@router.get("/segmentation/models")
def segmentation_models():
    """Not required by the frontend today, exposed for convenience when
    checking what's loaded / what ACTIVE_MODEL currently resolves to."""
    return {"models": list_available_models()}
