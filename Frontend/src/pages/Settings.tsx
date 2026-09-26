import {
  BrainCircuit,
  Cloud,
  Mic,
  ShieldCheck,
  Volume2,
} from 'lucide-react'

function Settings() {
  return (
    <div className="page-content">
      <div className="page-heading">
        <span>JARVIS CONFIGURATION</span>
        <h1>Settings</h1>
        <p>Configure how Jarvis thinks, listens and interacts with your system.</p>
      </div>

      <div className="settings-list">
        <div className="settings-card">
          <BrainCircuit size={21} />

          <div>
            <strong>AI Model</strong>
            <span>Local language model used by Jarvis</span>
          </div>

          <div className="setting-value">
            phi-3-mini
          </div>
        </div>

        <div className="settings-card">
          <Mic size={21} />

          <div>
            <strong>Voice Input</strong>
            <span>Speech recognition using Whisper</span>
          </div>

          <button className="setting-toggle">
            Offline
          </button>
        </div>

        <div className="settings-card">
          <Volume2 size={21} />

          <div>
            <strong>Voice Output</strong>
            <span>Allow Jarvis to respond using speech</span>
          </div>

          <button className="setting-toggle">
            Offline
          </button>
        </div>

        <div className="settings-card">
          <Cloud size={21} />

          <div>
            <strong>Cloud Connection</strong>
            <span>Connect Jarvis to remote services and APIs</span>
          </div>

          <button className="setting-toggle active">
            Enabled
          </button>
        </div>

        <div className="settings-card">
          <ShieldCheck size={21} />

          <div>
            <strong>Privacy Mode</strong>
            <span>Prefer local processing when possible</span>
          </div>

          <button className="setting-toggle active">
            Enabled
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings