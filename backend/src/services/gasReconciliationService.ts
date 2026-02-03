/**
 * Gas Reconciliation Service
 * Handles updating sponsorship events with actual gas usage after transactions complete
 */

import { getClient, query } from '../db/database';
import { ethers } from 'ethers';
import type { PoolClient } from 'pg';

export interface ReconcileGasParams {
  projectId: string;
  userOpHash: string;
  actualGas: string; // bigint as string
  status: 'success' | 'failed' | 'reverted';
  errorMessage?: string;
}

export interface GasEstimationStats {
  averageEstimated: string;
  averageActual: string;
  averageAccuracy: number; // percentage
  totalEvents: number;
  overestimatedCount: number;
  underestimatedCount: number;
}

export class GasReconciliationService {
  private async upsertLedgerEntry(
    client: PoolClient,
    params: {
      organizationId: number;
      projectId: string;
      chainId: number;
      entryType: 'settlement' | 'release';
      amount: string;
      idempotencyKey: string;
      referenceId: string;
      metadata: Record<string, any>;
    }
  ): Promise<number> {
    const insertResult = await client.query<{ id: number }>(
      `INSERT INTO fund_ledger_entries (
         organization_id,
         project_id,
         chain_id,
         entry_type,
         amount,
         asset,
         reference_type,
         reference_id,
         idempotency_key,
         metadata_json
       )
       VALUES ($1, $2, $3, $4, $5, 'S', 'sponsorship_event', $6, $7, $8)
       ON CONFLICT (project_id, idempotency_key) DO NOTHING
       RETURNING id`,
      [
        params.organizationId,
        params.projectId,
        params.chainId,
        params.entryType,
        params.amount,
        params.referenceId,
        params.idempotencyKey,
        JSON.stringify(params.metadata),
      ]
    );

    if (insertResult.rows.length > 0) {
      return insertResult.rows[0].id;
    }

    const existing = await client.query<{ id: number }>(
      `SELECT id
       FROM fund_ledger_entries
       WHERE project_id = $1 AND idempotency_key = $2`,
      [params.projectId, params.idempotencyKey]
    );

    if (existing.rows.length === 0) {
      throw new Error('Failed to resolve ledger entry id after upsert');
    }

    return existing.rows[0].id;
  }

