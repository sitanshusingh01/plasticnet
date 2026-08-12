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

## Zone Mapping

Divides Dal Lake into monitoring zones, assigns every citizen report to one automatically by coordinates, and tracks per-zone risk. This is a separate subsystem from segmentation: it has its own database, its own router, and touches segmentation nowhere.

**Single source of truth**: `data/dal_lake_zones.geojson`. One `FeatureCollection`, one polygon per zone, each feature's `properties` carrying `zoneId`, `name`, `areaSqm`, `centroidLat`, `centroidLng`, `defaultRisk`. Nothing else contains zone coordinates. If the boundary ever changes, regenerate this one file and restart, both the API and the map pick up the new shapes automatically.

**Generating it**: `scripts/generate_zones.py <boundary.geojson>` takes a single boundary polygon and grid-clip tessellates it into ~28 zones (`--target` to change that). This is a partition by construction: grid cells don't overlap each other, and their union covers exactly the input boundary, so "no gaps, no overlaps" isn't a separate check run after the fact, it's true because of how the shapes are built. Interior cells come out as plain squares; cells that straddle the shoreline get clipped to the actual boundary, which is what gives edge zones their irregular, coastline-following shape. The script refuses to write output if its own post-hoc validation (union area vs. boundary area, pairwise overlap area) doesn't come back clean.

Boundary source: **India-WRIS** (Water Resources Information System, Ministry of Jal Shakti), object id 757, district Srinagar, state JK, obtained via the [india-geodata](https://github.com/yashveeeeeeer/india-geodata) open dataset catalog (CC0). 160-vertex polygon, area 1400.4 hectares, bounds and centroid independently cross-checked against published water-quality literature before being used. This is a real government-sourced boundary, not a traced-by-hand approximation, see `data/dal_lake_boundary.geojson`'s own `properties.source` field for the full citation.

Generating the boundary this way surfaced a real bug in the tessellation, worth noting: the original version dropped any grid-cell intersection smaller than a size threshold, which was fine on a smooth test boundary but left actual gaps once run against the lake's real irregular shoreline (Dal Lake has several narrow inlets and a small detached basin to the southwest). Fixed by merging undersized slivers into a touching neighbor instead of discarding them, `_merge_small_pieces()` in the script. 28 zones, 100% boundary coverage, zero overlaps, confirmed by the script's own validation before it writes anything.

**Database**: SQLite (`data/plasticnet.db`), three tables in `db_models.py`:
- `Zone` — one row per polygon, plus live `total_reports`, `pending_reports`, `resolved_reports`, `average_coverage`, `current_risk`
- `ZoneReportLog` — one row per report ever assigned to a zone, this is what `average_coverage` and the trend calculation are computed from
- `RiskOverride` — append-only audit trail of authority manual overrides (officer name, reason, timestamp), never edited or deleted

At startup, `load_zones_from_geojson()` upserts every feature into `Zone`: geometry/name/area/centroid always refresh from the file, but stats and risk are left alone for a zone that already exists, so a restart doesn't reset report history. **Known limitation**: Render's free tier disk is ephemeral across a full redeploy (a new build), though it survives a sleep/wake cycle on the same deployment. Zone stats will reset on the next redeploy until this points at a real Postgres instance instead, at which point only `PLASTICNET_DATABASE_URL` needs to change, nothing in `db_models.py` or `zone_service.py` does.

**Point-in-polygon**: Shapely, an in-memory list of `(zone_id, Polygon)` built once at startup and rebuilt whenever zones reload. `find_zone_for_point(lat, lng)` is a linear scan, correct and fast enough at ~28 zones; if the zone count ever grows by an order of magnitude, that's the one function to revisit (an STRtree spatial index, also from Shapely, is the natural next step).

**Risk scoring** (`compute_risk` in `services/zone_service.py`): documented heuristic, not a trained model. No reports ever → white. Otherwise a 0-100 score blends report volume (capped at 5+ reports), average coverage (capped at 10%+), and recency (reports within 7 days score higher than 8-30 days, which score higher than older), mapped onto yellow/orange/red at 35 and 65. An active manual override always wins over the computed score.

Endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/zones` | GeoJSON FeatureCollection, every zone with live stats in `properties` |
| `GET` | `/api/zones/{zoneId}` | One zone, plus `trend`, `latestReport`, `authorityRemarks` |
| `GET` | `/api/zones/{zoneId}/reports` | Every report logged against that zone |
| `POST` | `/api/zones/assign` | `{latitude, longitude, coveragePercent?, severity?, reportRef?}` → finds the zone, logs the report, returns `{zoneId, zoneName, risk}`. `422` if the point falls outside every zone. |
| `PATCH` | `/api/zones/{zoneId}/risk` | `{riskLevel, officerName, reason}` → authority override |
| `PATCH` | `/api/zones/reports/{reportRef}/status` | `{status}` → keeps pending/resolved counts in sync when a report's status changes elsewhere. `{"synced": false}` (not an error) for a `reportRef` this service never logged. |

Frontend never computes a colour or a coordinate: `src/pages/ZoneMapping.jsx` renders `properties.risk` directly, and `src/pages/CitizenReport.jsx` calls `POST /api/zones/assign` automatically during submission (best effort, a failure here never blocks the report itself from going through).

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
    zones.py                    the six Zone Mapping endpoints, see "Zone Mapping" above
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
    zone_service.py              GeoJSON loading, point-in-polygon, risk scoring, stats, overrides
  models/                       the four architecture definitions (torch fallback path only)
  database.py                    SQLAlchemy engine/session, SQLite by default (see "Zone Mapping")
  db_models.py                   Zone / ZoneReportLog / RiskOverride ORM models
  scripts/
    export_onnx.py               offline .pth -> .onnx conversion with a built-in numerical parity
                                 check; not part of the running service
    requirements-export.txt      onnx + onnxscript, only needed to run export_onnx.py
    generate_zones.py            boundary polygon -> dal_lake_zones.geojson, see "Zone Mapping"
  data/
    dal_lake_zones.geojson       generated zone polygons, the single source of truth for geometry
    dal_lake_boundary.geojson     real boundary (India-WRIS via india-geodata), input to generate_zones.py
    plasticnet.db                 SQLite file, git-ignored, ephemeral on Render's free tier
  weights/                      best_model_*.pth (all four) + best_model_fastscnn.onnx(.data)
                                 (the deployed default's ONNX export)
  outputs/                      generated mask/overlay PNGs, served at /outputs, auto-cleaned
  logs/                         backend.log
  requirements.txt
```
