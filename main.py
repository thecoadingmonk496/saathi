from __future__ import annotations

import os
import logging
import base64
import time
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables first
load_dotenv(override=True)

from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.requests import ClientDisconnect
from pydantic import BaseModel, Field
import uvicorn
import asyncio

# Import local modules
from ai_pipeline import run_ai_pipeline
from sarvam_service import speech_to_text, text_to_speech as sarvam_tts, is_valid_sarvam_key
from google_tts_service import (
    is_google_tts_available,
    text_to_speech_google_base64 as google_tts,
    VOICE_MAP as GOOGLE_VOICE_MAP,
)
from edge_tts_service import (
    text_to_speech_edge_sync as edge_tts,
    get_edge_voice,
    EDGE_VOICE_MAP,
)

# ── TTS provider selection ──────────────────────────────────────────────────
# TTS_ENGINE controls which TTS provider is tried first.
#   "edge"   (default) — free Microsoft Edge Neural TTS, no API key needed
#   "google" — Google Cloud Neural2 TTS (requires GOOGLE_APPLICATION_CREDENTIALS)
#   "sarvam" — Sarvam AI bulbul:v3 (requires SARVAM_API_KEY)
# Fallback chain: edge → google → sarvam → empty
_TTS_ENGINE = os.getenv("TTS_ENGINE", "edge").lower()
_TTS_ENABLED = os.getenv("TTS_ENABLED", "true").lower() == "true"


def synthesise_speech(text: str, language_code: str = "hi-IN") -> tuple[str, str, str]:
    """
    Unified TTS entry point.
    Returns (base64_audio, mime_type, voice_name).
    Priority: Edge TTS → Google Neural2 → Sarvam bulbul:v3 → ("", "", "").
    """
    if not _TTS_ENABLED:
        logger.info("[TTS] TTS_ENABLED=false — skipping synthesis")
        return "", "", ""

    if not text or not text.strip():
        return "", "", ""

    # ── Edge TTS (primary — free, fast, no API key) ───────────────────
    if _TTS_ENGINE != "sarvam" and _TTS_ENGINE != "google":
        try:
            b64, mime, voice = edge_tts(text, language_code)
            if b64:
                logger.info(f"[TTS] Edge TTS synthesised {len(b64)} b64 chars, voice={voice}")
                return b64, mime, voice
            logger.warning("[TTS] Edge TTS returned empty — falling through")
        except Exception as exc:
            logger.warning(f"[TTS] Edge TTS failed ({exc}) — falling through")

    # ── Google Neural2 (secondary) ────────────────────────────────────
    if _TTS_ENGINE != "sarvam" and is_google_tts_available():
        try:
            b64, mime = google_tts(text, language_code)
            if b64:
                logger.info(f"[TTS] Google Neural2 synthesised {len(b64)} b64 chars ({mime})")
                return b64, mime, "google-neural2"
            logger.warning("[TTS] Google TTS returned empty — falling through")
        except Exception as exc:
            logger.warning(f"[TTS] Google TTS failed ({exc}) — falling through")

    # ── Sarvam bulbul:v3 (tertiary) ───────────────────────────────────
    if is_valid_sarvam_key():
        try:
            b64 = sarvam_tts(text=text, target_language_code=language_code, speaker="shubh")
            if b64:
                logger.info(f"[TTS] Sarvam synthesised {len(b64)} b64 chars (audio/wav)")
                return b64, "audio/wav", "sarvam-shubh"
        except Exception as exc:
            logger.warning(f"[TTS] Sarvam TTS failed: {exc}")

    logger.error("[TTS] All TTS providers failed — returning empty")
    return "", "", ""

from pythonjsonlogger import jsonlogger

# Configure structured JSON logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Remove existing handlers if any
if logger.hasHandlers():
    logger.handlers.clear()

logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(levelname)s %(name)s %(message)s'
)
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)

