import { Navigate, Route, Routes } from 'react-router-dom'
import { BadgeCheck, Film, Map, TrendingUp, Video } from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import Home from '../pages/Home.jsx'
import Login from '../pages/Login.jsx'
import CitizenReport from '../pages/CitizenReport.jsx'
import CommunityReports from '../pages/CommunityReports.jsx'
import Overview from '../pages/Overview.jsx'
import Segmentation from '../pages/Segmentation.jsx'
import Detection from '../pages/Detection.jsx'
import Classification from '../pages/Classification.jsx'
import Reports from '../pages/Reports.jsx'
import ComingSoon from '../pages/ComingSoon.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/report" element={<CitizenReport />} />
      <Route path="/community-reports" element={<CommunityReports />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Overview />} />
          <Route path="/segmentation" element={<Segmentation />} />
          <Route path="/detection" element={<Detection />} />
          <Route path="/classification" element={<Classification />} />
          <Route path="/reports" element={<Reports />} />
          <Route
            path="/regression"
            element={
              <ComingSoon
                title="Regression Analysis"
                description="Forecasting pollution trends"
                icon={TrendingUp}
                points={[
                  'Predict Dal Lake coverage percentage two weeks ahead from scan history',
                  'Correlate rainfall and tourist footfall with detection volume',
                  'Flag Dal Lake zones likely to cross the high risk threshold'
                ]}
              />
            }
          />
          <Route
            path="/live-camera"
            element={
              <ComingSoon
                title="Live Camera"
                description="Streaming feeds from shoreline cameras"
                icon={Video}
                points={[
                  'Watch footage from every Dal Lake shoreline camera in real time',
                  'Trigger detection on demand from a live frame',
                  'Review camera uptime across Northern Shore, Central Dal and the other zones'
                ]}
              />
            }
          />
          <Route
            path="/media-processing"
            element={
              <ComingSoon
                title="Image and Video Processing"
                description="Batch processing for field survey footage"
                icon={Film}
                points={[
                  'Queue drone and handheld Dal Lake survey footage for batch analysis',
                  'Automatically extract frames from video at a set interval',
                  'Track processing status across large uploads'
                ]}
              />
            }
          />
          <Route
            path="/gis-mapping"
            element={
              <ComingSoon
                title="GIS Mapping"
                description="Dal Lake GIS monitoring, zone by zone"
                icon={Map}
                points={[
                  'Plot detections on an interactive map of Dal Lake, from Northern Shore to Zero Bridge',
                  'Toggle a pollution density heatmap across sampling locations and cleanup zones',
                  'Filter markers by plastic type, survey date and the Floating Gardens sector'
                ]}
              />
            }
          />
          <Route
            path="/validation"
            element={
              <ComingSoon
                title="Validation"
                description="Field verification of AI detections"
                icon={BadgeCheck}
                points={[
                  'Compare AI detections against field team and citizen reported ground truth',
                  'Track model accuracy by Dal Lake zone over time',
                  'Flag low confidence detections for manual review'
                ]}
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
