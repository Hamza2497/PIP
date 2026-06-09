import json
import os
from typing import AsyncGenerator

from google import genai
from google.genai import types

_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
_MODEL = "gemini-2.5-flash-lite"


async def generate_orient(
    concept_name: str,
    concept_description: str,
    what_to_build: str,
) -> AsyncGenerator[str, None]:
    system = f"""
You are PIP, a developer learning companion. You never write code.

The developer is about to build a part of their project that will teach them:
{concept_name}

About this concept:
{concept_description}

What they are about to build:
{what_to_build}

Your job:
1. In 3-4 sentences, explain what this concept is and why it matters for what
   they are specifically building - not in general, for THIS project.
2. Name one thing that trips developers up the first time they encounter it.
3. Do not quiz. Do not ask questions. Practical, not academic.

After your orient text, on its own line, write exactly:
HANDOFF: List everything we just built related to {concept_name}: what was
implemented, what patterns were used, and any decisions made - facts only,
no explanations.
"""

    stream = _client.aio.models.generate_content_stream(
        model=_MODEL,
        contents="Begin orientation.",
        config=types.GenerateContentConfig(system_instruction=system),
    )

    full_text = []
    async for chunk in await stream:
        token = chunk.text
        if token:
            full_text.append(token)
            yield f'data: {json.dumps({"type": "text", "content": token})}\n\n'

    accumulated = "".join(full_text)
    handoff_sentence = ""
    for line in accumulated.splitlines():
        if line.startswith("HANDOFF:"):
            handoff_sentence = line[len("HANDOFF:"):].strip()
            break

    yield f'data: {json.dumps({"type": "handoff", "sentence": handoff_sentence})}\n\n'
    yield f'data: {json.dumps({"type": "done"})}\n\n'


async def generate_checkpoint(
    concept_name: str,
    concept_description: str,
    claude_code_output: str,
) -> AsyncGenerator[str, None]:
    system = f"""
You are PIP, a developer learning companion. You never write code.

The developer just built something to learn: {concept_name}

About this concept:
{concept_description}

Their Claude Code output:
{claude_code_output}

Your job:
1. If there is something important about {concept_name} that the output alone
   does not make clear, surface it in 2-3 sentences. Skip this entirely if the
   output already makes it obvious.
2. Ask ONE checkpoint question that tests real understanding - not surface recall.
   Good: "Why did you use X here instead of Y?"
   Good: "What would break if you removed Z?"
   Bad:  "What does X do?"
   Bad:  "What is {concept_name}?"

Format your response as:
[optional 2-3 sentence teaching note - omit if not needed]

QUESTION: [your single checkpoint question]
"""

    stream = _client.aio.models.generate_content_stream(
        model=_MODEL,
        contents="Begin checkpoint.",
        config=types.GenerateContentConfig(system_instruction=system),
    )

    full_text = []
    async for chunk in await stream:
        token = chunk.text
        if token:
            full_text.append(token)
            yield f'data: {json.dumps({"type": "text", "content": token})}\n\n'

    accumulated = "".join(full_text)
    question_text = ""
    for line in accumulated.splitlines():
        if line.startswith("QUESTION:"):
            question_text = line[len("QUESTION:"):].strip()
            break

    yield f'data: {json.dumps({"type": "question", "text": question_text})}\n\n'
    yield f'data: {json.dumps({"type": "done"})}\n\n'


async def score_answer(concept_name: str, question: str, answer: str) -> dict:
    system = f"""
You are PIP, evaluating a developer's understanding.

Concept: {concept_name}
Checkpoint question: {question}
Developer's answer: {answer}

Score 1-5:
1 - No understanding demonstrated
2 - Surface recall only, no depth
3 - Functional understanding, some gaps
4 - Solid understanding, minor gaps
5 - Deep understanding, could explain this clearly to someone else

Return JSON only - no markdown, no explanation:
{{"score": 4, "feedback": "One or two sentences. Direct and specific."}}
"""

    response = await _client.aio.models.generate_content(
        model=_MODEL,
        contents="Score this answer.",
        config=types.GenerateContentConfig(system_instruction=system),
    )

    text = response.text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        start = 1 if lines[0].startswith("```") else 0
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        text = "\n".join(lines[start:end]).strip()

    try:
        data = json.loads(text)
        return {"score": int(data["score"]), "feedback": str(data["feedback"])}
    except Exception:
        return {"score": 3, "feedback": "Could not evaluate answer."}
