from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extras import RealDictCursor
from typing import List, Optional
from datetime import datetime
from app.db.session import get_db
from app.api.routes.auth import get_current_user
from app.schemas.schemas import EventCreate, EventOut

router = APIRouter()


@router.get("/", response_model=List[EventOut])
def list_events(
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    query = "SELECT * FROM events WHERE owner_id = %s"
    params = [str(user["id"])]
    if start:
        query += " AND start_at >= %s"
        params.append(start)
    if end:
        query += " AND start_at <= %s"
        params.append(end)
    query += " ORDER BY start_at"
    db.execute(query, params)
    return db.fetchall()


@router.post("/", response_model=EventOut, status_code=201)
def create_event(body: EventCreate, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute(
        """INSERT INTO events (owner_id, title, description, event_type, start_at, end_at, all_day, color, location)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (str(user["id"]), body.title, body.description, body.event_type,
         body.start_at, body.end_at, body.all_day, body.color, body.location),
    )
    return db.fetchone()


@router.patch("/{event_id}", response_model=EventOut)
def update_event(event_id: str, body: EventCreate, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM events WHERE id = %s AND owner_id = %s", (event_id, str(user["id"])))
    if not db.fetchone():
        raise HTTPException(404, "Evento não encontrado")
    db.execute(
        """UPDATE events SET title=%s, description=%s, event_type=%s, start_at=%s,
           end_at=%s, all_day=%s, color=%s, location=%s WHERE id=%s RETURNING *""",
        (body.title, body.description, body.event_type, body.start_at,
         body.end_at, body.all_day, body.color, body.location, event_id),
    )
    return db.fetchone()


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM events WHERE id = %s AND owner_id = %s", (event_id, str(user["id"])))
    if not db.fetchone():
        raise HTTPException(404, "Evento não encontrado")
    db.execute("DELETE FROM events WHERE id = %s", (event_id,))
