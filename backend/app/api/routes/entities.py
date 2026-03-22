from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from typing import List
from app.db.session import get_db
from app.api.routes.auth import get_current_user
from app.schemas.schemas import EntityOut, EntityJoin, EntityEventCreate, EventOut
from app.core.config import settings
from app.core.rate_limit import rate_entity_event

router = APIRouter()


def _resolve_key(slug: str) -> str | None:
    """Return the configured member key for a slug, or None if the entity is open."""
    return settings.get_entity_key(slug)


@router.get("/", response_model=List[EntityOut])
def list_entities(db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("""
        SELECT e.*,
               COUNT(DISTINCT em.user_id) AS member_count,
               EXISTS(SELECT 1 FROM entity_members WHERE entity_id=e.id AND user_id=%s) AS is_member
        FROM entities e
        LEFT JOIN entity_members em ON em.entity_id = e.id
        GROUP BY e.id
        ORDER BY e.name
    """, (str(user["id"]),))
    rows = db.fetchall()
    result = []
    for row in rows:
        r = dict(row)
        # Tell the frontend whether this entity requires a key
        r["has_key"] = bool(_resolve_key(r["slug"]))
        result.append(r)
    return result


@router.get("/{slug}", response_model=EntityOut)
def get_entity(slug: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("""
        SELECT e.*,
               COUNT(DISTINCT em.user_id) AS member_count,
               EXISTS(SELECT 1 FROM entity_members WHERE entity_id=e.id AND user_id=%s) AS is_member
        FROM entities e
        LEFT JOIN entity_members em ON em.entity_id = e.id
        WHERE e.slug = %s
        GROUP BY e.id
    """, (str(user["id"]), slug))
    row = db.fetchone()
    if not row:
        raise HTTPException(404, "Entidade não encontrada")
    r = dict(row)
    r["has_key"] = bool(_resolve_key(slug))
    return r


@router.post("/{slug}/join")
def join_entity(
    slug: str,
    body: EntityJoin,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    db.execute("SELECT id FROM entities WHERE slug = %s", (slug,))
    entity = db.fetchone()
    if not entity:
        raise HTTPException(404, "Entidade não encontrada")

    required_key = _resolve_key(slug)
    if required_key:
        if not body.key or body.key != required_key:
            raise HTTPException(403, "Chave de acesso inválida")

    db.execute(
        "INSERT INTO entity_members (entity_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
        (str(entity["id"]), str(user["id"])),
    )
    return {"ok": True}


@router.post("/{slug}/leave")
def leave_entity(slug: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM entities WHERE slug = %s", (slug,))
    entity = db.fetchone()
    if not entity:
        raise HTTPException(404, "Entidade não encontrada")
    db.execute(
        "DELETE FROM entity_members WHERE entity_id=%s AND user_id=%s",
        (str(entity["id"]), str(user["id"])),
    )
    return {"ok": True}


@router.get("/{slug}/events", response_model=List[EventOut])
def entity_events(slug: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM entities WHERE slug = %s", (slug,))
    entity = db.fetchone()
    if not entity:
        raise HTTPException(404, "Entidade não encontrada")

    db.execute(
        "SELECT 1 FROM entity_members WHERE entity_id=%s AND user_id=%s",
        (str(entity["id"]), str(user["id"])),
    )
    is_member = db.fetchone() is not None

    if is_member:
        db.execute(
            "SELECT *, FALSE AS is_global FROM events WHERE entity_id = %s ORDER BY start_at",
            (str(entity["id"]),),
        )
    else:
        db.execute(
            "SELECT *, FALSE AS is_global FROM events WHERE entity_id = %s AND members_only = FALSE ORDER BY start_at",
            (str(entity["id"]),),
        )

    rows = db.fetchall()
    result = []
    for row in rows:
        r = dict(row)
        if not r.get("owner_id"):
            r["owner_id"] = "00000000-0000-0000-0000-000000000000"
        result.append(r)
    return result


@router.post("/{slug}/events", response_model=EventOut, status_code=201)
def create_entity_event(
    slug: str,
    body: EntityEventCreate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    db.execute("SELECT id FROM entities WHERE slug = %s", (slug,))
    entity = db.fetchone()
    if not entity:
        raise HTTPException(404, "Entidade não encontrada")

    db.execute(
        "SELECT 1 FROM entity_members WHERE entity_id=%s AND user_id=%s",
        (str(entity["id"]), str(user["id"])),
    )
    if not db.fetchone():
        raise HTTPException(403, "Apenas membros podem criar eventos para esta entidade")

    rate_entity_event(str(user["id"]))
    db.execute(
        """INSERT INTO events
               (owner_id, title, description, event_type, start_at, end_at,
                all_day, color, location, entity_id, members_only)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
           RETURNING *, FALSE AS is_global""",
        (str(user["id"]), body.title, body.description, body.event_type,
         body.start_at, body.end_at, body.all_day, body.color, body.location,
         str(entity["id"]), body.members_only),
    )
    return db.fetchone()


@router.get("/{slug}/members")
def list_entity_members(slug: str, db: RealDictCursor = Depends(get_db), user=Depends(get_current_user)):
    db.execute("SELECT id FROM entities WHERE slug = %s", (slug,))
    entity = db.fetchone()
    if not entity:
        raise HTTPException(404, "Entidade não encontrada")
    db.execute("""
        SELECT u.id, u.full_name, u.avatar_url
        FROM entity_members em
        JOIN users u ON u.id = em.user_id
        WHERE em.entity_id = %s
        ORDER BY u.full_name
    """, (str(entity["id"]),))
    return db.fetchall()