# Re-assign logger for this module
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(
    title="Saathi (कृषि मित्र) AI Voice Assistant Backend",
    description="Official AI Backend for Indian Farmers integrating LangChain, Gemini, Sarvam AI Voice, and Mandi Prices.",
    version="1.0.0"
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5175",
        "http://localhost:3000", 
        "http://127.0.0.1:5173"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the frontend (index.html) and any static assets from the project root.
# This lets users open http://localhost:8000 instead of file:///…/index.html,
# which eliminates the 'file:// unique origin' browser security warning and
# the cross-origin fetch restrictions that cause premature request aborts (499).
_FRONTEND_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=_FRONTEND_DIR), name="static")


# Request and Response Models
class ChatRequest(BaseModel):
    message: str = Field(..., example="उत्तर प्रदेश में गेहूं का भाव क्या है?")
    history: list[dict] = Field(default_factory=list, description="List of previous conversation turns [{'role': 'user'|'assistant', 'content': '...'}]")
    profile: dict = Field(default_factory=dict, description="Farmer profile metadata {'state': '...', 'district': '...', 'soilType': '...', 'crop': '...'}")

class ChatResponse(BaseModel):
    status: str = "success"
    user_message: str
    ai_response: str
    detected_language: Optional[str] = Field(
        default=None, description="Human-readable detected language, e.g. 'Hindi'"
    )
    detected_language_code: Optional[str] = Field(
        default=None, description="ISO 639-1 language code, e.g. 'hi'"
    )
    detected_language_bcp47: Optional[str] = Field(
        default=None, description="BCP-47 code used for AI/TTS, e.g. 'hi-IN'"
    )

class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize")
    language_code: str = Field(default="hi-IN", description="Target language BCP-47 or ISO 639-1 code")
    speaker: Optional[str] = Field(default=None, description="Voice override (ignored when using Edge TTS)")

class TTSResponse(BaseModel):
    status: str = "success"
    audio_base64: str
    mime_type: str = Field(default="audio/mpeg", description="MIME type of the audio")
    voice: Optional[str] = Field(default=None, description="Voice name used for synthesis")
    format: str = Field(default="mp3", description="Audio format")


