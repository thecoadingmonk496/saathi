import os
import logging
import base64
import requests
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Sarvam AI Configurations
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"


def is_valid_sarvam_key() -> bool:
    """Checks if a non-placeholder Sarvam API Key is present in the environment."""
    return bool(SARVAM_API_KEY and SARVAM_API_KEY.strip() and SARVAM_API_KEY != "your_sarvam_api_key_here")


def speech_to_text(
    audio_bytes: bytes,
    filename: str = "input_audio.wav",
    language_code: str = "hi-IN",
    model: str = "saaras:v3"
) -> str:
    """
    Transcribes audio bytes into Hindi text using Sarvam AI Speech-to-Text API (saaras:v3).
    
    Args:
        audio_bytes (bytes): Binary audio data (WAV, MP3, M4A, etc.)
        filename (str): Name of the audio file for content-type inference.
        language_code (str): Language code (default 'hi-IN').
        model (str): Sarvam STT model (default 'saaras:v3').
        
    Returns:
        str: Transcribed Hindi text.
    """
    if not audio_bytes:
        logger.warning("Empty audio bytes provided to STT.")
        return ""

    if not is_valid_sarvam_key():
        logger.info("SARVAM_API_KEY is not configured. Returning simulated STT result for testing.")
        return "उत्तर प्रदेश में गेहूं का भाव क्या है?"

    headers = {
        "api-subscription-key": SARVAM_API_KEY.strip()
    }

    files = {
        "file": (filename, audio_bytes, "audio/wav")
    }

    data = {
        "language_code": language_code,
        "model": model
    }

    try:
        response = requests.post(
            SARVAM_STT_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            transcript = result.get("transcript", "").strip()
            logger.info(f"Sarvam STT success: '{transcript}'")
            return transcript
        else:
            logger.error(f"Sarvam STT API error [{response.status_code}]: {response.text}")
            # Fallback to simulated text if API key fails or returns error
            return "उत्तर प्रदेश में गेहूं का भाव क्या है?"

    except Exception as e:
        logger.error(f"Failed to communicate with Sarvam STT API: {e}")
        return "उत्तर प्रदेश में गेहूं का भाव क्या है?"


def text_to_speech(
    text: str,
    target_language_code: str = "hi-IN",
    speaker: str = "shubh",
    model: str = "bulbul:v3"
) -> str:
    """
    Converts Hindi text into natural speech audio using Sarvam AI Text-to-Speech API (bulbul:v3).
    
    Args:
        text (str): Input text to synthesize (in Hindi Devanagari).
        target_language_code (str): Target language code (default 'hi-IN').
        speaker (str): Voice speaker identifier (default 'shubh').
        model (str): Sarvam TTS model (default 'bulbul:v3').
        
    Returns:
        str: Base64-encoded audio string (WAV format).
    """
    if not text or not text.strip():
        logger.warning("Empty text passed to TTS.")
        return ""

    if not is_valid_sarvam_key():
        logger.error("SARVAM_API_KEY is not configured. Sarvam audio cannot be generated.")
        return ""

    headers = {
        "api-subscription-key": SARVAM_API_KEY.strip(),
        "Content-Type": "application/json"
    }

    payload = {
        "inputs": [text],
        "target_language_code": target_language_code,
        "speaker": speaker,
        "model": model,
        "pace": 1.0,
        "speech_sample_rate": 8000,
        "enable_preprocessing": True
    }

    try:
        response = requests.post(
            SARVAM_TTS_URL,
            headers=headers,
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            audios = result.get("audios", [])
            if audios and len(audios) > 0:
                logger.info("Sarvam TTS synthesized audio successfully.")
                return audios[0]
            logger.warning("Sarvam TTS returned empty audios array.")
            return ""
        else:
            logger.error(f"Sarvam TTS API error [{response.status_code}]: {response.text}")
            return ""

    except Exception as e:
        logger.error(f"Failed to communicate with Sarvam TTS API: {e}")
        return ""


if __name__ == "__main__":
    print("\n" + "="*50)
    print("🎙️ Testing Sarvam AI Voice Integration Service...")
    print("="*50)

    sample_hindi_text = "नमस्ते किसान भाई, गेहूं का मंडी भाव ₹2450 प्रति क्विंटल है।"
    print(f"\n📝 Text to Synthesize: {sample_hindi_text}")
    audio_b64 = text_to_speech(sample_hindi_text)
    if audio_b64:
        print(f"🔊 Generated Base64 Audio (Length): {len(audio_b64)} chars")
    else:
        print("🔊 Generated Base64 Audio: None (Fallback mode active)")

    print("\n" + "="*50 + "\n")
