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
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain.agents import create_tool_calling_agent, AgentExecutor
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


@tool
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


tools = [get_mandi_price]

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
# Prompt template (agent uses {language} placeholder for language policy)
# ---------------------------------------------------------------------------
_AGENT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "{language_policy}"),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

agent          = create_tool_calling_agent(llm, tools, _AGENT_PROMPT)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=False)

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
def _build_language_policy(lang_name: str, lang_code: str, confidence: float) -> str:
    """
    Returns the highest-priority language policy block for the system prompt.
    This is inserted BEFORE all other instructions so Gemini always obeys it.
    """
    if confidence < 0.5:
        # Low confidence → English fallback with a note
        lang_name = "English"
        lang_code = "en"

    return f"""LANGUAGE POLICY (MANDATORY – HIGHEST PRIORITY):
- The user's latest message is in {lang_name} (code: {lang_code}).
- Your entire response MUST be ONLY in {lang_name}.
- NEVER combine two languages in the same response.
- If the user typed in Romanized script, convert your response to the native script of {lang_name}.
- Translate any data from tools (Mandi, weather, etc.) into {lang_name} before replying.
- This policy overrides all other instructions."""


def _build_full_system_prompt(
    lang_name: str,
    lang_code: str,
    confidence: float,
    profile_context: str,
) -> str:
    """Assembles the complete system prompt: language policy first, then role + profile."""
    language_policy = _build_language_policy(lang_name, lang_code, confidence)

    role_instructions = f"""
You are Saathi (साथी), a trusted AI agricultural assistant for Indian farmers.
- Answer ONLY farming, crop health, weather, soil, and Mandi price questions in under 3 sentences.
- For off-topic queries (politics, celebrities, general knowledge), politely decline in {lang_name}.
- Always be respectful, simple, and practical — your audience is rural farmers.
- When quoting Mandi prices, always specify the state and unit (₹ per quintal).
{profile_context}"""

    return language_policy + "\n" + role_instructions


# ---------------------------------------------------------------------------
# Main pipeline entry point
# ---------------------------------------------------------------------------
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((google.api_core.exceptions.ResourceExhausted, Exception)),
    reraise=True
)
def call_gemini_agent(inputs):
    return agent_executor.invoke(inputs)


