# PlasticNet AI — Inference Backend

FastAPI service that runs the trained segmentation models behind the PlasticNet AI frontend. Deployed at:

- **API base:** https://plasticnet-backend.onrender.com/api
- **Swagger docs:** https://plasticnet-backend.onrender.com/docs
- **Health:** https://plasticnet-backend.onrender.com/api/health

The frontend (`src/services/api.js`) calls this service directly for every segmentation prediction; there is no mock path for segmentation anywhere in the application.

## What these models actually do

Every checkpoint in `weights/` was inspected directly (final layer shape checked against the state dict, not assumed) before this backend was built. All four are **binary segmentation models**: each pixel is classified as `Background` or `Plastic`. None of them distinguish bottle from wrapper from polythene, because none were trained to.

The API therefore returns a real, honest `coveragePercent`, plastic/background pixel counts, a real mask and overlay image, and a connected-component count of distinct plastic regions (`objectsFound`). It does **not** return a per-category breakdown; the `classes` array reflects that honestly (`Background` and `Plastic` only) rather than fabricating six categories the model cannot predict. Per-category classification requires training a multi-class model.

## Setup (local)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

- Health check: `GET http://localhost:8000/api/health`
- Interactive API docs: `http://localhost:8000/docs`
- The model loads once at startup, not per request. Startup deliberately does **not** run a warmup forward pass (it used to; removed — see "Inference runtime & memory" below for why): the first real upload after startup is a little slower than the rest, in exchange for a much lower resting memory footprint.

CUDA is used automatically if available, otherwise CPU. No environment-specific code is needed either way.

## Inference runtime & memory

