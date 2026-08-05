"""services/model_loader.py — loads the ACTIVE_MODEL exactly once per
process and caches it. Nothing here re-instantiates or re-loads weights
per request; get_model() returns the same object every call after the
first.
"""

import ctypes
import gc
import importlib
import logging
import threading

import torch

from config import MODEL_REGISTRY, ACTIVE_MODEL, WEIGHTS_DIR

logger = logging.getLogger("plasticnet.model_loader")

_lock = threading.Lock()
_cache: dict[str, dict] = {}

# Backs up the OMP_NUM_THREADS/MKL_NUM_THREADS env vars set in config.py
# (which only take effect if they're set before the native BLAS libraries
# initialize). This call is the runtime equivalent and is safe to make
# again even if the env vars already applied; it's cheap and idempotent.
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

try:
    _libc = ctypes.CDLL("libc.so.6")
except OSError:
    # Not glibc/Linux (e.g. local macOS dev) — release_memory() below
    # becomes a plain gc.collect(), which is harmless everywhere.
    _libc = None


def release_memory() -> None:
    """Reclaims memory Python/torch have already freed internally but the
    C allocator is still holding onto.

    Measured on this service: a single forward pass at TRAIN_RESOLUTION
    (see preprocess.py) allocates roughly 150-250MB of intermediate
    activations depending on which registry model is active (this is
    inherent to running a CNN forward pass at that resolution, not a
    leak — confirmed by profiling get_model() before vs. after one
    forward pass in isolation). Python's refcounting and torch free that
    memory back to the process's C allocator as soon as the tensors go
    out of scope, but glibc's malloc does not hand freed heap pages back
    to the OS by default, so the process's resident set stays elevated
    indefinitely, request after request, even though nothing is actually
    using that memory anymore. On a hard-capped instance (Render's free
    tier is 512MB total) that stuck memory is the difference between the
    next request fitting or getting OOM-killed.
    malloc_trim(0) asks glibc to return whatever it can. It's a no-op
    everywhere except Linux/glibc, which is exactly where it's needed:
    Render's containers run glibc; this dev machine (macOS) does not,
    which is also why this effect isn't directly visible when profiling
    locally."""
    gc.collect()
    if _libc is not None:
        try:
            _libc.malloc_trim(0)
        except Exception:
            pass


def _resolve_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def _build_model(entry: dict) -> torch.nn.Module:
    module = importlib.import_module(entry["module"])
    model_class = getattr(module, entry["class_name"])

    if entry.get("skip_pretrained_backbone_download"):
        # BiSeNetV2.__init__ otherwise downloads a generic ImageNet-pretrained
        # backbone from GitHub on every instantiation. Pointless here since
        # load_state_dict immediately overwrites it with the real trained
        # checkpoint below, and a hard dependency on an external download
        # succeeding is not something an inference service should have.
        model_class.load_pretrain = lambda self: None

    return model_class(**entry["build_kwargs"])


def _load_weights(model: torch.nn.Module, entry: dict) -> None:
    weights_path = WEIGHTS_DIR / entry["weights_file"]
    if not weights_path.exists():
        raise FileNotFoundError(
            f"Weights file missing for model '{entry['label']}': {weights_path}. "
            f"Expected it in backend/weights/."
        )
    state_dict = torch.load(weights_path, map_location="cpu", weights_only=False)
    # strict=True on purpose: a shape or key mismatch here means the
    # checkpoint and architecture have drifted apart, and that should fail
    # loudly at startup rather than silently produce garbage predictions.
    model.load_state_dict(state_dict, strict=True)


def get_model(model_key: str | None = None) -> dict:
    """Returns {"model": <nn.Module, eval mode>, "device": torch.device,
    "label": str, "key": str}. Loads and caches on first call for a given
    model_key. model_key defaults to config.ACTIVE_MODEL."""
    key = model_key or ACTIVE_MODEL
    if key not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model '{key}'. Valid options: {list(MODEL_REGISTRY.keys())}")

    if key in _cache:
        return _cache[key]

    with _lock:
        if key in _cache:  # re-check after acquiring the lock
            return _cache[key]

        entry = MODEL_REGISTRY[key]
        logger.info("Loading model '%s' (%s)...", key, entry["label"])

        device = _resolve_device()
        model = _build_model(entry)
        _load_weights(model, entry)

        if key == "bisenet":
            # aux2..aux5_4 heads are only needed to make the checkpoint's
            # key set match during load_state_dict. They're dead weight for
            # inference, drop them and switch to the eval forward path.
            model.aux_mode = "eval"
            for attr in ("aux2", "aux3", "aux4", "aux5_4"):
                if hasattr(model, attr):
                    delattr(model, attr)

        model.to(device)
        model.eval()

        loaded = {"model": model, "device": device, "label": entry["label"], "key": key}
        _cache[key] = loaded
        logger.info("Model '%s' ready on device=%s", key, device)
        return loaded


def preload_active_model() -> None:
    """Called once at FastAPI startup so the first real request isn't the
    one paying the model-build/weight-load cost (get_model() below,
    measured at ~10-15MB and well under a second — cheap, always worth
    doing eagerly).

    Deliberately does NOT also run a dummy warmup forward pass anymore.
    That used to trade a slightly slower first real request for
    consistent latency on every request. Measured cost of that trade-off
    on this service: one forward pass at TRAIN_RESOLUTION leaves the
    process's resident memory permanently ~150-250MB higher (see
    release_memory()'s docstring for why), so a warmup pass at startup
    means the service starts every deployment already most of the way to
    Render's 512MB free-tier ceiling before a single real request has
    arrived. Skipping it keeps the resting baseline low (~200-230MB
    measured) so the first real request's own forward pass has enough
    headroom to actually complete instead of getting OOM-killed. The
    first request being a little slower is the explicitly accepted
    trade-off for that headroom."""
    get_model(ACTIVE_MODEL)
    release_memory()
