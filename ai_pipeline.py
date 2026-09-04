from __future__ import annotations

import os
import re
import time
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables first
load_dotenv(override=True)

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import google.api_core.exceptions

# ── Monkeypatch google-api-core exception formatting bug ──────────────────────
# Streaming REST errors sometimes return payload as list [{error:...}] which
# causes AttributeError: 'list' has no attribute 'get' inside google-api-core.
_orig_format_http_error = google.api_core.exceptions.format_http_response_error
def _patched_format_http_error(response, method, url, payload=None):
    if isinstance(payload, list) and len(payload) > 0 and isinstance(payload[0], dict):
        payload = payload[0]
    elif isinstance(payload, list):
        payload = {"error": {"message": str(payload)}}
    return _orig_format_http_error(response, method, url, payload=payload)
google.api_core.exceptions.format_http_response_error = _patched_format_http_error

# Configure logging
logger = logging.getLogger(__name__)

# Ensure API key is loaded
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY is missing from environment variables.")

# ---------------------------------------------------------------------------
# MongoDB & Mandi Price Service
# ---------------------------------------------------------------------------
_mongo_client: Optional[MongoClient] = None

def get_mongo_collection():
    """
    Returns the MandiPriceCache collection from MongoDB using MONGO_URI or MONGODB_URI.
    Caches the MongoClient instance for subsequent calls.
    """
    global _mongo_client
    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
    if not mongo_uri:
        logger.warning("[MongoDB] Neither MONGO_URI nor MONGODB_URI configured in environment.")
        return None

    try:
        if _mongo_client is None:
            _mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)

        try:
            db = _mongo_client.get_default_database()
        except Exception:
            db = _mongo_client["saathi"]
        if db is None:
            db = _mongo_client["saathi"]

        # Support default Mongoose pluralized collection name or model name
        col_names = db.list_collection_names()
        if "mandipricecaches" in col_names:
            return db["mandipricecaches"]
        elif "MandiPriceCache" in col_names:
            return db["MandiPriceCache"]
        return db["mandipricecaches"]
    except Exception as e:
        logger.error(f"[MongoDB] Error connecting to MongoDB: {e}")
        return None


CROP_TRANSLATIONS: Dict[str, list[str]] = {
    "Wheat": ["wheat", "gehu", "gehun", "गेहूं", "गेहूँ", "गहू", "ਕਣਕ", "গম", "gadhuma", "கோதுமை", "godhuma"],
    "Paddy": ["paddy", "rice", "chawal", "धान", "चावल", "भात", "तांदूळ", "ਝੋਨਾ", "vari", "அரிசி", "நெல்"],
    "Maize": ["maize", "corn", "makka", "मक्का", "मका", "ਮੱਕੀ", "ਭੁੱਟਾ", "mokkajonna", "சோளம்"],
    "Mustard": ["mustard", "sarson", "rai", "सरसों", "राई", "मोहरी", "ਸਰ੍ਹੋਂ", "ਸਰੀਸ਼ਾ", "aavalu", "கடுகு"],
    "Chickpea": ["chickpea", "gram", "chana", "चना", "हरभरा", "ਛੋਲੇ", "ছোলা", "senagalu", "கொண்டைக் கடலை"],
    "Onion": ["onion", "pyaz", "kanda", "प्याज", "कांदा", "ਪਿਆਜ਼", "পেঁয়াজ", "ullipaya", "வெங்காயம்"],
    "Potato": ["potato", "aalu", "aloo", "आलू", "बटाटा", "ਆਲੂ", "আলু", "bangaladumpa", "உருளைக்கிழங்கு"],
    "Tomato": ["tomato", "tamatar", "टमाटर", "टोमॅटो", "ਟਮਾਟਰ", "টমেটো", "தக்காளி"],
    "Soybean": ["soybean", "soya", "सोयाबीन", "ਸੋਇਆਬੀਨ"],
    "Cotton": ["cotton", "kapas", "कपास", "कापूस", "ਕਪਾਹ", "তুলা", "prathi", "பருத்தி"],
    "Sugarcane": ["sugarcane", "ganna", "गन्ना", "ऊस", "ਗੰਨਾ", "ਆਖ", "cheruku", "கரும்பு"],
}

