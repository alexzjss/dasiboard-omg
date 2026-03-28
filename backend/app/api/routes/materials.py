"""
Materiais de Estudo — /materials
Materiais pessoais (owner_id) + materiais globais (sem owner, requerem GLOBAL_EVENTS_KEY).
Usuários vêem seus próprios materiais + todos os globais.
"""
import json
import os
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Header, Form, UploadFile, File
from psycopg2.extras import RealDictCursor
from typing import List, Optional
from pydantic import BaseModel
from app.db.session import get_db
from app.api.routes.auth import get_current_user
from app.core.config import settings

router = APIRouter()

# Use UPLOAD_DIR env var; fallback for local dev
_raw_upload_dir = os.environ.get("UPLOAD_DIR", "/app/uploads")
UPLOAD_DIR = Path(_raw_upload_dir)

# Allowed MIME types / extensions for uploaded materials
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".txt", ".md", ".zip", ".mp4", ".mp3",
}


def _save_upload(file: UploadFile) -> tuple[str, str]:
    """Save an uploaded file to disk. Returns (file_url, file_name)."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Tipo de arquivo não permitido: {ext or '(sem extensão)'}")
    unique_name = f"{uuid.uuid4()}{ext}"
    dest = UPLOAD_DIR / unique_name
    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    return f"/files/{unique_name}", file.filename or unique_name


def _delete_upload(file_url: Optional[str]):
    """Remove a previously uploaded file if it lives under UPLOAD_DIR."""
    if not file_url or not file_url.startswith("/files/"):
        return
    path = UPLOAD_DIR / file_url.removeprefix("/files/")
    try:
        path.unlink(missing_ok=True)
    except Exception:
        pass


# ── Schemas ───────────────────────────────────────────────────────────────────

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
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form("outro"),
    type: str = Form("link"),
    url: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    tags: str = Form("[]"),
    is_global: bool = Form(False),
    semester: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    try:
        parsed_tags: List[str] = json.loads(tags) if tags else []
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(400, "Formato inválido para tags: esperado array JSON.")

    file_url: Optional[str] = None
    file_name: Optional[str] = None
    if file and file.filename:
        file_url, file_name = _save_upload(file)

    if is_global:
        if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
            if file_url:
                _delete_upload(file_url)
            raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
        db.execute(
            """
            INSERT INTO global_materials
                (title, description, category, type, url, file_url, file_name, subject, tags, semester)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (title, description, category, type,
             url, file_url, file_name, subject, parsed_tags, semester),
        )
        row = dict(db.fetchone())
        row["is_global"] = True
        row["created_by"] = None
    else:
        uid = str(user["id"])
        db.execute(
            """
            INSERT INTO materials
                (owner_id, title, description, category, type, url, file_url, file_name, subject, tags, semester)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (uid, title, description, category, type,
             url, file_url, file_name, subject, parsed_tags, semester),
        )
        row = dict(db.fetchone())
        row["is_global"] = False
        row["created_by"] = uid

    return _row_to_out(row)


@router.put("/{material_id}", response_model=MaterialOut)
def update_material(
    material_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    semester: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    uid = str(user["id"])

    new_file_url: Optional[str] = None
    new_file_name: Optional[str] = None
    if file and file.filename:
        new_file_url, new_file_name = _save_upload(file)

    try:
        parsed_tags: Optional[List[str]] = json.loads(tags) if tags is not None else None
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(400, "Formato inválido para tags: esperado array JSON.")

    updates: dict = {}
    if title       is not None: updates["title"]       = title
    if description is not None: updates["description"] = description
    if category    is not None: updates["category"]    = category
    if type        is not None: updates["type"]        = type
    if url         is not None: updates["url"]         = url
    if subject     is not None: updates["subject"]     = subject
    if parsed_tags is not None: updates["tags"]        = parsed_tags
    if semester    is not None: updates["semester"]    = semester
    if new_file_url:
        updates["file_url"]  = new_file_url
        updates["file_name"] = new_file_name

    # Try personal first
    db.execute("SELECT * FROM materials WHERE id = %s AND owner_id = %s",
               (material_id, uid))
    row = db.fetchone()
    if row:
        old_file_url = dict(row).get("file_url") if new_file_url else None
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
        if old_file_url:
            _delete_upload(old_file_url)
        return _row_to_out(updated)

    # Try global
    db.execute("SELECT * FROM global_materials WHERE id = %s", (material_id,))
    row = db.fetchone()
    if row:
        if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
            if new_file_url:
                _delete_upload(new_file_url)
            raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
        old_file_url = dict(row).get("file_url") if new_file_url else None
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
        if old_file_url:
            _delete_upload(old_file_url)
        return _row_to_out(updated)

    if new_file_url:
        _delete_upload(new_file_url)
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
    db.execute("DELETE FROM materials WHERE id = %s AND owner_id = %s RETURNING id, file_url",
               (material_id, uid))
    row = db.fetchone()
    if row:
        _delete_upload(dict(row).get("file_url"))
        return

    # Try global
    db.execute("SELECT id, file_url FROM global_materials WHERE id = %s", (material_id,))
    row = db.fetchone()
    if row:
        if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
            raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
        _delete_upload(dict(row).get("file_url"))
        db.execute("DELETE FROM global_materials WHERE id = %s", (material_id,))
        return

    raise HTTPException(404, "Material não encontrado.")

