/**
 * Project Service
 * Handles project CRUD operations and gas tank management
 */

import { query } from '../db/database';
import { Project, CreateProjectRequest, RefuelRequest, GasTankRefuel } from '../types';
import { ethers } from 'ethers';

export class ProjectService {
  /**
   * Create a new project
   */
  async createProject(data: CreateProjectRequest): Promise<Project> {
    const dailyCap = data.dailyCap || ethers.parseEther('1').toString();

    const result = await query<Project>(
      `INSERT INTO projects (id, name, owner, daily_cap, daily_reset_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [data.id, data.name, data.owner, dailyCap]
    );

    return result.rows[0];
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
   * Get all projects
   */
  async getAllProjects(): Promise<Project[]> {
    const result = await query<Project>(
      'SELECT * FROM projects ORDER BY created_at DESC'
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
    const client = await query('BEGIN');

    try {
      // Add refuel record
      const refuelResult = await query<GasTankRefuel>(
        `INSERT INTO gas_tank_refuels (project_id, amount, note)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [projectId, refuel.amount, refuel.note || null]
      );

      // Update project balance
      await query(
        `UPDATE projects
         SET gas_tank_balance = gas_tank_balance + $1
         WHERE id = $2`,
        [refuel.amount, projectId]
      );

      await query('COMMIT');

      return refuelResult.rows[0];
    } catch (error) {
      await query('ROLLBACK');
      throw error;
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
  async reserveFunds(projectId: string, amount: string): Promise<boolean> {
    const result = await query<{ gas_tank_balance: string }>(
      `UPDATE projects
       SET gas_tank_balance = gas_tank_balance - $1
       WHERE id = $2 AND gas_tank_balance >= $1
       RETURNING gas_tank_balance`,
      [amount, projectId]
    );

    return result.rows.length > 0;
  }

  /**
   * Release reserved funds (if transaction fails)
   */
  async releaseFunds(projectId: string, amount: string): Promise<void> {
    await query(
      `UPDATE projects
       SET gas_tank_balance = gas_tank_balance + $1
       WHERE id = $2`,
      [amount, projectId]
    );
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
}

export default new ProjectService();
