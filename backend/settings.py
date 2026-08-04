"""
settings.py — runtime configuration that isn't about model selection.
Kept separate from config.py so "which model" and "how the server behaves"
can be reasoned about independently.
"""

import os

# Accepted upload formats. Anything else is rejected before it reaches
# the model with a clear 400, per the error handling requirement.
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

MAX_UPLOAD_BYTES = int(os.environ.get("PLASTICNET_MAX_UPLOAD_MB", "15")) * 1024 * 1024

# CORS origins allowed to call this API. The deployed frontend's origin
# must be added here (or set PLASTICNET_CORS_ORIGINS as a comma separated
# list) before USE_MOCK is flipped to false in src/services/api.js.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "PLASTICNET_CORS_ORIGINS",
        "http://localhost:5173,https://sitanshusingh01.github.io"
    ).split(",")
    if origin.strip()
]

# How long a generated mask/overlay PNG stays in outputs/ before cleanup
# removes it. Kept short since nothing here is meant to be permanent
# storage, only temporary display support for the frontend that just made
# the request.
OUTPUT_RETENTION_SECONDS = int(os.environ.get("PLASTICNET_OUTPUT_RETENTION_SECONDS", "3600"))

LOG_FILE = "logs/backend.log"
