/**
 * Organization Routes
 * Manage organizations and members.
 */

import { Router } from 'express';
import { requirePrivyAuth } from '../middleware/privyAuth';
import organizationService from '../services/organizationService';
import { OrganizationRole } from '../types';

const router = Router();
router.use(requirePrivyAuth);

const VALID_ROLES: OrganizationRole[] = ['owner', 'admin', 'developer', 'viewer'];

router.get('/', async (req, res) => {
  try {
    const orgs = await organizationService.getOrganizationsForDeveloper(req.developer!.id);
    res.json(orgs);
  } catch (error: any) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      error: 'Failed to get organizations',
      code: 'GET_ORGS_ERROR',
      details: error.message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      return res.status(400).json({
        error: 'Missing required field: name',
        code: 'INVALID_REQUEST',
      });
    }

    const org = await organizationService.createOrganization(req.developer!.id, name, slug);
    res.status(201).json(org);
  } catch (error: any) {
    console.error('Create organization error:', error);
    res.status(500).json({
      error: 'Failed to create organization',
      code: 'CREATE_ORG_ERROR',
      details: error.message,
    });
  }
});

router.get('/:orgId/members', async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId, 10);
    if (Number.isNaN(orgId)) {
      return res.status(400).json({
        error: 'Invalid organization id',
        code: 'INVALID_REQUEST',
      });
    }

    const isMember = await organizationService.isOrganizationMember(orgId, req.developer!.id);
    if (!isMember) {
      return res.status(404).json({
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND',
      });
    }

    const members = await organizationService.getOrganizationMembers(orgId);
    res.json(members);
  } catch (error: any) {
    console.error('Get members error:', error);
    res.status(500).json({
      error: 'Failed to get members',
      code: 'GET_MEMBERS_ERROR',
      details: error.message,
    });
  }
});

router.post('/:orgId/members', async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId, 10);
    if (Number.isNaN(orgId)) {
      return res.status(400).json({
        error: 'Invalid organization id',
        code: 'INVALID_REQUEST',
      });
    }

    const role = (req.body.role || 'developer') as OrganizationRole;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Missing required field: email',
        code: 'INVALID_REQUEST',
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
        code: 'INVALID_ROLE',
      });
    }

    const callerRole = await organizationService.getOrganizationRole(orgId, req.developer!.id);
    if (!callerRole || !organizationService.hasMinimumRole(callerRole, 'admin')) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }

    const member = await organizationService.addMemberByEmail(orgId, email, role);
    res.status(201).json({
      success: true,
      member,
      role,
    });
  } catch (error: any) {
    console.error('Add member error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND',
      });
    }
    res.status(500).json({
      error: 'Failed to add member',
      code: 'ADD_MEMBER_ERROR',
      details: error.message,
    });
  }
});

router.patch('/:orgId/members/:developerId', async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId, 10);
    const developerId = parseInt(req.params.developerId, 10);
    const role = req.body.role as OrganizationRole;

    if (Number.isNaN(orgId) || Number.isNaN(developerId)) {
      return res.status(400).json({
        error: 'Invalid organization or developer id',
        code: 'INVALID_REQUEST',
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
        code: 'INVALID_ROLE',
      });
    }

    const callerRole = await organizationService.getOrganizationRole(orgId, req.developer!.id);
    if (!callerRole || !organizationService.hasMinimumRole(callerRole, 'owner')) {
      return res.status(403).json({
        error: 'Only organization owners can change member roles',
        code: 'FORBIDDEN',
      });
    }

    await organizationService.updateMemberRole(orgId, developerId, role);
    res.json({
      success: true,
      developerId,
      role,
    });
  } catch (error: any) {
    console.error('Update member role error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND',
      });
    }
    res.status(500).json({
      error: 'Failed to update member role',
      code: 'UPDATE_MEMBER_ROLE_ERROR',
      details: error.message,
    });
  }
});

export default router;

