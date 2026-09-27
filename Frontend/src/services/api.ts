// Match Vite's loopback hostname so HttpOnly cookies work with either local URL.
const host = window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'
export const API_BASE = `http://${host}:8000`
export const SESSION_EXPIRED_EVENT = 'jarvis:session-expired'

export async function apiFetch(path: string, options: RequestInit = {}, notifyUnauthorized = true): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include' })
  if (response.status === 401 && notifyUnauthorized) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  return response
}
