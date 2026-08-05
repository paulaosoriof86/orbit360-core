#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const FUNCTION = 'functions/user-onboarding.js';
const PROJECTION = 'orbit360-platform/core/access-role-session-owner-v20260728.js';
const INDEX = 'orbit360-platform/index.html';

function patch(file, transform) {
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (!after || after === before) return { file, changed:false };
  fs.writeFileSync(file, after, 'utf8');
  return { file, changed:true };
}

const results = [];
results.push(patch(FUNCTION, source => {
  if (!source.includes("require('./user-credential-selfservice')")) {
    const anchor = "const { HttpsError, onCall } = require('firebase-functions/v2/https');";
    if (!source.includes(anchor)) throw new Error('VALIDATOR_STALE:CREDENTIAL_REQUIRE_ANCHOR');
    source = source.replace(anchor, `${anchor}\nconst credentialSelfService = require('./user-credential-selfservice');`);
  }
  source = source.replace(
    "const VALID_OPERATIONS = new Set(['provision', 'sync', 'deactivate', 'reactivate', 'mark_invitation_sent']);",
    "const VALID_OPERATIONS = new Set(['provision', 'sync', 'deactivate', 'reactivate', 'mark_invitation_sent', 'set_temporary_password', 'complete_password_change']);"
  );
  const mismatch = `    if (currentEmail && currentEmail !== advisor.email) {\n      throw new HttpsError('failed-precondition', 'El correo configurado no coincide con la identidad vinculada.');\n    }\n    return { user, created: false };`;
  const mismatchReplacement = `    const emailChanged = !!(currentEmail && currentEmail !== advisor.email);\n    if (emailChanged && operation !== 'sync') {\n      throw new HttpsError('failed-precondition', 'El correo configurado no coincide con la identidad vinculada.');\n    }\n    return { user, created: false, emailChanged };`;
  if (source.includes(mismatch)) source = source.replace(mismatch, mismatchReplacement);
  if (!source.includes('emailChanged = !!(currentEmail')) throw new Error('VALIDATOR_STALE:EMAIL_SYNC_PATCH');

  const executeAnchor = `  if (!tenantId) throw new HttpsError('invalid-argument', 'Tenant requerido.');\n  if (!VALID_OPERATIONS.has(operation)) throw new HttpsError('invalid-argument', 'Operación de acceso inválida.');\n  const actor = await authorize(request, tenantId, operation);`;
  const executeReplacement = `  if (!tenantId) throw new HttpsError('invalid-argument', 'Tenant requerido.');\n  if (!VALID_OPERATIONS.has(operation)) throw new HttpsError('invalid-argument', 'Operación de acceso inválida.');\n  if (operation === 'complete_password_change') {\n    return credentialSelfService.completePasswordChange({ request, tenantId, db, FieldValue, HttpsError, sha, text, locateAdvisor });\n  }\n  const actor = await authorize(request, tenantId, operation);`;
  if (source.includes(executeAnchor)) source = source.replace(executeAnchor, executeReplacement);
  if (!source.includes("operation === 'complete_password_change'")) throw new Error('VALIDATOR_STALE:COMPLETE_PASSWORD_PATCH');

  const desiredAnchor = `  const desired = sanitizeAdvisor(input.advisor || located.data || {}, advisorId);\n  const reason = text(input.reason, 500);`;
  const desiredReplacement = `  const desired = sanitizeAdvisor(input.advisor || located.data || {}, advisorId);\n  if (operation === 'set_temporary_password') {\n    return credentialSelfService.setTemporaryPassword({ request, tenantId, advisorId, advisor: desired, currentAdvisor: located.data || {}, located, actor, db, auth, FieldValue, HttpsError, sha, text, normalizeEmail });\n  }\n  const reason = text(input.reason, 500);`;
  if (source.includes(desiredAnchor)) source = source.replace(desiredAnchor, desiredReplacement);
  if (!source.includes("operation === 'set_temporary_password'")) throw new Error('VALIDATOR_STALE:TEMP_PASSWORD_PATCH');

  source = source.replace(
    "const authBefore = user ? { disabled: !!user.disabled, displayName: user.displayName || '' } : null;",
    "const authBefore = user ? { disabled: !!user.disabled, displayName: user.displayName || '', email: user.email || '' } : null;"
  );
  const updateAnchor = `  if (user && (user.disabled !== desiredDisabled || text(user.displayName, 180) !== desired.nombre)) {\n    await auth.updateUser(user.uid, { disabled: desiredDisabled, displayName: desired.nombre });\n    authChanged = true;\n  }`;
  const updateReplacement = `  if (user && (user.disabled !== desiredDisabled || text(user.displayName, 180) !== desired.nombre || authResolution.emailChanged === true)) {\n    const authPatch = { disabled: desiredDisabled, displayName: desired.nombre };\n    if (authResolution.emailChanged === true) authPatch.email = desired.email;\n    await auth.updateUser(user.uid, authPatch);\n    authChanged = true;\n  }`;
  if (source.includes(updateAnchor)) source = source.replace(updateAnchor, updateReplacement);
  if (!source.includes('authResolution.emailChanged === true')) throw new Error('VALIDATOR_STALE:AUTH_EMAIL_UPDATE_PATCH');

  const rollbackAnchor = `    await auth.updateUser(user.uid, {\n      disabled: authBefore.disabled,\n      displayName: authBefore.displayName || undefined\n    });`;
  const rollbackReplacement = `    await auth.updateUser(user.uid, {\n      disabled: authBefore.disabled,\n      displayName: authBefore.displayName || undefined,\n      email: authBefore.email || undefined\n    });`;
  if (source.includes(rollbackAnchor)) source = source.replace(rollbackAnchor, rollbackReplacement);
  if (!source.includes('email: authBefore.email || undefined')) throw new Error('VALIDATOR_STALE:AUTH_EMAIL_ROLLBACK_PATCH');
  return source;
}));

