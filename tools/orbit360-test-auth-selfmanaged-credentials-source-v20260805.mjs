#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const config = json('orbit360-platform/data/tenant-config/alianzas-soluciones.auth-identity-overrides-v20260805.json');
const helper = read('functions/user-credential-selfservice.js');
const functionOwner = read('functions/user-onboarding.js');
const sourcefix = read('tools/orbit360-apply-selfmanaged-credentials-sourcefix-v20260805.mjs');
const adapter = read('orbit360-platform/core/user-credential-selfservice-v20260805.js');
const forced = read('orbit360-platform/core/auth-password-change-v20260805.js');
const equipo = read('orbit360-platform/modules/equipo-credential-admin-v20260805-bridge.js');
const runtime = read('tools/orbit360-auth-selfmanaged-credentials-runtime-v20260805.mjs');
const containment = read('tools/orbit360-auth-selfmanaged-credentials-containment-v20260805.mjs');
const prior = json('tools/orbit360-validator-lifecycle-contract-auth-foundation-roster-resolution-and-runtime-v20260805.json');

const expected = new Map([
  ['Fernando Arias','fernando.arias@aysseguros.com'],
  ['Nicole Castro','nicole.castro@aysseguros.com'],
  ['Braulio Hernández','braulio.hernandez@aysseguros.com'],
  ['Johanna Salgado','johanna.salgado@aysseguros.com']
]);
const actual = new Map(config.identityOverrides.map(item => [item.matchName,item.email]));
const passwordPattern = name => {
  const first = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/\s+/)[0].replace(/[^A-Za-z]/g,'');
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() + '123*';
};
const strength = value => value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
const patternSamples = ['Paula Osorio','Carlos Castro','Samuel Daza','Fernando Arias','Nicole Castro','Braulio Hernández','Johanna Salgado'].map(passwordPattern);

const checks = {
  tenantConfigExactFour: config.tenantId === 'alianzas-soluciones' && config.identityOverrides.length === 4,
  confirmedEmailsExact: [...expected.entries()].every(([name,email]) => actual.get(name) === email),
  braulioCorrectSpelling: actual.get('Braulio Hernández') === 'braulio.hernandez@aysseguros.com' && !read('orbit360-platform/data/tenant-config/alianzas-soluciones.auth-identity-overrides-v20260805.json').includes('hernandex'),
  countriesExact: config.identityOverrides.every(item => Array.isArray(item.countries) && item.countries.length === 1) && config.identityOverrides.find(item => item.matchName === 'Nicole Castro').countries[0] === 'CO',
  configContainsNoPasswords: config.containsPasswords === false && !/"password"\s*:\s*"/i.test(read('orbit360-platform/data/tenant-config/alianzas-soluciones.auth-identity-overrides-v20260805.json')),
  policyFirstNamePattern: config.temporaryPasswordPolicy.strategy === 'FIRST_NAME_123_STAR' && config.temporaryPasswordPolicy.forceChangeOnFirstLogin === true,
  patternSamplesStrong: patternSamples.every(strength),
  patternNotPersistedInEvidence: runtime.includes('plaintextPasswordsPersisted:0') && runtime.includes('passwordHashesPersisted:0') && runtime.includes('containsTemporaryPassword:false'),
  backendAdminReset: helper.includes('setTemporaryPassword') && helper.includes('mustChangePassword: true') && helper.includes("credentialState: 'temporary'"),
  backendSelfCompletion: helper.includes('completePasswordChange') && helper.includes('mustChangePassword: false') && helper.includes("credentialState: 'active'"),
  backendNoPasswordReturn: helper.includes('containsPassword: false') && helper.includes('containsTemporaryPassword: false'),
  functionOperationsPatchedBySourcefix: sourcefix.includes('set_temporary_password') && sourcefix.includes('complete_password_change') && sourcefix.includes('authResolution.emailChanged'),
  authEmailRollbackSupported: sourcefix.includes('email: authBefore.email || undefined'),
  projectionPatched: sourcefix.includes('mustChangePassword: data.mustChangePassword === true') && sourcefix.includes('credentialState: text(data.credentialState'),
  indexOwnersLoaded: sourcefix.includes('user-credential-selfservice-v20260805.js') && sourcefix.includes('auth-password-change-v20260805.js') && sourcefix.includes('equipo-credential-admin-v20260805-bridge.js'),
  frontendAdminReset: adapter.includes('setTemporaryPassword') && equipo.includes('Asignar contraseña temporal'),
  frontendOwnChange: forced.includes('updatePassword(password)') && forced.includes('completePasswordChange()'),
  currentPasswordNeverReadable: equipo.includes('La contraseña actual nunca se muestra') && runtime.includes('currentPasswordReadable:false'),
  dynamicActiveUsers: runtime.includes('activeRows.length') && runtime.includes('dynamic.activeCount') && !/expectedActiveCount\s*:\s*(7|9)/.test(runtime),
  passwordLoginVerified: runtime.includes('accounts:signInWithPassword') && runtime.includes('passwordLoginsVerified'),
  crmIntegrityProtected: runtime.includes("'VERIFIED_UNCHANGED'") && ['clientes','polizas','vehiculos','recibos','cartera','cobros','comisiones','gestiones','leads'].every(name => runtime.includes(`'${name}'`)),
  containmentAvailable: containment.includes("status:'blocked_recovery'") && containment.includes('passwordRollbackExact:false'),
  priorRuntimeConsumed: prior.status === 'AUTH_FOUNDATION_DYNAMIC_TEAM_RUNTIME_CONSUMED_STOP_RETRY' && prior.authorization.consumed === true && prior.authorization.allowedExecutions === 0 && prior.authorization.replayAllowed === false,
  protectedFunctionSingleOwner: functionOwner.includes('exports.orbit360ProvisionTeamAccess') && !helper.includes('exports.')
};
const failed = Object.entries(checks).filter(([,ok]) => !ok).map(([id]) => id);
const result = {
  schemaVersion:'orbit360-auth-selfmanaged-credentials-source-fixtures-v1',
  checks,
  total:Object.keys(checks).length,
  passed:Object.keys(checks).length - failed.length,
  failed:failed.length,
  failedCheckIds:failed,
  usersInPatternFixture:patternSamples.length,
  identityOverrides:config.identityOverrides.length,
  operationalCapabilitiesUsed:0,
  containsPasswords:false,
  containsSecrets:false,
  ok:failed.length === 0
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 41);
