import {
  Brain,
  BriefcaseBusiness,
  Code2,
  UserRound,
} from 'lucide-react'

function Memory() {
  return (
    <div className="page-content">
      <div className="page-heading">
        <span>JARVIS MEMORY</span>
        <h1>Memory</h1>
        <p>Information Jarvis remembers to personalize your experience.</p>
      </div>

      <div className="memory-stats">
        <div>
          <strong>24</strong>
          <span>Memories</span>
        </div>

        <div>
          <strong>4</strong>
          <span>Categories</span>
        </div>

        <div>
          <strong>Today</strong>
          <span>Last updated</span>
        </div>
      </div>

      <div className="memory-list">
        <div className="memory-card">
          <UserRound size={21} />
          <div>
            <span>PERSONAL</span>
            <strong>Prefers concise responses</strong>
            <p>Used to adjust how Jarvis communicates.</p>
          </div>
        </div>

        <div className="memory-card">
          <Code2 size={21} />
          <div>
            <span>DEVELOPMENT</span>
            <strong>Currently working on the Jarvis project</strong>
            <p>Active development context for future conversations.</p>
          </div>
        </div>

        <div className="memory-card">
          <BriefcaseBusiness size={21} />
          <div>
            <span>WORKFLOW</span>
            <strong>Uses VS Code for development</strong>
            <p>Useful when providing development instructions.</p>
          </div>
        </div>

        <div className="memory-card">
          <Brain size={21} />
          <div>
            <span>ASSISTANT</span>
            <strong>Jarvis should preserve context across devices</strong>
            <p>A core preference for the assistant experience.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Memory