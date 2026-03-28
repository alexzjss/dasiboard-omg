import os
import tempfile
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import settings
from app.api.routes import auth, users, kanban, grades, events, entities, social, materials
from app.db.session import init_db

# Use UPLOAD_DIR env var; fallback to a temp directory for local dev
_uploads_dir = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
try:
    _uploads_dir.mkdir(parents=True, exist_ok=True)
except PermissionError:
    # Fallback if /app is not writable (e.g. local development)
    _uploads_dir = Path(tempfile.gettempdir()) / "dasiboard_uploads"
    _uploads_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="DaSIboard API",
    description="API do dashboard acadêmico — SI EACH USP",
    version="1.0.0",
    docs_url="/docs" if settings.APP_ENV == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(auth.router,     prefix="/auth",     tags=["Auth"])
app.include_router(users.router,    prefix="/users",    tags=["Users"])
app.include_router(kanban.router,   prefix="/kanban",   tags=["Kanban"])
app.include_router(grades.router,   prefix="/grades",   tags=["Grades"])
app.include_router(events.router,   prefix="/events",   tags=["Events"])
app.include_router(entities.router, prefix="/entities", tags=["Entities"])
app.include_router(social.router,   prefix="/social",   tags=["Social"])
app.include_router(materials.router,prefix="/materials",tags=["Materials"])

# Serve uploaded files
app.mount("/files", StaticFiles(directory=str(_uploads_dir)), name="files")


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
