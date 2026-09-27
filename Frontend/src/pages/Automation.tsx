import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarClock, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import {
  APPLICATIONS, AUTOMATION_ACTIONS, WEEKDAYS, automationStore,
  deleteDefinition, describeTrigger, newAutomationDraft, saveDefinition, toggleDefinition,
} from '../services/automations'
import type { AutomationDefinition, AutomationDraft } from '../services/automations'
import './Automation.css'

type EditorProps = {
  initial: AutomationDraft
  editing: boolean
  onSave: (draft: AutomationDraft) => string | null
  onCancel: () => void
}

function AutomationEditor({ initial, editing, onSave, onCancel }: EditorProps) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState('')

  function change<K extends keyof AutomationDraft>(key: K, value: AutomationDraft[K]) {
    setDraft(current => ({ ...current, [key]: value }))
    setError('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(onSave(draft) ?? '')
  }

  function cancel() {
    if (JSON.stringify(draft) === JSON.stringify(initial) || window.confirm('Discard the unsaved changes to this definition?')) onCancel()
  }

  return (
    <form className="automation-editor" onSubmit={submit} aria-labelledby="automation-editor-title">
      <h2 id="automation-editor-title">{editing ? 'Edit definition' : 'New definition'}</h2>
      <p>Save configuration only. No action will run and no timer will start.</p>
      {error && <p className="automation-error" role="alert">{error}</p>}
      <div className="automation-form-fields">
        <label className="automation-full-field">Name
          <input autoFocus required maxLength={80} value={draft.name} onChange={event => change('name', event.target.value)} placeholder="e.g. Open calculator each morning" />
        </label>
        <label>Action
          <select value={draft.tool} aria-describedby="automation-action-help" onChange={event => {
            const action = AUTOMATION_ACTIONS.find(item => item.value === event.target.value)
            if (action) change('tool', action.value)
          }}>
            {AUTOMATION_ACTIONS.map(action => <option key={action.value} value={action.value}>{action.label}</option>)}
          </select>
        </label>
        {draft.tool === 'open_application' && <label>Application
          <select value={draft.application} onChange={event => {
            const application = APPLICATIONS.find(item => item.value === event.target.value)
            if (application) change('application', application.value)
          }}>
            {APPLICATIONS.map(app => <option key={app.value} value={app.value}>{app.label}</option>)}
          </select>
        </label>}
        <p id="automation-action-help" className="automation-full-field">{AUTOMATION_ACTIONS.find(action => action.value === draft.tool)?.description}</p>
        <label>Intended trigger
          <select value={draft.trigger} onChange={event => {
            const trigger = event.target.value
            if (trigger === 'manual' || trigger === 'daily' || trigger === 'weekly') change('trigger', trigger)
          }}>
            <option value="manual">On demand</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        {draft.trigger === 'weekly' && <label>Day
          <select value={draft.weekday} onChange={event => change('weekday', event.target.value)}>
            {WEEKDAYS.map((day, index) => <option key={day} value={String(index)}>{day}</option>)}
          </select>
        </label>}
        {draft.trigger !== 'manual' && <>
          <label>Time
            <input type="time" required value={draft.time} aria-describedby="automation-timezone" onChange={event => change('time', event.target.value)} />
          </label>
          <p className="automation-full-field" id="automation-timezone">Time zone: {draft.timeZone}. Captured from your browser when created; kept when editing. Scheduling requires backend support.</p>
        </>}
      </div>
      <div className="automation-actions">
        <button type="submit" className="automation-primary"><Save size={16} aria-hidden="true" />Save definition</button>
        <button type="button" onClick={cancel}>Cancel</button>
      </div>
    </form>
  )
}

