import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Brain, RefreshCw, Save } from 'lucide-react'
import { MEMORY_CATEGORIES, createMemory, fetchMemories, filterMemories, memoryDate } from '../services/memory'
import type { MemoryCategory, MemoryEntry } from '../services/memory'
import './Memory.css'

function Memory() {
  const [memories, setMemories] = useState<MemoryEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<MemoryCategory>('general')
  const [importance, setImportance] = useState(1)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  async function load(signal?: AbortSignal) {
    try {
      const result = await fetchMemories(signal)
      if (!signal?.aborted) {
        setMemories(result)
        setLoadError('')
      }
    } catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : 'Could not load memories.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchMemories(controller.signal).then(result => {
      if (!controller.signal.aborted) setMemories(result)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Could not load memories.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [])

  function refresh() {
    setLoading(true)
    setLoadError('')
    void load()
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || loading) return
    if (!content.trim()) {
      setSaveError('Enter a memory before saving.')
      return
    }
    setSaving(true)
    setSaveError('')
    setSuccess('')
    try {
      const id = await createMemory({ content: content.trim(), category, importance })
      setSuccess(`Memory #${id} saved to Jarvis’s database. Active filters may hide the new memory.`)
      setContent('')
      setLoading(true)
      await load()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The memory save could not be confirmed. Refresh before retrying.')
    } finally {
      setSaving(false)
    }
  }

  const visible = filterMemories(memories ?? [], query, filter)
  const categories = [...new Set([...MEMORY_CATEGORIES, ...(memories ?? []).map(memory => memory.category)])]
  return (
    <div className="page-content memory-page">
      <div className="page-heading">
        <span>JARVIS MEMORY</span>
        <h1>Memory</h1>
        <p>View and save the facts Jarvis uses to personalize your experience.</p>
      </div>
      <p className="memory-notice">Memories are stored in the backend database for the same local user as Chat.
        Saving here does not require the AI model. Editing and forgetting memories are not supported by the backend yet.</p>

      <form className="memory-editor" onSubmit={event => void save(event)} aria-labelledby="memory-editor-title">
        <h2 id="memory-editor-title">Add a memory</h2>
        <label htmlFor="memory-content">Fact or preference
          <textarea id="memory-content" rows={3} required maxLength={4000} value={content} disabled={saving} aria-describedby="memory-content-help"
            onChange={event => { setContent(event.target.value); setSaveError(''); setSuccess('') }} placeholder="e.g. I prefer concise responses." />
        </label>
        <p id="memory-content-help">Saved exactly as entered, with surrounding whitespace removed. {content.length}/4000 characters.</p>
        <div className="memory-form-options">
          <label>Category
            <select value={category} disabled={saving} onChange={event => {
              const value = MEMORY_CATEGORIES.find(item => item === event.target.value)
              if (value) setCategory(value)
            }}>
              {MEMORY_CATEGORIES.map(item => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Importance
            <select value={importance} disabled={saving} onChange={event => setImportance(Number(event.target.value))}>
              <option value={1}>1 — Minor</option><option value={2}>2 — Useful</option>
              <option value={3}>3 — Moderate</option><option value={4}>4 — Important</option><option value={5}>5 — Very important</option>
            </select>
          </label>
        </div>
        <button type="submit" className="memory-primary" disabled={saving || loading || !content.trim()}><Save size={16} aria-hidden="true" />{saving ? 'Saving…' : 'Save memory'}</button>
        {saveError && <p className="memory-error" role="alert">{saveError}</p>}
        <p className="memory-success" role="status" aria-live="polite">{success}</p>
      </form>

      <div className="memory-stats">
        <div><strong>{memories === null ? '—' : memories.length}</strong><span>Loaded memories</span></div>
        <div><strong>{memories === null ? '—' : new Set(memories.map(memory => memory.category)).size}</strong><span>Categories in use</span></div>
      </div>
      <div className="memory-filters" role="search" aria-label="Filter loaded memories">
        <label className="memory-search">Search memories
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search saved facts or categories" />
        </label>
        <label>Category
          <select value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button type="button" onClick={refresh} disabled={loading || saving}><RefreshCw size={16} aria-hidden="true" />{loading ? 'Loading…' : 'Refresh'}</button>
      </div>
      {loadError && <p className="memory-error" role="alert">{loadError}{memories !== null && ' Showing the last successfully loaded list.'}</p>}
      <p role="status" aria-live="polite">{loading ? 'Loading memories from Jarvis…' : memories !== null ? `${visible.length} of ${memories.length} memories shown. Ordered by importance, then last updated.` : 'No memory list has been loaded.'}</p>
      <div className="memory-list" aria-busy={loading}>
        {visible.map(memory => <article className="memory-card" key={memory.id}>
          <Brain size={21} aria-hidden="true" />
          <div>
            <span>{memory.category.toUpperCase()} · Importance {memory.importance}/5</span>
            <p className="memory-content">{memory.content}</p>
            <p>Saved {memoryDate(memory.created_at)} · Updated {memoryDate(memory.updated_at)}</p>
          </div>
        </article>)}
      </div>
      {!loading && !loadError && memories !== null && visible.length === 0 && <div className="memory-empty">
        <h2>{memories.length ? 'No matching memories' : 'No memories saved yet'}</h2>
        <p>{memories.length ? 'Try another search or show all categories.' : 'Add a fact or preference above. It will be saved to Jarvis’s database.'}</p>
        {(query || filter !== 'all') && <button type="button" onClick={() => { setQuery(''); setFilter('all') }}>Clear filters</button>}
      </div>}
    </div>
  )
}

export default Memory
