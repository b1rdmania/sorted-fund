/**
 * Sponsorship Authorization Routes
 */

import { Router } from 'express';
import { authenticateApiKey, AuthenticatedRequest } from '../middleware/auth';
import authorizationService from '../services/authorizationService';
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

export default router;
