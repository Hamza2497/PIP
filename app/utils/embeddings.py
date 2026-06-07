from app.routers.chat import _client


async def get_embedding(text: str) -> list[float]:
    response = await _client.aio.models.embed_content(
        model="models/text-embedding-004", contents=text
    )
    return list(response.embeddings[0].values)
