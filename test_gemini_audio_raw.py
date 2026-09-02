import os
import requests
from dotenv import load_dotenv
load_dotenv()

dummy_wav_base64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
api_key = os.getenv("GOOGLE_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={api_key}"

data = {
    "contents": [{
        "parts": [
            {"text": "Transcribe the speech in this audio exactly. If no speech, say 'No speech'."},
            {"inlineData": {"mimeType": "audio/wav", "data": dummy_wav_base64}}
        ]
    }]
}
res = requests.post(url, json=data)
print(res.status_code)
print(res.text)
