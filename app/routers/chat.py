import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from google.genai import types
from app.tools import WEB_SEARCH_TOOL, run_web_search, CALCULATOR_TOOL, run_calculator, FETCH_TOOL, fetch_documentation

load_dotenv()

router = APIRouter()

sessions: dict[str, list] = {}

_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
_system_instruction = "You are PIP, a learning companion for developers. You help users understand concepts — you never write code for them."


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    reply: str
    session_id: str


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest):
    history = sessions.get(body.session_id, [])

    history.append(types.Content(role="user", parts=[types.Part(text=body.message)]))

    try:
        response = _client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=history,
            config=types.GenerateContentConfig(
                system_instruction=_system_instruction,
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    reply_text = response.text
    history.append(types.Content(role="model", parts=[types.Part(text=reply_text)]))
    sessions[body.session_id] = history

    return ChatResponse(reply=reply_text, session_id=body.session_id)


@router.post("/chat/stream")
async def chat_stream(body: ChatRequest):
    async def token_generator():
        history = sessions.get(body.session_id, [])
        history.append(types.Content(role="user", parts=[types.Part(text=body.message)]))

        try:
            stream = _client.aio.models.generate_content_stream(
                model="gemini-2.5-flash-lite",
                contents=history,
                config=types.GenerateContentConfig(
                    system_instruction=_system_instruction,
                ),
            )
        except Exception as e:
            yield f"data: ERROR: {e}\n\n"
            return

        full_reply = []
        async for chunk in await stream:
            token = chunk.text
            if token:
                full_reply.append(token)
                yield f"data: {token}\n\n"

        assembled = "".join(full_reply)
        history.append(types.Content(role="model", parts=[types.Part(text=assembled)]))
        sessions[body.session_id] = history

        yield "data: [DONE]\n\n"

    return StreamingResponse(token_generator(), media_type="text/event-stream")


@router.post("/chat/agent")
async def chat_agent(body: ChatRequest):
    async def agent_generator():
        history = sessions.get(body.session_id, [])
        history.append(types.Content(role="user", parts=[types.Part(text=body.message)]))

        for _ in range(5):
            try:
                response = await _client.aio.models.generate_content(
                    model="gemini-2.5-flash-lite",
                    contents=history,
                    config=types.GenerateContentConfig(
                        system_instruction=_system_instruction,
                        tools=[WEB_SEARCH_TOOL, CALCULATOR_TOOL, FETCH_TOOL],
                    ),
                )
            except Exception as e:
                yield f"data: ERROR: {e}\n\n"
                return

            fc = None
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        fc = part.function_call
                        break

            if fc is None:
                break

            if fc.name == "web_search":
                result = await run_web_search(fc.args.get("query", ""))
            elif fc.name == "calculator":
                result = await run_calculator(fc.args.get("expression", ""))
            elif fc.name == "fetch_documentation":
                result = await fetch_documentation(fc.args.get("url", ""))
            else:
                result = f"unknown tool: {fc.name}"

            yield f"data: [TOOL_CALL] {fc.name}: {fc.args}\n\n"
            yield f"data: [TOOL_RESULT] {result}\n\n"

            history.append(response.candidates[0].content)
            history.append(
                types.Content(
                    role="user",
                    parts=[
                        types.Part(
                            function_response=types.FunctionResponse(
                                name=fc.name,
                                response={"result": result},
                            )
                        )
                    ],
                )
            )
        else:
            yield "data: [ERROR] max tool iterations reached\n\n"
            return

        try:
            stream = _client.aio.models.generate_content_stream(
                model="gemini-2.5-flash-lite",
                contents=history,
                config=types.GenerateContentConfig(
                    system_instruction=_system_instruction,
                ),
            )
        except Exception as e:
            yield f"data: ERROR: {e}\n\n"
            return

        full_reply = []
        async for chunk in await stream:
            token = chunk.text
            if token:
                full_reply.append(token)
                yield f"data: {token}\n\n"

        history.append(
            types.Content(role="model", parts=[types.Part(text="".join(full_reply))])
        )
        sessions[body.session_id] = history
        yield "data: [DONE]\n\n"

    return StreamingResponse(agent_generator(), media_type="text/event-stream")
