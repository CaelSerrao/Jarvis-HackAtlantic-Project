import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'
import { useAuth } from './AuthContext'
import { AuthStatus } from './AuthProvider'
import { returnPath, submitCredentials } from '../services/auth'

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { user, status, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: unknown; signedUp?: boolean; signedOut?: boolean } | null
  const destination = returnPath(state?.from)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const signup = mode === 'signup'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (signup && password !== confirmation) { setError('Passwords do not match.'); return }
    setPending(true)
    setError('')
    try {
      if (signup) {
        await submitCredentials('signup', username, password)
        setPassword('')
        setConfirmation('')
        navigate('/sign-in', { replace: true, state: { signedUp: true, from: destination } })
      } else {
        await signIn(username, password)
        setPassword('')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in could not be completed.')
    } finally {
      setPending(false)
    }
  }

  if (status !== 'ready') return <AuthStatus />
  if (user) return <Navigate to={destination} replace />
  return <main className="auth-screen"><section className="auth-card" aria-labelledby="auth-title">
    <div className="auth-brand"><div className="jarvis-orb" aria-hidden="true" /><span>JARVIS</span></div>
    <h1 id="auth-title">{signup ? 'Create your account' : 'Welcome back'}</h1>
    <p>{signup ? 'Save your account on this Jarvis server.' : 'Sign in to your Jarvis workspace.'}</p>
    {state?.signedUp && !signup && <p className="auth-success" role="status">Account created. Sign in with your new credentials.</p>}
    {state?.signedOut && !signup && <p className="auth-success" role="status">You have signed out.</p>}
    <form onSubmit={event => void submit(event)}>
      <label htmlFor="auth-username">Username</label>
      <input id="auth-username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} pattern="[A-Za-z0-9_]{3,32}" value={username} disabled={pending} onChange={event => setUsername(event.target.value)} aria-describedby="auth-username-help" />
      <small id="auth-username-help">3–32 letters, digits, or underscores. Not case-sensitive.</small>
      <label htmlFor="auth-password">Password</label>
      <input id="auth-password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={12} maxLength={128} value={password} disabled={pending} onChange={event => setPassword(event.target.value)} aria-describedby="auth-password-help" />
      <small id="auth-password-help">12–128 characters. Use a unique password or passphrase.</small>
      {signup && <><label htmlFor="auth-confirm">Confirm password</label>
        <input id="auth-confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} disabled={pending} onChange={event => setConfirmation(event.target.value)} /></>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" disabled={pending}>{signup ? <UserPlus size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}{pending ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
      <span className="auth-pending" role="status">{pending ? (signup ? 'Creating account…' : 'Signing in…') : ''}</span>
    </form>
    <p>{signup ? 'Already have an account? ' : 'New to Jarvis? '}
      <Link to={signup ? '/sign-in' : '/sign-up'} state={{ from: destination }}>{signup ? 'Sign in' : 'Create an account'}</Link>
    </p>
  </section></main>
}