  /**
   * Update sponsorship event with actual gas used and refund unused credits
   */
  async reconcileGas(params: ReconcileGasParams): Promise<void> {
    const { projectId, userOpHash, actualGas, status, errorMessage } = params;

    const chainLookup = await query<{ chain_id: number; rpc_url: string | null }>(
      `SELECT se.chain_id, c.rpc_url
       FROM sponsorship_events se
       LEFT JOIN chains c ON c.chain_id = se.chain_id
       WHERE se.project_id = $1 AND se.user_op_hash = $2
       LIMIT 1`,
      [projectId, userOpHash]
    );

    if (chainLookup.rows.length === 0) {
      throw new Error(`Sponsorship event not found for userOpHash: ${userOpHash}`);
    }

    const lookupRow = chainLookup.rows[0];
    const rpcUrl = lookupRow.rpc_url || process.env.SONIC_RPC_URL;

    // Fetch chain fee data first; fallback keeps reconciliation functional during RPC hiccups.
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feeData = await provider.getFeeData().catch(() => null);
    const gasPrice = feeData?.maxFeePerGas || feeData?.gasPrice || BigInt(2000000000);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const eventResult = await client.query<{
        id: number;
        project_id: string;
        chain_id: number;
        organization_id: number;
        estimated_gas: string;
        max_cost: string;
        completed_at: Date | null;
      }>(
        `SELECT se.id, se.project_id, se.chain_id, p.organization_id, se.estimated_gas, se.max_cost, se.completed_at
         FROM sponsorship_events se
         INNER JOIN projects p ON p.id = se.project_id
         WHERE se.project_id = $1
           AND se.user_op_hash = $2 
         FOR UPDATE`,
        [projectId, userOpHash]
      );

      if (eventResult.rows.length === 0) {
        throw new Error(`Sponsorship event not found for userOpHash: ${userOpHash}`);
      }

      const event = eventResult.rows[0];
      const estimatedGas = BigInt(event.estimated_gas);
      const actualGasBigInt = BigInt(actualGas);
      const maxCost = BigInt(event.max_cost);

      // Idempotency guard: if already completed, no-op.
      if (event.completed_at) {
        await client.query('COMMIT');
        return;
      }

      // Cost cannot exceed reserved maxCost. If chain price spikes, we cap settlement.
      const uncappedActualCost = actualGasBigInt * gasPrice;
      const settledCost = uncappedActualCost > maxCost ? maxCost : uncappedActualCost;
      const refundAmount = maxCost - settledCost;

      const settledLedgerId = await this.upsertLedgerEntry(client, {
        organizationId: event.organization_id,
        projectId: event.project_id,
        chainId: event.chain_id,
        entryType: 'settlement',
        amount: settledCost.toString(),
        idempotencyKey: `settlement:${projectId}:${userOpHash}`,
        referenceId: event.id.toString(),
        metadata: {
          userOpHash,
          status,
          estimatedGas: estimatedGas.toString(),
          actualGas: actualGasBigInt.toString(),
          gasPrice: gasPrice.toString(),
          capped: uncappedActualCost > maxCost,
          chainId: event.chain_id,
        },
      });

      let releasedLedgerId: number | null = null;
      if (refundAmount > 0n) {
        releasedLedgerId = await this.upsertLedgerEntry(client, {
          organizationId: event.organization_id,
          projectId: event.project_id,
          chainId: event.chain_id,
          entryType: 'release',
          amount: refundAmount.toString(),
          idempotencyKey: `release:${projectId}:${userOpHash}`,
          referenceId: event.id.toString(),
          metadata: {
            reason: 'gas_reconciliation_refund',
            userOpHash,
            maxCost: maxCost.toString(),
            settledCost: settledCost.toString(),
            chainId: event.chain_id,
          },
        });

        // Credit the cached project balance once, linked to this unique release key.
        await client.query(
          `UPDATE projects
           SET gas_tank_balance = gas_tank_balance + $1
           WHERE id = $2`,
          [refundAmount.toString(), event.project_id]
        );
      }

      await client.query(
        `UPDATE sponsorship_events se
         SET actual_gas = $1,
             status = $2,
             completed_at = NOW(),
             error_message = $3,
             settled_ledger_entry_id = COALESCE(se.settled_ledger_entry_id, $5),
             released_ledger_entry_id = COALESCE(se.released_ledger_entry_id, $6)
         WHERE id = $4`,
        [actualGas, status, errorMessage || null, event.id, settledLedgerId, releasedLedgerId]
      );

      await client.query('COMMIT');
      const difference = actualGasBigInt - estimatedGas;
      const percentDifference = estimatedGas > 0n
        ? Number((difference * 100n) / estimatedGas)
        : 0;
      if (Math.abs(percentDifference) > 20) {
        console.warn('Gas estimation discrepancy detected:', {
          userOpHash,
          projectId: event.project_id,
          estimated: estimatedGas.toString(),
          actual: actualGasBigInt.toString(),
          percentDifference: `${percentDifference.toFixed(2)}%`,
        });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get gas estimation statistics for a project
   */
  async getEstimationStats(projectId: string): Promise<GasEstimationStats> {
    const result = await query<{
      avg_estimated: string;
      avg_actual: string;
      total_events: string;
      overestimated_count: string;
      underestimated_count: string;
    }>(
      `SELECT
         AVG(estimated_gas)::BIGINT as avg_estimated,
         AVG(actual_gas)::BIGINT as avg_actual,
         COUNT(*) as total_events,
         SUM(CASE WHEN estimated_gas > actual_gas THEN 1 ELSE 0 END) as overestimated_count,
         SUM(CASE WHEN estimated_gas < actual_gas THEN 1 ELSE 0 END) as underestimated_count
       FROM sponsorship_events
       WHERE project_id = $1 AND actual_gas IS NOT NULL`,
      [projectId]
    );

    if (result.rows.length === 0 || !result.rows[0].avg_estimated) {
      return {
        averageEstimated: '0',
        averageActual: '0',
        averageAccuracy: 0,
        totalEvents: 0,
        overestimatedCount: 0,
        underestimatedCount: 0,
      };
    }

    const stats = result.rows[0];
    const avgEstimated = BigInt(stats.avg_estimated);
    const avgActual = BigInt(stats.avg_actual);

    // Calculate average accuracy percentage
    const averageAccuracy = avgEstimated > 0n
      ? Number((avgActual * 10000n) / avgEstimated) / 100
      : 0;

    return {
      averageEstimated: avgEstimated.toString(),
      averageActual: avgActual.toString(),
      averageAccuracy,
      totalEvents: Number(stats.total_events),
      overestimatedCount: Number(stats.overestimated_count),
      underestimatedCount: Number(stats.underestimated_count),
    };
  }

  /**
   * Get recent events with estimation accuracy
   */
  async getRecentEventsWithAccuracy(projectId: string, limit: number = 10) {
    const result = await query(
      `SELECT
         id,
         user_op_hash,
         sender,
         target,
         selector,
         estimated_gas,
         actual_gas,
         status,
         created_at,
         completed_at,
         CASE
           WHEN actual_gas IS NOT NULL AND estimated_gas > 0
           THEN ROUND((actual_gas::numeric / estimated_gas::numeric) * 100, 2)
           ELSE NULL
         END as accuracy_percent
       FROM sponsorship_events
       WHERE project_id = $1 AND actual_gas IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows;
  }
}

export default new GasReconciliationService();
