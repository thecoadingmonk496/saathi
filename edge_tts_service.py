"""
edge_tts_service.py — Microsoft Edge Neural TTS for Saathi (कृषि मित्र)

Free, high-quality, multilingual TTS using Microsoft Edge's Neural voices.
No API key required — uses the same endpoint as Microsoft Edge browser's
built-in Read Aloud feature.

Voice design:
  - Warm, natural male Indian voices for all supported languages
  - MP3 output (universally supported, small file size)
  - In-memory synthesis — no temp files written to disk
"""

import asyncio
import base64
import io
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ── Voice map — verified against edge_tts.list_voices() ───────────────────
# All voices confirmed available as of 2026-08-24.
# Male voices selected for consistency with Saathi's mature male persona.
EDGE_VOICE_MAP: dict[str, str] = {
    # Hindi
    "hi":    "hi-IN-MadhurNeural",
    "hi-IN": "hi-IN-MadhurNeural",
    "hi-Latn": "en-IN-PrabhatNeural",
    "hi-Latn-IN": "en-IN-PrabhatNeural",
    # English (Indian accent for natural fit)
    "en":    "en-IN-PrabhatNeural",
    "en-IN": "en-IN-PrabhatNeural",
    "en-US": "en-US-GuyNeural",
    # Bengali
    "bn":    "bn-IN-BashkarNeural",
    "bn-IN": "bn-IN-BashkarNeural",
    # Gujarati
    "gu":    "gu-IN-NiranjanNeural",
    "gu-IN": "gu-IN-NiranjanNeural",
    # Marathi
    "mr":    "mr-IN-ManoharNeural",
    "mr-IN": "mr-IN-ManoharNeural",
    # Tamil
    "ta":    "ta-IN-ValluvarNeural",
    "ta-IN": "ta-IN-ValluvarNeural",
    # Telugu
    "te":    "te-IN-MohanNeural",
    "te-IN": "te-IN-MohanNeural",
    # Kannada
    "kn":    "kn-IN-GaganNeural",
    "kn-IN": "kn-IN-GaganNeural",
    # Malayalam
    "ml":    "ml-IN-MidhunNeural",
    "ml-IN": "ml-IN-MidhunNeural",
    # Urdu
    "ur":    "ur-IN-SalmanNeural",
    "ur-IN": "ur-IN-SalmanNeural",
    # Punjabi — no pa-IN voice available; fall back to Hindi (closest)
    "pa":    "hi-IN-MadhurNeural",
    "pa-IN": "hi-IN-MadhurNeural",
    # Odia — no or-IN voice available; fall back to Hindi
    "or":    "hi-IN-MadhurNeural",
    "or-IN": "hi-IN-MadhurNeural",
    # Assamese — no as-IN voice available; fall back to Bengali (closest)
    "as":    "bn-IN-BashkarNeural",
    "as-IN": "bn-IN-BashkarNeural",
}

# Default voice when language code is unrecognised
DEFAULT_EDGE_VOICE = "hi-IN-MadhurNeural"

# Configurable defaults from .env
_DEFAULT_VOICE_OVERRIDE = os.getenv("DEFAULT_TTS_VOICE", "")


def _normalise_lang(lang_code: str) -> str:
    """
    Normalise a language code to find the best matching voice.
    Tries exact match first, then base language (e.g. 'hi-IN' → 'hi').
    """
    code = lang_code.strip()
    if code in EDGE_VOICE_MAP:
        return code
    # Try base language (before the hyphen)
    base = code.split("-")[0].lower()
    if base in EDGE_VOICE_MAP:
        return base
    return ""


def get_edge_voice(language_code: str) -> str:
    """
    Select the best Edge TTS voice for a given language code.
    Returns the voice ShortName string.
    """
    if _DEFAULT_VOICE_OVERRIDE:
        return _DEFAULT_VOICE_OVERRIDE

    normalised = _normalise_lang(language_code)
    voice = EDGE_VOICE_MAP.get(normalised, DEFAULT_EDGE_VOICE)
    return voice


async def text_to_speech_edge(
    text: str,
    language_code: str = "hi-IN",
) -> tuple[str, str, str]:
    """
    Synthesise text to MP3 audio using Microsoft Edge Neural TTS.

    Args:
        text:          Plain text to speak.
        language_code: BCP-47 or ISO 639-1 language code.

    Returns:
        (base64_audio, mime_type, voice_name)
        Returns ("", "", "") on failure.
    """
    if not text or not text.strip():
        logger.warning("[EdgeTTS] Empty text — skipping synthesis.")
        return "", "", ""

    voice = get_edge_voice(language_code)
    logger.info(f"[EdgeTTS] Synthesising: lang={language_code} voice={voice} text_len={len(text)}")

    try:
        import edge_tts

        communicate = edge_tts.Communicate(text, voice)
        buf = io.BytesIO()

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])

        audio_bytes = buf.getvalue()

        if not audio_bytes or len(audio_bytes) == 0:
            logger.error("[EdgeTTS] Synthesis returned empty audio bytes.")
            return "", "", ""

        logger.info(f"[EdgeTTS] Generated {len(audio_bytes):,} bytes of MP3 audio with voice={voice}")

        b64 = base64.b64encode(audio_bytes).decode("utf-8")
        return b64, "audio/mpeg", voice

    except ImportError:
        logger.error("[EdgeTTS] edge-tts package is not installed. Run: pip install edge-tts")
        return "", "", ""
    except Exception as exc:
        logger.error(f"[EdgeTTS] Synthesis failed: {type(exc).__name__}: {exc}")
        return "", "", ""


def text_to_speech_edge_sync(
    text: str,
    language_code: str = "hi-IN",
) -> tuple[str, str, str]:
    """
    Synchronous wrapper around the async Edge TTS function.
    Safe to call from sync code (e.g. run_in_threadpool).
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're inside an async context (FastAPI) — create a new loop in a thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(
                    asyncio.run,
                    text_to_speech_edge(text, language_code)
                )
                return future.result(timeout=30)
        else:
            return loop.run_until_complete(text_to_speech_edge(text, language_code))
    except RuntimeError:
        # No event loop exists — just create one
        return asyncio.run(text_to_speech_edge(text, language_code))


# ── Self-test ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    print("\n" + "=" * 60)
    print("🎙️  Testing Microsoft Edge Neural TTS for Saathi...")
    print("=" * 60)

    test_cases = [
        ("hi-IN", "नमस्ते किसान भाई! आज गेहूं का मंडी भाव 2450 रुपये प्रति क्विंटल है।"),
        ("en-IN", "Hello farmer brother. Today wheat price is 2450 rupees per quintal."),
        ("bn-IN", "নমস্কার কৃষক ভাই! আজ গমের বাজার দর প্রতি কুইন্টাল ২৪৫০ টাকা।"),
        ("ta-IN", "வணக்கம்! இன்று கோதுமை விலை குவிண்டால் ₹2450."),
    ]

    for lang, sample in test_cases:
        print(f"\n📝 [{lang}] {sample[:60]}...")
        b64, mime, voice = asyncio.run(text_to_speech_edge(sample, lang))
        if b64:
            raw = base64.b64decode(b64)
            out_file = f"test_edge_{lang.replace('-', '_')}.mp3"
            with open(out_file, "wb") as f:
                f.write(raw)
            print(f"✅ OK — {len(raw):,} bytes, voice={voice} → {out_file}")
        else:
            print("❌ FAILED", file=sys.stderr)

    print("\n" + "=" * 60 + "\n")
