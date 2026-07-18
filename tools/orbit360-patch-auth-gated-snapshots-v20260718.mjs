#!/usr/bin/env node
import fs from 'node:fs';

const target = 'orbit360-platform/data/store-firestore-lab.local.js';
let source = fs.readFileSync(target, 'utf8');

function replaceExact(label, from, to) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}_MATCH_COUNT:${count}`);
  source = source.replace(from, to);
}

replaceExact(
  'STATE_AUTH_GATE_MARKER',
  "    auth: null,\n    noFallback: true,",
  "    auth: null,\n    authGatedSnapshots: true,\n    noFallback: true,"
);

replaceExact(
  'INIT_WAITING_AUTH',
  "  function init(){\n    state.status = state.snapshotAttached ? 'ready' : 'waiting-firestore';\n    return api;\n  }",
  "  function init(){\n    var user = canonicalAuthUser();\n    state.status = state.snapshotAttached ? 'ready' : (user ? 'waiting-firestore' : 'waiting-auth');\n    return api;\n  }"
);

replaceExact(
  'ATTACH_CANONICAL_AUTH',
  "  function attachSnapshots(){\n    if (attachStarted) return state.snapshotAttached;\n    attachStarted = true;\n\n    var database = db();",
  "  function canonicalAuthUser(){\n    var user = updateAuthState();\n    var email = String(user && user.email || '').toLowerCase();\n    var uid = String(user && user.uid || '');\n    if (!user || email !== EXPECTED_EMAIL.toLowerCase() || (EXPECTED_UID && uid !== EXPECTED_UID)) return null;\n    return user;\n  }\n\n  function attachSnapshots(){\n    var user = canonicalAuthUser();\n    if (!user) {\n      state.status = 'waiting-auth';\n      state.snapshotAttached = false;\n      state.snapshotAttachedCount = 0;\n      return false;\n    }\n    if (attachStarted) return state.snapshotAttached;\n    attachStarted = true;\n\n    var database = db();"
);

replaceExact(
  'API_AUTH_GATE_MARKER',
  "    __firestoreLabExplicit: true\n  };",
  "    __firestoreLabExplicit: true,\n    __authGatedSnapshots: true\n  };"
);

replaceExact(
  'BACKEND_AUTH_GATE_MARKER',
  "    attachLabSnapshots: attachSnapshots,\n    detachLabSnapshots: detachSnapshots,",
  "    attachLabSnapshots: attachSnapshots,\n    detachLabSnapshots: detachSnapshots,\n    authGatedSnapshots: true,"
);

replaceExact(
  'REMOVE_PREAUTH_AUTO_ATTACH',
  "  state.status = 'installed';\n  updateAuthState();\n\n  setTimeout(attachSnapshots, 0);\n  setTimeout(attachSnapshots, 1200);\n  setTimeout(attachSnapshots, 3500);\n\n  log('Store Firestore LAB v1.74 instalado. Tenant:', tenantId);",
  "  state.status = canonicalAuthUser() ? 'waiting-firestore' : 'waiting-auth';\n\n  log('Store Firestore LAB v1.74 instalado. Tenant:', tenantId);"
);

const forbidden = [
  'setTimeout(attachSnapshots, 0)',
  'setTimeout(attachSnapshots, 1200)',
  'setTimeout(attachSnapshots, 3500)'
];
for (const token of forbidden) {
  if (source.includes(token)) throw new Error(`PREAUTH_ATTACH_REMAINS:${token}`);
}

const required = [
  "state.status = 'waiting-auth'",
  'function canonicalAuthUser()',
  'email !== EXPECTED_EMAIL.toLowerCase()',
  'uid !== EXPECTED_UID',
  '__authGatedSnapshots: true',
  'authGatedSnapshots: true'
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`AUTH_GATE_TOKEN_MISSING:${token}`);
}

fs.writeFileSync(target, source, 'utf8');
console.log(JSON.stringify({
  ok: true,
  target,
  classification: ['SECURITY_FAILURE', 'PIPELINE_MECHANISM_FAILURE'],
  protectedApiPreserved: ['all','get','where','find','insert','update','remove','on','_emit','pref','setPref','init','reseed','raw','_attachSnapshots','_detachSnapshots'],
  preAuthSnapshotAttempts: 0
}, null, 2));
