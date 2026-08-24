import pytest
import os
from dotenv import load_dotenv
load_dotenv()
from language_utils import detect_language

@pytest.mark.parametrize("test_id, query, expected_lang", [
    ("T1", "व्हाट इस प्राइस ऑफ़ वीट", "en"),
    ("T2", "व्हाट इस द प्राइस ऑफ़ राइस", "en"),
    ("T3", "गेहूं का भाव क्या है?", "hi"),
    ("T4", "gehu ka bhav kya hai", "hi"), # Will hit Gemini and come out as Hindi
    ("T5", "தக்காளி விலை என்ன?", "ta"),
    ("T6", "what is the price of wheat", "en"),
    ("T8", "प्राइस?", "en"),
    ("T9", "गेहूं का price", "hi"),
    ("T10", "wheat price today", "en"),
    ("T11", "আজ গমের দাম কত?", "bn"),
    ("T12", "گندم کی قیمت کیا ہے؟", "ur"),
])
def test_detect_language(test_id, query, expected_lang):
    result = detect_language(query)
    assert result['language_code'] == expected_lang, f"Failed {test_id}: expected {expected_lang}, got {result['language_code']}"

