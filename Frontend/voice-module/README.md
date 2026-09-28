# Standalone Jarvis voice module

This folder provides local microphone capture, local speech recognition with
`faster-whisper`, and local Windows speech output through SAPI5 (`pyttsx3`). It
does not call or depend on the Jarvis backend, React, Electron, or a network API.
The default Whisper model is `tiny`, running on CPU with `int8` compute. Its
weights are downloaded from Hugging Face on the first `listen()` call and then
cached by faster-whisper; use `tiny.en` for English-only recognition if desired.

## Setup on Windows

Python 3.13 (64-bit) was used for this module. From this directory:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

The virtual environment keeps the dependencies isolated. `sounddevice` uses
PortAudio from its Windows wheel, and speech output uses the Windows SAPI voice
installed on the machine. The GTX 1660 Ti is not required; CPU `int8` is the
default so other developers do not need CUDA packages or a GPU-specific setup.

## Try it

```powershell
.\.venv\Scripts\python.exe interactive_test.py
```

Press Enter and speak during the five-second recording. The program prints the
transcription, then speaks a short response. Windows microphone permission and
a working input/output device are required. The first run downloads the small
`tiny` model; later runs can use the cached files offline.

## Selecting a microphone

`VoiceModule` accepts an optional `input_device` index or device-name string.
When omitted, it uses the current Windows default input. The selected device is
opened at its reported native sample rate, then audio is resampled in memory to
16 kHz for faster-whisper. Device indices vary between computers and Windows
audio APIs, so list available devices first:

```powershell
.\.venv\Scripts\python.exe -c "import sounddevice as sd; print(sd.query_devices())"
```

For example, device 15 on the development machine is the Realtek microphone
through Windows WASAPI and captures at 48 kHz:

```python
from voice_module import VoiceModule
voice = VoiceModule(input_device=15)
transcript = voice.listen()
```

On another computer, use an input-capable device index from its listing or a
unique part of the device name. If a name matches multiple audio endpoints,
pass the index or include the host API in the name (for example,
`"Microphone (Realtek(R) Audio), Windows WASAPI"`).

Run the hardware-free unit tests with:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

## Backend integration

Keep this directory independent and import it from the backend process by
adding this directory to Python's import path (or packaging/copying this
standalone folder as part of the backend deployment). Install
`requirements.txt` into that process's own environment. Create one instance
when the application starts and call its synchronous methods from a worker
thread if the caller is an async server handler:

```python
from voice_module import VoiceModule
voice = VoiceModule(model_size="tiny")
recognized_text = voice.listen(); voice.speak(recognized_text)
```

`listen()` records five seconds by default and returns a string; configure
`record_seconds` or pass `duration_seconds=` to change capture length. Pass
`language="en"` to select a language, or leave it unset for detection.
`speak(text)` speaks arbitrary text synchronously. `stop_speaking()` asks SAPI5
to stop the active utterance. No Jarvis pipeline integration is included.
