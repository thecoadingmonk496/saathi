from langchain_core.messages import AIMessage
from ai_pipeline import _normalize_llm_response

def test_plain_string():
    assert _normalize_llm_response("Hello farmer") == "Hello farmer"

def test_aimessage_string():
    msg = AIMessage(content="Hello farmer")
    assert _normalize_llm_response(msg) == "Hello farmer"

def test_aimessage_list_blocks():
    msg = AIMessage(
        content=[
            {"type": "text", "text": "Hello "},
            {"type": "text", "text": "farmer"}
        ]
    )
    assert _normalize_llm_response(msg) == "Hello farmer"

def test_list_containing_text():
    content = [{"type": "text", "text": "Wheat price is "}, "2450"]
    assert _normalize_llm_response(content) == "Wheat price is 2450"

def test_empty_none_response():
    assert _normalize_llm_response("") == ""
    assert _normalize_llm_response(None) == "None"
    assert _normalize_llm_response([]) == ""
    
if __name__ == "__main__":
    test_plain_string()
    test_aimessage_string()
    test_aimessage_list_blocks()
    test_list_containing_text()
    test_empty_none_response()
    print("All normalization tests passed!")
