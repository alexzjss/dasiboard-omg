from fastapi import APIRouter, Depends, HTTPException, Query, Header
from psycopg2.extras import RealDictCursor
from typing import List, Optional
from datetime import datetime
from app.db.session import get_db
from app.api.routes.auth import get_current_user
from app.schemas.schemas import EventCreate, EventOut
from app.core.config import settings

router = APIRouter()


def require_global_key(x_global_key: Optional[str] = Header(None)):
    if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
        raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
    return True


def _user_entity_ids(db, user_id: str) -> list:
    db.execute("SELECT entity_id FROM entity_members WHERE user_id = %s", (user_id,))
    return [str(r["entity_id"]) for r in db.fetchall()]


@router.get("/", response_model=List[EventOut])
def list_events(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    event_type: Optional[str] = Query(None),
    class_code: Optional[str] = Query(None),
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    uid = str(user["id"])
    entity_ids = _user_entity_ids(db, uid)

    personal_q = (
        "SELECT id, owner_id, title, description, event_type, start_at, end_at, "
        "all_day, color, location, created_at, "
        "NULL::varchar AS class_code, FALSE AS is_global, entity_id, members_only "
        "FROM events WHERE owner_id = %s"
    )
    p_params: list = [uid]
    if start:      personal_q += " AND start_at >= %s"; p_params.append(start)
    if end:        personal_q += " AND start_at <= %s"; p_params.append(end)
    if event_type: personal_q += " AND event_type = %s"; p_params.append(event_type)
    if class_code: personal_q += " AND class_code ILIKE %s"; p_params.append(f"%{class_code}%")

    entity_parts: list = []
    e_all_params: list = []
    if entity_ids:
        placeholders = ",".join(["%s"] * len(entity_ids))
        eq = (
            "SELECT id, owner_id, title, description, event_type, start_at, end_at, "
            "all_day, color, location, created_at, "
            "NULL::varchar AS class_code, FALSE AS is_global, entity_id, members_only "
            f"FROM events WHERE entity_id IN ({placeholders}) AND owner_id != %s"
        )
        e_params: list = entity_ids + [uid]
        if start:      eq += " AND start_at >= %s"; e_params.append(start)
        if end:        eq += " AND start_at <= %s"; e_params.append(end)
        if event_type: eq += " AND event_type = %s"; e_params.append(event_type)
        entity_parts.append(f"({eq})")
        e_all_params = e_params

    global_q = (
        "SELECT id, NULL::uuid AS owner_id, title, description, event_type, start_at, end_at, "
        "all_day, color, location, created_at, "
        "class_code, TRUE AS is_global, entity_id, members_only "
        "FROM global_events WHERE 1=1"
    )
    g_params: list = []
    if start:      global_q += " AND start_at >= %s"; g_params.append(start)
    if end:        global_q += " AND start_at <= %s"; g_params.append(end)
    if event_type: global_q += " AND event_type = %s"; g_params.append(event_type)

    parts = [f"({personal_q})"] + entity_parts + [f"({global_q})"]
    combined = " UNION ALL ".join(parts) + " ORDER BY start_at"
    all_params = p_params + e_all_params + g_params

    db.execute(combined, all_params)
    rows = db.fetchall()

    result = []
    for row in rows:
        r = dict(row)
        if not r.get("owner_id"):
            r["owner_id"] = "00000000-0000-0000-0000-000000000000"
        result.append(r)
    return result


@router.post("/", response_model=EventOut, status_code=201)
def create_event(
    body: EventCreate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    eid = str(body.entity_id) if body.entity_id else None
    if body.is_global:
        require_global_key(x_global_key)
        db.execute(
            "INSERT INTO global_events (title, description, event_type, start_at, end_at, "
            "all_day, color, location, class_code, entity_id, members_only) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *, TRUE AS is_global",
            (body.title, body.description, body.event_type, body.start_at, body.end_at,
             body.all_day, body.color, body.location, body.class_code, eid, body.members_only),
        )
        row = dict(db.fetchone())
        row["owner_id"] = "00000000-0000-0000-0000-000000000000"
        return row
    else:
        db.execute(
            "INSERT INTO events (owner_id, title, description, event_type, start_at, end_at, "
            "all_day, color, location, class_code, entity_id, members_only) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *, FALSE AS is_global",
            (str(user["id"]), body.title, body.description, body.event_type,
             body.start_at, body.end_at, body.all_day, body.color, body.location,
             body.class_code, eid, body.members_only),
        )
        return db.fetchone()


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    event_id: str,
    body: EventCreate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    eid = str(body.entity_id) if body.entity_id else None

    # Try personal event first
    db.execute("SELECT id FROM events WHERE id = %s AND owner_id = %s", (event_id, str(user["id"])))
    if db.fetchone():
        db.execute(
            "UPDATE events SET title=%s, description=%s, event_type=%s, start_at=%s, "
            "end_at=%s, all_day=%s, color=%s, location=%s, class_code=%s, entity_id=%s "
            "WHERE id=%s RETURNING *, FALSE AS is_global",
            (body.title, body.description, body.event_type, body.start_at,
             body.end_at, body.all_day, body.color, body.location, body.class_code, eid, event_id),
        )
        row = db.fetchone()
        if not row.get("owner_id"):
            row = dict(row); row["owner_id"] = str(user["id"])
        return row

    # Try global event (requires key)
    db.execute("SELECT id FROM global_events WHERE id = %s", (event_id,))
    if db.fetchone():
        require_global_key(x_global_key)
        db.execute(
            "UPDATE global_events SET title=%s, description=%s, event_type=%s, start_at=%s, "
            "end_at=%s, all_day=%s, color=%s, location=%s, class_code=%s, entity_id=%s "
            "WHERE id=%s RETURNING *, TRUE AS is_global",
            (body.title, body.description, body.event_type, body.start_at,
             body.end_at, body.all_day, body.color, body.location, body.class_code, eid, event_id),
        )
        row = dict(db.fetchone())
        row["owner_id"] = "00000000-0000-0000-0000-000000000000"
        return row

    raise HTTPException(404, "Evento não encontrado ou sem permissão")


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: str,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    db.execute("SELECT id FROM events WHERE id = %s AND owner_id = %s", (event_id, str(user["id"])))
    if db.fetchone():
        db.execute("DELETE FROM events WHERE id = %s", (event_id,))
        return
    db.execute("SELECT id FROM global_events WHERE id = %s", (event_id,))
    if db.fetchone():
        require_global_key(x_global_key)
        db.execute("DELETE FROM global_events WHERE id = %s", (event_id,))
        return
    raise HTTPException(404, "Evento não encontrado")
