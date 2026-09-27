import React, { useEffect, useRef, useState } from "react";
import "./Chat.css";

import {
  connectJarvisEvents,
  getHealth,
  resolveApproval,
  sendChatMessage,
} from "../../services/jarvis";
import {
  captureJarvisVoice,
  speakJarvisText,
} from "../../services/voice";
import { getRuntimeSettings, getSettings } from "../../services/settings";

const EVENT_STATUS = {
  request_started: "Thinking",
  developer_agent_started: "Starting developer agent",
  capability_learning_started: "Learning a new capability",
  web_lookup_started: "Looking up current information",
  web_lookup_finished: "Web lookup complete",
  research_started: "Starting research",
  research_status: "Research in progress",
  request_completed: "Finishing response",
  response_ready: "Response ready",
};

function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Good evening. Jarvis is online. How can I help?",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [eventConnected, setEventConnected] = useState(false);
  const [activity, setActivity] = useState("Ready");
  const [approval, setApproval] = useState(null);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const activeRequestIdRef = useRef(null);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then(() => {
        if (!cancelled) setBackendOnline(true);
      })
      .catch(() => {
        if (!cancelled) setBackendOnline(false);
      });

    const disconnect = connectJarvisEvents({
      onOpen: () => {
        if (!cancelled) {
          setEventConnected(true);
          setBackendOnline(true);
        }
      },
      onClose: () => {
        if (!cancelled) setEventConnected(false);
      },
      onError: () => {
        if (!cancelled) setEventConnected(false);
      },
      onEvent: (event) => {
        if (cancelled) return;

        if (
          event.request_id &&
          activeRequestIdRef.current &&
          event.request_id !== activeRequestIdRef.current
        ) {
          return;
        }

        if (event.type === "capability_approval_required") {
          setApproval(event.data || null);
          setActivity("Approval required");
          return;
        }

        if (event.type === "research_status") {
          const status = event.data?.status;
          setActivity(status ? `Research: ${status}` : "Research in progress");
          return;
        }

        if (EVENT_STATUS[event.type]) {
          setActivity(EVENT_STATUS[event.type]);
        }
      },
    });

    return () => {
      cancelled = true;
      disconnect();
    };
  }, []);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, thinking, approval]);

  async function sendMessage(event) {
    event.preventDefault();

    const text = input.trim();
    if (!text || thinking || listening) return;

    const requestId = crypto.randomUUID();
    activeRequestIdRef.current = requestId;

    setMessages((current) => [
      ...current,
      { role: "user", content: text },
    ]);

    setInput("");
    setThinking(true);
    setApproval(null);
    setActivity("Thinking");

    try {
      const data = await sendChatMessage(
        text,
        requestId,
        getRuntimeSettings()
      );

      if (!data.success) {
        throw new Error(
          data?.error?.message || data?.error || "Jarvis could not complete the request."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.response || "I received an empty response.",
        },
      ]);

      if (data.speech_text) {
        speakJarvisText(data.speech_text).catch((error) => {
          console.error("Jarvis voice output failed:", error);
        });
      }

      const appSettings = getSettings();

      if (
        appSettings.system.notifications &&
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Jarvis", {
          body: data.speech_text || data.response || "Your response is ready.",
        });
      }

      setBackendOnline(true);
      setActivity("Ready");
    } catch (error) {
      console.error(error);

      setMessages((current) => [
        ...current,
        {
          role: "error",
          content:
            error.message ||
            "I couldn't reach the Jarvis backend. Check that the Jarvis API is running.",
        },
      ]);

      if (!error.status) {
        setBackendOnline(false);
      }

      setActivity("Request failed");
    } finally {
      setThinking(false);
      setApproval(null);
      activeRequestIdRef.current = null;
    }
  }

  async function handleVoiceInput() {
    if (thinking || listening) return;

    setListening(true);
    setActivity("Listening");

    try {
      const transcript = await captureJarvisVoice();

      if (transcript) {
        setInput(transcript);
        setActivity("Voice captured");
        window.setTimeout(() => inputRef.current?.focus(), 0);
      } else {
        setActivity("No speech detected");
      }
    } catch (error) {
      console.error("Jarvis voice input failed:", error);
      setMessages((current) => [
        ...current,
        {
          role: "error",
          content:
            error.message ||
            "I couldn't access the configured microphone. Check Voice settings and microphone permissions.",
        },
      ]);
      setActivity("Voice input failed");
    } finally {
      setListening(false);
    }
  }

  async function handleApproval(approved) {
    if (!approval?.approval_id || approvalBusy) return;

    setApprovalBusy(true);

    try {
      await resolveApproval(approval.approval_id, approved);
      setActivity(approved ? "Capability approved" : "Capability rejected");
      setApproval(null);
    } catch (error) {
      console.error(error);
      setMessages((current) => [
        ...current,
        {
          role: "error",
          content: error.message || "The capability approval could not be submitted.",
        },
      ]);
    } finally {
      setApprovalBusy(false);
    }
  }

  const online = backendOnline && eventConnected;

  return (
    <main className="chat-page">
      <div className="chat-container">
        <header className="chat-header">
          <div>
            <p className="chat-eyebrow">JARVIS / INTELLIGENCE</p>
            <h1>Chat</h1>
            <p>Direct access to your personal intelligence system.</p>
          </div>

          <div className={`chat-status ${online ? "" : "chat-status-offline"}`}>
            <span className="chat-status-dot" />
            {online ? "JARVIS ONLINE" : "CONNECTING"}
          </div>
        </header>

        <section className="chat-panel">
          <div className="chat-orb" aria-hidden="true">
            <div className="chat-orb-core" />
          </div>

          <div className="chat-messages" ref={messagesRef}>
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`chat-message chat-message-${message.role}`}
              >
                <span className="chat-message-label">
                  {message.role === "user"
                    ? "YOU"
                    : message.role === "error"
                      ? "SYSTEM"
                      : "JARVIS"}
                </span>

                <div className="chat-message-content">{message.content}</div>
              </div>
            ))}

            {approval && (
              <div className="chat-approval-card">
                <div className="chat-approval-heading">
                  <div>
                    <span className="chat-message-label">CAPABILITY REQUEST</span>
                    <h3>{approval.name || "New Jarvis capability"}</h3>
                  </div>
                  <span className="chat-approval-risk">
                    {approval.risk_level || "unknown"} risk
                  </span>
                </div>

                <p>
                  {approval.description ||
                    "Jarvis needs permission to install a newly generated capability."}
                </p>

                {!!approval.permissions?.length && (
                  <div className="chat-approval-permissions">
                    {approval.permissions.map((permission) => (
                      <span key={permission}>{permission}</span>
                    ))}
                  </div>
                )}

                <div className="chat-approval-actions">
                  <button
                    type="button"
                    onClick={() => handleApproval(false)}
                    disabled={approvalBusy}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="chat-approval-allow"
                    onClick={() => handleApproval(true)}
                    disabled={approvalBusy}
                  >
                    {approvalBusy ? "Submitting…" : "Allow"}
                  </button>
                </div>
              </div>
            )}

            {thinking && (
              <div className="chat-message chat-message-assistant">
                <span className="chat-message-label">JARVIS · {activity}</span>
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
                className={`chat-mic ${listening ? "chat-mic-listening" : ""}`}
                type="button"
                onClick={handleVoiceInput}
                disabled={thinking || listening || !backendOnline}
                aria-label="Voice input"
                title="Record and transcribe voice input"
              >
                {listening ? "●" : "🎙"}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={listening ? "Listening for five seconds…" : "Ask Jarvis anything..."}
                disabled={thinking || listening}
                autoFocus
              />

              <button
                className="chat-send"
                type="submit"
                disabled={!input.trim() || thinking || listening}
              >
                Send
                <span aria-hidden="true">→</span>
              </button>
            </div>

            <p className="chat-hint">
              {online
                ? `Local intelligence • ${listening ? "Listening" : activity}`
                : "Waiting for the local Jarvis backend…"}
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

export default Chat;
