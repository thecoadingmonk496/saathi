import requests

url = "http://127.0.0.1:8000/chat"

def test(msg):
    try:
        r = requests.post(url, json={"message": msg, "generate_audio": False})
        print(f"User: {msg}\nStatus: {r.status_code}\nRes: {r.json()}\n")
    except Exception as e:
        print(f"Error: {e}")

test("What is the price of wheat?")
test("गेहूँ का भाव क्या है?")
test("gehun ka rate kya chal raha hai")
