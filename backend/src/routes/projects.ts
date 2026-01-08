/**
 * Project Management Routes
 */

import { Router } from 'express';
import projectService from '../services/projectService';
import apiKeyService from '../services/apiKeyService';
import { CreateProjectRequest, RefuelRequest } from '../types';

const router = Router();

/**
 * POST /projects
 * Create a new project
 */
router.post('/', async (req, res) => {
  try {
    const data: CreateProjectRequest = req.body;

    // Validate required fields
    if (!data.id || !data.name || !data.owner) {
      return res.status(400).json({
        error: 'Missing required fields: id, name, owner',
        code: 'INVALID_REQUEST',
      });
    }

    const project = await projectService.createProject(data);

    res.status(201).json(project);
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project',
      code: 'CREATE_PROJECT_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /projects/:id
 * Get project details
 */
router.get('/:id', async (req, res) => {
  try {
    const project = await projectService.getProject(req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }

    res.json(project);
  } catch (error: any) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: 'Failed to get project',
      code: 'GET_PROJECT_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /projects
 * Get all projects
 */
router.get('/', async (req, res) => {
  try {
    const projects = await projectService.getAllProjects();
    res.json(projects);
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to get projects',
      code: 'GET_PROJECTS_ERROR',
      details: error.message,
    });
  }
});

/**
 * POST /projects/:id/apikeys
 * Generate API key for project
 */
router.post('/:id/apikeys', async (req, res) => {
  try {
    const { rateLimit } = req.body;
    const projectId = req.params.id;

    // Verify project exists
    const project = await projectService.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }

    const apiKeyData = await apiKeyService.generateApiKey(
      projectId,
      rateLimit || 100
    );

    res.status(201).json(apiKeyData);
  } catch (error: any) {
    console.error('Generate API key error:', error);
    res.status(500).json({
      error: 'Failed to generate API key',
      code: 'GENERATE_KEY_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /projects/:id/apikeys
 * Get all API keys for project
 */
router.get('/:id/apikeys', async (req, res) => {
  try {
    const keys = await apiKeyService.getProjectApiKeys(req.params.id);

    // Don't return key hashes, only metadata
    const safeMappedKeys = keys.map((k) => ({
      id: k.id,
      preview: k.key_preview,
      projectId: k.project_id,
      rateLimit: k.rate_limit,
      issuedAt: k.issued_at,
      revokedAt: k.revoked_at,
      lastUsedAt: k.last_used_at,
    }));

    res.json(safeMappedKeys);
  } catch (error: any) {
    console.error('Get API keys error:', error);
    res.status(500).json({
      error: 'Failed to get API keys',
      code: 'GET_KEYS_ERROR',
      details: error.message,
    });
  }
});

/**
 * POST /projects/:id/refuel
 * Refuel gas tank
 */
router.post('/:id/refuel', async (req, res) => {
  try {
    const data: RefuelRequest = req.body;
    const projectId = req.params.id;

    if (!data.amount) {
      return res.status(400).json({
        error: 'Missing required field: amount',
        code: 'INVALID_REQUEST',
      });
    }

    const refuel = await projectService.refuelGasTank(projectId, data);

    res.status(201).json(refuel);
  } catch (error: any) {
    console.error('Refuel error:', error);
    res.status(500).json({
      error: 'Failed to refuel gas tank',
      code: 'REFUEL_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /projects/:id/balance
 * Get gas tank balance
 */
router.get('/:id/balance', async (req, res) => {
  try {
    const balance = await projectService.getGasTankBalance(req.params.id);

    res.json({ balance });
  } catch (error: any) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Failed to get balance',
      code: 'GET_BALANCE_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /projects/:id/refuels
 * Get refuel history
 */
router.get('/:id/refuels', async (req, res) => {
  try {
    const refuels = await projectService.getRefuelHistory(req.params.id);
    res.json(refuels);
  } catch (error: any) {
    console.error('Get refuels error:', error);
    res.status(500).json({
      error: 'Failed to get refuel history',
      code: 'GET_REFUELS_ERROR',
      details: error.message,
    });
  }
});

export default router;
