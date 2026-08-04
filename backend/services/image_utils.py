"""services/image_utils.py — colour mask rendering, transparent overlay
compositing, and cleanup of files written to outputs/."""

import time
import uuid
from pathlib import Path

import numpy as np
from PIL import Image

from config import CLASS_NAMES, CLASS_COLORS, OUTPUTS_DIR
from settings import OUTPUT_RETENTION_SECONDS


def class_hex(name: str) -> str:
    r, g, b = CLASS_COLORS[name]
    return f"#{r:02X}{g:02X}{b:02X}"


def colorize_mask(mask: np.ndarray) -> Image.Image:
    height, width = mask.shape
    rgb = np.zeros((height, width, 3), dtype=np.uint8)
    for idx, name in enumerate(CLASS_NAMES):
        rgb[mask == idx] = CLASS_COLORS[name]
    return Image.fromarray(rgb, mode="RGB")


def build_overlay(original: Image.Image, mask: np.ndarray, alpha: float = 0.45) -> Image.Image:
    """Alpha-blends the colour mask onto the original image, background
    class stays fully transparent so the source photo shows through
    everywhere nothing was detected."""
    original_rgba = original.convert("RGBA")
    color_layer = np.zeros((*mask.shape, 4), dtype=np.uint8)
    for idx, name in enumerate(CLASS_NAMES):
        if name == "Background":
            continue  # leave background pixels alpha=0
        r, g, b = CLASS_COLORS[name]
        region = mask == idx
        color_layer[region] = (r, g, b, int(255 * alpha))
    overlay_layer = Image.fromarray(color_layer, mode="RGBA")
    return Image.alpha_composite(original_rgba, overlay_layer)


def save_outputs(job_id: str, original: Image.Image, mask: np.ndarray) -> dict[str, str]:
    mask_image = colorize_mask(mask)
    overlay_image = build_overlay(original, mask)

    mask_path = OUTPUTS_DIR / f"{job_id}_mask.png"
    overlay_path = OUTPUTS_DIR / f"{job_id}_overlay.png"
    mask_image.save(mask_path, format="PNG")
    overlay_image.save(overlay_path, format="PNG")

    return {
        "maskUrl": f"/outputs/{mask_path.name}",
        "overlayUrl": f"/outputs/{overlay_path.name}",
    }


def new_job_id() -> str:
    return f"JOB-{uuid.uuid4().hex[:8]}"


def cleanup_expired_outputs() -> int:
    """Removes generated PNGs older than OUTPUT_RETENTION_SECONDS. Called
    on a schedule from app.py, not on every request, so a slow disk never
    adds latency to a prediction."""
    now = time.time()
    removed = 0
    for path in Path(OUTPUTS_DIR).glob("*.png"):
        if now - path.stat().st_mtime > OUTPUT_RETENTION_SECONDS:
            path.unlink(missing_ok=True)
            removed += 1
    return removed
