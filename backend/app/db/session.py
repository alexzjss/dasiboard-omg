"""
Conexão com PostgreSQL via psycopg2 puro.
Sem ORM — o schema é criado/migrado automaticamente na startup via advisory lock.
"""
import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
from app.core.config import settings

_pool = None

INIT_SQL = """
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email            VARCHAR(255) UNIQUE NOT NULL,
    hashed_password  VARCHAR(255) NOT NULL,
    full_name        VARCHAR(255) NOT NULL,
    nusp             VARCHAR(20)  UNIQUE,
    avatar_url       TEXT,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    is_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── Kanban ────────────────────────────────────────────────
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

-- ── Subjects / Grades ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code           VARCHAR(20)  NOT NULL,
    name           VARCHAR(255) NOT NULL,
    professor      VARCHAR(255),
    semester       VARCHAR(10)  NOT NULL,
    color          VARCHAR(7)  NOT NULL DEFAULT '#8B5CF6',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- ── Entities ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entities (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          VARCHAR(50)  UNIQUE NOT NULL,
    name          VARCHAR(255) NOT NULL,
    short_name    VARCHAR(50)  NOT NULL,
    description   TEXT        NOT NULL,
    category      VARCHAR(50)  NOT NULL DEFAULT 'academic',
    color         VARCHAR(7)  NOT NULL DEFAULT '#7c3aed',
    icon_emoji    VARCHAR(10)  NOT NULL DEFAULT '🎓',
    website_url   VARCHAR(512),
    instagram_url VARCHAR(512),
    email         VARCHAR(255),
    member_key    VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entity_members (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID        NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    user_id   UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_entity_members_entity ON entity_members (entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_members_user   ON entity_members (user_id);

-- ── Events ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    event_type   VARCHAR(20) NOT NULL DEFAULT 'personal',
    start_at     TIMESTAMPTZ NOT NULL,
    end_at       TIMESTAMPTZ,
    all_day      BOOLEAN     NOT NULL DEFAULT FALSE,
    color        VARCHAR(7)  NOT NULL DEFAULT '#10B981',
    location     VARCHAR(255),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_owner    ON events (owner_id);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events (start_at);

CREATE TABLE IF NOT EXISTS global_events (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    event_type   VARCHAR(20) NOT NULL DEFAULT 'academic',
    start_at     TIMESTAMPTZ NOT NULL,
    end_at       TIMESTAMPTZ,
    all_day      BOOLEAN     NOT NULL DEFAULT FALSE,
    color        VARCHAR(7)  NOT NULL DEFAULT '#4d67f5',
    location     VARCHAR(255),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_global_events_start ON global_events (start_at);

-- ── Migrations: add columns if missing (idempotent) ───────
ALTER TABLE subjects     ADD COLUMN IF NOT EXISTS total_classes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subjects     ADD COLUMN IF NOT EXISTS attended       INTEGER NOT NULL DEFAULT 0;

ALTER TABLE events       ADD COLUMN IF NOT EXISTS class_code    VARCHAR(30);
ALTER TABLE events       ADD COLUMN IF NOT EXISTS entity_id     UUID REFERENCES entities(id) ON DELETE SET NULL;
ALTER TABLE events       ADD COLUMN IF NOT EXISTS members_only  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE global_events ADD COLUMN IF NOT EXISTS class_code    VARCHAR(30);
ALTER TABLE global_events ADD COLUMN IF NOT EXISTS entity_id     UUID REFERENCES entities(id) ON DELETE SET NULL;
ALTER TABLE global_events ADD COLUMN IF NOT EXISTS members_only  BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_events_entity ON events (entity_id);

-- Fix event_type constraint to include 'entity' type
ALTER TABLE events       DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE events       ADD  CONSTRAINT events_event_type_check
    CHECK (event_type IN ('academic', 'personal', 'deadline', 'exam', 'entity', 'work'));

ALTER TABLE global_events DROP CONSTRAINT IF EXISTS global_events_event_type_check;
ALTER TABLE global_events ADD  CONSTRAINT global_events_event_type_check
    CHECK (event_type IN ('academic', 'personal', 'deadline', 'exam', 'entity', 'work'));

-- ── Triggers ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_kanban_cards_updated_at
    BEFORE UPDATE ON kanban_cards FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Seed entities (idempotent) ────────────────────────────
INSERT INTO entities (slug, name, short_name, description, category, color, icon_emoji, instagram_url, email) VALUES
('dasi',         'Diretório Acadêmico de Sistemas de Informação', 'DASI',
 'O DASI é o diretório acadêmico do curso de Sistemas de Informação da EACH-USP. Representa os estudantes, organiza eventos, promove a integração do curso e defende os direitos e interesses dos alunos.',
 'academic',  '#7c3aed', '🎓', 'https://instagram.com/dasi.each', 'dasi@usp.br'),
('each-in-shell','EACH in the Shell', 'EachShell',
 'Grupo dedicado à segurança da informação, hacking ético e CTF (Capture The Flag). Realiza workshops, treinamentos e competições de cybersegurança, formando profissionais na área.',
 'tech',      '#ef4444', '💻', 'https://instagram.com/eachintheshell', NULL),
('hype',         'HypE — Hub de Pesquisa', 'HypE',
 'Centro de estudos e projetos em Ciência de Dados, Inteligência Artificial e Machine Learning. Desenvolve pesquisas aplicadas, realiza hackathons e conecta estudantes ao mercado de dados.',
 'research',  '#f97316', '⚡', 'https://instagram.com/hype.each', NULL),
('conway',       'Conway Game Studio', 'Conway',
 'Grupo de desenvolvimento de jogos digitais e computação gráfica. Cria jogos, realiza game jams, explora engines como Unity e Godot, e estuda fundamentos de CG e rendering.',
 'tech',      '#10b981', '🎮', 'https://instagram.com/conway.each', NULL),
('codelab',      'CodeLab Leste', 'CodeLab',
 'Hub de inovação tecnológica e desenvolvimento web da EACH. Desenvolve produtos digitais reais, ensina programação web moderna e fomenta o empreendedorismo tecnológico no leste paulistano.',
 'tech',      '#ec4899', '🧪', 'https://instagram.com/codelableste', NULL),
('sintese',      'Síntese Jr.', 'Síntese Jr.',
 'Empresa júnior do curso de Sistemas de Informação, formada e gerida por alunos. Presta serviços de tecnologia para clientes reais, desenvolvendo competências técnicas e de gestão dos membros.',
 'empresa',   '#3b82f6', '💼', 'https://instagram.com/sintesejr', 'contato@sintesejr.com.br'),
('semana-si',    'Semana de SI', 'SemanaSI',
 'Evento anual de Sistemas de Informação da EACH-USP. Concentra palestras, workshops, mesas-redondas e networking com profissionais do mercado e pesquisadores da área.',
 'event',     '#a855f7', '🎪', 'https://instagram.com/semana.si', NULL),
('lab-minas',    'Lab das Minas', 'LabMinas',
 'Grupo de pesquisa focado na inserção e permanência de mulheres na ciência e tecnologia. Realiza mentorias, palestras inspiracionais e cria rede de apoio para mulheres na área de TI.',
 'diversity', '#f472b6', '🔬', 'https://instagram.com/labdasminas', NULL),
('pet-si',       'PET-SI — Programa de Educação Tutorial', 'PET-SI',
 'Programa de Educação Tutorial de Sistemas de Informação, financiado pelo MEC/SESu. Desenvolve atividades de pesquisa, ensino e extensão, promovendo formação acadêmica de excelência.',
 'research',  '#881337', '🦉', 'https://instagram.com/pet.si.each', 'pet-si@usp.br'),
('grace',        'GrACE — Garotas em Computação', 'GrACE',
 'Grupo de garotas em computação e empreendedorismo da EACH. Promove diversidade de gênero na tecnologia, com eventos, mentorias e ações para empoderar mulheres na carreira de TI.',
 'diversity', '#e879f9', '🌸', 'https://instagram.com/grace.each', NULL)
ON CONFLICT (slug) DO NOTHING;
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
    """Cria/migra tabelas na startup. Advisory lock garante execução única entre workers."""
    pool = get_pool()
    conn = pool.getconn()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SELECT pg_advisory_lock(12345678)")
            try:
                cur.execute(INIT_SQL)
            finally:
                cur.execute("SELECT pg_advisory_unlock(12345678)")
        conn.autocommit = False
    except Exception:
        conn.autocommit = False
        raise
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
