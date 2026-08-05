"""services/preprocess.py — turns raw uploaded bytes into a model-ready
tensor. Anything that fails validation raises ValueError with a message
that's safe to surface directly to the frontend."""

import io

import numpy as np
from PIL import Image, UnidentifiedImageError

from config import TRAIN_RESOLUTION, NORMALIZE_MEAN, NORMALIZE_STD

# Built once at import time rather than per request.
_MEAN = np.array(NORMALIZE_MEAN, dtype=np.float32)
_STD = np.array(NORMALIZE_STD, dtype=np.float32)


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


def preprocess_array(image: Image.Image) -> np.ndarray:
    """Resize to the model's training resolution, normalise with ImageNet
    stats, return a (1, 3, H, W) float32 numpy array — model-runtime
    agnostic (feeds either torch.from_numpy() or an ONNX Runtime session
    directly, no torch dependency in this function itself).

    Uses in-place arithmetic (*=, -=, /=) throughout instead of the
    original `(array - mean) / std` (each non-in-place op allocates a new
    full H*W*3 float32 buffer; three ops back to back meant up to 3 extra
    transient copies of that array alive at once). Bounded by
    TRAIN_RESOLUTION regardless of the uploaded photo's actual size — this
    was never the dominant cost (that's the model's forward pass and the
    torch/onnxruntime import itself), so the saving here is modest, but
    it's free and correct to take."""
    target_h, target_w = TRAIN_RESOLUTION
    resized = image.resize((target_w, target_h), resample=Image.BILINEAR)

    array = np.asarray(resized, dtype=np.float32)  # (H, W, 3)
    array *= 1.0 / 255.0
    array -= _MEAN
    array /= _STD

    # HWC -> CHW. transpose() is a view; ascontiguousarray is the one
    # unavoidable copy (the model needs contiguous memory), done last so
    # there's exactly one of it instead of the extra copies above too.
    return np.ascontiguousarray(array.transpose(2, 0, 1))[np.newaxis, ...]
