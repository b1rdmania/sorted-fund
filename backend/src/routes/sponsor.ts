/**
 * Sponsorship Authorization Routes
 */

import { Router } from 'express';
import { authenticateApiKey, AuthenticatedRequest } from '../middleware/auth';
import authorizationService from '../services/authorizationService';
import gasReconciliationService from '../services/gasReconciliationService';
import { AuthorizeRequest } from '../types';

const router = Router();

/**
 * POST /sponsor/authorize
 * Authorize a UserOp sponsorship and return signed paymasterAndData
 */
router.post('/authorize', authenticateApiKey, async (req: AuthenticatedRequest, res) => {
  try {
    const request: AuthorizeRequest = req.body;

    // Validate required fields
    if (
      !request.projectId ||
      !request.chainId ||
      !request.user ||
      !request.target ||
      !request.selector ||
      !request.estimatedGas ||
      !request.clientNonce
    ) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'INVALID_REQUEST',
        required: [
          'projectId',
          'chainId',
          'user',
          'target',
          'selector',
          'estimatedGas',
          'clientNonce',
        ],
      });
    }

    // Verify projectId matches authenticated API key
    if (request.projectId !== req.project?.id) {
      return res.status(403).json({
        error: 'API key does not have access to this project',
        code: 'FORBIDDEN',
      });
    }

    // Generate authorization
    const authorization = await authorizationService.authorize(request);

    res.json(authorization);
  } catch (error: any) {
    console.error('Authorization error:', error);

    // Map errors to appropriate status codes
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND',
      });
    }

    if (
      error.message.includes('killed') ||
      error.message.includes('suspended') ||
      error.message.includes('not allowlisted')
    ) {
      return res.status(403).json({
        error: error.message,
        code: 'FORBIDDEN',
      });
    }

    if (
      error.message.includes('Insufficient') ||
      error.message.includes('exceeded')
    ) {
      return res.status(402).json({
        error: error.message,
        code: 'INSUFFICIENT_FUNDS',
      });
    }

    res.status(500).json({
      error: 'Authorization failed',
      code: 'AUTHORIZATION_ERROR',
      details: error.message,
    });
  }
});

/**
 * POST /sponsor/reconcile
 * Update sponsorship event with actual gas used after transaction completes
 */
router.post('/reconcile', authenticateApiKey, async (req: AuthenticatedRequest, res) => {
  try {
    const { userOpHash, actualGas, status, errorMessage } = req.body;

    // Validate required fields
    if (!userOpHash || !actualGas || !status) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'INVALID_REQUEST',
        required: ['userOpHash', 'actualGas', 'status'],
      });
    }

    // Validate status
    if (!['success', 'failed', 'reverted'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be: success, failed, or reverted',
        code: 'INVALID_STATUS',
      });
    }

    // Reconcile gas
    await gasReconciliationService.reconcileGas({
      userOpHash,
      actualGas,
      status,
      errorMessage,
    });

    res.json({
      message: 'Gas reconciled successfully',
      userOpHash,
      actualGas,
      status,
    });
  } catch (error: any) {
    console.error('Gas reconciliation error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND',
      });
    }

    res.status(500).json({
      error: 'Gas reconciliation failed',
      code: 'RECONCILIATION_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /sponsor/stats/:projectId
 * Get gas estimation statistics for a project
 */
router.get('/stats/:projectId', authenticateApiKey, async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;

    // Verify project access
    if (projectId !== req.project?.id) {
      return res.status(403).json({
        error: 'API key does not have access to this project',
        code: 'FORBIDDEN',
      });
    }

    const stats = await gasReconciliationService.getEstimationStats(projectId);
    const recentEvents = await gasReconciliationService.getRecentEventsWithAccuracy(projectId, 10);

    res.json({
      stats,
      recentEvents,
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      code: 'STATS_ERROR',
      details: error.message,
    });
  }
});

export default router;
