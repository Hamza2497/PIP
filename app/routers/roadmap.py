import json
import re

from fastapi import APIRouter, Depends, HTTPException
from google.genai import types
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.enums import ConceptPhase
from app.models import Concept, ConceptPrerequisite, Project, ProjectConcept, Stack, User
from app.prompts import ROADMAP_SYSTEM_PROMPT
from app.routers.chat import _client
from app.session import get_current_user
from app.utils.embeddings import get_embedding
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
    vocabulary_result = await session.execute(
        select(Concept.name).join(Stack, Concept.stack_id == Stack.id).where(Stack.user_id == user.id)
    )
    vocabulary = sorted({name for name in vocabulary_result.scalars().all()})

    user_message = (
        f"Project plan:\n{body.plan}\n\n"
        f"Existing concept vocabulary: {', '.join(vocabulary) if vocabulary else 'none'}"
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

    try:
        data = _parse_json(response.text)
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=502, detail=f"Failed to parse roadmap response: {e}")

    stack_name = data["stack_name"]
    concepts_data = data["concepts"]

    stack = Stack(user_id=user.id, name=stack_name)
    session.add(stack)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        result = await session.execute(
            select(Stack).where(Stack.user_id == user.id, Stack.name == stack_name)
        )
        stack = result.scalar_one()

    name_to_concept: dict[str, Concept] = {}
    for concept_data in concepts_data:
        name = concept_data["name"]
        result = await session.execute(
            select(Concept).where(
                Concept.stack_id == stack.id,
                func.lower(Concept.name) == name.lower(),
            )
        )
        concept = result.scalar_one_or_none()
        if concept is None:
            embedding = await get_embedding(concept_data["description"])
            concept = Concept(
                stack_id=stack.id,
                name=name,
                description=concept_data["description"],
                description_embedding=embedding,
                domain=concept_data["domain"],
            )
            session.add(concept)
        name_to_concept[name] = concept

    await session.flush()

    concept_ids = [concept.id for concept in name_to_concept.values()]
    await session.execute(
        delete(ConceptPrerequisite).where(ConceptPrerequisite.concept_id.in_(concept_ids))
    )

    prerequisite_pairs: list[tuple[str, str]] = []
    for concept_data in concepts_data:
        concept = name_to_concept[concept_data["name"]]
        for prerequisite_name in concept_data.get("prerequisites", []):
            prerequisite_concept = name_to_concept.get(prerequisite_name)
            if prerequisite_concept is None:
                continue
            session.add(
                ConceptPrerequisite(concept_id=concept.id, prerequisite_id=prerequisite_concept.id)
            )
            prerequisite_pairs.append((str(concept.id), str(prerequisite_concept.id)))

    id_to_concept = {str(concept.id): concept for concept in name_to_concept.values()}

    try:
        sorted_ids = topological_sort(list(id_to_concept.keys()), prerequisite_pairs)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    project = Project(user_id=user.id, stack_id=stack.id, plan=body.plan, status="active")
    session.add(project)
    await session.flush()

    for index, concept_id in enumerate(sorted_ids):
        session.add(
            ProjectConcept(
                project_id=project.id,
                concept_id=id_to_concept[concept_id].id,
                order_index=index,
                phase=ConceptPhase.ORIENTING,
            )
        )

    mermaid_lines = ["graph TD"]
    concepts_with_edges: set[str] = set()
    for concept_data in concepts_data:
        concept = name_to_concept[concept_data["name"]]
        for prerequisite_name in concept_data.get("prerequisites", []):
            prerequisite_concept = name_to_concept.get(prerequisite_name)
            if prerequisite_concept is None:
                continue
            mermaid_lines.append(f'    "{prerequisite_concept.name}" --> "{concept.name}"')
            concepts_with_edges.add(concept.name)
            concepts_with_edges.add(prerequisite_concept.name)

    for concept_data in concepts_data:
        name = concept_data["name"]
        if name not in concepts_with_edges:
            mermaid_lines.append(f'    "{name}"')

    mermaid_diagram = "\n".join(mermaid_lines)

    await session.commit()

    return {
        "project_id": str(project.id),
        "stack_name": stack.name,
        "mermaid_diagram": mermaid_diagram,
        "concepts": [
            {
                "id": str(id_to_concept[concept_id].id),
                "name": id_to_concept[concept_id].name,
                "domain": id_to_concept[concept_id].domain,
                "order_index": index,
            }
            for index, concept_id in enumerate(sorted_ids)
        ],
    }
