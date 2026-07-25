import { Navigate, Route, Routes } from 'react-router-dom'
import { BadgeCheck, FileOutput, Film, Map, TrendingUp, Video } from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import Login from '../pages/Login.jsx'
import Overview from '../pages/Overview.jsx'
import Segmentation from '../pages/Segmentation.jsx'
import Detection from '../pages/Detection.jsx'
import Classification from '../pages/Classification.jsx'
import ComingSoon from '../pages/ComingSoon.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Overview />} />
          <Route path="/segmentation" element={<Segmentation />} />
          <Route path="/detection" element={<Detection />} />
          <Route path="/classification" element={<Classification />} />
          <Route
            path="/regression"
            element={
              <ComingSoon
                title="Regression Analysis"
                description="Forecasting pollution trends"
                icon={TrendingUp}
                points={[
                  'Predict coverage percentage two weeks ahead from scan history',
                  'Correlate rainfall and tourist footfall with detection volume',
                  'Flag zones likely to cross the high risk threshold'
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
                  'Watch footage from all shoreline cameras in real time',
                  'Trigger detection on demand from a live frame',
                  'Review camera uptime and connectivity history'
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
                  'Queue drone and handheld survey footage for batch analysis',
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
                description="A live map of every monitored zone"
                icon={Map}
                points={[
                  'Plot detections on an interactive map of the Kashmir waterways',
                  'Toggle a pollution density heatmap by zone',
                  'Filter markers by plastic type and survey date'
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
                  'Compare AI detections against field team ground truth',
                  'Track model accuracy by zone over time',
                  'Flag low confidence detections for manual review'
                ]}
              />
            }
          />
          <Route
            path="/reports"
            element={
              <ComingSoon
                title="Reports and Export"
                description="Generate reports for municipal review"
                icon={FileOutput}
                points={[
                  'Generate PDF summaries for the Pollution Control Board',
                  'Export raw detection data as CSV for further analysis',
                  'Bundle imagery and reports together as a ZIP archive'
                ]}
              />
            }
          />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
