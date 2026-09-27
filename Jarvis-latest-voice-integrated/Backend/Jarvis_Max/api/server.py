import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from contextvars import ContextVar
from functools import partial
from typing import Any
from uuid import uuid4

from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from api.events import EventBroker
from api.approvals import ApprovalBroker
from api.tts_text import make_tts_safe
from bootstrap import JarvisRuntime
from voice_module import VoiceModule


API_VERSION = "1.0"

app = FastAPI(
    title="Jarvis API",
    version=API_VERSION
)


# Electron loads the built UI from file://, whose browser origin is "null".
# Vite development commonly runs on ports 5173/5174.
allowed_origins = [
    "null",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:8765",
    "http://127.0.0.1:8765",
]

extra_origins = os.environ.get(
    "JARVIS_FRONTEND_ORIGINS",
    ""
)

for origin in extra_origins.split(","):
    origin = origin.strip()
    if origin and origin not in allowed_origins:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


current_request_id = ContextVar(
    "jarvis_request_id",
    default=None
)


event_broker = EventBroker()


def publish_event(event):
    """Attach the active chat request id to runtime events when available."""
    if isinstance(event, dict):
        payload = dict(event)
    else:
        payload = {
            "type": "runtime_event",
            "data": {"value": str(event)}
        }

    request_id = current_request_id.get()
    if request_id and not payload.get("request_id"):
        payload["request_id"] = request_id

    event_broker.publish(payload)


approval_broker = ApprovalBroker(
    event_handler=publish_event
)

runtime = JarvisRuntime(
    event_handler=publish_event,
    approval_handler=approval_broker.request
)

# Voice work is kept on one dedicated worker thread. This keeps the cached
# Whisper model and pyttsx3/SAPI engine on a consistent thread while FastAPI
# remains responsive. Dependencies are still lazy-loaded by VoiceModule.
voice_runtime = VoiceModule(
    model_size=os.environ.get("JARVIS_VOICE_MODEL", "tiny"),
    device=os.environ.get("JARVIS_VOICE_DEVICE", "cpu"),
    compute_type=os.environ.get("JARVIS_VOICE_COMPUTE_TYPE", "int8"),
    record_seconds=float(os.environ.get("JARVIS_VOICE_RECORD_SECONDS", "5")),
)
voice_executor = ThreadPoolExecutor(
    max_workers=1,
    thread_name_prefix="jarvis-voice",
)


async def run_voice_call(function, *args, **kwargs):
    loop = asyncio.get_running_loop()
    call = partial(function, *args, **kwargs)
    return await loop.run_in_executor(voice_executor, call)


# The current Jarvis runtime stores active conversation/tool state in one
# object, so serialize chat requests for now. Approval endpoints stay free so
# they can unblock a request waiting in the worker thread.
chat_lock = asyncio.Lock()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    request_id: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)


class ApprovalRequest(BaseModel):
    approved: bool


class VoiceListenRequest(BaseModel):
    duration_seconds: float = Field(default=5.0, gt=0, le=15)
    language: str | None = None
    input_device: int | str | None = None


class VoiceSpeakRequest(BaseModel):
    text: str = Field(min_length=1)
    voice_id: str | None = None
    rate: float = Field(default=1.0, ge=0.5, le=2.0)
    volume: float = Field(default=1.0, ge=0.0, le=1.0)


class ErrorInfo(BaseModel):
    code: str
    message: str


class ChatResponse(BaseModel):
    success: bool
    request_id: str
    status: str
    response: str | None = None
    speech_text: str | None = None
    error: ErrorInfo | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


@app.get("/")
def root():
    return {
        "name": "Jarvis API",
        "status": "ready",
        "api_version": API_VERSION,
    }


@app.get("/health")
def health():
    return {
        "status": "ready",
        "api_version": API_VERSION,
    }


@app.get("/approvals")
def get_approvals():
    return {
        "approvals": approval_broker.list_pending()
    }


@app.post("/approvals/{approval_id}")
def resolve_approval(
    approval_id: str,
    request: ApprovalRequest
):
    return approval_broker.resolve(
        approval_id,
        request.approved
    )


