-- Migration: Add Privy Authentication Support
-- Date: 2026-02-01

-- =====================================================
-- 1. ADD PRIVY_USER_ID TO DEVELOPERS
-- =====================================================
ALTER TABLE developers ADD COLUMN IF NOT EXISTS privy_user_id VARCHAR(255) UNIQUE;

-- Make email nullable (Privy may provide wallet-only users)
ALTER TABLE developers ALTER COLUMN email DROP NOT NULL;

-- Make password_hash nullable (Privy handles auth)
ALTER TABLE developers ALTER COLUMN password_hash DROP NOT NULL;

-- Make name nullable (can be set later)
ALTER TABLE developers ALTER COLUMN name DROP NOT NULL;

-- Add index for privy_user_id lookups
CREATE INDEX IF NOT EXISTS idx_developers_privy_user_id ON developers(privy_user_id);

-- =====================================================
-- 2. DEVELOPER_SESSIONS TABLE NO LONGER NEEDED
-- (Privy manages sessions, but keep for backward compat)
-- =====================================================
-- We'll leave the table in place but stop using it for new sessions

-- =====================================================
-- 3. CREATE DEMO DEVELOPER WITH PRIVY ID (optional)
-- =====================================================
-- Existing demo account stays as-is for backward compatibility
-- New Privy users will be created on first login
