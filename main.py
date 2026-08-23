import os
import logging
import base64
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
from sarvam_service import speech_to_text, text_to_speech, is_valid_sarvam_key

# Configure logging
logging.basicConfig(level=logging.INFO)
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
    allow_origins=["*"],  # Adjust in production as needed
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
    language: Optional[str] = Field(default="hi-IN", description="BCP-47 language code (e.g., hi-IN, ta-IN, te-IN, bn-IN, en-IN).")
    generate_audio: bool = Field(default=True, description="Set True to generate Sarvam TTS audio.")
    speaker: Optional[str] = Field(default="shubh", description="Sarvam TTS speaker voice ID.")
    history: list[dict] = Field(default_factory=list, description="List of previous conversation turns [{'role': 'user'|'assistant', 'content': '...'}]")
    profile: dict = Field(default_factory=dict, description="Farmer profile metadata {'state': '...', 'district': '...', 'soilType': '...', 'crop': '...'}")


class ChatResponse(BaseModel):
    status: str = "success"
    user_message: str
    ai_response: str
    audio_base64: Optional[str] = None


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


# Text Chat Endpoint
@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def text_chat(request: ChatRequest) -> ChatResponse:
    """
    Text-based query endpoint.
    Takes farmer input in Hindi or English text, processes it via Gemini LangChain Agent,
    and optionally synthesizes Sarvam TTS audio response.
    """
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message input cannot be empty.")

        logger.info(f"Received text query: '{request.message}'")

        # Run query through Gemini AI Pipeline (with language preference, history, and profile) in a threadpool
        try:
            ai_reply = await asyncio.wait_for(
                run_in_threadpool(
                    run_ai_pipeline,
                    request.message,
                    request.language or "hi-IN",
                    history=request.history,
                    profile=request.profile
                ),
                timeout=20.0
            )
        except asyncio.TimeoutError:
            logger.error("Gemini AI pipeline timed out after 20 seconds.")
            raise HTTPException(status_code=504, detail="AI processing timed out. Please try again.")

        # Optional TTS audio synthesis
        audio_b64 = None
        if request.generate_audio:
            speaker_id = request.speaker if request.speaker else "shubh"
            audio_b64 = text_to_speech(ai_reply, speaker=speaker_id)

        return ChatResponse(
            status="success",
            user_message=request.message,
            ai_response=ai_reply,
            audio_base64=audio_b64
        )
    except HTTPException:
        raise
    except (BrokenPipeError, ConnectionError, ClientDisconnect, asyncio.CancelledError) as e:
        # Client disconnected before we finished — nothing to send back.
        # Log a warning and return; do NOT raise, as there is no client to
        # receive an error response and raising causes the ugly 499 message
        # to appear in the frontend if any response buffer is flushed.
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
) -> VoiceChatResponse:
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
        logger.info(f"Processing uploaded audio file '{filename}' ({len(audio_bytes)} bytes)")

        # 1. Sarvam Speech to Text
        transcribed_text = speech_to_text(audio_bytes, filename=filename)
        logger.info(f"Transcribed text: '{transcribed_text}'")

        # 2. Gemini AI Reasoning Pipeline
        try:
            ai_reply = await asyncio.wait_for(
                run_in_threadpool(run_ai_pipeline, transcribed_text),
                timeout=20.0
            )
        except asyncio.TimeoutError:
            logger.error("Gemini AI pipeline timed out after 20 seconds.")
            raise HTTPException(status_code=504, detail="AI processing timed out. Please try again.")
        logger.info(f"AI response: '{ai_reply}'")

        # 3. Sarvam Text to Speech
        audio_b64 = text_to_speech(ai_reply, speaker=speaker or "shubh")

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
async def voice_chat_base64(request: VoiceBase64Request) -> VoiceChatResponse:
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

        # 2. AI Reasoning Pipeline — wrapped with timeout to prevent hanging
        try:
            ai_reply = await asyncio.wait_for(
                run_in_threadpool(run_ai_pipeline, transcribed_text),
                timeout=20.0
            )
        except asyncio.TimeoutError:
            logger.error("Gemini AI pipeline timed out after 20 seconds (base64 endpoint).")
            raise HTTPException(status_code=504, detail="AI processing timed out. Please try again.")

        # 3. TTS (blocking I/O — run in threadpool)
        audio_b64 = await run_in_threadpool(text_to_speech, ai_reply, request.speaker or "shubh")

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
                        ai_reply = await asyncio.wait_for(
                            run_in_threadpool(run_ai_pipeline, transcribed),
                            timeout=WS_AI_TIMEOUT
                        )
                    except asyncio.TimeoutError:
                        logger.error(f"WebSocket AI pipeline timed out after {WS_AI_TIMEOUT}s")
                        await websocket.send_json({"status": "error", "message": "AI processing timed out. Please try again."})
                        continue
                    tts_audio = await run_in_threadpool(text_to_speech, ai_reply)

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
                    ai_reply = await asyncio.wait_for(
                        run_in_threadpool(run_ai_pipeline, query),
                        timeout=WS_AI_TIMEOUT
                    )
                except asyncio.TimeoutError:
                    logger.error(f"WebSocket AI pipeline timed out after {WS_AI_TIMEOUT}s (text action)")
                    await websocket.send_json({"status": "error", "message": "AI processing timed out. Please try again."})
                    continue
                generate_tts = data.get("generate_audio", True)
                tts_audio = await run_in_threadpool(text_to_speech, ai_reply) if generate_tts else None

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
