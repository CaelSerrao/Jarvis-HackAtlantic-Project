import { apiFetch } from './api'

export type AuthUser = { id: number; username: string }

function readUser(value: unknown): AuthUser {
  if (typeof value !== 'object' || value === null || !('user' in value) ||
    typeof value.user !== 'object' || value.user === null ||
    !('id' in value.user) || typeof value.user.id !== 'number' ||
    !('username' in value.user) || typeof value.user.username !== 'string') {
    throw new Error('Unexpected authentication response. Please try signing in again.')
  }
  return { id: value.user.id, username: value.user.username }
}

async function authRequest(path: string, options: RequestInit = {}): Promise<Response> {
  try {
    return await apiFetch(`/auth/${path}`, { ...options, signal: options.signal ?? AbortSignal.timeout(15000) }, false)
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error('Could not reach the sign-in API. Check the server on port 8000 and try again.', { cause: error })
  }
}

async function requireSuccess(response: Response): Promise<void> {
  if (response.ok) return
  if (response.status === 404) throw new Error('Authentication endpoints are unavailable. Reload the API bridge with the updated code.')
  const body: unknown = await response.json().catch(() => null)
  const message = typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string'
    ? body.detail : `Authentication failed (${response.status}). Please try again.`
  throw new Error(message)
}

export async function getSession(signal?: AbortSignal): Promise<AuthUser | null> {
  const response = await authRequest('me', { signal })
  if (response.status === 401) return null
  await requireSuccess(response)
  return readUser(await response.json())
}

export async function submitCredentials(mode: 'login' | 'signup', username: string, password: string): Promise<AuthUser> {
  const response = await authRequest(mode, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
  })
  await requireSuccess(response)
  return readUser(await response.json())
}

export async function endSession(): Promise<void> {
  const response = await authRequest('logout', { method: 'POST' })
  await requireSuccess(response)
}

export function returnPath(value: unknown): string {
  return typeof value === 'string' && ['/chat', '/tools', '/automation', '/files', '/memory', '/settings'].includes(value) ? value : '/chat'
}
