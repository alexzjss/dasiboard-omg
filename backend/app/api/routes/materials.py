"""
Materiais de Estudo — /materials

Arquitetura de upload:
  - Materiais link/file são criados via JSON (POST /materials) — sem multipart
  - Upload de arquivo é feito via endpoint separado (POST /materials/{id}/upload)
  - Arquivos ficam em /app/uploads/<uuid>/<filename> — servidos via StaticFiles
  - Volume Docker mapeado em produção garante persistência entre deploys

Isso separa claramente criação de metadados (JSON) de upload binário (multipart),
eliminando conflitos de Content-Type e tornando o fluxo previsível e testável.
"""
import os
import shutil
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel

from app.db.session import get_db
from app.api.routes.auth import get_current_user
from app.core.config import settings

router = APIRouter()

# ── Upload directory ──────────────────────────────────────────────────────────

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB

ALLOWED_SUFFIXES = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".txt", ".md", ".zip", ".mp4", ".mp3", ".png", ".jpg", ".jpeg",
    ".gif", ".webp",
}


def _store_file(upload: UploadFile) -> tuple[str, str]:
    """
    Salva o arquivo em UPLOAD_DIR/<uuid>/<filename>.
    Retorna (file_url_relativa, file_name).
    """
    suffix = Path(upload.filename or "arquivo").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            400,
            f"Tipo de arquivo não permitido: '{suffix}'. "
            f"Permitidos: {', '.join(sorted(ALLOWED_SUFFIXES))}"
        )

    uid = str(uuid4())
    dest_dir = UPLOAD_DIR / uid
    dest_dir.mkdir(parents=True, exist_ok=True)
    filename = Path(upload.filename or "arquivo").name
    dest = dest_dir / filename

    written = 0
    try:
        with dest.open("wb") as out:
            while chunk := upload.file.read(256 * 1024):  # 256 KB chunks
                written += len(chunk)
                if written > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "Arquivo muito grande. Máximo permitido: 50 MB.")
                out.write(chunk)
    except HTTPException:
        shutil.rmtree(dest_dir, ignore_errors=True)
        raise

    return f"/uploads/{uid}/{filename}", filename


def _delete_file(file_url: Optional[str]) -> None:
    """Remove fisicamente o arquivo a partir da file_url. Silencioso em caso de erro."""
    if not file_url:
        return
    try:
        # /uploads/<uuid>/<filename>  →  UPLOAD_DIR/<uuid>/
        parts = file_url.strip("/").split("/")  # ["uploads", "<uuid>", "<filename>"]
        if len(parts) >= 2:
            shutil.rmtree(UPLOAD_DIR / parts[1], ignore_errors=True)
    except Exception:
        pass


# ── Schemas ───────────────────────────────────────────────────────────────────

class MaterialIn(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "outro"   # aula | exercicio | livro | video | artigo | podcast | outro
    type: str = "link"        # link | file
    url: Optional[str] = None
    subject: Optional[str] = None
    tags: List[str] = []
    is_global: bool = False
    semester: Optional[str] = None


class MaterialPatch(BaseModel):
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


class UploadOut(BaseModel):
    file_url: str
    file_name: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _check_global_key(key: Optional[str]) -> None:
    if not key or key != settings.GLOBAL_EVENTS_KEY:
        raise HTTPException(403, "Chave de acesso global inválida ou ausente.")


def _parse_tags(raw) -> List[str]:
    """Normaliza tags vindas do Postgres (texto ou lista Python)."""
    if not raw:
        return []
    if isinstance(raw, list):
        return [t for t in raw if t]
    # Postgres array literal: {a,b,c}
    return [t.strip().strip('"') for t in str(raw).strip("{}").split(",") if t.strip()]


def _row(row: dict, is_global: bool, created_by: Optional[str]) -> dict:
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
        "tags":        _parse_tags(row.get("tags")),
        "is_global":   is_global,
        "created_at":  row["created_at"].isoformat() if hasattr(row["created_at"], "isoformat") else str(row["created_at"]),
        "created_by":  str(created_by) if created_by else None,
        "semester":    row.get("semester"),
    }


# ── GET /materials/ ───────────────────────────────────────────────────────────

@router.get("/", response_model=List[MaterialOut])
def list_materials(
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
):
    """Retorna materiais do usuário + todos os globais, ordenados por data desc."""
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
        return [_row(dict(r), bool(r["is_global"]), r.get("created_by")) for r in rows]
    except Exception as exc:
        msg = str(exc).lower()
        if "does not exist" in msg or "relation" in msg:
            raise HTTPException(
                503,
                "Tabelas de materiais não encontradas. "
                "Reinicie o container do backend para aplicar as migrações."
            )
        raise


