import pytest
import os
import json
from dotenv import load_dotenv
load_dotenv(override=True)
from fastapi.testclient import TestClient
import time
from main import app

client = TestClient(app)

# Load comprehensive language test cases
with open("tests/saathi_language_tests.json", "r", encoding="utf-8") as f:
    language_tests = json.load(f)

# --------------------------------------------------
# A. COMPREHENSIVE TEXT LANGUAGE TESTS
# --------------------------------------------------
@pytest.mark.parametrize("test_case", language_tests)
def test_text_languages(test_case):
    start = time.time()
    response = client.post("/chat", json={"message": test_case["input"]})
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert data["status"] == "success"
    assert "ai_response" in data
    
    # Verify detection
    detected_code = data["detected_language_bcp47"]
    expected_code = test_case["expected_bcp47"]
    assert expected_code == detected_code, f"Expected BCP-47 {expected_code}, got {detected_code}"
    
    # Response time logging
    duration = time.time() - start
    print(f"[{test_case['id']}] duration: {duration:.2f}s")


# --------------------------------------------------
# B. LANGUAGE SWITCHING TESTS
# --------------------------------------------------
def test_language_switching_s03():
    # S03 — English → Tamil → English
    history = []
    
    # Turn 1
    res1 = client.post("/chat", json={"message": "What is the price of rice?", "history": history})
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["detected_language_bcp47"] == "en-IN"
    history.extend([
        {"role": "user", "content": "What is the price of rice?"},
        {"role": "assistant", "content": d1["ai_response"]}
    ])
    
    # Turn 2
    res2 = client.post("/chat", json={"message": "நெல்லின் விலை என்ன?", "history": history})
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["detected_language_bcp47"] == "ta-IN"
    history.extend([
        {"role": "user", "content": "நெல்லின் விலை என்ன?"},
        {"role": "assistant", "content": d2["ai_response"]}
    ])
    
    # Turn 3
    res3 = client.post("/chat", json={"message": "What is the price of wheat?", "history": history})
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["detected_language_bcp47"] == "en-IN"


# --------------------------------------------------
# G. MANDI TOOL TESTS
# --------------------------------------------------
def test_mandi_tool_m01():
    # M01
    response = client.post("/chat", json={"message": "What is the price of wheat?"})
    assert response.status_code == 200
    resp_text = response.json()["ai_response"].lower()
    assert "wheat" in resp_text or "price" in resp_text or "rs" in resp_text or "rupee" in resp_text


def test_mandi_tool_m02():
    # M02
    response = client.post("/chat", json={"message": "गेहूँ का आज का भाव क्या है?"})
    assert response.status_code == 200
    resp_text = response.json()["ai_response"]
    assert "भाव" in resp_text or "रुपये" in resp_text or "रु" in resp_text


# --------------------------------------------------
# H. FARMER PROFILE TESTS
# --------------------------------------------------
def test_farmer_profile_p01():
    # P01 - Profile must not override language
    profile = {
        "state": "Punjab",
        "district": "Ludhiana",
        "crop": "Wheat",
        "soilType": "Alluvial"
    }
    
    # English
    r1 = client.post("/chat", json={"message": "What should I do for my crop?", "profile": profile})
    assert r1.status_code == 200
    assert r1.json()["detected_language_bcp47"] == "en-IN"
    
    # Hindi
    r2 = client.post("/chat", json={"message": "मेरी फसल के लिए क्या करना चाहिए?", "profile": profile})
    assert r2.status_code == 200
    assert r2.json()["detected_language_bcp47"] == "hi-IN"


# --------------------------------------------------
# I. EMPTY / INVALID INPUT TESTS
# --------------------------------------------------
def test_empty_input_e01():
    # E01
    response = client.post("/chat", json={"message": "  "})
    assert response.status_code == 400


# --------------------------------------------------
# J. TTS ENDPOINT TEST
# --------------------------------------------------
def test_tts_endpoint():
    response = client.post("/tts", json={"text": "Hello, how are you?", "language_code": "en-IN"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "audio_base64" in data
    assert len(data["audio_base64"]) > 0

