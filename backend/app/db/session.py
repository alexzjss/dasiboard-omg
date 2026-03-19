"""
Conexão com PostgreSQL via psycopg2 puro.
Sem ORM, sem migrations — o schema é criado automaticamente na startup.
"""
import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
from app.core.config import settings

_pool = None

INIT_SQL = """
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email            VARCHAR(255) UNIQUE NOT NULL,
    hashed_password  VARCHAR(255) NOT NULL,
    full_name        VARCHAR(255) NOT NULL,
    nusp             VARCHAR(20)  UNIQUE,
    avatar_url       VARCHAR(512),
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    is_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS kanban_boards (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    color      VARCHAR(7)  NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_owner ON kanban_boards (owner_id);

CREATE TABLE IF NOT EXISTS kanban_columns (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id   UUID        NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    position   INTEGER     NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board ON kanban_columns (board_id);

CREATE TABLE IF NOT EXISTS kanban_cards (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    column_id   UUID        NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
    title       VARCHAR(512) NOT NULL,
    description TEXT,
    priority    VARCHAR(10) NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high')),
    due_date    TIMESTAMPTZ,
    position    INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column ON kanban_cards (column_id);

CREATE TABLE IF NOT EXISTS subjects (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code       VARCHAR(20)  NOT NULL,
    name       VARCHAR(255) NOT NULL,
    professor  VARCHAR(255),
    semester   VARCHAR(10)  NOT NULL,
    color      VARCHAR(7)  NOT NULL DEFAULT '#8B5CF6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subjects_owner ON subjects (owner_id);

CREATE TABLE IF NOT EXISTS grades (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    label      VARCHAR(100) NOT NULL,
    value      NUMERIC(5,2) NOT NULL,
    weight     NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    max_value  NUMERIC(5,2) NOT NULL DEFAULT 10.0,
    date       TIMESTAMPTZ,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades (subject_id);

CREATE TABLE IF NOT EXISTS events (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    event_type  VARCHAR(20) NOT NULL DEFAULT 'personal'
                    CHECK (event_type IN ('academic', 'personal', 'deadline', 'exam')),
    start_at    TIMESTAMPTZ NOT NULL,
    end_at      TIMESTAMPTZ,
    all_day     BOOLEAN     NOT NULL DEFAULT FALSE,
    color       VARCHAR(7)  NOT NULL DEFAULT '#10B981',
    location    VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_owner    ON events (owner_id);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events (start_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_kanban_cards_updated_at
    BEFORE UPDATE ON kanban_cards
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
"""


def get_pool():
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            host=settings.POSTGRES_HOST,
            port=settings.POSTGRES_PORT,
            dbname=settings.POSTGRES_DB,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            sslmode="require",
        )
    return _pool


def init_db():
    """Cria as tabelas se ainda não existirem. Chamado na startup do app."""
    pool = get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(INIT_SQL)
        conn.commit()
    finally:
        pool.putconn(conn)


@contextmanager
def get_conn():
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def get_db():
    """FastAPI dependency — yields a RealDictCursor."""
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            yield cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()
