import {
  CalendarClock,
  Mail,
  FolderSync,
  Plus,
} from 'lucide-react'

function Automation() {
  return (
    <div className="page-content">
      <div className="page-heading">
        <span>JARVIS WORKFLOWS</span>
        <h1>Automation</h1>
        <p>Create routines that Jarvis can execute automatically.</p>
      </div>

      <button className="create-automation">
        <Plus size={18} />
        New Automation
      </button>

      <div className="automation-list">
        <div className="automation-card">
          <CalendarClock size={22} />
          <div>
            <strong>Morning Briefing</strong>
            <span>Weather, calendar and daily tasks</span>
          </div>
          <small>7:00 AM</small>
        </div>

        <div className="automation-card">
          <Mail size={22} />
          <div>
            <strong>Email Summary</strong>
            <span>Summarize important unread messages</span>
          </div>
          <small>On demand</small>
        </div>

        <div className="automation-card">
          <FolderSync size={22} />
          <div>
            <strong>Project Backup</strong>
            <span>Back up selected project files</span>
          </div>
          <small>Daily</small>
        </div>
      </div>
    </div>
  )
}

export default Automation