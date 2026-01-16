/**
 * Developer Authentication Middleware
 * Validates session token and attaches developer to request
 */

import { Request, Response, NextFunction } from 'express';
import { validateSession, Developer } from '../services/authService';

// Extend Express Request type to include developer
declare global {
  namespace Express {
    interface Request {
      developer?: Developer;
    }
  }
}

/**
 * Middleware to require developer authentication
 * Reads session token from cookie or Authorization header
 */
export async function requireDeveloperAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get session token from cookie or Authorization header
    let sessionToken: string | undefined;

    // Try cookie first
    if (req.cookies?.session_token) {
      sessionToken = req.cookies.session_token;
    }

    // Try Authorization header (Bearer token)
    if (!sessionToken && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (!sessionToken) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No session token provided',
      });
      return;
    }

    // Validate session
    const developer = await validateSession(sessionToken);

    if (!developer) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session',
      });
      return;
    }

    // Attach developer to request
    req.developer = developer;

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate session',
    });
  }
}

/**
 * Optional auth middleware (doesn't fail if no token)
 * Useful for routes that work differently when authenticated
 */
export async function optionalDeveloperAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get session token from cookie or Authorization header
    let sessionToken: string | undefined;

    // Try cookie first
    if (req.cookies?.session_token) {
      sessionToken = req.cookies.session_token;
    }

    // Try Authorization header (Bearer token)
    if (!sessionToken && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (sessionToken) {
      // Validate session
      const developer = await validateSession(sessionToken);

      if (developer) {
        // Attach developer to request if valid
        req.developer = developer;
      }
    }

    next();
  } catch (error: any) {
    console.error('Optional auth middleware error:', error);
    // Don't fail the request, just continue without auth
    next();
  }
}

export default {
  requireDeveloperAuth,
  optionalDeveloperAuth,
};
