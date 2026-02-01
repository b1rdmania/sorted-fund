/**
 * Privy Authentication Routes
 * Simplified auth - Privy handles login, we just verify and manage developers
 */

import express, { Request, Response } from 'express';
import { requirePrivyAuth } from '../middleware/privyAuth';
import privyService from '../services/privyService';

const router = express.Router();

/**
 * GET /auth/me
 * Get current authenticated developer
 */
router.get('/me', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      developer: {
        id: req.developer!.id,
        privy_user_id: req.developer!.privy_user_id,
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

/**
 * POST /auth/profile
 * Update developer profile (name, email)
 */
router.post('/profile', requirePrivyAuth, async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;

    const updated = await privyService.updateDeveloper(req.privyUserId!, {
      name,
      email,
    });

    if (!updated) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Developer not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      developer: {
        id: updated.id,
        privy_user_id: updated.privy_user_id,
        email: updated.email,
        name: updated.name,
        credit_balance: updated.credit_balance,
        status: updated.status,
        created_at: updated.created_at,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile',
    });
  }
});

export default router;
