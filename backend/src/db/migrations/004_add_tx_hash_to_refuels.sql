-- Migration 004: Add Transaction Hash to Refuels
-- Adds tx_hash field to track on-chain deposit transactions

-- Add tx_hash column
ALTER TABLE gas_tank_refuels
ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66),
ADD COLUMN IF NOT EXISTS forwarded_tx_hash VARCHAR(66),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmed';

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_refuels_tx_hash ON gas_tank_refuels(tx_hash);

-- Add comments
COMMENT ON COLUMN gas_tank_refuels.tx_hash IS 'Original deposit transaction hash';
COMMENT ON COLUMN gas_tank_refuels.forwarded_tx_hash IS 'Transaction hash when forwarded to paymaster';
COMMENT ON COLUMN gas_tank_refuels.status IS 'Status: pending, confirmed, forwarded, failed';