def get_canonical_crop_name(crop_input: str) -> str:
    cleaned = (crop_input or "").strip().lower()
    for canonical, aliases in CROP_TRANSLATIONS.items():
        if any(alias in cleaned or cleaned in alias for alias in aliases):
            return canonical
    return crop_input.strip().capitalize()


KNOWN_LOCATIONS = [
    'gorakhpur', 'lucknow', 'prayagraj', 'varanasi', 'kanpur', 'agra', 'meerut',
    'punjab', 'amritsar', 'ludhiana', 'patiala', 'jalandhar',
    'tamil nadu', 'chennai', 'coimbatore', 'madurai',
    'karnataka', 'bangalore', 'mysore', 'hubli',
    'maharashtra', 'mumbai', 'pune', 'nagpur', 'nashik',
    'gujarat', 'ahmedabad', 'surat', 'vadodara', 'rajkot',
    'haryana', 'gurugram', 'faridabad', 'panipat',
    'madhya pradesh', 'bhopal', 'indore', 'gwalior', 'jabalpur',
    'rajasthan', 'jaipur', 'jodhpur', 'udaipur', 'kota',
    'bihar', 'patna', 'gaya', 'muzaffarpur',
    'west bengal', 'kolkata', 'howrah', 'darjeeling',
    'uttar pradesh', 'andhra pradesh', 'telangana', 'hyderabad'
]

def extract_location_from_message(message: str) -> Optional[str]:
    """Extract location mentioned in user message."""
    msg_lower = (message or "").lower()
    for loc in KNOWN_LOCATIONS:
        if loc in msg_lower:
            return loc
    return None

KNOWN_CROP_ALIASES: list[str] = [
    "wheat", "gehu", "gehun", "गेहूं", "गेहूँ", "गहू", "கோதுமை", "godhuma",
    "paddy", "rice", "chawal", "धान", "चावल", "भात", "तांदूळ", "ਝੋਨਾ", "vari", "அரிசி", "நெல்",
    "maize", "corn", "makka", "मक्का", "मका", "ਮੱਕੀ", "ਭੁੱਟਾ", "mokkajonna", "சோளம்",
    "mustard", "sarson", "rai", "सरसों", "राई", "मोहरी", "ਸਰ੍ਹੋਂ", "ਸਰੀਸ਼ਾ", "aavalu", "கடுகு",
    "chickpea", "gram", "chana", "चना", "हरभरा", "ਛੋਲੇ", "ছোলা", "senagalu", "கொண்டைக் கடலை",
    "onion", "pyaz", "kanda", "प्याज", "कांदा", "ਪਿਆਜ਼", "পেঁয়াজ", "ullipaya", "வெங்காயம்",
    "potato", "aalu", "aloo", "आलू", "बटाटा", "ਆਲੂ", "আলু", "bangaladumpa", "உருளைக்கிழங்கு",
    "tomato", "tamatar", "टमाटर", "टोमॅटो", "ਟਮਾਟਰ", "টমেটো", "தக்காளி",
    "soybean", "soya", "सोयाबीन", "ਸੋਇਆਬੀਨ",
    "cotton", "kapas", "कपास", "कापूस", "ਕਪਾਹ", "তুলা", "prathi", "பருத்தி",
    "sugarcane", "ganna", "गन्ना", "ऊस", "ਗੰਨਾ", "ਆਖ", "cheruku", "கரும்பு",
]

def extract_crop_from_message(message: str) -> Optional[str]:
    """Extract crop mentioned in user message."""
    msg_lower = (message or "").lower()
    for crop in KNOWN_CROP_ALIASES:
        if crop in msg_lower:
            return crop
    return None

