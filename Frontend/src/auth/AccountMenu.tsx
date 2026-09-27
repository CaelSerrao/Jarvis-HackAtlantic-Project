import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from './AuthContext'

export default function AccountMenu() {
  const { user, signOut } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  async function logout() {
    setPending(true)
    setError('')
    try {
      await signOut()
      navigate('/sign-in', { replace: true, state: { signedOut: true } })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign out. Try again.')
    } finally { setPending(false) }
  }
  return <div className="profile auth-profile">
    <div className="auth-account-name"><div className="avatar">{user?.username[0]?.toUpperCase()}</div><span>{user?.username}</span></div>
    <button type="button" disabled={pending} onClick={() => void logout()}><LogOut size={15} aria-hidden="true" />{pending ? 'Signing out…' : 'Sign out'}</button>
    {error && <p role="alert">{error}</p>}
  </div>
}
