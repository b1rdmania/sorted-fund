/**
 * Privy Authentication Service
 * Verifies Privy access tokens and manages developer accounts
 */

import { PrivyClient } from '@privy-io/server-auth';
import { query } from '../db/database';
import { Developer } from './authService';

// Initialize Privy client
const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

/**
 * Verify Privy access token and return claims
 */
export async function verifyToken(accessToken: string) {
  try {
    const claims = await privy.verifyAuthToken(accessToken);
    return claims;
  } catch (error) {
    console.error('Privy token verification failed:', error);
    return null;
  }
}

/**
 * Get or create developer by Privy user ID
 */
export async function getOrCreateDeveloper(
  privyUserId: string,
  email?: string | null,
  name?: string | null
): Promise<Developer> {
  // Try to find existing developer
  const existing = await query<Developer>(
    'SELECT * FROM developers WHERE privy_user_id = $1',
    [privyUserId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Create new developer
  const result = await query<Developer>(
    `INSERT INTO developers (privy_user_id, email, name, credit_balance, status)
     VALUES ($1, $2, $3, '0', 'active')
     RETURNING *`,
    [privyUserId, email || null, name || null]
  );

  return result.rows[0];
}

/**
 * Get developer by Privy user ID
 */
export async function getDeveloperByPrivyId(
  privyUserId: string
): Promise<Developer | null> {
  const result = await query<Developer>(
    'SELECT * FROM developers WHERE privy_user_id = $1',
    [privyUserId]
  );

  return result.rows[0] || null;
}

/**
 * Update developer profile
 */
export async function updateDeveloper(
  privyUserId: string,
  updates: { email?: string; name?: string }
): Promise<Developer | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (setClauses.length === 0) {
    return getDeveloperByPrivyId(privyUserId);
  }

  values.push(privyUserId);

  const result = await query<Developer>(
    `UPDATE developers SET ${setClauses.join(', ')} WHERE privy_user_id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export default {
  verifyToken,
  getOrCreateDeveloper,
  getDeveloperByPrivyId,
  updateDeveloper,
};
