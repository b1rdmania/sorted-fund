/**
 * Privy Authentication Middleware
 * Validates Privy access tokens and attaches developer to request
 */

import { Request, Response, NextFunction } from 'express';
import privyService from '../services/privyService';
import { Developer } from '../types';

// Extend Express request with auth context
declare global {
  namespace Express {
    interface Request {
      developer?: Developer;
      privyUserId?: string;
    }
  }
}

/**
 * Middleware to require Privy authentication
 * Reads access token from Authorization header (Bearer token)
 */
export async function requirePrivyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No access token provided',
      });
      return;
    }

    const accessToken = authHeader.substring(7);

    // Verify token with Privy
    const claims = await privyService.verifyToken(accessToken);

    if (!claims) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired access token',
      });
      return;
    }

    // Get or create developer
    const developer = await privyService.getOrCreateDeveloper(
      claims.userId,
      null, // Email comes from Privy user object, not claims
      null
    );

    if (!developer || developer.status !== 'active') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Account is suspended or banned',
      });
      return;
    }

    // Attach to request
    req.developer = developer;
    req.privyUserId = claims.userId;

    next();
  } catch (error: any) {
    console.error('Privy auth middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate access token',
    });
  }
}

/**
 * Optional Privy auth (doesn't fail if no token)
 */
export async function optionalPrivyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      const claims = await privyService.verifyToken(accessToken);

      if (claims) {
        const developer = await privyService.getOrCreateDeveloper(claims.userId);
        if (developer && developer.status === 'active') {
          req.developer = developer;
          req.privyUserId = claims.userId;
        }
      }
    }

    next();
  } catch (error) {
    // Don't fail, just continue without auth
    next();
  }
}

export default {
  requirePrivyAuth,
  optionalPrivyAuth,
};