@app.get("/voice/devices")
async def voice_devices():
    try:
        devices = await run_voice_call(
            voice_runtime.list_input_devices
        )
        return {
            "success": True,
            "devices": devices,
        }
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "VOICE_DEVICE_LIST_FAILED",
                    "message": str(error),
                },
            },
        )


@app.get("/voice/voices")
async def voice_voices():
    try:
        voices = await run_voice_call(
            voice_runtime.list_voices
        )
        return {
            "success": True,
            "voices": voices,
        }
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "VOICE_LIST_FAILED",
                    "message": str(error),
                },
            },
        )


@app.post("/voice/listen")
async def voice_listen(request: VoiceListenRequest):
    try:
        # The standalone voice module keeps the selected device on the instance.
        # All calls are serialized on voice_executor, so updating it here is safe.
        voice_runtime.input_device = request.input_device

        transcript = await run_voice_call(
            voice_runtime.listen,
            request.duration_seconds,
            language=request.language,
        )

        return {
            "success": True,
            "transcript": transcript,
        }
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "VOICE_LISTEN_FAILED",
                    "message": str(error),
                },
            },
        )


@app.post("/voice/speak")
async def voice_speak(request: VoiceSpeakRequest):
    try:
        speech_text = make_tts_safe(request.text)

        if speech_text:
            await run_voice_call(
                voice_runtime.speak,
                speech_text,
                voice_id=request.voice_id,
                rate=request.rate,
                volume=request.volume,
            )

        return {
            "success": True,
            "spoken_text": speech_text,
        }
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "VOICE_SPEAK_FAILED",
                    "message": str(error),
                },
            },
        )


@app.post(
    "/chat",
    response_model=ChatResponse
)
async def chat(request: ChatRequest):
    request_id = request.request_id or str(uuid4())

    if chat_lock.locked():
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "request_id": request_id,
                "status": "busy",
                "response": None,
                "speech_text": None,
                "error": {
                    "code": "JARVIS_BUSY",
                    "message": "Jarvis is already processing another request.",
                },
                "metadata": {},
            },
        )

    async with chat_lock:
        token = current_request_id.set(request_id)

        try:
            # runtime.handle is blocking (local/remote model calls and tools),
            # so execute it outside FastAPI's event loop.
            response = await asyncio.to_thread(
                runtime.handle,
                request.message,
                request.settings
            )

            speech_text = make_tts_safe(response)

            # Runtime already emits request_completed. This frontend-specific
            # event carries the TTS-safe form too.
            publish_event({
                "type": "response_ready",
                "request_id": request_id,
                "data": {
                    "response": response,
                    "speech_text": speech_text,
                },
            })

            return {
                "success": True,
                "request_id": request_id,
                "status": "completed",
                "response": response,
                "speech_text": speech_text,
                "error": None,
                "metadata": {},
            }

        except Exception as error:
            error_message = str(error)

            publish_event({
                "type": "response_failed",
                "request_id": request_id,
                "data": {
                    "error": error_message,
                },
            })

            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "request_id": request_id,
                    "status": "failed",
                    "response": None,
                    "speech_text": None,
                    "error": {
                        "code": "JARVIS_REQUEST_FAILED",
                        "message": error_message,
                    },
                    "metadata": {},
                },
            )

        finally:
            current_request_id.reset(token)


@app.websocket("/events")
async def events(websocket: WebSocket):
    await websocket.accept()

    subscriber = event_broker.subscribe()
    queue = subscriber["queue"]

    await websocket.send_json({
        "type": "connection_ready",
        "request_id": None,
        "data": {
            "status": "connected",
            "api_version": API_VERSION,
        },
    })

    try:
        while True:
            event = await queue.get()
            await websocket.send_json(event)

    except WebSocketDisconnect:
        pass

    except asyncio.CancelledError:
        pass

    finally:
        event_broker.unsubscribe(subscriber)


@app.on_event("shutdown")
def shutdown_voice_runtime():
    try:
        voice_runtime.stop_speaking()
    except Exception:
        pass

    voice_executor.shutdown(
        wait=False,
        cancel_futures=True,
    )
