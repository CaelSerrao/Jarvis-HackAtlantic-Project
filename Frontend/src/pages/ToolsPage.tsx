import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Copy, Folder, Monitor, Search, Sparkles, Star } from 'lucide-react'
import { filterTools, TOOL_CATALOG, TOOL_CATEGORIES, toolFavoritesStore } from '../services/toolCatalog'
import type { ToolCategory } from '../services/toolCatalog'
import './ToolsPage.css'

const icons = { System: Monitor, Memory: Brain, Capabilities: Sparkles, Files: Folder } satisfies Record<ToolCategory, typeof Monitor>

function ToolsPage() {
  const [initial] = useState(() => toolFavoritesStore.load())
  const [favorites, setFavorites] = useState(initial.favorites)
  const [feedback, setFeedback] = useState(initial.warning)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [source, setSource] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const tools = filterTools(query, category, source, favoritesOnly, favorites)
  const hasFilters = query !== '' || category !== 'all' || source !== 'all' || favoritesOnly

  function toggleFavorite(id: string, title: string) {
    const removing = favorites.includes(id)
    const next = removing ? favorites.filter(favorite => favorite !== id) : [...favorites, id]
    setFavorites(next)
    setFeedback(toolFavoritesStore.save(next)
      ? `${title} ${removing ? 'removed from' : 'added to'} favorites. Saved in this browser.`
      : 'Favorites changed for this visit, but browser storage is unavailable. They may be lost when you leave or reload.')
  }

  function clearFilters() {
    setQuery('')
    setCategory('all')
    setSource('all')
    setFavoritesOnly(false)
  }

  async function copyPrompt(prompt: string) {
    try {
      await navigator.clipboard.writeText(prompt)
      setFeedback('Prompt copied. Paste it into Chat to request the action; no tool has been run.')
    } catch {
      setFeedback('Clipboard access is unavailable. Select and copy the example prompt below the tool details manually.')
    }
  }

  return (
    <div className="page-content tools-page">
      <div className="page-heading">
        <span>JARVIS CAPABILITIES</span>
        <h1>Tools</h1>
        <p>Explore Jarvis tools and keep your favorites close.</p>
      </div>

      <div className="tools-notice">
        <p>Repository catalog, not live status. Direct execution is unavailable on this page.
          Built-in tools can be requested through Chat when the API and local model are running.
          Generated tools below are not loaded by the current API bridge.</p>
        <Link to="/chat">Open Chat</Link>
      </div>

      <div className="tools-filters" role="search" aria-label="Filter tools">
        <label className="tools-search">
          <span>Search tools</span>
          <div><Search size={17} aria-hidden="true" />
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, action, or parameter" />
          </div>
        </label>
        <label><span>Category</span>
          <select value={category} onChange={event => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {TOOL_CATEGORIES.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label><span>Source</span>
          <select value={source} onChange={event => setSource(event.target.value)}>
            <option value="all">All sources</option>
            <option value="builtin">Built-in</option>
            <option value="generated">Generated</option>
          </select>
        </label>
        <label className="tools-favorites-filter">
          <input type="checkbox" checked={favoritesOnly} onChange={event => setFavoritesOnly(event.target.checked)} />
          Favorites only
        </label>
        <button type="button" onClick={clearFilters} disabled={!hasFilters}>Clear filters</button>
      </div>

      <p className="tools-result-count" role="status">{tools.length} of {TOOL_CATALOG.length} tools</p>
      <p className="tools-feedback" role="status" aria-live="polite">{feedback}</p>

      <div className="tools-grid">
        {tools.map(tool => {
          const Icon = icons[tool.category]
          const favorite = favorites.includes(tool.id)
          return (
            <article className="tool-card" key={tool.id} aria-labelledby={`tool-${tool.id}`}>
              <div className="tools-card-top">
                <Icon size={24} aria-hidden="true" />
                <button type="button" className="tools-favorite" aria-label={`Favorite ${tool.title}`} aria-pressed={favorite} onClick={() => toggleFavorite(tool.id, tool.title)}>
                  <Star size={18} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
              </div>
              <h2 id={`tool-${tool.id}`}>{tool.title}</h2>
              <code>{tool.id}</code>
              <p>{tool.description}</p>
              <span className={`tools-source tools-source-${tool.source}`}>
                {tool.source === 'builtin' ? 'Built-in · Request via Chat' : 'Generated · Not loaded by API'}
              </span>
              <details>
                <summary>Tool details<span className="tools-sr-only"> for {tool.title}</span></summary>
                <h3>Parameters</h3><p>{tool.parameters}</p>
                <h3>Behavior and limits</h3><p>{tool.behavior}</p>
                {tool.prompt && <>
                  <h3>Example prompt</h3><p className="tools-prompt">{tool.prompt}</p>
                  <button type="button" onClick={() => void copyPrompt(tool.prompt!)}>
                    <Copy size={15} aria-hidden="true" /> Copy prompt
                  </button>
                </>}
              </details>
            </article>
          )
        })}
      </div>
      {tools.length === 0 && <div className="tools-empty">
        <h2>No matching tools</h2>
        <p>{favoritesOnly ? 'Star a tool to save it as a favorite, or adjust your filters.' : 'Try another search or clear your filters.'}</p>
        <button type="button" onClick={clearFilters}>Show all tools</button>
      </div>}
    </div>
  )
}

export default ToolsPage