`fastscnn` (the deployed default) runs through **ONNX Runtime**, not torch, via `weights/best_model_fastscnn.onnx` — an offline, one-time export of the exact same trained checkpoint (`scripts/export_onnx.py`; not a retrain, see that script's docstring). `enet`, `bisenet`, and `mobilenet` don't have an ONNX export yet and fall back to torch automatically (`services/model_loader.run_inference()` checks for a matching `.onnx` file and picks the backend accordingly — nothing else in the codebase needs to know which one actually ran).

This exists because Render's free tier caps the instance at 512MB, and the torch path doesn't fit reliably: profiled stage by stage with `resource.getrusage`, importing torch alone costs ~166MB before a single tensor exists, and one forward pass at `TRAIN_RESOLUTION` costs another ~155-165MB of activation memory that's inherent to the architecture (confirmed by profiling all four registry entries the same way — fastscnn is already the cheapest of the four; enet, bisenet, and mobilenet cost more, not less). Combined with everything else in the process, that reliably exceeded 512MB and got the instance OOM-killed on every real request.

ONNX Runtime's import is a fraction of that (~20MB), and — more importantly — it plans a single reusable memory arena for the whole computation graph up front instead of allocating a new buffer per intermediate tensor the way torch's eager mode does, so its memory plateaus after the first couple of requests instead of staying elevated. Measured end to end on this service:

| | torch path (previous) | ONNX Runtime path (current) |
|---|---|---|
| Resident memory after 2 real requests | ~430-440MB | ~270-280MB |
| Headroom under Render's 512MB cap | ~80MB | ~230-240MB |

Verified numerically identical to the torch model before switching: `scripts/export_onnx.py`'s built-in parity check plus a direct comparison on a real (non-dummy) test image both showed 0 mismatched output pixels, max logit difference ~0.0001-0.001 (float32 rounding only) — same architecture, same trained weights, same math, only the runtime executing it differs.

To add an ONNX export for another registry entry (say, to try `enet` on a memory-constrained instance):

```bash
cd backend
pip install -r scripts/requirements-export.txt   # onnx + onnxscript, export-only, not in requirements.txt
python scripts/export_onnx.py enet
```

This writes `weights/best_model_enet.onnx` (+ a `.onnx.data` companion file for the external weight tensors — both must stay together and both must be committed), and `run_inference()` picks it up automatically the next time that model is active.

## Switching models

One value. Either edit `config.py`:

```python
ACTIVE_MODEL = "bisenet"   # was "fastscnn"
```

or set an environment variable, which takes precedence and needs no code change:

```bash
PLASTICNET_ACTIVE_MODEL=bisenet uvicorn app:app --host 0.0.0.0 --port 8000
```

Valid values: `fastscnn`, `mobilenet`, `bisenet`, `enet` — see `MODEL_REGISTRY` in `config.py`. Each entry was verified against its checkpoint: architecture instantiated, weights loaded with `strict=True`, forward pass run. Adding a new model means adding one registry entry. Only `fastscnn` has an ONNX export today (see "Inference runtime & memory" above) — switching to another falls back to torch automatically, at that model's own memory cost below.

Measured on CPU, single 720×1280 inference:

| Model | Weights size | Peak memory (one forward pass) | ~Inference time |
|---|---|---|---|
| FastSCNN | 4.7 MB | ~165MB (~377MB total via torch; ~190-280MB via ONNX Runtime) | ~0.1–0.9s |
| MobileNetV2Seg | 53.7 MB | ~644MB | ~0.6s |
| BiSeNetV2 | 20 MB | ~885MB | ~0.8–2s |
| ENet | 1.65 MB | ~246MB | ~3.7s cold, faster warm |

Fast-SCNN is the deployed default: fastest, smallest weights, **and** the cheapest of the four in peak memory — not a coincidence worth assuming away; it was re-measured against the other three specifically to check before relying on it as "the memory-constrained choice." The accuracy tradeoff against the others hasn't been benchmarked on a labeled test set, so it's a reasonable default rather than a proven-best one on quality grounds, but on Render's free tier it's also the only one of the four with enough headroom to run reliably at all (mobilenet and bisenet exceed 512MB on a single forward pass before anything else in the process is counted).

## API

### `POST /api/segmentation/run`

Multipart form upload, field name `file`. Accepts JPG, PNG, WEBP up to 15 MB.

```bash
curl -X POST -F "file=@photo.jpg" https://plasticnet-backend.onrender.com/api/segmentation/run
```

Response `200`:

```json
{
  "success": true,
  "jobId": "JOB-49bdbd08",
  "status": "complete",
  "mode": "segmentation",
  "filename": "photo.jpg",
  "model": "Fast-SCNN",
  "coveragePercent": 6.42,
  "plasticPixels": 20512,
  "backgroundPixels": 241632,
  "totalPixels": 262144,
  "objectsFound": 4,
  "largestRegionPixels": 8210,
  "processingTime": "0.91 sec",
  "imageWidth": 960,
  "imageHeight": 640,
  "maskUrl": "/outputs/JOB-49bdbd08_mask.png",
  "overlayUrl": "/outputs/JOB-49bdbd08_overlay.png",
  "classes": [
    { "name": "Background", "pixels": 241632, "percentage": 92.17, "colorHex": "#000000" },
    { "name": "Plastic", "pixels": 20512, "percentage": 7.83, "colorHex": "#C0392B" }
  ],
  "note": "This model performs binary plastic-vs-background segmentation. Per-category breakdown (bottle, cap, wrapper, polythene, shoe, foam) requires a multi-class model, which is not yet trained."
}
```

`maskUrl` and `overlayUrl` are relative to this service's origin; the frontend makes them absolute before rendering. Generated PNGs are retained for `PLASTICNET_OUTPUT_RETENTION_SECONDS` (default one hour) and then cleaned up.

`objectsFound` / `largestRegionPixels` come from connected-component labelling of the binary mask — distinct contiguous plastic regions, not per-instance object detection.

Errors use FastAPI's native shape `{"detail": "human readable message"}`: `400` for an unreadable/unsupported/too-small image, `413` over the size limit, `422` for a malformed request (e.g. missing `file` field, where `detail` is FastAPI's validation array), `503` if the model is unavailable or the server ran out of memory, `500` otherwise. All `detail` strings for 4xx cases are safe to show directly in a UI, and the frontend does exactly that.

