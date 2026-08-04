"""services/preprocess.py — turns raw uploaded bytes into a model-ready
tensor. Anything that fails validation raises ValueError with a message
that's safe to surface directly to the frontend."""

import io

import numpy as np
import torch
from PIL import Image, UnidentifiedImageError

from config import TRAIN_RESOLUTION, NORMALIZE_MEAN, NORMALIZE_STD


def load_and_validate_image(raw_bytes: bytes) -> Image.Image:
    if not raw_bytes:
        raise ValueError("Uploaded file is empty")
    try:
        image = Image.open(io.BytesIO(raw_bytes))
        image.load()  # force a full decode now, catches truncated files early
    except UnidentifiedImageError:
        raise ValueError("File is not a readable image (unsupported or corrupted format)")
    except OSError as exc:
        raise ValueError(f"Image could not be decoded, it may be corrupted: {exc}")

    if image.mode != "RGB":
        image = image.convert("RGB")

    width, height = image.size
    if width < 32 or height < 32:
        raise ValueError(f"Image is too small to process ({width}x{height})")

    return image


def preprocess(image: Image.Image) -> torch.Tensor:
    """Resize to the model's training resolution, normalise with ImageNet
    stats, return a (1, 3, H, W) float32 tensor."""
    target_h, target_w = TRAIN_RESOLUTION
    resized = image.resize((target_w, target_h), resample=Image.BILINEAR)

    array = np.asarray(resized, dtype=np.float32) / 255.0  # (H, W, 3)
    mean = np.array(NORMALIZE_MEAN, dtype=np.float32)
    std = np.array(NORMALIZE_STD, dtype=np.float32)
    array = (array - mean) / std

    tensor = torch.from_numpy(array).permute(2, 0, 1).unsqueeze(0).contiguous()
    return tensor.float()
