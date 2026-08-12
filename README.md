# PlasticNet AI

AI powered plastic pollution monitoring for Dal Lake, pairing a public reporting tool with an authority dashboard, backed by a deployed deep learning segmentation service that analyses every uploaded photo in real time.

**Live application:** https://sitanshusingh01.github.io/plasticnet/
**Inference API:** https://plasticnet-backend.onrender.com/api
**Interactive API docs (Swagger):** https://plasticnet-backend.onrender.com/docs

Author: **Sitanshu Singh**

---

## Project Overview

PlasticNet AI is a full-stack environmental monitoring platform. Members of the public photograph plastic pollution, attach a location, and submit a report in a couple of minutes. Every photo is analysed on upload by a trained semantic segmentation model that returns a pixel-level plastic mask, a visual overlay, the plastic coverage percentage, and a count of distinct plastic regions. An authority team reviews incoming reports on a dashboard, tracks their status from submitted through to resolved, and runs the same segmentation tooling on manually uploaded survey frames.

The system has three cooperating parts: a React single-page application, a FastAPI inference service running the trained models, and the pipeline of trained segmentation networks themselves.

## Problem Statement

Plastic pollution in urban water bodies is usually tracked by hand. A survey team walks a shoreline, photographs what it finds, and the results end up in a spreadsheet. The process is slow, depends entirely on whoever happens to be surveying that week, and the data rarely reaches anyone outside the team that collected it. There is no fast path from "a resident notices plastic collecting at the water's edge" to "the responsible team knows about it, with a location and a quantified severity estimate."

PlasticNet AI shortens that loop. Reporting takes minutes and requires no training. Quantification is automatic and consistent, because the same model measures every image the same way. And the results land in one shared dashboard instead of scattered spreadsheets.

## System Architecture

```
                       Browser (React SPA on GitHub Pages)
                                      |
              multipart POST /api/segmentation/run  (axios)
                                      |
                    FastAPI inference service (Render)
                                      |
        preprocess -> Fast-SCNN forward pass -> postprocess
                                      |
       JSON response: coverage, object count, statistics,
            mask PNG URL, overlay PNG URL (/outputs/...)
                                      |
              Browser renders real mask and overlay images
```

The frontend is fully static and deployed to GitHub Pages by GitHub Actions on every push to `main`. The backend is a persistent Python process on Render that loads the active model once at startup, runs a warmup pass, and then serves predictions. Cross-origin requests from the Pages origin are explicitly allowed by the backend's CORS configuration.

Segmentation predictions are always real: the frontend displays only values returned by the backend and never fabricates coverage numbers, object counts, masks, or overlays. Zone Mapping is real too: monitoring zone boundaries, point-in-polygon report assignment, and risk colouring all come from the backend's own database, not from anything computed in the browser. Other dashboard analytics (trend charts, alerts) are illustrative sample data until their backend endpoints exist; that boundary lives in exactly one file, `src/services/api.js`, and is clearly marked there.

## Folder Structure

```
src/
  components/   Reusable UI pieces: cards, tables, badges, upload widgets,
                the Leaflet location map
  pages/        One file per route: home, login, citizen report, community
                reports, dashboard overview, segmentation, detection,
                classification, reports queue, zone mapping
  layouts/      Wraps authenticated pages with the sidebar and navbar
  services/     api.js — the single file that talks to the backend and the
                only file allowed to import sample data
  hooks/        Small reusable hooks (useDashboard)
  utils/        Formatting helpers, the geolocation wrapper, filename
                generation
  data/         mockData.js — sample data for dashboard modules whose
                backend endpoints don't exist yet
  context/      Auth, theme and sidebar state
  routes/       Route definitions and the auth guard
public/         Static assets served as-is
backend/
  app.py        FastAPI app: CORS, /outputs static mount, startup warmup,
                zone database init and GeoJSON load
  config.py     Model registry, ACTIVE_MODEL switch, class names/colours
  settings.py   Upload limits, CORS origins, output retention
  schemas.py    Pydantic response contracts
  database.py   SQLAlchemy engine/session (SQLite by default)
  db_models.py  Zone / ZoneReportLog / RiskOverride ORM models
  routes/       POST /segmentation/run, GET /segmentation/models,
                the six Zone Mapping endpoints
  services/     Model loading/caching, preprocess, inference orchestration,
                postprocess, mask/overlay rendering, output cleanup,
                zone_service.py (point-in-polygon, risk scoring, stats)
  models/       The four segmentation architectures
  scripts/      generate_zones.py (boundary -> zone polygons), export_onnx.py
  data/         dal_lake_zones.geojson (zone geometry, single source of
                truth), dal_lake_boundary.geojson (real, India-WRIS sourced)
  weights/      Trained checkpoints (tracked in git, ~77 MB total)
```

