import json
import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from google.genai import types
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.roadmap_agent import (
    annotate_plan,
    generate_concept_tree,
    generate_mermaid,
    identify_stacks,
)
from app.database import AsyncSessionLocal, get_db
from app.enums import ConceptPhase
from app.models import Concept, ConceptPrerequisite, Project, ProjectConcept, Stack, User, UserConcept
from app.prompts import ROADMAP_SYSTEM_PROMPT
from app.routers.chat import _client
from app.services.concepts import get_or_create_concept
from app.session import get_current_user
from app.utils.graph import topological_sort

router = APIRouter()


class RoadmapRequest(BaseModel):
    plan: str


@router.get("/projects")
async def get_projects(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Project, Stack)
        .join(Stack, Stack.id == Project.stack_id)
        .where(Project.user_id == user.id)
        .order_by(Project.created_at.desc())
    )
    rows = result.all()

    projects = []
    for project, stack in rows:
        result2 = await session.execute(
            select(ProjectConcept).where(ProjectConcept.project_id == project.id)
        )
        pcs = result2.scalars().all()
        total = len(pcs)
        mastered = sum(1 for pc in pcs if pc.phase == ConceptPhase.COMPLETE)
        projects.append({
            "id": str(project.id),
            "name": project.name or stack.name,
            "status": project.status,
            "total_concepts": total,
            "mastered_concepts": mastered,
            "created_at": project.created_at.isoformat(),
        })

    return projects


@router.get("/project/{project_id}")
async def get_project(
    project_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404)

    result = await session.execute(select(Stack).where(Stack.id == project.stack_id))
    stack = result.scalar_one()

    result = await session.execute(
        select(ProjectConcept)
        .where(ProjectConcept.project_id == project.id)
        .order_by(ProjectConcept.order_index)
    )
    project_concepts = result.scalars().all()

    concept_ids = [pc.concept_id for pc in project_concepts]
    result = await session.execute(select(Concept).where(Concept.id.in_(concept_ids)))
    concepts_map = {c.id: c for c in result.scalars().all()}

    result = await session.execute(
        select(ConceptPrerequisite).where(ConceptPrerequisite.concept_id.in_(concept_ids))
    )
    prereq_rows = result.scalars().all()

    concept_to_pc = {pc.concept_id: pc for pc in project_concepts}
    pc_prereqs: dict[str, list[str]] = {}
    for p in prereq_rows:
        if p.prerequisite_id in concept_to_pc:
            pc_id = str(concept_to_pc[p.concept_id].id)
            prereq_pc_id = str(concept_to_pc[p.prerequisite_id].id)
            pc_prereqs.setdefault(pc_id, []).append(prereq_pc_id)

    complete_pc_ids = {str(pc.id) for pc in project_concepts if pc.phase == ConceptPhase.COMPLETE}

    active_pc = None
    for pc in project_concepts:
        if pc.phase != ConceptPhase.COMPLETE:
            active_pc = pc
            break

    def get_state(pc: ProjectConcept) -> str:
        if pc.phase == ConceptPhase.COMPLETE:
            return "mastered"
        if pc == active_pc:
            if pc.phase != ConceptPhase.ORIENTING:
                return "in_progress"
            return "active"
        pc_id = str(pc.id)
        for prereq_id in pc_prereqs.get(pc_id, []):
            if prereq_id not in complete_pc_ids:
                return "locked"
        return "ready"

    result = await session.execute(
        select(UserConcept).where(
            UserConcept.user_id == user.id,
            UserConcept.concept_id.in_(concept_ids),
        )
    )
    user_concepts = {uc.concept_id: uc for uc in result.scalars().all()}

    return {
        "id": str(project.id),
        "name": project.name or stack.name,
        "annotated_plan": project.annotated_plan,
        "concepts": [
            {
                "id": str(pc.id),
                "concept_id": str(pc.concept_id),
                "label": concepts_map[pc.concept_id].name,
                "state": get_state(pc),
                "confidence": user_concepts[pc.concept_id].confidence if pc.concept_id in user_concepts else None,
                "prereqs": pc_prereqs.get(str(pc.id), []),
                "order_index": pc.order_index,
                "phase": pc.phase.value,
                "what_to_build": pc.what_to_build,
            }
            for pc in project_concepts
        ],
    }


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

    # 6. Prerequisite wiring — additive only, skip rows that already exist.
    prerequisites: list[tuple] = []
    for concept_data in concepts_data:
        concept = name_to_concept[concept_data["name"]]
        for prereq_name in concept_data.get("prerequisites", []):
            prereq = name_to_concept.get(prereq_name)
            if prereq is None:
                continue
            stmt = (
                pg_insert(ConceptPrerequisite)
                .values(concept_id=concept.id, prerequisite_id=prereq.id)
                .on_conflict_do_nothing()
            )
            await session.execute(stmt)
            prerequisites.append((concept.id, prereq.id))

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


@router.post("/project/{project_id}/concept/{project_concept_id}/master")
async def master_concept(
    project_id: str,
    project_concept_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404)

    result = await session.execute(
        select(ProjectConcept).where(
            ProjectConcept.id == project_concept_id,
            ProjectConcept.project_id == project.id,
        )
    )
    pc = result.scalar_one_or_none()
    if pc is None:
        raise HTTPException(status_code=404)

    pc.phase = ConceptPhase.COMPLETE
    await session.commit()
    return {"ok": True}


class IdentifyStacksRequest(BaseModel):
    plan: str


class GenerateRoadmapRequest(BaseModel):
    plan: str
    project_name: str
    confirmed_stacks: list[str]


