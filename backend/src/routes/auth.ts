/**
 * Authentication Routes
 * Handles developer registration, login, logout, and session management
 */

import express, { Request, Response } from 'express';
import { register, login, logout } from '../services/authService';
import { requireDeveloperAuth } from '../middleware/developerAuth';

const router = express.Router();

/**
 * POST /auth/register
 * Register a new developer account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validate inputs
    if (!email || !password || !name) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email, password, and name are required',
      });
      return;
    }

    // Register developer
    const { developer, sessionToken } = await register(email, password, name);

    // Set session cookie (httpOnly, secure in production)
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      developer: {
        id: developer.id,
        email: developer.email,
        name: developer.name,
        credit_balance: developer.credit_balance,
        status: developer.status,
        created_at: developer.created_at,
      },
      sessionToken, // Also return token for non-cookie clients
    });
  } catch (error: any) {
    console.error('Register error:', error);

    if (error.message.includes('already registered')) {
      res.status(409).json({
        error: 'Conflict',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('required') ||
      error.message.includes('must be at least')
    ) {
      res.status(400).json({
        error: 'Bad Request',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register account',
    });
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
      return;
    }

    // Login
    const { developer, sessionToken } = await login(email, password);

    // Set session cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      developer: {
        id: developer.id,
        email: developer.email,
        name: developer.name,
        credit_balance: developer.credit_balance,
        status: developer.status,
        created_at: developer.created_at,
      },
      sessionToken, // Also return token for non-cookie clients
    });
  } catch (error: any) {
    console.error('Login error:', error);

    if (
      error.message.includes('Invalid') ||
      error.message.includes('suspended') ||
      error.message.includes('banned')
    ) {
      res.status(401).json({
        error: 'Unauthorized',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login',
    });
  }
});

/**
 * POST /auth/logout
 * Logout (invalidate session)
 */
router.post('/logout', requireDeveloperAuth, async (req: Request, res: Response) => {
  try {
    // Get session token from cookie or header
    let sessionToken: string | undefined;

    if (req.cookies?.session_token) {
      sessionToken = req.cookies.session_token;
    } else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (sessionToken) {
      await logout(sessionToken);
    }

    // Clear session cookie
    res.clearCookie('session_token');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout',
    });
  }
});

/**
 * GET /auth/me
 * Get current authenticated developer
 */
router.get('/me', requireDeveloperAuth, async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      developer: {
        id: req.developer!.id,
        email: req.developer!.email,
        name: req.developer!.name,
        credit_balance: req.developer!.credit_balance,
        status: req.developer!.status,
        created_at: req.developer!.created_at,
      },
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get developer info',
    });
  }
});

export default router;
