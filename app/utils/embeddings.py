import os

from google import genai

_embed_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


async def get_embedding(text: str) -> list[float]:
    response = await _embed_client.aio.models.embed_content(
        model="gemini-embedding-2",
        contents=text,
    )
    return list(response.embeddings[0].values)