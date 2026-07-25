# PlasticNet AI

Kashmir plastic waste monitoring dashboard, built for the Dal Lake research
project run jointly with NIT Srinagar and Municipal Corporation Srinagar.

This is the Month 1 build: officer login, dashboard overview, segmentation,
object detection and classification are fully wired to a mock data layer.
The remaining sidebar modules (regression analysis, live camera, image and
video processing, GIS mapping, validation, reports and export) are stubbed
out as Phase 2 pages so the navigation and routing structure is already in
place for the next milestone.

## Getting started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Log in with any email and password,
the auth layer is mocked and accepts anything.

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## Project structure

```
src/
  components/
    common/     StatCard, ChartCard, MetricCard, ZoneBadge, DataTable,
                UploadCard, PageHeader, Loader, WaterlinePattern
    layout/     Sidebar, Navbar
  context/      DashboardContext, a small useReducer store for auth,
                theme and sidebar state
  data/         mockData.js, the single source of truth for every number
                and label on screen
  hooks/        useDashboard
  layouts/      DashboardLayout, composes the sidebar, navbar and page outlet
  pages/        Login, Overview, Segmentation, Detection, Classification,
                ComingSoon
  routes/       AppRoutes, ProtectedRoute
  services/     api.js, wraps every data fetch behind a function so the
                mock layer can be swapped for the FastAPI backend later
  utils/        formatting helpers for relative time and dates
```

## Connecting the real backend

Every function in `src/services/api.js` currently reads from
`src/data/mockData.js`. Once the FastAPI inference service is deployed:

1. Set `USE_MOCK = false` in `api.js`
2. Point `VITE_API_BASE_URL` at the deployed API, either in a `.env` file
   or your hosting provider's environment settings
3. Each function already has the intended endpoint noted in a comment
   directly above its axios call

No page or component needs to change, they all read through the service
layer rather than importing mock data directly.

## Notes on the segmentation and detection previews

The mask, overlay and heatmap tabs on the segmentation page, and the
bounding boxes on the detection page, are placeholder renders built from
CSS filters and generated coordinates so the layout can be reviewed before
the computer vision pipeline is connected. Swap `runInference` in
`api.js` for the real endpoint and these will render actual model output
with no layout changes needed.