function Automation() {
  const [initial] = useState(() => automationStore.load())
  const [definitions, setDefinitions] = useState(initial.definitions)
  const [storageWarning, setStorageWarning] = useState(initial.warning)
  const [feedback, setFeedback] = useState('')
  const [failed, setFailed] = useState(false)
  const [editor, setEditor] = useState<{ id: string | null; draft: AutomationDraft } | null>(null)
  const newButton = useRef<HTMLButtonElement>(null)

  function closeEditor() {
    setEditor(null)
    newButton.current?.focus()
  }

  function persist(next: AutomationDefinition[], message: string): string | null {
    if (storageWarning && !window.confirm('The previous saved list could not be read. Replace it with these definitions?')) {
      return 'Save cancelled. The previous stored list has not been replaced.'
    }
    if (!automationStore.save(next)) {
      const error = 'Could not save to browser storage. No changes were applied. Check browser storage permissions and try again.'
      setFailed(true)
      setFeedback(error)
      return error
    }
    setDefinitions(next)
    setStorageWarning('')
    setFailed(false)
    setFeedback(message)
    return null
  }

  function save(draft: AutomationDraft): string | null {
    try {
      const next = saveDefinition(definitions, draft, editor?.id ?? crypto.randomUUID())
      const error = persist(next, 'Definition saved in this browser. It is not scheduled and nothing has run.')
      if (!error) closeEditor()
      return error
    } catch (error) {
      return error instanceof Error ? error.message : 'Could not save this definition.'
    }
  }

  function remove(definition: AutomationDefinition) {
    if (window.confirm(`Delete “${definition.name}”? This removes the local definition and cannot be undone.`)) {
      if (!persist(deleteDefinition(definitions, definition.id), 'Local definition deleted.')) newButton.current?.focus()
    }
  }

  return (
    <div className="page-content automation-page">
      <div className="page-heading">
        <span>JARVIS WORKFLOWS</span>
        <h1>Automation</h1>
        <p>Create and organize local automation definitions.</p>
      </div>
      <p className="automation-notice" id="automation-local-note">
        Definitions only — no scheduler or automation execution API is connected.
        Enabling a definition saves your preference; it does not run actions, including while this page is open.
        Definitions are stored only in this browser.
      </p>
      {storageWarning && <p className="automation-error" role="alert">{storageWarning}</p>}
      <button ref={newButton} type="button" className="create-automation" aria-disabled={editor !== null} onClick={() => {
        if (!editor) setEditor({ id: null, draft: newAutomationDraft() })
      }}>
        <Plus size={18} aria-hidden="true" />New definition
      </button>
      {editor && <AutomationEditor key={editor.id ?? 'new'} initial={editor.draft} editing={editor.id !== null} onSave={save} onCancel={closeEditor} />}
      <p className={`automation-feedback${failed ? ' automation-error' : ''}`} role="status" aria-live="polite">{feedback}</p>
      <p>{definitions.length} saved {definitions.length === 1 ? 'definition' : 'definitions'} · {definitions.filter(item => item.enabled).length} enabled as a preference · 0 scheduled</p>
      {definitions.length === 0 && !editor && <div className="automation-empty">
        <h2>No automation definitions yet</h2>
        <p>Use New definition to configure a supported action and its intended trigger. Nothing runs until a backend scheduler is implemented.</p>
      </div>}
      <div className="automation-list">
        {definitions.map(definition => (
          <article className="automation-card" key={definition.id} aria-labelledby={`automation-${definition.id}`}>
            <CalendarClock size={22} aria-hidden="true" />
            <div>
              <h2 id={`automation-${definition.id}`}>{definition.name}</h2>
              <span>{AUTOMATION_ACTIONS.find(action => action.value === definition.tool)?.label}
                {definition.tool === 'open_application' && `: ${APPLICATIONS.find(app => app.value === definition.application)?.label}`}</span>
              <span>{describeTrigger(definition)}</span>
              <small>Local definition · Not scheduled</small>
            </div>
            <div className="automation-actions">
              <button type="button" role="switch" aria-checked={definition.enabled} aria-label={`Enable definition: ${definition.name}`} aria-describedby="automation-local-note" disabled={editor !== null}
                onClick={() => persist(toggleDefinition(definitions, definition.id), `Definition ${definition.enabled ? 'disabled' : 'enabled'} as a saved preference. No scheduler is connected.`)}>
                {definition.enabled ? 'Enabled preference' : 'Disabled preference'}
              </button>
              <button type="button" aria-label={`Edit ${definition.name}`} disabled={editor !== null} onClick={() => setEditor({ id: definition.id, draft: definition })}><Pencil size={15} aria-hidden="true" />Edit</button>
              <button type="button" className="automation-delete" aria-label={`Delete ${definition.name}`} disabled={editor !== null} onClick={() => remove(definition)}><Trash2 size={15} aria-hidden="true" />Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default Automation
