-- Migration: Add developer_id to sponsorship_events
-- Date: 2026-01-16

-- Add developer_id column to sponsorship_events
ALTER TABLE sponsorship_events ADD COLUMN IF NOT EXISTS developer_id INTEGER REFERENCES developers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sponsorship_events_developer_id ON sponsorship_events(developer_id);

-- Backfill developer_id for existing sponsorship events based on project
UPDATE sponsorship_events se
SET developer_id = p.developer_id
FROM projects p
WHERE se.project_id = p.id AND se.developer_id IS NULL AND p.developer_id IS NOT NULL;
