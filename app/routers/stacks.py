from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Stack, User
from app.session import get_current_user

router = APIRouter()


class StackIn(BaseModel):
    name: str


@router.get("/stacks")
async def list_stacks(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(select(Stack).where(Stack.user_id == user.id))
    stacks = result.scalars().all()
    return [
        {
            "id": str(stack.id),
            "name": stack.name,
            "created_at": stack.created_at,
        }
        for stack in stacks
    ]


@router.post("/stacks")
async def create_stack(
    body: StackIn,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    stack = Stack(user_id=user.id, name=body.name)
    session.add(stack)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        result = await session.execute(
            select(Stack).where(Stack.user_id == user.id, Stack.name == body.name)
        )
        stack = result.scalar_one()
    else:
        await on_stack_added(stack, user.id, session)

    return {
        "id": str(stack.id),
        "name": stack.name,
        "created_at": stack.created_at,
    }
