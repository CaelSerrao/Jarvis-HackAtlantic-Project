import {
  Calculator,
  Clock,
  FileText,
  Folder,
  Monitor,
  Search,
} from 'lucide-react'

function ToolsPage() {
  return (
    <div className="page-content">
      <div className="page-heading">
        <span>JARVIS CAPABILITIES</span>
        <h1>Tools</h1>
        <p>Manage the actions Jarvis can perform on your device.</p>
      </div>

      <div className="tools-grid">
        <button className="tool-card">
          <Calculator size={24} />
          <strong>Calculator</strong>
          <span>Open the system calculator</span>
        </button>

        <button className="tool-card">
          <Clock size={24} />
          <strong>System Time</strong>
          <span>Retrieve the current time</span>
        </button>

        <button className="tool-card">
          <FileText size={24} />
          <strong>Notepad</strong>
          <span>Open a new text document</span>
        </button>

        <button className="tool-card">
          <Folder size={24} />
          <strong>File Manager</strong>
          <span>Browse and organize files</span>
        </button>

        <button className="tool-card">
          <Search size={24} />
          <strong>Search</strong>
          <span>Search files and information</span>
        </button>

        <button className="tool-card">
          <Monitor size={24} />
          <strong>System</strong>
          <span>Access system information</span>
        </button>
      </div>
    </div>
  )
}

export default ToolsPage