## Frontend

React 18 with Vite. Routing uses `HashRouter`, which works on GitHub Pages without any server-side rewrite rules. The public portal (report form, community feed) needs no login; the authority dashboard sits behind a session guard.

When a user selects a photo on the report page, or clicks **Run AI** on the Segmentation page, the app builds a `FormData` body, POSTs it to the backend, shows a loading state, and renders the returned mask and overlay images along with the coverage percentage, object count, largest region size, processing time, model name, and per-class pixel breakdown. The mask can be downloaded as a PNG.

Because the backend runs on a Render instance that sleeps when idle, the first request after a quiet period can take up to a minute. The frontend handles this: the request timeout is 120 seconds, a failure consistent with a cold start (no response, timeout, or a 502/503/504 from Render's proxy) triggers exactly one automatic retry, and the loading message tells the user the server is waking up. Permanent errors (unsupported file, oversized image, server error) surface the backend's own human-readable message directly in the UI.

## Backend

A FastAPI service (see `backend/README.md` for full detail). At startup it loads the model selected by `PLASTICNET_ACTIVE_MODEL` (default `fastscnn`), moves it to GPU if available, and runs one dummy forward pass so the first real upload isn't the slow one. Uploads are validated (type, size, decodability), resized to the training resolution of 720×1280, normalised, and passed through the network. Logits are upsampled back to the original image resolution before the argmax, the binary mask is analysed with connected-component labelling for region statistics, and colour mask and transparent overlay PNGs are written to `/outputs`, which is served statically and cleaned hourly.

Four trained binary segmentation checkpoints ship in the repository and are swappable with a single config value: Fast-SCNN (default, 4.7 MB), ENet (1.65 MB), BiSeNetV2 (20 MB), and MobileNetV2Seg (53.7 MB). All four classify each pixel as plastic or background.

## Technology Stack

**Frontend:** React 18, Vite, Tailwind CSS, React Router, Recharts, Leaflet + OpenStreetMap, axios, lucide-react.
**Backend:** Python 3, FastAPI, Uvicorn, PyTorch, torchvision, Pillow, NumPy, SciPy, Shapely, SQLAlchemy.
**Models:** Fast-SCNN, BiSeNetV2, ENet, MobileNetV2Seg — binary plastic/background semantic segmentation.
**Zone Mapping:** Shapely (point-in-polygon, geometry), SQLAlchemy + SQLite (zone stats and report history).
**Annotation:** Roboflow, COCO instance segmentation format.
**Hosting:** GitHub Pages (frontend), Render (backend), GitHub Actions (CI/CD).

## Dataset

The models are trained on a dataset built specifically for this project: 307 UAV and shoreline survey images of Dal Lake, Srinagar, carrying 1,760 polygon annotations across six plastic waste classes (bottle, cap, wrapper, polythene, shoe, foam), annotated in Roboflow and stored in COCO instance segmentation format. The deployed checkpoint generation is trained for the binary plastic-vs-background task; the six-class annotations support future multi-class training.

## Segmentation Pipeline

1. **Upload validation** — content type and extension checked against JPG/PNG/WEBP; empty and oversized (>15 MB) files rejected before decoding; the image is fully decoded to catch truncated files, converted to RGB, and rejected if smaller than 32×32.
2. **Preprocessing** — bilinear resize to 720×1280, scale to [0,1], ImageNet mean/std normalisation, converted to a (1, 3, H, W) float32 tensor.
3. **Inference** — a single forward pass through the cached model under `torch.no_grad()`.
4. **Postprocessing** — logits are bilinearly upsampled to the original resolution *before* the argmax so interpolation stays meaningful; pixel counts, coverage percentage, and per-class breakdown are computed; connected-component labelling of the plastic mask yields the region count and largest region size.
5. **Rendering** — a colour mask PNG and a transparent overlay PNG (plastic regions blended at 45% over the original) are written to `/outputs` and their URLs returned.

`objectsFound` counts distinct contiguous plastic regions, not individually classified objects — these are semantic segmentation models, not instance detectors.

## Zone Mapping

Dal Lake is divided into monitoring zones (a GeoJSON boundary partitioned into ~28 polygons, see `backend/README.md` for how). Every citizen report is assigned to a zone automatically by its coordinates — a real point-in-polygon lookup, not a dropdown — and each zone tracks its own report count, average coverage, and a risk colour computed from that history. The frontend never calculates a colour or a coordinate; it renders exactly what `GET /api/zones` returns.

**Current status**: the zone boundary is real, sourced from India-WRIS (Ministry of Jal Shakti) via the [india-geodata](https://github.com/yashveeeeeeer/india-geodata) open catalog, not hand-approximated. The rest of the pipeline (database, point-in-polygon assignment, risk scoring, the map UI, authority overrides) is real and tested. See `backend/README.md`'s "Zone Mapping" section for the full detail, including the boundary's exact provenance and why SQLite here doesn't survive a Render redeploy yet.

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/segmentation/run` | Multipart upload (field `file`), returns the full prediction JSON |
| GET | `/api/segmentation/models` | Lists registered models and which is active |
| GET | `/api/health` | `{"status": "ok", "activeModel": "...", "modelLoaded": true}` |
| GET | `/outputs/{name}.png` | Generated mask and overlay images (retained ~1 hour) |
| GET | `/api/zones` | GeoJSON of every monitoring zone with live stats |
| GET | `/api/zones/{zoneId}` | One zone's detail, including trend and latest report |
| GET | `/api/zones/{zoneId}/reports` | Every report logged against that zone |
| POST | `/api/zones/assign` | Point-in-polygon zone assignment for a new report |
| PATCH | `/api/zones/{zoneId}/risk` | Authority manual risk override |
| PATCH | `/api/zones/reports/{reportRef}/status` | Syncs a zone's pending/resolved counts |

A successful prediction returns `jobId`, `status`, `filename`, `model`, `coveragePercent`, `plasticPixels`, `backgroundPixels`, `totalPixels`, `objectsFound`, `largestRegionPixels`, `processingTime`, `imageWidth`, `imageHeight`, `maskUrl`, `overlayUrl`, a per-class `classes` array, and an explanatory `note`. Errors use FastAPI's native shape, `{"detail": "human readable message"}`, with status 400 (bad upload), 413 (too large), 422 (malformed request), 503 (model unavailable), or 500. Zone Mapping endpoints follow the same error shape; see `backend/README.md` for their specific status codes.

## Environment Variables

**Frontend (build time, see `.env.example`):**

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | `https://plasticnet-backend.onrender.com/api` | Backend API base URL, must end in `/api` |

**Backend (runtime):**

| Variable | Default | Meaning |
|---|---|---|
| `PLASTICNET_ACTIVE_MODEL` | `fastscnn` | Which registered model to serve (`fastscnn`, `mobilenet`, `bisenet`, `enet`) |
| `PLASTICNET_CORS_ORIGINS` | localhost + GitHub Pages origin | Comma-separated list of allowed origins |
| `PLASTICNET_MAX_UPLOAD_MB` | `15` | Upload size limit |
| `PLASTICNET_OUTPUT_RETENTION_SECONDS` | `3600` | How long generated PNGs are kept |
| `PLASTICNET_DATABASE_URL` | `sqlite:///data/plasticnet.db` | Zone Mapping's database. Point this at a managed Postgres instance to survive Render redeploys |

## Local Development

Frontend:

```bash
git clone https://github.com/sitanshusingh01/plasticnet.git
cd plasticnet
npm install
npm run dev
```

Runs at `http://localhost:5173` and talks to the deployed Render backend by default. To point it at a local backend instead, create a `.env` file with `VITE_API_BASE_URL=http://localhost:8000/api`.

Backend:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

Health check at `http://localhost:8000/api/health`, interactive docs at `http://localhost:8000/docs`. The authority login accepts any email and password; there is no real authentication yet.

Production build:

```bash
npm run build
npm run preview
```

## Production Deployment

### GitHub Pages

Every push to `main` triggers `.github/workflows/deploy.yml`, which installs dependencies with `npm ci`, builds the app, and publishes `dist/` to GitHub Pages. `vite.config.js` sets `base: '/plasticnet/'` to match the repository path, and `HashRouter` keeps deep links working on static hosting. No manual step is involved.

### Render

The backend runs as a Render web service from the `backend/` directory of this repository. The service installs `requirements.txt`, then starts Uvicorn bound to Render's assigned port:

```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

The trained weights are tracked in git, so a fresh deploy has everything it needs. Give the service at least 1–2 GB of RAM; PyTorch's base footprint plus a loaded model is significant. On plans that sleep when idle, the first request after a quiet period pays the cold-start cost (container boot, model load, warmup) — the frontend is built to absorb this with a long timeout and one automatic retry.

If the frontend is ever served from a new origin, add it to `PLASTICNET_CORS_ORIGINS` on the Render service.

## Troubleshooting

**The first analysis takes a long time or seems stuck.** The Render instance was asleep. The frontend waits up to two minutes and retries once automatically; the run completes as soon as the server is warm. Subsequent runs take around a second.

**"Could not reach the AI backend."** Check `https://plasticnet-backend.onrender.com/api/health` in a browser. If it returns `{"status": "ok", ...}` the backend is fine and the problem is local connectivity; if it doesn't load, check the Render dashboard for the service state.

**Mask or overlay image fails to load a while after a run.** Generated PNGs are retained for about an hour and then cleaned up. Run the analysis again.

**Browser console shows a CORS error.** The frontend origin isn't in the backend's allowed list. Add it via `PLASTICNET_CORS_ORIGINS` on Render and redeploy.

**"Unsupported file type" on upload.** Only JPG, PNG and WEBP images are accepted, up to 15 MB.

**Local `npm run dev` can't reach a local backend.** Confirm the backend is running on port 8000 and your `.env` contains `VITE_API_BASE_URL=http://localhost:8000/api`, then restart the dev server — Vite reads env files at startup.

## Future Scope

- Multi-class model training for a real per-category breakdown (bottle, cap, wrapper, polythene, shoe, foam); the current checkpoints are binary
- A detection model for individual object counting; the Detection page currently shows illustrative output until one exists
- A managed Postgres database on Render, replacing SQLite for Zone Mapping (currently wiped on redeploy, see `backend/README.md`) and eventually the report store too
- Live dashboard analytics fed by stored detections rather than sample data
- Real authentication for the authority dashboard
- A pollution density heatmap layer on top of Zone Mapping's now-real boundary data
- Authority workflow actions: assigning reports to field teams, attaching cleanup photos

## Contribution

Open an issue describing the change before sending a pull request, particularly for anything touching `src/services/api.js` or the backend response schema — the frontend renders whatever the API returns, so the contract between them is the one thing that must stay consistent.

## License

Released under the MIT License, see [LICENSE](./LICENSE).

```
Copyright (c) 2026 Sitanshu Singh
```
