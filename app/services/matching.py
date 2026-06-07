import json
import re
import uuid

from google.genai import types
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Skill, SkillStack, Stack
from app.routers.chat import _client

_JSON_ARRAY_RE = re.compile(r"\[.*\]", re.DOTALL)


def _parse_name_array(text: str) -> list[str]:
    match = _JSON_ARRAY_RE.search(text)
    if match is None:
        return []
    try:
        names = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []
    if not isinstance(names, list):
        return []
    return [name for name in names if isinstance(name, str)]


async def _ask_gemini(prompt: str) -> list[str]:
    response = await _client.aio.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
    )
    return _parse_name_array(response.text or "")


async def on_skill_added(skill: Skill, user_id: uuid.UUID, session: AsyncSession) -> None:
    result = await session.execute(select(Stack).where(Stack.user_id == user_id))
    stacks = result.scalars().all()
    if not stacks:
        return

    stack_names = ", ".join(stack.name for stack in stacks)
    prompt = (
        "You are classifying developer skills into technology stacks. "
        f"Given the skill '{skill.name}', which of the following stacks is it relevant to? "
        f"Stacks: {stack_names}. "
        'Reply with only a JSON array of the relevant stack names, e.g. ["Python Backend"]. '
        "If none apply, reply with []."
    )
    matched_names = set(await _ask_gemini(prompt))
    if not matched_names:
        return

    stacks_by_name = {stack.name: stack for stack in stacks}
    for name in matched_names:
        stack = stacks_by_name.get(name)
        if stack is not None:
            session.add(SkillStack(skill_id=skill.id, stack_id=stack.id))

    await session.commit()


async def on_stack_added(stack: Stack, user_id: uuid.UUID, session: AsyncSession) -> None:
    result = await session.execute(select(Skill).where(Skill.user_id == user_id))
    skills = result.scalars().all()
    if not skills:
        return

    skill_names = ", ".join(skill.name for skill in skills)
    prompt = (
        "You are classifying developer skills into technology stacks. "
        f"Given the stack '{stack.name}', which of the following skills is it relevant to? "
        f"Skills: {skill_names}. "
        'Reply with only a JSON array of the relevant skill names, e.g. ["Python Backend"]. '
        "If none apply, reply with []."
    )
    matched_names = set(await _ask_gemini(prompt))
    if not matched_names:
        return

    skills_by_name = {skill.name: skill for skill in skills}
    for name in matched_names:
        skill = skills_by_name.get(name)
        if skill is not None:
            session.add(SkillStack(skill_id=skill.id, stack_id=stack.id))

    await session.commit()
