# PlasticNet AI

AI powered plastic pollution monitoring, pairing a public reporting tool with an authority dashboard for reviewing and acting on what gets reported.

Live app: https://sitanshusingh01.github.io/plasticnet/

## Project Overview

Plastic pollution in urban water bodies is usually tracked by hand. A survey team walks a shoreline, photographs what it finds, and the results end up in a spreadsheet somewhere. That process is slow, it depends entirely on whoever happens to be doing the survey that week, and the data rarely reaches anyone outside the team that collected it.

PlasticNet AI is an attempt to shorten that loop. Anyone can photograph or film a polluted spot and submit it in a couple of minutes, with location attached automatically. On the other side, an authority team gets a single dashboard to review incoming reports, watch pollution trends over time, and act on them, backed by a computer vision model trained specifically to recognise plastic waste rather than a general purpose object detector.

Together that's three pieces working off the same data: image and video capture, a segmentation and detection model, and a GIS aware dashboard tying it all to a real location.

## Features

### Public Portal

- Upload a single image or a single video of a polluted spot
- Automatic GPS detection through the browser's location API
- Interactive map to confirm or manually adjust the reported location
- Instant AI analysis preview for photo uploads: coverage percentage, object count, severity
- Community reports feed, public and browsable by anyone
- Report status tracking, from submitted through to resolved
- CSV and JSON export of report data

### Authority Dashboard

- Report management: review, filter, and update the status of every citizen submission
- Zone level pollution analytics and risk scoring
- Waste category distribution and classification breakdown
- Segmentation and detection tooling for manually uploaded survey frames
- Cleanup status tracking, from submitted through to resolved
- Historical trend charts for detections, coverage and pollution index
- Dashboard KPIs and a live alerts feed

## System Workflow

```
User uploads a photo or video
        |
Location permission requested
        |
Map confirmation, pin adjustable by hand
        |
Frontend validation
        |
Backend API (Phase 2)
        |
AI model: segmentation and detection
        |
Coverage, severity and category statistics
        |
Database (Phase 2)
        |
Authority dashboard
        |
Community reports
```

## Technology Stack

- **React 18** — the interface itself, chosen for the component model and the size of its ecosystem
- **Vite** — build tool and dev server, changes show up almost instantly while working on it
- **Tailwind CSS** — utility first styling, keeps the design system consistent without a separate stylesheet per component
- **React Router** — client side routing between the public pages and the authenticated dashboard
- **Recharts** — every chart on the dashboard, trend lines, bar charts, and the category donut
- **Leaflet and OpenStreetMap** — the interactive map used to confirm and adjust a report's coordinates. This stands in for Google Maps, which needs a billing enabled API key that isn't set up yet. The map lives in one component, so switching providers later is a small, contained change
- **FastAPI** — the Python inference backend, built and tested locally (`backend/`), not yet deployed anywhere the live site can reach. See `backend/README.md`
- **FastSCNN, BiSeNetV2, ENet, MobileNetV2Seg** — four trained binary segmentation models (plastic vs. background), swappable via a one-line config change in the backend. FastSCNN is the current default
- **Roboflow** — used to annotate the training dataset
- **COCO format** — the annotation format the dataset is stored in
- **GitHub Pages** — hosting for the deployed frontend
- **GitHub Actions** — builds and deploys the app automatically on every push to `main`

## Folder Structure

```
src/
  components/   Reusable UI pieces: cards, tables, badges, the upload
                widget, the location map
  pages/        One file per route: home, login, citizen report,
                community reports, dashboard, segmentation, and so on
  layouts/      Wraps the authenticated pages with the sidebar and navbar
  services/     api.js, the only file that knows whether data is mocked
                or coming from a real backend
  hooks/        Small reusable hooks, currently just useDashboard
  utils/        Formatting helpers, the geolocation wrapper, filename
                generation
  data/         mockData.js, every number and label shown anywhere in
                the app lives here
  context/      Auth, theme and sidebar state
  routes/       Route definitions and the auth guard
public/         Static assets served as-is, favicon and similar
backend/        FastAPI inference service, see backend/README.md, not
                yet deployed anywhere the live frontend can reach
```

## Current Status

The frontend is complete. Every page, chart and table here is real, working UI, not a mockup.

The inference backend now exists too, in `backend/`. It loads one of four trained segmentation models (FastSCNN by default), runs real predictions, and was tested end to end: image in, mask and coverage percentage out, correct error handling for bad uploads. It is not deployed anywhere yet, and `src/services/api.js` still has `USE_MOCK = true`, so the live site continues to show mock data until the backend is hosted somewhere reachable and that flag is flipped. See `backend/README.md` for the exact steps.

One thing worth knowing: the trained models classify each pixel as plastic or background only. They don't distinguish bottle from wrapper from polythene. The per-category breakdown shown elsewhere in the dashboard is still illustrative sample data, that requires a multi-class model that doesn't exist yet.

`src/services/api.js` is deliberately the only frontend file that knows whether data is mocked or real. Every component asks it for data and renders whatever comes back.

## Future Roadmap

- Deploy the FastAPI backend somewhere it stays running (GitHub Pages can't host it, it's static only) and point the live site at it
- Train a multi-class model for real per-category breakdown (bottle, cap, wrapper, polythene, shoe, foam), the current models only do binary plastic/background
- A detection model, for individual object counting rather than connected-region counting
- Add a real database for reports, users and detection history
- Real time report updates instead of the current per session mock store
- Live analytics fed by actual detections rather than sample data
- A dedicated GIS monitoring view with a pollution heatmap
- A fuller complaint management workflow for the authority team, beyond the current status control
- Authority actions like assigning a report to a field team or attaching cleanup photos

## Dataset

The model is trained on a dataset built specifically for this project, not a general purpose plastic dataset pulled from somewhere else.

- 307 images
- 1,760 polygon annotations
- 6 plastic waste classes: bottle, cap, wrapper, polythene, shoe, foam
- Annotated in Roboflow
- Stored in COCO instance segmentation format

It was collected and annotated specifically for research and model training, with the pilot site currently centred on Dal Lake, Srinagar.

## Installation

```bash
git clone https://github.com/sitanshusingh01/plasticnet.git
cd plasticnet
npm install
npm run dev
```

Runs at `http://localhost:5173`. The authority login accepts any email and password, there's no real authentication behind it yet.

Production build:

```bash
npm run build
npm run preview
```

## Deployment

The project is deployed with GitHub Pages. Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the app and publishes it automatically. There's no manual deploy step.

## Contributing

This is currently a small research project maintained alongside separate model training work. If you'd like to contribute, open an issue describing the change first, particularly for anything touching the service layer or the mock data shape, since the backend integration plan depends on that structure staying consistent.

## License

Released under the MIT License, see [LICENSE](./LICENSE).

```
Copyright (c) 2026 Sitanshu Singh
```