# ── POST /materials/ ──────────────────────────────────────────────────────────

@router.post("/", response_model=MaterialOut, status_code=201)
def create_material(
    body: MaterialIn,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    """
    Cria um material com metadados (JSON).
    Para materiais do tipo 'file', após criar, faça POST /materials/{id}/upload
    para enviar o arquivo binário.
    """
    if body.type == "link" and not body.url:
        raise HTTPException(400, "URL é obrigatória para materiais do tipo 'link'.")

    if body.is_global:
        _check_global_key(x_global_key)
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
        r = dict(db.fetchone())
        return _row(r, True, None)

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
    r = dict(db.fetchone())
    return _row(r, False, uid)


# ── POST /materials/{id}/upload ───────────────────────────────────────────────

@router.post("/{material_id}/upload", response_model=UploadOut)
def upload_file(
    material_id: str,
    file: UploadFile = File(...),
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    """
    Faz upload de um arquivo e associa ao material.
    Funciona tanto para materiais pessoais quanto globais.
    Substitui arquivo anterior se existir.
    Endpoint separado do JSON para evitar problemas de Content-Type com axios.
    """
    uid = str(user["id"])

    # Localizar o material (pessoal ou global)
    db.execute("SELECT * FROM materials WHERE id = %s AND owner_id = %s", (material_id, uid))
    row = db.fetchone()
    table = "materials"
    where = "id = %s AND owner_id = %s"
    where_vals = [material_id, uid]

    if not row:
        db.execute("SELECT * FROM global_materials WHERE id = %s", (material_id,))
        row = db.fetchone()
        if not row:
            raise HTTPException(404, "Material não encontrado.")
        _check_global_key(x_global_key)
        table = "global_materials"
        where = "id = %s"
        where_vals = [material_id]

    old_row = dict(row)

    # Apagar arquivo anterior se existir
    _delete_file(old_row.get("file_url"))

    # Salvar novo arquivo
    file_url, file_name = _store_file(file)

    # Atualizar banco
    db.execute(
        f"UPDATE {table} SET file_url = %s, file_name = %s, type = 'file' WHERE {where}",
        [file_url, file_name] + where_vals,
    )

    return {"file_url": file_url, "file_name": file_name}


# ── PUT /materials/{id} ───────────────────────────────────────────────────────

@router.put("/{material_id}", response_model=MaterialOut)
def update_material(
    material_id: str,
    body: MaterialPatch,
    db: RealDictCursor = Depends(get_db),
    user=Depends(get_current_user),
    x_global_key: Optional[str] = Header(None),
):
    uid = str(user["id"])
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}

    # Se mudar para link, limpar campos de arquivo
    if updates.get("type") == "link":
        updates["file_url"] = None
        updates["file_name"] = None

    # ── Pessoal ──────────────────────────────────────────────────────────────
    db.execute("SELECT * FROM materials WHERE id = %s AND owner_id = %s", (material_id, uid))
    row = db.fetchone()
    if row:
        if updates.get("type") == "link":
            _delete_file(dict(row).get("file_url"))
        if not updates:
            return _row(dict(row), False, uid)
        cols = ", ".join(f"{k} = %s" for k in updates)
        db.execute(
            f"UPDATE materials SET {cols} WHERE id = %s AND owner_id = %s RETURNING *",
            list(updates.values()) + [material_id, uid],
        )
        return _row(dict(db.fetchone()), False, uid)

    # ── Global ────────────────────────────────────────────────────────────────
    db.execute("SELECT * FROM global_materials WHERE id = %s", (material_id,))
    row = db.fetchone()
    if row:
        _check_global_key(x_global_key)
        if updates.get("type") == "link":
            _delete_file(dict(row).get("file_url"))
        if not updates:
            return _row(dict(row), True, None)
        cols = ", ".join(f"{k} = %s" for k in updates)
        db.execute(
            f"UPDATE global_materials SET {cols} WHERE id = %s RETURNING *",
            list(updates.values()) + [material_id],
        )
        return _row(dict(db.fetchone()), True, None)

    raise HTTPException(404, "Material não encontrado.")


# ── DELETE /materials/{id} ────────────────────────────────────────────────────

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
        _delete_file(dict(row).get("file_url"))
        db.execute("DELETE FROM materials WHERE id = %s AND owner_id = %s", (material_id, uid))
        return

    db.execute("SELECT id, file_url FROM global_materials WHERE id = %s", (material_id,))
    row = db.fetchone()
    if row:
        _check_global_key(x_global_key)
        _delete_file(dict(row).get("file_url"))
        db.execute("DELETE FROM global_materials WHERE id = %s", (material_id,))
        return

    raise HTTPException(404, "Material não encontrado.")
