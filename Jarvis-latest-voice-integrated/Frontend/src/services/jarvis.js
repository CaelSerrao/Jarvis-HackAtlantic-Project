const host = window.location.hostname === "localhost" ? "localhost" : "127.0.0.1";

export const API_BASE_URL =
  import.meta.env.VITE_JARVIS_API_URL || `http://${host}:8765`;

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error ||
      data?.detail ||
      `Jarvis API returned ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return parseResponse(response);
}

export async function sendChatMessage(
  message,
  requestId = crypto.randomUUID(),
  settings = {}
) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      request_id: requestId,
      settings,
    }),
  });

  return parseResponse(response);
}

export async function getPendingApprovals() {
  const response = await fetch(`${API_BASE_URL}/approvals`);
  return parseResponse(response);
}

export async function resolveApproval(approvalId, approved) {
  const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ approved }),
  });

  return parseResponse(response);
}

export async function getVoiceDevices() {
  const response = await fetch(`${API_BASE_URL}/voice/devices`);
  return parseResponse(response);
}

export async function getVoiceVoices() {
  const response = await fetch(`${API_BASE_URL}/voice/voices`);
  return parseResponse(response);
}

export async function listenForVoice({
  durationSeconds = 5,
  language = null,
  inputDevice = null,
} = {}) {
  const response = await fetch(`${API_BASE_URL}/voice/listen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      duration_seconds: durationSeconds,
      language,
      input_device: inputDevice,
    }),
  });

  return parseResponse(response);
}

export async function speakVoice({
  text,
  voiceId = null,
  rate = 1,
  volume = 1,
}) {
  const response = await fetch(`${API_BASE_URL}/voice/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      rate,
      volume,
    }),
  });

  return parseResponse(response);
}

export function connectJarvisEvents({ onEvent, onOpen, onClose, onError } = {}) {
  const socket = new WebSocket(`${WS_BASE_URL}/events`);

  socket.onopen = () => {
    onOpen?.();
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      onEvent?.(payload);
    } catch (error) {
      console.error("Invalid Jarvis event:", error);
    }
  };

  socket.onerror = (error) => {
    onError?.(error);
  };

  socket.onclose = () => {
    onClose?.();
  };

  return () => {
    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }
  };
}
