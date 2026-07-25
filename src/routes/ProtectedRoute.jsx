import { Navigate, Outlet } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard.js'

export default function ProtectedRoute() {
  const { state } = useDashboard()

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
