import { createContext, useContext } from 'react'
import type { AuthUser } from '../services/auth'

export type AuthState = {
  user: AuthUser | null
  status: 'loading' | 'ready' | 'error'
  error: string
  retry: () => void
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is missing')
  return context
}
