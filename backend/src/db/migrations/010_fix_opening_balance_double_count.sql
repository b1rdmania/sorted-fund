-- Migration: Remove opening-balance ledger entries when they worsen parity
-- Date: 2026-02-03

WITH ledger_totals AS (
    SELECT
        p.id AS project_id,
        p.gas_tank_balance::numeric AS cached_balance,
        COALESCE(SUM(
            CASE
                WHEN fle.entry_type IN ('credit', 'release') THEN fle.amount::numeric
                WHEN fle.entry_type IN ('reserve', 'debit') THEN -fle.amount::numeric
                ELSE 0
            END
        ), 0) AS ledger_with_opening,
        COALESCE(SUM(
            CASE
                WHEN fle.idempotency_key LIKE 'opening-balance-%' THEN 0
                WHEN fle.entry_type IN ('credit', 'release') THEN fle.amount::numeric
                WHEN fle.entry_type IN ('reserve', 'debit') THEN -fle.amount::numeric
                ELSE 0
            END
        ), 0) AS ledger_without_opening
    FROM projects p
    LEFT JOIN fund_ledger_entries fle ON fle.project_id = p.id
    GROUP BY p.id, p.gas_tank_balance
), candidates AS (
    SELECT
        project_id
    FROM ledger_totals
    WHERE ABS(ledger_without_opening - cached_balance) < ABS(ledger_with_opening - cached_balance)
)
DELETE FROM fund_ledger_entries fle
USING candidates c
WHERE fle.project_id = c.project_id
  AND fle.idempotency_key = CONCAT('opening-balance-', c.project_id);

