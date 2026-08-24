from __future__ import annotations

import os
import time
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, Optional
from dotenv import load_dotenv

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
# Mandi price database
# ---------------------------------------------------------------------------
MANDI_PRICE_DATABASE: Dict[str, Dict[str, int]] = {
    "wheat":    {"uttar pradesh": 2450, "punjab": 2500, "haryana": 2480, "madhya pradesh": 2420, "rajasthan": 2400, "default": 2450},
    "gehu":     {"uttar pradesh": 2450, "punjab": 2500, "haryana": 2480, "madhya pradesh": 2420, "rajasthan": 2400, "default": 2450},
    "गेहूं":    {"uttar pradesh": 2450, "punjab": 2500, "haryana": 2480, "madhya pradesh": 2420, "rajasthan": 2400, "default": 2450},
    "गेहूँ":    {"uttar pradesh": 2450, "punjab": 2500, "haryana": 2480, "madhya pradesh": 2420, "rajasthan": 2400, "default": 2450},
    "गहू":     {"uttar pradesh": 2450, "punjab": 2500, "haryana": 2480, "madhya pradesh": 2420, "rajasthan": 2400, "default": 2450},
    "கோதுமை":  {"uttar pradesh": 2450, "punjab": 2500, "haryana": 2480, "default": 2450},
    "rice":     {"punjab": 2850, "haryana": 2800, "west bengal": 2700, "uttar pradesh": 2650, "bihar": 2600, "default": 2700},
    "chawal":   {"punjab": 2850, "haryana": 2800, "west bengal": 2700, "uttar pradesh": 2650, "bihar": 2600, "default": 2700},
    "चावल":    {"punjab": 2850, "haryana": 2800, "west bengal": 2700, "uttar pradesh": 2650, "bihar": 2600, "default": 2700},
    "நெல்":    {"punjab": 2850, "haryana": 2800, "west bengal": 2700, "default": 2700},
    "potato":   {"uttar pradesh": 1650, "west bengal": 1700, "bihar": 1600, "punjab": 1550, "default": 1600},
    "aalu":     {"uttar pradesh": 1650, "west bengal": 1700, "bihar": 1600, "punjab": 1550, "default": 1600},
    "आलू":     {"uttar pradesh": 1650, "west bengal": 1700, "bihar": 1600, "punjab": 1550, "default": 1600},
    "onion":    {"maharashtra": 2100, "karnataka": 2000, "madhya pradesh": 1950, "rajasthan": 1900, "default": 2000},
    "pyaz":     {"maharashtra": 2100, "karnataka": 2000, "madhya pradesh": 1950, "rajasthan": 1900, "default": 2000},
    "प्याज":   {"maharashtra": 2100, "karnataka": 2000, "madhya pradesh": 1950, "rajasthan": 1900, "default": 2000},
    "tomato":   {"andhra pradesh": 2200, "karnataka": 2100, "madhya pradesh": 2050, "default": 2150},
    "tamatar":  {"andhra pradesh": 2200, "karnataka": 2100, "madhya pradesh": 2050, "default": 2150},
    "टमाटर":   {"andhra pradesh": 2200, "karnataka": 2100, "madhya pradesh": 2050, "default": 2150},
    "cotton":   {"gujarat": 6800, "maharashtra": 6700, "telangana": 6650, "default": 6750},
    "kapas":    {"gujarat": 6800, "maharashtra": 6700, "telangana": 6650, "default": 6750},
    "कपास":    {"gujarat": 6800, "maharashtra": 6700, "telangana": 6650, "default": 6750},
    "mustard":  {"rajasthan": 5650, "haryana": 5600, "madhya pradesh": 5500, "default": 5550},
    "sarson":   {"rajasthan": 5650, "haryana": 5600, "madhya pradesh": 5500, "default": 5550},
    "सरसों":   {"rajasthan": 5650, "haryana": 5600, "madhya pradesh": 5500, "default": 5550},
    "chana":    {"madhya pradesh": 5200, "rajasthan": 5150, "maharashtra": 5100, "default": 5150},
    "चना":     {"madhya pradesh": 5200, "rajasthan": 5150, "maharashtra": 5100, "default": 5150},
    "soybean":  {"madhya pradesh": 4500, "maharashtra": 4450, "rajasthan": 4400, "default": 4450},
    "सोयाबीन": {"madhya pradesh": 4500, "maharashtra": 4450, "rajasthan": 4400, "default": 4450},
}


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
    msg_lower = message.lower()
    for loc in KNOWN_LOCATIONS:
        if loc in msg_lower:
            return loc
    return None

def extract_crop_from_message(message: str) -> Optional[str]:
    """Extract crop mentioned in user message."""
    msg_lower = message.lower()
    for crop in MANDI_PRICE_DATABASE.keys():
        if crop in msg_lower:
            # Map Hindi/Tamil names to canonical English for internal use, or just return the key
            return crop
    return None

def get_mandi_price(crop_name: str, state: str) -> str:
    """
    Fetches agricultural Mandi market rates for a crop in an Indian state.
    Returns raw structured data — the calling system will translate it into
    the user's language.

    Args:
        crop_name (str): Name of the crop (wheat/गेहूं/கோதுமை/rice/potato…)
        state (str): Indian state name (Uttar Pradesh, Punjab, Maharashtra…)
    Returns:
        str: Raw price fact in English for the LLM to translate.
    """
    crop = crop_name.strip().lower()
    st   = state.strip().lower()

    crop_data = MANDI_PRICE_DATABASE.get(crop)
    if not crop_data:
        for key in MANDI_PRICE_DATABASE:
            if key in crop or crop in key:
                crop_data = MANDI_PRICE_DATABASE[key]
                break

    if crop_data:
        price = crop_data.get(st, crop_data.get("default", 2500))
        # Return raw English fact — LLM will present it in detected language
        return (
            f"MANDI_DATA: crop={crop_name}, state={state.title()}, "
            f"price=Rs.{price} per quintal. "
            f"Translate this into the user's language and present it naturally."
        )
    else:
        return (
            f"MANDI_DATA: crop={crop_name}, state={state.title()}, "
            f"price=estimated Rs.2200-2800 per quintal (exact data unavailable). "
            f"Translate this into the user's language and present it naturally."
        )


# ---------------------------------------------------------------------------
# LLM initialisation
# ---------------------------------------------------------------------------
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.5-flash-lite")

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
    transport="rest",   # HTTP/1.1 REST — avoids gRPC/HTTP2 RemoteProtocolError
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

    q_lower = query.lower()
    mandi_ctx = ""
    for crop_key in MANDI_PRICE_DATABASE:
        if crop_key in q_lower:
            logger.info(f"[MANDI] tool started for '{crop_key}'")
            tool_start = time.time()
            state_hint = effective_profile.get("state", "Uttar Pradesh")
            mandi_ctx = get_mandi_price(crop_key, state_hint)
            logger.info(f"[MANDI] tool completed in {time.time() - tool_start:.2f}s")
            break

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
        if res and res.content:
            duration = time.time() - start_time
            logger.info(f"[AI] final response generated in {duration:.2f}s")
            raw_text = res.content.strip()
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
