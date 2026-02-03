/**
 * Project Service
 * Handles project CRUD operations and gas tank management
 */

import { getClient, query } from '../db/database';
import { Project, CreateProjectRequest, RefuelRequest, GasTankRefuel } from '../types';
import { ethers } from 'ethers';
import * as depositService from './depositService';
import organizationService from './organizationService';

export class ProjectService {
  private createLedgerIdempotencyKey(prefix: string, projectId: string): string {
    return `${prefix}:${projectId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Get next available derivation index
   */
  private async getNextDerivationIndex(): Promise<number> {
    const result = await query<{ max_index: number }>(
      'SELECT COALESCE(MAX(derivation_index), -1) as max_index FROM projects'
    );

    return (result.rows[0]?.max_index ?? -1) + 1;
  }

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectRequest, developerId: number): Promise<Project> {
    const dailyCap = data.dailyCap || ethers.parseEther('1').toString();
    const defaultOrg = await organizationService.ensureDefaultOrganization(
      developerId,
      data.name
    );

    // Get next derivation index
    const derivationIndex = await this.getNextDerivationIndex();

    // Generate deposit address
    const { address: depositAddress } = depositService.generateDepositAddress(derivationIndex);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query<Project>(
        `INSERT INTO projects (id, name, owner, daily_cap, daily_reset_at, deposit_address, derivation_index, developer_id, organization_id)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8)
         RETURNING *`,
        [
          data.id,
          data.name,
          data.owner,
          dailyCap,
          depositAddress,
          derivationIndex,
          developerId,
          defaultOrg.id,
        ]
      );

      await client.query(
        `INSERT INTO developer_projects (developer_id, project_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (developer_id, project_id) DO NOTHING`,
        [developerId, data.id]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<Project | null> {
    const result = await query<Project>(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get project by ID only if developer owns it
   */
  async getProjectForDeveloper(projectId: string, developerId: number): Promise<Project | null> {
    const result = await query<Project>(
      `SELECT p.*
       FROM projects p
       INNER JOIN organization_members om ON om.organization_id = p.organization_id
       WHERE p.id = $1 AND om.developer_id = $2`,
      [projectId, developerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all projects
   */
  async getAllProjectsForDeveloper(developerId: number): Promise<Project[]> {
    const result = await query<Project>(
      `SELECT p.*
       FROM projects p
       INNER JOIN organization_members om ON om.organization_id = p.organization_id
       WHERE om.developer_id = $1
       ORDER BY p.created_at DESC`,
      [developerId]
    );

    return result.rows;
  }

  /**
   * Update project status
   */
  async updateProjectStatus(
    projectId: string,
    status: 'active' | 'suspended' | 'killed'
  ): Promise<Project> {
    const result = await query<Project>(
      'UPDATE projects SET status = $1 WHERE id = $2 RETURNING *',
      [status, projectId]
    );

    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    return result.rows[0];
  }

  /**
   * Refuel gas tank
   */
  async refuelGasTank(
    projectId: string,
    refuel: RefuelRequest
  ): Promise<GasTankRefuel> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Add refuel record
      const refuelResult = await client.query<GasTankRefuel>(
        `INSERT INTO gas_tank_refuels (project_id, amount, note, tx_hash, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          projectId,
          refuel.amount,
          refuel.note || null,
          refuel.txHash || null,
          'confirmed'
        ]
      );

      // Update project balance
      await client.query(
        `UPDATE projects
         SET gas_tank_balance = gas_tank_balance + $1
         WHERE id = $2`,
        [refuel.amount, projectId]
      );

      const projectResult = await client.query<{ organization_id: number }>(
        `SELECT organization_id FROM projects WHERE id = $1`,
        [projectId]
      );

      if (projectResult.rows.length > 0) {
        await client.query(
          `INSERT INTO fund_ledger_entries (
             organization_id,
             project_id,
             entry_type,
             amount,
             asset,
             reference_type,
             reference_id,
             idempotency_key,
             metadata_json
           )
           VALUES ($1, $2, 'credit', $3, 'S', 'refuel', $4, $5, $6)`,
          [
            projectResult.rows[0].organization_id,
            projectId,
            refuel.amount,
            refuelResult.rows[0].id?.toString() || null,
            `refuel:${projectId}:${refuelResult.rows[0].id}`,
            JSON.stringify({
              note: refuel.note || null,
              txHash: refuel.txHash || null,
            }),
          ]
        );
      }

