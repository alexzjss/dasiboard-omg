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
ALTER TABLE events       ADD COLUMN IF NOT EXISTS recurring     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events       ADD COLUMN IF NOT EXISTS recur_weeks   INTEGER;

ALTER TABLE global_events ADD COLUMN IF NOT EXISTS class_code    VARCHAR(30);
ALTER TABLE global_events ADD COLUMN IF NOT EXISTS entity_id     UUID REFERENCES entities(id) ON DELETE SET NULL;
ALTER TABLE global_events ADD COLUMN IF NOT EXISTS members_only  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE global_events ADD COLUMN IF NOT EXISTS recurring     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE global_events ADD COLUMN IF NOT EXISTS recur_weeks   INTEGER;

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

-- ══════════════════════════════════════════════════════
-- SOCIAL FEATURES — idempotent migrations (added later)
-- ══════════════════════════════════════════════════════

-- Public profile columns on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_profile      BOOLEAN  NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_bio          TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS entry_year          SMALLINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_subjects     BOOLEAN  NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_achievements BOOLEAN  NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_entry_year     ON users (entry_year)     WHERE entry_year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_public_profile ON users (public_profile) WHERE public_profile = TRUE;

-- User achievements (server-side)
CREATE TABLE IF NOT EXISTS user_achievements (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ach_id      VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, ach_id)
);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (user_id);

