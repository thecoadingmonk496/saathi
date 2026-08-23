"""
language_utils.py — Language Detection for Saathi AI
=====================================================
Uses fasttext-langdetect (lid.176.bin model) as the primary detector
with langdetect as a fallback. Supports all 22 official Indian languages
plus English, returning a structured dict for use in the /chat endpoint.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Language mapping: ISO 639-1 code → (human-readable name, BCP-47 code)
# Covers all 22 scheduled Indian languages + English.
# ---------------------------------------------------------------------------
_LANG_MAP: dict = {
    "hi":  ("Hindi",     "hi-IN"),
    "ta":  ("Tamil",     "ta-IN"),
    "te":  ("Telugu",    "te-IN"),
    "bn":  ("Bengali",   "bn-IN"),
    "mr":  ("Marathi",   "mr-IN"),
    "gu":  ("Gujarati",  "gu-IN"),
    "kn":  ("Kannada",   "kn-IN"),
    "ml":  ("Malayalam", "ml-IN"),
    "pa":  ("Punjabi",   "pa-IN"),
    "or":  ("Odia",      "or-IN"),
    "as":  ("Assamese",  "as-IN"),
    "ur":  ("Urdu",      "ur-IN"),
    "sa":  ("Sanskrit",  "sa-IN"),
    "sd":  ("Sindhi",    "sd-IN"),
    "ks":  ("Kashmiri",  "ks-IN"),
    "ne":  ("Nepali",    "ne-IN"),
    "bh":  ("Bhojpuri",  "hi-IN"),
    "mai": ("Maithili",  "hi-IN"),
    "doi": ("Dogri",     "hi-IN"),
    "kok": ("Konkani",   "kok-IN"),
    "mni": ("Manipuri",  "mni-IN"),
    "sat": ("Santali",   "sat-IN"),
    "bo":  ("Bodo",      "hi-IN"),
    "en":  ("English",   "en-IN"),
}

_MIN_CONFIDENCE = 0.40


import os
from pydantic import BaseModel, Field

# Lazy initialization of LLM to avoid import errors if not needed
_llm_detector = None

class LanguageDetectionResult(BaseModel):
    language_code: str = Field(description="ISO 639-1 code (e.g., 'hi', 'en', 'ta')")
    language_name: str = Field(description="Full language name (e.g., 'Hindi', 'English', 'Tamil')")

def _get_llm_detector():
    global _llm_detector
    if _llm_detector is None:
        from langchain_google_genai import ChatGoogleGenerativeAI
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite", api_key=api_key)
        _llm_detector = llm.with_structured_output(LanguageDetectionResult)
    return _llm_detector

def detect_language(text: str) -> dict:
    """
    Detect the language of *text* and return:
        language_name  : str   e.g. "Hindi"
        language_code  : str   ISO 639-1 e.g. "hi"
        bcp47_code     : str   BCP-47 e.g. "hi-IN"
        confidence     : float 0.0-1.0
        is_supported   : bool  True if in supported language list
        source         : str   "gemini" | "fasttext" | "langdetect" | "fallback"
    """
    text = text.strip()
    if not text:
        return _make_result("en", 0.0, "fallback")

    # 1. Gemini LLM (primary) for handling Romanized and mixed language robustly
    try:
        from langchain_core.messages import HumanMessage
        detector = _get_llm_detector()
        prompt = f"""Analyze the language of the following text: "{text}"
If it contains a mix of English and an Indian language (including transliterated/Romanized script like 'gehun ka rate kya hai'), identify the dominant Indian language.
Respond ONLY with the ISO 639-1 language_code and the language_name.
"""
        res = detector.invoke([HumanMessage(content=prompt)])
        if res and res.language_code:
            code = res.language_code.lower()
            logger.debug(f"gemini detected: '{code}' for text '{text[:20]}...'")
            return _make_result(code, 0.99, "gemini")
    except Exception as exc:
        logger.warning(f"gemini language detection failed: {exc}")

    # 2. fasttext-langdetect (fallback)
    try:
        from ftlangdetect import detect as ft_detect
        result = ft_detect(text, low_memory=True)
        code = result.get("lang", "en")
        score = float(result.get("score", 0.0))
        if score >= _MIN_CONFIDENCE:
            logger.debug(f"fasttext: '{code}' score={score:.2f}")
            return _make_result(code, score, "fasttext")
        logger.debug(f"fasttext low confidence ({score:.2f}), trying langdetect…")
    except Exception as exc:
        logger.warning(f"fasttext failed: {exc}")

    # 3. langdetect (fallback)
    try:
        from langdetect import detect_langs, DetectorFactory
        DetectorFactory.seed = 42
        langs = detect_langs(text)
        if langs:
            top = langs[0]
            logger.debug(f"langdetect: '{top.lang}' prob={top.prob:.2f}")
            return _make_result(top.lang, float(top.prob), "langdetect")
    except Exception as exc:
        logger.warning(f"langdetect failed: {exc}")

    # 4. Hard fallback → English
    return _make_result("en", 0.0, "fallback")


def _make_result(code: str, confidence: float, source: str) -> dict:
    base_code = code.split("-")[0].lower()
    if base_code in _LANG_MAP:
        name, bcp47 = _LANG_MAP[base_code]
        supported = True
    else:
        logger.info(f"Language '{base_code}' not supported — defaulting to English.")
        name, bcp47 = _LANG_MAP["en"]
        base_code = "en"
        supported = False
    return {
        "language_name": name,
        "language_code": base_code,
        "bcp47_code":    bcp47,
        "confidence":    round(confidence, 4),
        "is_supported":  supported,
        "source":        source,
    }


if __name__ == "__main__":
    samples = [
        "गेहूँ का भाव क्या है?",
        "What is the price of rice in Punjab?",
        "நெல் விலை என்ன?",
        "ধান চাষে কী সার ব্যবহার করবো?",
        "ಭತ್ತದ ಬೆಲೆ ಎಷ್ಟು?",
        "Bonjour, comment ça va?",
    ]
    for s in samples:
        r = detect_language(s)
        print(f"  [{r['source']}] {r['language_name']} ({r['language_code']}) "
              f"conf={r['confidence']:.2f} supported={r['is_supported']}")
