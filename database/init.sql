-- =============================================================
--  DaSIboard — Schema inicial
--  Este arquivo é executado automaticamente pelo PostgreSQL
--  na primeira vez que o container sobe (volume vazio).
--  Não é necessário nenhuma ferramenta além do próprio SQL.
-- =============================================================

-- ── Extensões ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ── Users ─────────────────────────────────────────────────
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

-- ── Kanban boards ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kanban_boards (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    color      VARCHAR(7)  NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_boards_owner ON kanban_boards (owner_id);

-- ── Kanban columns ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kanban_columns (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id   UUID        NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    position   INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kanban_columns_board ON kanban_columns (board_id);

-- ── Kanban cards ───────────────────────────────────────────
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

-- ── Subjects (disciplinas) ─────────────────────────────────
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

-- ── Grades (notas) ─────────────────────────────────────────
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

-- ── Events (calendário) ────────────────────────────────────
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
    class_code  VARCHAR(20),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_owner    ON events (owner_id);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events (start_at);

-- ── Global Events (visíveis para todos) ────────────────────
CREATE TABLE IF NOT EXISTS global_events (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    event_type  VARCHAR(20) NOT NULL DEFAULT 'academic'
                    CHECK (event_type IN ('academic', 'personal', 'deadline', 'exam')),
    start_at    TIMESTAMPTZ NOT NULL,
    end_at      TIMESTAMPTZ,
    all_day     BOOLEAN     NOT NULL DEFAULT FALSE,
    color       VARCHAR(7)  NOT NULL DEFAULT '#4d67f5',
    location    VARCHAR(255),
    class_code  VARCHAR(20),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_events_start_at ON global_events (start_at);

-- ── Trigger: updated_at automático ────────────────────────
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
