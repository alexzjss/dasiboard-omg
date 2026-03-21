from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from typing import Optional
from app.schemas.schemas import UserOut
from app.api.routes.auth import get_current_user
from app.db.session import get_db

router = APIRouter()

class AvatarUpdate(BaseModel):
    avatar_url: Optional[str] = None  # base64 data URL or null to remove

@router.get("/me", response_model=UserOut)
def get_profile(user=Depends(get_current_user)):
    return user

@router.patch("/me/avatar", response_model=UserOut)
def update_avatar(
    body: AvatarUpdate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    # Limit base64 size (~2MB)
    if body.avatar_url and len(body.avatar_url) > 2_800_000:
        raise HTTPException(400, "Imagem muito grande. Máximo 2MB.")

    db.execute(
        "UPDATE users SET avatar_url = %s, updated_at = NOW() WHERE id = %s RETURNING *",
        (body.avatar_url, str(user["id"])),
    )
    return db.fetchone()
