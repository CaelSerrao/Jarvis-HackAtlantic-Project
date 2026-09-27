import { useEffect, useRef, useState } from 'react'
import { File, FileCode2, FileText, Image, Music, Video, Archive, X } from 'lucide-react'
import {
  DEFAULT_FILES_PREFERENCES, FILE_CATEGORIES, FILE_SORTS, describeFiles,
  filesPreferencesStore, formatFileSize, formatModified, selectVisible, visibleFiles,
} from '../services/files'
import type { FileCategory, FileMetadata, FilesPreferences } from '../services/files'
import './Files.css'

const icons = { Documents: FileText, Code: FileCode2, Images: Image, Audio: Music, Video, Archives: Archive, Other: File } satisfies Record<FileCategory, typeof File>

function Files() {
  const [initial] = useState(() => filesPreferencesStore.load())
  const [preferences, setPreferences] = useState(initial.preferences)
  const [warning, setWarning] = useState(initial.warning)
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const picker = useRef<HTMLInputElement>(null)
  const detailsPanel = useRef<HTMLElement>(null)
  const visible = visibleFiles(files, query, preferences)
  const details = files.find(file => file.id === detailsId)
  const visibleSelected = visible.filter(file => selected.includes(file.id)).length
  const allVisibleSelected = visible.length > 0 && visibleSelected === visible.length
  const selectionSize = files.filter(file => selected.includes(file.id)).reduce((sum, file) => sum + file.size, 0)

  useEffect(() => {
    if (detailsId) detailsPanel.current?.focus()
  }, [detailsId])

  function savePreferences(next: FilesPreferences) {
    setPreferences(next)
    const saved = filesPreferencesStore.save(next)
    setWarning(saved ? '' : 'View preferences changed for this visit, but could not be saved in browser storage.')
    if (saved) setFeedback('View preferences saved in this browser. File names and metadata are not stored.')
  }

  function resetView() {
    setQuery('')
    savePreferences({ ...DEFAULT_FILES_PREFERENCES })
  }

  function removeSelected() {
    if (!window.confirm(`Remove ${selected.length} selected entries from this page, including any hidden by filters? Your files will not be deleted.`)) return
    setFiles(current => current.filter(file => !selected.includes(file.id)))
    if (detailsId && selected.includes(detailsId)) setDetailsId(null)
    setSelected([])
    setFeedback('Selected entries removed from this page. No files were deleted or modified.')
  }

  function clearList() {
    if (!window.confirm('Clear this page’s file list? No files will be deleted or modified.')) return
    setFiles([])
    setSelected([])
    setDetailsId(null)
    setFeedback('File list cleared. Choose files again to inspect their metadata.')
  }

  return (
    <div className="page-content files-page">
      <div className="page-heading">
        <span>JARVIS FILE ACCESS</span>
        <h1>Files</h1>
        <p>Inspect metadata for files you explicitly select in this browser.</p>
      </div>
      <p className="files-notice">
        Browser selection only. No filesystem browsing or file-search API is connected.
        Files are not uploaded, opened for content, or modified. This list is temporary and clears when you leave the page or reload;
        only type-filter and sorting preferences are saved. Full filesystem access needs backend or Electron support.
      </p>

      <label className="files-picker">Choose files to inspect
        <input ref={picker} type="file" multiple aria-describedby="files-picker-help" onChange={event => {
          const chosen = Array.from(event.currentTarget.files ?? [])
          if (chosen.length) {
            setFiles(describeFiles(chosen))
            setSelected([])
            setDetailsId(null)
            setFeedback(`Loaded metadata for ${chosen.length} files selected in your browser. No upload occurred. Filters remain as selected below.`)
          }
          event.currentTarget.value = ''
        }} />
      </label>
      <p className="files-picker-hint" id="files-picker-help">Choose one or more files using your browser’s picker. A new choice replaces this list. File contents are never read.</p>

      <div className="files-filters" role="search" aria-label="Filter selected files">
        <label className="files-search">Search this list
          <input type="search" value={query} placeholder="File name, type, or category" onChange={event => setQuery(event.target.value)} />
        </label>
        <label>Type
          <select value={preferences.category} onChange={event => {
            const category = event.target.value
            if (category === 'all') savePreferences({ ...preferences, category })
            else {
              const match = FILE_CATEGORIES.find(item => item === category)
              if (match) savePreferences({ ...preferences, category: match })
            }
          }}>
            <option value="all">All types</option>
            {FILE_CATEGORIES.map(category => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label>Sort by
          <select value={preferences.sort} onChange={event => {
            const sort = FILE_SORTS.find(item => item.value === event.target.value)
            if (sort) savePreferences({ ...preferences, sort: sort.value })
          }}>
            {FILE_SORTS.map(sort => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
          </select>
        </label>
        <label>Order
          <select value={preferences.direction} onChange={event => {
            const direction = event.target.value
            if (direction === 'asc' || direction === 'desc') savePreferences({ ...preferences, direction })
          }}>
            <option value="asc">Ascending</option><option value="desc">Descending</option>
          </select>
        </label>
        <button type="button" onClick={resetView}>Reset view</button>
      </div>
      {warning && <p className="files-error" role="alert">{warning}</p>}
      <p className="files-feedback" role="status" aria-live="polite">{feedback}</p>
      <p role="status">Showing {visible.length} of {files.length} files · {selected.length} selected ({formatFileSize(selectionSize)})
        {selected.length > visibleSelected && ` · ${selected.length - visibleSelected} selected entries hidden by filters`}</p>

      <div className="files-actions">
        <button type="button" disabled={selected.length === 0} onClick={() => setSelected([])}>Clear selection</button>
        <button type="button" disabled={selected.length === 0} onClick={removeSelected}>Remove selected from list</button>
        <button type="button" disabled={files.length === 0} onClick={clearList}>Clear list</button>
      </div>

      {visible.length > 0 ? <div className="file-browser" role="region" aria-label="Selected file metadata table" tabIndex={0}>
        <table className="files-table">
          <caption className="files-sr-only">Browser-selected files. Choose a file name to view its metadata.</caption>
          <thead><tr>
            <th scope="col"><label className="files-check">
              <input type="checkbox" aria-label="Select all visible files" checked={allVisibleSelected}
                ref={element => { if (element) element.indeterminate = visibleSelected > 0 && !allVisibleSelected }}
                onChange={event => setSelected(selectVisible(selected, visible, event.target.checked))} />
            </label></th>
            <th scope="col" aria-sort={preferences.sort === 'name' ? (preferences.direction === 'asc' ? 'ascending' : 'descending') : undefined}>Name</th>
            <th scope="col">Type</th>
            <th scope="col" aria-sort={preferences.sort === 'size' ? (preferences.direction === 'asc' ? 'ascending' : 'descending') : undefined}>Size</th>
            <th scope="col" aria-sort={preferences.sort === 'modified' ? (preferences.direction === 'asc' ? 'ascending' : 'descending') : undefined}>Modified</th>
          </tr></thead>
          <tbody>{visible.map(file => {
            const Icon = icons[file.category]
            return <tr key={file.id} data-selected={selected.includes(file.id)}>
              <td><label className="files-check">
                <input type="checkbox" aria-label={`Select ${file.name}`} checked={selected.includes(file.id)} onChange={event => setSelected(selectVisible(selected, [file], event.target.checked))} />
              </label></td>
              <td><button type="button" className="files-name" aria-label={`View details for ${file.name}`} aria-expanded={detailsId === file.id} aria-controls="files-details" onClick={() => setDetailsId(file.id)}>
                <Icon size={19} aria-hidden="true" />{file.name}
              </button></td>
              <td>{file.category}</td><td>{formatFileSize(file.size)}</td><td>{formatModified(file.lastModified)}</td>
            </tr>
          })}</tbody>
        </table>
      </div> : <div className="files-empty">
        <h2>{files.length ? 'No matching files' : 'No files selected'}</h2>
        <p>{files.length ? 'Try a different search or reset the view to show all selected files.' : 'Choose files above to browse their names, sizes, types, and modification dates. No sample files are shown.'}</p>
        {files.length > 0 && <button type="button" onClick={resetView}>Show all files</button>}
      </div>}

      {details && <section className="files-details" id="files-details" ref={detailsPanel} tabIndex={-1} aria-labelledby="files-details-title">
        <h2 id="files-details-title">{details.name}</h2>
        <dl>
          <dt>Category</dt><dd>{details.category} (from name / MIME type)</dd>
          <dt>Size</dt><dd>{formatFileSize(details.size)} ({details.size.toLocaleString()} bytes)</dd>
          <dt>MIME type</dt><dd>{details.type || 'Not reported by browser'}</dd>
          <dt>Last modified</dt><dd>{formatModified(details.lastModified)}</dd>
          <dt>Full path</dt><dd>Not exposed by this browser picker.</dd>
        </dl>
        <p>Metadata reported by the browser at selection time. This is not a live filesystem view.</p>
        <button type="button" onClick={() => { setDetailsId(null); picker.current?.focus() }}><X size={16} aria-hidden="true" />Close details</button>
      </section>}
    </div>
  )
}

export default Files
