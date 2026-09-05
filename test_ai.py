
from __future__ import annotations

import os
import re
import time
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, Optional
from pymongo import MongoClient

# Load environment variables first

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
    "Bajra": ["bajra", "बाजरा", "bajri", "sajja", "pearl millet"],
    "Jowar": ["jowar", "जवारी", "cholam", "juar", "sorghum", "जोवर"],
    "Barley": ["barley", "jau", "जौ", "yava"],
    "Groundnut": ["groundnut", "moongphali", "मूंगफली", "peanut"],
    "Garlic": ["garlic", "lahsun", "लहसुन", "vellulli"],
    "Ginger": ["ginger", "adrak", "अदरक", "allam"],
    "Green Moong": ["moong", "मूंग", "pesalu", "pachai payaru", "green moong"],
    "Urad": ["urad", "उड़द", "minumulu", "ulundu"],
    "Arhar": ["arhar", "tur", "toor", "अरहर", "तूर", "kandipappu"],
    "Chilli": ["chilli", "mirch", "मिर्च", "mirapakaya"],
    "Turmeric": ["turmeric", "haldi", "हल्दी", "pasupu"],
}

def get_canonical_crop_name(crop_input: str) -> str:
    cleaned = (crop_input or "").strip().lower()
    for canonical, aliases in CROP_TRANSLATIONS.items():
        if any(alias in cleaned or cleaned in alias for alias in aliases):
            return canonical
    return crop_input.strip().capitalize()


