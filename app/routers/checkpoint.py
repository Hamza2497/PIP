import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from google.genai import types
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.checkpoint_agent import generate_checkpoint, generate_orient, score_answer
from app.database import AsyncSessionLocal, get_db
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


# ---------------------------------------------------------------------------
# Step 9 endpoints
# ---------------------------------------------------------------------------

async def _get_project_concept_for_user(
    project_concept_id: str,
    user_id: object,
    session: AsyncSession,
):
    result = await session.execute(
        select(ProjectConcept).where(ProjectConcept.id == project_concept_id)
    )
    pc = result.scalar_one_or_none()
    if pc is None:
        raise HTTPException(status_code=404)

    result = await session.execute(select(Project).where(Project.id == pc.project_id))
    project = result.scalar_one()
    if project.user_id != user_id:
        raise HTTPException(status_code=403)

    result = await session.execute(select(Concept).where(Concept.id == pc.concept_id))
    concept = result.scalar_one()

    return pc, project, concept


@router.get("/checkpoint/orient/{project_concept_id}")
async def orient(
    project_concept_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    pc, project, concept = await _get_project_concept_for_user(project_concept_id, user.id, session)

    if pc.phase != ConceptPhase.PENDING:
        raise HTTPException(status_code=400, detail="already started")

    pc.phase = ConceptPhase.ORIENTING
    await session.commit()

    pc_id = pc.id
    project_id = project.id
    concept_id = concept.id
    concept_name = concept.name
    concept_description = concept.description
    what_to_build = pc.what_to_build or ""

    async def stream():
        full_text: list[str] = []
        handoff_sentence = ""

        async for chunk in generate_orient(concept_name, concept_description, what_to_build):
            yield chunk
            try:
                data = json.loads(chunk[6:].strip())
                if data["type"] == "text":
                    full_text.append(data["content"])
                elif data["type"] == "handoff":
                    handoff_sentence = data["sentence"]
                elif data["type"] == "done":
                    async with AsyncSessionLocal() as gen_session:
                        pc_obj = await gen_session.get(ProjectConcept, pc_id)
                        pc_obj.phase = ConceptPhase.IN_PROGRESS
                        gen_session.add(BuildJournal(
                            project_id=project_id,
                            concept_id=concept_id,
                            phase=ConceptPhase.ORIENTING,
                            content=json.dumps({
                                "orient_text": "".join(full_text),
                                "handoff_sentence": handoff_sentence,
                            }),
                        ))
                        await gen_session.commit()
            except Exception:
                pass

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/checkpoint/journal/{project_concept_id}")
async def get_journal(
    project_concept_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    pc, project, concept = await _get_project_concept_for_user(project_concept_id, user.id, session)

    result = await session.execute(
        select(BuildJournal)
        .where(
            BuildJournal.project_id == project.id,
            BuildJournal.concept_id == concept.id,
        )
        .order_by(BuildJournal.created_at.asc())
    )
    entries = result.scalars().all()

    return {
        "entries": [
            {
                "phase": entry.phase.value,
                "content": json.loads(entry.content),
                "created_at": entry.created_at.isoformat(),
            }
            for entry in entries
        ]
    }


class SubmitRequest(BaseModel):
    claude_code_output: str


@router.post("/checkpoint/submit/{project_concept_id}")
async def submit(
    project_concept_id: str,
    body: SubmitRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    pc, project, concept = await _get_project_concept_for_user(project_concept_id, user.id, session)

    if pc.phase != ConceptPhase.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="not in progress")

    pc.phase = ConceptPhase.CHECKPOINTING
    await session.commit()

    pc_id = pc.id
    project_id = project.id
    concept_id = concept.id
    concept_name = concept.name
    concept_description = concept.description
    claude_code_output = body.claude_code_output

    async def stream():
        yield f'data: {json.dumps({"type": "phase_change", "phase": "CHECKPOINTING"})}\n\n'

        full_text: list[str] = []
        question_text = ""

        async for chunk in generate_checkpoint(concept_name, concept_description, claude_code_output):
            yield chunk
            try:
                data = json.loads(chunk[6:].strip())
                if data["type"] == "text":
                    full_text.append(data["content"])
                elif data["type"] == "question":
                    question_text = data["text"]
                elif data["type"] == "done":
                    async with AsyncSessionLocal() as gen_session:
                        gen_session.add(BuildJournal(
                            project_id=project_id,
                            concept_id=concept_id,
                            phase=ConceptPhase.CHECKPOINTING,
                            content=json.dumps({
                                "claude_code_output": claude_code_output,
                                "teaching_note": "".join(full_text),
                                "question": question_text,
                            }),
                        ))
                        await gen_session.commit()
            except Exception:
                pass

    return StreamingResponse(stream(), media_type="text/event-stream")


class AnswerRequest(BaseModel):
    question: str
    answer: str


@router.post("/checkpoint/answer/{project_concept_id}")
async def answer(
    project_concept_id: str,
    body: AnswerRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    pc, project, concept = await _get_project_concept_for_user(project_concept_id, user.id, session)

    if pc.phase != ConceptPhase.CHECKPOINTING:
        raise HTTPException(status_code=400, detail="not in checkpointing")

    result_data = await score_answer(concept.name, body.question, body.answer)
    score = result_data["score"]
    feedback = result_data["feedback"]

    # Upsert user_concepts
    result = await session.execute(
        select(UserConcept).where(
            UserConcept.user_id == user.id,
            UserConcept.concept_id == concept.id,
        )
    )
    user_concept = result.scalar_one_or_none()

    if user_concept is None:
        new_confidence = score
        user_concept = UserConcept(
            user_id=user.id,
            concept_id=concept.id,
            confidence=new_confidence,
        )
        session.add(user_concept)
    else:
        new_confidence = round((user_concept.confidence * 1 + score * 2) / 3)
        user_concept.confidence = new_confidence

    user_concept.status = (
        ConceptStatus.MASTERED if new_confidence >= 4 else ConceptStatus.IN_PROGRESS
    )
    user_concept.last_updated = datetime.now(timezone.utc)

    # Update phase and write journal
    pc.phase = ConceptPhase.COMPLETE
    session.add(BuildJournal(
        project_id=project.id,
        concept_id=concept.id,
        phase=ConceptPhase.COMPLETE,
        content=json.dumps({
            "question": body.question,
            "answer": body.answer,
            "score": score,
            "feedback": feedback,
        }),
    ))
    await session.commit()

    async def stream():
        yield f'data: {json.dumps({"type": "score", "confidence": score, "feedback": feedback})}\n\n'
        yield f'data: {json.dumps({"type": "phase_change", "phase": "COMPLETE"})}\n\n'
        yield f'data: {json.dumps({"type": "done"})}\n\n'

    return StreamingResponse(stream(), media_type="text/event-stream")
