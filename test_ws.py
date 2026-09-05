import asyncio
import websockets
import json

async def test():
    uri = 'wss://saathi-backend-7t91.onrender.com/ws/voice'
    async with websockets.connect(uri) as websocket:
        payload = {
            'action': 'text',
            'query': 'tell me price of onion in Goa',
            'profile': {'state': 'Goa', 'district': 'North Goa', 'crop': 'onion'}
        }
        await websocket.send(json.dumps(payload))
        print('Sent payload.')
        response = await websocket.recv()
        data = json.loads(response)
        print('AI response:', data.get('ai_response'))

asyncio.run(test())
