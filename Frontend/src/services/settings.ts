export type SettingsPreferences = {
  voiceInput: boolean
  voiceOutput: boolean
  cloudConnection: boolean
  privacyMode: boolean
}

export const DEFAULT_SETTINGS: Readonly<SettingsPreferences> = {
  voiceInput: false,
  voiceOutput: false,
  cloudConnection: true,
  privacyMode: true,
}

const STORAGE_KEY = 'jarvis.settings.v1'

type SettingsLoadResult = {
  preferences: SettingsPreferences
  warning: string | null
}

function isPreferences(value: unknown): value is SettingsPreferences {
  return typeof value === 'object' && value !== null &&
    'voiceInput' in value && typeof value.voiceInput === 'boolean' &&
    'voiceOutput' in value && typeof value.voiceOutput === 'boolean' &&
    'cloudConnection' in value && typeof value.cloudConnection === 'boolean' &&
    'privacyMode' in value && typeof value.privacyMode === 'boolean'
}

// Replace this adapter when backend persistence becomes available.
export const settingsStore = {
  load(): SettingsLoadResult {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === null) {
        return { preferences: { ...DEFAULT_SETTINGS }, warning: null }
      }
      const parsed: unknown = JSON.parse(stored)
      if (!isPreferences(parsed)) throw new Error('Invalid settings')
      return { preferences: parsed, warning: null }
    } catch {
      return {
        preferences: { ...DEFAULT_SETTINGS },
        warning: 'Saved preferences could not be loaded. Defaults are shown; change a preference to try saving again.',
      }
    }
  },

  save(preferences: SettingsPreferences): boolean {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      return true
    } catch {
      return false
    }
  },
}
