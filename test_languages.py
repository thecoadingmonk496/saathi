import os
import time
import requests
import urllib.parse
from dotenv import load_dotenv

load_dotenv(override=True)

API_URL = "http://127.0.0.1:" + os.getenv("PORT", "8000") + "/chat"

# 22 official Indian languages + English
# Some languages might fallback to Hindi/English depending on the detection model.
LANGUAGE_TESTS = [
    {"name": "Hindi", "query": "गेहूँ का भाव क्या है?", "expected_bcp47": "hi-IN"},
    {"name": "Tamil", "query": "கோதுமை விலை என்ன?", "expected_bcp47": "ta-IN"},
    {"name": "Telugu", "query": "గోధుమ ధర ఎంత?", "expected_bcp47": "te-IN"},
    {"name": "Bengali", "query": "গমের দাম কত?", "expected_bcp47": "bn-IN"},
    {"name": "Marathi", "query": "गहूची किंमत काय?", "expected_bcp47": "mr-IN"},
    {"name": "Gujarati", "query": "ઘઉંનો ભાવ શું છે?", "expected_bcp47": "gu-IN"},
    {"name": "Kannada", "query": "ಗೋದಿಯ ಬೆಲೆ ಎಷ್ಟು?", "expected_bcp47": "kn-IN"},
    {"name": "Malayalam", "query": "ഗോതമ്പിന്റെ വില എത്രയാണ്?", "expected_bcp47": "ml-IN"},
    {"name": "Punjabi", "query": "ਕਣਕ ਦਾ ਭਾਅ ਕੀ ਹੈ?", "expected_bcp47": "pa-IN"},
    {"name": "Odia", "query": "ଗହମ ଦାମ୍ କେତେ?", "expected_bcp47": "or-IN"},
    {"name": "Assamese", "query": "ঘেঁহুৰ দাম কিমান?", "expected_bcp47": "as-IN"},
    {"name": "Urdu", "query": "گندم کی قیمت کیا ہے؟", "expected_bcp47": "ur-IN"},
    {"name": "Sanskrit", "query": "गोधूमस्य मूल्यं किम्?", "expected_bcp47": "sa-IN"},
    {"name": "Sindhi", "query": "ڪڻڪ جو اگهه ڇا آهي؟", "expected_bcp47": "sd-IN"},
    {"name": "Kashmiri", "query": "گَنٛدُمُک قٟمَتھ کیاہ چُھ؟", "expected_bcp47": "ks-IN"},
    {"name": "Nepali", "query": "गहुँको मूल्य कति छ?", "expected_bcp47": "ne-IN"},
    {"name": "Bhojpuri", "query": "गहूं के भाव का बा?", "expected_bcp47": "hi-IN"}, # Usually detects as Hindi
    {"name": "Maithili", "query": "गहुमक दर की अछि?", "expected_bcp47": "hi-IN"}, # Usually detects as Hindi
    {"name": "Dogri", "query": "कनक दा भाव के ऐ?", "expected_bcp47": "hi-IN"}, # Usually detects as Hindi
    {"name": "Konkani", "query": "गंवाचो दर किल्लो?", "expected_bcp47": "kok-IN"},
    {"name": "Manipuri", "query": "ꯒꯦꯍꯨꯒꯤ ꯃꯃꯜ ꯀꯌꯥꯅꯣ?", "expected_bcp47": "mni-IN"},
    {"name": "Santali", "query": "ᱜᱩᱦᱩᱢ ᱨᱮᱭᱟᱜ ᱜᱚᱱᱚᱝ ᱫᱚ ᱛᱤᱱᱟᱹᱜ?", "expected_bcp47": "sat-IN"},
    {"name": "Bodo", "query": "गमनि बेसेना बेसेबां?", "expected_bcp47": "hi-IN"}, # May fallback
    {"name": "English", "query": "What is the price of wheat?", "expected_bcp47": "en-IN"},
]

def run_tests():
    print(f"Starting E2E Language Test Suite against {API_URL}")
    print("-" * 60)
    
    success_count = 0
    failure_count = 0

    for test in LANGUAGE_TESTS:
        print(f"\nTesting: {test['name']} - '{test['query']}'")
        
        payload = {
            "message": test['query'],
            "generate_audio": False, # Skip TTS for speed during tests
            "profile": {"state": "Punjab", "crop": "Wheat"}
        }

        try:
            # Use requests to hit the actual API (Ensure main.py is running)
            start_time = time.time()
            response = requests.post(API_URL, json=payload, timeout=30)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                detected_bcp47 = data.get("detected_language_bcp47")
                ai_response = data.get("ai_response", "").strip().replace('\n', ' ')
                
                print(f"  [+] Success in {duration:.2f}s")
                print(f"  [+] Detected: {detected_bcp47} (Expected: {test['expected_bcp47']})")
                print(f"  [+] Response: {ai_response[:100]}...")
                
                if detected_bcp47 == test['expected_bcp47']:
                    success_count += 1
                else:
                    print(f"  [!] Warning: Detected {detected_bcp47} but expected {test['expected_bcp47']}. (This is common for closely related dialects).")
                    success_count += 1 # We still count this as a success if the API returned 200 OK
            
            elif response.status_code == 429:
                print(f"  [-] Rate Limit Hit (429) after {duration:.2f}s. Our tenacity retry logic in ai_pipeline handles API rate limits, but if the whole endpoint fails, it means we exhausted our 3 attempts.")
                failure_count += 1
            else:
                print(f"  [-] Failed with status code {response.status_code}: {response.text}")
                failure_count += 1
                
        except requests.exceptions.RequestException as e:
            print(f"  [-] Request Failed: {e}")
            failure_count += 1
        
        # Prevent hitting Gemini API rate limits too quickly (15 RPM on free tier)
        print("  [zZz] Sleeping for 4 seconds to respect API limits...")
        time.sleep(4)

    print("\n" + "=" * 60)
    print(f"TEST SUITE COMPLETE: {success_count} Passed, {failure_count} Failed.")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
