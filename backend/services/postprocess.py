"""services/postprocess.py — turns raw model logits into a class mask at
the original image resolution, plus every metric the API returns.

Region counting note: these models are semantic segmentation (per-pixel
class only), not instance segmentation. "objectsFound" and
"largestRegionPixels" come from connected-component labelling of the
binary plastic mask, i.e. distinct contiguous blobs of predicted plastic,
not individually classified/counted objects. That distinction is real and
worth keeping in mind when reading the number.
"""

from typing import Dict

import numpy as np
import torch
import torch.nn.functional as F
from scipy import ndimage

from config import CLASS_NAMES


def logits_to_mask(logits: torch.Tensor, original_size: tuple[int, int]) -> np.ndarray:
    """logits: (1, num_classes, h, w) at TRAIN_RESOLUTION.
    original_size: (width, height) of the uploaded image.
    Returns a uint8 (H, W) array of class indices at the ORIGINAL resolution."""
    width, height = original_size
    # Upsample logits (not the argmax) before taking the class label, this
    # keeps the resize interpolation meaningful instead of interpolating
    # already-discrete integer labels.
    upsampled = F.interpolate(logits, size=(height, width), mode="bilinear", align_corners=False)
    mask = upsampled.argmax(dim=1).squeeze(0).to(torch.uint8).cpu().numpy()
    return mask


def compute_statistics(mask: np.ndarray) -> Dict:
    total_pixels = int(mask.size)
    plastic_pixels = int((mask == 1).sum())
    background_pixels = total_pixels - plastic_pixels
    coverage_percent = round((plastic_pixels / total_pixels) * 100, 2) if total_pixels else 0.0

    plastic_binary = (mask == 1)
    labeled, num_regions = ndimage.label(plastic_binary)
    largest_region_pixels = 0
    if num_regions > 0:
        region_sizes = ndimage.sum(plastic_binary, labeled, index=range(1, num_regions + 1))
        largest_region_pixels = int(region_sizes.max())

    classes = []
    for idx, name in enumerate(CLASS_NAMES):
        pixels = int((mask == idx).sum())
        classes.append({
            "name": name,
            "pixels": pixels,
            "percentage": round((pixels / total_pixels) * 100, 2) if total_pixels else 0.0,
        })

    return {
        "totalPixels": total_pixels,
        "plasticPixels": plastic_pixels,
        "backgroundPixels": background_pixels,
        "coveragePercent": coverage_percent,
        "objectsFound": int(num_regions),
        "largestRegionPixels": largest_region_pixels,
        "classes": classes,
    }
