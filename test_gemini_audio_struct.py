import os
import requests
import json
from dotenv import load_dotenv
load_dotenv()

dummy_wav_base64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
api_key = os.getenv("GOOGLE_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={api_key}"

data = {
    "contents": [{
        "parts": [
            {"text": "Transcribe the speech in this audio exactly in its original language. Also detect the language."},
            {"inlineData": {"mimeType": "audio/wav", "data": dummy_wav_base64}}
        ]
    }],
    "generationConfig": {
        "responseMimeType": "application/json",
        "responseSchema": {
            "type": "object",
            "properties": {
                "transcript": {"type": "string", "description": "The transcribed text in its original language"},
                "language_name": {"type": "string", "description": "The name of the detected language, e.g. English, Hindi, Tamil"},
                "language_code": {"type": "string", "description": "The ISO 639-1 code of the detected language, e.g. en, hi, ta"},
                "confidence": {"type": "number", "description": "Confidence score between 0 and 1"}
            },
            "required": ["transcript", "language_name", "language_code", "confidence"]
        }
    }
}
res = requests.post(url, json=data)
print(res.status_code)
print(res.text)
