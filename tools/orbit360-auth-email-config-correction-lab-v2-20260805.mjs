#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applicationDefault, deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT = process.env.ORBIT360_PROJECT_ID || 'ays-orbit-360-lab';
const TENANT = process.env.ORBIT360_REAL_TENANT_ID || 'alianzas-soluciones';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-access-recovery-lab-v2-20260805.json';
const OUT = process.env.ORBIT360_EMAIL_CORRECTION_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/auth-email-config-correction-sanitized-v2-20260805.json';
const EXPECTED_EMAIL_SHA256 = '9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f';

const text = (value, max = 500) => String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
const norm = value => text(value, 300).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const sha = value => crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
const validEmail = value => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text(value, 320).toLowerCase());
const safeError = error => text(error?.message || error, 800).replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/https?:\/\/\S+/g, '[url]');
const write = payload => {
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
};

let app;
try {
  const request = JSON.parse(fs.readFileSync(REQUEST, 'utf8'));
  const officialEmail = text(request.officialAccessEmail, 320).toLowerCase();
  if (!validEmail(officialEmail) || sha(officialEmail) !== EXPECTED_EMAIL_SHA256 || request.officialAccessEmailSha256 !== EXPECTED_EMAIL_SHA256) {
    throw new Error('DATA_CONTRACT_FAILURE:AUTHORIZED_EMAIL_DIGEST_MISMATCH');
  }

  app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const db = getFirestore(app);
  const sources = [
    { source: 'canonical', ref: db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items') },
    { source: 'legacy_tenantId', ref: db.collection('tenantId').doc(TENANT).collection('asesores') },
    { source: 'legacy_tenants', ref: db.collection('tenants').doc(TENANT).collection('asesores') }
  ];
  const found = new Map();
  for (const item of sources) {
    const snap = await item.ref.get();
    for (const doc of snap.docs) {
      if (!found.has(doc.id)) found.set(doc.id, { id: doc.id, source: item.source, ref: doc.ref, data: doc.data() || {} });
    }
  }
  const matches = [...found.values()].filter(item => {
    const name = norm(item.data.nombre || item.data.name || item.data.displayName);
    return name.includes('paula') && name.includes('osorio');
  });
  if (matches.length !== 1) throw new Error(`DATA_CONTRACT_FAILURE:ADVISOR_PAULA_${matches.length ? 'AMBIGUOUS' : 'NOT_FOUND'}`);
  const target = matches[0];
  const current = text(target.data.email || target.data.correo || target.data.userEmail, 320).toLowerCase();
  if (validEmail(current) && current !== officialEmail) throw new Error('DATA_CONTRACT_FAILURE:ADVISOR_PAULA_DIFFERENT_EMAIL_ALREADY_CONFIGURED');

  let changed = false;
  await db.runTransaction(async tx => {
    const snap = await tx.get(target.ref);
    if (!snap.exists) throw new Error('DATA_CONTRACT_FAILURE:ADVISOR_PAULA_DISAPPEARED');
    const row = snap.data() || {};
    const live = text(row.email || row.correo || row.userEmail, 320).toLowerCase();
    if (validEmail(live) && live !== officialEmail) throw new Error('DATA_CONTRACT_FAILURE:ADVISOR_PAULA_DIFFERENT_EMAIL_ALREADY_CONFIGURED');
    if (text(row.email, 320).toLowerCase() !== officialEmail) {
      tx.update(target.ref, { email: officialEmail });
      changed = true;
    }
  });

  const after = await target.ref.get();
  const afterEmail = text(after.data()?.email, 320).toLowerCase();
  if (afterEmail !== officialEmail) throw new Error('DATA_CONTRACT_FAILURE:ADVISOR_PAULA_EMAIL_POSTVERIFY_FAILED');

  write({
    schemaVersion: 'orbit360-auth-email-config-correction-sanitized-v2',
    stage: 'AUTH_EMAIL_CONFIG_CORRECTION_PASS',
    decision: 'GO_PAULA_OFFICIAL_ACCESS_EMAIL_CONFIGURED',
    classification: 'DATA_CONTRACT_CORRECTED',
    tenantId: TENANT,
    advisorIdHash: sha(target.id),
    advisorPathHash: sha(target.ref.path),
    source: target.source,
    officialEmailSha256: EXPECTED_EMAIL_SHA256,
    changedFields: changed ? ['email'] : [],
    firestoreWrites: changed ? 1 : 0,
    authWrites: 0,
    membershipWrites: 0,
    crmWrites: 0,
    fullEmailsExposed: 0,
    containsPII: false,
    containsSecrets: false,
    ok: true
  });
  console.log(JSON.stringify({ ok: true, stage: 'AUTH_EMAIL_CONFIG_CORRECTION_PASS', changed, source: target.source }));
} catch (error) {
  const message = safeError(error);
  const classification = (message.match(/^(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE';
  write({
    schemaVersion: 'orbit360-auth-email-config-correction-sanitized-v2',
    stage: 'STOP_RETRY_EMAIL_CONFIG_CORRECTION',
    decision: 'STOP_RETRY',
    classification,
    errorCode: text(message.split(':')[1] || 'EMAIL_CONFIG_CORRECTION_FAILED', 180),
    firestoreWrites: 0,
    authWrites: 0,
    membershipWrites: 0,
    crmWrites: 0,
    fullEmailsExposed: 0,
    containsPII: false,
    containsSecrets: false,
    ok: false
  });
  console.error(JSON.stringify({ ok: false, stage: 'STOP_RETRY_EMAIL_CONFIG_CORRECTION', classification }));
  process.exitCode = 41;
} finally {
  if (app) await deleteApp(app).catch(() => {});
}
