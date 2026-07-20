#!/usr/bin/env node
import fs from 'node:fs';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';
const SECRET_ID = 'orbit360-insurer-credentials-alianzas-soluciones';
const STATE_PATH = process.env.ORBIT360_IMPORTERS_E2E_STATE ||
  'orbit360-platform/runtime-gate-crm-v20260716/importers-e2e-state.json';
const OUTPUT = process.env.ORBIT360_IMPORTERS_E2E_VAULT_ROLLBACK ||
  'orbit360-platform/runtime-gate-crm-v20260716/importers-e2e-vault-rollback-sanitized.json';

if (String(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '') !== PROJECT_ID) {
  throw new Error('BLOQUEO_PROYECTO_LAB');
}

const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
const client = new SecretManagerServiceClient();
const parent = `projects/${PROJECT_ID}/secrets/${SECRET_ID}`;
const latest = `${parent}/versions/latest`;
const result = {
  schemaVersion: 'orbit360-importers-e2e-vault-rollback-v1',
  runId: String(state.runId || ''),
  vaultRecordDeleted: false,
  transientVersionDestroyed: false,
  cleanupVersionCreated: false,
  otherRecordsPreserved: false,
  containsPII: false,
  containsSecrets: false
};

function write() {
  fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

try {
  const [version] = await client.accessSecretVersion({ name: latest });
  const versionName = String(version?.name || '');
  const text = version?.payload?.data ? Buffer.from(version.payload.data).toString('utf8') : '';
  const vault = text ? JSON.parse(text) : {
    schemaVersion: 'orbit360-insurer-credentials-v1',
    tenantId: TENANT_ID,
    records: {}
  };
  if (vault.schemaVersion !== 'orbit360-insurer-credentials-v1' || vault.tenantId !== TENANT_ID) {
    throw new Error('VAULT_CONTRACT_MISMATCH');
  }
  vault.records = vault.records && typeof vault.records === 'object' ? vault.records : {};
  const beforeCount = Object.keys(vault.records).length;
  const containedFixture = Object.prototype.hasOwnProperty.call(vault.records, state.credentialRef);

  if (containedFixture) {
    delete vault.records[state.credentialRef];
    vault.updatedAt = new Date().toISOString();
    const payload = Buffer.from(JSON.stringify(vault), 'utf8');
    await client.addSecretVersion({ parent, payload: { data: payload } });
    result.cleanupVersionCreated = true;
    if (versionName && !versionName.endsWith('/versions/latest')) {
      await client.destroySecretVersion({ name: versionName });
      result.transientVersionDestroyed = true;
    }
  } else {
    result.transientVersionDestroyed = true;
  }

  const [verifiedVersion] = await client.accessSecretVersion({ name: latest });
  const verifiedText = verifiedVersion?.payload?.data ? Buffer.from(verifiedVersion.payload.data).toString('utf8') : '';
  const verified = verifiedText ? JSON.parse(verifiedText) : { records: {} };
  verified.records = verified.records && typeof verified.records === 'object' ? verified.records : {};
  const afterCount = Object.keys(verified.records).length;
  result.vaultRecordDeleted = !Object.prototype.hasOwnProperty.call(verified.records, state.credentialRef);
  result.otherRecordsPreserved = containedFixture ? afterCount === beforeCount - 1 : afterCount === beforeCount;
} catch (error) {
  if (Number(error?.code) === 5) {
    result.vaultRecordDeleted = true;
    result.transientVersionDestroyed = true;
    result.otherRecordsPreserved = true;
  } else {
    result.errorCode = String(error?.code || error?.message || 'vault_rollback_failed')
      .replace(/[^A-Za-z0-9_.-]+/g, '_')
      .slice(0, 100);
  }
}

write();
if (!result.vaultRecordDeleted || !result.transientVersionDestroyed || !result.otherRecordsPreserved) {
  console.error(`ORBIT360_IMPORTERS_E2E_VAULT_ROLLBACK_NO_GO:${result.errorCode || 'ROLLBACK_INCOMPLETE'}`);
  process.exit(62);
}
console.log('ORBIT360_IMPORTERS_E2E_VAULT_ROLLBACK_OK');