def get_mandi_prices_context(
    crop_name: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    limit: int = 20,
) -> str:
    """
    Retrieves current mandi price rows from MongoDB for use as grounded
    context. This is structured retrieval rather than semantic document RAG:
    mandi prices are live database facts and must not be embedded or invented.

    Args:
        crop_name: Optional crop name or alias.
        state: Optional Indian state name.
        district: Optional district name.
        limit: Maximum number of rows injected into the LLM context.
    Returns:
        str: Grounded, formatted price context for the LLM.
    """
    collection = get_mongo_collection()
    if collection is None:
        logger.warning("[MANDI] MongoDB collection unavailable")
        return "MANDI_DATA: Live price is currently unavailable."

    try:
        filters: dict[str, Any] = {}
        if crop_name:
            canonical_crop = get_canonical_crop_name(crop_name)
            filters["commodity"] = re.compile(re.escape(canonical_crop), re.IGNORECASE)
        if state:
            filters["state"] = re.compile(re.escape(state.strip()), re.IGNORECASE)
        if district:
            filters["district"] = re.compile(re.escape(district.strip()), re.IGNORECASE)

        safe_limit = max(1, min(int(limit), 50))
        records = collection.find(
            filters,
            {
                "_id": 0,
                "state": 1,
                "district": 1,
                "market": 1,
                "commodity": 1,
                "variety": 1,
                "grade": 1,
                "arrival_date": 1,
                "min_price": 1,
                "max_price": 1,
                "modal_price": 1,
            },
        ).sort(
            [("arrival_date", -1), ("fetched_at", -1)]
        ).limit(safe_limit)
        records = list(records)

        if not records:
            logger.info("[MANDI] No records matched filters=%s", filters)
            return "MANDI_DATA: Live price is currently unavailable for the requested area or crop."

        lines = ["MANDI_DATA: The following prices come directly from the live mandi database:"]
        for record in records:
            location = ", ".join(
                value for value in (record.get("market"), record.get("district"), record.get("state")) if value
            )
            price_range = f"Rs.{record.get('min_price')}-Rs.{record.get('max_price')}"
            modal_price = record.get("modal_price")
            if modal_price is not None:
                price_range += f", modal Rs.{modal_price}"
            details = ", ".join(
                value for value in (record.get("variety"), record.get("grade")) if value
            )
            line = (
                f"- {record.get('commodity', 'Unknown crop')} at {location}: "
                f"{price_range} per quintal"
            )
            if details:
                line += f" ({details})"
            if record.get("arrival_date"):
                line += f"; arrival date {record['arrival_date']}"
            lines.append(line)
        lines.append("Use only these database values when answering price questions.")
        return "\n".join(lines)

    except Exception as e:
        logger.error("[MANDI] Error querying MongoDB: %s", e)
        return "MANDI_DATA: Live price is currently unavailable."


def get_mandi_price(crop_name: str, state: str) -> str:
    """Backward-compatible single-crop wrapper for existing callers."""
    return get_mandi_prices_context(crop_name=crop_name, state=state, limit=1)


# ---------------------------------------------------------------------------
# LLM initialisation
# ---------------------------------------------------------------------------
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.1-flash-lite")

_retry_policy = Retry(
    total=3,
    backoff_factor=1.0,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["POST"],
    raise_on_status=False,
)
_http_session = requests.Session()
_http_session.mount("https://", HTTPAdapter(max_retries=_retry_policy))
_http_session.mount("http://",  HTTPAdapter(max_retries=_retry_policy))

llm = ChatGoogleGenerativeAI(
    model=MODEL_NAME,
    api_key=GOOGLE_API_KEY,
    temperature=0.2,
    timeout=60.0,
    max_retries=0,      # Application-level retry loop handles this
)

# ---------------------------------------------------------------------------
# BCP-47 → verbose name (used when detected_language is not passed)
# ---------------------------------------------------------------------------
_BCP47_TO_NAME: dict[str, str] = {
    "hi-IN": "Hindi (Devanagari script)",
    "ta-IN": "Tamil (Tamil script)",
    "te-IN": "Telugu (Telugu script)",
    "bn-IN": "Bengali (Bengali script)",
    "mr-IN": "Marathi (Devanagari script)",
    "gu-IN": "Gujarati (Gujarati script)",
    "kn-IN": "Kannada (Kannada script)",
    "ml-IN": "Malayalam (Malayalam script)",
    "pa-IN": "Punjabi (Gurmukhi script)",
    "or-IN": "Odia (Odia script)",
    "ur-IN": "Urdu (Nastaliq script)",
    "as-IN": "Assamese (Assamese script)",
    "en-IN": "English",
}

