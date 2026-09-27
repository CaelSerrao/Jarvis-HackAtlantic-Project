import { apiFetch } from './api'

export const MEMORY_CATEGORIES = ['preference', 'project', 'person', 'device', 'work', 'general'] as const
export type MemoryCategory = typeof MEMORY_CATEGORIES[number]
export type MemoryEntry = {
  id: number
  content: string
  category: string
  importance: number
  created_at: string
  updated_at: string
}
export type NewMemory = { content: string; category: MemoryCategory; importance: number }

function isMemory(value: unknown): value is MemoryEntry {
  if (typeof value !== 'object' || value === null) return false
  return 'id' in value && typeof value.id === 'number' &&
    'content' in value && typeof value.content === 'string' &&
    'category' in value && typeof value.category === 'string' &&
    'importance' in value && typeof value.importance === 'number' &&
    'created_at' in value && typeof value.created_at === 'string' &&
    'updated_at' in value && typeof value.updated_at === 'string'
}

async function memoryRequest(options: RequestInit = {}): Promise<unknown> {
  let response: Response
  try {
    const timeout = AbortSignal.timeout(15000)
    response = await apiFetch('/memories', { ...options, signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error(options.method === 'POST'
      ? 'The save could not be confirmed. Check that the API is running, then refresh the list before retrying to avoid duplicates.'
      : 'Could not reach the memory API. Check that the Jarvis server is running on port 8000 and try Refresh.', { cause: error })
  }
  if (!response.ok) {
    if (response.status === 404 || response.status === 405) throw new Error('Memory endpoints are unavailable. Restart the API bridge with the updated api.py.')
    if (response.status === 422) throw new Error('Check the memory text (1–4000 characters), category, and importance (1–5).')
    throw new Error(`Memory API error (${response.status}). Refresh the list before retrying a save.`)
  }
  try {
    return await response.json()
  } catch (error) {
    throw new Error('The API returned invalid JSON. Refresh the list before retrying a save.', { cause: error })
  }
}

export async function fetchMemories(signal?: AbortSignal): Promise<MemoryEntry[]> {
  const result = await memoryRequest({ signal })
  if (typeof result !== 'object' || result === null || !('memories' in result) ||
    !Array.isArray(result.memories) || !result.memories.every(isMemory)) {
    throw new Error('The memory API returned an unexpected response. No sample data has been substituted.')
  }
  return result.memories
}

export async function createMemory(memory: NewMemory): Promise<number> {
  const result = await memoryRequest({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(memory) })
  if (typeof result !== 'object' || result === null || !('memory_id' in result) || typeof result.memory_id !== 'number') {
    throw new Error('The save response was unexpected. Refresh the list before retrying to avoid duplicates.')
  }
  return result.memory_id
}

export function filterMemories(memories: readonly MemoryEntry[], query: string, category: string): MemoryEntry[] {
  const term = query.trim().toLowerCase()
  return memories.filter(memory => (category === 'all' || memory.category === category) &&
    `${memory.content} ${memory.category}`.toLowerCase().includes(term))
}

export function memoryDate(value: string): string {
  // SQLite CURRENT_TIMESTAMP is UTC but has no timezone suffix.
  const date = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()
}
