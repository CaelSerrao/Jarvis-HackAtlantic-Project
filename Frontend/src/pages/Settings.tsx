import { useState } from 'react'
import { BrainCircuit, Cloud, Mic, RotateCcw, ShieldCheck, Volume2 } from 'lucide-react'
import { DEFAULT_SETTINGS, settingsStore } from '../services/settings'
import type { SettingsPreferences } from '../services/settings'

const controls = [
  {
    key: 'voiceInput', label: 'Voice Input', icon: Mic,
    description: 'Prefer speech recognition when voice input is available. Whisper is not connected yet.',
  },
  {
    key: 'voiceOutput', label: 'Voice Output', icon: Volume2,
    description: 'Speak new Jarvis chat replies aloud using this browser’s speech synthesis.',
  },
  {
    key: 'cloudConnection', label: 'Cloud Connection', icon: Cloud,
    description: 'Allow cloud services when connected. This preference does not currently enable or block cloud requests.',
  },
  {
    key: 'privacyMode', label: 'Privacy Mode', icon: ShieldCheck,
    description: 'Prefer local processing when possible. This preference does not currently enforce privacy or prevent cloud use.',
  },
] satisfies Array<{
  key: keyof SettingsPreferences
  label: string
  icon: typeof Mic
  description: string
}>

function Settings() {
  const [initial] = useState(() => settingsStore.load())
  const [preferences, setPreferences] = useState(initial.preferences)
  const [feedback, setFeedback] = useState(initial.warning ?? 'Preferences save automatically in this browser.')
  const [saveFailed, setSaveFailed] = useState(initial.warning !== null)

  function save(next: SettingsPreferences, message: string) {
    setPreferences(next)
    const saved = settingsStore.save(next)
    setSaveFailed(!saved)
    setFeedback(saved ? message : 'Could not save to browser storage. These changes will be lost when you leave this page or reload. Try changing a preference again.')
  }

  function reset() {
    if (window.confirm('Reset all Settings preferences to defaults in this browser?')) {
      save({ ...DEFAULT_SETTINGS }, 'Default preferences restored and saved in this browser.')
    }
  }

  return (
    <div className="page-content settings-page">
      <div className="page-heading">
        <span>JARVIS CONFIGURATION</span>
        <h1>Settings</h1>
        <p>Configure how Jarvis thinks, listens and interacts with your system.</p>
      </div>

      <p className="settings-notice" id="settings-local-note">
        Local preferences only. These choices are saved in this browser for future integrations;
        Voice Output controls spoken replies in Chat. Other preferences are saved for future integrations.
      </p>

      <div className="settings-list">
        <div className="settings-card">
          <BrainCircuit size={21} aria-hidden="true" />
          <div>
            <label htmlFor="settings-model">AI Model</label>
            <span id="settings-model-help">Managed by the local model server. Model selection is not connected.</span>
          </div>
          <select id="settings-model" className="setting-value" disabled aria-describedby="settings-model-help">
            <option>Backend managed</option>
          </select>
        </div>

        {controls.map(({ key, label, icon: Icon, description }) => (
          <div className="settings-card" key={key}>
            <Icon size={21} aria-hidden="true" />
            <div>
              <strong id={`settings-${key}-label`}>{label}</strong>
              <span id={`settings-${key}-help`}>{description}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences[key]}
              aria-labelledby={`settings-${key}-label`}
              aria-describedby={`settings-${key}-help settings-local-note`}
              className={`setting-toggle${preferences[key] ? ' active' : ''}`}
              onClick={() => save(
                { ...preferences, [key]: !preferences[key] },
                `${label} preference ${preferences[key] ? 'disabled' : 'enabled'} and saved in this browser.`,
              )}
            >
              {preferences[key] ? 'On' : 'Off'}
            </button>
          </div>
        ))}
      </div>

      <div className="settings-footer">
        <p role="status" aria-live="polite" className={`settings-feedback${saveFailed ? ' settings-feedback-error' : ''}`}>
          {feedback}
        </p>
        <button type="button" className="settings-reset" onClick={reset}>
          <RotateCcw size={15} aria-hidden="true" />
          Reset to defaults
        </button>
      </div>
    </div>
  )
}

export default Settings
