import os
import base64
from dotenv import load_dotenv
load_dotenv()
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

# Create a simple valid wav file for testing (e.g. silence)
# In practice we'd want actual speech, but let's just see if the API accepts it.
dummy_wav_base64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="

llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite", temperature=0)

msg = HumanMessage(
    content=[
        {"type": "text", "text": "Transcribe the speech in this audio exactly. If no speech, say 'No speech'."},
        {"type": "image_url", "image_url": {"url": f"data:audio/wav;base64,{dummy_wav_base64}"}}
    ]
)
try:
    res = llm.invoke([msg])
    print("Result:", res.content)
except Exception as e:
    print("Error:", e)
