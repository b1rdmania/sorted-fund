-- Sorted.fund Database Schema
-- PostgreSQL 14+

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, killed
    gas_tank_balance BIGINT NOT NULL DEFAULT 0, -- in wei
    daily_cap BIGINT NOT NULL DEFAULT 1000000000000000000, -- 1 ether in wei
    daily_spent BIGINT NOT NULL DEFAULT 0,
    daily_reset_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_preview VARCHAR(20) NOT NULL, -- First few chars for display
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rate_limit INTEGER NOT NULL DEFAULT 100, -- requests per minute
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);

-- Allowlist table
CREATE TABLE IF NOT EXISTS allowlists (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_contract VARCHAR(42) NOT NULL,
    function_selector VARCHAR(10) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, target_contract, function_selector)
);

CREATE INDEX IF NOT EXISTS idx_allowlists_project_id ON allowlists(project_id);

-- Gas Tank Refuels table
CREATE TABLE IF NOT EXISTS gas_tank_refuels (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL, -- in wei
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_refuels_project_id ON gas_tank_refuels(project_id);

-- Sponsorship Events table
CREATE TABLE IF NOT EXISTS sponsorship_events (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_op_hash VARCHAR(66),
    sender VARCHAR(42) NOT NULL,
    target VARCHAR(42) NOT NULL,
    selector VARCHAR(10) NOT NULL,
    estimated_gas BIGINT NOT NULL,
    actual_gas BIGINT,
    max_cost BIGINT NOT NULL, -- in wei
    status VARCHAR(50) NOT NULL, -- authorized, pending, success, failed, reverted
    paymaster_signature TEXT NOT NULL,
    policy_hash VARCHAR(66) NOT NULL,
    expiry TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_events_project_id ON sponsorship_events(project_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_events_user_op_hash ON sponsorship_events(user_op_hash);
CREATE INDEX IF NOT EXISTS idx_sponsorship_events_status ON sponsorship_events(status);
CREATE INDEX IF NOT EXISTS idx_sponsorship_events_created_at ON sponsorship_events(created_at);

-- Rate Limiting table (for tracking per-key requests)
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_start TIMESTAMP NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(api_key_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(api_key_id, window_start);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to projects table
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
