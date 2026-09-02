"""
google_tts_service.py — Google Cloud Neural Text-to-Speech for Saathi (कृषि मित्र)

Voice design goals:
  - Warm, conversational, empathetic — suitable for Indian farmers
  - Mature Indian male voice using Neural2 voices
  - Moderate speaking rate (0.90) — clear and unhurried
  - Slightly lower pitch (-2.0 semitones) — mature, trustworthy tone
  - SSML-enhanced output for natural intonation and emphasis

Voice selection per language:
  hi-IN  → hi-IN-Neural2-B  (deep, mature Hindi male)
  en-IN  → en-IN-Neural2-C  (natural Indian-English male)
  Fallback → hi-IN-Neural2-B

Audio format: MP3 (LINEAR16 for guaranteed compatibility is available as fallback)
"""

import os
import logging
import base64
from typing import Optional

logger = logging.getLogger(__name__)

# ── Google Cloud credential discovery ──────────────────────────────────────
# If GOOGLE_APPLICATION_CREDENTIALS env var is set, the SDK picks it up
# automatically. Alternatively, a JSON key string in GOOGLE_TTS_CREDENTIALS_JSON
# is written to a temp file and the env var is pointed at it.
_GOOGLE_CREDS_JSON = os.getenv("GOOGLE_TTS_CREDENTIALS_JSON", "")
if _GOOGLE_CREDS_JSON and not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
    import tempfile, json as _json
    try:
        _tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
        _tmp.write(_GOOGLE_CREDS_JSON)
        _tmp.close()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _tmp.name
        logger.info("[GoogleTTS] Wrote credentials from GOOGLE_TTS_CREDENTIALS_JSON env var.")
    except Exception as _e:
        logger.warning(f"[GoogleTTS] Could not write credentials JSON: {_e}")

# ── Voice map — Neural2 voices give the best natural prosody ───────────────
# Full list: https://cloud.google.com/text-to-speech/docs/voices
VOICE_MAP = {
    "hi-IN": {
        "language_code": "hi-IN",
        "name": "hi-IN-Neural2-B",   # Deep, warm, mature Hindi male
        "ssml_gender": "MALE",
    },
    "hi": {
        "language_code": "hi-IN",
        "name": "hi-IN-Neural2-B",
        "ssml_gender": "MALE",
    },
    "en-IN": {
        "language_code": "en-IN",
        "name": "en-IN-Neural2-C",   # Natural Indian-English male
        "ssml_gender": "MALE",
    },
    "en": {
        "language_code": "en-IN",
        "name": "en-IN-Neural2-C",
        "ssml_gender": "MALE",
    },
    "en-US": {
        "language_code": "en-IN",
        "name": "en-IN-Neural2-C",
        "ssml_gender": "MALE",
    },
}

# Default voice when the language code is unrecognised
_DEFAULT_VOICE = VOICE_MAP["hi-IN"]

# ── Audio / prosody settings ───────────────────────────────────────────────
SPEAKING_RATE = 0.90   # Moderate — clear and unhurried (range: 0.25–4.0)
PITCH_SEMITONES = -2.0 # Slightly lower — mature, trustworthy (range: -20–20 st)
VOLUME_GAIN_DB = 2.0   # Mild boost so the voice is clearly audible (range: -96–16 dB)
AUDIO_ENCODING = "MP3" # MP3 is universally supported and small


def is_google_tts_available() -> bool:
    """Returns True if the google-cloud-texttospeech library is importable."""
    try:
        from google.cloud import texttospeech  # noqa: F401
        return True
    except ImportError:
        return False


def _build_ssml(text: str) -> str:
    """
    Wrap plain text in SSML to add natural prosody, breathing pauses,
    and emphasis appropriate for a conversational farming assistant.

    Rules applied (ORDER MATTERS — numbers wrapped first, breaks added after):
      1. XML-escape user text
      2. Wrap 3+ digit numbers in <say-as interpret-as="cardinal"> for natural Indian reading
      3. Add 350ms breathing pauses after sentence terminators (।  !  ?  .)
      4. Wrap everything in <prosody> for rate/pitch/volume control
    """
    import re

    # Step 1: Escape XML special chars (user text is untrusted)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    # Step 2: Wrap standalone 3+ digit numbers BEFORE inserting any SSML tags.
    # This prevents break-time values like "350" from being wrapped later.
    text = re.sub(
        r'\b(\d{3,})\b',
        r'<say-as interpret-as="cardinal">\1</say-as>',
        text
    )

    # Step 3: Add a short breathing pause after Hindi / English sentence terminators.
    # We match the terminators and any trailing whitespace, then insert the break.
    text = re.sub(r'([।!?\.]+)\s*', r'\1<break time="350ms"/> ', text)

    ssml = (
        '<speak>'
        f'<prosody rate="{SPEAKING_RATE}" pitch="{PITCH_SEMITONES:+.1f}st" '
        f'volume="+{VOLUME_GAIN_DB:.1f}dB">'
        f'{text}'
        '</prosody>'
        '</speak>'
    )
    return ssml


