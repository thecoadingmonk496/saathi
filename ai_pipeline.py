import os
import time
import logging
import httpx
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables first
load_dotenv(override=True)

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_google_genai import ChatGoogleGenerativeAI
import google.api_core.exceptions

# ── Monkeypatch google-api-core exception formatting bug ─────────────────────
# In google.api_core.exceptions.format_http_response_error, payload is assumed to be
# a dict. On streaming REST errors, Google's API sometimes returns payload as a list
# [{error: ...}], causing AttributeError: 'list' object has no attribute 'get'.
_orig_format_http_error = google.api_core.exceptions.format_http_response_error
def _patched_format_http_error(response, method, url, payload=None):
    if isinstance(payload, list) and len(payload) > 0 and isinstance(payload[0], dict):
        payload = payload[0]
    elif isinstance(payload, list):
        payload = {"error": {"message": str(payload)}}
    return _orig_format_http_error(response, method, url, payload=payload)

google.api_core.exceptions.format_http_response_error = _patched_format_http_error

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure API key is loaded
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY is missing from environment variables.")

# Comprehensive market rate dictionary for fallback/simulation
MANDI_PRICE_DATABASE: Dict[str, Dict[str, int]] = {
    "wheat": {"uttar pradesh": 2450, "punjab": 2500, "haryana": 2480, "madhya pradesh": 2420, "rajasthan": 2400, "default": 2450},
    "gehu": {"uttar pradesh": 2450, "punjab": 2500, "haryana": 2480, "madhya pradesh": 2420, "rajasthan": 2400, "default": 2450},
    "गेहूं": {"uttar pradesh": 2450, "punjab": 2500, "haryana": 2480, "madhya pradesh": 2420, "rajasthan": 2400, "default": 2450},
    "rice": {"punjab": 2850, "haryana": 2800, "west bengal": 2700, "uttar pradesh": 2650, "bihar": 2600, "default": 2700},
    "chawal": {"punjab": 2850, "haryana": 2800, "west bengal": 2700, "uttar pradesh": 2650, "bihar": 2600, "default": 2700},
    "चावल": {"punjab": 2850, "haryana": 2800, "west bengal": 2700, "uttar pradesh": 2650, "bihar": 2600, "default": 2700},
    "potato": {"uttar pradesh": 1650, "west bengal": 1700, "bihar": 1600, "punjab": 1550, "default": 1600},
    "aalu": {"uttar pradesh": 1650, "west bengal": 1700, "bihar": 1600, "punjab": 1550, "default": 1600},
    "आलू": {"uttar pradesh": 1650, "west bengal": 1700, "bihar": 1600, "punjab": 1550, "default": 1600},
    "onion": {"maharashtra": 2100, "karnataka": 2000, "madhya pradesh": 1950, "rajasthan": 1900, "default": 2000},
    "pyaz": {"maharashtra": 2100, "karnataka": 2000, "madhya pradesh": 1950, "rajasthan": 1900, "default": 2000},
    "प्याज": {"maharashtra": 2100, "karnataka": 2000, "madhya pradesh": 1950, "rajasthan": 1900, "default": 2000},
    "tomato": {"andhra pradesh": 2200, "karnataka": 2100, "madhya pradesh": 2050, "default": 2150},
    "tamatar": {"andhra pradesh": 2200, "karnataka": 2100, "madhya pradesh": 2050, "default": 2150},
    "टमाटर": {"andhra pradesh": 2200, "karnataka": 2100, "madhya pradesh": 2050, "default": 2150},
    "cotton": {"gujarat": 6800, "maharashtra": 6700, "telangana": 6650, "default": 6750},
    "kapas": {"gujarat": 6800, "maharashtra": 6700, "telangana": 6650, "default": 6750},
    "कपास": {"gujarat": 6800, "maharashtra": 6700, "telangana": 6650, "default": 6750},
    "mustard": {"rajasthan": 5650, "haryana": 5600, "madhya pradesh": 5500, "default": 5550},
    "sarson": {"rajasthan": 5650, "haryana": 5600, "madhya pradesh": 5500, "default": 5550},
    "सरसों": {"rajasthan": 5650, "haryana": 5600, "madhya pradesh": 5500, "default": 5550},
    "chana": {"madhya pradesh": 5200, "rajasthan": 5150, "maharashtra": 5100, "default": 5150},
    "चना": {"madhya pradesh": 5200, "rajasthan": 5150, "maharashtra": 5100, "default": 5150},
    "soybean": {"madhya pradesh": 4500, "maharashtra": 4450, "rajasthan": 4400, "default": 4450},
    "सोयाबीन": {"madhya pradesh": 4500, "maharashtra": 4450, "rajasthan": 4400, "default": 4450},
}


