from pgvector.sqlalchemy import Vector
from sqlalchemy import Float, cast, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Concept
from app.utils.embeddings import get_embedding

SIMILARITY_THRESHOLD = 0.92
DISTANCE_THRESHOLD = 1 - SIMILARITY_THRESHOLD


async def get_or_create_concept(
    session: AsyncSession,
    stack_id: str,
    name: str,
    description: str,
    domain: str,
) -> Concept:
    embedding = await get_embedding(description)

    distance = Concept.description_embedding.op("<=>", return_type=Float)(cast(embedding, Vector(3072)))
    result = await session.execute(
        select(Concept)
        .where(Concept.stack_id == stack_id, distance <= DISTANCE_THRESHOLD)
        .order_by(distance)
        .limit(1)
    )
    existing = result.scalar_one_or_none()

    if existing is not None:
        if len(name) < len(existing.name):
            existing.name = name
        return existing

    concept = Concept(
        stack_id=stack_id,
        name=name,
        description=description,
        description_embedding=embedding,
        domain=domain,
    )
    session.add(concept)
    return concept