INDIA_DISTRICT_MAP: dict[str, tuple[str, str]] = {
    "anantapur": ("Andhra Pradesh", "Anantapur"),
    "chittoor": ("Andhra Pradesh", "Chittoor"),
    "east godavari": ("Andhra Pradesh", "East Godavari"),
    "guntur": ("Andhra Pradesh", "Guntur"),
    "krishna": ("Andhra Pradesh", "Krishna"),
    "kurnool": ("Andhra Pradesh", "Kurnool"),
    "nellore": ("Andhra Pradesh", "Nellore"),
    "prakasam": ("Andhra Pradesh", "Prakasam"),
    "srikakulam": ("Andhra Pradesh", "Srikakulam"),
    "visakhapatnam": ("Andhra Pradesh", "Visakhapatnam"),
    "vizianagaram": ("Andhra Pradesh", "Vizianagaram"),
    "west godavari": ("Andhra Pradesh", "West Godavari"),
    "ysr kadapa": ("Andhra Pradesh", "YSR Kadapa"),
    "alluri sitharama raju": ("Andhra Pradesh", "Alluri Sitharama Raju"),
    "anakapalli": ("Andhra Pradesh", "Anakapalli"),
    "annamayya": ("Andhra Pradesh", "Annamayya"),
    "bapatla": ("Andhra Pradesh", "Bapatla"),
    "eluru": ("Andhra Pradesh", "Eluru"),
    "kakinada": ("Andhra Pradesh", "Kakinada"),
    "konaseema": ("Andhra Pradesh", "Konaseema"),
    "nandyal": ("Andhra Pradesh", "Nandyal"),
    "ntr": ("Andhra Pradesh", "NTR"),
    "palnadu": ("Andhra Pradesh", "Palnadu"),
    "parvathipuram manyam": ("Andhra Pradesh", "Parvathipuram Manyam"),
    "sri sathya sai": ("Andhra Pradesh", "Sri Sathya Sai"),
    "tirupati": ("Andhra Pradesh", "Tirupati"),
    "anjaw": ("Arunachal Pradesh", "Anjaw"),
    "changlang": ("Arunachal Pradesh", "Changlang"),
    "dibang valley": ("Arunachal Pradesh", "Dibang Valley"),
    "east kameng": ("Arunachal Pradesh", "East Kameng"),
    "east siang": ("Arunachal Pradesh", "East Siang"),
    "kamle": ("Arunachal Pradesh", "Kamle"),
    "kra daadi": ("Arunachal Pradesh", "Kra Daadi"),
    "kurung kumey": ("Arunachal Pradesh", "Kurung Kumey"),
    "lepa rada": ("Arunachal Pradesh", "Lepa Rada"),
    "lohit": ("Arunachal Pradesh", "Lohit"),
    "longding": ("Arunachal Pradesh", "Longding"),
    "lower dibang valley": ("Arunachal Pradesh", "Lower Dibang Valley"),
    "lower siang": ("Arunachal Pradesh", "Lower Siang"),
    "lower subansiri": ("Arunachal Pradesh", "Lower Subansiri"),
    "namsai": ("Arunachal Pradesh", "Namsai"),
    "pakke kessang": ("Arunachal Pradesh", "Pakke Kessang"),
    "papum pare": ("Arunachal Pradesh", "Papum Pare"),
    "shi yomi": ("Arunachal Pradesh", "Shi Yomi"),
    "siang": ("Arunachal Pradesh", "Siang"),
    "tawang": ("Arunachal Pradesh", "Tawang"),
    "tirap": ("Arunachal Pradesh", "Tirap"),
    "upper siang": ("Arunachal Pradesh", "Upper Siang"),
    "upper subansiri": ("Arunachal Pradesh", "Upper Subansiri"),
    "west kameng": ("Arunachal Pradesh", "West Kameng"),
    "west siang": ("Arunachal Pradesh", "West Siang"),
    "baksa": ("Assam", "Baksa"),
    "barpeta": ("Assam", "Barpeta"),
    "biswanath": ("Assam", "Biswanath"),
    "bongaigaon": ("Assam", "Bongaigaon"),
    "cachar": ("Assam", "Cachar"),
    "charaideo": ("Assam", "Charaideo"),
    "chirang": ("Assam", "Chirang"),
    "darrang": ("Assam", "Darrang"),
    "dhemaji": ("Assam", "Dhemaji"),
    "dhubri": ("Assam", "Dhubri"),
    "dibrugarh": ("Assam", "Dibrugarh"),
    "dima hasao": ("Assam", "Dima Hasao"),
    "goalpara": ("Assam", "Goalpara"),
    "golaghat": ("Assam", "Golaghat"),
    "hailakandi": ("Assam", "Hailakandi"),
    "hojai": ("Assam", "Hojai"),
    "jorhat": ("Assam", "Jorhat"),
    "kamrup": ("Assam", "Kamrup"),
    "kamrup metropolitan": ("Assam", "Kamrup Metropolitan"),
    "karbi anglong": ("Assam", "Karbi Anglong"),
    "karimganj": ("Assam", "Karimganj"),
    "kokrajhar": ("Assam", "Kokrajhar"),
    "lakhimpur": ("Assam", "Lakhimpur"),
    "majuli": ("Assam", "Majuli"),
    "morigaon": ("Assam", "Morigaon"),
    "nagaon": ("Assam", "Nagaon"),
    "nalbari": ("Assam", "Nalbari"),
    "sivasagar": ("Assam", "Sivasagar"),
    "sonitpur": ("Assam", "Sonitpur"),
    "south salmara-mankachar": ("Assam", "South Salmara-Mankachar"),
    "tinsukia": ("Assam", "Tinsukia"),
    "udalguri": ("Assam", "Udalguri"),
    "west karbi anglong": ("Assam", "West Karbi Anglong"),
    "bajali": ("Assam", "Bajali"),
    "tamulpur": ("Assam", "Tamulpur"),
    "araria": ("Bihar", "Araria"),
    "arwal": ("Bihar", "Arwal"),
    "aurangabad": ("Bihar", "Aurangabad"),
    "banka": ("Bihar", "Banka"),
    "begusarai": ("Bihar", "Begusarai"),
    "bhagalpur": ("Bihar", "Bhagalpur"),
    "bhojpur": ("Bihar", "Bhojpur"),
    "buxar": ("Bihar", "Buxar"),
    "darbhanga": ("Bihar", "Darbhanga"),
    "east champaran": ("Bihar", "East Champaran"),
    "gaya": ("Bihar", "Gaya"),
    "gopalganj": ("Bihar", "Gopalganj"),
    "jamui": ("Bihar", "Jamui"),
    "jehanabad": ("Bihar", "Jehanabad"),
    "kaimur": ("Bihar", "Kaimur"),
    "katihar": ("Bihar", "Katihar"),
    "khagaria": ("Bihar", "Khagaria"),
    "kishanganj": ("Bihar", "Kishanganj"),
    "lakhisarai": ("Bihar", "Lakhisarai"),
    "madhepura": ("Bihar", "Madhepura"),
    "madhubani": ("Bihar", "Madhubani"),
    "munger": ("Bihar", "Munger"),
    "muzaffarpur": ("Bihar", "Muzaffarpur"),
    "nalanda": ("Bihar", "Nalanda"),
    "nawada": ("Bihar", "Nawada"),
    "patna": ("Bihar", "Patna"),
    "purnia": ("Bihar", "Purnia"),
    "rohtas": ("Bihar", "Rohtas"),
    "saharsa": ("Bihar", "Saharsa"),
    "samastipur": ("Bihar", "Samastipur"),
    "saran": ("Bihar", "Saran"),
    "sheikhpura": ("Bihar", "Sheikhpura"),
    "sheohar": ("Bihar", "Sheohar"),
    "sitamarhi": ("Bihar", "Sitamarhi"),
    "siwan": ("Bihar", "Siwan"),
    "supaul": ("Bihar", "Supaul"),
    "vaishali": ("Bihar", "Vaishali"),
    "west champaran": ("Bihar", "West Champaran"),
    "balod": ("Chhattisgarh", "Balod"),
    "baloda bazar": ("Chhattisgarh", "Baloda Bazar"),
    "balrampur": ("Chhattisgarh", "Balrampur"),
    "bastar": ("Chhattisgarh", "Bastar"),
    "bemetara": ("Chhattisgarh", "Bemetara"),
    "bijapur": ("Chhattisgarh", "Bijapur"),
    "bilaspur": ("Chhattisgarh", "Bilaspur"),
    "dantewada": ("Chhattisgarh", "Dantewada"),
    "dhamtari": ("Chhattisgarh", "Dhamtari"),
    "durg": ("Chhattisgarh", "Durg"),
    "gariaband": ("Chhattisgarh", "Gariaband"),
    "gaurela-pendra-marwahi": ("Chhattisgarh", "Gaurela-Pendra-Marwahi"),
    "janjgir-champa": ("Chhattisgarh", "Janjgir-Champa"),
    "jashpur": ("Chhattisgarh", "Jashpur"),
    "kabirdham": ("Chhattisgarh", "Kabirdham"),
    "kanker": ("Chhattisgarh", "Kanker"),
    "kondagaon": ("Chhattisgarh", "Kondagaon"),
    "korba": ("Chhattisgarh", "Korba"),
    "koriya": ("Chhattisgarh", "Koriya"),
    "mahasamund": ("Chhattisgarh", "Mahasamund"),
    "manendragarh-chirmiri-bharatpur": ("Chhattisgarh", "Manendragarh-Chirmiri-Bharatpur"),
    "mungeli": ("Chhattisgarh", "Mungeli"),
    "narayanpur": ("Chhattisgarh", "Narayanpur"),
    "raigarh": ("Chhattisgarh", "Raigarh"),
    "raipur": ("Chhattisgarh", "Raipur"),
    "rajnandgaon": ("Chhattisgarh", "Rajnandgaon"),
    "sukma": ("Chhattisgarh", "Sukma"),
    "surajpur": ("Chhattisgarh", "Surajpur"),
    "surguja": ("Chhattisgarh", "Surguja"),
    "khairagarh-chhuikhadan-gandai": ("Chhattisgarh", "Khairagarh-Chhuikhadan-Gandai"),
    "mohla-manpur-ambagarh chowki": ("Chhattisgarh", "Mohla-Manpur-Ambagarh Chowki"),
    "sarangarh-bilaigarh": ("Chhattisgarh", "Sarangarh-Bilaigarh"),
    "shakti": ("Chhattisgarh", "Shakti"),
    "north goa": ("Goa", "North Goa"),
    "south goa": ("Goa", "South Goa"),
    "ahmedabad": ("Gujarat", "Ahmedabad"),
    "amreli": ("Gujarat", "Amreli"),
    "anand": ("Gujarat", "Anand"),
    "aravalli": ("Gujarat", "Aravalli"),
    "banaskantha": ("Gujarat", "Banaskantha"),
    "bharuch": ("Gujarat", "Bharuch"),
    "bhavnagar": ("Gujarat", "Bhavnagar"),
    "botad": ("Gujarat", "Botad"),
    "chhota udaipur": ("Gujarat", "Chhota Udaipur"),
    "dahod": ("Gujarat", "Dahod"),
    "dang": ("Gujarat", "Dang"),
    "devbhoomi dwarka": ("Gujarat", "Devbhoomi Dwarka"),
    "gandhinagar": ("Gujarat", "Gandhinagar"),
    "gir somnath": ("Gujarat", "Gir Somnath"),
    "jamnagar": ("Gujarat", "Jamnagar"),
    "junagadh": ("Gujarat", "Junagadh"),
    "kheda": ("Gujarat", "Kheda"),
    "kutch": ("Gujarat", "Kutch"),
    "mahisagar": ("Gujarat", "Mahisagar"),
    "mehsana": ("Gujarat", "Mehsana"),
    "morbi": ("Gujarat", "Morbi"),
    "narmada": ("Gujarat", "Narmada"),
    "navsari": ("Gujarat", "Navsari"),
    "panchmahal": ("Gujarat", "Panchmahal"),
    "patan": ("Gujarat", "Patan"),
    "porbandar": ("Gujarat", "Porbandar"),
    "rajkot": ("Gujarat", "Rajkot"),
    "sabarkantha": ("Gujarat", "Sabarkantha"),
    "surat": ("Gujarat", "Surat"),
    "surendranagar": ("Gujarat", "Surendranagar"),
    "tapi": ("Gujarat", "Tapi"),
    "vadodara": ("Gujarat", "Vadodara"),
    "valsad": ("Gujarat", "Valsad"),
    "ambala": ("Haryana", "Ambala"),
    "bhiwani": ("Haryana", "Bhiwani"),
    "charkhi dadri": ("Haryana", "Charkhi Dadri"),
    "faridabad": ("Haryana", "Faridabad"),
    "fatehabad": ("Haryana", "Fatehabad"),
    "gurugram": ("Haryana", "Gurugram"),
    "hisar": ("Haryana", "Hisar"),
    "jhajjar": ("Haryana", "Jhajjar"),
    "jind": ("Haryana", "Jind"),
    "kaithal": ("Haryana", "Kaithal"),
    "karnal": ("Haryana", "Karnal"),
    "kurukshetra": ("Haryana", "Kurukshetra"),
    "mahendragarh": ("Haryana", "Mahendragarh"),
    "nuh": ("Haryana", "Nuh"),
    "palwal": ("Haryana", "Palwal"),
    "panchkula": ("Haryana", "Panchkula"),
    "panipat": ("Haryana", "Panipat"),
    "rewari": ("Haryana", "Rewari"),
    "rohtak": ("Haryana", "Rohtak"),
    "sirsa": ("Haryana", "Sirsa"),
    "sonipat": ("Haryana", "Sonipat"),
    "yamunanagar": ("Haryana", "Yamunanagar"),
    "bilaspur": ("Himachal Pradesh", "Bilaspur"),
    "chamba": ("Himachal Pradesh", "Chamba"),
    "hamirpur": ("Himachal Pradesh", "Hamirpur"),
    "kangra": ("Himachal Pradesh", "Kangra"),
    "kinnaur": ("Himachal Pradesh", "Kinnaur"),
    "kullu": ("Himachal Pradesh", "Kullu"),
    "lahaul and spiti": ("Himachal Pradesh", "Lahaul and Spiti"),
    "mandi": ("Himachal Pradesh", "Mandi"),
    "shimla": ("Himachal Pradesh", "Shimla"),
    "sirmaur": ("Himachal Pradesh", "Sirmaur"),
    "solan": ("Himachal Pradesh", "Solan"),
    "una": ("Himachal Pradesh", "Una"),
    "bokaro": ("Jharkhand", "Bokaro"),
    "chatra": ("Jharkhand", "Chatra"),
    "deoghar": ("Jharkhand", "Deoghar"),
    "dhanbad": ("Jharkhand", "Dhanbad"),
    "dumka": ("Jharkhand", "Dumka"),
    "east singhbhum": ("Jharkhand", "East Singhbhum"),
    "garhwa": ("Jharkhand", "Garhwa"),
    "giridih": ("Jharkhand", "Giridih"),
    "godda": ("Jharkhand", "Godda"),
    "gumla": ("Jharkhand", "Gumla"),
    "hazaribagh": ("Jharkhand", "Hazaribagh"),
    "jamtara": ("Jharkhand", "Jamtara"),
    "khunti": ("Jharkhand", "Khunti"),
    "koderma": ("Jharkhand", "Koderma"),
    "latehar": ("Jharkhand", "Latehar"),
    "lohardaga": ("Jharkhand", "Lohardaga"),
    "pakur": ("Jharkhand", "Pakur"),
    "palamu": ("Jharkhand", "Palamu"),
    "ramgarh": ("Jharkhand", "Ramgarh"),
    "ranchi": ("Jharkhand", "Ranchi"),
    "sahibganj": ("Jharkhand", "Sahibganj"),
    "saraikela kharsawan": ("Jharkhand", "Saraikela Kharsawan"),
    "simdega": ("Jharkhand", "Simdega"),
    "west singhbhum": ("Jharkhand", "West Singhbhum"),
    "bagalkot": ("Karnataka", "Bagalkot"),
    "ballari": ("Karnataka", "Ballari"),
    "belagavi": ("Karnataka", "Belagavi"),
    "bengaluru rural": ("Karnataka", "Bengaluru Rural"),
    "bengaluru urban": ("Karnataka", "Bengaluru Urban"),
    "bidar": ("Karnataka", "Bidar"),
    "chamarajanagar": ("Karnataka", "Chamarajanagar"),
    "chikkaballapur": ("Karnataka", "Chikkaballapur"),
    "chikkamagaluru": ("Karnataka", "Chikkamagaluru"),
    "chitradurga": ("Karnataka", "Chitradurga"),
    "dakshina kannada": ("Karnataka", "Dakshina Kannada"),
    "davanagere": ("Karnataka", "Davanagere"),
    "dharwad": ("Karnataka", "Dharwad"),
    "gadag": ("Karnataka", "Gadag"),
    "hassan": ("Karnataka", "Hassan"),
    "haveri": ("Karnataka", "Haveri"),
    "kalaburagi": ("Karnataka", "Kalaburagi"),
    "kodagu": ("Karnataka", "Kodagu"),
    "kolar": ("Karnataka", "Kolar"),
    "koppal": ("Karnataka", "Koppal"),
    "mandya": ("Karnataka", "Mandya"),
    "mysuru": ("Karnataka", "Mysuru"),
    "raichur": ("Karnataka", "Raichur"),
    "ramanagara": ("Karnataka", "Ramanagara"),
    "shivamogga": ("Karnataka", "Shivamogga"),
    "tumakuru": ("Karnataka", "Tumakuru"),
    "udupi": ("Karnataka", "Udupi"),
    "uttara kannada": ("Karnataka", "Uttara Kannada"),
    "vijayanagara": ("Karnataka", "Vijayanagara"),
    "yadgir": ("Karnataka", "Yadgir"),
    "alappuzha": ("Kerala", "Alappuzha"),
    "ernakulam": ("Kerala", "Ernakulam"),
    "idukki": ("Kerala", "Idukki"),
    "kannur": ("Kerala", "Kannur"),
    "kasaragod": ("Kerala", "Kasaragod"),
    "kollam": ("Kerala", "Kollam"),
    "kottayam": ("Kerala", "Kottayam"),
    "kozhikode": ("Kerala", "Kozhikode"),
    "malappuram": ("Kerala", "Malappuram"),
    "palakkad": ("Kerala", "Palakkad"),
    "pathanamthitta": ("Kerala", "Pathanamthitta"),
    "thiruvananthapuram": ("Kerala", "Thiruvananthapuram"),
    "thrissur": ("Kerala", "Thrissur"),
    "wayanad": ("Kerala", "Wayanad"),
    "agar malwa": ("Madhya Pradesh", "Agar Malwa"),
    "alirajpur": ("Madhya Pradesh", "Alirajpur"),
    "anuppur": ("Madhya Pradesh", "Anuppur"),
    "ashoknagar": ("Madhya Pradesh", "Ashoknagar"),
    "balaghat": ("Madhya Pradesh", "Balaghat"),
    "barwani": ("Madhya Pradesh", "Barwani"),
    "betul": ("Madhya Pradesh", "Betul"),
    "bhind": ("Madhya Pradesh", "Bhind"),
    "bhopal": ("Madhya Pradesh", "Bhopal"),
    "burhanpur": ("Madhya Pradesh", "Burhanpur"),
    "chhatarpur": ("Madhya Pradesh", "Chhatarpur"),
    "chhindwara": ("Madhya Pradesh", "Chhindwara"),
    "damoh": ("Madhya Pradesh", "Damoh"),
    "datia": ("Madhya Pradesh", "Datia"),
    "dewas": ("Madhya Pradesh", "Dewas"),
    "dhar": ("Madhya Pradesh", "Dhar"),
    "dindori": ("Madhya Pradesh", "Dindori"),
    "guna": ("Madhya Pradesh", "Guna"),
    "gwalior": ("Madhya Pradesh", "Gwalior"),
    "harda": ("Madhya Pradesh", "Harda"),
    "hoshangabad": ("Madhya Pradesh", "Hoshangabad"),
    "indore": ("Madhya Pradesh", "Indore"),
    "jabalpur": ("Madhya Pradesh", "Jabalpur"),
    "jhabua": ("Madhya Pradesh", "Jhabua"),
    "katni": ("Madhya Pradesh", "Katni"),
    "khandwa": ("Madhya Pradesh", "Khandwa"),
    "khargone": ("Madhya Pradesh", "Khargone"),
    "maihar": ("Madhya Pradesh", "Maihar"),
    "mandla": ("Madhya Pradesh", "Mandla"),
    "mandsaur": ("Madhya Pradesh", "Mandsaur"),
    "morena": ("Madhya Pradesh", "Morena"),
    "nagar": ("Madhya Pradesh", "Nagar"),
    "narsinghpur": ("Madhya Pradesh", "Narsinghpur"),
    "neemuch": ("Madhya Pradesh", "Neemuch"),
    "niwari": ("Madhya Pradesh", "Niwari"),
    "panna": ("Madhya Pradesh", "Panna"),
    "raisen": ("Madhya Pradesh", "Raisen"),
    "rajgarh": ("Madhya Pradesh", "Rajgarh"),
    "ratlam": ("Madhya Pradesh", "Ratlam"),
    "rewa": ("Madhya Pradesh", "Rewa"),
    "sagar": ("Madhya Pradesh", "Sagar"),
    "satna": ("Madhya Pradesh", "Satna"),
    "sehore": ("Madhya Pradesh", "Sehore"),
    "seoni": ("Madhya Pradesh", "Seoni"),
    "shahdol": ("Madhya Pradesh", "Shahdol"),
    "shajapur": ("Madhya Pradesh", "Shajapur"),
    "sheopur": ("Madhya Pradesh", "Sheopur"),
    "shivpuri": ("Madhya Pradesh", "Shivpuri"),
    "sidhi": ("Madhya Pradesh", "Sidhi"),
    "singrauli": ("Madhya Pradesh", "Singrauli"),
    "tikamgarh": ("Madhya Pradesh", "Tikamgarh"),
    "ujjain": ("Madhya Pradesh", "Ujjain"),
    "umaria": ("Madhya Pradesh", "Umaria"),
    "vidisha": ("Madhya Pradesh", "Vidisha"),
    "ahmednagar": ("Maharashtra", "Ahmednagar"),
    "akola": ("Maharashtra", "Akola"),
    "amravati": ("Maharashtra", "Amravati"),
    "aurangabad": ("Maharashtra", "Aurangabad"),
    "beed": ("Maharashtra", "Beed"),
    "bhandara": ("Maharashtra", "Bhandara"),
    "buldhana": ("Maharashtra", "Buldhana"),
    "chandrapur": ("Maharashtra", "Chandrapur"),
    "dhule": ("Maharashtra", "Dhule"),
    "gadchiroli": ("Maharashtra", "Gadchiroli"),
    "gondia": ("Maharashtra", "Gondia"),
    "hingoli": ("Maharashtra", "Hingoli"),
    "jalgaon": ("Maharashtra", "Jalgaon"),
    "jalna": ("Maharashtra", "Jalna"),
    "kolhapur": ("Maharashtra", "Kolhapur"),
    "latur": ("Maharashtra", "Latur"),
    "mumbai city": ("Maharashtra", "Mumbai City"),
    "mumbai suburban": ("Maharashtra", "Mumbai Suburban"),
    "nagpur": ("Maharashtra", "Nagpur"),
    "nanded": ("Maharashtra", "Nanded"),
    "nandurbar": ("Maharashtra", "Nandurbar"),
    "nashik": ("Maharashtra", "Nashik"),
    "osmanabad": ("Maharashtra", "Osmanabad"),
    "palghar": ("Maharashtra", "Palghar"),
    "parbhani": ("Maharashtra", "Parbhani"),
    "pune": ("Maharashtra", "Pune"),
    "raigad": ("Maharashtra", "Raigad"),
    "ratnagiri": ("Maharashtra", "Ratnagiri"),
    "sangli": ("Maharashtra", "Sangli"),
    "satara": ("Maharashtra", "Satara"),
    "sindhudurg": ("Maharashtra", "Sindhudurg"),
    "solapur": ("Maharashtra", "Solapur"),
    "thane": ("Maharashtra", "Thane"),
    "wardha": ("Maharashtra", "Wardha"),
    "washim": ("Maharashtra", "Washim"),
    "yavatmal": ("Maharashtra", "Yavatmal"),
    "bishnupur": ("Manipur", "Bishnupur"),
    "chandel": ("Manipur", "Chandel"),
    "churachandpur": ("Manipur", "Churachandpur"),
    "imphal east": ("Manipur", "Imphal East"),
    "imphal west": ("Manipur", "Imphal West"),
    "jiribam": ("Manipur", "Jiribam"),
    "kakching": ("Manipur", "Kakching"),
    "kamjong": ("Manipur", "Kamjong"),
    "kangpokpi": ("Manipur", "Kangpokpi"),
    "noney": ("Manipur", "Noney"),
    "pherzawl": ("Manipur", "Pherzawl"),
    "senapati": ("Manipur", "Senapati"),
    "tamenglong": ("Manipur", "Tamenglong"),
    "tengnoupal": ("Manipur", "Tengnoupal"),
    "thoubal": ("Manipur", "Thoubal"),
    "ukhrul": ("Manipur", "Ukhrul"),
    "east garo hills": ("Meghalaya", "East Garo Hills"),
    "east jaintia hills": ("Meghalaya", "East Jaintia Hills"),
    "east khasi hills": ("Meghalaya", "East Khasi Hills"),
    "north garo hills": ("Meghalaya", "North Garo Hills"),
    "ri bhoi": ("Meghalaya", "Ri Bhoi"),
    "south garo hills": ("Meghalaya", "South Garo Hills"),
    "south west garo hills": ("Meghalaya", "South West Garo Hills"),
    "south west khasi hills": ("Meghalaya", "South West Khasi Hills"),
    "west garo hills": ("Meghalaya", "West Garo Hills"),
    "west jaintia hills": ("Meghalaya", "West Jaintia Hills"),
    "west khasi hills": ("Meghalaya", "West Khasi Hills"),
    "eastern west khasi hills": ("Meghalaya", "Eastern West Khasi Hills"),
    "aizawl": ("Mizoram", "Aizawl"),
    "champhai": ("Mizoram", "Champhai"),
    "hnahthial": ("Mizoram", "Hnahthial"),
    "khawzawl": ("Mizoram", "Khawzawl"),
    "kolasib": ("Mizoram", "Kolasib"),
    "lawngtlai": ("Mizoram", "Lawngtlai"),
    "lunglei": ("Mizoram", "Lunglei"),
    "mamit": ("Mizoram", "Mamit"),
    "saiha": ("Mizoram", "Saiha"),
    "saitual": ("Mizoram", "Saitual"),
    "serchhip": ("Mizoram", "Serchhip"),
    "chümoukedima": ("Nagaland", "Chümoukedima"),
    "dimapur": ("Nagaland", "Dimapur"),
    "kiphire": ("Nagaland", "Kiphire"),
    "kohima": ("Nagaland", "Kohima"),
    "longleng": ("Nagaland", "Longleng"),
    "mokokchung": ("Nagaland", "Mokokchung"),
    "mon": ("Nagaland", "Mon"),
    "niuland": ("Nagaland", "Niuland"),
    "noklak": ("Nagaland", "Noklak"),
    "peren": ("Nagaland", "Peren"),
    "phek": ("Nagaland", "Phek"),
    "shamator": ("Nagaland", "Shamator"),
    "tseminyü": ("Nagaland", "Tseminyü"),
    "tuensang": ("Nagaland", "Tuensang"),
    "wokha": ("Nagaland", "Wokha"),
    "zünheboto": ("Nagaland", "Zünheboto"),
    "angul": ("Odisha", "Angul"),
    "balangir": ("Odisha", "Balangir"),
    "balasore": ("Odisha", "Balasore"),
    "bargarh": ("Odisha", "Bargarh"),
    "bhadrak": ("Odisha", "Bhadrak"),
    "boudh": ("Odisha", "Boudh"),
    "cuttack": ("Odisha", "Cuttack"),
    "deogarh": ("Odisha", "Deogarh"),
    "dhenkanal": ("Odisha", "Dhenkanal"),
    "gajapati": ("Odisha", "Gajapati"),
    "ganjam": ("Odisha", "Ganjam"),
    "jagatsinghpur": ("Odisha", "Jagatsinghpur"),
    "jajpur": ("Odisha", "Jajpur"),
    "jharsuguda": ("Odisha", "Jharsuguda"),
    "kalahandi": ("Odisha", "Kalahandi"),
    "kandhamal": ("Odisha", "Kandhamal"),
    "kendrapara": ("Odisha", "Kendrapara"),
    "kendujhar": ("Odisha", "Kendujhar"),
    "khordha": ("Odisha", "Khordha"),
    "koraput": ("Odisha", "Koraput"),
    "malkangiri": ("Odisha", "Malkangiri"),
    "mayurbhanj": ("Odisha", "Mayurbhanj"),
    "nabarangpur": ("Odisha", "Nabarangpur"),
    "nayagarh": ("Odisha", "Nayagarh"),
    "nuapada": ("Odisha", "Nuapada"),
    "puri": ("Odisha", "Puri"),
    "rayagada": ("Odisha", "Rayagada"),
    "sambalpur": ("Odisha", "Sambalpur"),
    "sonepur": ("Odisha", "Sonepur"),
    "sundargarh": ("Odisha", "Sundargarh"),
    "amritsar": ("Punjab", "Amritsar"),
    "barnala": ("Punjab", "Barnala"),
    "bathinda": ("Punjab", "Bathinda"),
    "faridkot": ("Punjab", "Faridkot"),
    "fatehgarh sahib": ("Punjab", "Fatehgarh Sahib"),
    "fazilka": ("Punjab", "Fazilka"),
    "ferozepur": ("Punjab", "Ferozepur"),
    "gurdaspur": ("Punjab", "Gurdaspur"),
    "hoshiarpur": ("Punjab", "Hoshiarpur"),
    "jalandhar": ("Punjab", "Jalandhar"),
    "kapurthala": ("Punjab", "Kapurthala"),
    "ludhiana": ("Punjab", "Ludhiana"),
    "malerkotla": ("Punjab", "Malerkotla"),
    "mansa": ("Punjab", "Mansa"),
    "moga": ("Punjab", "Moga"),
    "muktsar": ("Punjab", "Muktsar"),
    "pathankot": ("Punjab", "Pathankot"),
    "patiala": ("Punjab", "Patiala"),
    "rupnagar": ("Punjab", "Rupnagar"),
    "sangrur": ("Punjab", "Sangrur"),
    "sas nagar": ("Punjab", "SAS Nagar"),
    "sbs nagar": ("Punjab", "SBS Nagar"),
    "tarn taran": ("Punjab", "Tarn Taran"),
    "ajmer": ("Rajasthan", "Ajmer"),
    "alwar": ("Rajasthan", "Alwar"),
    "banswara": ("Rajasthan", "Banswara"),
    "baran": ("Rajasthan", "Baran"),
    "barmer": ("Rajasthan", "Barmer"),
    "bharatpur": ("Rajasthan", "Bharatpur"),
    "bhilwara": ("Rajasthan", "Bhilwara"),
    "bikaner": ("Rajasthan", "Bikaner"),
    "bundi": ("Rajasthan", "Bundi"),
    "chittorgarh": ("Rajasthan", "Chittorgarh"),
    "churu": ("Rajasthan", "Churu"),
    "dausa": ("Rajasthan", "Dausa"),
    "dholpur": ("Rajasthan", "Dholpur"),
    "dungarpur": ("Rajasthan", "Dungarpur"),
    "hanumangarh": ("Rajasthan", "Hanumangarh"),
    "jaipur": ("Rajasthan", "Jaipur"),
    "jaisalmer": ("Rajasthan", "Jaisalmer"),
    "jalore": ("Rajasthan", "Jalore"),
    "jhalawar": ("Rajasthan", "Jhalawar"),
    "jhunjhunu": ("Rajasthan", "Jhunjhunu"),
    "jodhpur": ("Rajasthan", "Jodhpur"),
    "karauli": ("Rajasthan", "Karauli"),
    "kota": ("Rajasthan", "Kota"),
    "nagaur": ("Rajasthan", "Nagaur"),
    "pali": ("Rajasthan", "Pali"),
    "pratapgarh": ("Rajasthan", "Pratapgarh"),
    "rajsamand": ("Rajasthan", "Rajsamand"),
    "sawai madhopur": ("Rajasthan", "Sawai Madhopur"),
    "sikar": ("Rajasthan", "Sikar"),
    "sirohi": ("Rajasthan", "Sirohi"),
    "sri ganganagar": ("Rajasthan", "Sri Ganganagar"),
    "tonk": ("Rajasthan", "Tonk"),
    "udaipur": ("Rajasthan", "Udaipur"),
    "east sikkim": ("Sikkim", "East Sikkim"),
    "north sikkim": ("Sikkim", "North Sikkim"),
    "south sikkim": ("Sikkim", "South Sikkim"),
    "west sikkim": ("Sikkim", "West Sikkim"),
    "pakyong": ("Sikkim", "Pakyong"),
    "soreng": ("Sikkim", "Soreng"),
    "ariyalur": ("Tamil Nadu", "Ariyalur"),
    "chengalpattu": ("Tamil Nadu", "Chengalpattu"),
    "chennai": ("Tamil Nadu", "Chennai"),
    "coimbatore": ("Tamil Nadu", "Coimbatore"),
    "cuddalore": ("Tamil Nadu", "Cuddalore"),
    "dharmapuri": ("Tamil Nadu", "Dharmapuri"),
    "dindigul": ("Tamil Nadu", "Dindigul"),
    "erode": ("Tamil Nadu", "Erode"),
    "kallakurichi": ("Tamil Nadu", "Kallakurichi"),
    "kancheepuram": ("Tamil Nadu", "Kancheepuram"),
    "karur": ("Tamil Nadu", "Karur"),
    "krishnagiri": ("Tamil Nadu", "Krishnagiri"),
    "madurai": ("Tamil Nadu", "Madurai"),
    "mayiladuthurai": ("Tamil Nadu", "Mayiladuthurai"),
    "nagapattinam": ("Tamil Nadu", "Nagapattinam"),
    "namakkal": ("Tamil Nadu", "Namakkal"),
    "nilgiris": ("Tamil Nadu", "Nilgiris"),
    "perambalur": ("Tamil Nadu", "Perambalur"),
    "pudukkottai": ("Tamil Nadu", "Pudukkottai"),
    "ramanathapuram": ("Tamil Nadu", "Ramanathapuram"),
    "ranipet": ("Tamil Nadu", "Ranipet"),
    "salem": ("Tamil Nadu", "Salem"),
    "sivaganga": ("Tamil Nadu", "Sivaganga"),
    "tenkasi": ("Tamil Nadu", "Tenkasi"),
    "thanjavur": ("Tamil Nadu", "Thanjavur"),
    "theni": ("Tamil Nadu", "Theni"),
    "thoothukudi": ("Tamil Nadu", "Thoothukudi"),
    "tiruchirappalli": ("Tamil Nadu", "Tiruchirappalli"),
    "tirunelveli": ("Tamil Nadu", "Tirunelveli"),
    "tirupathur": ("Tamil Nadu", "Tirupathur"),
    "tiruppur": ("Tamil Nadu", "Tiruppur"),
    "tiruvallur": ("Tamil Nadu", "Tiruvallur"),
    "tiruvannamalai": ("Tamil Nadu", "Tiruvannamalai"),
    "tiruvarur": ("Tamil Nadu", "Tiruvarur"),
    "vellore": ("Tamil Nadu", "Vellore"),
    "viluppuram": ("Tamil Nadu", "Viluppuram"),
    "virudhunagar": ("Tamil Nadu", "Virudhunagar"),
    "adilabad": ("Telangana", "Adilabad"),
    "bhadradri kothagudem": ("Telangana", "Bhadradri Kothagudem"),
    "hyderabad": ("Telangana", "Hyderabad"),
    "jagtial": ("Telangana", "Jagtial"),
    "jangaon": ("Telangana", "Jangaon"),
    "jayashankar bhupalpally": ("Telangana", "Jayashankar Bhupalpally"),
    "jogulamba gadwal": ("Telangana", "Jogulamba Gadwal"),
    "kamareddy": ("Telangana", "Kamareddy"),
    "karimnagar": ("Telangana", "Karimnagar"),
    "khammam": ("Telangana", "Khammam"),
    "kumuram bheem asifabad": ("Telangana", "Kumuram Bheem Asifabad"),
    "mahabubabad": ("Telangana", "Mahabubabad"),
    "mahbubnagar": ("Telangana", "Mahbubnagar"),
    "mancherial": ("Telangana", "Mancherial"),
    "medak": ("Telangana", "Medak"),
    "medchal-malkajgiri": ("Telangana", "Medchal-Malkajgiri"),
    "mulugu": ("Telangana", "Mulugu"),
    "nagarkurnool": ("Telangana", "Nagarkurnool"),
    "nalgonda": ("Telangana", "Nalgonda"),
    "narayanpet": ("Telangana", "Narayanpet"),
    "nirmal": ("Telangana", "Nirmal"),
    "nizamabad": ("Telangana", "Nizamabad"),
    "peddapalli": ("Telangana", "Peddapalli"),
    "rajanna sircilla": ("Telangana", "Rajanna Sircilla"),
    "rangareddy": ("Telangana", "Rangareddy"),
    "sangareddy": ("Telangana", "Sangareddy"),
    "siddipet": ("Telangana", "Siddipet"),
    "suryapet": ("Telangana", "Suryapet"),
    "vikarabad": ("Telangana", "Vikarabad"),
    "wanaparthy": ("Telangana", "Wanaparthy"),
    "warangal rural": ("Telangana", "Warangal Rural"),
    "warangal urban": ("Telangana", "Warangal Urban"),
    "yadadri bhuvanagiri": ("Telangana", "Yadadri Bhuvanagiri"),
    "dhalai": ("Tripura", "Dhalai"),
    "gomati": ("Tripura", "Gomati"),
    "khowai": ("Tripura", "Khowai"),
    "north tripura": ("Tripura", "North Tripura"),
    "sepahijala": ("Tripura", "Sepahijala"),
    "south tripura": ("Tripura", "South Tripura"),
    "unakoti": ("Tripura", "Unakoti"),
    "west tripura": ("Tripura", "West Tripura"),
    "agra": ("Uttar Pradesh", "Agra"),
    "aligarh": ("Uttar Pradesh", "Aligarh"),
    "ambedkar nagar": ("Uttar Pradesh", "Ambedkar Nagar"),
    "amethi": ("Uttar Pradesh", "Amethi"),
    "amroha": ("Uttar Pradesh", "Amroha"),
    "auraiya": ("Uttar Pradesh", "Auraiya"),
    "ayodhya": ("Uttar Pradesh", "Ayodhya"),
    "azamgarh": ("Uttar Pradesh", "Azamgarh"),
    "baghpat": ("Uttar Pradesh", "Baghpat"),
    "bahraich": ("Uttar Pradesh", "Bahraich"),
    "ballia": ("Uttar Pradesh", "Ballia"),
    "balrampur": ("Uttar Pradesh", "Balrampur"),
    "banda": ("Uttar Pradesh", "Banda"),
    "barabanki": ("Uttar Pradesh", "Barabanki"),
    "bareilly": ("Uttar Pradesh", "Bareilly"),
    "basti": ("Uttar Pradesh", "Basti"),
    "bhadohi": ("Uttar Pradesh", "Bhadohi"),
    "bijnor": ("Uttar Pradesh", "Bijnor"),
    "budaun": ("Uttar Pradesh", "Budaun"),
    "bulandshahr": ("Uttar Pradesh", "Bulandshahr"),
    "chandauli": ("Uttar Pradesh", "Chandauli"),
    "chitrakoot": ("Uttar Pradesh", "Chitrakoot"),
    "deoria": ("Uttar Pradesh", "Deoria"),
    "etah": ("Uttar Pradesh", "Etah"),
    "etawah": ("Uttar Pradesh", "Etawah"),
    "farrukhabad": ("Uttar Pradesh", "Farrukhabad"),
    "fatehpur": ("Uttar Pradesh", "Fatehpur"),
    "firozabad": ("Uttar Pradesh", "Firozabad"),
    "gautam buddha nagar": ("Uttar Pradesh", "Gautam Buddha Nagar"),
    "ghaziabad": ("Uttar Pradesh", "Ghaziabad"),
    "ghazipur": ("Uttar Pradesh", "Ghazipur"),
    "gonda": ("Uttar Pradesh", "Gonda"),
    "gorakhpur": ("Uttar Pradesh", "Gorakhpur"),
    "hamirpur": ("Uttar Pradesh", "Hamirpur"),
    "hapur": ("Uttar Pradesh", "Hapur"),
    "hardoi": ("Uttar Pradesh", "Hardoi"),
    "hathras": ("Uttar Pradesh", "Hathras"),
    "jalaun": ("Uttar Pradesh", "Jalaun"),
    "jaunpur": ("Uttar Pradesh", "Jaunpur"),
    "jhansi": ("Uttar Pradesh", "Jhansi"),
    "kannauj": ("Uttar Pradesh", "Kannauj"),
    "kanpur dehat": ("Uttar Pradesh", "Kanpur Dehat"),
    "kanpur nagar": ("Uttar Pradesh", "Kanpur Nagar"),
    "kasganj": ("Uttar Pradesh", "Kasganj"),
    "kaushambi": ("Uttar Pradesh", "Kaushambi"),
    "kushinagar": ("Uttar Pradesh", "Kushinagar"),
    "lakhimpur kheri": ("Uttar Pradesh", "Lakhimpur Kheri"),
    "lalitpur": ("Uttar Pradesh", "Lalitpur"),
    "lucknow": ("Uttar Pradesh", "Lucknow"),
    "maharajganj": ("Uttar Pradesh", "Maharajganj"),
    "mahoba": ("Uttar Pradesh", "Mahoba"),
    "mainpuri": ("Uttar Pradesh", "Mainpuri"),
    "mathura": ("Uttar Pradesh", "Mathura"),
    "mau": ("Uttar Pradesh", "Mau"),
    "meerut": ("Uttar Pradesh", "Meerut"),
    "mirzapur": ("Uttar Pradesh", "Mirzapur"),
    "moradabad": ("Uttar Pradesh", "Moradabad"),
    "muzaffarnagar": ("Uttar Pradesh", "Muzaffarnagar"),
    "pilibhit": ("Uttar Pradesh", "Pilibhit"),
    "pratapgarh": ("Uttar Pradesh", "Pratapgarh"),
    "prayagraj": ("Uttar Pradesh", "Prayagraj"),
    "rae bareli": ("Uttar Pradesh", "Rae Bareli"),
    "rampur": ("Uttar Pradesh", "Rampur"),
    "saharanpur": ("Uttar Pradesh", "Saharanpur"),
    "sambhal": ("Uttar Pradesh", "Sambhal"),
    "sant kabir nagar": ("Uttar Pradesh", "Sant Kabir Nagar"),
    "shahjahanpur": ("Uttar Pradesh", "Shahjahanpur"),
    "shamli": ("Uttar Pradesh", "Shamli"),
    "shravasti": ("Uttar Pradesh", "Shravasti"),
    "siddharthnagar": ("Uttar Pradesh", "Siddharthnagar"),
    "sitapur": ("Uttar Pradesh", "Sitapur"),
    "sonbhadra": ("Uttar Pradesh", "Sonbhadra"),
    "sultanpur": ("Uttar Pradesh", "Sultanpur"),
    "unnao": ("Uttar Pradesh", "Unnao"),
    "varanasi": ("Uttar Pradesh", "Varanasi"),
    "almora": ("Uttarakhand", "Almora"),
    "bageshwar": ("Uttarakhand", "Bageshwar"),
    "chamoli": ("Uttarakhand", "Chamoli"),
    "champawat": ("Uttarakhand", "Champawat"),
    "dehradun": ("Uttarakhand", "Dehradun"),
    "haridwar": ("Uttarakhand", "Haridwar"),
    "nainital": ("Uttarakhand", "Nainital"),
    "pauri garhwal": ("Uttarakhand", "Pauri Garhwal"),
    "pithoragarh": ("Uttarakhand", "Pithoragarh"),
    "rudraprayag": ("Uttarakhand", "Rudraprayag"),
    "tehri garhwal": ("Uttarakhand", "Tehri Garhwal"),
    "udham singh nagar": ("Uttarakhand", "Udham Singh Nagar"),
    "uttarkashi": ("Uttarakhand", "Uttarkashi"),
    "alipurduar": ("West Bengal", "Alipurduar"),
    "bankura": ("West Bengal", "Bankura"),
    "birbhum": ("West Bengal", "Birbhum"),
    "cooch behar": ("West Bengal", "Cooch Behar"),
    "dakshin dinajpur": ("West Bengal", "Dakshin Dinajpur"),
    "darjeeling": ("West Bengal", "Darjeeling"),
    "hooghly": ("West Bengal", "Hooghly"),
    "howrah": ("West Bengal", "Howrah"),
    "jalpaiguri": ("West Bengal", "Jalpaiguri"),
    "jhargram": ("West Bengal", "Jhargram"),
    "kalimpong": ("West Bengal", "Kalimpong"),
    "kolkata": ("West Bengal", "Kolkata"),
    "malda": ("West Bengal", "Malda"),
    "murshidabad": ("West Bengal", "Murshidabad"),
    "nadia": ("West Bengal", "Nadia"),
    "north 24 parganas": ("West Bengal", "North 24 Parganas"),
    "paschim bardhaman": ("West Bengal", "Paschim Bardhaman"),
    "paschim medinipur": ("West Bengal", "Paschim Medinipur"),
    "purba bardhaman": ("West Bengal", "Purba Bardhaman"),
    "purba medinipur": ("West Bengal", "Purba Medinipur"),
    "purulia": ("West Bengal", "Purulia"),
    "south 24 parganas": ("West Bengal", "South 24 Parganas"),
    "uttar dinajpur": ("West Bengal", "Uttar Dinajpur"),
    "nicobar": ("Andaman and Nicobar Islands", "Nicobar"),
    "north and middle andaman": ("Andaman and Nicobar Islands", "North and Middle Andaman"),
    "south andaman": ("Andaman and Nicobar Islands", "South Andaman"),
    "chandigarh": ("Chandigarh", "Chandigarh"),
    "dadra and nagar haveli": ("Dadra and Nagar Haveli and Daman and Diu", "Dadra and Nagar Haveli"),
    "daman": ("Dadra and Nagar Haveli and Daman and Diu", "Daman"),
    "diu": ("Dadra and Nagar Haveli and Daman and Diu", "Diu"),
    "central delhi": ("Delhi", "Central Delhi"),
    "east delhi": ("Delhi", "East Delhi"),
    "new delhi": ("Delhi", "New Delhi"),
    "north delhi": ("Delhi", "North Delhi"),
    "north east delhi": ("Delhi", "North East Delhi"),
    "north west delhi": ("Delhi", "North West Delhi"),
    "shahdara": ("Delhi", "Shahdara"),
    "south delhi": ("Delhi", "South Delhi"),
    "south east delhi": ("Delhi", "South East Delhi"),
    "south west delhi": ("Delhi", "South West Delhi"),
    "west delhi": ("Delhi", "West Delhi"),
    "anantnag": ("Jammu and Kashmir", "Anantnag"),
    "bandipora": ("Jammu and Kashmir", "Bandipora"),
    "baramulla": ("Jammu and Kashmir", "Baramulla"),
    "budgam": ("Jammu and Kashmir", "Budgam"),
    "doda": ("Jammu and Kashmir", "Doda"),
    "ganderbal": ("Jammu and Kashmir", "Ganderbal"),
    "jammu": ("Jammu and Kashmir", "Jammu"),
    "kathua": ("Jammu and Kashmir", "Kathua"),
    "kishtwar": ("Jammu and Kashmir", "Kishtwar"),
    "kulgam": ("Jammu and Kashmir", "Kulgam"),
    "kupwara": ("Jammu and Kashmir", "Kupwara"),
    "poonch": ("Jammu and Kashmir", "Poonch"),
    "pulwama": ("Jammu and Kashmir", "Pulwama"),
    "rajouri": ("Jammu and Kashmir", "Rajouri"),
    "ramban": ("Jammu and Kashmir", "Ramban"),
    "reasi": ("Jammu and Kashmir", "Reasi"),
    "samba": ("Jammu and Kashmir", "Samba"),
    "shopian": ("Jammu and Kashmir", "Shopian"),
    "srinagar": ("Jammu and Kashmir", "Srinagar"),
    "udhampur": ("Jammu and Kashmir", "Udhampur"),
    "kargil": ("Ladakh", "Kargil"),
    "leh": ("Ladakh", "Leh"),
    "lakshadweep": ("Lakshadweep", "Lakshadweep"),
    "karaikal": ("Puducherry", "Karaikal"),
    "mahe": ("Puducherry", "Mahe"),
    "puducherry": ("Puducherry", "Puducherry"),
    "yanam": ("Puducherry", "Yanam"),
}

