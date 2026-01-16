-- Migration: Add Developer Accounts and Credit System
-- Date: 2026-01-16

-- =====================================================
-- 1. DEVELOPERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS developers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credit_balance BIGINT NOT NULL DEFAULT 0, -- in wei (1 credit = 1 wei)
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, banned
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_developers_email ON developers(email);
CREATE INDEX IF NOT EXISTS idx_developers_status ON developers(status);

-- =====================================================
-- 2. DEVELOPER SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS developer_sessions (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON developer_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_developer_id ON developer_sessions(developer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON developer_sessions(expires_at);

-- =====================================================
-- 3. DEVELOPER-PROJECT LINKAGE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS developer_projects (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'owner', -- owner, admin, member
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(developer_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_developer_projects_developer_id ON developer_projects(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_projects_project_id ON developer_projects(project_id);

-- =====================================================
-- 4. CREDIT TRANSACTIONS TABLE (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    developer_id INTEGER NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL, -- positive = deposit, negative = deduction
    type VARCHAR(50) NOT NULL, -- deposit, deduction, refund, adjustment
    reference_type VARCHAR(50), -- sponsorship_event, refuel, manual, etc.
    reference_id INTEGER, -- ID of related record (e.g., sponsorship_event.id)
    balance_after BIGINT NOT NULL, -- snapshot of balance after transaction
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_developer_id ON credit_transactions(developer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- =====================================================
-- 5. MODIFY EXISTING PROJECTS TABLE
-- =====================================================
-- Add developer_id column to projects (nullable for backward compatibility)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS developer_id INTEGER REFERENCES developers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_developer_id ON projects(developer_id);

-- =====================================================
-- 6. APPLY UPDATED_AT TRIGGER TO NEW TABLES
-- =====================================================
DROP TRIGGER IF EXISTS update_developers_updated_at ON developers;
CREATE TRIGGER update_developers_updated_at
    BEFORE UPDATE ON developers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. CREATE DEMO DEVELOPER ACCOUNT
-- =====================================================
-- Password: "demo123" (hashed with bcrypt)
-- This is for development/testing purposes
INSERT INTO developers (email, password_hash, name, credit_balance, status)
VALUES (
    'demo@sorted.fund',
    '$2b$10$8K1p/YLvLtgVbQ.ZJmB.qO6T9X3Z0QYJ5zVQ6mK0Z8bJ0ZqK0Z0Z0', -- "demo123"
    'Demo Developer',
    1000000000000000000, -- 1 ether worth of credits
    'active'
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 8. LINK EXISTING TEST PROJECT TO DEMO DEVELOPER
-- =====================================================
DO $$
DECLARE
    demo_dev_id INTEGER;
BEGIN
    -- Get demo developer ID
    SELECT id INTO demo_dev_id FROM developers WHERE email = 'demo@sorted.fund';

    -- Update test-game project to belong to demo developer
    UPDATE projects
    SET developer_id = demo_dev_id
    WHERE id = 'test-game' AND developer_id IS NULL;

    -- Create developer_projects link
    INSERT INTO developer_projects (developer_id, project_id, role)
    VALUES (demo_dev_id, 'test-game', 'owner')
    ON CONFLICT (developer_id, project_id) DO NOTHING;
END $$;
