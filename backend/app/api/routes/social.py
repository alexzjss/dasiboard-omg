# ── Social routes — perfil público, turma, notas, salas de estudo ──────────────
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from typing import Optional, List
import secrets
import string

from app.db.session import get_db
from app.api.routes.auth import get_current_user

router = APIRouter()


# ══════════════════════════════════════════════════════
# PERFIL PÚBLICO
# ══════════════════════════════════════════════════════

class ProfileSettings(BaseModel):
    public_profile:       Optional[bool]   = None
    public_bio:           Optional[str]    = None
    entry_year:           Optional[int]    = None
    public_subjects:      Optional[bool]   = None
    public_achievements:  Optional[bool]   = None


@router.patch("/profile/settings")
def update_profile_settings(
    body: ProfileSettings,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    uid = str(user["id"])
    fields, vals = [], []

    if body.public_profile is not None:
        fields.append("public_profile = %s");       vals.append(body.public_profile)
    if body.public_bio is not None:
        bio = body.public_bio[:300].strip()
        fields.append("public_bio = %s");           vals.append(bio or None)
    if body.entry_year is not None:
        if not (2000 <= body.entry_year <= 2099):
            raise HTTPException(400, "Ano de entrada inválido")
        fields.append("entry_year = %s");           vals.append(body.entry_year)
    if body.public_subjects is not None:
        fields.append("public_subjects = %s");      vals.append(body.public_subjects)
    if body.public_achievements is not None:
        fields.append("public_achievements = %s");  vals.append(body.public_achievements)

    if not fields:
        return {"ok": True}

    vals.append(uid)
    db.execute(
        f"UPDATE users SET {', '.join(fields)}, updated_at = NOW() WHERE id = %s RETURNING "
        f"id, full_name, nusp, avatar_url, public_profile, public_bio, entry_year, "
        f"public_subjects, public_achievements",
        vals,
    )
    return db.fetchone()


@router.get("/profile/settings")
def get_profile_settings(
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    db.execute(
        "SELECT id, full_name, nusp, avatar_url, public_profile, public_bio, "
        "entry_year, public_subjects, public_achievements FROM users WHERE id = %s",
        (str(user["id"]),),
    )
    return db.fetchone()


@router.get("/u/{nusp}")
def get_public_profile(nusp: str, db: RealDictCursor = Depends(get_db)):
    db.execute(
        "SELECT id, full_name, nusp, avatar_url, public_bio, entry_year, "
        "public_subjects, public_achievements, created_at "
        "FROM users WHERE nusp = %s AND public_profile = TRUE AND is_active = TRUE",
        (nusp,),
    )
    u = db.fetchone()
    if not u:
        raise HTTPException(404, "Perfil não encontrado ou não público")

    result = dict(u)

    # Subjects — only if public_subjects opted in
    if u["public_subjects"]:
        db.execute(
            "SELECT code, name, semester, color, "
            "ROUND(AVG(g.value * g.weight / g.max_value * 10), 1) AS avg_grade "
            "FROM subjects s "
            "LEFT JOIN grades g ON g.subject_id = s.id "
            "WHERE s.owner_id = %s "
            "GROUP BY s.id ORDER BY s.semester, s.name",
            (str(u["id"]),),
        )
        result["subjects"] = db.fetchall()
    else:
        result["subjects"] = []

    # Achievements — only if opted in
    if u["public_achievements"]:
        db.execute(
            "SELECT ach_id FROM user_achievements WHERE user_id = %s ORDER BY unlocked_at",
            (str(u["id"]),),
        )
        result["achievements"] = [r["ach_id"] for r in db.fetchall()]
    else:
        result["achievements"] = []

    return result


# ══════════════════════════════════════════════════════
# TURMA (agrupamento por ano de entrada)
# ══════════════════════════════════════════════════════

@router.get("/turma/{year}")
def get_turma(
    year: int,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    if not (2000 <= year <= 2099):
        raise HTTPException(400, "Ano inválido")

    # Members with public profiles in this year
    db.execute(
        "SELECT id, full_name, nusp, avatar_url, public_bio, "
        "(SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) AS ach_count "
        "FROM users u "
        "WHERE entry_year = %s AND public_profile = TRUE AND is_active = TRUE "
        "ORDER BY full_name",
        (year,),
    )
    members = db.fetchall()

    # Global events (all recent ones relevant to this cohort year)
    db.execute(
        "SELECT id, title, event_type, start_at, end_at, color, location "
        "FROM global_events "
        "WHERE EXTRACT(YEAR FROM start_at) = %s "
        "   OR class_code LIKE %s OR class_code LIKE %s "
        "ORDER BY start_at DESC LIMIT 20",
        (year, f"{year}%", f"%-{year}%"),
    )
    events = db.fetchall()

    return {
        "year": year,
        "member_count": len(members),
        "members": members,
        "events": events,
    }


@router.get("/turma")
def list_turmas(db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute(
        "SELECT entry_year, COUNT(*) AS member_count "
        "FROM users "
        "WHERE entry_year IS NOT NULL AND public_profile = TRUE AND is_active = TRUE "
        "GROUP BY entry_year ORDER BY entry_year DESC"
    )
    return db.fetchall()


# ══════════════════════════════════════════════════════
# NOTAS COMPARTILHADAS
# ══════════════════════════════════════════════════════

class NoteCreate(BaseModel):
    title:      str
    content:    str
    subject_id: Optional[str] = None
    is_public:  bool = False


class NoteUpdate(BaseModel):
    title:      Optional[str]  = None
    content:    Optional[str]  = None
    is_public:  Optional[bool] = None
    subject_id: Optional[str]  = None


def _gen_token() -> str:
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(12))


@router.get("/notes")
def list_notes(db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute(
        "SELECT id, title, subject_id, is_public, share_token, created_at, updated_at, "
        "LEFT(content, 200) AS preview "
        "FROM notes WHERE owner_id = %s ORDER BY updated_at DESC",
        (str(user["id"]),),
    )
    return db.fetchall()


@router.post("/notes", status_code=201)
def create_note(
    body: NoteCreate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    token = _gen_token() if body.is_public else None
    db.execute(
        "INSERT INTO notes (owner_id, title, content, subject_id, is_public, share_token) "
        "VALUES (%s, %s, %s, %s, %s, %s) RETURNING *",
        (str(user["id"]), body.title[:255], body.content,
         body.subject_id, body.is_public, token),
    )
    return db.fetchone()


@router.get("/notes/{note_id}")
def get_note(
    note_id: str,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    db.execute("SELECT * FROM notes WHERE id = %s AND owner_id = %s", (note_id, str(user["id"])))
    note = db.fetchone()
    if not note:
        raise HTTPException(404, "Nota não encontrada")
    return note


@router.patch("/notes/{note_id}")
def update_note(
    note_id: str,
    body: NoteUpdate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    db.execute("SELECT * FROM notes WHERE id = %s AND owner_id = %s", (note_id, str(user["id"])))
    note = db.fetchone()
    if not note:
        raise HTTPException(404, "Nota não encontrada")

    title      = (body.title[:255] if body.title is not None else note["title"])
    content    = (body.content     if body.content is not None else note["content"])
    subject_id = (body.subject_id  if body.subject_id is not None else note["subject_id"])
    is_public  = (body.is_public   if body.is_public is not None else note["is_public"])

    # Generate token when making public for the first time
    token = note["share_token"]
    if is_public and not token:
        token = _gen_token()

    db.execute(
        "UPDATE notes SET title=%s, content=%s, subject_id=%s, is_public=%s, "
        "share_token=%s, updated_at=NOW() WHERE id=%s RETURNING *",
        (title, content, subject_id, is_public, token, note_id),
    )
    return db.fetchone()


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(
    note_id: str,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    db.execute("DELETE FROM notes WHERE id = %s AND owner_id = %s", (note_id, str(user["id"])))


@router.get("/shared-note/{token}")
def get_shared_note(token: str, db: RealDictCursor = Depends(get_db)):
    """Public endpoint — no auth required."""
    db.execute(
        "SELECT n.id, n.title, n.content, n.subject_id, n.updated_at, "
        "u.full_name AS author_name, u.nusp AS author_nusp "
        "FROM notes n JOIN users u ON u.id = n.owner_id "
        "WHERE n.share_token = %s AND n.is_public = TRUE",
        (token,),
    )
    note = db.fetchone()
    if not note:
        raise HTTPException(404, "Nota não encontrada ou não pública")
    return note


# ══════════════════════════════════════════════════════
# SALAS DE ESTUDO PERSISTENTES
# ══════════════════════════════════════════════════════

class RoomCreate(BaseModel):
    subject_code: Optional[str] = None
    subject_name: str


class InviteBody(BaseModel):
    nusp: str   # numero USP do convidado


def _gen_room_code(subject_code: Optional[str], db: RealDictCursor) -> str:
    """Generate a short readable code like BD1-2024-A3."""
    import random, datetime
    year = datetime.date.today().year % 100
    prefix = (subject_code or "SALA")[:4].upper()
    for _ in range(20):
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=3))
        code = f"{prefix}-{year}-{suffix}"
        db.execute("SELECT id FROM study_rooms WHERE code = %s", (code,))
        if not db.fetchone():
            return code
    raise HTTPException(500, "Não foi possível gerar código único")


@router.get("/rooms")
def list_rooms(db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    uid = str(user["id"])
    # Rooms user created or was invited to
    db.execute(
        """
        SELECT r.id, r.code, r.subject_code, r.subject_name, r.created_at,
               u.full_name AS creator_name,
               (SELECT COUNT(DISTINCT user_id) FROM study_room_sessions s WHERE s.room_id = r.id AND s.left_at IS NULL) AS online_now,
               (SELECT COUNT(*) FROM study_room_sessions s WHERE s.room_id = r.id) AS total_sessions
        FROM study_rooms r
        JOIN users u ON u.id = r.created_by
        WHERE r.created_by = %s
           OR EXISTS (SELECT 1 FROM study_room_invites i WHERE i.room_id = r.id AND i.invited_nusp = %s)
        ORDER BY r.created_at DESC
        LIMIT 20
        """,
        (uid, user.get("nusp") or ""),
    )
    return db.fetchall()


@router.post("/rooms", status_code=201)
def create_room(
    body: RoomCreate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    code = _gen_room_code(body.subject_code, db)
    db.execute(
        "INSERT INTO study_rooms (code, subject_code, subject_name, created_by) "
        "VALUES (%s, %s, %s, %s) RETURNING *",
        (code, body.subject_code, body.subject_name[:255], str(user["id"])),
    )
    room = db.fetchone()
    # Auto-join creator
    db.execute(
        "INSERT INTO study_room_sessions (room_id, user_id) VALUES (%s, %s)",
        (str(room["id"]), str(user["id"])),
    )
    return room


@router.get("/rooms/{code}")
def get_room(code: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute(
        "SELECT r.*, u.full_name AS creator_name FROM study_rooms r "
        "JOIN users u ON u.id = r.created_by WHERE r.code = %s",
        (code,),
    )
    room = db.fetchone()
    if not room:
        raise HTTPException(404, "Sala não encontrada")

    # History: last 50 sessions with user names
    db.execute(
        "SELECT s.id, u.full_name, u.nusp, u.avatar_url, "
        "s.joined_at, s.left_at, s.duration_min "
        "FROM study_room_sessions s JOIN users u ON u.id = s.user_id "
        "WHERE s.room_id = %s ORDER BY s.joined_at DESC LIMIT 50",
        (str(room["id"]),),
    )
    sessions = db.fetchall()

    # Invited users
    db.execute(
        "SELECT i.invited_nusp, u.full_name "
        "FROM study_room_invites i "
        "LEFT JOIN users u ON u.nusp = i.invited_nusp "
        "WHERE i.room_id = %s",
        (str(room["id"]),),
    )
    invites = db.fetchall()

    return {**dict(room), "sessions": sessions, "invites": invites}


@router.post("/rooms/{code}/join", status_code=201)
def join_room(code: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM study_rooms WHERE code = %s", (code,))
    room = db.fetchone()
    if not room:
        raise HTTPException(404, "Sala não encontrada")

    # Close any open session for this user in this room
    db.execute(
        "UPDATE study_room_sessions SET left_at = NOW() "
        "WHERE room_id = %s AND user_id = %s AND left_at IS NULL",
        (str(room["id"]), str(user["id"])),
    )

    db.execute(
        "INSERT INTO study_room_sessions (room_id, user_id) VALUES (%s, %s) RETURNING *",
        (str(room["id"]), str(user["id"])),
    )
    return db.fetchone()


@router.post("/rooms/{code}/leave", status_code=200)
def leave_room(code: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM study_rooms WHERE code = %s", (code,))
    room = db.fetchone()
    if not room:
        raise HTTPException(404, "Sala não encontrada")

    db.execute(
        "UPDATE study_room_sessions SET left_at = NOW() "
        "WHERE room_id = %s AND user_id = %s AND left_at IS NULL RETURNING duration_min",
        (str(room["id"]), str(user["id"])),
    )
    result = db.fetchone()
    return {"duration_min": result["duration_min"] if result else 0}


@router.post("/rooms/{code}/invite")
def invite_to_room(
    code: str,
    body: InviteBody,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    db.execute("SELECT id, created_by FROM study_rooms WHERE code = %s", (code,))
    room = db.fetchone()
    if not room:
        raise HTTPException(404, "Sala não encontrada")

    nusp = body.nusp.strip()
    if not nusp:
        raise HTTPException(400, "Nº USP inválido")

    db.execute(
        "INSERT INTO study_room_invites (room_id, invited_nusp, invited_by) "
        "VALUES (%s, %s, %s) ON CONFLICT DO NOTHING RETURNING *",
        (str(room["id"]), nusp, str(user["id"])),
    )
    return {"ok": True, "nusp": nusp}


@router.get("/rooms/{code}/online")
def room_online_users(code: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM study_rooms WHERE code = %s", (code,))
    room = db.fetchone()
    if not room:
        raise HTTPException(404, "Sala não encontrada")

    db.execute(
        "SELECT u.id, u.full_name, u.nusp, u.avatar_url, s.joined_at "
        "FROM study_room_sessions s JOIN users u ON u.id = s.user_id "
        "WHERE s.room_id = %s AND s.left_at IS NULL "
        "ORDER BY s.joined_at",
        (str(room["id"]),),
    )
    return db.fetchall()
