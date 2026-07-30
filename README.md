# PlasticNet AI

AI powered plastic pollution monitoring built specifically for Dal Lake, Srinagar. The project pairs a citizen reporting tool with an authority dashboard, and it's being developed alongside a computer vision research effort at NIT Srinagar.



The frontend below is fully built. The AI model and backend are not connected yet, every number on screen comes from a mock data layer described further down. That's intentional, not a placeholder we forgot to remove.

## Problem statement

Dal Lake's plastic pollution is well documented in survey reports and photographs, but that information rarely reaches the people who can act on it while it still matters. A shikara operator who notices a mass of polythene collecting near the ghat steps has no quick way to flag it. A municipal survey that finds a coverage spike in one zone usually ends up in a spreadsheet rather than somewhere the whole team can see it. PlasticNet AI tries to close that gap.

## Solution

Two things, working off the same data:

- A citizen can photograph a spot on the lake, get an instant read on plastic coverage and severity, and send that as a report.
- The authority team sees every report in one queue, alongside zone level analytics, detection history and category breakdowns, and can generate summaries for the Pollution Control Board and Municipal Corporation.

## How PlasticNet AI works

1. A photo is taken at Dal Lake, either by a citizen through the public reporting page or by a field survey team.
2. The image is analysed by our segmentation model, trained only on Dal Lake imagery, which returns plastic coverage percentage, object count and category breakdown.
3. Citizen submissions become a report in the authority queue, tagged with zone, severity and a status the team can update as it's reviewed.
4. Field survey uploads feed the segmentation and detection pages directly, useful for spot checks that don't need to go through the citizen flow.
5. Everything rolls up into the dashboard: daily detection trends, coverage over time, category distribution, and zone by zone risk.

## System architecture

The frontend never touches mock data or a model directly. Every page reads through one service layer:

```
React Components  ->  src/services/api.js  ->  Mock Data (today)
React Components  ->  src/services/api.js  ->  FastAPI Backend  ->  YOLOv8 Segmentation Model  ->  Database (once Phase 2 lands)
```

`USE_MOCK` in `api.js` is the single switch. Every exported function already has its intended REST endpoint noted in a comment directly above the mock branch, so turning on the real backend means changing implementations inside that one file. No page, chart, or component should need to change.

## Current progress

What's built and working right now:

- Public homepage, with separate entry points for citizens and the authority team
- Citizen reporting flow: upload a photo, get a mock analysis, submit a report
- Community reports feed, a public log of everything citizens have submitted
- Authority sign in (mocked, accepts any email and password)
- Dashboard overview with eight KPI cards, five charts, a six zone monitoring panel and a live alerts feed
- Segmentation page with tabbed mask, overlay and heatmap previews
- Object detection page with a bounding box preview and a working CSV export
- Classification page with an animated category breakdown
- Reports and export page, showing generated report history and the full citizen report queue with CSV export
- Dark mode across the entire app
- Responsive layout down to mobile, including a slide out sidebar

What's stubbed out as Phase 2, visible in the sidebar with a small tag so it's clear what's not real yet:

- Regression analysis
- Live camera feeds
- Batch image and video processing
- GIS mapping with an interactive Dal Lake map
- Field validation of AI detections against ground truth

## Future roadmap

The next milestone is connecting the trained model. In order, that means:

1. Standing up the FastAPI service and wiring `USE_MOCK = false`
2. Replacing the mock responses in `api.js` with real HTTP calls, one function at a time
3. Storing citizen reports and survey uploads in an actual database instead of the browser session
4. Building the GIS map and pollution heatmap once real coordinates and coverage data exist
5. Adding authentication that distinguishes authority roles, rather than the single mocked account used today

## Technology stack

- React 18 with Vite
- React Router for client side routing
- Tailwind CSS for styling
- Recharts for charts
- Axios, wired up and ready for the FastAPI backend
- Lucide React for icons
- Context API with `useReducer` for auth, theme and sidebar state
- GitHub Actions for build and deploy, GitHub Pages for hosting

## Folder structure

