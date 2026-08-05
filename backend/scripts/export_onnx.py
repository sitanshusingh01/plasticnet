"""scripts/export_onnx.py — one-time, offline conversion of an already-
trained checkpoint (best_model_<key>.pth) to ONNX. Not part of the running
service: run this by hand (or in CI) whenever a checkpoint changes, commit
the resulting .onnx file, and services/model_loader.py picks it up
automatically at server startup.

This does NOT retrain, fine-tune, or otherwise modify the model in any way.
It builds the exact same architecture from models/<key>.py, loads the exact
same best_model_<key>.pth with strict=True (the same loader
services/model_loader.py uses for the torch path), and asks torch to trace
that already-trained module into ONNX's graph format. The weights, the
architecture, and the math are unchanged; only the runtime that executes
them differs. verify_onnx.py-equivalent numerical parity check is built
into this script (see main()) so the export is validated every time it
runs, not just once by hand.

Usage:
    cd backend
    python scripts/export_onnx.py fastscnn
    python scripts/export_onnx.py fastscnn enet bisenet mobilenet   # multiple
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import torch

from config import MODEL_REGISTRY, TRAIN_RESOLUTION, WEIGHTS_DIR
from services.model_loader import get_model


def export_one(key: str) -> Path:
    if key not in MODEL_REGISTRY:
        raise SystemExit(f"Unknown model '{key}'. Valid options: {list(MODEL_REGISTRY.keys())}")

    entry = MODEL_REGISTRY[key]
    loaded = get_model(key)  # builds architecture + loads best_model_<key>.pth, strict=True
    model = loaded["model"]

    dummy = torch.zeros(1, 3, *TRAIN_RESOLUTION)
    onnx_path = WEIGHTS_DIR / f"best_model_{key}.onnx"

    print(f"[{key}] exporting {entry['label']} -> {onnx_path.name} ...")
    torch.onnx.export(
        model,
        dummy,
        str(onnx_path),
        input_names=["input"],
        output_names=["logits"],
        opset_version=18,
        dynamic_axes=None,  # fixed TRAIN_RESOLUTION input, matches services/preprocess.py exactly
        do_constant_folding=True,
    )

    _verify_parity(key, model, onnx_path, dummy)
    return onnx_path


def _verify_parity(key: str, torch_model: torch.nn.Module, onnx_path: Path, dummy: torch.Tensor) -> None:
    """Runs the same input through both the original torch module and the
    freshly exported ONNX graph, and fails loudly if they disagree by more
    than float32 rounding noise. This is the "no retraining, no accuracy
    change" guarantee for the export, checked by the script itself rather
    than trusted on faith."""
    import onnxruntime as ort

    with torch.no_grad():
        torch_out = torch_model(dummy)
        if isinstance(torch_out, (tuple, list)):
            torch_out = torch_out[0]
        torch_out = torch_out.numpy()

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    onnx_out = session.run(None, {"input": dummy.numpy()})[0]

    max_abs_diff = float(np.abs(torch_out - onnx_out).max())
    torch_argmax = torch_out.argmax(axis=1)
    onnx_argmax = onnx_out.argmax(axis=1)
    mismatched = int((torch_argmax != onnx_argmax).sum())
    total = torch_argmax.size

    print(
        f"[{key}] parity check on a dummy (zeros) input: "
        f"max logit diff={max_abs_diff:.6f}, "
        f"argmax mismatches={mismatched}/{total} ({100 * mismatched / total:.4f}%)"
    )
    if max_abs_diff > 0.01:
        raise SystemExit(
            f"[{key}] ONNX export diverges from the torch model by {max_abs_diff:.4f}, "
            f"more than expected float32 rounding noise. Not safe to use — investigate "
            f"before deploying this export."
        )
    print(f"[{key}] OK — ONNX export matches the torch model within floating-point rounding.")


def main() -> None:
    keys = sys.argv[1:] or ["fastscnn"]
    for key in keys:
        export_one(key)


if __name__ == "__main__":
    main()
