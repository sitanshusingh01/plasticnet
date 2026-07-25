import { useContext } from 'react'
import { DashboardContext } from '../context/DashboardContext.jsx'

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be called within a DashboardProvider')
  }
  return context
}
