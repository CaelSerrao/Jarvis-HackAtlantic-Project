export type ToolCategory = 'System' | 'Memory' | 'Capabilities' | 'Files'
export type ToolSource = 'builtin' | 'generated'

export type ToolDefinition = {
  id: string
  title: string
  category: ToolCategory
  source: ToolSource
  description: string
  parameters: string
  behavior: string
  prompt?: string
}

// Repository snapshot: tools.py and generated_tools/installed/*/manifest.json.
// Replace this catalog with API discovery when a tool-list endpoint exists.
export const TOOL_CATALOG: readonly ToolDefinition[] = [
  {
    id: 'open_application', title: 'Open Application', category: 'System', source: 'builtin',
    description: 'Launch a supported application on the computer running Jarvis.',
    parameters: 'name (required string): calculator or notepad on Windows; calculator or textedit on macOS.',
    behavior: 'Starts an application process. Other application names and operating systems are not supported.',
    prompt: 'Open calculator',
  },
  {
    id: 'get_current_time', title: 'System Time', category: 'System', source: 'builtin',
    description: 'Read the current date and time from the computer running Jarvis.',
    parameters: 'No parameters.',
    behavior: 'Reads the backend computer clock, not the browser clock.',
    prompt: 'What is the current date and time?',
  },
  {
    id: 'get_system_info', title: 'System Information', category: 'System', source: 'builtin',
    description: 'Read operating system, OS version, machine architecture, and device name.',
    parameters: 'No parameters.',
    behavior: 'Returns information about the backend computer. It does not report CPU, memory, or GPU utilization.',
    prompt: 'Show information about the computer you are running on.',
  },
  {
    id: 'save_memory', title: 'Save Memory', category: 'Memory', source: 'builtin',
    description: 'Store a long-term fact, preference, or project detail in Jarvis memory.',
    parameters: 'content (required string); category (optional string, default general); importance (optional integer, 1–5, default 1).',
    behavior: 'Writes a memory to the backend SQLite database for the current user.',
    prompt: 'Remember that I prefer concise responses.',
  },
  {
    id: 'recall_memory', title: 'Recall Memory', category: 'Memory', source: 'builtin',
    description: 'Search stored long-term memories for information related to a query.',
    parameters: 'query (required string).',
    behavior: 'Uses keyword matching in backend memory records. This is not filesystem or web search.',
    prompt: 'What do you remember about my preferences?',
  },
  {
    id: 'request_capability', title: 'Request Capability', category: 'Capabilities', source: 'builtin',
    description: 'Record an action Jarvis cannot currently perform.',
    parameters: 'capability (required string); reason (optional string).',
    behavior: 'Writes a missing-capability record. The current API bridge does not build or install new tools.',
    prompt: 'Record a missing capability for converting image files between formats.',
  },
  {
    id: 'create_directories', title: 'Create Directories', category: 'Files', source: 'generated',
    description: 'Create one or more filesystem directories, including missing parent directories.',
    parameters: 'directory_paths (required string or string array); parent_path (optional string or null).',
    behavior: 'Writes to the filesystem. Declares Windows and macOS support. Present in the installed-tools directory, but not loaded by api.py.',
  },
  {
    id: 'create_text_file_tool', title: 'Create Text File', category: 'Files', source: 'generated',
    description: 'Write text content to a file and create its parent directories if needed.',
    parameters: 'file_path and content (required strings); encoding (utf-8, ascii, or latin-1; default utf-8); overwrite (optional boolean, default true).',
    behavior: 'Can overwrite an existing file by default. Declares Windows, macOS, and Linux support. Not loaded by api.py.',
  },
]

export const TOOL_CATEGORIES: readonly ToolCategory[] = ['System', 'Memory', 'Capabilities', 'Files']

export function filterTools(query: string, category: string, source: string, favoritesOnly: boolean, favorites: readonly string[]) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return TOOL_CATALOG.filter(tool => {
    const text = `${tool.id} ${tool.title} ${tool.category} ${tool.description} ${tool.parameters} ${tool.behavior}`.toLowerCase()
    return (category === 'all' || tool.category === category) &&
      (source === 'all' || tool.source === source) &&
      (!favoritesOnly || favorites.includes(tool.id)) &&
      words.every(word => text.includes(word))
  })
}

const FAVORITES_KEY = 'jarvis.tools.favorites.v1'

// Persistence is separate from the UI; failures never block catalog browsing.
export const toolFavoritesStore = {
  load(): { favorites: string[]; warning: string } {
    try {
      const stored = window.localStorage.getItem(FAVORITES_KEY)
      if (stored === null) return { favorites: [], warning: '' }
      const parsed: unknown = JSON.parse(stored)
      if (!Array.isArray(parsed) || !parsed.every((id: unknown) => typeof id === 'string')) {
        throw new Error('Invalid favorites')
      }
      const favorites = TOOL_CATALOG.filter(tool => parsed.includes(tool.id)).map(tool => tool.id)
      return { favorites, warning: '' }
    } catch {
      return { favorites: [], warning: 'Saved favorites could not be loaded. You can still browse all tools.' }
    }
  },
  save(favorites: readonly string[]): boolean {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
      return true
    } catch {
      return false
    }
  },
}
