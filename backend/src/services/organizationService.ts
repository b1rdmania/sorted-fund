/**
 * Organization Service
 * Handles organization membership and default organization bootstrap.
 */

import { query } from '../db/database';
import { Organization } from '../types';

function sanitizeSlugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export class OrganizationService {
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
}

export default new OrganizationService();