```
src/
  components/
    common/     StatCard, ChartCard, MetricCard, ZoneBadge, DataTable,
                UploadCard, PageHeader, Loader, WaterlinePattern
    layout/     Sidebar, Navbar, PublicHeader
  context/      DashboardContext, auth and UI state
  data/         mockData.js, the single source of truth for every number
                and label shown anywhere in the app
  hooks/        useDashboard
  layouts/      DashboardLayout, wraps the authenticated sidebar and navbar
  pages/        Home, Login, CitizenReport, CommunityReports, Overview,
                Segmentation, Detection, Classification, Reports, ComingSoon
  routes/       AppRoutes, ProtectedRoute
  services/     api.js, the only file allowed to know whether data is
                mocked or real
  utils/        formatting helpers for relative time and dates
```

## Installation

```bash
git clone https://github.com/sitanshusingh01/plasticnet.git
cd plasticnet
npm install
```

## Development

```bash
npm run dev
```

Runs at `http://localhost:5173`. The authority login accepts any email and password, there's no real auth yet.

```bash
npm run build     # production build to dist/
npm run preview   # preview that build locally
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app and publishes it to GitHub Pages automatically. No manual deploy step. The app uses `HashRouter` rather than `BrowserRouter` specifically so that refreshing a route like `/dashboard` doesn't 404 on Pages, which only serves the single `index.html` it's given.

## Backend integration

When the FastAPI service is ready:

1. Set `USE_MOCK = false` in `src/services/api.js`
2. Point `VITE_API_BASE_URL` at the deployed API, through an `.env` file or your hosting provider's environment settings
3. Replace each function's mock branch with its real call, the endpoint is already commented above every one

The expected request path once that's done:

```
Citizen uploads photo
  -> React sends the image to FastAPI
  -> FastAPI preprocesses and runs the YOLOv8 instance segmentation model
  -> Model returns waste categories, object count, coverage percentage,
     confidence scores and severity
  -> Backend stores the result
  -> JSON response comes back through the service layer
  -> Dashboard, charts, segmentation view and citizen report queue
     update on their own, no UI changes required
```

## Dataset

The segmentation and detection model is trained on a dataset built specifically for this project, not a general purpose plastic dataset.

- 307 images, all captured at Dal Lake, Srinagar
- 1,760 polygon annotations
- 6 waste categories: bottle, cap, wrapper, polythene, shoe, foam
- COCO instance segmentation format
- Annotated in Roboflow
- Built as part of a research project at NIT Srinagar

## Project workflow

```
Image capture (citizen or field survey)
        |
Segmentation and detection model
        |
Coverage, object count, category and severity
        |
Dashboard, charts, and citizen report queue
        |
Authority review, prioritisation and reporting
```

## Dashboard modules

- **Overview** — KPI cards, detection and coverage trends, category distribution, zone by zone risk, live alerts and the recent citizen report feed
- **Segmentation** — upload a frame, preview the mask, overlay and heatmap outputs, and browse recent segmentation runs
- **Detection** — bounding box preview over an uploaded frame, a detection table, and CSV export
- **Classification** — category breakdown with a donut chart and per category confidence
- **Reports and export** — generated report history, the citizen report queue, and CSV export of citizen submissions

## Citizen workflow

1. Open the homepage and choose "Report Pollution"
2. Upload a photo taken at the lake
3. Get a quick read on coverage percentage, object count and severity
4. Pick the zone, add a short note, and submit
5. The report appears in the community feed and the authority queue, marked as under review

## Authority workflow

1. Sign in from the homepage or the dashboard login
2. Review the day's KPIs, alerts and zone status on the overview page
3. Check the citizen report queue on the reports page, alongside generated PDF summaries
4. Run segmentation or detection manually on a specific survey frame if needed
5. Export data as CSV for further analysis or reporting

## AI pipeline

The trained model is a YOLOv8 instance segmentation network, built on the Dal Lake dataset described above. It isn't connected to this frontend yet. Once the FastAPI service is deployed, the pipeline is: image in, preprocessing, segmentation and detection, coverage and category statistics out, all behind the same `runSegmentation` and `runDetection` calls the UI already makes in mock mode.

## Future improvements

- Real authentication with distinct citizen and authority roles
- An actual GIS map instead of the current placeholder, using the zone coordinates already present in the data layer
- Photo storage, so uploaded images persist beyond the browser session
- A moderation step for citizen reports before they appear in the public feed
- Push or email notification when a report is marked resolved

## Contribution

This is currently a small team project (NIT Srinagar research group). If you'd like to contribute, open an issue describing the change before sending a pull request, since the mock data layer and service architecture are deliberately structured a certain way and any change should keep that separation intact.

## License

Not yet decided. Treat this repository as source available for now, reach out before reusing it elsewhere.
