from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from jose import jwt
from pydantic import BaseModel
from sqlalchemy import select

from app.auth import build_google_auth_url, exchange_code_for_user
from app.database import AsyncSessionLocal
from app.models import User
from app.session import create_session_token

router = APIRouter()


class GoogleCredentialRequest(BaseModel):
    credential: str


@router.post("/auth/google")
async def google_auth(body: GoogleCredentialRequest):
    try:
        payload = jwt.decode(
            body.credential,
            key="",
            options={
                "verify_signature": False,
                "verify_aud": False,
                "verify_at_hash": False,
            },
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid credential")

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.google_id == payload["sub"]))
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                google_id=payload["sub"],
                email=payload["email"],
                name=payload.get("name", payload.get("email", "")),
            )
            session.add(user)

        await session.commit()
        await session.refresh(user)

        token = create_session_token(str(user.id))

        return {"id": str(user.id), "email": user.email, "name": user.name, "token": token}


@router.post("/auth/logout")
def logout():
    response = JSONResponse({"status": "logged out"})
    response.delete_cookie("session", samesite="none", secure=True)
    return response


@router.get("/auth/login")
def login():
    return RedirectResponse(build_google_auth_url(), status_code=302)


@router.get("/auth/callback")
async def callback(code: str):
    payload = await exchange_code_for_user(code)

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.google_id == payload["sub"]))
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                google_id=payload["sub"],
                email=payload["email"],
                name=payload["name"],
            )
            session.add(user)

        await session.commit()

        token = create_session_token(str(user.id))

        response = JSONResponse({"status": "authenticated", "email": user.email})
        response.set_cookie(
            "session",
            token,
            httponly=True,
            samesite="none",
            secure=True,
            max_age=60 * 60 * 24 * 7,
        )
        return response
