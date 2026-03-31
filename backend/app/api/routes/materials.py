"""
Materiais de Estudo — /materials
Materiais pessoais (owner_id) + materiais globais (sem owner, requerem GLOBAL_EVENTS_KEY).
Usuários vêem seus próprios materiais + todos os globais.

Suporte a upload de arquivos:
  - Arquivos são salvos em UPLOAD_DIR (padrão /app/uploads).
  - A URL pública é /uploads/<uuid>/<filename>, servida via StaticFiles no main.py.
  - Em produção: monte um volume Docker persistente em /app/uploads.
"""
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File as FastAPIFile, Form
from psycopg2.extras import RealDictCursor
from typing import List, Optional
from pathlib import Path
import shutil, os, json as _json

from app.db.session import get_db
from app.api.routes.auth import get_current_user
from app.core.config import settings

router = APIRouter()

# ── Upload dir ────────────────────────────────────────────────────────────────

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_BYTES = 50 * 1024 * 1024  # 50 MB

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx",
    ".xls", ".xlsx", ".txt", ".md", ".zip",
    ".mp4", ".mp3", ".png", ".jpg", ".jpeg", ".gif", ".webp",
}


def _save_upload(file: UploadFile) -> tuple:
    """Salva o arquivo em UPLOAD_DIR/<uuid>/<filename>. Retorna (file_url, file_name)."""
    from uuid import uuid4
    suffix = Path(file.filename or "arquivo").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Extensão '{suffix}' não permitida. "
            f"Permitidas: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    uid = str(uuid4())
    dest_dir = UPLOAD_DIR / uid
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or "arquivo").name
    dest = dest_dir / safe_name
    size = 0
    with dest.open("wb") as out:
        while True:
            chunk = file.file.read(1024 * 256)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_FILE_BYTES:
                out.close()
                shutil.rmtree(dest_dir, ignore_errors=True)
                raise HTTPException(413, "Arquivo muito grande. Máximo: 50 MB.")
            out.write(chunk)
    return f"/uploads/{uid}/{safe_name}", safe_name


def _delete_upload(file_url: Optional[str]):
    """Remove o diretório do arquivo físico silenciosamente."""
    if not file_url:
        return
    try:
        parts = file_url.strip("/").split("/")   # ["uploads", "<uuid>", "<name>"]
        if len(parts) >= 2:
            target = UPLOAD_DIR / parts[1]
            shutil.rmtree(target, ignore_errors=True)
    except Exception:
        pass


def _parse_tags(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        return _json.loads(raw)
    except Exception:
        return [t.strip() for t in raw.split(",") if t.strip()]


# ── Schemas ───────────────────────────────────────────────────────────────────

from pydantic import BaseModel

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


# ── Row → dict ────────────────────────────────────────────────────────────────

def _row_to_out(row: dict) -> dict:
    tags = row.get("tags") or []
    if isinstance(tags, str):
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
    try:
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
    except Exception as e:
        err_msg = str(e).lower()
        if "does not exist" in err_msg or "relation" in err_msg:
            raise HTTPException(
                503,
                "Tabelas de materiais ainda não inicializadas. "
                "Reinicie o container do backend para aplicar as migrações."
            )
        raise


@router.post("/", response_model=MaterialOut, status_code=201)
async def create_material(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form("outro"),
    type: str = Form("link"),
    url: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    tags: Optional[str] = Form("[]"),
    is_global: bool = Form(False),
    semester: Optional[str] = Form(None),
    file: Optional[UploadFile] = FastAPIFile(None),
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    tag_list = _parse_tags(tags)

    file_url: Optional[str] = None
    file_name: Optional[str] = None

    if type == "file":
        if not file or not file.filename:
            raise HTTPException(400, "Arquivo obrigatório para o tipo 'file'.")
        file_url, file_name = _save_upload(file)
        url = None  # file type não usa url

    if is_global:
        if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
            raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
        db.execute(
            """
            INSERT INTO global_materials
                (title, description, category, type, url, file_url, file_name, subject, tags, semester)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (title, description, category, type, url, file_url, file_name, subject, tag_list, semester),
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
            (uid, title, description, category, type, url, file_url, file_name, subject, tag_list, semester),
        )
        row = dict(db.fetchone())
        row["is_global"] = False
        row["created_by"] = uid

    return _row_to_out(row)


@router.put("/{material_id}", response_model=MaterialOut)
async def update_material(
    material_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    semester: Optional[str] = Form(None),
    file: Optional[UploadFile] = FastAPIFile(None),
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    uid = str(user["id"])
    updates: dict = {}
    if title is not None:       updates["title"] = title
    if description is not None: updates["description"] = description
    if category is not None:    updates["category"] = category
    if type is not None:        updates["type"] = type
    if subject is not None:     updates["subject"] = subject
    if semester is not None:    updates["semester"] = semester
    if url is not None:         updates["url"] = url
    if tags is not None:        updates["tags"] = _parse_tags(tags)

    # ── Personal ──────────────────────────────────────────────────────────────
    db.execute("SELECT * FROM materials WHERE id = %s AND owner_id = %s", (material_id, uid))
    row = db.fetchone()
    if row:
        old_file_url = dict(row).get("file_url")
        if file and file.filename:
            new_url, new_name = _save_upload(file)
            updates["file_url"] = new_url
            updates["file_name"] = new_name
            _delete_upload(old_file_url)
        if updates.get("type") == "link":
            updates["file_url"] = None
            updates["file_name"] = None
            _delete_upload(old_file_url)
        if not updates:
            return _row_to_out({**dict(row), "is_global": False, "created_by": uid})
        cols = ", ".join(f"{k} = %s" for k in updates)
        vals = list(updates.values()) + [material_id, uid]
        db.execute(f"UPDATE materials SET {cols} WHERE id = %s AND owner_id = %s RETURNING *", vals)
        updated = dict(db.fetchone())
        updated["is_global"] = False
        updated["created_by"] = uid
        return _row_to_out(updated)

    # ── Global ────────────────────────────────────────────────────────────────
    db.execute("SELECT * FROM global_materials WHERE id = %s", (material_id,))
    row = db.fetchone()
    if row:
        if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
            raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
        old_file_url = dict(row).get("file_url")
        if file and file.filename:
            new_url, new_name = _save_upload(file)
            updates["file_url"] = new_url
            updates["file_name"] = new_name
            _delete_upload(old_file_url)
        if updates.get("type") == "link":
            updates["file_url"] = None
            updates["file_name"] = None
            _delete_upload(old_file_url)
        if not updates:
            return _row_to_out({**dict(row), "is_global": True, "created_by": None})
        cols = ", ".join(f"{k} = %s" for k in updates)
        vals = list(updates.values()) + [material_id]
        db.execute(f"UPDATE global_materials SET {cols} WHERE id = %s RETURNING *", vals)
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

    db.execute("SELECT file_url FROM materials WHERE id = %s AND owner_id = %s", (material_id, uid))
    row = db.fetchone()
    if row:
        _delete_upload(dict(row).get("file_url"))
        db.execute("DELETE FROM materials WHERE id = %s AND owner_id = %s", (material_id, uid))
        return

    db.execute("SELECT id, file_url FROM global_materials WHERE id = %s", (material_id,))
    row = db.fetchone()
    if row:
        if not x_global_key or x_global_key != settings.GLOBAL_EVENTS_KEY:
            raise HTTPException(403, "Chave de acesso global inválida ou ausente.")
        _delete_upload(dict(row).get("file_url"))
        db.execute("DELETE FROM global_materials WHERE id = %s", (material_id,))
        return

    raise HTTPException(404, "Material não encontrado.")
