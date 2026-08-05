# Changelog

All notable changes made while taking PlasticNet AI from a mock-driven UI to a
production application backed by the deployed inference service.

## Backend integration release — August 2026

### Files modified

- `src/services/api.js` — rewritten around the live backend (details below)
- `src/pages/Segmentation.jsx` — rewritten to render real model output
- `src/pages/CitizenReport.jsx` — real AI analysis on photo upload
- `src/data/mockData.js` — segmentation fixtures removed
- `backend/config.py` — dead `TEMP_DIR` configuration removed
- `.gitignore` — stale `backend/temp` entry removed
- `README.md` — full rewrite for the deployed, integrated system
- `backend/README.md` — full rewrite: deployed URLs, integration contract,
  Render deployment notes, complete error reference

### Files added

- `.env.example` — documents `VITE_API_BASE_URL` and its production default
- `CHANGELOG.md` — this file

### Files deleted

- None as whole files. Deleted within files: the `segmentationSamples`
  fixture (`mockData.js`), the `VIEW_FILTERS` CSS-filter fake previews
  (`Segmentation.jsx`), and four dead service functions in `api.js`
  (`uploadImage`, `getSegmentationSamples`, `getPollutionHeatmap`,
  `getAuthorityAnalytics`).

### Frontend integration changes

- `runSegmentation()` always POSTs the uploaded image as multipart form
  data to `{VITE_API_BASE_URL}/segmentation/run`; there is no mock branch
  anywhere in the segmentation path.
- API base URL comes from `VITE_API_BASE_URL` at build time and defaults
  to the deployed Render service, so a plain build targets production and
  no localhost reference exists in the compiled bundle.
- Request timeout raised to 120 seconds, with exactly one automatic retry
  when a failure matches a Render cold start (no response, timeout, or a
  502/503/504 gateway status). The UI tells the user the server is waking
  up while the retry runs.
- All backend failures are normalised into user-facing messages. FastAPI
  string `detail` bodies are shown verbatim; 422 validation arrays are
  flattened into readable text; 400, 404, 413, 422, 429, 500 and 503 each
  have a specific fallback message; network failures and timeouts have
  their own. Errors are displayed inline, never swallowed, and never fall
  back to fabricated values.
- Relative `maskUrl`/`overlayUrl` paths in responses are converted to
  absolute URLs against the API origin so the mask and overlay PNGs load
  from the GitHub Pages origin.
- Segmentation page: the Mask and Overlay tabs display the actual PNGs
  returned by the backend; a Heatmap tab appears only if the backend ever
  returns `heatmapUrl`. The Download Mask button downloads the real mask.
  A run-details panel shows jobId, status, model, filename, image
  dimensions, largest plastic region, the per-class pixel breakdown and
  the backend's explanatory note. "Recent Segmentation Runs" is now a log
  of real runs from the current session.
- Citizen report page: photo analysis calls the backend directly, and the
  coverage, object count and derived severity come only from the
  response. Real mask/overlay URLs are stored on the submitted report. If
  analysis fails, the error is shown and the report can still be
  submitted with the AI prediction marked unavailable.
- Dashboard analytics, alerts, the report store, authentication and the
  Detection demo have no backend endpoints yet; their sample-data
  behaviour is unchanged and is now gated by a clearly named
  `USE_MOCK_DASHBOARD` flag confined to `src/services/api.js`.

### Backend changes

- No functional changes to the inference service, models, weights or
  response schema. The unused `TEMP_DIR` definition was removed from
  `config.py`; behaviour is identical.

### Mock data removed

- Mock segmentation job stub (random job IDs, fabricated queue status)
- Random coverage percentage, object count and processing time generators
  in both the Segmentation and Citizen Report pages
- CSS-filter fake mask, overlay and heatmap previews
- Hardcoded "Recent Segmentation Runs" sample rows
- The fake image-upload step that returned generated `IMG-xxxx` IDs

### API endpoints integrated

- `POST /api/segmentation/run` — every segmentation prediction in the app
- `GET /outputs/{name}.png` — mask and overlay images
- `GET /api/health` and `GET /api/segmentation/models` — available and
  documented for operations use

### Deployment-related changes

- `.env.example` added; `VITE_API_BASE_URL` documented in both READMEs
  alongside the backend's `PLASTICNET_*` runtime variables
- README deployment sections rewritten for GitHub Pages (automatic build
  and publish on push to `main`) and Render (start command bound to
  `$PORT`, RAM guidance, cold-start behaviour, CORS configuration)
- No changes to `.github/workflows/deploy.yml` were required
