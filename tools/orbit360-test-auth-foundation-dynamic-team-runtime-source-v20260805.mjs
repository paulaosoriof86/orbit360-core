#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import { _test as planTest } from './orbit360-auth-foundation-all-team-plan-v20260805.mjs';

const OWNER = 'tools/orbit360-auth-foundation-dynamic-team-runtime-v20260805.mjs';
const STORE = 'orbit360-platform/data/store-firestore-lab.local.js';
const INIT = 'orbit360-platform/core/backend-lab-init.js';
const BRIDGE = 'orbit360-platform/core/backend-lab-advisor-write-bridge.js';
const CATALOG = 'orbit360-platform/core/backend-lab-advisor-catalog.js';
const owner = fs.readFileSync(OWNER, 'utf8');
const store = fs.readFileSync(STORE, 'utf8');
const init = fs.readFileSync(INIT, 'utf8');
const bridge = fs.readFileSync(BRIDGE, 'utf8');
const catalog = fs.readFileSync(CATALOG, 'utf8');

const domains = ['clientes','polizas','vehiculos','recibos','cartera','cobros','comisiones','gestiones','leads'];
const scopes = scope => Object.fromEntries(domains.map(domain => [domain, scope]));
function record(index, role = 'Asesor') {
  const admin = role === 'SuperAdmin';
  return {
    id:`team-${index}`,
    nombre:`Usuario ${index}`,
    email:`user${index}@example.test`,
    roles:[role],
    defaultRole:role,
    activeRole:role,
    countries:['GT'],
    dataScopes:scopes(admin ? 'todos' : 'propios'),
    activo:true,
    estado:'activo'
  };
}
function dynamicValidate(rows) {
  const normalized = rows.map(row => planTest.normalizeTeamRecord(row)).filter(row => row.active);
  const errors = [];
  if (normalized.length < 1) errors.push('ACTIVE_TEAM_EMPTY');
  if (normalized.length > 100) errors.push('ACTIVE_TEAM_EXCEEDS_TECHNICAL_BOUND');
  const ids = normalized.map(row => row.id);
  const emails = normalized.map(row => row.email);
  if (new Set(ids).size !== ids.length) errors.push('TEAM_ID_DUPLICATE');
  if (new Set(emails).size !== emails.length) errors.push('TEAM_EMAIL_DUPLICATE');
  for (const row of normalized) errors.push(...planTest.validateTeamRecord(row));
  return { ok:errors.length === 0, count:normalized.length, errors };
}
const sets = [1,3,5,7,9,10].map(count => {
  const rows = Array.from({length:count}, (_, index) => record(index + 1, index === 0 ? 'SuperAdmin' : 'Asesor'));
  return dynamicValidate(rows);
});
const duplicate = [record(1,'SuperAdmin'), {...record(2),email:'user1@example.test'}];
const incomplete = [record(1,'SuperAdmin'), {...record(2),countries:[]}];

const transactionStart = owner.indexOf('await db.runTransaction(async tx => {', owner.indexOf('async function apply'));
const firstRead = owner.indexOf('memberSnaps.push(await tx.get(ref))', transactionStart);
const secondRead = owner.indexOf('teamSnaps.push(await tx.get(ref))', transactionStart);
const firstWrite = owner.indexOf('tx.set(memberRefs[index]', transactionStart);
const secondWrite = owner.indexOf('tx.set(teamRefs[index]', transactionStart);
const transactionEnd = owner.indexOf('state.applied = true', transactionStart);

