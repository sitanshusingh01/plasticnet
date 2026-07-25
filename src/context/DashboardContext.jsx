import { createContext, useEffect, useReducer } from 'react'
import { currentUser } from '../data/mockData'

const initialState = {
  isAuthenticated: sessionStorage.getItem('plasticnet_session') === 'active',
  user: currentUser,
  theme: 'light',
  sidebarCollapsed: false
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isAuthenticated: true }
    case 'LOGOUT':
      return { ...state, isAuthenticated: false }
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }
    default:
      return state
  }
}

export const DashboardContext = createContext(null)

export function DashboardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark')
  }, [state.theme])

  useEffect(() => {
    if (state.isAuthenticated) {
      sessionStorage.setItem('plasticnet_session', 'active')
    } else {
      sessionStorage.removeItem('plasticnet_session')
    }
  }, [state.isAuthenticated])

  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  )
}
