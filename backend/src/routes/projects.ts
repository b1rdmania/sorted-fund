/**
 * Project Management Routes
 */

import { Router } from 'express';
import projectService from '../services/projectService';
import apiKeyService from '../services/apiKeyService';
import { requirePrivyAuth } from '../middleware/privyAuth';
import organizationService from '../services/organizationService';
import { CreateProjectRequest, RefuelRequest } from '../types';

const router = Router();
router.use(requirePrivyAuth);

async function requireOwnedProject(projectId: string, developerId: number) {
  return projectService.getProjectForDeveloper(projectId, developerId);
}

async function requireProjectRole(
  projectId: string,
  developerId: number,
  minimumRole: 'viewer' | 'developer' | 'admin' | 'owner'
) {
  const membership = await organizationService.getProjectRole(projectId, developerId);
  if (!membership) {
    return null;
  }

  if (!organizationService.hasMinimumRole(membership.role, minimumRole)) {
    return false;
  }

  return true;
}

/**
 * GET /projects/funds/parity-report
 * Return cached-vs-ledger parity across all projects the developer can access.
 */
router.get('/funds/parity-report', async (req, res) => {
  try {
    const onlyDrift = String(req.query.onlyDrift || '').toLowerCase() === 'true';
    const report = await projectService.getFundsParityReportForDeveloper(req.developer!.id);
    const rows = onlyDrift ? report.filter((row) => !row.inSync) : report;

    res.json({
      summary: {
        totalProjects: report.length,
        outOfSyncProjects: report.filter((row) => !row.inSync).length,
      },
      rows,
    });
  } catch (error: any) {
    console.error('Get parity report error:', error);
    res.status(500).json({
      error: 'Failed to get parity report',
      code: 'GET_PARITY_REPORT_ERROR',
      details: error.message,
    });
  }
});

/**
 * POST /projects
 * Create a new project
 */
router.post('/', async (req, res) => {
  try {
    const data: CreateProjectRequest = req.body;
    const developer = req.developer!;

    // Validate required fields
    if (!data.id || !data.name) {
      return res.status(400).json({
        error: 'Missing required fields: id, name',
        code: 'INVALID_REQUEST',
      });
    }

    const owner = data.owner || developer.email || developer.name || `developer-${developer.id}`;
    const project = await projectService.createProject(
      { ...data, owner },
      developer.id
    );

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
    const project = await requireOwnedProject(req.params.id, req.developer!.id);

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
    const projects = await projectService.getAllProjectsForDeveloper(req.developer!.id);
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

    const access = await requireProjectRole(projectId, req.developer!.id, 'admin');
    if (access === null) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }
    if (access === false) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
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
    const access = await requireProjectRole(req.params.id, req.developer!.id, 'developer');
    if (access === null) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }
    if (access === false) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }

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

    const access = await requireProjectRole(projectId, req.developer!.id, 'admin');
    if (access === null) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }
    if (access === false) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }

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
    const project = await requireOwnedProject(req.params.id, req.developer!.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }

    const [balance, ledgerBalance] = await Promise.all([
      projectService.getGasTankBalance(req.params.id),
      projectService.getLedgerBalance(req.params.id),
    ]);

    res.json({ balance, ledgerBalance });
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
 * GET /projects/:id/funds/ledger
 * Get immutable funds ledger entries for the project
 */
router.get('/:id/funds/ledger', async (req, res) => {
  try {
    const project = await requireOwnedProject(req.params.id, req.developer!.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const [entries, ledgerBalance, cachedBalance] = await Promise.all([
      projectService.getLedgerEntries(req.params.id, limit, offset),
      projectService.getLedgerBalance(req.params.id),
      projectService.getGasTankBalance(req.params.id),
    ]);

    res.json({
      entries,
      pagination: {
        limit,
        offset,
      },
      balances: {
        ledger: ledgerBalance,
        cached: cachedBalance,
      },
    });
  } catch (error: any) {
    console.error('Get funds ledger error:', error);
    res.status(500).json({
      error: 'Failed to get funds ledger',
      code: 'GET_FUNDS_LEDGER_ERROR',
      details: error.message,
    });
  }
});

/**
 * GET /projects/:id/funds/parity
 * Compare cached balance vs ledger-derived balance.
 */
router.get('/:id/funds/parity', async (req, res) => {
  try {
    const project = await requireOwnedProject(req.params.id, req.developer!.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }

    const [ledger, cached] = await Promise.all([
      projectService.getLedgerBalance(req.params.id),
      projectService.getGasTankBalance(req.params.id),
    ]);

    const delta = (BigInt(cached) - BigInt(ledger)).toString();
    res.json({
      projectId: req.params.id,
      ledgerBalance: ledger,
      cachedBalance: cached,
      delta,
      inSync: delta === '0',
    });
  } catch (error: any) {
    console.error('Get funds parity error:', error);
    res.status(500).json({
      error: 'Failed to get funds parity',
      code: 'GET_FUNDS_PARITY_ERROR',
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
    const project = await requireOwnedProject(req.params.id, req.developer!.id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
    }

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
