/**
 * Funds parity checker
 * Compares cached balances against ledger-derived balances for all projects.
 */

import { closeDatabase, query } from '../db/database';

async function run() {
  const result = await query<{
    project_id: string;
    cached_balance: string;
    ledger_balance: string;
  }>(
    `SELECT
       p.id AS project_id,
       p.gas_tank_balance::text AS cached_balance,
       COALESCE(SUM(
         CASE
           WHEN fle.entry_type IN ('credit', 'release') THEN fle.amount
           WHEN fle.entry_type IN ('reserve', 'debit') THEN -fle.amount
           ELSE 0
         END
       ), 0)::text AS ledger_balance
     FROM projects p
     LEFT JOIN fund_ledger_entries fle ON fle.project_id = p.id
     GROUP BY p.id, p.gas_tank_balance
     ORDER BY p.id`
  );

  const rows = result.rows.map((row) => {
    const delta = (BigInt(row.cached_balance) - BigInt(row.ledger_balance)).toString();
    return {
      projectId: row.project_id,
      cachedBalance: row.cached_balance,
      ledgerBalance: row.ledger_balance,
      delta,
      inSync: delta === '0',
    };
  });

  const drift = rows.filter((row) => !row.inSync);
  console.log(
    JSON.stringify(
      {
        summary: {
          totalProjects: rows.length,
          outOfSyncProjects: drift.length,
        },
        drift,
      },
      null,
      2
    )
  );

  process.exitCode = drift.length > 0 ? 1 : 0;
}

run()
  .catch((error) => {
    console.error('Parity check failed:', error.message);
    process.exitCode = 2;
  })
  .finally(async () => {
    await closeDatabase();
  });