-- Social / shared notes
CREATE TABLE IF NOT EXISTS notes (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    content     TEXT         NOT NULL DEFAULT '',
    subject_id  UUID         REFERENCES subjects(id) ON DELETE SET NULL,
    is_public   BOOLEAN      NOT NULL DEFAULT FALSE,
    share_token VARCHAR(20)  UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_owner       ON notes (owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_share_token ON notes (share_token) WHERE share_token IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notes_updated_at'
  ) THEN
    CREATE TRIGGER trg_notes_updated_at
      BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Study rooms
CREATE TABLE IF NOT EXISTS study_rooms (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code         VARCHAR(20)  UNIQUE NOT NULL,
    subject_code VARCHAR(20),
    subject_name VARCHAR(255) NOT NULL,
    created_by   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_study_rooms_creator ON study_rooms (created_by);

CREATE TABLE IF NOT EXISTS study_room_sessions (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id   UUID        NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
    user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at   TIMESTAMPTZ,
    duration_min INTEGER,
    UNIQUE(room_id, user_id, joined_at)
);
CREATE INDEX IF NOT EXISTS idx_room_sessions_room   ON study_room_sessions (room_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_user   ON study_room_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_online ON study_room_sessions (room_id) WHERE left_at IS NULL;

-- Auto-compute duration_min on leave
CREATE OR REPLACE FUNCTION compute_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    NEW.duration_min := GREATEST(1, EXTRACT(EPOCH FROM (NEW.left_at - NEW.joined_at)) / 60)::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_session_duration'
  ) THEN
    CREATE TRIGGER trg_session_duration
      BEFORE UPDATE ON study_room_sessions
      FOR EACH ROW EXECUTE FUNCTION compute_duration();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS study_room_invites (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id      UUID        NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
    invited_nusp VARCHAR(20) NOT NULL,
    invited_by   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, invited_nusp)
);
CREATE INDEX IF NOT EXISTS idx_room_invites_room ON study_room_invites (room_id);
CREATE INDEX IF NOT EXISTS idx_room_invites_nusp ON study_room_invites (invited_nusp);

-- is_global flag on events
ALTER TABLE events        ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE global_events ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT TRUE;


-- ── User follows ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_follows (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, followed_id),
    CHECK(follower_id != followed_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON user_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON user_follows (followed_id);

-- ── Activity feed ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_feed (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       VARCHAR(30) NOT NULL,
    payload    JSONB       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_actor   ON activity_feed (actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_feed (created_at DESC);

-- ── Mentions in events ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_mentions (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    mentioned_nusp VARCHAR(20) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, mentioned_nusp)
);
CREATE INDEX IF NOT EXISTS idx_event_mentions_event ON event_mentions (event_id);
CREATE INDEX IF NOT EXISTS idx_event_mentions_nusp  ON event_mentions (mentioned_nusp);

-- ── Materials ─────────────────────────────────────────────────────────────────
-- Materiais pessoais (por usuário)
CREATE TABLE IF NOT EXISTS materials (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(20)  NOT NULL DEFAULT 'outro'
                    CHECK (category IN ('aula','exercicio','livro','video','artigo','podcast','outro')),
    type        VARCHAR(10)  NOT NULL DEFAULT 'link'
                    CHECK (type IN ('link','file')),
    url         TEXT,
    file_url    TEXT,
    file_name   VARCHAR(255),
    subject     VARCHAR(50),
    tags        TEXT[]       NOT NULL DEFAULT '{}',
    semester    VARCHAR(10),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_materials_owner    ON materials (owner_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials (category);
CREATE INDEX IF NOT EXISTS idx_materials_subject  ON materials (subject) WHERE subject IS NOT NULL;

-- Materiais globais (visíveis para todos, requerem chave)
CREATE TABLE IF NOT EXISTS global_materials (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(20)  NOT NULL DEFAULT 'outro'
                    CHECK (category IN ('aula','exercicio','livro','video','artigo','podcast','outro')),
    type        VARCHAR(10)  NOT NULL DEFAULT 'link'
                    CHECK (type IN ('link','file')),
    url         TEXT,
    file_url    TEXT,
    file_name   VARCHAR(255),
    subject     VARCHAR(50),
    tags        TEXT[]       NOT NULL DEFAULT '{}',
    semester    VARCHAR(10),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_global_materials_category ON global_materials (category);
CREATE INDEX IF NOT EXISTS idx_global_materials_subject  ON global_materials (subject) WHERE subject IS NOT NULL;

"""

# Migration separada para materiais — executada independentemente do INIT_SQL principal.
# Isso garante que as tabelas sejam criadas mesmo em deploys onde o container não
# foi reiniciado (advisory lock do INIT_SQL já havia rodado sem este bloco).
MATERIALS_MIGRATION_SQL = """
CREATE TABLE IF NOT EXISTS materials (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(20)  NOT NULL DEFAULT 'outro'
                    CHECK (category IN ('aula','exercicio','livro','video','artigo','podcast','outro')),
    type        VARCHAR(10)  NOT NULL DEFAULT 'link'
                    CHECK (type IN ('link','file')),
    url         TEXT,
    file_url    TEXT,
    file_name   VARCHAR(255),
    subject     VARCHAR(50),
    tags        TEXT[]       NOT NULL DEFAULT '{}',
    semester    VARCHAR(10),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_materials_owner    ON materials (owner_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials (category);
CREATE INDEX IF NOT EXISTS idx_materials_subject  ON materials (subject) WHERE subject IS NOT NULL;

ALTER TABLE materials ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS category VARCHAR(20);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS type VARCHAR(10);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS subject VARCHAR(50);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE materials ADD COLUMN IF NOT EXISTS semester VARCHAR(10);
UPDATE materials SET category = 'outro' WHERE category IS NULL;
UPDATE materials SET type = 'link' WHERE type IS NULL;
UPDATE materials SET tags = ARRAY[]::TEXT[] WHERE tags IS NULL;
ALTER TABLE materials ALTER COLUMN category SET DEFAULT 'outro';
ALTER TABLE materials ALTER COLUMN type SET DEFAULT 'link';
ALTER TABLE materials ALTER COLUMN tags SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE materials ALTER COLUMN category SET NOT NULL;
ALTER TABLE materials ALTER COLUMN type SET NOT NULL;
ALTER TABLE materials ALTER COLUMN tags SET NOT NULL;

CREATE TABLE IF NOT EXISTS global_materials (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(20)  NOT NULL DEFAULT 'outro'
                    CHECK (category IN ('aula','exercicio','livro','video','artigo','podcast','outro')),
    type        VARCHAR(10)  NOT NULL DEFAULT 'link'
                    CHECK (type IN ('link','file')),
    url         TEXT,
    file_url    TEXT,
    file_name   VARCHAR(255),
    subject     VARCHAR(50),
    tags        TEXT[]       NOT NULL DEFAULT '{}',
    semester    VARCHAR(10),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_global_materials_category ON global_materials (category);
CREATE INDEX IF NOT EXISTS idx_global_materials_subject  ON global_materials (subject) WHERE subject IS NOT NULL;

ALTER TABLE global_materials ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE global_materials ADD COLUMN IF NOT EXISTS category VARCHAR(20);
ALTER TABLE global_materials ADD COLUMN IF NOT EXISTS type VARCHAR(10);
ALTER TABLE global_materials ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE global_materials ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE global_materials ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE global_materials ADD COLUMN IF NOT EXISTS subject VARCHAR(50);
ALTER TABLE global_materials ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE global_materials ADD COLUMN IF NOT EXISTS semester VARCHAR(10);
UPDATE global_materials SET category = 'outro' WHERE category IS NULL;
UPDATE global_materials SET type = 'link' WHERE type IS NULL;
UPDATE global_materials SET tags = ARRAY[]::TEXT[] WHERE tags IS NULL;
ALTER TABLE global_materials ALTER COLUMN category SET DEFAULT 'outro';
ALTER TABLE global_materials ALTER COLUMN type SET DEFAULT 'link';
ALTER TABLE global_materials ALTER COLUMN tags SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE global_materials ALTER COLUMN category SET NOT NULL;
ALTER TABLE global_materials ALTER COLUMN type SET NOT NULL;
ALTER TABLE global_materials ALTER COLUMN tags SET NOT NULL;
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

            # Migration de materiais: executa com lock próprio para garantir
            # que rode mesmo em containers que não passaram pelo INIT_SQL completo.
            cur.execute("SELECT pg_advisory_lock(12345679)")
            try:
                cur.execute(MATERIALS_MIGRATION_SQL)
            finally:
                cur.execute("SELECT pg_advisory_unlock(12345679)")

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
