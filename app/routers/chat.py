import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from google.genai import types

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