@router.post("/roadmap/identify-stacks")
async def roadmap_identify_stacks(
    body: IdentifyStacksRequest,
    user: User = Depends(get_current_user),
):
    stacks = await identify_stacks(body.plan)
    return {"stacks": stacks}


@router.post("/roadmap/generate")
async def roadmap_generate(
    body: GenerateRoadmapRequest,
    user: User = Depends(get_current_user),
):
    plan = body.plan
    project_name = body.project_name
    confirmed_stacks = body.confirmed_stacks
    user_id = user.id

    async def generate():
        try:
            async with AsyncSessionLocal() as session:
                # 1. Upsert stacks
                stack_records: dict[str, object] = {}
                for stack_name in confirmed_stacks:
                    result = await session.execute(
                        select(Stack).where(
                            Stack.user_id == user_id,
                            func.lower(Stack.name) == stack_name.lower(),
                        )
                    )
                    stack = result.scalar_one_or_none()
                    if stack is None:
                        stack = Stack(user_id=user_id, name=stack_name)
                        session.add(stack)
                        await session.flush()
                    stack_records[stack_name] = stack

                primary_stack_id = stack_records[confirmed_stacks[0]].id

                # 2. Create project
                project = Project(
                    user_id=user_id,
                    stack_id=primary_stack_id,
                    name=project_name,
                    plan=plan,
                    status="active",
                )
                session.add(project)
                await session.flush()

                # 3. Generate concept trees
                all_raw_concepts: list[tuple[str, dict]] = []
                accumulated_names: list[str] = []
                for stack_name in confirmed_stacks:
                    yield f'data: {json.dumps({"type": "text", "content": f"Generating concept tree for {stack_name}..."})}\n\n'
                    raw = await generate_concept_tree(stack_name, plan, existing_concept_names=accumulated_names)
                    all_raw_concepts.extend([(stack_name, c) for c in raw])
                    accumulated_names.extend([c["name"] for c in raw])

                # 4. Embed + deduplicate
                concept_id_map: dict[str, object] = {}  # name -> concept_id
                prereq_pairs: list[tuple] = []  # (concept_id, prereq_id) tuples

                for stack_name, raw_concept in all_raw_concepts:
                    stack_id = stack_records[stack_name].id
                    concept = await get_or_create_concept(
                        session,
                        stack_id=stack_id,
                        name=raw_concept["name"],
                        description=raw_concept["description"],
                        domain=raw_concept.get("domain", ""),
                    )
                    await session.flush()
                    concept_id_map[raw_concept["name"]] = concept.id

                    yield f'data: {json.dumps({"type": "concept_added", "concept": {"name": raw_concept["name"], "domain": raw_concept.get("domain", "")}})}\n\n'

                # Wire prerequisites (second pass so all concepts exist)
                for stack_name, raw_concept in all_raw_concepts:
                    concept_id = concept_id_map.get(raw_concept["name"])
                    if concept_id is None:
                        continue
                    for prereq_name in raw_concept.get("prerequisites", []):
                        prereq_id = concept_id_map.get(prereq_name)
                        if prereq_id is None:
                            continue
                        stmt = (
                            pg_insert(ConceptPrerequisite)
                            .values(concept_id=concept_id, prerequisite_id=prereq_id)
                            .on_conflict_do_nothing()
                        )
                        await session.execute(stmt)
                        prereq_pairs.append((concept_id, prereq_id))

                # 5-6. Topological sort
                concept_ids = list(concept_id_map.values())
                try:
                    ordered_ids = topological_sort(concept_ids, prereq_pairs)
                except ValueError as e:
                    yield f'data: {json.dumps({"type": "error", "message": str(e)})}\n\n'
                    return

                # 7. Build id->name map for annotation
                id_to_name = {v: k for k, v in concept_id_map.items()}
                ordered_concepts_for_annotation = [
                    {"name": id_to_name[oid]} for oid in ordered_ids
                ]

                # 8. Annotate plan
                annotated = await annotate_plan(plan, ordered_concepts_for_annotation)

                # 9. Create project_concept records first so each part gets an ID
                order_index = 0
                pc_id_by_name: dict[str, str] = {}
                for step in annotated:
                    for part in step.get("parts", []):
                        concept_id = concept_id_map.get(part["concept_name"])
                        if concept_id is None:
                            continue
                        pc = ProjectConcept(
                            project_id=project.id,
                            concept_id=concept_id,
                            order_index=order_index,
                            what_to_build=part.get("what_to_build"),
                            phase=ConceptPhase.PENDING,
                        )
                        session.add(pc)
                        await session.flush()
                        pc_id_by_name[part["concept_name"]] = str(pc.id)
                        order_index += 1
                await session.commit()

                for step in annotated:
                    for part in step.get("parts", []):
                        part["project_concept_id"] = pc_id_by_name.get(part["concept_name"])

                project.annotated_plan = annotated
                await session.commit()

                yield f'data: {json.dumps({"type": "plan_annotated", "parts": annotated})}\n\n'

                # 10. Mermaid diagram
                name_to_prereq_names: dict[str, list[str]] = {}
                for _, raw_concept in all_raw_concepts:
                    name_to_prereq_names[raw_concept["name"]] = raw_concept.get("prerequisites", [])

                mermaid_concepts = [
                    {"name": name, "prerequisites": name_to_prereq_names.get(name, [])}
                    for name in concept_id_map
                ]
                mermaid = await generate_mermaid(mermaid_concepts)
                yield f'data: {json.dumps({"type": "mermaid", "diagram": mermaid})}\n\n'

                yield f'data: {json.dumps({"type": "done", "project_id": str(project.id)})}\n\n'

        except Exception as e:
            yield f'data: {json.dumps({"type": "error", "message": str(e)})}\n\n'

    return StreamingResponse(generate(), media_type="text/event-stream")
