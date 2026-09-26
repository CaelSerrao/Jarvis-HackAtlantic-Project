import { useState } from 'react'
import { sendMessageToJarvis } from '../services/jarvis'

import {
  Terminal,
  Folder,
  Search,
  Sparkles,
} from 'lucide-react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}


function Chat() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const handleSend = async () => {
    if (!message.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
    }

    setMessages([
      ...messages,
      userMessage,
    ])

    setMessage('')

    try {
      const result = await sendMessageToJarvis(message)

      const jarvisMessage: ChatMessage = {
        role: 'assistant',
        content: result.response,
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        jarvisMessage,
      ])
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Unable to connect to Jarvis.',
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        errorMessage,
      ])
    }
  }
  return (
    <>
      <header className="top-header">
        <div className="greeting">
          <div className="large-orb"></div>

          <div>
            <h1>Good evening, Ryan.</h1>
            <p>How can I help you today?</p>
          </div>
        </div>

        <div className="header-info">
          <div className="date-info">
            <span>FRIDAY, SEPTEMBER 25</span>
            <strong>8:42 PM</strong>
          </div>

          <div className="weather-info">
            <span>☁</span>

            <div>
              <strong>12°C</strong>
              <small>Fredericton</small>
            </div>
          </div>
        </div>
      </header>

      <section className="quick-actions">
        <button className="action-card">
          <Terminal size={23} strokeWidth={1.7} />
          <div>
            <strong>Open an app</strong>
            <span>Launch applications</span>
          </div>
        </button>

        <button className="action-card">
          <Folder size={23} strokeWidth={1.7} />
          <div>
            <strong>Manage files</strong>
            <span>Find, move, organize</span>
          </div>
        </button>

        <button className="action-card">
          <Search size={23} strokeWidth={1.7} />
          <div>
            <strong>Research</strong>
            <span>Search and summarize</span>
          </div>
        </button>

        <button className="action-card">
          <Sparkles size={23} strokeWidth={1.7} />
          <div>
            <strong>Automate</strong>
            <span>Create a new workflow</span>
          </div>
        </button>
      </section>

      {/* CHAT */}
      <section className="chat-area">

        <div className="message user-message">
          Open calculator
        </div>

        <div className="assistant-message">
          <div className="small-orb"></div>

          <div>
            <p>Opening Calculator...</p>

            <div className="tool-result">
              ✓ <strong>open_app</strong>
              <span>Launched calc.exe</span>
            </div>
          </div>
        </div>


        <div className="message user-message">
          What time is it?
        </div>

        <div className="assistant-message">
          <div className="small-orb"></div>

          <div>
            <p>It's currently 8:42 PM.</p>

            <div className="tool-result">
              ✓ <strong>get_time</strong>
              <span>Current system time retrieved</span>
            </div>
          </div>
        </div>


        <div className="message user-message">
          Create a folder on my desktop called Homework
        </div>

        <div className="assistant-message">
          <div className="small-orb"></div>

          <div>
            <p>
              I don't have a tool for that yet. I've recorded this
              capability so it can be added later.
            </p>

            <div className="missing-tool">
              <strong>⚠ Missing capability</strong>
              <span>create_folder</span>
            </div>
          </div>
        </div>

        {messages.map((chatMessage, index) => (
          <div
            className={
              chatMessage.role === 'user'
                ? 'message user-message'
                : 'assistant-message'
            }
            key={index}
          >
            {chatMessage.content}
          </div>
        ))}
      </section>

      {/* MESSAGE INPUT */}
      <div className="message-box">
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSend()
          }}
        />
        <button onClick={handleSend}>➤</button>
      </div>

    </>
  )
}

export default Chat