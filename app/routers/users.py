from fastapi import APIRouter, Depends

from app.models import User
from app.session import get_current_user

router = APIRouter()


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": str(user.id), "email": user.email, "name": user.name}
