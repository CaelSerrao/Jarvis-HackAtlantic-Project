import React, { useState } from "react";
import "./Chat.css";
import { API_BASE_URL } from "../../services/auth";

function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Good evening. Jarvis is online. How can I help?",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  async function sendMessage(e) {
    e.preventDefault();

    const text = input.trim();
    if (!text || thinking) return;

    setMessages((current) => [
      ...current,
      { role: "user", content: text },
    ]);

    setInput("");
    setThinking(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Jarvis API returned ${response.status}`);
      }

      const data = await response.json();

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.response || "I received an empty response.",
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((current) => [
        ...current,
        {
          role: "error",
          content:
            "I couldn't reach the Jarvis backend. Check that the Jarvis API is running.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="chat-page">
      <div className="chat-container">
        <header className="chat-header">
          <div>
            <p className="chat-eyebrow">JARVIS / INTELLIGENCE</p>
            <h1>Chat</h1>
            <p>Direct access to your personal intelligence system.</p>
          </div>

          <div className="chat-status">
            <span className="chat-status-dot" />
            JARVIS ONLINE
          </div>
        </header>

        <section className="chat-panel">
          <div className="chat-orb" aria-hidden="true">
            <div className="chat-orb-core" />
          </div>

          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chat-message chat-message-${message.role}`}
              >
                <span className="chat-message-label">
                  {message.role === "user"
                    ? "YOU"
                    : message.role === "error"
                      ? "SYSTEM"
                      : "JARVIS"}
                </span>

                <div className="chat-message-content">
                  {message.content}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="chat-message chat-message-assistant">
                <span className="chat-message-label">JARVIS</span>
                <div className="chat-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <form className="chat-input-area" onSubmit={sendMessage}>
            <div className="chat-input-shell">
              <button
                className="chat-mic"
                type="button"
                aria-label="Voice input"
                title="Voice input coming next"
              >
                ◉
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Jarvis anything..."
                disabled={thinking}
                autoFocus
              />

              <button
                className="chat-send"
                type="submit"
                disabled={!input.trim() || thinking}
              >
                Send
                <span aria-hidden="true">→</span>
              </button>
            </div>

            <p className="chat-hint">
              Local intelligence • Private by design • Enter to send
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

export default Chat;
