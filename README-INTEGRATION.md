# Jarvis — Latest Frontend + Chat, Settings, and Voice Integration

This build preserves the latest uploaded frontend navigation and Settings sections while wiring Chat, Settings, and the supplied standalone voice module into the local Jarvis backend.

## Preserved UI

Main navigation still contains:
- Chat
- Settings
- Automation
- Memory
- Tools
- Files

Settings still contains:
- Profile
- Appearance
- AI & Usage
- Memory
- Tools & Security
- Voice
- System

No navigation or Settings tabs were removed.

## Chat integration

Chat now:
- Uses the local FastAPI Jarvis backend on `127.0.0.1:8765`
- Receives normal Jarvis responses and TTS-safe `speech_text`
- Receives WebSocket progress events
- Displays capability approval requests
- Supports Allow / Reject for generated capabilities
- Sends runtime settings with each request
- Includes a microphone button that records locally through the supplied Python voice module
- Places the Whisper transcription into the chat input so it can be reviewed before sending
- Speaks Jarvis replies through the local Python TTS module when Voice Responses is enabled

## Voice integration

The supplied `voice-module/voice_module.py` has been integrated into the Python backend as:

`Backend/Jarvis_Max/voice_module.py`

FastAPI exposes:
- `GET /voice/devices` — available microphone inputs
- `GET /voice/voices` — installed local speech voices
- `POST /voice/listen` — microphone capture + faster-whisper transcription
- `POST /voice/speak` — local pyttsx3/SAPI speech output

Voice work runs on one dedicated backend worker thread so the cached Whisper model and TTS engine are used consistently without blocking FastAPI's main event loop.

### Voice Settings tab

The existing Voice tab now controls the backend voice system:
- Input Device selects a `sounddevice` microphone
- Refresh reloads backend microphone devices
- Test Mic records 3 seconds and shows what Jarvis heard
- Voice Responses enables/disables automatic spoken replies
- Voice selects an installed pyttsx3/SAPI voice
- Speech Speed controls TTS rate
- Voice Volume controls TTS volume
- Test Voice speaks the preview through the backend

Voice settings are saved locally and used by the Chat page.

### First voice-input run

The default recognition model is `tiny` with CPU `int8`. On the first microphone transcription, faster-whisper may download the model weights from Hugging Face. Later runs use the cached model.

Windows microphone permission must allow desktop applications to access the microphone.

## Other Settings integration

The existing Settings UI is preserved. These sections persist and/or affect Jarvis:
- Appearance: Dark / Light / System
- AI & Usage: selected model, inference mode, remote fallback, backend connection test
- Memory: memory/history/preference/workflow toggles
- Tools & Security: tool execution, tool generation, sandbox/approval preferences
- System: notifications, launch on startup, run in background
- Voice: microphone, TTS enablement, voice, speed, and volume

## Windows setup

The `.cmd` route avoids PowerShell execution-policy issues:

```cmd
setup-windows.cmd
```

Or from PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup-windows.ps1
```

The setup installs both the existing Jarvis backend dependencies and the supplied voice dependencies:
- `faster-whisper`
- `numpy`
- `sounddevice`
- `pyttsx3`

Then start with:

```cmd
start-windows.cmd
```

or:

```powershell
cd Frontend
npm start
```

Electron starts the Python FastAPI backend automatically.

The local LLM server must still be running if your current Jarvis backend expects it on port `8080`.
