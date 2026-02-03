/**
 * System smoke test for core backend flows:
 * - org bootstrap
 * - project creation
 * - API key generation/validation
 * - sponsorship authorization
 * - gas reconciliation
 * - ledger vs cached balance parity
 */

import { randomUUID } from 'crypto';
import { closeDatabase, query } from '../db/database';
import organizationService from '../services/organizationService';
import projectService from '../services/projectService';
import apiKeyService from '../services/apiKeyService';

async function run() {
  // Reasonable local defaults so the script works in dev without a full .env file.
  process.env.SONIC_CHAIN_ID = process.env.SONIC_CHAIN_ID || '14601';
  process.env.SONIC_RPC_URL = process.env.SONIC_RPC_URL || 'https://rpc.testnet.soniclabs.com';
  process.env.PAYMASTER_ADDRESS =
    process.env.PAYMASTER_ADDRESS || '0x1111111111111111111111111111111111111111';
  process.env.BACKEND_SIGNER_PRIVATE_KEY =
    process.env.BACKEND_SIGNER_PRIVATE_KEY ||
    '0x59c6995e998f97a5a0044966f0945386f0f7f76db4a53c6f7f2f0f0d6f5d6c10';
  process.env.MASTER_MNEMONIC =
    process.env.MASTER_MNEMONIC ||
    'test test test test test test test test test test test junk';
  process.env.API_KEY_SALT = process.env.API_KEY_SALT || 'local-smoke-salt';

  const devResult = await query<{ id: number }>(
    `SELECT id
     FROM developers
     WHERE email = 'demo@sorted.fund'
     LIMIT 1`
  );
  if (devResult.rows.length === 0) {
    throw new Error('Demo developer not found. Run migrations first.');
  }

  const developerId = devResult.rows[0].id;
  const testProjectId = `smoke-${Date.now()}`;

  const org = await organizationService.ensureDefaultOrganization(
    developerId,
    'Smoke Test Org'
  );
  console.log('OK default org', org.id);

  const project = await projectService.createProject(
    {
      id: testProjectId,
      name: 'Smoke Project',
      owner: `developer-${developerId}`,
      dailyCap: '1000000000000000000',
    },
    developerId
  );
  console.log('OK project created', project.id);

  await projectService.refuelGasTank(project.id, {
    amount: '1000000000000000',
    note: 'smoke test seed',
  });
  console.log('OK project refueled');

  const key = await apiKeyService.generateApiKey(project.id, 100);
  const validated = await apiKeyService.validateApiKey(key.apiKey);
  if (!validated) {
    throw new Error('API key validation failed');
  }
  console.log('OK api key generated/validated', key.preview);

  const target = '0x2222222222222222222222222222222222222222';
  const selector = '0x12345678';

  await query(
    `INSERT INTO allowlists (project_id, target_contract, function_selector, enabled)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (project_id, target_contract, function_selector)
     DO UPDATE SET enabled = true`,
    [project.id, target, selector]
  );

  const { default: authorizationService } = await import('../services/authorizationService');
  const authorization = await authorizationService.authorize({
    projectId: project.id,
    chainId: 14601,
    user: '0x3333333333333333333333333333333333333333',
    target,
    selector,
    estimatedGas: 100000,
    clientNonce: '1',
  });
  console.log('OK authorize', authorization.paymasterSignature.slice(0, 18) + '...');

  const userOpHash = `0x${randomUUID().replace(/-/g, '').padEnd(64, '0').slice(0, 64)}`;
  await query(
    `UPDATE sponsorship_events
     SET user_op_hash = $1, status = 'pending'
     WHERE project_id = $2
       AND paymaster_signature = $3`,
    [userOpHash, project.id, authorization.paymasterSignature]
  );

  const { default: gasReconciliationService } = await import('../services/gasReconciliationService');
  await gasReconciliationService.reconcileGas({
    projectId: project.id,
    userOpHash,
    actualGas: '80000',
    status: 'success',
  });
  console.log('OK reconcile');

  const parity = await projectService.getLedgerBalance(project.id);
  const cached = await projectService.getGasTankBalance(project.id);
  const delta = BigInt(cached) - BigInt(parity);

  // Reserve/release math should stay in sync for this happy-path flow.
  if (delta !== 0n) {
    throw new Error(`Parity drift detected. cached=${cached} ledger=${parity}`);
  }
  console.log('OK parity in sync');

  console.log('\nSmoke test passed.');
}

run()
  .catch((error) => {
    console.error('\nSmoke test failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
