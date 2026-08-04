#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'tools/orbit360-block12-operational-runtime-lab-v20260804.mjs');
let source = fs.readFileSync(file, 'utf8');
function replaceExact(before, after, code) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`PIPELINE_MECHANISM_FAILURE:${code}`);
  source = source.replace(before, () => after);
}
replaceExact(
  "        firebaseApps: window.firebase && Array.isArray(firebase.apps) ? firebase.apps.length : -1,\n        hasOrbit: !!window.Orbit,",
  "        firebaseApps: window.firebase && Array.isArray(firebase.apps) ? firebase.apps.length : -1,\n        callableSdkReady: !!(window.firebase && typeof firebase.functions === 'function'),\n        hasOrbit: !!window.Orbit,",
  'CALLABLE_DIAGNOSTIC'
);
replaceExact(
  "    await page.waitForFunction(() => window.firebase && Array.isArray(firebase.apps) && firebase.apps.length > 0, null, { timeout: 30000 });\n    mark('FIREBASE_APP_READY', await diagnostics());",
  "    await page.waitForFunction(() => window.firebase && Array.isArray(firebase.apps) && firebase.apps.length > 0, null, { timeout: 30000 });\n    mark('FIREBASE_APP_READY', await diagnostics());\n    await page.waitForFunction(() => window.firebase && typeof firebase.functions === 'function', null, { timeout: 30000 });\n    mark('CALLABLE_SDK_READY', await diagnostics());",
  'CALLABLE_READY_WAIT'
);
fs.writeFileSync(file, source, 'utf8');
for (const token of ['callableSdkReady', "typeof firebase.functions === 'function'", "mark('CALLABLE_SDK_READY'"]) {
  if (!source.includes(token)) throw new Error(`PIPELINE_MECHANISM_FAILURE:CALLABLE_READINESS_ASSERTION:${token}`);
}
console.log(JSON.stringify({
  schemaVersion:'orbit360-block12-callable-readiness-materialization-v1',
  status:'CALLABLE_SDK_READINESS_MATERIALIZED',
  previousRuntimeRunId:30960978418,
  previousFailure:'OP-001',
  functionsCompatSdkRequired:true,
  callableSdkWaitTimeoutMs:30000,
  secretAccess:false,
  firestoreRead:false,
  deployExecuted:false,
  ok:true
},null,2));
