import os
from dotenv import load_dotenv
load_dotenv()
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite", api_key=api_key)

class LanguageDetection(BaseModel):
    language_code: str = Field(description="ISO 639-1 code (e.g., 'hi', 'en')")
    language_name: str = Field(description="Full language name (e.g., 'Hindi', 'English')")

structured_llm = llm.with_structured_output(LanguageDetection)

def detect(text):
    prompt = f"""Analyze the language of the following text: "{text}"
If it contains a mix of English and an Indian language (including transliterated/Romanized Hindi), identify the Indian language.
"""
    try:
        res = structured_llm.invoke([HumanMessage(content=prompt)])
        print(f"Text: '{text}' -> {res}")
    except Exception as e:
        print(f"Error: {e}")

detect("gehun ka rate kya chal raha hai")
detect("What is the price of wheat?")
detect("गेहूं का price क्या है?")
