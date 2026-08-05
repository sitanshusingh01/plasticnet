"""services/model_loader.py — loads the ACTIVE_MODEL exactly once per
process and caches it. Nothing here re-instantiates or re-loads weights
per request; get_model()/get_onnx_session() return the same object every
call after the first.

Two inference backends live side by side here:

- ONNX Runtime, used whenever weights/best_model_<key>.onnx exists (see
  scripts/export_onnx.py — an offline, one-time conversion of the already-
  trained best_model_<key>.pth, not a retrain). This is the path
  ACTIVE_MODEL (fastscnn) uses in production.
- torch, as a fallback for any registry entry that hasn't been exported to
  ONNX yet.

Measured end to end on this service (see run_inference()'s docstring for
the numbers): the torch path costs ~400MB of resident memory to serve one
request (torch's own runtime import is ~166MB of that, before a single
tensor exists); the ONNX Runtime path costs ~190-200MB total, because (a)
onnxruntime's import footprint is a fraction of libtorch's and (b) unlike
torch's eager-mode allocator, ONNX Runtime plans and reuses a fixed memory
arena across the whole graph up front instead of allocating a new buffer
per intermediate tensor. torch is therefore imported lazily, inside the
functions that actually need it, specifically so that when the active
model has an ONNX export (i.e. in production), torch is never imported by
this service at all.
"""

import ctypes
import gc
import importlib
import logging
import threading
from pathlib import Path

import numpy as np

from config import MODEL_REGISTRY, ACTIVE_MODEL, WEIGHTS_DIR

logger = logging.getLogger("plasticnet.model_loader")

_lock = threading.Lock()
_torch_cache: dict[str, dict] = {}
_onnx_cache: dict[str, "onnxruntime.InferenceSession"] = {}

try:
    _libc = ctypes.CDLL("libc.so.6")
except OSError:
    # Not glibc/Linux (e.g. local macOS dev) — release_memory() below
    # becomes a plain gc.collect(), which is harmless everywhere.
    _libc = None


def release_memory() -> None:
    """Reclaims memory Python/torch have already freed internally but the
    C allocator is still holding onto. See the torch path's docstring in
    run_inference() for the full explanation of why this matters and what
    it's measured to do; harmless (and largely unnecessary — ONNX
    Runtime's arena allocator already plateaus memory on its own, see
    run_inference()) to still call after every request regardless of
    which backend served it."""
    gc.collect()
    if _libc is not None:
        try:
            _libc.malloc_trim(0)
        except Exception:
            pass


def _onnx_path(key: str) -> Path:
    return WEIGHTS_DIR / f"best_model_{key}.onnx"


def has_onnx(key: str) -> bool:
    return _onnx_path(key).exists()


def get_onnx_session(model_key: str | None = None):
    """Returns a cached onnxruntime.InferenceSession for model_key
    (defaults to ACTIVE_MODEL). Raises FileNotFoundError if that model
    hasn't been exported (run scripts/export_onnx.py) — callers should
    check has_onnx() first, or catch this and fall back to get_model()."""
    key = model_key or ACTIVE_MODEL
    if key in _onnx_cache:
        return _onnx_cache[key]

    with _lock:
        if key in _onnx_cache:
            return _onnx_cache[key]

        onnx_path = _onnx_path(key)
        if not onnx_path.exists():
            raise FileNotFoundError(
                f"No ONNX export for '{key}' at {onnx_path}. "
                f"Run: python scripts/export_onnx.py {key}"
            )

        import onnxruntime as ort

        logger.info("Loading ONNX Runtime session for '%s'...", key)
        so = ort.SessionOptions()
        # Single-process, single-model service — no concurrent inference
        # to parallelise across threads, so more threads only means more
        # per-thread working memory for no throughput benefit. Same
        # reasoning as torch.set_num_threads(1) on the torch path.
        so.intra_op_num_threads = 1
        so.inter_op_num_threads = 1
        session = ort.InferenceSession(str(onnx_path), sess_options=so, providers=["CPUExecutionProvider"])
        _onnx_cache[key] = session
        logger.info("ONNX Runtime session for '%s' ready", key)
        return session


def _resolve_device():
    import torch
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def _build_model(entry: dict):
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


