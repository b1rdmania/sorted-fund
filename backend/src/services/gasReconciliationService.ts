/**
 * Gas Reconciliation Service
 * Handles updating sponsorship events with actual gas usage after transactions complete
 */

import { getClient, query } from '../db/database';
import { ethers } from 'ethers';
import projectService from './projectService';

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
  /**
   * Update sponsorship event with actual gas used and refund unused credits
   */
  async reconcileGas(params: ReconcileGasParams): Promise<void> {
    const { projectId, userOpHash, actualGas, status, errorMessage } = params;

    const client = await getClient();
    let event: {
      id: number;
      project_id: string;
      estimated_gas: string;
      actual_gas: string | null;
      max_cost: string;
      completed_at: Date | null;
      settled_ledger_entry_id: number | null;
      released_ledger_entry_id: number | null;
    } | null = null;

    try {
      await client.query('BEGIN');

      const eventResult = await client.query<{
        id: number;
        project_id: string;
        estimated_gas: string;
        actual_gas: string | null;
        max_cost: string;
        completed_at: Date | null;
        settled_ledger_entry_id: number | null;
        released_ledger_entry_id: number | null;
      }>(
        `SELECT id, project_id, estimated_gas, actual_gas, max_cost, completed_at,
                settled_ledger_entry_id, released_ledger_entry_id
         FROM sponsorship_events
         WHERE project_id = $1
           AND user_op_hash = $2
         FOR UPDATE`,
        [projectId, userOpHash]
      );

      if (eventResult.rows.length === 0) {
        throw new Error(`Sponsorship event not found for userOpHash: ${userOpHash}`);
      }

      event = eventResult.rows[0];

      // Idempotency guard: if already completed, no-op.
      if (event.completed_at) {
        await client.query('COMMIT');
        return;
      }

      await client.query(
        `UPDATE sponsorship_events
         SET actual_gas = $1,
             status = $2,
             completed_at = NOW(),
             error_message = $3
         WHERE id = $4`,
        [actualGas, status, errorMessage || null, event.id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (!event) {
      throw new Error('Sponsorship event missing after reconciliation update');
    }

    const estimatedGas = BigInt(event.estimated_gas);
    const actualGasBigInt = BigInt(actualGas);
    const maxCost = BigInt(event.max_cost);

    // Calculate estimation accuracy
    const difference = actualGasBigInt - estimatedGas;
    const percentDifference = estimatedGas > 0n
      ? Number((difference * 100n) / estimatedGas)
      : 0;

    // Calculate actual cost (get gas price from chain)
    let actualCost = 0n;
    let refundAmount = 0n;

    try {
      // Get gas price at time of execution
      const provider = new ethers.JsonRpcProvider(process.env.SONIC_RPC_URL);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || BigInt(2000000000);

      // Calculate actual cost
      actualCost = actualGasBigInt * gasPrice;

      // Calculate refund (max cost reserved - actual cost)
      refundAmount = maxCost - actualCost;

      // Record final settled amount for auditability.
      const settle = await projectService.recordSettlement(projectId, actualCost.toString(), {
        idempotencyKey: `settlement:${projectId}:${userOpHash}`,
        referenceType: 'sponsorship_event',
        referenceId: event.id.toString(),
        metadata: {
          userOpHash,
          status,
          estimatedGas: estimatedGas.toString(),
          actualGas: actualGasBigInt.toString(),
        },
      });

      if (settle.ledgerEntryId) {
        await query(
          `UPDATE sponsorship_events
           SET settled_ledger_entry_id = COALESCE(settled_ledger_entry_id, $1)
           WHERE id = $2`,
          [settle.ledgerEntryId, event.id]
        );
      }

      // Refund unused gas to project if refund > 0
      if (refundAmount > 0n) {
        const release = await projectService.releaseFunds(event.project_id, refundAmount.toString(), {
          idempotencyKey: `release:${projectId}:${userOpHash}`,
          referenceType: 'sponsorship_event',
          referenceId: event.id.toString(),
          metadata: {
            reason: 'gas_reconciliation_refund',
            userOpHash,
            maxCost: maxCost.toString(),
            actualCost: actualCost.toString(),
          },
        });

        if (release.ledgerEntryId) {
          await query(
            `UPDATE sponsorship_events
             SET released_ledger_entry_id = COALESCE(released_ledger_entry_id, $1)
             WHERE id = $2`,
            [release.ledgerEntryId, event.id]
          );
        }

        console.log('Gas refunded to project:', {
          userOpHash,
          projectId: event.project_id,
          maxCost: maxCost.toString(),
          actualCost: actualCost.toString(),
          refunded: refundAmount.toString(),
        });
      }
    } catch (error: any) {
      console.error('Failed to refund credits:', error);
      // Don't throw - reconciliation should still complete even if refund fails
    }

    // Log significant discrepancies (>20% off)
    if (Math.abs(percentDifference) > 20) {
      console.warn('Gas estimation discrepancy detected:', {
        userOpHash,
        projectId: event.project_id,
        estimated: estimatedGas.toString(),
        actual: actualGasBigInt.toString(),
        difference: difference.toString(),
        percentDifference: `${percentDifference.toFixed(2)}%`,
        maxCost: maxCost.toString(),
        actualCost: actualCost.toString(),
        refunded: refundAmount.toString(),
      });
    } else {
      console.log('Gas reconciled:', {
        userOpHash,
        estimated: estimatedGas.toString(),
        actual: actualGasBigInt.toString(),
        accuracy: `${(100 - Math.abs(percentDifference)).toFixed(2)}%`,
        maxCost: maxCost.toString(),
        actualCost: actualCost.toString(),
        refunded: refundAmount.toString(),
      });
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
