/**
 * Organization Service
 * Handles organization membership and default organization bootstrap.
 */

import { query } from '../db/database';
import { Organization, OrganizationRole } from '../types';

function sanitizeSlugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export class OrganizationService {
  private readonly roleRank: Record<OrganizationRole, number> = {
    viewer: 1,
    developer: 2,
    admin: 3,
    owner: 4,
  };

  async getDefaultOrganizationForDeveloper(developerId: number): Promise<Organization | null> {
    const result = await query<Organization>(
      `SELECT * FROM organizations
       WHERE default_for_developer_id = $1`,
      [developerId]
    );

    return result.rows[0] || null;
  }

  async ensureDefaultOrganization(
    developerId: number,
    preferredName?: string | null
  ): Promise<Organization> {
    const existing = await this.getDefaultOrganizationForDeveloper(developerId);
    if (existing) {
      return existing;
    }

    const baseSlug = sanitizeSlugPart(preferredName || '') || `dev-${developerId}`;
    const slug = `${baseSlug}-${developerId}`;
    const name = preferredName?.trim() || `Developer ${developerId} Org`;

    const created = await query<Organization>(
      `INSERT INTO organizations (slug, name, status, default_for_developer_id)
       VALUES ($1, $2, 'active', $3)
       ON CONFLICT (default_for_developer_id)
       DO UPDATE SET name = organizations.name
       RETURNING *`,
      [slug, name, developerId]
    );

    const org = created.rows[0];

    await query(
      `INSERT INTO organization_members (organization_id, developer_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (organization_id, developer_id) DO NOTHING`,
      [org.id, developerId]
    );

    return org;
  }

  async isProjectAccessibleByDeveloper(projectId: string, developerId: number): Promise<boolean> {
    const result = await query(
      `SELECT 1
       FROM projects p
       INNER JOIN organization_members om ON om.organization_id = p.organization_id
       WHERE p.id = $1 AND om.developer_id = $2
       LIMIT 1`,
      [projectId, developerId]
    );

    return result.rows.length > 0;
  }

  async getProjectRole(
    projectId: string,
    developerId: number
  ): Promise<{ organizationId: number; role: OrganizationRole } | null> {
    const result = await query<{ organization_id: number; role: OrganizationRole }>(
      `SELECT p.organization_id, om.role
       FROM projects p
       INNER JOIN organization_members om ON om.organization_id = p.organization_id
       WHERE p.id = $1 AND om.developer_id = $2
       LIMIT 1`,
      [projectId, developerId]
    );

    if (!result.rows[0]) {
      return null;
    }

    return {
      organizationId: result.rows[0].organization_id,
      role: result.rows[0].role,
    };
  }

  hasMinimumRole(role: OrganizationRole, minimumRole: OrganizationRole): boolean {
    return this.roleRank[role] >= this.roleRank[minimumRole];
  }

  async isOrganizationMember(organizationId: number, developerId: number): Promise<boolean> {
    const result = await query(
      `SELECT 1
       FROM organization_members
       WHERE organization_id = $1 AND developer_id = $2
       LIMIT 1`,
      [organizationId, developerId]
    );

    return result.rows.length > 0;
  }

  async getOrganizationRole(
    organizationId: number,
    developerId: number
  ): Promise<OrganizationRole | null> {
    const result = await query<{ role: OrganizationRole }>(
      `SELECT role
       FROM organization_members
       WHERE organization_id = $1 AND developer_id = $2
       LIMIT 1`,
      [organizationId, developerId]
    );

    return result.rows[0]?.role || null;
  }

  async getOrganizationsForDeveloper(developerId: number): Promise<Organization[]> {
    const result = await query<Organization>(
      `SELECT o.*
       FROM organizations o
       INNER JOIN organization_members om ON om.organization_id = o.id
       WHERE om.developer_id = $1
       ORDER BY o.created_at DESC`,
      [developerId]
    );

    return result.rows;
  }

  async createOrganization(
    developerId: number,
    name: string,
    slug?: string
  ): Promise<Organization> {
    const finalSlug = slug?.trim()
      ? sanitizeSlugPart(slug)
      : `${sanitizeSlugPart(name) || 'org'}-${Date.now().toString(36)}`;

    const created = await query<Organization>(
      `INSERT INTO organizations (slug, name, status)
       VALUES ($1, $2, 'active')
       RETURNING *`,
      [finalSlug, name]
    );

    const org = created.rows[0];

    await query(
      `INSERT INTO organization_members (organization_id, developer_id, role)
       VALUES ($1, $2, 'owner')`,
      [org.id, developerId]
    );

    return org;
  }

  async getOrganizationMembers(organizationId: number) {
    const result = await query<{
      developer_id: number;
      role: OrganizationRole;
      created_at: Date;
      email: string | null;
      name: string | null;
      privy_user_id: string | null;
    }>(
      `SELECT
         om.developer_id,
         om.role,
         om.created_at,
         d.email,
         d.name,
         d.privy_user_id
       FROM organization_members om
       INNER JOIN developers d ON d.id = om.developer_id
       WHERE om.organization_id = $1
       ORDER BY om.created_at ASC`,
      [organizationId]
    );

    return result.rows;
  }

  async addMemberByEmail(
    organizationId: number,
    email: string,
    role: OrganizationRole = 'developer'
  ) {
    const lookup = await query<{ id: number; email: string | null; name: string | null }>(
      `SELECT id, email, name
       FROM developers
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (lookup.rows.length === 0) {
      throw new Error('Developer not found for email');
    }

    const developer = lookup.rows[0];

    await query(
      `INSERT INTO organization_members (organization_id, developer_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, developer_id)
       DO UPDATE SET role = EXCLUDED.role`,
      [organizationId, developer.id, role]
    );

    return developer;
  }

  async updateMemberRole(
    organizationId: number,
    developerId: number,
    role: OrganizationRole
  ): Promise<void> {
    const result = await query(
      `UPDATE organization_members
       SET role = $1
       WHERE organization_id = $2 AND developer_id = $3`,
      [role, organizationId, developerId]
    );

    if ((result.rowCount || 0) === 0) {
      throw new Error('Organization member not found');
    }
  }
}

export default new OrganizationService();