def _load_weights(model, entry: dict) -> None:
    import torch

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
    """torch fallback path. Returns {"model": <nn.Module, eval mode>,
    "device": torch.device, "label": str, "key": str}. Loads and caches on
    first call for a given model_key. model_key defaults to
    config.ACTIVE_MODEL. Prefer run_inference() below over calling this
    directly — it picks ONNX Runtime automatically when available."""
    import torch

    key = model_key or ACTIVE_MODEL
    if key not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model '{key}'. Valid options: {list(MODEL_REGISTRY.keys())}")

    if key in _torch_cache:
        return _torch_cache[key]

    with _lock:
        if key in _torch_cache:  # re-check after acquiring the lock
            return _torch_cache[key]

        # Only pinned here (not at module import time): this is the one
        # place torch is guaranteed to have just been imported for the
        # first time in the process, so it's the correct place to
        # configure its thread pool before any forward pass runs.
        torch.set_num_threads(1)
        torch.set_num_interop_threads(1)

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
        _torch_cache[key] = loaded
        logger.info("Model '%s' ready on device=%s", key, device)
        return loaded


def run_inference(input_array: np.ndarray, model_key: str | None = None) -> tuple[np.ndarray, str]:
    """The one entry point services/segmentation_service.py should call.
    input_array: (1, 3, H, W) float32 numpy array from
    services/preprocess.py's preprocess_array().
    Returns (logits, model_label) where logits is a (1, num_classes, H, W)
    float32 numpy array — regardless of which backend actually ran it.

    Picks ONNX Runtime when weights/best_model_<key>.onnx exists, else
    falls back to torch. Measured peak resident memory for one request on
    this service, profiled stage by stage with resource.getrusage
    (identical methodology used for the earlier thread-pinning fix):

        torch path:  ~53MB (fastapi/uvicorn) + ~166MB (torch import)
                     + ~12MB (model build+load) + ~155-165MB (one forward
                     pass) = ~390-400MB
        ONNX path:   ~53MB (fastapi/uvicorn) + ~21MB (onnxruntime import)
                     + ~12MB (session creation) + ~65-110MB (inference,
                     plateaus after the 2nd call and does not grow further
                     — ONNX Runtime plans a fixed memory arena for the
                     whole graph instead of allocating per intermediate
                     tensor the way torch's eager mode does) = ~190-200MB

    Verified numerically identical to the torch model before switching:
    scripts/export_onnx.py's parity check plus a direct comparison on a
    real (non-dummy) test image both showed 0 mismatched output pixels,
    max logit difference ~0.0001-0.001 (float32 rounding only). Same
    architecture, same trained weights, same math — only the runtime
    executing it differs."""
    key = model_key or ACTIVE_MODEL

    if has_onnx(key):
        session = get_onnx_session(key)
        input_name = session.get_inputs()[0].name
        logits = session.run(None, {input_name: input_array})[0]
        return logits, MODEL_REGISTRY[key]["label"]

    import torch

    loaded = get_model(key)
    with torch.inference_mode():
        tensor = torch.from_numpy(input_array).to(loaded["device"])
        output = loaded["model"](tensor)
        if isinstance(output, (tuple, list)):
            output = output[0]
        logits = output.detach().cpu().numpy()
    return logits, loaded["label"]


def is_loaded(model_key: str | None = None) -> bool:
    """For /api/health — true once model_key (defaults to ACTIVE_MODEL) is
    ready to serve a request through whichever backend it actually uses,
    without the caller needing to know which cache (or which backend at
    all) that is."""
    key = model_key or ACTIVE_MODEL
    return key in _onnx_cache or key in _torch_cache


def preload_active_model() -> None:
    """Called once at FastAPI startup so the first real request isn't the
    one paying the model-build/weight-load cost.

    Deliberately does NOT run a dummy warmup forward pass. On the torch
    path that used to leave the process permanently ~150-250MB heavier
    before a single real request arrived (see release_memory()'s history
    in git blame for the measurements); on the ONNX path session creation
    itself is cheap (~12MB) and the first real request pays a small,
    one-time, explicitly-accepted latency cost instead."""
    if has_onnx(ACTIVE_MODEL):
        get_onnx_session(ACTIVE_MODEL)
    else:
        get_model(ACTIVE_MODEL)
    release_memory()