# Farmer-friendly busy messages per language
_FALLBACK: dict[str, str] = {
    "hi-IN": "सर्वर अभी व्यस्त है, कृपया कुछ समय बाद पुनः प्रयास करें।",
    "ta-IN": "தற்போது சேவையகம் பிஸியாக உள்ளது, சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
    "te-IN": "సర్వర్ ప్రస్తుతం బిజీగా ఉంది, దయచేసి కొద్దిసేపు తర్వాత మళ్లీ ప్రయత్నించండి.",
    "bn-IN": "সার্ভার এখন ব্যস্ত, অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
    "mr-IN": "सर्व्हर सध्या व्यस्त आहे, कृपया थोड्या वेळाने पुन्हा प्रयत्न करा।",
    "gu-IN": "સર્વર હાલ વ્યસ્ત છે, કૃપા કરીને થોડા સમય બાદ ફરી પ્રયાસ કરો.",
    "kn-IN": "ಸರ್ವರ್ ಈಗ ಬ್ಯುಸಿಯಾಗಿದೆ, ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    "ml-IN": "സെർവർ ഇപ്പോൾ തിരക്കിലാണ്, ദയവായി കുറച്ച് സമയം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.",
    "pa-IN": "ਸਰਵਰ ਹੁਣ ਵਿਅਸਤ ਹੈ, ਕਿਰਪਾ ਕਰਕੇ ਕੁਝ ਸਮੇਂ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    "or-IN": "ସର୍ଭର ବର୍ତ୍ତମାନ ବ୍ୟସ୍ତ ଅଛି, ଦୟାକରି ଟିକେ ସମୟ ପରେ ପୁନଃ ଚେଷ୍ଟା କରନ୍ତୁ।",
    "ur-IN": "سرور ابھی مصروف ہے، براہ کرم کچھ وقت بعد دوبارہ کوشش کریں۔",
    "as-IN": "চাৰ্ভাৰ বৰ্তমান ব্যস্ত আছে, অনুগ্ৰহ কৰি কিছু সময় পিছত পুনৰ চেষ্টা কৰক।",
    "sa-IN": "सर्वरः सम्प्रति व्यस्तः अस्ति, कृपया किञ्चित् कालानन्तरं पुनः प्रयत्नं कुर्वन्तु।",
    "sd-IN": "سرور هن وقت مصروف آهي، مهرباني ڪري ڪجهه دير کانپوءِ ٻيهر ڪوشش ڪريو.",
    "ks-IN": "سَرور چُھ وُنکِس مَشغُول، مِہربٲنی کٔرِتھ کٔرِو کینٛہہ وَقٕت پَتہٕ دُبارٕ کُوشِش۔",
    "ne-IN": "सर्भर अहिले व्यस्त छ, कृपया केही समय पछि फेरि प्रयास गर्नुहोस्।",
    "kok-IN": "सर्वर सद्या व्यस्त आसा, उपकार करून थोड्या वेळान परत यत्न करात.",
    "mni-IN": "ꯁꯔꯚꯔ ꯍꯧꯖꯤꯛ ꯕꯤꯖꯤ ꯑꯣꯏꯔꯤ, ꯆꯥꯅꯕꯤꯗꯨꯅꯥ ꯈꯔꯥ ꯂꯩꯔꯒꯥ ꯑꯃꯨꯛ ꯍꯟꯅꯥ ꯍꯣꯠꯅꯕꯤꯌꯨ꯫",
    "sat-IN": "ᱥᱟᱨᱵᱷᱟᱨ ᱫᱚ ᱱᱤᱛᱚᱜ ᱵᱮᱥᱛᱚ ᱢᱮᱱᱟᱜ-ᱟ, ᱫᱟᱭᱟ ᱠᱟᱛᱮ ᱛᱤᱱᱟᱹᱜ ᱜᱷᱟᱹᱲᱤᱠ ᱛᱟᱭᱚᱢ ᱟᱨᱦᱚᱸ ᱪᱮᱥᱴᱟᱭ ᱢᱮ᱾",
    "en-IN": "The server is busy right now. Please try again in a moment.",
}


# ---------------------------------------------------------------------------
# Dynamic language policy builder
# ---------------------------------------------------------------------------
import json