### `GET /api/segmentation/models`

Lists every registered model and which one is currently active. Useful for checking what a deployment is serving.

### `GET /api/health`

`{"status": "ok", "activeModel": "fastscnn", "modelLoaded": true}`

## Frontend integration

`src/services/api.js` owns the entire integration:

- Base URL comes from `VITE_API_BASE_URL` at build time, defaulting to the deployed Render service. It must end in `/api`.
- `runSegmentation(file)` POSTs the multipart upload, waits up to 120 seconds, and retries exactly once if the failure looks like a Render cold start (no response, timeout, or 502/503/504), telling the user the server is waking up.
- Relative `maskUrl`/`overlayUrl` values are converted to absolute URLs against the API origin.
- Backend `detail` messages are shown to the user verbatim for permanent errors.

If the frontend is ever served from a new origin, add it to `CORS_ORIGINS` in `settings.py` or via the `PLASTICNET_CORS_ORIGINS` environment variable (comma separated). The GitHub Pages origin and localhost are allowed by default.

## Deployment (Render)

The service runs from this `backend/` directory. Build installs `requirements.txt`; start command:

```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

The weights (and the `fastscnn` ONNX export) are tracked in git, so the deploy needs no external downloads. Runs on Render's **free tier (512MB)** — see "Inference runtime & memory" above for the measurements behind that claim and its actual headroom; it is not a large margin, so keep an eye on it if traffic grows or the active model changes. On plans that sleep when idle, expect a cold start (container boot + model load) on the first request after a quiet period; the frontend absorbs this automatically. Redeploys happen automatically when `main` is pushed if auto-deploy is enabled on the service.

Note on the separately provided `final_int8_model_*.pth` files: they are quantization-aware-training checkpoints (still float32, with observer/fake-quant buffers) that require the exact QAT-prepared module graph to load, which was not provided. The plain `best_model_*.pth` files load cleanly with `strict=True` and are what this service uses.

## Folder structure

```
backend/
  app.py                        FastAPI app, CORS, static /outputs mount, startup preload
  config.py                     MODEL_REGISTRY + ACTIVE_MODEL, class names/colors, normalization,
                                 thread-count env vars (set before torch/numpy import anywhere)
  settings.py                   upload limits, CORS origins, output retention
  schemas.py                    Pydantic response models
  routes/
    predict.py                  POST /segmentation/run, GET /segmentation/models
  services/
    model_loader.py             ONNX Runtime + torch-fallback backends, run_inference() picks
                                 automatically based on which weights/best_model_<key>.onnx exist
    segmentation_service.py     orchestrates one prediction end to end (runtime-agnostic, numpy only)
    preprocess.py                validate upload, resize, normalize (returns numpy, not a torch tensor)
    postprocess.py               argmax mask at original resolution, statistics (numpy only — its own
                                 bilinear upsample replicates torch's align_corners=False exactly,
                                 verified against it, so behavior is unchanged either backend runs)
    image_utils.py               colour mask, overlay compositing (single-buffer, region-scoped
                                 blend — not full-frame — see git history for why), output cleanup
  models/                       the four architecture definitions (torch fallback path only)
  scripts/
    export_onnx.py               offline .pth -> .onnx conversion with a built-in numerical parity
                                 check; not part of the running service
    requirements-export.txt      onnx + onnxscript, only needed to run export_onnx.py
  weights/                      best_model_*.pth (all four) + best_model_fastscnn.onnx(.data)
                                 (the deployed default's ONNX export)
  outputs/                      generated mask/overlay PNGs, served at /outputs, auto-cleaned
  logs/                         backend.log
  requirements.txt
```
