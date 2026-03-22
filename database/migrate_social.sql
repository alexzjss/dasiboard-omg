-- ═══════════════════════════════════════════════════════
-- DaSIboard — Migração Social & Comunidade
-- ═══════════════════════════════════════════════════════

-- ── Perfil público opt-in ──────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_profile   BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_bio        VARCHAR(300);
ALTER TABLE users ADD COLUMN IF NOT EXISTS entry_year        SMALLINT;     -- ex: 2022, 2023
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_subjects   BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_achievements BOOLEAN   NOT NULL DEFAULT FALSE;

-- ── Notas persistidas no servidor ─────────────────────
CREATE TABLE IF NOT EXISTS notes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id  VARCHAR(50),          -- disciplina code (optional link)
    title       VARCHAR(255) NOT NULL DEFAULT 'Sem título',
    content     TEXT        NOT NULL DEFAULT '',
    is_public   BOOLEAN     NOT NULL DEFAULT FALSE,
    share_token VARCHAR(32) UNIQUE,   -- random token for public link
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_owner  ON notes (owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_token  ON notes (share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_public ON notes (is_public)   WHERE is_public = TRUE;

-- ── Salas de estudo persistentes ──────────────────────
CREATE TABLE IF NOT EXISTS study_rooms (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(12) UNIQUE NOT NULL,   -- ex: "BD1-2024", gerado
    subject_code VARCHAR(20),
    subject_name VARCHAR(255) NOT NULL,
    created_by  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rooms_code    ON study_rooms (code);
CREATE INDEX IF NOT EXISTS idx_rooms_subject ON study_rooms (subject_code);

CREATE TABLE IF NOT EXISTS study_room_sessions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID        NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at     TIMESTAMPTZ,
    duration_min INTEGER     GENERATED ALWAYS AS (
        CASE WHEN left_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (left_at - joined_at))::INTEGER / 60
             ELSE NULL END
    ) STORED
);
CREATE INDEX IF NOT EXISTS idx_room_sessions_room ON study_room_sessions (room_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_user ON study_room_sessions (user_id);

-- ── Convites por número USP ────────────────────────────
CREATE TABLE IF NOT EXISTS study_room_invites (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID        NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
    invited_nusp VARCHAR(20) NOT NULL,
    invited_by  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, invited_nusp)
);
