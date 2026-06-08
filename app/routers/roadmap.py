import json
import re

from fastapi import APIRouter, Depends, HTTPException
from google.genai import types
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.enums import ConceptPhase
from app.models import Concept, ConceptPrerequisite, Project, ProjectConcept, Stack, User
from app.prompts import ROADMAP_SYSTEM_PROMPT
from app.routers.chat import _client
from app.services.concepts import get_or_create_concept
from app.session import get_current_user
from app.utils.graph import topological_sort

router = APIRouter()


class RoadmapRequest(BaseModel):
    plan: str


def _parse_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in response")
    return json.loads(match.group(0))


@router.post("/roadmap")
async def create_roadmap(
    body: RoadmapRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    # 1. Load existing concept vocabulary so Gemini can reuse names instead of inventing synonyms.
    result = await session.execute(
        select(Concept.name)
        .join(Stack, Stack.id == Concept.stack_id)
        .where(Stack.user_id == user.id)
    )
    existing_names = result.scalars().all()

    # 2. Call Gemini for the roadmap.
    user_message = (
        f"Project plan:\n{body.plan}\n\n"
        f"Existing concept vocabulary:\n{chr(10).join(existing_names) if existing_names else ''}"
    )

    try:
        response = await _client.aio.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=ROADMAP_SYSTEM_PROMPT,
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    # 3. Parse the response.
    try:
        data = _parse_json(response.text)
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=502, detail=f"Failed to parse roadmap response: {e}")

    stack_name = data["stack_name"]
    concepts_data = data["concepts"]

    # 4. Upsert the stack (case-insensitive lookup by name).
    result = await session.execute(
        select(Stack).where(Stack.user_id == user.id, func.lower(Stack.name) == stack_name.lower())
    )
    stack = result.scalar_one_or_none()
    if stack is None:
        stack = Stack(user_id=user.id, name=stack_name)
        session.add(stack)
    await session.flush()

    # 5. Concept loop — get_or_create_concept handles embedding-similarity dedup.
    name_to_concept: dict[str, Concept] = {}
    for concept_data in concepts_data:
        name = concept_data["name"]
        concept = await get_or_create_concept(
            session,
            stack_id=stack.id,
            name=name,
            description=concept_data["description"],
            domain=concept_data["domain"],
        )
        name_to_concept[name] = concept

    await session.flush()

    # 6. Prerequisite wiring — replace the existing edges for these concepts with fresh ones.
    concept_ids_all = [concept.id for concept in name_to_concept.values()]
    await session.execute(
        delete(ConceptPrerequisite).where(ConceptPrerequisite.concept_id.in_(concept_ids_all))
    )

    prerequisites: list[tuple] = []
    for concept_data in concepts_data:
        concept = name_to_concept[concept_data["name"]]
        for prerequisite_name in concept_data.get("prerequisites", []):
            prerequisite = name_to_concept.get(prerequisite_name)
            if prerequisite is None:
                continue
            session.add(ConceptPrerequisite(concept_id=concept.id, prerequisite_id=prerequisite.id))
            prerequisites.append((concept.id, prerequisite.id))

    # 7. Topological sort.
    concept_ids = [concept.id for concept in name_to_concept.values()]
    try:
        sorted_ids = topological_sort(concept_ids, prerequisites)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # 8. Create Project and ProjectConcept rows.
    project = Project(user_id=user.id, stack_id=stack.id, plan=body.plan, status="active")
    session.add(project)
    await session.flush()  # need project.id

    for order_index, concept_id in enumerate(sorted_ids):
        session.add(
            ProjectConcept(
                project_id=project.id,
                concept_id=concept_id,
                order_index=order_index,
                phase=ConceptPhase.ORIENTING,
            )
        )

    # 9. Generate the Mermaid diagram — node IDs are UUIDs with hyphens stripped.
    id_to_name = {concept.id: concept.name for concept in name_to_concept.values()}

    mermaid_lines = ["graph TD"]
    for concept_id, name in id_to_name.items():
        mermaid_lines.append(f'    {str(concept_id).replace("-", "")}["{name}"]')
    for concept_id, prerequisite_id in prerequisites:
        mermaid_lines.append(
            f'    {str(prerequisite_id).replace("-", "")} --> {str(concept_id).replace("-", "")}'
        )

    mermaid = "\n".join(mermaid_lines)

    # 10. Commit.
    await session.commit()

    # 11. Return.
    return {
        "project_id": project.id,
        "stack_name": stack.name,
        "mermaid_diagram": mermaid,
        "concepts": [
            {"id": cid, "name": id_to_name[cid], "phase": ConceptPhase.ORIENTING.value}
            for cid in sorted_ids
        ],
    }