@tool
def get_mandi_price(crop_name: str, state: str) -> str:
    """
    Fetches real-time or simulated agricultural Mandi market rates for a crop in a given Indian state.
    Args:
        crop_name (str): Name of the crop (e.g., wheat/गेहूं, rice/चावल, potato/आलू, onion/प्याज, etc.)
        state (str): Name of the state (e.g., Uttar Pradesh, Madhya Pradesh, Punjab, etc.)
    Returns:
        str: Mandi price details formatted in Hindi.
    """
    crop = crop_name.strip().lower()
    st = state.strip().lower()
    
    crop_data = MANDI_PRICE_DATABASE.get(crop)
    if not crop_data:
        # Check partial matching
        for key in MANDI_PRICE_DATABASE:
            if key in crop or crop in key:
                crop_data = MANDI_PRICE_DATABASE[key]
                break
                
    if crop_data:
        price = crop_data.get(st, crop_data.get("default", 2500))
        return f"{state.title()} की मंडियों में {crop_name} का औसत बाजार भाव ₹{price} प्रति क्विंटल है।"
    else:
        return f"{state.title()} की मंडियों में {crop_name} का अनुमानित भाव ₹2200 से ₹2800 प्रति क्विंटल के बीच है।"


# Collect tools
tools = [get_mandi_price]

# Initialize Gemini LLM with model fallback options
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.5-flash-lite")

# ── Custom HTTP session: HTTP/1.1 only, no HTTP/2 ─────────────────────────────
# The default gRPC transport uses HTTP/2, which causes RemoteProtocolError when
# the Google API server closes an idle H2 connection mid-stream.
# Forcing transport="rest" switches to a plain requests-based HTTP/1.1 REST
# call, completely bypassing the gRPC+H2 stack.
#
# We also attach a urllib3 Retry adapter so that transient TCP resets are
# retried at the socket level before our application-level loop even fires.
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
    api_key=os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"),
    temperature=0.2,
    # ── CRITICAL: force HTTP/1.1 REST transport ──────────────────────────────
    # "rest" = requests-based HTTP/1.1.  Eliminates HTTP/2 RemoteProtocolError.
    # "grpc" (the default) uses an H2 connection pool that drops under load.
    transport="rest",
    # Per-request ceiling: 60s gives Gemini enough time for complex queries.
    # Our application-level retry loop (3 attempts) provides the outer guard.
    # asyncio.wait_for(timeout=20) in main.py is the hard server-side deadline.
    timeout=60.0,
    max_retries=0,   # Disable SDK retries; our loop handles them explicitly
)


# Multilingual prompt for all major Indian languages
SYSTEM_PROMPT = """You are Saathi. You MUST reply in the language requested: {language}. Strictly answer farming, crop, weather, and Mandi queries in under 3 sentences. For off-topic queries, politely decline in {language}."""

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "Language preference: {language}\n\nUser query: {input}"),
    ("placeholder", "{agent_scratchpad}")
])

# Create agent executor
agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=False)


# Language code to name mapping for the AI prompt
LANGUAGE_MAP = {
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
    "ur-IN": "Urdu (Urdu script)",
    "en-IN": "English",
}


