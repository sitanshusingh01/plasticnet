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
    class pixels are left as the original photo.

    The previous implementation built this by allocating a full-resolution
    RGBA copy of the original, a second full-resolution RGBA colour layer,
    and then handed both to PIL's alpha_composite for a third full-
    resolution RGBA result — three H*W*4-byte buffers alive at once. For a
    real phone photo (12MP+) that's 100MB+ just for this step, dwarfing
    everything else in the request on a memory-constrained instance.

    Compositing a semi-transparent layer over a fully OPAQUE base always
    yields alpha=255 everywhere (Porter-Duff "over": out_a = src_a +
    dst_a*(1-src_a), and dst_a=1 here since the original photo has no
    transparency) — confirmed against Pillow's actual alpha_composite
    output (identical to within +/-1 per channel from float/fixed-point
    rounding, i.e. imperceptible, and only in this cosmetic visualization
    image; it does not touch the mask or any reported statistic). That
    means the result can be built directly into a single output buffer:
    start from the original photo, then blend the class colour in-place
    only at the pixels that were actually classified as that class, rather
    than allocating separate full-frame layers unconditionally."""
    rgb = np.asarray(original.convert("RGB"))
    out = np.empty((*mask.shape, 4), dtype=np.uint8)
    out[..., :3] = rgb
    out[..., 3] = 255
    for idx, name in enumerate(CLASS_NAMES):
        if name == "Background":
            continue
        color = np.array(CLASS_COLORS[name], dtype=np.float32)
        region = mask == idx
        selected = rgb[region].astype(np.float32)  # only the detected pixels, not the whole frame
        out[..., :3][region] = np.round(selected * (1 - alpha) + color * alpha).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


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