class VoiceBase64Request(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded audio string.")
    speaker: Optional[str] = Field(default="shubh", description="Sarvam TTS speaker voice ID.")


class VoiceChatResponse(BaseModel):
    status: str = "success"
    transcribed_text: str
    ai_response: str
    audio_base64: str


# Frontend Entrypoint — serve index.html at the root URL so the app is always
# accessed via http://localhost:8000 and never via the file:// protocol.
@app.get("/", tags=["Frontend"], include_in_schema=False)
def serve_frontend():
    """Serve the Saathi frontend (index.html) over HTTP."""
    index_path = os.path.join(_FRONTEND_DIR, "index.html")
    return FileResponse(index_path, media_type="text/html")


# Health Check Endpoint
@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend status."""
    return {"status": "ok", "message": "Saathi Backend is running"}


# TTS Endpoint
@app.post("/tts", response_model=TTSResponse, tags=["Voice"])
async def tts_endpoint(request: TTSRequest) -> Optional[TTSResponse]:
    """
    TTS endpoint.  Tries Edge TTS → Google Neural2 → Sarvam.
    """
    try:
        logger.info(f"[TTS] preparing speech: lang={request.language_code} text_len={len(request.text)}")
        audio_b64, mime_type, voice = await run_in_threadpool(
            synthesise_speech,
            text=request.text,
            language_code=request.language_code,
        )

        if not audio_b64:
            raise HTTPException(status_code=500, detail="All TTS providers returned empty audio")

        audio_fmt = "mp3" if "mpeg" in mime_type else "wav"
        logger.info(f"[TTS] sending audio to frontend: voice={voice} format={audio_fmt}")

        return TTSResponse(
            status="success",
            audio_base64=audio_b64,
            mime_type=mime_type,
            voice=voice,
            format=audio_fmt,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TTS ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


# Text Chat Endpoint
@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def text_chat(request: ChatRequest) -> Optional[ChatResponse]:
    """
    Text-based query endpoint.
    Processes the query via the Gemini LangChain Agent. Language detection is integrated into the AI pipeline.
    """
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message input cannot be empty.")

        logger.info(f"[CHAT] Received text query: '{request.message}'")
        start_time = time.time()

        # ── Gemini AI Pipeline ─────────────────────────────────────────────
        try:
            ai_result = await run_in_threadpool(
                run_ai_pipeline,
                request.message,
                history=request.history,
                profile=request.profile,
            )
        except Exception as e:
            logger.error(f"Gemini AI pipeline failed: {e}")
            raise HTTPException(status_code=500, detail="AI processing failed. Please try again.")

        logger.info(f"[CHAT] Total text query processing time: {time.time() - start_time:.2f}s")

        return ChatResponse(
            status="success",
            user_message=request.message,
            ai_response=ai_result.get("response", ""),
            detected_language=ai_result.get("language_name", "English"),
            detected_language_code=ai_result.get("language_code", "en"),
            detected_language_bcp47=ai_result.get("bcp47_code", "en-IN")
        )
    except HTTPException:
        raise
    except (BrokenPipeError, ConnectionError, ClientDisconnect, asyncio.CancelledError) as e:
        logger.warning(f"Client disconnected during text chat ({type(e).__name__}); response discarded.")
        return None
    except Exception as e:
        logger.error(f"Error handling text query: {e}")
        raise HTTPException(status_code=500, detail=f"Internal chat processing error: {str(e)}")


# Voice Chat File Upload Endpoint
@app.post("/voice-chat", response_model=VoiceChatResponse, tags=["Voice"])
async def voice_chat(
    file: UploadFile = File(...),
    speaker: Optional[str] = Form("shubh")
) -> Optional[VoiceChatResponse]:
    """
    Audio file voice query endpoint.
    Upload an audio file (.wav, .mp3, .m4a), transcribes via Sarvam STT (saaras:v3),
    processes query via Gemini AI Pipeline, and returns text & Sarvam TTS audio (bulbul:v3).
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

        filename = file.filename or "recording.wav"
        logger.info(f"[VOICE] Processing uploaded audio file '{filename}' ({len(audio_bytes)} bytes)")
        start_time = time.time()

        # 1. Sarvam Speech to Text
        transcribed_text = speech_to_text(audio_bytes, filename=filename)
        logger.info(f"[VOICE] Transcribed text in {time.time() - start_time:.2f}s: '{transcribed_text}'")

        # 2. Gemini AI Reasoning Pipeline (includes language detection)
        try:
            ai_result = await run_in_threadpool(
                run_ai_pipeline, 
                transcribed_text
            )
        except Exception as e:
            logger.error(f"Gemini AI pipeline failed: {e}")
            raise HTTPException(status_code=500, detail="AI processing failed. Please try again.")
            
        ai_reply = ai_result.get("response", "")
        logger.info(f"AI response: '{ai_reply}'")

        # 3. Text to Speech (Edge → Google → Sarvam fallback)
        tts_lang = ai_result.get("bcp47_code", "hi-IN")
        audio_b64, _mime, _voice = await run_in_threadpool(
            synthesise_speech,
            text=ai_reply,
            language_code=tts_lang,
        )
        
        logger.info(f"[VOICE] Total voice query processing time: {time.time() - start_time:.2f}s")

        return VoiceChatResponse(
            status="success",
            transcribed_text=transcribed_text,
            ai_response=ai_reply,
            audio_base64=audio_b64
        )

    except HTTPException:
        raise
    except (BrokenPipeError, ConnectionError, ClientDisconnect, asyncio.CancelledError) as e:
        logger.warning(f"Client disconnected during voice chat ({type(e).__name__}); response discarded.")
        return None
    except Exception as e:
        logger.error(f"Error handling voice query: {e}")
        raise HTTPException(status_code=500, detail=f"Internal voice processing error: {str(e)}")


# Voice Chat Base64 Endpoint
@app.post("/voice-chat-base64", response_model=VoiceChatResponse, tags=["Voice"])
async def voice_chat_base64(request: VoiceBase64Request) -> Optional[VoiceChatResponse]:
    """
    Base64 audio voice query endpoint.
    Accepts Base64 audio string from frontend/mobile client, converts STT -> AI -> TTS,
    and returns transcribed text, AI reply, and base64 audio response.
    """
    try:
        audio_bytes = base64.b64decode(request.audio_base64)
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Invalid audio base64 payload.")

        # 1. STT (blocking I/O — run in threadpool)
        transcribed_text = await run_in_threadpool(speech_to_text, audio_bytes, "audio.wav")

        # 2. AI Reasoning Pipeline
        try:
            ai_result = await run_in_threadpool(
                run_ai_pipeline, 
                transcribed_text
            )
            ai_reply = ai_result.get("response", "")
        except Exception as e:
            logger.error(f"Gemini AI pipeline failed (base64 endpoint): {e}")
            raise HTTPException(status_code=500, detail="AI processing failed. Please try again.")

        # 3. TTS (blocking I/O — run in threadpool)
        audio_b64, _mime, _voice = await run_in_threadpool(
            synthesise_speech,
            text=ai_reply,
            language_code=ai_result.get("bcp47_code", "hi-IN"),
        )

        return VoiceChatResponse(
            status="success",
            transcribed_text=transcribed_text,
            ai_response=ai_reply,
            audio_base64=audio_b64
        )

    except HTTPException:
        raise
    except (BrokenPipeError, ConnectionError, ClientDisconnect, asyncio.CancelledError) as e:
        logger.warning(f"Client disconnected during base64 voice chat ({type(e).__name__}); response discarded.")
        return None
    except Exception as e:
        logger.error(f"Error handling base64 voice query: {e}")
        raise HTTPException(status_code=500, detail=f"Base64 voice processing error: {str(e)}")


# WebSocket Endpoint for Voice/Text Interaction
@app.websocket("/ws/voice")
async def websocket_voice_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice & text assistant interaction.
    Receives JSON messages:
      - Text input: `{"action": "text", "query": "..."}`
      - Voice input: `{"action": "voice", "audio_base64": "..."}`
    Sends back JSON responses:
      `{"status": "success", "transcribed_text": "...", "ai_response": "...", "audio_base64": "..."}`
    """
    await websocket.accept()
    logger.info("Client connected to Saathi WebSocket /ws/voice")

    # WebSocket AI timeout: 25s (generous; WS has no HTTP keepalive pressure)
    WS_AI_TIMEOUT = 25.0

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action", "text")

            if action == "voice":
                raw_b64 = data.get("audio_base64", "")
                if not raw_b64:
                    await websocket.send_json({"status": "error", "message": "Missing audio_base64 payload."})
                    continue

                try:
                    audio_bytes = base64.b64decode(raw_b64)
                    # STT and AI pipeline: run blocking calls in threadpool
                    transcribed = await run_in_threadpool(speech_to_text, audio_bytes)
                    try:
                        ai_result = await run_in_threadpool(
                            run_ai_pipeline, 
                            transcribed
                        )
                        ai_reply = ai_result.get("response", "")
                    except Exception as e:
                        logger.error(f"WebSocket AI pipeline failed: {e}")
                        await websocket.send_json({"status": "error", "message": "AI processing failed. Please try again."})
                        continue
                    tts_audio, _m, _v = await run_in_threadpool(synthesise_speech, ai_reply, ai_result.get("bcp47_code", "hi-IN"))

                    await websocket.send_json({
                        "status": "success",
                        "transcribed_text": transcribed,
                        "ai_response": ai_reply,
                        "audio_base64": tts_audio
                    })
                except Exception as ex:
                    logger.error(f"WebSocket voice action error: {ex}")
                    await websocket.send_json({"status": "error", "message": str(ex)})

            else:  # Text action
                query = data.get("query", "")
                try:
                    ai_result = await run_in_threadpool(
                        run_ai_pipeline, 
                        query
                    )
                    ai_reply = ai_result.get("response", "")
                except Exception as e:
                    logger.error(f"WebSocket AI pipeline failed (text action): {e}")
                    await websocket.send_json({"status": "error", "message": "AI processing failed. Please try again."})
                    continue
                generate_tts = data.get("generate_audio", True)
                tts_audio, _m, _v = (await run_in_threadpool(synthesise_speech, ai_reply, ai_result.get("bcp47_code", "hi-IN"))) if generate_tts else ("", "", "")

                await websocket.send_json({
                    "status": "success",
                    "user_query": query,
                    "ai_response": ai_reply,
                    "audio_base64": tts_audio
                })

    except WebSocketDisconnect:
        logger.info("Client disconnected from Saathi WebSocket.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"\n🚀 Starting Saathi FastAPI Server on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
