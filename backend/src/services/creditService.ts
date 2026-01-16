/**
 * Credit Service
 * Handles credit balance management and transaction audit trail
 * All operations are atomic using database transactions
 */

import { getClient } from '../db/database';
import type { PoolClient } from 'pg';

export interface CreditTransaction {
  id: number;
  developer_id: number;
  amount: string; // BigInt as string
  type: 'deposit' | 'deduction' | 'refund' | 'adjustment';
  reference_type?: string;
  reference_id?: number;
  balance_after: string;
  description?: string;
  created_at: Date;
}

/**
 * Get current credit balance for a developer
 */
export async function getBalance(developerId: number): Promise<bigint> {
  const client = await getClient();

  try {
    const result = await client.query(
      'SELECT credit_balance FROM developers WHERE id = $1',
      [developerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Developer not found');
    }

    return BigInt(result.rows[0].credit_balance);
  } finally {
    client.release();
  }
}

/**
 * Deduct credits from developer balance
 * Throws error if insufficient balance
 */
export async function deduct(
  developerId: number,
  amount: bigint,
  referenceType?: string,
  referenceId?: number,
  description?: string
): Promise<{ newBalance: bigint; transaction: CreditTransaction }> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Lock the developer row for update
    const balanceResult = await client.query(
      'SELECT credit_balance FROM developers WHERE id = $1 FOR UPDATE',
      [developerId]
    );

    if (balanceResult.rows.length === 0) {
      throw new Error('Developer not found');
    }

    const currentBalance = BigInt(balanceResult.rows[0].credit_balance);
    const newBalance = currentBalance - amount;

    if (newBalance < 0n) {
      throw new Error(
        `Insufficient credits. Required: ${amount}, Available: ${currentBalance}`
      );
    }

    // Update balance
    await client.query('UPDATE developers SET credit_balance = $1 WHERE id = $2', [
      newBalance.toString(),
      developerId,
    ]);

    // Record transaction (negative amount for deduction)
    const txResult = await client.query<CreditTransaction>(
      `INSERT INTO credit_transactions
       (developer_id, amount, type, reference_type, reference_id, balance_after, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        developerId,
        (-amount).toString(), // Negative for deduction
        'deduction',
        referenceType || null,
        referenceId || null,
        newBalance.toString(),
        description || null,
      ]
    );

    await client.query('COMMIT');

    return {
      newBalance,
      transaction: txResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Refund credits to developer balance
 */
export async function refund(
  developerId: number,
  amount: bigint,
  referenceType?: string,
  referenceId?: number,
  description?: string
): Promise<{ newBalance: bigint; transaction: CreditTransaction }> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Lock the developer row for update
    const balanceResult = await client.query(
      'SELECT credit_balance FROM developers WHERE id = $1 FOR UPDATE',
      [developerId]
    );

    if (balanceResult.rows.length === 0) {
      throw new Error('Developer not found');
    }

    const currentBalance = BigInt(balanceResult.rows[0].credit_balance);
    const newBalance = currentBalance + amount;

    // Update balance
    await client.query('UPDATE developers SET credit_balance = $1 WHERE id = $2', [
      newBalance.toString(),
      developerId,
    ]);

    // Record transaction (positive amount for refund)
    const txResult = await client.query<CreditTransaction>(
      `INSERT INTO credit_transactions
       (developer_id, amount, type, reference_type, reference_id, balance_after, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        developerId,
        amount.toString(), // Positive for refund
        'refund',
        referenceType || null,
        referenceId || null,
        newBalance.toString(),
        description || null,
      ]
    );

    await client.query('COMMIT');

    return {
      newBalance,
      transaction: txResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deposit credits to developer balance
 */
export async function deposit(
  developerId: number,
  amount: bigint,
  referenceType?: string,
  referenceId?: number,
  description?: string
): Promise<{ newBalance: bigint; transaction: CreditTransaction }> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Lock the developer row for update
    const balanceResult = await client.query(
      'SELECT credit_balance FROM developers WHERE id = $1 FOR UPDATE',
      [developerId]
    );

    if (balanceResult.rows.length === 0) {
      throw new Error('Developer not found');
    }

    const currentBalance = BigInt(balanceResult.rows[0].credit_balance);
    const newBalance = currentBalance + amount;

    // Update balance
    await client.query('UPDATE developers SET credit_balance = $1 WHERE id = $2', [
      newBalance.toString(),
      developerId,
    ]);

    // Record transaction (positive amount for deposit)
    const txResult = await client.query<CreditTransaction>(
      `INSERT INTO credit_transactions
       (developer_id, amount, type, reference_type, reference_id, balance_after, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        developerId,
        amount.toString(), // Positive for deposit
        'deposit',
        referenceType || null,
        referenceId || null,
        newBalance.toString(),
        description || null,
      ]
    );

    await client.query('COMMIT');

    return {
      newBalance,
      transaction: txResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get credit transaction history for a developer
 */
export async function getTransactions(
  developerId: number,
  limit: number = 100,
  offset: number = 0
): Promise<CreditTransaction[]> {
  const client = await getClient();

  try {
    const result = await client.query<CreditTransaction>(
      `SELECT * FROM credit_transactions
       WHERE developer_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [developerId, limit, offset]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get total credit usage statistics for a developer
 */
export async function getStats(
  developerId: number
): Promise<{
  total_deposited: bigint;
  total_spent: bigint;
  total_refunded: bigint;
  current_balance: bigint;
}> {
  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount::BIGINT ELSE 0 END), 0) as total_deposited,
         COALESCE(SUM(CASE WHEN type = 'deduction' THEN ABS(amount::BIGINT) ELSE 0 END), 0) as total_spent,
         COALESCE(SUM(CASE WHEN type = 'refund' THEN amount::BIGINT ELSE 0 END), 0) as total_refunded,
         (SELECT credit_balance FROM developers WHERE id = $1) as current_balance
       FROM credit_transactions
       WHERE developer_id = $1`,
      [developerId]
    );

    const row = result.rows[0];

    return {
      total_deposited: BigInt(row.total_deposited || '0'),
      total_spent: BigInt(row.total_spent || '0'),
      total_refunded: BigInt(row.total_refunded || '0'),
      current_balance: BigInt(row.current_balance || '0'),
    };
  } finally {
    client.release();
  }
}

export default {
  getBalance,
  deduct,
  refund,
  deposit,
  getTransactions,
  getStats,
};
