import {
  MessageSquare,
  Wrench,
  Workflow,
  Folder,
  Database,
  Settings,
} from 'lucide-react'

import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import AccountMenu from './auth/AccountMenu'

import Chat from './pages/Chat'
import Tools from './pages/ToolsPage'
import Automation from './pages/Automation'
import Files from './pages/Files'
import Memory from './pages/Memory'
import SettingsPage from './pages/Settings'

import './App.css'

function App() {
  return (
    <div className="jarvis-app">

      {/* LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="jarvis-orb"></div>

          <div>
            <h2>JARVIS</h2>
            <p>Your Personal Assistant</p>
          </div>
        </div>

        <nav className="navigation">
          <nav className="navigation">

            <NavLink
              to="/chat"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <MessageSquare size={19} strokeWidth={1.8} />
              <span>Chat</span>
            </NavLink>

            <NavLink
              to="/tools"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Wrench size={19} strokeWidth={1.8} />
              <span>Tools</span>
            </NavLink>

            <NavLink
              to="/automation"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Workflow size={19} strokeWidth={1.8} />
              <span>Automation</span>
            </NavLink>

            <NavLink
              to="/files"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Folder size={19} strokeWidth={1.8} />
              <span>Files</span>
            </NavLink>

            <NavLink
              to="/memory"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Database size={19} strokeWidth={1.8} />
              <span>Memory</span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Settings size={19} strokeWidth={1.8} />
              <span>Settings</span>
            </NavLink>

          </nav>
        </nav>

        <div className="system-status">
          <h3>System Status</h3>

          <p>
            <span className="online-dot"></span>
            Local LLM
            <strong>Online</strong>
          </p>

          <p>
            <span className="online-dot"></span>
            Tools
            <strong>Ready</strong>
          </p>

          <p>
            <span className="offline-dot"></span>
            Voice (STT)
            <strong>Offline</strong>
          </p>

          <p>
            <span className="offline-dot"></span>
            Voice (TTS)
            <strong>Offline</strong>
          </p>

          <p>
            <span className="online-dot"></span>
            Cloud API
            <strong>Ready</strong>
          </p>
        </div>

        <AccountMenu />
      </aside>


      {/* MAIN CHAT AREA */}
      <main className="main-panel">
        <Routes>
          <Route path="/chat" element={<Chat />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="/files" element={<Files />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>

      </main>


      {/* RIGHT PANEL */}
      <aside className="right-panel">

        <section className="panel-card">
          <h2>System</h2>

          <div className="stats">
            <div>
              <strong>32%</strong>
              <span>CPU</span>
            </div>

            <div>
              <strong>48%</strong>
              <span>Memory</span>
            </div>

            <div>
              <strong>22%</strong>
              <span>GPU</span>
            </div>
          </div>

          <p className="model-name">
            Model: phi-3-mini-4k-instruct-q4
          </p>
        </section>


        <section className="panel-card">
          <h2>Quick Tools</h2>

          <div className="tool-grid">
            <button>Open App</button>
            <button>Search Files</button>
            <button>Take Note</button>
            <button>Screenshot</button>
          </div>
        </section>


        <section className="panel-card">
          <h2>Recent Activity</h2>

          <ul className="activity-list">
            <li>Opened Calculator</li>
            <li>Checked current time</li>
            <li>Recorded new capability</li>
            <li>Searched for project files</li>
          </ul>
        </section>

      </aside>

    </div>
  )
}

export default App
