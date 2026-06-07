from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Skill, User
from app.services.matching import on_skill_added
from app.session import get_current_user

router = APIRouter()


class SkillIn(BaseModel):
    name: str
    confidence: int

    @field_validator("confidence")
    @classmethod
    def confidence_in_range(cls, value: int) -> int:
        if not 1 <= value <= 5:
            raise ValueError("confidence must be between 1 and 5")
        return value


@router.get("/skills")
async def list_skills(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(select(Skill).where(Skill.user_id == user.id))
    skills = result.scalars().all()
    return [
        {
            "id": str(skill.id),
            "name": skill.name,
            "confidence": skill.confidence,
            "last_updated": skill.last_updated,
        }
        for skill in skills
    ]


@router.post("/skills")
async def create_skill(
    body: SkillIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    skill = Skill(user_id=user.id, name=body.name, confidence=body.confidence)
    session.add(skill)
    await session.commit()
    await on_skill_added(skill, user.id, session)
    return {
        "id": str(skill.id),
        "name": skill.name,
        "confidence": skill.confidence,
        "last_updated": skill.last_updated,
    }
