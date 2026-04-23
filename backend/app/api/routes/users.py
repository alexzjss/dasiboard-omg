from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel, field_validator
from typing import Optional, Literal
import re
import base64
import binascii
from app.schemas.schemas import UserOut
from app.api.routes.auth import get_current_user
from app.db.session import get_db

router = APIRouter()
AVATAR_DATA_URL_RE = re.compile(r"^data:image/(png|jpg|jpeg|gif|webp);base64,([A-Za-z0-9+/=\s]+)$", re.IGNORECASE)
HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

class AvatarUpdate(BaseModel):
    avatar_url: Optional[str] = None  # base64 data URL or null to remove


class ThemePrefsUpdate(BaseModel):
    mode: Literal["light", "dark"]
    accent_color: str

    @field_validator("accent_color")
    @classmethod
    def validate_accent(cls, v: str) -> str:
        if not HEX_COLOR_RE.fullmatch(v.strip()):
            raise ValueError("Cor inválida. Use formato hexadecimal #RRGGBB.")
        return v.lower()


def _validate_avatar(avatar_url: Optional[str]) -> Optional[str]:
    if avatar_url is None:
        return None
    val = avatar_url.strip()
    match = AVATAR_DATA_URL_RE.fullmatch(val)
    if not match:
        raise HTTPException(400, "Formato de avatar inválido. Use apenas data URL de imagem.")
    payload = match.group(2).strip()
    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "Avatar base64 inválido.")
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(400, "Imagem muito grande. Máximo 2MB.")
    return val


@router.get("/me", response_model=UserOut)
def get_profile(user=Depends(get_current_user)):
    return user

@router.patch("/me/avatar", response_model=UserOut)
def update_avatar(
    body: AvatarUpdate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    avatar = _validate_avatar(body.avatar_url)

    db.execute(
        "UPDATE users SET avatar_url = %s, updated_at = NOW() WHERE id = %s RETURNING *",
        (avatar, str(user["id"])),
    )
    return db.fetchone()


@router.get("/me/theme")
def get_theme(
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    db.execute(
        "SELECT theme_mode, theme_accent FROM users WHERE id = %s",
        (str(user["id"]),),
    )
    row = db.fetchone() or {}
    return {
        "mode": row.get("theme_mode") or "dark",
        "accent_color": row.get("theme_accent") or "#7c3aed",
    }


@router.patch("/me/theme")
def update_theme(
    body: ThemePrefsUpdate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    db.execute(
        "UPDATE users SET theme_mode = %s, theme_accent = %s, updated_at = NOW() "
        "WHERE id = %s RETURNING theme_mode, theme_accent",
        (body.mode, body.accent_color, str(user["id"])),
    )
    row = db.fetchone()
    if not row:
        raise HTTPException(404, "Usuário não encontrado")
    return {"mode": row["theme_mode"], "accent_color": row["theme_accent"]}


# ── Achievement persistence ───────────────────────────────────────────────────
class AchievementsBody(BaseModel):
    ids: list[str]  # list of achievement IDs to mark as unlocked

@router.get("/me/achievements")
def get_achievements(db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    """Return all unlocked achievement IDs for the current user."""
    db.execute(
        "SELECT ach_id, unlocked_at FROM user_achievements WHERE user_id = %s ORDER BY unlocked_at",
        (str(user["id"]),)
    )
    rows = db.fetchall()
    return [{"id": r["ach_id"], "unlocked_at": r["unlocked_at"].isoformat()} for r in rows]

@router.post("/me/achievements")
def unlock_achievement(
    body: AchievementsBody,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    """Idempotent — unlocks one or more achievements for the user."""
    uid = str(user["id"])
    for ach_id in body.ids:
        if not ach_id or len(ach_id) > 80:
            continue
        db.execute(
            "INSERT INTO user_achievements (user_id, ach_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (uid, ach_id),
        )
    return {"ok": True}
