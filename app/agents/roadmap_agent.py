import json
import os

from google import genai
from google.genai import types

_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
_MODEL = "gemini-2.5-flash-lite"

_IDENTIFY_STACKS_SYSTEM = """
You are the roadmap agent for PIP, a developer learning companion.
Analyze the project plan and identify the specific technology stacks involved.
Be specific: "FastAPI" not "Python web framework", "PostgreSQL" not "database".
Return a JSON array of stack name strings only. No explanation. No markdown. JSON only.
Example: ["FastAPI", "PostgreSQL", "React"]
"""

_CONCEPT_TREE_SYSTEM = """
You are the roadmap agent for PIP, a developer learning companion.
Given a technology stack and a project plan, identify the concepts the developer
needs to learn to build this project.

Rules:
- Each concept should be learnable in one focused coding session (1-3 hours of work)
- Be specific: "SQLAlchemy async sessions" not "databases"
- Prerequisites must be concept names from your own list only
- Focus on what needs to be LEARNED, not just used
- Do not include basic Python knowledge unless it is a prerequisite for something new

Return JSON only - no markdown fences, no explanation:
[
  {
    "name": "concept name",
    "description": "2-3 sentence description of what this concept is",
    "domain": "e.g. database, auth, async, HTTP",
    "prerequisites": ["other concept name", ...]
  }
]
"""

_ANNOTATE_PLAN_SYSTEM = """
You are the roadmap agent for PIP.
You have a project plan and an ordered list of concepts the developer will learn.
Map each concept to the step of the plan it is most naturally learned through.
Divide each step into parts - one part per concept - in the learning order given.

Return JSON only:
[
  {
    "step_number": 1,
    "step_title": "short title for this step",
    "parts": [
      {
        "part_number": 1,
        "concept_name": "exact concept name from the list",
        "what_to_build": "one sentence: what the user builds in this part"
      }
    ]
  }
]
Every concept in the ordered list must appear in exactly one part.
"""

_MERMAID_SYSTEM = """
Generate a Mermaid graph TD diagram from this concept list.
Node IDs: alphanumeric and underscores only (replace spaces with underscores).
Node labels: the concept names in quotes.
Edges: prerequisite -> concept (prereq must be learned before concept).
Return raw Mermaid syntax only - no markdown fences, no explanation.
"""


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Remove first and last fence lines
        start = 1 if lines[0].startswith("```") else 0
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        text = "\n".join(lines[start:end]).strip()
    return text


async def identify_stacks(plan: str) -> list[str]:
    response = await _client.aio.models.generate_content(
        model=_MODEL,
        contents=plan,
        config=types.GenerateContentConfig(system_instruction=_IDENTIFY_STACKS_SYSTEM),
    )
    try:
        return json.loads(_strip_json_fences(response.text))
    except (json.JSONDecodeError, ValueError):
        raise ValueError("Could not identify stacks from plan")


async def generate_concept_tree(
    stack: str, plan: str, existing_concept_names: list[str] | None = None
) -> list[dict]:
    user_message = f"Stack: {stack}\n\nProject plan:\n{plan}"
    if existing_concept_names:
        user_message += (
            f"\n\nConcepts already generated for this project: {', '.join(existing_concept_names)}. "
            "Do NOT generate a concept that overlaps with any of the above. "
            "If a concept from the list above applies to this step, reference it by "
            "exact name — do not create a new variant of it."
        )
    response = await _client.aio.models.generate_content(
        model=_MODEL,
        contents=user_message,
        config=types.GenerateContentConfig(system_instruction=_CONCEPT_TREE_SYSTEM),
    )
    try:
        return json.loads(_strip_json_fences(response.text))
    except (json.JSONDecodeError, ValueError):
        raise ValueError(f"Could not generate concept tree for {stack}")


async def annotate_plan(plan: str, ordered_concepts: list[dict]) -> list[dict]:
    user_message = (
        f"Plan:\n{plan}\n\nOrdered concepts (follow this order exactly):\n"
        + json.dumps([c["name"] for c in ordered_concepts])
    )
    response = await _client.aio.models.generate_content(
        model=_MODEL,
        contents=user_message,
        config=types.GenerateContentConfig(system_instruction=_ANNOTATE_PLAN_SYSTEM),
    )
    try:
        return json.loads(_strip_json_fences(response.text))
    except (json.JSONDecodeError, ValueError):
        raise ValueError("Could not annotate plan")


async def generate_mermaid(concepts: list[dict]) -> str:
    user_message = json.dumps([
        {"name": c["name"], "prerequisites": c.get("prerequisites", [])}
        for c in concepts
    ])
    response = await _client.aio.models.generate_content(
        model=_MODEL,
        contents=user_message,
        config=types.GenerateContentConfig(system_instruction=_MERMAID_SYSTEM),
    )
    return response.text.strip()
