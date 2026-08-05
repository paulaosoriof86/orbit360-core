#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import { buildFoundationPlan } from './orbit360-auth-foundation-all-team-plan-v20260805.mjs';

const OWNER = 'tools/orbit360-auth-foundation-all-team-runtime-v20260805.mjs';
const source = fs.readFileSync(OWNER, 'utf8');
const domains = ['clientes','polizas','vehiculos','recibos','cartera','cobros','comisiones','gestiones','leads'];
const scopes = scope => Object.fromEntries(domains.map(domain => [domain, scope]));
const teamRecords = [
  { id:'u01', nombre:'Dirección 1', email:'u01@example.test', roles:['SuperAdmin','Asesor'], defaultRole:'SuperAdmin', activeRole:'SuperAdmin', countries:['GT','CO'], dataScopes:scopes('todos') },
  { id:'u02', nombre:'Operativo 1', email:'u02@example.test', roles:['Operativo','Asesor'], defaultRole:'Operativo', activeRole:'Operativo', countries:['GT'], dataScopes:scopes('todos') },
  { id:'u03', nombre:'Asesor 1', email:'u03@example.test', roles:['Asesor'], defaultRole:'Asesor', activeRole:'Asesor', countries:['GT'], dataScopes:scopes('propios') },
  { id:'u04', nombre:'Asesor 2', email:'u04@example.test', roles:['Asesor'], defaultRole:'Asesor', activeRole:'Asesor', countries:['GT'], dataScopes:scopes('propios') },
  { id:'u05', nombre:'Asesor 3', email:'u05@example.test', roles:['Asesor'], defaultRole:'Asesor', activeRole:'Asesor', countries:['CO'], dataScopes:scopes('propios') },
  { id:'u06', nombre:'Finanzas 1', email:'u06@example.test', roles:['Finanzas'], defaultRole:'Finanzas', activeRole:'Finanzas', countries:['GT','CO'], dataScopes:scopes('equipo') },
  { id:'u07', nombre:'Asistente 1', email:'u07@example.test', roles:['Asistente'], defaultRole:'Asistente', activeRole:'Asistente', countries:['GT'], dataScopes:scopes('ninguno') }
];
const authUsers = [
  { uid:'uid01', email:'u01@example.test', emailVerified:true },
  { uid:'uid03', email:'u03@example.test', emailVerified:false }
];
const memberships = [{ uid:'uid01', tenantId:'alianzas-soluciones', status:'active' }];
const plan = buildFoundationPlan({ tenantId:'alianzas-soluciones', teamRecords, authUsers, memberships, expectedActiveCount:7 });

const transactionStart = source.indexOf('await db.runTransaction(async tx => {', source.indexOf('async function apply'));
const memberRead = source.indexOf('memberSnaps.push(await tx.get(ref))', transactionStart);
const teamRead = source.indexOf('teamSnaps.push(await tx.get(ref))', transactionStart);
const firstWrite = source.indexOf('tx.set(memberRefs[index]', transactionStart);
const secondWrite = source.indexOf('tx.set(teamRefs[index]', transactionStart);
const checks = {
  planSevenUsers: plan.ok === true && plan.activeTeamCount === 7 && plan.allCurrentUsersCovered === true,
  planThreeProfiles: plan.functionalProfilesCovered === 3,
  planMixedExistingMissing: plan.createsPlanned === 5 && plan.linksPlanned === 2 && plan.membershipsPlanned === 7 && plan.passwordEmailsPlanned === 7,
  dynamicExpectedCount: source.includes('ORBIT360_EXPECTED_TEAM_USERS || 7'),
  dynamicRosterSources: ['canonical','legacy_tenantId_asesores','legacy_tenants_asesores'].every(token => source.includes(token)),
  exactSevenGuards: source.includes('targets.length === EXPECTED') && source.includes('new Set(state.targets.map(item => item.uid)).size !== EXPECTED'),
  noPersonHardcode: !/(Paula|Carlos|Samuel|Fernando)/i.test(source),
  noTemporaryPassword: !/createUser\(\{[^}]*password\s*:/s.test(source),
  adminSdkBootstrap: source.includes('auth.createUser({ email: item.normalized.email') && !source.includes('orbit360ProvisionTeamAccess'),
  emailChannel: source.includes('accounts:sendOobCode') && source.includes("requestType: 'PASSWORD_RESET'") && source.includes('emailsSent.length === EXPECTED'),
  sessionChannel: source.includes('auth.createCustomToken') && source.includes('accounts:signInWithCustomToken') && source.includes('auth.verifyIdToken'),
  readAllBeforeWriteAll: transactionStart >= 0 && memberRead > transactionStart && teamRead > memberRead && firstWrite > teamRead && secondWrite > firstWrite,
  noReadAfterWrite: firstWrite >= 0 && source.slice(firstWrite, source.indexOf('state.applied = true', firstWrite)).indexOf('tx.get(') === -1,
  teamPatchAllowlist: ['authUid','accessProvisioned','accessState','onboardingState','invitacionEstado','membershipStatus','accessErrorCode','accessLastAttemptAt','accessOnboardingVersion'].every(token => source.includes(`'${token}'`)),
  crmSnapshots: domains.every(token => source.includes(`['${token}']`) || source.includes(`'${token}'`)),
  rollbackOwner: source.includes('async function restoreState') && source.includes('async function rollback') && source.includes('auth.deleteUser(uid)'),
  triStateIntegrity: source.includes("'VERIFIED_UNCHANGED'") && source.includes("'VERIFIED_CHANGED'") && source.includes("'NOT_POSTVERIFIED'"),
  noHostingRulesReimport: source.includes('hostingDeploys: 0') && source.includes('rulesDeploys: 0') && source.includes('reimports: 0')
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const result = {
  schemaVersion:'orbit360-auth-foundation-all-team-runtime-source-fixtures-v1',
  checks,
  total:Object.keys(checks).length,
  passed:Object.keys(checks).length - failed.length,
  failed:failed.length,
  failedCheckIds:failed,
  usersCovered:plan.activeTeamCount || 0,
  functionalProfilesCovered:plan.functionalProfilesCovered || 0,
  operationalCapabilitiesUsed:0,
  containsPII:false,
  containsSecrets:false,
  ok:failed.length === 0
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 41);
