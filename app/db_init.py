from app.database import Base, engine
from app.models import User, Stack, Concept, ConceptPrerequisite, OverruledPrerequisite, UserConcept, Project, ProjectConcept, BuildJournal, ApiKey  # noqa: F401


async def create_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