results.push(patch(PROJECTION, source => {
  const anchor = `      modulesRestricted: unique(data.modulesRestricted || data.modulosRestringidos || []),\n      status: text(data.status || data.estado).toLowerCase(),`;
  const replacement = `      modulesRestricted: unique(data.modulesRestricted || data.modulosRestringidos || []),\n      mustChangePassword: data.mustChangePassword === true,\n      credentialState: text(data.credentialState || data.estadoCredencial).toLowerCase(),\n      status: text(data.status || data.estado).toLowerCase(),`;
  if (source.includes(anchor)) source = source.replace(anchor, replacement);
  if (!source.includes('mustChangePassword: data.mustChangePassword === true')) throw new Error('VALIDATOR_STALE:MEMBERSHIP_CREDENTIAL_PROJECTION');
  const projectionAnchor = `      modulesRestricted: unique(source.modulesRestricted || []),\n      productReadOnly: true`;
  const projectionReplacement = `      modulesRestricted: unique(source.modulesRestricted || []),\n      mustChangePassword: source.mustChangePassword === true,\n      credentialState: text(source.credentialState).toLowerCase(),\n      productReadOnly: true`;
  if (source.includes(projectionAnchor)) source = source.replace(projectionAnchor, projectionReplacement);
  if (!source.includes('mustChangePassword: source.mustChangePassword === true')) throw new Error('VALIDATOR_STALE:PRODUCT_CREDENTIAL_PROJECTION');
  return source;
}));

results.push(patch(INDEX, source => {
  const coreAnchor = '<script src="core/auth.js?v1295-labfix-20260703"></script>';
  const coreScripts = `${coreAnchor}<script src="core/user-credential-selfservice-v20260805.js?v=20260805-1"></script><script src="core/auth-password-change-v20260805.js?v=20260805-1"></script>`;
  if (!source.includes('core/user-credential-selfservice-v20260805.js')) {
    if (!source.includes(coreAnchor)) throw new Error('VALIDATOR_STALE:INDEX_AUTH_SCRIPT_ANCHOR');
    source = source.replace(coreAnchor, coreScripts);
  }
  const teamAnchor = '<script src="modules/equipo.js?v1359"></script>';
  const teamScripts = `${teamAnchor}<script src="modules/equipo-credential-admin-v20260805-bridge.js?v=20260805-1"></script>`;
  if (!source.includes('modules/equipo-credential-admin-v20260805-bridge.js')) {
    if (!source.includes(teamAnchor)) throw new Error('VALIDATOR_STALE:INDEX_TEAM_SCRIPT_ANCHOR');
    source = source.replace(teamAnchor, teamScripts);
  }
  return source;
}));

console.log(JSON.stringify({
  schemaVersion:'orbit360-selfmanaged-credentials-sourcefix-v1',
  results,
  operations:['sync_email_name','set_temporary_password','complete_password_change'],
  currentPasswordReadable:false,
  forceChangeSupported:true,
  ok:true
}, null, 2));