      await client.query('COMMIT');

      return refuelResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get gas tank balance
   */
  async getGasTankBalance(projectId: string): Promise<string> {
    const result = await query<{ gas_tank_balance: string }>(
      'SELECT gas_tank_balance FROM projects WHERE id = $1',
      [projectId]
    );

    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    return result.rows[0].gas_tank_balance;
  }

  /**
   * Reserve funds from gas tank for pending sponsorship
   */
  async reserveFunds(
    projectId: string,
    amount: string,
    options?: {
      idempotencyKey?: string;
      referenceType?: string;
      referenceId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ reserved: boolean; ledgerEntryId?: number }> {
    const client = await getClient();
    const idempotencyKey =
      options?.idempotencyKey ||
      this.createLedgerIdempotencyKey('reserve', projectId);

    try {
      await client.query('BEGIN');

      const existingLedger = await client.query<{ id: number }>(
        `SELECT id FROM fund_ledger_entries
         WHERE project_id = $1 AND idempotency_key = $2`,
        [projectId, idempotencyKey]
      );

      if (existingLedger.rows.length > 0) {
        await client.query('COMMIT');
        return { reserved: true, ledgerEntryId: existingLedger.rows[0].id };
      }

      const projectResult = await client.query<{
        organization_id: number;
        gas_tank_balance: string;
      }>(
        `SELECT organization_id, gas_tank_balance
         FROM projects
         WHERE id = $1
         FOR UPDATE`,
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { reserved: false };
      }

      const project = projectResult.rows[0];
      if (BigInt(project.gas_tank_balance) < BigInt(amount)) {
        await client.query('ROLLBACK');
        return { reserved: false };
      }

      await client.query(
        `UPDATE projects
         SET gas_tank_balance = gas_tank_balance - $1
         WHERE id = $2`,
        [amount, projectId]
      );

      const ledgerInsert = await client.query<{ id: number }>(
        `INSERT INTO fund_ledger_entries (
           organization_id,
           project_id,
           entry_type,
           amount,
           asset,
           reference_type,
           reference_id,
           idempotency_key,
           metadata_json
         )
         VALUES ($1, $2, 'reserve', $3, 'S', $4, $5, $6, $7)
         RETURNING id`,
        [
          project.organization_id,
          projectId,
          amount,
          options?.referenceType || null,
          options?.referenceId || null,
          idempotencyKey,
          JSON.stringify(options?.metadata || {}),
        ]
      );

      await client.query('COMMIT');

      return { reserved: true, ledgerEntryId: ledgerInsert.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Release reserved funds (if transaction fails)
   */
  async releaseFunds(
    projectId: string,
    amount: string,
    options?: {
      idempotencyKey?: string;
      referenceType?: string;
      referenceId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ ledgerEntryId?: number }> {
    const client = await getClient();
    const idempotencyKey =
      options?.idempotencyKey ||
      this.createLedgerIdempotencyKey('release', projectId);

    try {
      await client.query('BEGIN');

      const existingLedger = await client.query<{ id: number }>(
        `SELECT id FROM fund_ledger_entries
         WHERE project_id = $1 AND idempotency_key = $2`,
        [projectId, idempotencyKey]
      );

      if (existingLedger.rows.length > 0) {
        await client.query('COMMIT');
        return { ledgerEntryId: existingLedger.rows[0].id };
      }

      const projectResult = await client.query<{ organization_id: number }>(
        `SELECT organization_id
         FROM projects
         WHERE id = $1
         FOR UPDATE`,
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        throw new Error('Project not found');
      }

      await client.query(
        `UPDATE projects
         SET gas_tank_balance = gas_tank_balance + $1
         WHERE id = $2`,
        [amount, projectId]
      );

      const ledgerInsert = await client.query<{ id: number }>(
        `INSERT INTO fund_ledger_entries (
           organization_id,
           project_id,
           entry_type,
           amount,
           asset,
           reference_type,
           reference_id,
           idempotency_key,
           metadata_json
         )
         VALUES ($1, $2, 'release', $3, 'S', $4, $5, $6, $7)
         RETURNING id`,
        [
          projectResult.rows[0].organization_id,
          projectId,
          amount,
          options?.referenceType || null,
          options?.referenceId || null,
          idempotencyKey,
          JSON.stringify(options?.metadata || {}),
        ]
      );

      await client.query('COMMIT');
      return { ledgerEntryId: ledgerInsert.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async recordSettlement(
    projectId: string,
    amount: string,
    options?: {
      idempotencyKey?: string;
      referenceType?: string;
      referenceId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ ledgerEntryId?: number }> {
    const idempotencyKey =
      options?.idempotencyKey ||
      this.createLedgerIdempotencyKey('settlement', projectId);

    const result = await query<{ id: number }>(
      `INSERT INTO fund_ledger_entries (
         organization_id,
         project_id,
         entry_type,
         amount,
         asset,
         reference_type,
         reference_id,
         idempotency_key,
         metadata_json
       )
       SELECT
         p.organization_id,
         p.id,
         'settlement',
         $2,
         'S',
         $3,
         $4,
         $5,
         $6
       FROM projects p
       WHERE p.id = $1
       ON CONFLICT (project_id, idempotency_key) DO NOTHING
       RETURNING id`,
      [
        projectId,
        amount,
        options?.referenceType || null,
        options?.referenceId || null,
        idempotencyKey,
        JSON.stringify(options?.metadata || {}),
      ]
    );

    if (result.rows.length > 0) {
      return { ledgerEntryId: result.rows[0].id };
    }

    const existing = await query<{ id: number }>(
      `SELECT id FROM fund_ledger_entries
       WHERE project_id = $1 AND idempotency_key = $2`,
      [projectId, idempotencyKey]
    );

    return { ledgerEntryId: existing.rows[0]?.id };
  }

  /**
   * Check and reset daily spending if needed
   */
  async checkAndResetDailySpending(projectId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const now = new Date();
    const resetTime = new Date(project.daily_reset_at);

    // If 24 hours have passed, reset
    if (now.getTime() - resetTime.getTime() >= 24 * 60 * 60 * 1000) {
      await query(
        `UPDATE projects
         SET daily_spent = 0, daily_reset_at = NOW()
         WHERE id = $1`,
        [projectId]
      );
    }
  }

  /**
   * Check if daily cap is exceeded
   */
  async checkDailyCap(projectId: string, additionalCost: string): Promise<boolean> {
    await this.checkAndResetDailySpending(projectId);

    const result = await query<{ daily_spent: string; daily_cap: string }>(
      'SELECT daily_spent, daily_cap FROM projects WHERE id = $1',
      [projectId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const { daily_spent, daily_cap } = result.rows[0];
    const newTotal = BigInt(daily_spent) + BigInt(additionalCost);

    return newTotal <= BigInt(daily_cap);
  }

  /**
   * Record daily spending
   */
  async recordDailySpending(projectId: string, amount: string): Promise<void> {
    await query(
      `UPDATE projects
       SET daily_spent = daily_spent + $1
       WHERE id = $2`,
      [amount, projectId]
    );
  }

  /**
   * Get refuel history
   */
  async getRefuelHistory(projectId: string): Promise<GasTankRefuel[]> {
    const result = await query<GasTankRefuel>(
      `SELECT * FROM gas_tank_refuels
       WHERE project_id = $1
       ORDER BY timestamp DESC`,
      [projectId]
    );

    return result.rows;
  }

  /**
   * Get ledger-derived balance (source of truth for auditability)
   */
  async getLedgerBalance(projectId: string): Promise<string> {
    const result = await query<{ balance: string }>(
      `SELECT COALESCE(SUM(
          CASE
            WHEN entry_type IN ('credit', 'release') THEN amount
            WHEN entry_type IN ('reserve', 'debit') THEN -amount
            ELSE 0
          END
        ), 0)::text as balance
       FROM fund_ledger_entries
       WHERE project_id = $1`,
      [projectId]
    );

    return result.rows[0]?.balance || '0';
  }

  /**
   * Get recent ledger entries
   */
  async getLedgerEntries(projectId: string, limit: number = 50, offset: number = 0) {
    const result = await query(
      `SELECT
         id,
         entry_type,
         amount,
         asset,
         reference_type,
         reference_id,
         idempotency_key,
         metadata_json,
         created_at
       FROM fund_ledger_entries
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [projectId, limit, offset]
    );

    return result.rows;
  }
}

export default new ProjectService();