def _build_language_policy() -> str:
    """
    Returns the highest-priority language policy block for the system prompt.
    """
    return """LANGUAGE POLICY (MANDATORY – HIGHEST PRIORITY):

You are an empathetic, highly adaptable conversational assistant.
Your CORE INSTRUCTION is to LISTEN to the user's input, IDENTIFY the exact
language, dialect, or mix of languages they use, and RESPOND BACK fluently
and accurately in the VERY SAME language and tone.

LANGUAGE MIRRORING RULES (non-negotiable):
1. The language of the user's CURRENT message has ABSOLUTE priority.
   Ignore history language, UI language, and profile language if they differ.
2. If the user writes in English → respond entirely in English.
3. If the user writes in Hindi (Devanagari) → respond entirely in Hindi (Devanagari).
4. If the user writes in Romanized Hindi / Hinglish (e.g. "gehu ka bhav kya hai",
   "meri fasal mein keede lag gaye") → understand it as Hindi and respond in
   Hindi using Devanagari script, since that is what TTS can pronounce correctly.
5. If the user writes in Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada,
   Malayalam, Punjabi, Odia, Urdu, Assamese, or any other Indian language →
   respond in THAT language using its NATIVE SCRIPT.
6. Apply the same Romanized logic to all Indian languages:
   Roman Tamil → Tamil script, Roman Bengali → Bengali script, etc.
7. If the user code-switches (mixes Hindi and English in one sentence) →
   respond in the same natural mix, using Devanagari for Hindi words and
   Latin for English words, matching their exact style.
8. NEVER translate the user's question into a different language.
9. NEVER add unnecessary English translations in parentheses after non-English text.

TONE MIRRORING RULES:
1. Match the user's emotional energy. If they sound worried → be reassuring.
   If they sound casual → be warm and casual. If they sound urgent → be prompt and direct.
2. Use natural, flowing language — as if speaking to a friend, not reading from a textbook.
3. Avoid rigid, formulaic greetings in every response. Do NOT start every reply with
   "नमस्ते किसान भाई!" or "बिल्कुल!" — use them only when genuinely appropriate.
4. If the user expresses frustration or distress about crop damage, weather, or prices,
   acknowledge their feelings FIRST before offering advice. Example:
   Bad:  "आपको यह दवाई छिड़कनी चाहिए।"
   Good: "अरे, यह तो चिंता की बात है। देखिए, इसके लिए..."

OUTPUT FORMAT (strict):
You must output your final response strictly as a JSON object:
{
    "language_code": "ISO 639-1 code (e.g., 'hi', 'en', 'ta', 'mr')",
    "bcp47_code": "BCP-47 code (e.g., 'hi-IN', 'en-IN', 'ta-IN', 'mr-IN')",
    "language_name": "Human readable name (e.g., 'Hindi', 'English', 'Tamil')",
    "response": "Your conversational response in the detected language"
}
Output ONLY the JSON object. No markdown fences, no preamble, no explanation outside the JSON."""


