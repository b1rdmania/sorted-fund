/**
 * Authentication Service
 * Handles developer registration, login, logout, and session management
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query, getClient } from '../db/database';

const SALT_ROUNDS = 10;
const SESSION_DURATION_DAYS = 7;

export interface Developer {
  id: number;
  privy_user_id?: string | null;
  email: string | null;
  name: string | null;
  credit_balance: string; // BigInt as string
  status: string;
  created_at: Date;
}

export interface Session {
  id: number;
  developer_id: number;
  session_token: string;
  expires_at: Date;
  created_at: Date;
}

/**
 * Register a new developer account
 */
export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ developer: Developer; sessionToken: string }> {
  // Validate inputs
  if (!email || !password || !name) {
    throw new Error('Email, password, and name are required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Check if email already exists
  const existingResult = await query(
    'SELECT id FROM developers WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingResult.rows.length > 0) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create developer account
  const result = await query<Developer>(
    `INSERT INTO developers (email, password_hash, name, credit_balance, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, credit_balance, status, created_at`,
    [email.toLowerCase(), passwordHash, name, '0', 'active']
  );

  const developer = result.rows[0];

  // Create session
  const sessionToken = await createSession(developer.id);

  return {
    developer,
    sessionToken,
  };
}

/**
 * Login with email and password
 */
export async function login(
  email: string,
  password: string
): Promise<{ developer: Developer; sessionToken: string }> {
  // Validate inputs
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Get developer by email
  const result = await query<Developer & { password_hash: string }>(
    `SELECT id, email, password_hash, name, credit_balance, status, created_at
     FROM developers
     WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const developer = result.rows[0];

  // Check if account is active
  if (developer.status !== 'active') {
    throw new Error('Account is suspended or banned');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, developer.password_hash);

  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Create session
  const sessionToken = await createSession(developer.id);

  // Remove password_hash from response
  const { password_hash, ...developerData } = developer;

  return {
    developer: developerData,
    sessionToken,
  };
}

/**
 * Logout (invalidate session)
 */
export async function logout(sessionToken: string): Promise<void> {
  await query('DELETE FROM developer_sessions WHERE session_token = $1', [
    sessionToken,
  ]);
}

/**
 * Validate session and return developer
 */
export async function validateSession(
  sessionToken: string
): Promise<Developer | null> {
  // Clean up expired sessions first
  await query('DELETE FROM developer_sessions WHERE expires_at < NOW()');

  // Get session and developer
  const result = await query<Developer & Session>(
    `SELECT d.id, d.email, d.name, d.credit_balance, d.status, d.created_at,
            s.expires_at
     FROM developers d
     INNER JOIN developer_sessions s ON d.id = s.developer_id
     WHERE s.session_token = $1 AND s.expires_at > NOW()`,
    [sessionToken]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const developer = result.rows[0];

  // Check if account is active
  if (developer.status !== 'active') {
    return null;
  }

  // Update last_used_at
  await query(
    'UPDATE developer_sessions SET last_used_at = NOW() WHERE session_token = $1',
    [sessionToken]
  );

  return {
    id: developer.id,
    email: developer.email,
    name: developer.name,
    credit_balance: developer.credit_balance,
    status: developer.status,
    created_at: developer.created_at,
  };
}

/**
 * Create a new session for a developer
 */
async function createSession(developerId: number): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await query(
    `INSERT INTO developer_sessions (developer_id, session_token, expires_at)
     VALUES ($1, $2, $3)`,
    [developerId, sessionToken, expiresAt]
  );

  return sessionToken;
}

/**
 * Get developer by ID
 */
export async function getDeveloperById(
  developerId: number
): Promise<Developer | null> {
  const result = await query<Developer>(
    `SELECT id, email, name, credit_balance, status, created_at
     FROM developers
     WHERE id = $1`,
    [developerId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Update developer credit balance
 */
export async function updateCreditBalance(
  developerId: number,
  newBalance: bigint
): Promise<void> {
  await query('UPDATE developers SET credit_balance = $1 WHERE id = $2', [
    newBalance.toString(),
    developerId,
  ]);
}

export default {
  register,
  login,
  logout,
  validateSession,
  getDeveloperById,
  updateCreditBalance,
};
