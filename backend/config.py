"""
config.py — model registry and the single switch that selects which
trained segmentation model the API serves.

Changing ACTIVE_MODEL (or the PLASTICNET_ACTIVE_MODEL env var) is the only
thing required to swap models. Nothing else in the backend, and nothing in
the frontend, needs to change.

Every entry in MODEL_REGISTRY was verified directly against its checkpoint
before being added here: the architecture is instantiated, the matching
best_model_*.pth is loaded with strict=True, and a forward pass is run.
See backend/README.md for how that verification was done.

Class contract for every model currently in this registry: 2 classes,
index 0 = background, index 1 = plastic. These are binary segmentation
models (plastic vs. not-plastic), not per-category classifiers. There is
no bottle/cap/wrapper/polythene/shoe/foam distinction available from this
checkpoint generation, only "is this pixel plastic". See NUM_CLASSES /
CLASS_NAMES below, and backend/README.md, for the full explanation.
"""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
WEIGHTS_DIR = BACKEND_DIR / "weights"
OUTPUTS_DIR = BACKEND_DIR / "outputs"
LOGS_DIR = BACKEND_DIR / "logs"

for d in (WEIGHTS_DIR, OUTPUTS_DIR, LOGS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# Binary segmentation contract, true for every model below. If a future
# checkpoint is trained with more classes, add a "num_classes" /
# "class_names" override on that specific registry entry rather than
# changing this default, so mixed-generation models can coexist.
NUM_CLASSES = 2
CLASS_NAMES = ["Background", "Plastic"]
CLASS_COLORS = {
    # RGB, used for the colour mask and the transparent overlay.
    "Background": (0, 0, 0),
    "Plastic": (192, 57, 43),  # matches the app's existing "danger" red
}

# Every model here was trained and exported at this resolution. Inputs are
# resized to this before inference and the output mask is resized back up
# to the original upload's resolution.
TRAIN_RESOLUTION = (720, 1280)  # (height, width)

# ImageNet normalisation. Confirmed correct for the MobileNetV2 encoder
# (torchvision backbone, pretrained on ImageNet). ENet, Fast-SCNN and
# BiSeNetV2 are trained from scratch with no fixed normalisation baked into
# the architecture, so ImageNet stats are the standard, safe default for
# all four given no dataset-specific mean/std was supplied. If the training
# script used different stats, update MEAN / STD here, this is the one
# place that would need to change.
NORMALIZE_MEAN = [0.485, 0.456, 0.406]
NORMALIZE_STD = [0.229, 0.224, 0.225]

MODEL_REGISTRY = {
    "fastscnn": {
        "label": "Fast-SCNN",
        "module": "models.fastscnn",
        "class_name": "FastSCNN",
        "build_kwargs": {"in_channels": 3, "num_classes": NUM_CLASSES, "dropout": 0.3},
        "weights_file": "best_model_fastscnn.pth",
    },
    "mobilenet": {
        "label": "MobileNetV2Seg",
        "module": "models.mobilenet",
        "class_name": "MobileNetV2Seg",
        "build_kwargs": {"num_classes": NUM_CLASSES, "pretrained": False},
        "weights_file": "best_model_mobilenet.pth",
    },
    "bisenet": {
        "label": "BiSeNetV2",
        "module": "models.bisenet2",
        "class_name": "BiSeNetV2",
        # aux_mode='train' builds the aux2..aux5_4 heads present in the
        # checkpoint so strict state_dict loading succeeds; model_loader
        # switches aux_mode to 'eval' immediately after loading.
        "build_kwargs": {"n_classes": NUM_CLASSES, "aux_mode": "train"},
        "weights_file": "best_model_bisenet.pth",
        "skip_pretrained_backbone_download": True,
    },
    "enet": {
        "label": "ENet",
        "module": "models.enet",
        "class_name": "ENet",
        "build_kwargs": {"num_classes": NUM_CLASSES},
        "weights_file": "best_model_enet.pth",
    },
}

# The one line you change to switch models. Env var takes precedence so a
# deployment can override it without touching source.
ACTIVE_MODEL = os.environ.get("PLASTICNET_ACTIVE_MODEL", "fastscnn")

if ACTIVE_MODEL not in MODEL_REGISTRY:
    raise ValueError(
        f"ACTIVE_MODEL='{ACTIVE_MODEL}' is not in MODEL_REGISTRY. "
        f"Valid options: {list(MODEL_REGISTRY.keys())}"
    )
