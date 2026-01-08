-- Migration 003: Add Deposit Addresses to Projects
-- Adds HD wallet deposit address fields to projects table

-- Add deposit address columns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS deposit_address VARCHAR(42),
ADD COLUMN IF NOT EXISTS derivation_index INTEGER,
ADD COLUMN IF NOT EXISTS last_checked_block BIGINT DEFAULT 0;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_projects_deposit_address ON projects(deposit_address);
CREATE INDEX IF NOT EXISTS idx_projects_derivation_index ON projects(derivation_index);

-- Add comment
COMMENT ON COLUMN projects.deposit_address IS 'HD wallet derived deposit address for this project';
COMMENT ON COLUMN projects.derivation_index IS 'BIP-44 derivation index used to generate deposit_address';
COMMENT ON COLUMN projects.last_checked_block IS 'Last block number checked for deposits (used by poller)';