INDIA_STATE_MAP: dict[str, str] = {
    "andhra pradesh": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "assam": "Assam",
    "bihar": "Bihar",
    "chhattisgarh": "Chhattisgarh",
    "goa": "Goa",
    "gujarat": "Gujarat",
    "haryana": "Haryana",
    "himachal pradesh": "Himachal Pradesh",
    "jharkhand": "Jharkhand",
    "karnataka": "Karnataka",
    "kerala": "Kerala",
    "madhya pradesh": "Madhya Pradesh",
    "maharashtra": "Maharashtra",
    "manipur": "Manipur",
    "meghalaya": "Meghalaya",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "odisha": "Odisha",
    "punjab": "Punjab",
    "rajasthan": "Rajasthan",
    "sikkim": "Sikkim",
    "tamil nadu": "Tamil Nadu",
    "telangana": "Telangana",
    "tripura": "Tripura",
    "uttar pradesh": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand",
    "west bengal": "West Bengal",
    "andaman and nicobar islands": "Andaman and Nicobar Islands",
    "chandigarh": "Chandigarh",
    "dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    "delhi": "Delhi",
    "jammu and kashmir": "Jammu and Kashmir",
    "ladakh": "Ladakh",
    "lakshadweep": "Lakshadweep",
    "puducherry": "Puducherry",
}


