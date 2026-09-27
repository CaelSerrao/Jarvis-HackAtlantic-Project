import { useState } from 'react'
import { sendMessageToJarvis } from '../services/jarvis'
import { settingsStore } from '../services/settings'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'

import {
  Terminal,
  Folder,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  Square,
} from 'lucide-react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}


function Chat() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [initialSettings] = useState(() => settingsStore.load())
  const [voiceOutput, setVoiceOutput] = useState(initialSettings.preferences.voiceOutput)
  const [audioFeedback, setAudioFeedback] = useState('')
  const speech = useSpeechSynthesis()

  const toggleVoiceOutput = () => {
    if (!speech.available) {
      setAudioFeedback('Spoken replies are unavailable in this browser.')
      return
    }
    const next = !voiceOutput
    setVoiceOutput(next)
    const saved = settingsStore.save({ ...settingsStore.load().preferences, voiceOutput: next })
    setAudioFeedback(saved
      ? next ? 'Spoken Jarvis replies enabled.' : 'Spoken Jarvis replies disabled.'
      : 'Preference changed for this visit, but could not be saved in browser storage.')
    if (!next) speech.stop()
  }

  const handleSend = async () => {
    if (!message.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
    }

    setMessages((currentMessages) => [...currentMessages, userMessage])

    setMessage('')

    try {
      const result = await sendMessageToJarvis(message)

      const jarvisMessage: ChatMessage = {
        role: 'assistant',
        content: result.response,
      }

      if (voiceOutput) {
        if (!speech.available) {
          setAudioFeedback('Jarvis replied, but speech synthesis is unavailable in this browser.')
        } else if (!speech.speak(result.response)) {
          setAudioFeedback('Jarvis replied, but the browser could not start speech.')
        } else {
          setAudioFeedback('Speaking Jarvis reply. Starting another reply will stop this one.')
        }
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        jarvisMessage,
      ])
    } catch {
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

        <div className="chat-audio-controls" aria-label="Spoken replies">
          <button
            type="button"
            role="switch"
            aria-checked={voiceOutput}
            aria-label="Speak Jarvis replies"
            aria-describedby="chat-audio-status"
            disabled={!speech.available}
            onClick={toggleVoiceOutput}
          >
            {voiceOutput ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
            {voiceOutput ? 'Spoken replies on' : 'Spoken replies off'}
          </button>
          <button type="button" onClick={() => { speech.stop(); setAudioFeedback('Speech stopped.') }} disabled={!speech.available || !speech.speaking}>
            <Square size={14} aria-hidden="true" />Stop speech
          </button>
          <span id="chat-audio-status" role="status" aria-live="polite">
            {!speech.available ? 'Speech synthesis is unavailable in this browser.'
              : speech.error ? 'The browser could not speak that reply.'
                : audioFeedback || (voiceOutput ? 'New Jarvis replies will be spoken.' : 'Jarvis replies are silent.')}
          </span>
        </div>

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
