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
    "mai": ("Maithili",  "mai-IN"),
    "doi": ("Dogri",     "doi-IN"),
    "kok": ("Konkani",   "kok-IN"),
    "mni": ("Manipuri",  "mni-IN"),
    "sat": ("Santali",   "sat-IN"),
    "brx": ("Bodo",      "brx-IN"),
    "en":  ("English",   "en-IN"),
}

_MIN_CONFIDENCE = 0.40


import os
import re
from pydantic import BaseModel, Field

ENGLISH_LOANWORDS = {
    'what', 'is', 'are', 'was', 'were', 'has', 'have', 'had',
    'price', 'rate', 'cost', 'market', 'today', 'tomorrow',
    'wheat', 'rice', 'maize', 'corn', 'tomato', 'onion', 'potato',
    'crop', 'soil', 'water', 'rain', 'sun', 'weather', 'climate',
    'fertilizer', 'pesticide', 'insecticide', 'herbicide',
    'irrigation', 'harvest', 'sowing', 'planting', 'growing',
    'disease', 'pest', 'weed', 'yield', 'profit', 'loss',
    'government', 'scheme', 'subsidy', 'loan', 'insurance',
    'mandi', 'auction', 'trader', 'buyer', 'seller',
    'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'and'
}

DEVANAGARI_ENGLISH_LOANWORDS = {
    'व्हाट', 'इस', 'द', 'प्राइस', 'ऑफ़', 'वीट', 'राइस', 'रेट', 'मार्केट', 'टुडे', 
    'टुमारो', 'क्रॉप', 'वाटर', 'रेन', 'वेदर', 'मंडी', 'गवर्नमेंट', 'स्कीम', 'लोन', 'सब्सिडी',
    'सीड', 'फर्टिलाइजर', 'पेस्टिसाइड', 'यील्ड', 'प्रॉफिट', 'लॉस', 'सॉइल', 'क्लाइमेट'
}

DEVANAGARI_TO_LATIN = {
    'क':'ka','ख':'kha','ग':'ga','घ':'gha','ङ':'nga',
    'च':'ca','छ':'cha','ज':'ja','झ':'jha','ञ':'nya',
    'ट':'ta','ठ':'tha','ड':'da','ढ':'dha','ण':'na',
    'त':'ta','थ':'tha','द':'da','ध':'dha','न':'na',
    'प':'pa','फ':'pha','ब':'ba','भ':'bha','म':'ma',
    'य':'ya','र':'ra','ल':'la','व':'va','श':'sa',
    'ष':'sa','स':'sa','ह':'ha',
    'अ':'a','आ':'a','इ':'i','ई':'i','उ':'u','ऊ':'u',
    'ए':'e','ऐ':'ai','ओ':'o','औ':'au',
    'ं':'n','ः':'h','्':''
}

def detect_script(text: str) -> str:
    """
    Return: 'devanagari', 'tamil', 'telugu', 'latin', 'unknown'
    """
    for char in text:
        if '\u0900' <= char <= '\u097F':
            return 'devanagari'
        if '\u0B80' <= char <= '\u0BFF':
            return 'tamil'
        if '\u0C00' <= char <= '\u0C7F':
            return 'telugu'
        if '\u0000' <= char <= '\u007F' and char.isalpha():
            return 'latin'
    return 'unknown'

def is_likely_english_transliteration(word: str) -> bool:
    """Check if the Devanagari word is a known English transliteration."""
    if word in DEVANAGARI_ENGLISH_LOANWORDS:
        return True
    
    # Fallback to simple Latin conversion
    latin = ''
    for char in word:
        if char in DEVANAGARI_TO_LATIN:
            latin += DEVANAGARI_TO_LATIN[char]
        else:
            latin += char
    return latin in ENGLISH_LOANWORDS

def calculate_english_loanword_ratio(text: str) -> float:
    """Return ratio of words that are likely English loanwords."""
    # Extract words (alphanumeric sequences) ignoring punctuation
    words = re.findall(r'\w+', text.lower())
    if not words:
        return 0.0
    
    english_count = 0
    for word in words:
        # Direct match in loanword set (if Latin script)
        if word in ENGLISH_LOANWORDS:
            english_count += 1
        # Also check if the word (in Devanagari) transliterates to a known English word
        elif is_likely_english_transliteration(word):
            english_count += 1
    return english_count / len(words)

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
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest", api_key=api_key)
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

    script = detect_script(text)
    
    # 0. Transliterated English Check
    if script == 'devanagari':
        ratio = calculate_english_loanword_ratio(text)
        if ratio >= 0.6:
            return {
                'language_name': 'English',
                'language_code': 'en',
                'bcp47_code': 'en-IN',
                'confidence': 0.85,
                'is_supported': True,
                'source': 'transliterated_english'
            }

    # 1. Gemini LLM (primary) for handling Romanized and mixed language robustly
    try:
        from langchain_core.messages import HumanMessage
        detector = _get_llm_detector()
        prompt = f"""Analyze the language of the following text: "{text}"
If it contains a mix of English and an Indian language, identify the overall dominant language of the sentence based on its grammar and syntax.
If the text consists primarily of English words written in an Indian script (e.g. 'व्हाट इस द प्राइस ऑफ़ वीट' or equivalent in Tamil/Telugu/etc.), identify it as English ('en').
If it is Romanized Hindi (e.g. 'gehun ka rate kya hai'), identify it as Hindi.
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
