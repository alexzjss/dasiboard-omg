-- Migration v3: recurring events + rate-limiting indexes

-- Add recurrence columns to events
ALTER TABLE events       ADD COLUMN IF NOT EXISTS recurring   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events       ADD COLUMN IF NOT EXISTS recur_weeks INTEGER;
ALTER TABLE global_events ADD COLUMN IF NOT EXISTS recurring  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE global_events ADD COLUMN IF NOT EXISTS recur_weeks INTEGER;

-- work type for events (optional, may already be present)
DO $$
BEGIN
  BEGIN
    ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
    ALTER TABLE events ADD CONSTRAINT events_event_type_check
      CHECK (event_type IN ('academic','personal','deadline','exam','entity','work'));
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE global_events DROP CONSTRAINT IF EXISTS global_events_event_type_check;
    ALTER TABLE global_events ADD CONSTRAINT global_events_event_type_check
      CHECK (event_type IN ('academic','personal','deadline','exam','entity','work'));
  EXCEPTION WHEN others THEN NULL;
  END;
END$$;

-- Performance index for calendar queries
CREATE INDEX IF NOT EXISTS idx_events_owner_start       ON events        (owner_id, start_at);
CREATE INDEX IF NOT EXISTS idx_global_events_start      ON global_events (start_at);
CREATE INDEX IF NOT EXISTS idx_events_entity_start      ON events        (entity_id, start_at) WHERE entity_id IS NOT NULL;
