/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

import * as fs from 'fs';
import * as path from 'path';
import { query, closeDatabase } from '../db/database';

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');

    const migrationsDir = path.join(__dirname, '../db/migrations');

    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  No migrations directory found');
      return;
    }

    // Get all .sql files in migrations directory
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Execute in alphabetical order

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`Found ${files.length} migration file(s):\n`);

    // Execute each migration
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`📝 Running: ${file}`);

      try {
        await query(sql);
        console.log(`✅ Completed: ${file}\n`);
      } catch (error: any) {
        console.error(`❌ Failed: ${file}`);
        console.error(`Error: ${error.message}\n`);
        throw error;
      }
    }

    console.log('✨ All migrations completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run migrations
runMigrations();
