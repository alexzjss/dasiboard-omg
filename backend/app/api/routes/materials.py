"""
Materiais de Estudo — /materials
Materiais pessoais (owner_id) + materiais globais (sem owner, requerem GLOBAL_EVENTS_KEY).
Usuários vêem seus próprios materiais + todos os globais.
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from psycopg2.extras import RealDictCursor
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from app.db.session import get_db
from app.api.routes.auth import get_current_user
from app.core.config import settings

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class MaterialCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "outro"         # aula | exercicio | livro | video | artigo | podcast | outro
    type: str = "link"              # link | file
    url: Optional[str] = None
    subject: Optional[str] = None
    tags: List[str] = []
    is_global: bool = False
    semester: Optional[str] = None


class MaterialUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None
    url: Optional[str] = None
    subject: Optional[str] = None
    tags: Optional[List[str]] = None
    semester: Optional[str] = None


class MaterialOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: str
    type: str
    url: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    subject: Optional[str] = None
    tags: List[str] = []
    is_global: bool
    created_at: str
    created_by: Optional[str] = None
    semester: Optional[str] = None


# ── Auth helper ───────────────────────────────────────────────────────────────

def require_global_key(x_global_key: Optional[str] = Header(None)):
    if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
        raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
    return True


# ── Row → dict ────────────────────────────────────────────────────────────────

def _row_to_out(row: dict) -> dict:
    tags = row.get("tags") or []
    if isinstance(tags, str):
        # Postgres array stored as text — parse "{a,b,c}"
        tags = [t.strip().strip('"') for t in tags.strip("{}").split(",") if t.strip()]
    return {
        "id":          str(row["id"]),
        "title":       row["title"],
        "description": row.get("description"),
        "category":    row["category"],
        "type":        row["type"],
        "url":         row.get("url"),
        "file_url":    row.get("file_url"),
        "file_name":   row.get("file_name"),
        "subject":     row.get("subject"),
        "tags":        [t for t in tags if t],
        "is_global":   bool(row.get("is_global", False)),
        "created_at":  row["created_at"].isoformat() if hasattr(row["created_at"], "isoformat") else str(row["created_at"]),
        "created_by":  str(row["created_by"]) if row.get("created_by") else None,
        "semester":    row.get("semester"),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[MaterialOut])
def list_materials(
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    """Retorna os materiais do usuário + todos os globais."""
    uid = str(user["id"])
    db.execute(
        """
        SELECT id, owner_id AS created_by, title, description, category, type,
               url, file_url, file_name, subject, tags, FALSE AS is_global,
               created_at, semester
        FROM   materials
        WHERE  owner_id = %s

        UNION ALL

        SELECT id, NULL AS created_by, title, description, category, type,
               url, file_url, file_name, subject, tags, TRUE AS is_global,
               created_at, semester
        FROM   global_materials

        ORDER BY created_at DESC
        """,
        (uid,),
    )
    rows = db.fetchall()
    return [_row_to_out(dict(r)) for r in rows]


@router.post("/", response_model=MaterialOut, status_code=201)
def create_material(
    body: MaterialCreate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    if body.is_global:
        if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
            raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
        db.execute(
            """
            INSERT INTO global_materials
                (title, description, category, type, url, subject, tags, semester)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (body.title, body.description, body.category, body.type,
             body.url, body.subject, body.tags, body.semester),
        )
        row = dict(db.fetchone())
        row["is_global"] = True
        row["created_by"] = None
    else:
        uid = str(user["id"])
        db.execute(
            """
            INSERT INTO materials
                (owner_id, title, description, category, type, url, subject, tags, semester)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (uid, body.title, body.description, body.category, body.type,
             body.url, body.subject, body.tags, body.semester),
        )
        row = dict(db.fetchone())
        row["is_global"] = False
        row["created_by"] = uid

    return _row_to_out(row)


@router.put("/{material_id}", response_model=MaterialOut)
def update_material(
    material_id: str,
    body: MaterialUpdate,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    uid = str(user["id"])

    # Try personal first
    db.execute("SELECT * FROM materials WHERE id = %s AND owner_id = %s",
               (material_id, uid))
    row = db.fetchone()
    if row:
        updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
        if not updates:
            return _row_to_out({**dict(row), "is_global": False, "created_by": uid})
        cols = ", ".join(f"{k} = %s" for k in updates)
        vals = list(updates.values()) + [material_id, uid]
        db.execute(
            f"UPDATE materials SET {cols} WHERE id = %s AND owner_id = %s RETURNING *",
            vals,
        )
        updated = dict(db.fetchone())
        updated["is_global"] = False
        updated["created_by"] = uid
        return _row_to_out(updated)

    # Try global
    db.execute("SELECT * FROM global_materials WHERE id = %s", (material_id,))
    row = db.fetchone()
    if row:
        if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
            raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
        updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
        if not updates:
            return _row_to_out({**dict(row), "is_global": True, "created_by": None})
        cols = ", ".join(f"{k} = %s" for k in updates)
        vals = list(updates.values()) + [material_id]
        db.execute(
            f"UPDATE global_materials SET {cols} WHERE id = %s RETURNING *",
            vals,
        )
        updated = dict(db.fetchone())
        updated["is_global"] = True
        updated["created_by"] = None
        return _row_to_out(updated)

    raise HTTPException(404, "Material não encontrado.")


@router.delete("/{material_id}", status_code=204)
def delete_material(
    material_id: str,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    uid = str(user["id"])

    # Try personal
    db.execute("DELETE FROM materials WHERE id = %s AND owner_id = %s RETURNING id",
               (material_id, uid))
    if db.fetchone():
        return

    # Try global
    db.execute("SELECT id FROM global_materials WHERE id = %s", (material_id,))
    if db.fetchone():
        if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
            raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
        db.execute("DELETE FROM global_materials WHERE id = %s", (material_id,))
        return

    raise HTTPException(404, "Material não encontrado.")
