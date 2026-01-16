/**
 * Authentication Middleware
 * Validates API keys and attaches project to request
 */

import { Request, Response, NextFunction } from 'express';
import apiKeyService from '../services/apiKeyService';
import projectService from '../services/projectService';

export interface AuthenticatedRequest extends Request {
  apiKey?: any;
  project?: any;
  developerId?: number; // Developer ID from project
}

/**
 * Middleware to authenticate API key from Authorization header
 */
export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'UNAUTHORIZED',
      });
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer '

    // Validate API key
    const validatedKey = await apiKeyService.validateApiKey(apiKey);

    if (!validatedKey) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    }

    // Check rate limit
    const withinLimit = await apiKeyService.checkRateLimit(
      validatedKey.id,
      validatedKey.rate_limit
    );

    if (!withinLimit) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    // Record request
    await apiKeyService.recordRequest(validatedKey.id);

    // Get associated project
    const project = await projectService.getProject(validatedKey.project_id);

    if (!project) {
      return res.status(404).json({
        error: 'Associated project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }

    // Attach to request
    req.apiKey = validatedKey;
    req.project = project;
    req.developerId = project.developer_id;

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
      details: error.message,
    });
  }
}
