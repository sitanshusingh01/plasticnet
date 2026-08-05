"""services/segmentation_service.py — orchestrates one prediction end to
end: validate -> preprocess -> infer -> postprocess -> save outputs ->
build the response the frontend expects."""

import logging
import time

import torch

from config import MODEL_REGISTRY, ACTIVE_MODEL
from services.model_loader import get_model, release_memory
from services.preprocess import load_and_validate_image, preprocess
from services.postprocess import logits_to_mask, compute_statistics
from services.image_utils import save_outputs, new_job_id, class_hex

logger = logging.getLogger("plasticnet.segmentation_service")


def run_segmentation(raw_bytes: bytes, filename: str) -> dict:
    start = time.perf_counter()

    image = load_and_validate_image(raw_bytes)
    original_size = image.size  # (width, height)

    loaded = get_model(ACTIVE_MODEL)
    model = loaded["model"]
    device = loaded["device"]

    tensor = preprocess(image).to(device)
    # Pre-bound to None so the `del` in `finally` below is always valid,
    # including when an exception is raised before these get their real
    # value (e.g. the forward pass itself failing).
    output = logits = mask = None

    try:
        # inference_mode is a stricter, slightly leaner version of no_grad:
        # it skips autograd's version-counter bookkeeping entirely rather
        # than just not recording it, which matters here because this
        # process runs on a memory-constrained instance (see config.py's
        # thread-pinning comment) and every avoidable allocation counts.
        with torch.inference_mode():
            output = model(tensor)
            logits = output[0] if isinstance(output, (tuple, list)) else output

        mask = logits_to_mask(logits, original_size)
        stats = compute_statistics(mask)

        job_id = new_job_id()
        urls = save_outputs(job_id, image, mask)
    finally:
        # Runs on the success path AND on any exception raised above (a
        # failed request still allocated the input tensor and whatever
        # got as far as the forward pass). release_memory() is the
        # malloc_trim-backed cleanup in model_loader.py: on this
        # memory-constrained instance, a request that fails without
        # releasing its memory would leave the next request — success or
        # not — with even less headroom than it had.
        del tensor, output, logits, mask, image
        release_memory()

    elapsed = time.perf_counter() - start

    classes_with_color = [
        {**entry, "colorHex": class_hex(entry["name"])}
        for entry in stats["classes"]
    ]

    response = {
        "success": True,
        "jobId": job_id,
        "status": "complete",
        "mode": "segmentation",
        "filename": filename,
        "model": loaded["label"],
        "coveragePercent": stats["coveragePercent"],
        "plasticPixels": stats["plasticPixels"],
        "backgroundPixels": stats["backgroundPixels"],
        "totalPixels": stats["totalPixels"],
        "objectsFound": stats["objectsFound"],
        "largestRegionPixels": stats["largestRegionPixels"],
        "processingTime": f"{elapsed:.2f} sec",
        "imageWidth": original_size[0],
        "imageHeight": original_size[1],
        "maskUrl": urls["maskUrl"],
        "overlayUrl": urls["overlayUrl"],
        "classes": classes_with_color,
        "note": (
            "This model performs binary plastic-vs-background segmentation. "
            "Per-category breakdown (bottle, cap, wrapper, polythene, shoe, "
            "foam) requires a multi-class model, which is not yet trained."
        ),
    }

    logger.info(
        "job=%s model=%s coverage=%.2f%% objects=%d time=%.2fs",
        job_id, loaded["label"], stats["coveragePercent"], stats["objectsFound"], elapsed,
    )
    return response


def list_available_models() -> list[dict]:
    return [
        {"key": key, "label": entry["label"], "active": key == ACTIVE_MODEL}
        for key, entry in MODEL_REGISTRY.items()
    ]
