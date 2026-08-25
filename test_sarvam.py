import os
from dotenv import load_dotenv
import requests

load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

headers = {
    "api-subscription-key": SARVAM_API_KEY.strip(),
    "Content-Type": "application/json"
}

payload = {
    "inputs": ["Hello, this is Saathi AI."],
    "target_language_code": "en-IN",
    "speaker": "shubh",
    "model": "bulbul:v3",
    "pace": 1.0,
    "speech_sample_rate": 8000,
    "enable_preprocessing": True
}

print("Sending request to Sarvam TTS...")
response = requests.post(SARVAM_TTS_URL, headers=headers, json=payload)
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print(f"Response: Success! Audio length: {len(response.json().get('audios', [''])[0])}")
else:
    print(f"Response: {response.text}")
