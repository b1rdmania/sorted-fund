/**
 * Analytics Routes
 * API endpoints for analytics and metrics
 */

import { Router, Request, Response } from 'express';
import analyticsService from '../services/analyticsService';

const router = Router();

/**
 * GET /analytics/overview
 * Get overview metrics for a project
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        error: 'Missing required query parameter: projectId',
        code: 'INVALID_REQUEST',
      });
    }

    const overview = await analyticsService.getOverview(projectId);
    res.json(overview);
  } catch (error: any) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics overview',
      code: 'ANALYTICS_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /analytics/timeline
 * Get timeline data for a project
 */
router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const { projectId, period, granularity } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        error: 'Missing required query parameter: projectId',
        code: 'INVALID_REQUEST',
      });
    }

    const timeline = await analyticsService.getTimeline(
      projectId,
      period as string || '7d',
      granularity as string || 'day'
    );

    res.json(timeline);
  } catch (error: any) {
    console.error('Analytics timeline error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics timeline',
      code: 'ANALYTICS_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /analytics/events
 * Get recent events with pagination
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { projectId, limit, offset, status } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        error: 'Missing required query parameter: projectId',
        code: 'INVALID_REQUEST',
      });
    }

    const events = await analyticsService.getEvents(
      projectId,
      limit ? parseInt(limit as string) : 50,
      offset ? parseInt(offset as string) : 0,
      status as string
    );

    res.json(events);
  } catch (error: any) {
    console.error('Analytics events error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics events',
      code: 'ANALYTICS_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /analytics/top-users
 * Get top users by transaction count
 */
router.get('/top-users', async (req: Request, res: Response) => {
  try {
    const { projectId, limit } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        error: 'Missing required query parameter: projectId',
        code: 'INVALID_REQUEST',
      });
    }

    const topUsers = await analyticsService.getTopUsers(
      projectId,
      limit ? parseInt(limit as string) : 10
    );

    res.json(topUsers);
  } catch (error: any) {
    console.error('Analytics top users error:', error);
    res.status(500).json({
      error: 'Failed to fetch top users',
      code: 'ANALYTICS_ERROR',
      details: error.message,
    });
  }
});

export default router;
