/**
 * Analytics Service
 * Provides analytics and metrics for projects
 */

import { query } from '../db/database';

interface OverviewMetrics {
  projectId: string;
  totalSponsored: number;
  totalGasUsed: string;
  totalGasSaved: string;
  activeUsers: number;
  topContracts: Array<{
    address: string;
    calls: number;
    gasUsed: string;
  }>;
  today: {
    sponsored: number;
    gasUsed: string;
    dailyCapRemaining: string;
  };
}

interface TimelineDataPoint {
  date: string;
  sponsored: number;
  gasUsed: string;
  uniqueUsers: number;
}

interface EventsResponse {
  events: Array<any>;
  total: number;
  limit: number;
  offset: number;
}

class AnalyticsService {
  /**
   * Get overview analytics for a project
   */
  async getOverview(projectId: string): Promise<OverviewMetrics> {
    // Get total stats
    const totalStats = await query(
      `SELECT
        COUNT(*) as total_sponsored,
        COALESCE(SUM(actual_gas::bigint), 0) as total_gas_used,
        COUNT(DISTINCT sender) as active_users
      FROM sponsorship_events
      WHERE project_id = $1 AND status = 'success'`,
      [projectId]
    );

    // Get today's stats (last 24 hours)
    const todayStats = await query(
      `SELECT
        COUNT(*) as sponsored,
        COALESCE(SUM(actual_gas::bigint), 0) as gas_used
      FROM sponsorship_events
      WHERE project_id = $1
        AND status = 'success'
        AND created_at >= NOW() - INTERVAL '24 hours'`,
      [projectId]
    );

    // Get top contracts
    const topContracts = await query(
      `SELECT
        target as address,
        COUNT(*) as calls,
        COALESCE(SUM(actual_gas::bigint), 0) as gas_used
      FROM sponsorship_events
      WHERE project_id = $1 AND status = 'success'
      GROUP BY target
      ORDER BY calls DESC
      LIMIT 5`,
      [projectId]
    );

    // Get project info for daily cap
    const project = await query(
      'SELECT gas_tank_balance, daily_cap, daily_spent FROM projects WHERE id = $1',
      [projectId]
    );

    const projectData = project.rows[0];
    const dailyCapRemaining = projectData
      ? BigInt(projectData.daily_cap) - BigInt(projectData.daily_spent || 0)
      : BigInt(0);

    return {
      projectId,
      totalSponsored: parseInt(totalStats.rows[0]?.total_sponsored || '0'),
      totalGasUsed: totalStats.rows[0]?.total_gas_used?.toString() || '0',
      totalGasSaved: totalStats.rows[0]?.total_gas_used?.toString() || '0',
      activeUsers: parseInt(totalStats.rows[0]?.active_users || '0'),
      topContracts: topContracts.rows.map((row) => ({
        address: row.address,
        calls: parseInt(row.calls),
        gasUsed: row.gas_used?.toString() || '0',
      })),
      today: {
        sponsored: parseInt(todayStats.rows[0]?.sponsored || '0'),
        gasUsed: todayStats.rows[0]?.gas_used?.toString() || '0',
        dailyCapRemaining: dailyCapRemaining.toString(),
      },
    };
  }

  /**
   * Get timeline data for a project
   */
  async getTimeline(
    projectId: string,
    period: string = '7d',
    granularity: string = 'day'
  ): Promise<{
    period: string;
    granularity: string;
    data: TimelineDataPoint[];
  }> {
    // Parse period (24h, 7d, 30d)
    let interval: string;
    let truncFormat: string;

    switch (period) {
      case '24h':
        interval = '24 hours';
        truncFormat = granularity === 'hour' ? 'hour' : 'day';
        break;
      case '7d':
        interval = '7 days';
        truncFormat = 'day';
        break;
      case '30d':
        interval = '30 days';
        truncFormat = 'day';
        break;
      default:
        interval = '7 days';
        truncFormat = 'day';
    }

    const timeline = await query(
      `SELECT
        DATE_TRUNC($1, created_at) as date,
        COUNT(*) as sponsored,
        COALESCE(SUM(actual_gas::bigint), 0) as gas_used,
        COUNT(DISTINCT sender) as unique_users
      FROM sponsorship_events
      WHERE project_id = $2
        AND status = 'success'
        AND created_at >= NOW() - INTERVAL $3
      GROUP BY DATE_TRUNC($1, created_at)
      ORDER BY date ASC`,
      [truncFormat, projectId, interval]
    );

    return {
      period,
      granularity,
      data: timeline.rows.map((row) => ({
        date: row.date.toISOString().split('T')[0],
        sponsored: parseInt(row.sponsored),
        gasUsed: row.gas_used?.toString() || '0',
        uniqueUsers: parseInt(row.unique_users),
      })),
    };
  }

  /**
   * Get recent events with pagination and filtering
   */
  async getEvents(
    projectId: string,
    limit: number = 50,
    offset: number = 0,
    status?: string
  ): Promise<EventsResponse> {
    let whereClause = 'WHERE project_id = $1';
    const params: any[] = [projectId];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM sponsorship_events ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get events
    const events = await query(
      `SELECT
        id,
        user_op_hash,
        sender,
        target,
        selector,
        estimated_gas,
        actual_gas,
        max_cost,
        status,
        created_at,
        completed_at,
        error_message
      FROM sponsorship_events
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      events: events.rows,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get top users by transaction count
   */
  async getTopUsers(projectId: string, limit: number = 10): Promise<Array<any>> {
    const topUsers = await query(
      `SELECT
        sender,
        COUNT(*) as transaction_count,
        COALESCE(SUM(actual_gas::bigint), 0) as total_gas_used,
        MAX(created_at) as last_active
      FROM sponsorship_events
      WHERE project_id = $1 AND status = 'success'
      GROUP BY sender
      ORDER BY transaction_count DESC
      LIMIT $2`,
      [projectId, limit]
    );

    return topUsers.rows.map((row) => ({
      address: row.sender,
      transactionCount: parseInt(row.transaction_count),
      totalGasUsed: row.total_gas_used?.toString() || '0',
      lastActive: row.last_active,
    }));
  }
}

export default new AnalyticsService();
