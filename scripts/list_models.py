import os
import asyncio
from google import genai

async def main():
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    async for m in await client.aio.models.list():
        if "embed" in m.name.lower():
            print(m.name, m.supported_actions)

asyncio.run(main())