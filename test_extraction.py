import asyncio
from ai_pipeline import run_ai_pipeline

async def test():
    profile = {"state": "punjab", "district": "ludhiana", "soil": "clay", "crop": "cotton"}
    resp = run_ai_pipeline(
        "kya gehun ka price Gorakhpur mein hai?",
        history=[],
        profile=profile
    )
    print("FINAL RESPONSE:", resp)

if __name__ == "__main__":
    asyncio.run(test())
