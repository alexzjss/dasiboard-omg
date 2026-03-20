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
    """Dependency: requer a chave de admin para operações em eventos globais."""
    if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
        raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
    return True


@router.get("/", response_model=List[EventOut])
def list_events(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    event_type: Optional[str] = Query(None),
    class_code: Optional[str] = Query(None),
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    personal_q = "SELECT *, FALSE AS is_global FROM events WHERE owner_id = %s"
    global_q   = "SELECT *, TRUE AS is_global FROM global_events WHERE 1=1"
    p_params = [str(user["id"])]
    g_params: list = []

    if start:
        personal_q += " AND start_at >= %s"; p_params.append(start)
        global_q   += " AND start_at >= %s"; g_params.append(start)
    if end:
        personal_q += " AND start_at <= %s"; p_params.append(end)
        global_q   += " AND start_at <= %s"; g_params.append(end)
    if event_type:
        personal_q += " AND event_type = %s"; p_params.append(event_type)
        global_q   += " AND event_type = %s"; g_params.append(event_type)
    if class_code:
        personal_q += " AND class_code ILIKE %s"; p_params.append(f"%{class_code}%")
        global_q   += " AND class_code ILIKE %s"; g_params.append(f"%{class_code}%")

    combined = f"({personal_q}) UNION ALL ({global_q}) ORDER BY start_at"
    db.execute(combined, p_params + g_params)
    rows = db.fetchall()
    result = []
    for row in rows:
        r = dict(row)
        if r.get("is_global") and not r.get("owner_id"):
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
    if body.is_global:
        require_global_key(x_global_key)
        db.execute(
            "INSERT INTO global_events (title, description, event_type, start_at, end_at, all_day, color, location, class_code) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *, TRUE AS is_global",
            (body.title, body.description, body.event_type,
             body.start_at, body.end_at, body.all_day, body.color, body.location, body.class_code),
        )
        row = dict(db.fetchone())
        row["owner_id"] = "00000000-0000-0000-0000-000000000000"
        return row
    else:
        db.execute(
            "INSERT INTO events (owner_id, title, description, event_type, start_at, end_at, all_day, color, location, class_code) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *, FALSE AS is_global",
            (str(user["id"]), body.title, body.description, body.event_type,
             body.start_at, body.end_at, body.all_day, body.color, body.location, body.class_code),
        )
        return db.fetchone()


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    event_id: str,
    body: EventCreate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    db.execute("SELECT id FROM events WHERE id = %s AND owner_id = %s", (event_id, str(user["id"])))
    if not db.fetchone():
        raise HTTPException(404, "Evento não encontrado")
    db.execute(
        "UPDATE events SET title=%s,description=%s,event_type=%s,start_at=%s,"
        "end_at=%s,all_day=%s,color=%s,location=%s,class_code=%s WHERE id=%s RETURNING *,FALSE AS is_global",
        (body.title, body.description, body.event_type, body.start_at,
         body.end_at, body.all_day, body.color, body.location, body.class_code, event_id),
    )
    return db.fetchone()


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: str,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    # Check personal event first
    db.execute("SELECT id FROM events WHERE id = %s AND owner_id = %s", (event_id, str(user["id"])))
    if db.fetchone():
        db.execute("DELETE FROM events WHERE id = %s", (event_id,))
        return

    # Check global event — requires key
    db.execute("SELECT id FROM global_events WHERE id = %s", (event_id,))
    if db.fetchone():
        require_global_key(x_global_key)
        db.execute("DELETE FROM global_events WHERE id = %s", (event_id,))
        return

    raise HTTPException(404, "Evento não encontrado")
