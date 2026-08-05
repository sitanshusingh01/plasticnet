"""services/segmentation_service.py — orchestrates one prediction end to
end: validate -> preprocess -> infer -> postprocess -> save outputs ->
build the response the frontend expects.

Runtime-agnostic: everything from preprocessing through postprocessing
here works on plain numpy arrays, not torch tensors. Which backend
(ONNX Runtime or torch) actually executes the forward pass is decided by
services/model_loader.run_inference() — see its docstring for the
measured memory difference between the two."""

import logging
import time

from config import MODEL_REGISTRY, ACTIVE_MODEL
from services.model_loader import run_inference, release_memory
from services.preprocess import load_and_validate_image, preprocess_array
from services.postprocess import logits_to_mask_np, compute_statistics
from services.image_utils import save_outputs, new_job_id, class_hex

logger = logging.getLogger("plasticnet.segmentation_service")


def run_segmentation(raw_bytes: bytes, filename: str) -> dict:
    start = time.perf_counter()

    image = load_and_validate_image(raw_bytes)
    original_size = image.size  # (width, height)

    input_array = preprocess_array(image)
    # Pre-bound to None so the `del` in `finally` below is always valid,
    # including when an exception is raised before these get their real
    # value (e.g. the forward pass itself failing).
    logits = mask = None

    try:
        logits, model_label = run_inference(input_array, ACTIVE_MODEL)
        mask = logits_to_mask_np(logits, original_size)
        stats = compute_statistics(mask)

        job_id = new_job_id()
        urls = save_outputs(job_id, image, mask)
    finally:
        # Runs on the success path AND on any exception raised above (a
        # failed request still allocated the input array and whatever got
        # as far as the forward pass). release_memory() is the
        # malloc_trim-backed cleanup in model_loader.py: on this
        # memory-constrained instance, a request that fails without
        # releasing its memory would leave the next request — success or
        # not — with even less headroom than it had.
        del input_array, logits, mask, image
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
        "model": model_label,
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
        job_id, model_label, stats["coveragePercent"], stats["objectsFound"], elapsed,
    )
    return response


def list_available_models() -> list[dict]:
    return [
        {"key": key, "label": entry["label"], "active": key == ACTIVE_MODEL}
        for key, entry in MODEL_REGISTRY.items()
    ]