def extract_location_from_message(message: str) -> Optional[dict]:
    """Extract location mentioned in user message as a state/district pair."""
    msg_lower = (message or "").lower()
    
    # Check districts first (more specific)
    for dist_key, (state, district) in INDIA_DISTRICT_MAP.items():
        if dist_key in msg_lower:
            return {"state": state, "district": district}
            
    # Fallback to states
    for state_key, state in INDIA_STATE_MAP.items():
        if state_key in msg_lower:
            return {"state": state, "district": None}
            
    return None

KNOWN_CROP_ALIASES: list[str] = [
    "bajra", "बाजरा", "bajri", "sajja", "pearl millet",
    "jowar", "जवारी", "cholam", "juar", "sorghum", "जोवर",
    "barley", "jau", "जौ", "yava",
    "groundnut", "moongphali", "मूंगफली", "peanut",
    "garlic", "lahsun", "लहसुन", "vellulli",
    "ginger", "adrak", "अदरक", "allam",
    "moong", "मूंग", "pesalu", "pachai payaru", "green moong",
    "urad", "उड़द", "minumulu", "ulundu",
    "arhar", "tur", "toor", "अरहर", "तूर", "kandipappu",
    "chilli", "mirch", "मिर्च", "mirapakaya",
    "turmeric", "haldi", "हल्दी", "pasupu",

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

import re

def extract_crop_from_message(message: str) -> Optional[str]:
    """Extract crop mentioned in user message (whole word match)."""
    msg_lower = (message or "").lower()
    for crop in KNOWN_CROP_ALIASES:
        # Match word boundaries for English crops to prevent "rice" matching "price"
        # For non-ASCII (Hindi/regional) characters,  might not work perfectly, 
        # but for English aliases it prevents the bug.
        if re.search(r'\b' + re.escape(crop) + r'\b', msg_lower):
            return crop
        # Fallback for non-ASCII scripts where  might fail if bounded by non-words
        elif not crop.isascii() and crop in msg_lower:
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
        def fetch_with_filters(f):
            return list(collection.find(
                f,
                {"_id": 0, "state": 1, "district": 1, "market": 1, "commodity": 1, "variety": 1, "grade": 1, "arrival_date": 1, "min_price": 1, "max_price": 1, "modal_price": 1}
            ).sort([("arrival_date", -1), ("fetched_at", -1)]).limit(safe_limit))

        # Try 1: Exact match (District + State + Commodity)
        records = fetch_with_filters(filters)
        
        # Try 2: State + Commodity (if District was specified but no results)
        if not records and district and "state" in filters:
            fallback_filters = {k: v for k, v in filters.items() if k != "district"}
            logger.info("[MANDI] Falling back to state-level query: %s", fallback_filters)
            records = fetch_with_filters(fallback_filters)
            
        # Try 3: Commodity only (nationwide)
        if not records and "commodity" in filters:
            nationwide_filters = {"commodity": filters["commodity"]}
            logger.info("[MANDI] Falling back to nationwide query: %s", nationwide_filters)
            records = fetch_with_filters(nationwide_filters)

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
    Your CORE INSTRUCTION is to LISTEN to the user's input and RESPOND in either
    pure English or pure Hindi (Devanagari script), depending on the user's input.
    Do NOT use "Hinglish" or Romanized Hindi.

    LANGUAGE RULES (non-negotiable):
    1. The language of the user's CURRENT message has ABSOLUTE priority.
    2. If the user writes in English (or speaks English) → respond entirely in English.
       Example user: "What is the wheat price today?"
       Example response style: "The wheat price depends on your mandi and state. Tell me your location."
    3. If the user writes or speaks in Hindi (even if transcribed in English letters) → respond entirely in Hindi using Devanagari script.
       Example user: "गेहूं का भाव क्या है?" OR "gehu ka bhav kya hai"
       Example response style: "गेहूं का भाव मंडी और राज्य के हिसाब से बदलता है।"
    4. If the user writes in another Indian language (Tamil, Telugu, etc.) → respond in THAT language using its NATIVE SCRIPT.
    5. ABSOLUTELY NO HINGLISH OR ROMANIZED HINDI. If the user speaks Hindi but it is transcribed as "kya bhav chal raha hai", you MUST reply in proper Hindi using Devanagari (e.g. "क्या भाव चल रहा है").
    6. NEVER add unnecessary English translations in parentheses after non-English text.

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


def _build_full_system_prompt(profile_context: str, preferred_language: str | None = None) -> str:
    """Assembles the complete system prompt: language policy first, then role + profile."""
    language_policy = _build_language_policy()
    language_hint = ""
    if preferred_language:
        language_hint = f"""

CURRENT INPUT LANGUAGE HINT:
The client UI/speech-recognition language is set to {preferred_language}.
Use this only when the latest user message is very short or ambiguous, such as
a one-word greeting. If the hint is English and the latest message is ordinary
Latin-script English, respond in English. If the latest message clearly uses
another language, follow the latest message instead."""

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
{profile_context}{language_hint}"""

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


def _quick_response_for_short_query(query: str, preferred_language: str | None = None) -> dict | None:
    """
    Handles tiny ambiguous utterances without spending an LLM call. This prevents
    one-word English greetings from drifting into Hindi because of the product
    persona or previous assistant history.
    """
    hint = (preferred_language or "").strip().lower()
    clean = re.sub(r"[^a-zA-Z\s]", "", query or "").strip().lower()
    is_english_hint = hint in {"en", "en-in", "english"} or "english" in hint

    if is_english_hint and clean in {"hello", "hi", "hey", "hello sathi", "hi sathi", "hey sathi", "hello saathi", "hi saathi", "hey saathi"}:
        return {
            "language_code": "en",
            "bcp47_code": "en-IN",
            "language_name": "English",
            "response": "Hello, I am SAATHI. Ask me about crop prices, nearby buyers, mandi information, or crop guidance.",
        }

    return None


def _classify_input_style(query: str, preferred_language: str | None = None) -> dict:
    """
    Classifies the user's text to strict English or strict Hindi (Devanagari).
    Hinglish is entirely removed and banned. If Romanized Hindi is detected,
    it forces the response to be proper Hindi in Devanagari script.
    """
    text = (query or "").strip()
    hint = (preferred_language or "").strip().lower()
    latin_words = re.findall(r"[a-zA-Z]+", text.lower())
    has_devanagari = bool(re.search(r"[ऀ-ॿ]", text))
    is_english_hint = hint in {"en", "en-in", "english"} or "english" in hint

    hindi_markers = {
        "aap", "apna", "apki", "aapki", "bata", "batao", "bataiye", "bhai",
        "bhav", "bhaav", "chal", "chal raha", "chahiye", "daam", "fasal",
        "gehu", "gehun", "ganna", "hai", "hain", "hisaab", "ka", "ke", "ki",
        "kya", "mein", "mera", "meri", "mujhe", "namaste", "namaskar", "rate",
        "sahi", "se", "ya", "yeh",
    }
    english_markers = {
        "tell", "me", "what", "is", "the", "price", "of", "wheat", "rice",
        "in", "near", "nearby", "today", "market", "buyer", "buyers", "find",
        "show", "please", "current", "rate",
    }

    hindi_hits = sum(1 for word in latin_words if word in hindi_markers)
    english_hits = sum(1 for word in latin_words if word in english_markers)

    if has_devanagari:
        return {
            "style": "Hindi",
            "instruction": "The latest user message is in Hindi. Respond only in Hindi using Devanagari script.",
        }

    if latin_words and hindi_hits >= 2 and english_hits < hindi_hits:
        return {
            "style": "Hindi",
            "instruction": "The user spoke Hindi (transcribed in Latin script). Respond in proper Hindi using Devanagari script. Do NOT use Romanized Hindi/Hinglish.",
        }

    if latin_words and (is_english_hint or english_hits >= hindi_hits):
        return {
            "style": "English",
            "instruction": "The latest user message is English. Respond only in English. Do not respond in Hindi.",
        }

    return {
        "style": "Auto",
        "instruction": "Mirror the latest user message language appropriately (use Devanagari for Hindi).",
    }


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
    preferred_language: str | None = None,
) -> dict:
    """
    Executes the Saathi AI Reasoning pipeline for a given user query.

    Args:
        query (str): User's message text.
        history (list): Previous turns [{'role': 'user'|'assistant', 'content': '...'}]
        profile (dict): Farmer profile {'state', 'district', 'soilType', 'crop'}
        preferred_language (str): UI/speech-recognition language hint for short
            or ambiguous queries.

    Returns:
        dict: Parsed JSON from the LLM containing:
              {'language_code', 'bcp47_code', 'language_name', 'response'}
    """
    if not query or not query.strip():
        raise ValueError("Empty query — please provide a valid input.")

    quick_response = _quick_response_for_short_query(query, preferred_language)
    if quick_response:
        return quick_response

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
    input_style = _classify_input_style(query, preferred_language)
    system_prompt_text = _build_full_system_prompt(profile_context, preferred_language)
    system_prompt_text += f"""

LATEST USER INPUT STYLE OVERRIDE:
Classification: {input_style["style"]}
Instruction: {input_style["instruction"]}
This override applies to the response language even if conversation history used another language."""

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
                if input_style["style"] == "English":
                    parsed_json["language_code"] = "en"
                    parsed_json["bcp47_code"] = "en-IN"
                    parsed_json["language_name"] = "English"
                elif input_style["style"] == "Hindi":
                    parsed_json["language_code"] = "hi"
                    parsed_json["bcp47_code"] = "hi-IN"
                    parsed_json["language_name"] = "Hindi"
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

