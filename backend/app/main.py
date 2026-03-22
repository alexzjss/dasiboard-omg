from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, users, kanban, grades, events, entities, social
from app.db.session import init_db

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


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
