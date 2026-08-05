"""services/model_loader.py — loads the ACTIVE_MODEL exactly once per
process and caches it. Nothing here re-instantiates or re-loads weights
per request; get_model() returns the same object every call after the
first.
"""

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
    one paying the model-load cost. Also runs one dummy forward pass: the
    first inference on a freshly loaded model is measurably slower than
    subsequent ones (CPU kernel/thread-pool warmup), so pay that cost here
    too rather than on whoever's upload happens to arrive first."""
    import torch as _torch
    from config import TRAIN_RESOLUTION

    loaded = get_model(ACTIVE_MODEL)
    dummy = _torch.zeros(1, 3, *TRAIN_RESOLUTION, device=loaded["device"])
    with _torch.no_grad():
        loaded["model"](dummy)