const checks = {
  variableCountsPass: sets.every((result, index) => result.ok && result.count === [1,3,5,7,9,10][index]),
  duplicateBlocked: dynamicValidate(duplicate).errors.includes('TEAM_EMAIL_DUPLICATE'),
  incompleteBlocked: dynamicValidate(incomplete).ok === false,
  authoritativeStorePath: store.includes("collectionPath(collection)") && store.includes("`tenantId/${tenantId}/${collection}`") && store.includes("'asesores'") && !/CANONICAL_COLLECTIONS\s*=\s*\[[\s\S]*?'asesores'/.test(store),
  ownerAuthorityExact: owner.includes("collection('tenantId').doc(TENANT).collection('asesores')") && owner.includes("authorityPathClass: 'tenantId/{tenantId}/asesores'"),
  ownerDynamicCount: owner.includes("activeUserCountRule: 'DYNAMIC_FROM_EQUIPO_AUTHORITY'") && owner.includes('activeCount:targets.length') && !/expectedActiveCount\s*:\s*(7|9)/.test(owner),
  noExactSevenOrNineGate: !/EXPECTED\s*=\s*(7|9)/.test(owner) && !/===\s*(7|9)\b/.test(owner) && !/!==\s*(7|9)\b/.test(owner),
  technicalBoundOnly: owner.includes('ORBIT360_MAX_ACTIVE_TEAM_USERS || 100') && owner.includes('ACTIVE_TEAM_EXCEEDS_TECHNICAL_BOUND'),
  aliasesDiagnosticOnly: owner.includes('ALIAS_SOURCES') && owner.includes('legacyAliasesIgnoredAsUsers') && owner.includes('const activeRows = authority.filter'),
  catalogOverlayInactive: !init.includes("loadScriptOnce('core/backend-lab-advisor-write-bridge.js") && bridge.includes("orbitInitialAdvisorMigration') === '1'") && catalog.includes("orbitInitialAdvisorMigration') === '1'"),
  fixedCatalogCountRemoved: !bridge.includes('config.advisors.length !== 7') && !catalog.includes('config.advisors.length !== 7'),
  noPersonHardcode: !/(Paula|Carlos|Samuel|Fernando)/i.test(owner),
  noTemporaryPassword: !/createUser\(\{[^}]*password\s*:/s.test(owner),
  adminSdkBootstrap: owner.includes('auth.createUser({ email:item.normalized.email'),
  readAllBeforeWriteAll: transactionStart >= 0 && firstRead > transactionStart && secondRead > firstRead && firstWrite > secondRead && secondWrite > firstWrite,
  noReadAfterWrite: firstWrite >= 0 && owner.slice(firstWrite, transactionEnd).indexOf('tx.get(') === -1,
  diffIdempotency: owner.includes('function diffPatch') && owner.includes('idempotentDiffWrites:true'),
  dynamicEmails: owner.includes('state.emailsSent.length === state.activeCount') && owner.includes("requestType:'PASSWORD_RESET'"),
  dynamicSessions: owner.includes('checks.length === state.activeCount') && owner.includes('auth.createCustomToken') && owner.includes('auth.verifyIdToken'),
  profileCoverageNonBlocking: !owner.includes("profiles.size === 3 && crmIntegrity") && owner.includes('functionalProfilesVerified:profiles.size'),
  rollbackExact: owner.includes('async function restoreState') && owner.includes('async function rollback') && owner.includes('auth.deleteUser(uid)') && owner.includes('auth.updateUser(uid'),
  crmIntegrity: domains.every(domain => owner.includes(`'${domain}'`)) && owner.includes("'VERIFIED_UNCHANGED'") && owner.includes("'VERIFIED_CHANGED'") && owner.includes("'NOT_POSTVERIFIED'"),
  noHostingRulesReimport: owner.includes('hostingDeploys: 0') && owner.includes('rulesDeploys: 0') && owner.includes('reimports: 0')
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const result = {
  schemaVersion:'orbit360-auth-foundation-dynamic-team-runtime-source-fixtures-v1',
  testedActiveCounts:[1,3,5,7,9,10],
  checks,
  total:Object.keys(checks).length,
  passed:Object.keys(checks).length - failed.length,
  failed:failed.length,
  failedCheckIds:failed,
  operationalCapabilitiesUsed:0,
  containsPII:false,
  containsSecrets:false,
  ok:failed.length === 0
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 41);
