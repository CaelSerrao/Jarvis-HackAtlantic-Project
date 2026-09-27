export const AUTOMATION_ACTIONS = [
  { value: 'open_application', label: 'Open application', description: 'Launch Calculator (Windows/macOS), Notepad (Windows), or TextEdit (macOS).' },
  { value: 'get_current_time', label: 'Read system time', description: 'Read the date and time from the computer running Jarvis.' },
  { value: 'get_system_info', label: 'Read system information', description: 'Read the backend computer’s operating system, version, architecture, and device name.' },
] as const

export const APPLICATIONS = [
  { value: 'calculator', label: 'Calculator — Windows / macOS' },
  { value: 'notepad', label: 'Notepad — Windows only' },
  { value: 'textedit', label: 'TextEdit — macOS only' },
] as const

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
type ToolName = typeof AUTOMATION_ACTIONS[number]['value']
type ApplicationName = typeof APPLICATIONS[number]['value']
type Trigger = 'manual' | 'daily' | 'weekly'

export type AutomationDraft = {
  name: string
  tool: ToolName
  application: ApplicationName
  trigger: Trigger
  time: string
  weekday: string
  timeZone: string
}

export type AutomationDefinition = AutomationDraft & { id: string; enabled: boolean }

export function newAutomationDraft(): AutomationDraft {
  return {
    name: '', tool: 'open_application', application: 'calculator', trigger: 'manual',
    time: '09:00', weekday: '1', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

export function validateAutomation(draft: AutomationDraft): string[] {
  const errors: string[] = []
  if (!draft.name.trim() || draft.name.trim().length > 80) errors.push('Enter a name between 1 and 80 characters.')
  if (!AUTOMATION_ACTIONS.some(action => action.value === draft.tool)) errors.push('Choose a supported action.')
  if (!APPLICATIONS.some(app => app.value === draft.application)) errors.push('Choose a supported application.')
  if (!['manual', 'daily', 'weekly'].includes(draft.trigger)) errors.push('Choose a valid trigger.')
  if (draft.trigger !== 'manual' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) errors.push('Enter a valid time.')
  if (draft.trigger === 'weekly' && !/^[0-6]$/.test(draft.weekday)) errors.push('Choose a weekday.')
  try {
    if (!draft.timeZone) throw new Error('Missing timezone')
    new Intl.DateTimeFormat('en', { timeZone: draft.timeZone })
  } catch {
    errors.push('The saved time zone is invalid. Create a new definition using your browser time zone.')
  }
  return errors
}

export function saveDefinition(definitions: readonly AutomationDefinition[], draft: AutomationDraft, id: string): AutomationDefinition[] {
  const errors = validateAutomation(draft)
  if (errors.length) throw new Error(errors.join(' '))
  if (definitions.some(item => item.id !== id && item.name.toLowerCase() === draft.name.trim().toLowerCase())) {
    throw new Error('Another definition already uses that name. Choose a different name.')
  }
  const existing = definitions.find(item => item.id === id)
  const definition: AutomationDefinition = { ...draft, name: draft.name.trim(), id, enabled: existing?.enabled ?? false }
  return existing ? definitions.map(item => item.id === id ? definition : item) : [...definitions, definition]
}

export function toggleDefinition(definitions: readonly AutomationDefinition[], id: string): AutomationDefinition[] {
  return definitions.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item)
}

export function deleteDefinition(definitions: readonly AutomationDefinition[], id: string): AutomationDefinition[] {
  return definitions.filter(item => item.id !== id)
}

export function describeTrigger(definition: AutomationDraft): string {
  if (definition.trigger === 'manual') return 'On demand (definition only)'
  const frequency = definition.trigger === 'weekly' ? `Every ${WEEKDAYS[Number(definition.weekday)]}` : 'Daily'
  return `${frequency} at ${definition.time} · ${definition.timeZone}`
}

function isDefinition(value: unknown): value is AutomationDefinition {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  const strings = ['id', 'name', 'tool', 'application', 'trigger', 'time', 'weekday', 'timeZone']
  if (!strings.every(key => typeof record[key] === 'string') || typeof record.enabled !== 'boolean' || !record.id) return false
  return validateAutomation(record as AutomationDefinition).length === 0
}

const STORAGE_KEY = 'jarvis.automations.v1'

// Local definitions only. Replace this persistence boundary with an API later.
export const automationStore = {
  load(): { definitions: AutomationDefinition[]; warning: string } {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === null) return { definitions: [], warning: '' }
      const parsed: unknown = JSON.parse(stored)
      if (!Array.isArray(parsed) || !parsed.every(isDefinition) || new Set(parsed.map(item => item.id)).size !== parsed.length) {
        throw new Error('Invalid definitions')
      }
      return { definitions: parsed, warning: '' }
    } catch {
      return { definitions: [], warning: 'Saved definitions could not be loaded. Nothing has been overwritten. Saving a new definition will replace this browser’s stored automation list.' }
    }
  },
  save(definitions: readonly AutomationDefinition[]): boolean {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(definitions))
      return true
    } catch {
      return false
    }
  },
}
