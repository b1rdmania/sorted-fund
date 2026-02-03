/**
 * Database connection and query utilities
 * Using PostgreSQL with pg library
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
  port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'sorted_fund'),
  user: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
  password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || ''),
  ssl: process.env.NODE_ENV === 'production' && process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('📊 Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Execute a query
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.LOG_LEVEL === 'debug') {
      console.log('📝 Query executed:', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('❌ Database query error:', { text, params, error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
  return await pool.connect();
}

/**
 * Initialize database schema
 */
export async function initializeDatabase(): Promise<void> {
  const fs = require('fs');
  const path = require('path');

  try {
    console.log('🔧 Initializing database schema...');

    // dist builds don't currently copy schema.sql, so fall back to src path.
    const schemaCandidates = [
      path.join(__dirname, 'schema.sql'),
      path.join(process.cwd(), 'src', 'db', 'schema.sql'),
    ];

    const schemaPath = schemaCandidates.find((candidate: string) => fs.existsSync(candidate));
    if (!schemaPath) {
      throw new Error(
        `schema.sql not found. Checked: ${schemaCandidates.join(', ')}`
      );
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    await query(schema);

    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Close database connections
 */
export async function closeDatabase(): Promise<void> {
  await pool.end();
  console.log('📊 Database connections closed');
}

export default {
  query,
  getClient,
  initializeDatabase,
  closeDatabase,
};
