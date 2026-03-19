from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, users, kanban, grades, events

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

app.include_router(auth.router,   prefix="/api/auth",   tags=["Auth"])
app.include_router(users.router,  prefix="/api/users",  tags=["Users"])
app.include_router(kanban.router, prefix="/api/kanban", tags=["Kanban"])
app.include_router(grades.router, prefix="/api/grades", tags=["Grades"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
