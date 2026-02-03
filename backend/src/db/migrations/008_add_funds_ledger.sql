-- Migration: Add immutable funds ledger for project accounting
-- Date: 2026-02-03

-- =====================================================
-- 1. FUNDS LEDGER TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS fund_ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entry_type VARCHAR(32) NOT NULL, -- credit, debit, reserve, release, settlement, adjustment
    amount BIGINT NOT NULL CHECK (amount >= 0),
    asset VARCHAR(16) NOT NULL DEFAULT 'S',
    reference_type VARCHAR(64), -- sponsorship_event, refuel, migration, manual
    reference_id VARCHAR(255),
    idempotency_key VARCHAR(255) NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fund_ledger_entry_type
        CHECK (entry_type IN ('credit', 'debit', 'reserve', 'release', 'settlement', 'adjustment')),
    CONSTRAINT uq_fund_ledger_project_idempotency UNIQUE (project_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_fund_ledger_org_id ON fund_ledger_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_fund_ledger_project_created_at ON fund_ledger_entries(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fund_ledger_reference ON fund_ledger_entries(reference_type, reference_id);

-- =====================================================
-- 2. SPONSORSHIP EVENTS: link lifecycle ledger entries
-- =====================================================
ALTER TABLE sponsorship_events ADD COLUMN IF NOT EXISTS reserved_ledger_entry_id BIGINT REFERENCES fund_ledger_entries(id) ON DELETE SET NULL;
ALTER TABLE sponsorship_events ADD COLUMN IF NOT EXISTS settled_ledger_entry_id BIGINT REFERENCES fund_ledger_entries(id) ON DELETE SET NULL;
ALTER TABLE sponsorship_events ADD COLUMN IF NOT EXISTS released_ledger_entry_id BIGINT REFERENCES fund_ledger_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sponsorship_reserved_ledger ON sponsorship_events(reserved_ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_settled_ledger ON sponsorship_events(settled_ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_released_ledger ON sponsorship_events(released_ledger_entry_id);

-- =====================================================
-- 3. BACKFILL OPENING BALANCE ENTRIES
-- =====================================================
INSERT INTO fund_ledger_entries (
    organization_id,
    project_id,
    entry_type,
    amount,
    asset,
    reference_type,
    reference_id,
    idempotency_key,
    metadata_json
)
SELECT
    p.organization_id,
    p.id,
    'credit',
    p.gas_tank_balance,
    'S',
    'migration',
    NULL,
    CONCAT('opening-balance-', p.id),
    jsonb_build_object('source', 'projects.gas_tank_balance', 'migrated_at', NOW())
FROM projects p
WHERE p.gas_tank_balance > 0
ON CONFLICT (project_id, idempotency_key) DO NOTHING;