def run_ai_pipeline(query: str, language: str = "hi-IN", history: list = None, profile: dict = None) -> str:
    """
    Executes the Saathi AI Reasoning agent for a given input query.

    Args:
        query (str): User query in any supported Indian language.
        language (str): BCP-47 language code (e.g., 'hi-IN', 'ta-IN', 'en-IN').
        history (list): Previous conversation turns [{'role': 'user'|'assistant', 'content': '...'}]
        profile (dict): Farmer profile details {'state': '...', 'district': '...', 'soilType': '...', 'crop': '...'}

    Returns:
        str: AI response in the user's language (2-3 sentences).
             On repeated transient failures a polite language-aware fallback
             message is returned — raw Python exceptions never reach the UI.
    """
    if not query or not query.strip():
        raise ValueError("Empty query provided. Please provide a valid input.")

    lang_name = LANGUAGE_MAP.get(language, "Hindi (Devanagari script)")

    # ── Transient-error keywords that warrant a retry ──────────────────────────
    TRANSIENT_ERRORS = (
        "client closed connection",
        "broken pipe",
        "remoteprotocolerror",
        "connection reset",
        "connection aborted",
        "connection error",
        "server disconnected",
        "eof occurred",
        "ssl eof",
        "httpcore",
        "h2.",
        "timed out",
        "timeout",
        "resource_exhausted",
        "quota",
    )

    # ── Farmer-friendly fallback messages per language ─────────────────────────
    FALLBACK_MESSAGES = {
        "hi-IN": "सर्वर अभी व्यस्त है, कृपया कुछ समय बाद पुनः प्रयास करें।",
        "ta-IN": "சேவையகம் இப்போது பிஸியாக உள்ளது, சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
        "te-IN": "సర్వర్ ఇప్పుడు బిజీగా ఉంది, దయచేసి కొంత సమయం తర్వాత मళ్లీ ప్రయత్నించండి.",
        "bn-IN": "সার্ভার এখন ব্যস্ত, অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
        "mr-IN": "सर्व्हर सध्या व्यस्त आहे, कृपया थोड्या वेळाने पुन्हा प्रयत्न करा।",
        "gu-IN": "સર્વર હાલ વ્યસ્ત છે, કૃપા કરીને થોડા સમય બાદ ફરી પ્રયાસ કરો.",
        "kn-IN": "ಸರ್ವರ್ ಈಗ ಬ್ಯುಸಿಯಾಗಿದೆ, ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        "ml-IN": "സെർവർ ഇപ്പോൾ തിരക്കിലാണ്, ദയവായി കുറച്ച് സമയം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.",
        "pa-IN": "ਸਰਵਰ ਹੁਣ ਵਿਅਸਤ ਹੈ, ਕਿਰਪਾ ਕਰਕੇ ਕੁਝ ਸਮੇਂ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
        "or-IN": "ସର୍ଭର ବର୍ତ୍ତମାନ ବ୍ୟସ୍ତ ଅଛି, ଦୟାକରି ଟିକେ ସମୟ ପରେ ପୁନଃ ଚେଷ୍ଟା କରନ୍ତୁ।",
        "ur-IN": "سرور ابھی مصروف ہے، براہ کرم کچھ وقت بعد دوبارہ کوشش کریں۔",
        "en-IN": "The server is busy right now. Please try again in a moment.",
    }

    # Format farmer profile context if provided
    profile_context = ""
    if profile and isinstance(profile, dict):
        p_parts = []
        if profile.get("state"): p_parts.append(f"State: {profile['state']}")
        if profile.get("district"): p_parts.append(f"District: {profile['district']}")
        if profile.get("soilType"): p_parts.append(f"Soil Type: {profile['soilType']}")
        if profile.get("crop"): p_parts.append(f"Primary Crop: {profile['crop']}")
        if p_parts:
            profile_context = f"\nUSER CONTEXT: The user is a farmer with the following profile - {', '.join(p_parts)}. Tailor all advice specifically to these conditions."

    # Parse history into LangChain messages
    history_messages = []
    if history and isinstance(history, list):
        for turn in history[-10:]:
            role = turn.get("role")
            content = turn.get("content")
            if role == "user" and content:
                history_messages.append(HumanMessage(content=content))
            elif role == "assistant" and content:
                history_messages.append(AIMessage(content=content))

    MAX_ATTEMPTS = 2
    RETRY_DELAY  = 1.0      # seconds between retries
    last_error: Exception   = Exception("Unknown error")
    start_time: float       = time.time()

    logger.info(f"[Gemini] Starting pipeline | query='{query[:60]}' | lang={language} | history_len={len(history_messages)} | profile_present={bool(profile_context)}")

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            # Try running via agent executor first
            result = agent_executor.invoke({
                "input": query,
                "language": f"{lang_name}{profile_context}",
                "chat_history": history_messages
            })

            duration = time.time() - start_time
            logger.info(
                f"[Gemini] Pipeline succeeded in {duration:.2f}s "
                f"(attempt {attempt}/{MAX_ATTEMPTS})"
            )

            output = result.get("output", "").strip()
            if output:
                return output

            logger.warning(
                f"[Gemini] Empty response on attempt {attempt}/{MAX_ATTEMPTS}, "
                f"retrying in {RETRY_DELAY}s..."
            )
            last_error = ValueError("AI returned an empty response.")
            if attempt < MAX_ATTEMPTS:
                time.sleep(RETRY_DELAY)
            continue

        except Exception as e:
            last_error = e
            duration   = time.time() - start_time
            err_combined = f"{type(e).__name__} {str(e)}".lower()

            # If tool-calling agent fails due to Gemini 3.x thought_signature requirement or bad request,
            # IMMEDIATELY fall back to direct prompt chain with Mandi database context pre-injected.
            if "thought_signature" in err_combined or "badrequest" in err_combined or "attributeerror" in err_combined:
                logger.info(f"[Gemini] Tool agent limitation detected ({type(e).__name__}); falling back to direct LLM chain immediately.")
                try:
                    for crop in MANDI_PRICE_DATABASE:
                        if crop in q_lower or (profile and profile.get("crop") and crop in str(profile.get("crop")).lower()):
                            st = profile.get("state", "default") if profile else "default"
                            mandi_ctx = get_mandi_price.invoke({"crop_name": crop, "state": st})
                            break

                    direct_sys = (
                        f"You are Saathi, an Indian agricultural assistant. "
                        f"Strictly answer farming, crop, weather, and Mandi queries in under 3 sentences in {lang_name}. "
                        f"{profile_context} "
                        f"Mandi Data Context: {mandi_ctx}"
                    )

                    messages_sequence = [SystemMessage(content=direct_sys)] + history_messages + [HumanMessage(content=query)]
                    direct_res = llm.invoke(messages_sequence)
                    if direct_res and direct_res.content:
                        return direct_res.content.strip()
                except Exception as fallback_err:
                    logger.error(f"[Gemini] Direct chain fallback failed: {fallback_err}")
                break

            # Decide whether this is a transient (retriable) transport error
            is_transient = any(kw in err_combined for kw in TRANSIENT_ERRORS)

            if is_transient and attempt < MAX_ATTEMPTS:
                logger.warning(
                    f"[Gemini] Transient error on attempt "
                    f"{attempt}/{MAX_ATTEMPTS} — {type(e).__name__}: "
                    f"{str(e)[:200]}. Retrying in {RETRY_DELAY}s..."
                )
                time.sleep(RETRY_DELAY)
                continue

            # Non-transient error, or final attempt: log fully and stop retrying
            import traceback
            traceback.print_exc()
            logger.error(
                f"[Gemini] Pipeline failed (non-transient) on attempt "
                f"{attempt}/{MAX_ATTEMPTS} after {duration:.2f}s | "
                f"{type(e).__name__}: {e}"
            )
            break

    # ── All attempts exhausted ─────────────────────────────────────────────────
    # Return a polite farmer-friendly message in the user's language.
    # Never expose raw exception text to the frontend.
    logger.error(
        f"[Gemini] All {MAX_ATTEMPTS} attempts failed for "
        f"query='{query[:60]}' | last={type(last_error).__name__}: {last_error}"
    )
    return FALLBACK_MESSAGES.get(language, FALLBACK_MESSAGES["en-IN"])



if __name__ == "__main__":
    print("\n" + "="*50)
    print("🌾 Testing Saathi AI Pipeline...")
    print("="*50)

    test_queries = [
        "उत्तर प्रदेश में गेहूं का क्या मंडी भाव है?",
        "आलू की खेती के लिए सबसे बढ़िया समय कौन सा है?",
        "भारत के प्रधानमंत्री कौन हैं?"  # Off-topic test
    ]

    for q in test_queries:
        print(f"\n👨‍🌾 Farmer Query: {q}")
        res = run_ai_pipeline(q)
        print(f"🤖 Saathi Answer: {res}")
    
    print("\n" + "="*50 + "\n")    # ...existing code...
    # changed imports: use the public langchain package names
    from langchain.prompts import ChatPromptTemplate
    from langchain.tools import tool
    from langchain.agents import create_tool_calling_agent, AgentExecutor
    # ...existing code...