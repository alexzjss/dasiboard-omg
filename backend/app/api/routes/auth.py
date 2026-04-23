from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from psycopg2.extras import RealDictCursor
from jose import JWTError

from app.db.session import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.schemas.schemas import RegisterRequest, TokenResponse, RefreshRequest, UserOut
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: RealDictCursor = Depends(get_db),
):
    exc = HTTPException(status_code=401, detail="Não autorizado",
                        headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise exc
        user_id = payload.get("sub")
    except JWTError:
        raise exc

    db.execute("SELECT * FROM users WHERE id = %s AND is_active = TRUE", (user_id,))
    user = db.fetchone()
    if not user:
        raise exc
    return user


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterRequest, db: RealDictCursor = Depends(get_db)):
    db.execute("SELECT id FROM users WHERE email = %s", (body.email,))
    if db.fetchone():
        raise HTTPException(409, "E-mail já cadastrado")

    db.execute(
        """INSERT INTO users (email, hashed_password, full_name, nusp)
           VALUES (%s, %s, %s, %s) RETURNING *""",
        (body.email, hash_password(body.password), body.full_name, body.nusp),
    )
    return db.fetchone()


@router.post("/login", response_model=TokenResponse)
def login(
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    db: RealDictCursor = Depends(get_db),
):
    db.execute("SELECT * FROM users WHERE email = %s", (form.username,))
    user = db.fetchone()
    if not user or not verify_password(form.password, user["hashed_password"]):
        raise HTTPException(401, "Credenciais inválidas")
    if not user["is_active"]:
        raise HTTPException(403, "Conta desativada")

    refresh_token = create_refresh_token(str(user["id"]))
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )
    return TokenResponse(
        access_token=create_access_token(str(user["id"])),
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    db: RealDictCursor = Depends(get_db),
):
    refresh_token = body.refresh_token if body else None
    if not refresh_token:
        refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(401, "Refresh token ausente")

    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(401, "Refresh token inválido")

    db.execute("SELECT id FROM users WHERE id = %s AND is_active = TRUE", (user_id,))
    if not db.fetchone():
        raise HTTPException(401, "Usuário não encontrado")

    new_refresh = create_refresh_token(user_id)
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )
    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=new_refresh,
    )


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(key="refresh_token", path="/")
    return


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return user
