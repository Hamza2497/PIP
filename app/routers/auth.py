from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.auth import build_google_auth_url, exchange_code_for_user
from app.database import AsyncSessionLocal
from app.models import User

router = APIRouter()


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

        return {"status": "authenticated", "email": user.email}
