import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from google.genai import types
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.enums import ConceptPhase, ConceptStatus
from app.models import BuildJournal, Concept, Project, ProjectConcept, User, UserConcept
from app.prompts import CHECKPOINT_SYSTEM_PROMPT
from app.routers.chat import _client
from app.session import get_current_user

router = APIRouter()


class CheckpointMessage(BaseModel):
    project_concept_id: str
    message: str


@router.post("/checkpoint")
async def checkpoint(
    body: CheckpointMessage,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(ProjectConcept).where(ProjectConcept.id == body.project_concept_id)
    )
    project_concept = result.scalar_one_or_none()
    if project_concept is None:
        raise HTTPException(status_code=404)

    result = await session.execute(select(Project).where(Project.id == project_concept.project_id))
    project = result.scalar_one()
    if project.user_id != user.id:
        raise HTTPException(status_code=403)

    result = await session.execute(select(Concept).where(Concept.id == project_concept.concept_id))
    concept = result.scalar_one()

    result = await session.execute(
        select(BuildJournal)
        .where(
            BuildJournal.project_id == project.id,
            BuildJournal.concept_id == concept.id,
        )
        .order_by(BuildJournal.created_at.desc())
        .limit(10)
    )
    journal_entries = list(reversed(result.scalars().all()))

    history = []
    for entry in journal_entries:
        parsed = json.loads(entry.content)
        history.append(types.Content(role=parsed["role"], parts=[types.Part(text=parsed["text"])]))

    history.append(types.Content(role="user", parts=[types.Part(text=body.message)]))

    system_instruction = (
        f"{CHECKPOINT_SYSTEM_PROMPT}\n\n"
        f"Current concept: {concept.name}\n"
        f"Domain: {concept.domain}\n"
        f"Description: {concept.description}\n"
        f"Current phase: {project_concept.phase.value}"
    )

    try:
        response = await _client.aio.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=history,
            config=types.GenerateContentConfig(system_instruction=system_instruction),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    reply_text = response.text

    session.add(
        BuildJournal(
            project_id=project.id,
            concept_id=concept.id,
            phase=project_concept.phase,
            content=json.dumps({"role": "user", "text": body.message}),
        )
    )
    session.add(
        BuildJournal(
            project_id=project.id,
            concept_id=concept.id,
            phase=project_concept.phase,
            content=json.dumps({"role": "model", "text": reply_text}),
        )
    )

    current_phase = project_concept.phase
    if current_phase == ConceptPhase.ORIENTING:
        new_phase = ConceptPhase.TEACHING
    elif current_phase == ConceptPhase.TEACHING:
        new_phase = (
            ConceptPhase.AWAITING_CODE_RETURN
            if "Ready for the execution prompt" in reply_text
            else current_phase
        )
    elif current_phase == ConceptPhase.AWAITING_CODE_RETURN:
        new_phase = ConceptPhase.DEBRIEFING
    elif current_phase == ConceptPhase.DEBRIEFING:
        new_phase = (
            ConceptPhase.CHECKPOINTING if "Checkpoint complete" in reply_text else current_phase
        )
    else:
        new_phase = current_phase

    if new_phase == ConceptPhase.CHECKPOINTING:
        new_phase = ConceptPhase.COMPLETE

    project_concept.phase = new_phase

    if new_phase == ConceptPhase.COMPLETE:
        result = await session.execute(
            select(UserConcept).where(
                UserConcept.user_id == user.id, UserConcept.concept_id == concept.id
            )
        )
        user_concept = result.scalar_one_or_none()

        if user_concept is None:
            confidence = min(5, 0 + 1)
            user_concept = UserConcept(user_id=user.id, concept_id=concept.id, confidence=confidence)
            session.add(user_concept)
        else:
            incremented = min(5, user_concept.confidence + 1)
            confidence = round((user_concept.confidence + incremented) / 2)
            user_concept.confidence = confidence

        user_concept.status = (
            ConceptStatus.MASTERED if confidence >= 4 else ConceptStatus.IN_PROGRESS
        )
        user_concept.last_updated = datetime.now(timezone.utc)

    await session.commit()

    return {
        "response": reply_text,
        "phase": new_phase.value,
        "concept_name": concept.name,
    }
