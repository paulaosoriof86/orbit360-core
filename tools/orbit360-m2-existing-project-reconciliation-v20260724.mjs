#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, 'm2-existing-project-reconciliation-summary.json');
const EXPECTED_FIREBASE_PROJECT_ID = 'ays-orbit-360-lab';
const TENANT_ID = 'alianzas-soluciones';

function writeEvidence(payload) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}
function text(value) { return String(value == null ? '' : value).trim(); }
function unique(values) { return [...new Set([].concat(values || []).map(text).filter(Boolean))]; }
function roleList(data) { return unique([].concat(data.roles || [], data.role || data.rol || [])); }
function activeRole(data) { return text(data.activeRole || data.rolActivo || data.defaultRole || data.rolDefault || data.role || data.rol); }
function countries(data) { return unique(data.countries || data.paises || []); }
function status(data) { return text(data.status || data.estado).toLowerCase(); }
function privileged(roles) { return roles.some(role => ['Dirección','SuperAdmin','AdminTenant'].includes(role)); }
function serviceCredential() {
  const file = text(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (file && fs.existsSync(file)) return applicationDefault();
  const raw = text(process.env.ORBIT360_RESOLVED_SERVICE_ACCOUNT_JSON);
  if (!raw) return applicationDefault();
  let value;
  try { value = JSON.parse(raw); } catch { value = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
  return cert(value);
}
async function listAllUsers(auth) {
  const users = []; let token;
  do {
    const page = await auth.listUsers(1000, token);
    users.push(...page.users);
    token = page.pageToken;
  } while (token && users.length < 10000);
  return users;
}
async function prepareExistingProject() {
  const credentialFile = text(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const projectId = text(process.env.ORBIT360_EXISTING_FIREBASE_PROJECT_ID || EXPECTED_FIREBASE_PROJECT_ID);
  const base = {
    schemaVersion: 'orbit360-m2-existing-project-reconciliation-v1',
    gateId: 'block2-product-readonly-runtime-v20260723',
    contractVersion: '2.1.1',
    expectedProjectId: EXPECTED_FIREBASE_PROJECT_ID,
    projectIdMatches: projectId === EXPECTED_FIREBASE_PROJECT_ID,
    projectIdentityChecked: true,
    newProjectRequired: false,
    existingProjectReused: true,
    serviceAccountAliasResolved: text(process.env.ORBIT360_RESOLVED_SERVICE_ACCOUNT_ALIAS) !== '',
    serviceAccountValueReported: false,
    firestoreRead: false,
    authRead: false,
    operationalWrites: 0,
    configurationWrites: 0,
    rulesChanged: false,
    runtimeExecuted: false,
    browserExecuted: false,
    hostingDeploy: false,
    functionsDeploy: false,
    imports: false,
    policies: false,
    containsPII: false,
    containsSecrets: false
  };
  if (!base.projectIdMatches || !credentialFile) {
    const out = { ...base, ok:false, status:'PIPELINE_MECHANISM_FAILURE', classification:'PIPELINE_MECHANISM_FAILURE',
      failedChecks:[...(!base.projectIdMatches ? ['PROJECT_IDENTITY_MISMATCH'] : []), ...(!credentialFile ? ['EXISTING_SERVICE_ACCOUNT_ALIAS_NOT_RESOLVED'] : [])] };
    writeEvidence(out); process.exitCode = 41; return;
  }
  try {
    const app = getApps()[0] || initializeApp({ credential: serviceCredential(), projectId });
    const auth = getAuth(app); const db = getFirestore(app);
    const users = await listAllUsers(auth);
    const authUids = new Set(users.map(user => text(user.uid)).filter(Boolean));
    const membershipSnapshot = await db.collection('tenants').doc(TENANT_ID).collection('members').get();
    const rows = membershipSnapshot.docs.map(doc => ({ id:doc.id, ...(doc.data() || {}) }));
    const normalized = rows.map(row => {
      const uid = text(row.uid || row.userId || row.id);
      const roles = roleList(row); const currentRole = activeRole(row);
      return { uid, roles, currentRole, active:status(row)==='active', countries:countries(row), scopes:row.dataScopes || row.scopes || {}, linked:authUids.has(uid) };
    });
    const active = normalized.filter(row => row.active);
    const linked = active.filter(row => row.linked);
    const privilegedLinked = linked.filter(row => privileged(row.roles));
    const roleNames = unique(normalized.flatMap(row => row.roles)).sort();
    const checks = {
      projectIdentityMatches: projectId === EXPECTED_FIREBASE_PROJECT_ID,
      authReadable: users.length > 0,
      membershipReadable: true,
      membershipDocumentsPresent: normalized.length > 0,
      activeMembershipsPresent: active.length > 0,
      activeMembershipsLinkedToAuth: linked.length > 0,
      privilegedBootstrapCandidatePresent: privilegedLinked.length > 0,
      activeRoleAssigned: active.every(row => row.currentRole && row.roles.includes(row.currentRole)),
      countriesPresent: active.every(row => row.countries.length > 0),
      scopesPresent: active.every(row => row.scopes && typeof row.scopes === 'object')
    };
    const ok = Object.values(checks).every(Boolean);
    const out = { ...base, ok, status:ok?'EXISTING_ORBIT_PROJECT_RECONCILED_READ_ONLY':'DATA_CONTRACT_FAILURE', classification:ok?null:'DATA_CONTRACT_FAILURE',
      authRead:true, firestoreRead:true, authUserCount:users.length, membershipCount:normalized.length, activeMembershipCount:active.length,
      activeMembershipLinkedToAuthCount:linked.length, privilegedBootstrapCandidateCount:privilegedLinked.length, canonicalRolesObserved:roleNames,
      checks, failedChecks:Object.entries(checks).filter(([,value])=>!value).map(([key])=>key),
      nextStep:ok?'PREPARE_RUNTIME_WITH_EXISTING_IDENTITY_NO_RULES_CHANGE':'REPAIR_MEMBERSHIP_CONTRACT_WITHOUT_OPERATIONAL_DATA_CHANGES' };
    writeEvidence(out); if (!ok) process.exitCode=41;
  } catch (error) {
    const out = { ...base, ok:false, status:'ENVIRONMENT_FAILURE', classification:'ENVIRONMENT_FAILURE',
      errorCode:text(error && error.code || 'FIREBASE_READ_FAILED'), errorMessageSanitized:text(error && error.message || error).slice(0,240) };
    writeEvidence(out); process.exitCode=41;
  }
}

await prepareExistingProject();