def _build_full_system_prompt(profile_context: str) -> str:
    """Assembles the complete system prompt: language policy first, then role + profile."""
    language_policy = _build_language_policy()

    role_instructions = f"""

IDENTITY:
You are Saathi (साथी) — a warm, wise, and deeply empathetic AI agricultural
companion for Indian farmers. You are NOT a generic chatbot. You are a trusted
friend who has spent years understanding farming, weather, soil, crops, and
the real struggles of Indian agriculture.

PERSONALITY:
- Warm, mature, calm, and trustworthy — like a knowledgeable elder in the village.
- Deeply practical — you give actionable advice, not textbook theory.
- Emotionally intelligent — you sense when a farmer is worried, frustrated, or
  confused, and you respond with genuine care before jumping to solutions.
- Conversational and natural — you speak like a real person, not a machine.
  Your Hindi should sound like natural spoken Hindi, not formal written Hindi.
- Humble — you say "yeh try karke dekhiye" not "aapko yeh karna chahiye".
- Never patronizing, never robotic, never over-enthusiastic.

CONVERSATIONAL GUIDELINES:
- Answer DIRECTLY and CONCISELY (2-5 sentences) when sufficient information exists.
- If information is uncertain, handle it gracefully:
  "Yeh depend karega mitti ke type par..." rather than "I don't have enough info."
- Do NOT sound like a form or survey. Never say "As an AI language model..."
- Do NOT ask for information (State, Crop, etc.) if it is ALREADY in the
  user query, conversation history, or farmer profile.
- When quoting Mandi prices, weave them into natural conversation:
  Good: "अभी गेहूं करीब ₹2,450 प्रति क्विंटल चल रहा है आपके इलाके में।"
  Bad:  "गेहूं का मंडी भाव: ₹2,450/क्विंटल, राज्य: उत्तर प्रदेश।"
- NEVER invent or hallucinate market prices. Use only MANDI_DATA if provided.

CRITICAL — USER QUERY PRIORITY:
1. The user's LATEST message is your PRIMARY source of truth.
2. If the user mentions a SPECIFIC location → use THAT location (not the profile's).
3. If the user mentions a SPECIFIC crop → use THAT crop (not the profile's).
4. The farmer profile is ONLY a fallback when the user omits location/crop.

MANDI PRICE INSTRUCTION:
- If the user asks about price, use the MANDI_DATA injected below.
- If no location is specified, fall back to the profile's state.
- If no crop is specified, fall back to the profile's primary crop.
{profile_context}"""

    return language_policy + "\n" + role_instructions


# ---------------------------------------------------------------------------
# Main pipeline entry point
# ---------------------------------------------------------------------------
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((google.api_core.exceptions.ResourceExhausted, google.api_core.exceptions.TooManyRequests, Exception)),
    reraise=True
)
def call_gemini_agent(inputs):
    return agent_executor.invoke(inputs)


def _normalize_llm_response(response_content: Any) -> str:
    """Safely extracts a plain string from various LangChain/Gemini response structures."""
    if isinstance(response_content, str):
        return response_content
    elif isinstance(response_content, list):
        parts = []
        for item in response_content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(item["text"])
        return "".join(parts)
    elif hasattr(response_content, "content"):
        return _normalize_llm_response(getattr(response_content, "content"))
    else:
        return str(response_content)