def run_ai_pipeline(
    query: str,
    language: str = "hi-IN",
    history: list = None,
    profile: dict = None,
    detected_language: dict = None,
) -> str:
    """
    Executes the Saathi AI Reasoning pipeline for a given user query.

    Args:
        query (str): User's message text.
        language (str): BCP-47 code (e.g. 'hi-IN'). Used as fallback if
                        detected_language is not provided.
        history (list): Previous turns [{'role': 'user'|'assistant', 'content': '...'}]
        profile (dict): Farmer profile {'state', 'district', 'soilType', 'crop'}
        detected_language (dict): Output of language_utils.detect_language() —
                        {'language_name', 'language_code', 'bcp47_code',
                         'confidence', 'is_supported', 'source'}

    Returns:
        str: AI response in the detected language.
    """
    if not query or not query.strip():
        raise ValueError("Empty query — please provide a valid input.")

    # ── Resolve effective language ─────────────────────────────────────────────
    if detected_language and isinstance(detected_language, dict):
        lang_name  = detected_language.get("language_name", "Hindi")
        lang_code  = detected_language.get("language_code", "hi")
        bcp47_code = detected_language.get("bcp47_code", "hi-IN")
        confidence = float(detected_language.get("confidence", 1.0))
        supported  = detected_language.get("is_supported", True)

        # Unsupported language → English fallback (Option 2)
        if not supported:
            lang_name  = "English"
            lang_code  = "en"
            bcp47_code = "en-IN"
            confidence = 1.0
            logger.info("[Gemini] Unsupported language detected — falling back to English.")
    else:
        # No detection info → use BCP-47 from request
        lang_name  = _BCP47_TO_NAME.get(language, "Hindi (Devanagari script)")
        lang_code  = language.split("-")[0]
        bcp47_code = language
        confidence = 1.0

    # ── Farmer profile context ─────────────────────────────────────────────────
    profile_context = ""
    if profile and isinstance(profile, dict):
        parts = []
        if profile.get("state"):     parts.append(f"State: {profile['state']}")
        if profile.get("district"):  parts.append(f"District: {profile['district']}")
        if profile.get("soilType"):  parts.append(f"Soil: {profile['soilType']}")
        if profile.get("crop"):      parts.append(f"Primary Crop: {profile['crop']}")
        if parts:
            profile_context = (
                f"\nFARMER PROFILE: {', '.join(parts)}. "
                f"Tailor all advice to these specific conditions."
            )

    # ── Build dynamic system prompt ────────────────────────────────────────────
    system_prompt_text = _build_full_system_prompt(
        lang_name, lang_code, confidence, profile_context
    )

    # ── Parse conversation history ─────────────────────────────────────────────
    history_messages: list = []
    if history and isinstance(history, list):
        for turn in history[-10:]:
            role    = turn.get("role")
            content = turn.get("content")
            if role == "user" and content:
                history_messages.append(HumanMessage(content=content))
            elif role == "assistant" and content:
                history_messages.append(AIMessage(content=content))

    # ── Transient error keywords (warrant a retry) ─────────────────────────────
    TRANSIENT_ERRORS = (
        "client closed connection", "broken pipe", "remoteprotocolerror",
        "connection reset", "connection aborted", "connection error",
        "server disconnected", "eof occurred", "ssl eof", "httpcore",
        "h2.", "timed out", "timeout", "resource_exhausted", "quota",
    )

    MAX_ATTEMPTS = 2
    RETRY_DELAY  = 1.0
    last_error: Exception = Exception("Unknown error")
    start_time: float     = time.time()

    logger.info(
        f"[Gemini] Pipeline start | lang={lang_name}({lang_code}) conf={confidence:.2f} "
        f"| history={len(history_messages)} | profile={bool(profile_context)} | query='{query[:60]}'"
    )

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            # ── Attempt: Tool-calling agent ──────────────────────────────────
            result = call_gemini_agent({
                "input": query,
                "language_policy": system_prompt_text,
                "chat_history": history_messages,
            })

            duration = time.time() - start_time
            logger.info(f"[Gemini] Agent succeeded in {duration:.2f}s (attempt {attempt}/{MAX_ATTEMPTS})")

            output = result.get("output", "").strip()
            if output:
                return output

            logger.warning(f"[Gemini] Empty agent response on attempt {attempt}, retrying…")
            last_error = ValueError("AI returned an empty response.")
            if attempt < MAX_ATTEMPTS:
                time.sleep(RETRY_DELAY)
            continue

        except Exception as e:
            last_error    = e
            duration      = time.time() - start_time
            err_combined  = f"{type(e).__name__} {str(e)}".lower()

            # ── Immediate fallback: thought_signature / bad-request errors ──────
            # Gemini 3.x thinking models require thought_signature when the agent
            # echoes tool calls. Fall back to a direct LLM chain instead.
            if ("thought_signature" in err_combined
                    or "badrequest" in err_combined
                    or "attributeerror" in err_combined):
                logger.info(
                    f"[Gemini] Agent limitation ({type(e).__name__}); "
                    f"switching to direct LLM chain."
                )
                try:
                    # Pre-fetch Mandi data if the query contains a known crop keyword
                    q_lower   = query.lower()
                    mandi_ctx = ""
                    for crop_key in MANDI_PRICE_DATABASE:
                        if crop_key in q_lower:
                            state_hint = (profile or {}).get("state", "default")
                            mandi_ctx  = get_mandi_price.invoke(
                                {"crop_name": crop_key, "state": state_hint}
                            )
                            break

                    direct_system = SystemMessage(content=(
                        system_prompt_text
                        + (f"\n\nMandi Tool Context: {mandi_ctx}" if mandi_ctx else "")
                    ))
                    messages_seq = [direct_system] + history_messages + [HumanMessage(content=query)]
                    direct_res   = llm.invoke(messages_seq)
                    if direct_res and direct_res.content:
                        return direct_res.content.strip()
                except Exception as fallback_err:
                    logger.error(f"[Gemini] Direct chain fallback failed: {fallback_err}")
                break

            # ── Transient error → retry ────────────────────────────────────────
            is_transient = any(kw in err_combined for kw in TRANSIENT_ERRORS)
            if is_transient and attempt < MAX_ATTEMPTS:
                logger.warning(
                    f"[Gemini] Transient error on attempt {attempt}/{MAX_ATTEMPTS} "
                    f"— {type(e).__name__}: {str(e)[:200]}. Retrying in {RETRY_DELAY}s…"
                )
                time.sleep(RETRY_DELAY)
                continue

            # ── Non-transient / final attempt ──────────────────────────────────
            import traceback; traceback.print_exc()
            logger.error(
                f"[Gemini] Non-transient failure on attempt {attempt}/{MAX_ATTEMPTS} "
                f"after {duration:.2f}s | {type(e).__name__}: {e}"
            )
            break

    # ── All attempts exhausted — return polite fallback in user's language ──────
    logger.error(
        f"[Gemini] All {MAX_ATTEMPTS} attempts failed | "
        f"last={type(last_error).__name__}: {last_error}"
    )
    return _FALLBACK.get(bcp47_code, _FALLBACK["en-IN"])


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
