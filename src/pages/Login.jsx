import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Leaf, Lock, Mail } from 'lucide-react'
import WaterlinePattern from '../components/common/WaterlinePattern.jsx'
import { useDashboard } from '../hooks/useDashboard.js'
import { loginRequest } from '../services/api.js'

export default function Login() {
  const { dispatch } = useDashboard()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!email || !password) {
      setError('Enter both your email and password to continue')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await loginRequest(email, password)
      dispatch({ type: 'LOGIN' })
      navigate('/dashboard')
    } catch {
      setError('We could not verify those credentials. Try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10">
        <WaterlinePattern className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-white">
            <Leaf size={18} />
          </span>
          <span className="text-sm font-semibold text-white">PlasticNet AI</span>
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-medium uppercase tracking-widest text-primary-light/80">
            Municipal Corporation Srinagar &middot; NIT Srinagar
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white xl:text-4xl">
            Kashmir Plastic Waste Monitoring System
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Real time plastic detection, segmentation and environmental monitoring across Dal Lake,
            Nigeen Lake and the surrounding waterways.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          <div>
            <p className="num text-xl font-semibold text-white">18,742</p>
            <p className="mt-0.5 text-xs text-white/50">Objects logged</p>
          </div>
          <div>
            <p className="num text-xl font-semibold text-white">6</p>
            <p className="mt-0.5 text-xs text-white/50">Zones monitored</p>
          </div>
          <div>
            <p className="num text-xl font-semibold text-white">71/100</p>
            <p className="mt-0.5 text-xs text-white/50">Health index</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-white">
              <Leaf size={18} />
            </span>
            <span className="text-sm font-semibold text-ink">PlasticNet AI</span>
          </div>

          <h2 className="text-xl font-semibold text-ink">Officer sign in</h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            Enter your credentials to access the monitoring dashboard
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                Email address
              </label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@jknits.gov.in"
                  className="w-full rounded-sm border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-sm border border-border bg-surface py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-sm bg-danger-light px-3 py-2 text-xs font-medium text-danger">{error}</p>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-ink-muted">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                />
                Remember me
              </label>
              <button type="button" className="font-medium text-primary hover:underline">
                Forgot password
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-sm bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {submitting ? 'Signing in' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-xs leading-relaxed text-ink-faint">
            Access is restricted to authorized environmental officers, research scholars and field
            survey personnel. Contact the NIT Srinagar research cell for access requests.
          </p>
        </div>
      </div>
    </div>
  )
}
