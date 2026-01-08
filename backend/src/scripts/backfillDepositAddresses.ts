/**
 * Backfill Deposit Addresses
 * Assign derivation indices and generate deposit addresses for existing projects
 */

import dotenv from 'dotenv';
import { query, initializeDatabase, closeDatabase } from '../db/database';
import * as depositService from '../services/depositService';

// Load environment variables
dotenv.config();

interface Project {
  id: string;
  name: string;
  deposit_address: string | null;
  derivation_index: number | null;
}

async function main() {
  console.log('=== Backfilling Deposit Addresses ===\n');

  try {
    // Initialize database
    await initializeDatabase();

    // Get all projects without deposit addresses
    const result = await query<Project>(
      `SELECT id, name, deposit_address, derivation_index
       FROM projects
       WHERE deposit_address IS NULL OR derivation_index IS NULL
       ORDER BY created_at ASC`
    );

    const projects = result.rows;

    if (projects.length === 0) {
      console.log('✓ No projects need backfilling. All projects have deposit addresses.');
      await closeDatabase();
      return;
    }

    console.log(`Found ${projects.length} project(s) without deposit addresses:\n`);

    // Get the current max derivation index
    const maxResult = await query<{ max_index: number }>(
      'SELECT COALESCE(MAX(derivation_index), -1) as max_index FROM projects WHERE derivation_index IS NOT NULL'
    );

    let nextIndex = (maxResult.rows[0]?.max_index ?? -1) + 1;

    // Backfill each project
    for (const project of projects) {
      console.log(`Project: ${project.name} (${project.id})`);

      // Generate deposit address
      const { address, index } = depositService.generateDepositAddress(nextIndex);

      console.log(`  Derivation Index: ${index}`);
      console.log(`  Deposit Address:  ${address}`);

      // Update project
      await query(
        `UPDATE projects
         SET deposit_address = $1, derivation_index = $2
         WHERE id = $3`,
        [address, index, project.id]
      );

      console.log(`  ✓ Updated\n`);

      nextIndex++;
    }

    console.log(`✅ Successfully backfilled ${projects.length} project(s)!`);

    // Verify
    console.log('\nVerifying all projects now have deposit addresses...');
    const verifyResult = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM projects WHERE deposit_address IS NULL'
    );

    const missingCount = verifyResult.rows[0]?.count ?? 0;

    if (missingCount === 0) {
      console.log('✓ All projects have deposit addresses!\n');
    } else {
      console.log(`⚠️  Warning: ${missingCount} project(s) still missing deposit addresses\n`);
    }

    await closeDatabase();
  } catch (error: any) {
    console.error('❌ Backfill failed:', error.message);
    await closeDatabase();
    process.exit(1);
  }
}

main();
