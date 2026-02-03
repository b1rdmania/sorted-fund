/**
 * Allowlist Management Routes
 */

import { Router } from 'express';
import { query } from '../db/database';
import { requirePrivyAuth } from '../middleware/privyAuth';
import organizationService from '../services/organizationService';
import { AddAllowlistRequest, Allowlist } from '../types';

const router = Router();
router.use(requirePrivyAuth);

async function requireProjectRole(
  projectId: string,
  developerId: number,
  minimumRole: 'viewer' | 'developer' | 'admin' | 'owner'
) {
  const membership = await organizationService.getProjectRole(projectId, developerId);
  if (!membership) {
    return null;
  }
  return organizationService.hasMinimumRole(membership.role, minimumRole);
}

/**
 * POST /projects/:id/allowlist
 * Add entry to allowlist
 */
router.post('/:id/allowlist', async (req, res) => {
  try {
    const data: AddAllowlistRequest = req.body;
    const projectId = req.params.id;
    const access = await requireProjectRole(projectId, req.developer!.id, 'developer');
    if (access === null) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }
    if (!access) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }

    if (!data.targetContract || !data.functionSelector) {
      return res.status(400).json({
        error: 'Missing required fields: targetContract, functionSelector',
        code: 'INVALID_REQUEST',
      });
    }

    const result = await query<Allowlist>(
      `INSERT INTO allowlists (project_id, target_contract, function_selector, enabled)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (project_id, target_contract, function_selector)
       DO UPDATE SET enabled = true
       RETURNING *`,
      [projectId, data.targetContract.toLowerCase(), data.functionSelector.toLowerCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Add allowlist error:', error);
    res.status(500).json({
      error: 'Failed to add to allowlist',
      code: 'ALLOWLIST_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /projects/:id/allowlist
 * Get all allowlist entries for project
 */
router.get('/:id/allowlist', async (req, res) => {
  try {
    const projectId = req.params.id;
    const access = await requireProjectRole(projectId, req.developer!.id, 'viewer');
    if (access === null) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }
    if (!access) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }

    const result = await query<Allowlist>(
      `SELECT * FROM allowlists
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get allowlist error:', error);
    res.status(500).json({
      error: 'Failed to get allowlist',
      code: 'GET_ALLOWLIST_ERROR',
      details: error.message,
    });
  }
});

/**
 * DELETE /projects/:id/allowlist
 * Remove entry from allowlist
 */
router.delete('/:id/allowlist', async (req, res) => {
  try {
    const { targetContract, functionSelector } = req.body;
    const projectId = req.params.id;
    const access = await requireProjectRole(projectId, req.developer!.id, 'developer');
    if (access === null) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }
    if (!access) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }

    if (!targetContract || !functionSelector) {
      return res.status(400).json({
        error: 'Missing required fields: targetContract, functionSelector',
        code: 'INVALID_REQUEST',
      });
    }

    await query(
      `UPDATE allowlists
       SET enabled = false
       WHERE project_id = $1
       AND target_contract = $2
       AND function_selector = $3`,
      [projectId, targetContract.toLowerCase(), functionSelector.toLowerCase()]
    );

    res.status(204).send();
  } catch (error: any) {
    console.error('Remove allowlist error:', error);
    res.status(500).json({
      error: 'Failed to remove from allowlist',
      code: 'REMOVE_ALLOWLIST_ERROR',
      details: error.message,
    });
  }
});

export default router;
