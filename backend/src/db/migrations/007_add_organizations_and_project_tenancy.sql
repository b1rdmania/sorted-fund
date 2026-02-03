-- Migration: Add Organizations and project-level tenancy
-- Date: 2026-02-03

-- =====================================================
-- 1. ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended
    default_for_developer_id INTEGER UNIQUE REFERENCES developers(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. ORGANIZATION MEMBERSHIPS
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    developer_id INTEGER NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'owner', -- owner, admin, developer, viewer
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, developer_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_developer_id ON organization_members(developer_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

-- =====================================================
-- 3. PROJECTS TABLE: add organization_id
-- =====================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'projects'
          AND constraint_name = 'fk_projects_organization_id'
    ) THEN
        ALTER TABLE projects
        ADD CONSTRAINT fk_projects_organization_id
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- =====================================================
-- 4. BACKFILL: one default org per existing developer
-- =====================================================
INSERT INTO organizations (slug, name, status, default_for_developer_id)
SELECT
    CONCAT('dev-', d.id::text),
    CONCAT(COALESCE(NULLIF(d.name, ''), CONCAT('Developer ', d.id::text)), ' Org'),
    'active',
    d.id
FROM developers d
ON CONFLICT (default_for_developer_id) DO NOTHING;

-- Membership backfill: every developer is owner of their default org
INSERT INTO organization_members (organization_id, developer_id, role)
SELECT o.id, o.default_for_developer_id, 'owner'
FROM organizations o
WHERE o.default_for_developer_id IS NOT NULL
ON CONFLICT (organization_id, developer_id) DO NOTHING;

-- Assign projects to developer default org where possible
UPDATE projects p
SET organization_id = o.id
FROM organizations o
WHERE p.organization_id IS NULL
  AND p.developer_id IS NOT NULL
  AND o.default_for_developer_id = p.developer_id;

-- Fallback org for projects without developer ownership
INSERT INTO organizations (slug, name, status)
VALUES ('legacy-unassigned', 'Legacy Unassigned Projects', 'active')
ON CONFLICT (slug) DO NOTHING;

UPDATE projects
SET organization_id = (SELECT id FROM organizations WHERE slug = 'legacy-unassigned')
WHERE organization_id IS NULL;

-- If all projects are now assigned, enforce NOT NULL
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE organization_id IS NULL) THEN
        ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

