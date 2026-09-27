import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthContext, useAuth } from './AuthContext'
import type { AuthState } from './AuthContext'
import { endSession, getSession, submitCredentials } from '../services/auth'
import type { AuthUser } from '../services/auth'
import { SESSION_EXPIRED_EVENT } from '../services/api'
import './Auth.css'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthState['status']>('loading')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = AbortSignal.timeout(15000)
    getSession(AbortSignal.any([controller.signal, timeout])).then(account => {
      if (!controller.signal.aborted) { setUser(account); setStatus('ready'); setError('') }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setUser(null)
        setStatus('error')
        setError(cause instanceof Error ? cause.message : 'Could not check your session.')
      }
    })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    const expire = () => { setUser(null); setStatus('ready') }
    window.addEventListener(SESSION_EXPIRED_EVENT, expire)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire)
  }, [])

  function retry() { setStatus('loading'); setAttempt(current => current + 1) }
  async function signIn(username: string, password: string) {
    const account = await submitCredentials('login', username, password)
    const confirmed = await getSession()
    if (!confirmed || confirmed.id !== account.id) throw new Error('The session cookie was not accepted. Use the same localhost or 127.0.0.1 hostname for frontend and API.')
    setUser(confirmed)
    setStatus('ready')
    setError('')
  }
  async function signOut() {
    await endSession()
    setUser(null)
    setStatus('ready')
  }

  return <AuthContext.Provider value={{ user, status, error, retry, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function AuthStatus() {
  const { status, error, retry } = useAuth()
  return <main className="auth-screen"><section className="auth-card">
    <h1>{status === 'loading' ? 'Checking your session…' : 'Cannot connect to Jarvis'}</h1>
    {status === 'loading' ? <p role="status">Please wait.</p> : <>
      <p role="alert">{error}</p><button type="button" onClick={retry}>Try again</button>
    </>}
  </section></main>
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()
  const location = useLocation()
  if (status !== 'ready') return <AuthStatus />
  if (!user) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  return <div key={user.id}>{children}</div>
}
