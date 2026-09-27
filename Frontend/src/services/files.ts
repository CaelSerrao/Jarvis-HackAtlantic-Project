export const FILE_CATEGORIES = ['Documents', 'Code', 'Images', 'Audio', 'Video', 'Archives', 'Other'] as const
export type FileCategory = typeof FILE_CATEGORIES[number]
export type FileMetadata = {
  id: string
  name: string
  size: number
  type: string
  lastModified: number
  category: FileCategory
}

export const FILE_SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'modified', label: 'Modified date' },
] as const

export type FilesPreferences = {
  category: 'all' | FileCategory
  sort: typeof FILE_SORTS[number]['value']
  direction: 'asc' | 'desc'
}

export const DEFAULT_FILES_PREFERENCES: Readonly<FilesPreferences> = { category: 'all', sort: 'name', direction: 'asc' }

export function fileCategory(name: string, type: string): FileCategory {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  if (type.startsWith('image/')) return 'Images'
  if (type.startsWith('audio/')) return 'Audio'
  if (type.startsWith('video/')) return 'Video'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'bmp', 'avif'].includes(extension)) return 'Images'
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) return 'Audio'
  if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(extension)) return 'Video'
  if (['zip', 'gz', 'tar', '7z', 'rar'].includes(extension)) return 'Archives'
  if (['py', 'js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'yml', 'yaml', 'xml', 'sh', 'ps1', 'rs', 'go', 'java', 'c', 'cpp'].includes(extension)) return 'Code'
  if (type.startsWith('text/') || ['txt', 'md', 'pdf', 'doc', 'docx', 'csv', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'odt'].includes(extension)) return 'Documents'
  return 'Other'
}

// Keep metadata only: never read file contents or upload the browser's File objects.
export function describeFiles(files: readonly Pick<File, 'name' | 'size' | 'type' | 'lastModified'>[]): FileMetadata[] {
  return files.map(file => ({
    id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type,
    lastModified: file.lastModified, category: fileCategory(file.name, file.type),
  }))
}

export function visibleFiles(files: readonly FileMetadata[], query: string, preferences: FilesPreferences): FileMetadata[] {
  const term = query.trim().toLowerCase()
  const direction = preferences.direction === 'asc' ? 1 : -1
  return files.filter(file =>
    (preferences.category === 'all' || file.category === preferences.category) &&
    `${file.name} ${file.type} ${file.category}`.toLowerCase().includes(term),
  ).sort((a, b) => {
    const byName = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    const comparison = preferences.sort === 'size' ? a.size - b.size :
      preferences.sort === 'modified' ? a.lastModified - b.lastModified : byName
    return (comparison || byName) * direction
  })
}

export function selectVisible(selected: readonly string[], visible: readonly FileMetadata[], checked: boolean): string[] {
  const ids = new Set(visible.map(file => file.id))
  return checked ? [...new Set([...selected, ...ids])] : selected.filter(id => !ids.has(id))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KiB', 'MiB', 'GiB', 'TiB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)) - 1, units.length - 1)
  return `${(bytes / 1024 ** (index + 1)).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[index]}`
}

export function formatModified(timestamp: number): string {
  return timestamp > 0 && Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : 'Not reported'
}

const STORAGE_KEY = 'jarvis.files.preferences.v1'
export const filesPreferencesStore = {
  load(): { preferences: FilesPreferences; warning: string } {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === null) return { preferences: { ...DEFAULT_FILES_PREFERENCES }, warning: '' }
      const value: unknown = JSON.parse(stored)
      if (typeof value !== 'object' || value === null ||
        !('category' in value) || !['all', ...FILE_CATEGORIES].some(category => category === value.category) ||
        !('sort' in value) || !FILE_SORTS.some(sort => sort.value === value.sort) ||
        !('direction' in value) || !['asc', 'desc'].some(direction => direction === value.direction)) {
        throw new Error('Invalid preferences')
      }
      return { preferences: value as FilesPreferences, warning: '' }
    } catch {
      return { preferences: { ...DEFAULT_FILES_PREFERENCES }, warning: 'View preferences could not be loaded. Default filters and sorting are shown.' }
    }
  },
  save(preferences: FilesPreferences): boolean {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      return true
    } catch {
      return false
    }
  },
}
