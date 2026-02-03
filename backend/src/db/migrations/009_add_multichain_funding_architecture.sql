-- Migration: Add multi-chain architecture and project funding accounts
-- Date: 2026-02-03

-- =====================================================
-- 1. CHAINS REGISTRY
-- =====================================================
CREATE TABLE IF NOT EXISTS chains (
    chain_id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rpc_url TEXT NOT NULL,
    entrypoint_address VARCHAR(42),
    native_symbol VARCHAR(16) NOT NULL DEFAULT 'NATIVE',
    paymaster_address VARCHAR(42),
    is_testnet BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, disabled
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chains_status ON chains(status);

DROP TRIGGER IF EXISTS update_chains_updated_at ON chains;
CREATE TRIGGER update_chains_updated_at
    BEFORE UPDATE ON chains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed Sonic testnet (idempotent)
INSERT INTO chains (
    chain_id,
    name,
    rpc_url,
    entrypoint_address,
    native_symbol,
    paymaster_address,
    is_testnet,
    status
)
VALUES (
    14601,
    'Sonic Testnet',
    'https://rpc.testnet.soniclabs.com',
    '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    'S',
    NULL,
    true,
    'active'
)
ON CONFLICT (chain_id) DO NOTHING;

-- =====================================================
-- 2. PROJECT FUNDING ACCOUNTS (PER CHAIN)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_funding_accounts (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    chain_id INTEGER NOT NULL REFERENCES chains(chain_id) ON DELETE RESTRICT,
    asset_symbol VARCHAR(16) NOT NULL DEFAULT 'NATIVE',
    deposit_address VARCHAR(42) NOT NULL,
    derivation_index INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, disabled
    last_checked_block BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, chain_id, asset_symbol),
    UNIQUE(chain_id, derivation_index)
);

CREATE INDEX IF NOT EXISTS idx_project_funding_accounts_project_id ON project_funding_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_funding_accounts_chain_id ON project_funding_accounts(chain_id);
CREATE INDEX IF NOT EXISTS idx_project_funding_accounts_deposit_address ON project_funding_accounts(deposit_address);

DROP TRIGGER IF EXISTS update_project_funding_accounts_updated_at ON project_funding_accounts;
CREATE TRIGGER update_project_funding_accounts_updated_at
    BEFORE UPDATE ON project_funding_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Backfill existing project deposit addresses to Sonic testnet funding accounts
INSERT INTO project_funding_accounts (
    project_id,
    chain_id,
    asset_symbol,
    deposit_address,
    derivation_index,
    status,
    last_checked_block
)
SELECT
    p.id,
    14601,
    'NATIVE',
    p.deposit_address,
    p.derivation_index,
    'active',
    COALESCE(p.last_checked_block, 0)
FROM projects p
WHERE p.deposit_address IS NOT NULL
  AND p.derivation_index IS NOT NULL
ON CONFLICT (project_id, chain_id, asset_symbol) DO NOTHING;

-- =====================================================
-- 3. CHAIN SCOPING FOR EVENTS AND LEDGER
-- =====================================================
ALTER TABLE sponsorship_events ADD COLUMN IF NOT EXISTS chain_id INTEGER;
UPDATE sponsorship_events SET chain_id = 14601 WHERE chain_id IS NULL;
ALTER TABLE sponsorship_events ALTER COLUMN chain_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'sponsorship_events'
          AND constraint_name = 'fk_sponsorship_events_chain_id'
    ) THEN
        ALTER TABLE sponsorship_events
        ADD CONSTRAINT fk_sponsorship_events_chain_id
        FOREIGN KEY (chain_id) REFERENCES chains(chain_id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sponsorship_events_chain_id ON sponsorship_events(chain_id);

ALTER TABLE fund_ledger_entries ADD COLUMN IF NOT EXISTS chain_id INTEGER;
UPDATE fund_ledger_entries SET chain_id = 14601 WHERE chain_id IS NULL;
ALTER TABLE fund_ledger_entries ALTER COLUMN chain_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'fund_ledger_entries'
          AND constraint_name = 'fk_fund_ledger_entries_chain_id'
    ) THEN
        ALTER TABLE fund_ledger_entries
        ADD CONSTRAINT fk_fund_ledger_entries_chain_id
        FOREIGN KEY (chain_id) REFERENCES chains(chain_id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fund_ledger_entries_chain_id ON fund_ledger_entries(chain_id);

-- =====================================================
-- 4. FUNDING SOURCES (GRANTS/CREDITS/DEPOSITS)
-- =====================================================
CREATE TABLE IF NOT EXISTS funding_sources (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    chain_id INTEGER REFERENCES chains(chain_id) ON DELETE RESTRICT,
    source_type VARCHAR(32) NOT NULL, -- deposit, grant, credit
    name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, exhausted, disabled
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_funding_sources_type CHECK (source_type IN ('deposit', 'grant', 'credit'))
);

CREATE INDEX IF NOT EXISTS idx_funding_sources_org_id ON funding_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_chain_id ON funding_sources(chain_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_status ON funding_sources(status);

DROP TRIGGER IF EXISTS update_funding_sources_updated_at ON funding_sources;
CREATE TRIGGER update_funding_sources_updated_at
    BEFORE UPDATE ON funding_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS project_funding_allocations (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    funding_source_id INTEGER NOT NULL REFERENCES funding_sources(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 100,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, disabled
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, funding_source_id)
);

CREATE INDEX IF NOT EXISTS idx_project_funding_allocations_project_id ON project_funding_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_funding_allocations_source_id ON project_funding_allocations(funding_source_id);