def text_to_speech_google(
    text: str,
    language_code: str = "hi-IN",
) -> bytes:
    """
    Synthesise *text* to MP3 audio bytes using Google Cloud Neural2 TTS.

    Args:
        text:          Plain text (Hindi / English / Hinglish).
        language_code: BCP-47 code (e.g. 'hi-IN', 'en-IN').  Maps to a
                       Neural2 voice automatically.

    Returns:
        Raw MP3 bytes (non-empty on success) or empty bytes on failure.

    Raises:
        ImportError if google-cloud-texttospeech is not installed.
    """
    if not text or not text.strip():
        logger.warning("[GoogleTTS] Empty text — skipping synthesis.")
        return b""

    from google.cloud import texttospeech  # type: ignore

    voice_cfg = VOICE_MAP.get(language_code) or _DEFAULT_VOICE
    logger.info(
        f"[GoogleTTS] Synthesising with voice={voice_cfg['name']} "
        f"lang={language_code} rate={SPEAKING_RATE} pitch={PITCH_SEMITONES:+.1f}st"
    )

    client = texttospeech.TextToSpeechClient()

    ssml_text = _build_ssml(text)

    synthesis_input = texttospeech.SynthesisInput(ssml=ssml_text)

    voice = texttospeech.VoiceSelectionParams(
        language_code=voice_cfg["language_code"],
        name=voice_cfg["name"],
        ssml_gender=getattr(texttospeech.SsmlVoiceGender, voice_cfg["ssml_gender"]),
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=getattr(texttospeech.AudioEncoding, AUDIO_ENCODING),
        speaking_rate=SPEAKING_RATE,
        pitch=PITCH_SEMITONES,
        volume_gain_db=VOLUME_GAIN_DB,
        # Effects profile: telephony + headphone for warmth/clarity
        effects_profile_id=["telephony-class-application"],
    )

    try:
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
    except Exception as exc:
        logger.error(f"[GoogleTTS] API call failed: {exc}")
        return b""

    audio_bytes: bytes = response.audio_content
    if not audio_bytes:
        logger.warning("[GoogleTTS] API returned empty audio content.")
        return b""

    logger.info(f"[GoogleTTS] Synthesised {len(audio_bytes):,} bytes of MP3 audio.")
    return audio_bytes


def text_to_speech_google_base64(
    text: str,
    language_code: str = "hi-IN",
) -> tuple[str, str]:
    """
    Convenience wrapper that returns (base64_string, mime_type).

    Returns:
        ("", "")  on failure — caller should fall back to Sarvam TTS.
        (b64_str, "audio/mpeg") on success.
    """
    raw = text_to_speech_google(text, language_code)
    if not raw:
        return "", ""
    return base64.b64encode(raw).decode("utf-8"), "audio/mpeg"


# ── Self-test ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    print("\n" + "=" * 60)
    print("🎙️  Testing Google Cloud Neural TTS for Saathi...")
    print("=" * 60)

    sample_hi = "नमस्ते किसान भाई! आज गेहूं का मंडी भाव ₹2450 प्रति क्विंटल है।"
    sample_en = "Hello farmer brother. Today wheat price is 2450 rupees per quintal."

    for lang, sample in [("hi-IN", sample_hi), ("en-IN", sample_en)]:
        print(f"\n📝 [{lang}] {sample}")
        b64, mime = text_to_speech_google_base64(sample, lang)
        if b64:
            raw = base64.b64decode(b64)
            out_file = f"test_google_tts_{lang.replace('-', '_')}.mp3"
            with open(out_file, "wb") as f:
                f.write(raw)
            print(f"✅ OK — {len(raw):,} bytes → saved to {out_file}")
        else:
            print(f"❌ FAILED — check GOOGLE_APPLICATION_CREDENTIALS env var", file=sys.stderr)

    print("\n" + "=" * 60 + "\n")