def run_ai_pipeline(
    query: str,
    history: list = None,
    profile: dict = None,
) -> dict:
    """
    Executes the Saathi AI Reasoning pipeline for a given user query.

    Args:
        query (str): User's message text.
        history (list): Previous turns [{'role': 'user'|'assistant', 'content': '...'}]
        profile (dict): Farmer profile {'state', 'district', 'soilType', 'crop'}

    Returns:
        dict: Parsed JSON from the LLM containing:
              {'language_code', 'bcp47_code', 'language_name', 'response'}
    """
    if not query or not query.strip():
        raise ValueError("Empty query — please provide a valid input.")

    user_location = extract_location_from_message(query)
    user_crop = extract_crop_from_message(query)

    effective_profile = (profile or {}).copy()
    if user_location:
        effective_profile['state'] = user_location
    if user_crop:
        effective_profile['crop'] = user_crop

    # ── Farmer profile context ─────────────────────────────────────────────────
    profile_context = ""
    if effective_profile:
        parts = []
        if effective_profile.get("state"):     parts.append(f"State: {effective_profile['state']}")
        if effective_profile.get("district"):  parts.append(f"District: {effective_profile['district']}")
        if effective_profile.get("soilType"):  parts.append(f"Soil: {effective_profile['soilType']}")
        if effective_profile.get("crop"):      parts.append(f"Primary Crop: {effective_profile['crop']}")
        if parts:
            profile_context = (
                f"\\nFARMER PROFILE: {', '.join(parts)}. "
                f"Tailor all advice to these specific conditions."
            )

    # ── Build dynamic system prompt ────────────────────────────────────────────
    system_prompt_text = _build_full_system_prompt(profile_context)

    # ── Parse conversation history ─────────────────────────────────────────────
    history_messages: list = []
    if history and isinstance(history, list):
        for turn in history[-10:]:
            role    = turn.get("role")
            content = turn.get("content")
            if role == "user" and content:
                history_messages.append(HumanMessage(content=content))
            elif role == "assistant" and content:
                # Store the assistant content as a normal string, even though the latest will be JSON
                history_messages.append(AIMessage(content=content))

    start_time: float = time.time()

    logger.info(
        f"[AI] pipeline started | history={len(history_messages)} | profile={bool(profile_context)} | query='{query[:60]}'"
    )

    mandi_ctx = ""
    price_query = bool(re.search(
        r"(?i)(mandi|price|rate|bhav|भाव|कीमत|दाम|விலை|ధర|দাম|ભાવ|ಬೆಲೆ|വില)",
        query,
    ))
    detected_crop = user_crop or extract_crop_from_message(query)
    if price_query:
        logger.info(
            "[MANDI] retrieval started | crop=%s | state=%s | district=%s",
            detected_crop,
            effective_profile.get("state"),
            effective_profile.get("district"),
        )
        tool_start = time.time()
        mandi_ctx = get_mandi_prices_context(
            crop_name=detected_crop,
            state=effective_profile.get("state"),
            district=effective_profile.get("district"),
            limit=int(os.getenv("MANDI_CONTEXT_LIMIT", "20")),
        )
        logger.info("[MANDI] retrieval completed in %.2fs", time.time() - tool_start)

    if mandi_ctx:
        system_prompt_text += f"\\n\\n{mandi_ctx}"

    direct_system = SystemMessage(content=system_prompt_text)
    messages_seq = [direct_system] + history_messages + [HumanMessage(content=query)]
    
    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=1, max=3),
        retry=retry_if_exception_type((google.api_core.exceptions.ResourceExhausted, google.api_core.exceptions.TooManyRequests)),
        reraise=True
    )
    def _invoke_llm():
        logger.info("[AI] Gemini request started")
        return llm.invoke(messages_seq)
        
    try:
        res = _invoke_llm()
        if res:
            duration = time.time() - start_time
            logger.info(f"[AI] final response generated in {duration:.2f}s")
            
            raw_content = getattr(res, "content", res)
            logger.info(f"[AI] Raw response type: {type(raw_content).__name__}")
            
            normalized_text = _normalize_llm_response(raw_content)
            logger.info(f"[AI] Normalized response type: {type(normalized_text).__name__}")
            
            raw_text = normalized_text.strip()
            
            # Remove markdown JSON wrappers if present
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()
            
            try:
                parsed_json = json.loads(raw_text)
                return parsed_json
            except json.JSONDecodeError as e:
                logger.error(f"[Gemini] Failed to parse JSON response: {e}\\nRaw: {raw_text}")
                # Fallback structure
                return {
                    "language_code": "en",
                    "bcp47_code": "en-IN",
                    "language_name": "English",
                    "response": raw_text
                }
    except Exception as e:
        logger.error(f"[Gemini] Non-transient failure after {time.time() - start_time:.2f}s | {type(e).__name__}: {e}")

    logger.error("[Gemini] Returning fallback message")
    return {
        "language_code": "en",
        "bcp47_code": "en-IN",
        "language_name": "English",
        "response": _FALLBACK["en-IN"]
    }


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    from language_utils import detect_language

    tests = [
        ("T1 Hindi",    "गेहूँ का भाव क्या है?",              None),
        ("T2 Tamil",    "கோதுமை விலை என்ன?",                  None),
        ("T3 Mixed",    "गेहूं का price क्या है?",            None),
        ("T4 Romanized","gehu ka bhav kya hai",               None),
        ("T6 Marathi",  "गहूची किंमत काय?",                   None),
        ("T7 French",   "Bonjour, quel est le prix du blé?",  None),
        ("T10 Profile", "मेरी फसल में कीड़े लग गए हैं, क्या करूं?",
                        {"state": "Punjab", "crop": "Wheat"}),
    ]

    print("\n" + "="*60)
    print("🌾 Saathi AI Pipeline — Language Awareness Test")
    print("="*60)

    for label, query, profile in tests:
        print(f"\n[{label}] Query: {query[:55]}")
        dl = detect_language(query)
        print(f"  Detected: {dl['language_name']} ({dl['language_code']}) conf={dl['confidence']:.2f}")
        resp = run_ai_pipeline(query, detected_language=dl, profile=profile)
        print(f"  Response: {resp[:120]}")

    print("\n" + "="*60)
