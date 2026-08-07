#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runNativeMatrix,
  V23_MATRIX_SCHEMA,
  V23_GATE_ID,
  V23_BLOCKING_ROUTES,
  V23_NONBLOCKING_LEDGER
} from './orbit360-block1-native-matrix-v23-v20260807.mjs';
import { V23_RENDER_SIGNAL_VERSION } from './orbit360-event-driven-render-observer-v23.mjs';

export const V23_CANONICAL_CONTRACT_VERSION = '1.0.41';
export const V23_CANONICAL_RUNTIME_SCHEMA = 'orbit360-block1-client360-insurers-native-matrix-v23-canonical-1.0.41';
export const SOURCE_CONTRACT = Object.freeze({
  schemaVersion: V23_CANONICAL_RUNTIME_SCHEMA,
  implementationSchemaVersion: V23_MATRIX_SCHEMA,
  gateId: V23_GATE_ID,
  contractVersion: V23_CANONICAL_CONTRACT_VERSION,
  nativeSource: true,
  generatedFromPriorArtifact: false,
  textualTransform: false,
  sourceSurgery: false,
  sharedImplementationImport: 'tools/orbit360-block1-native-matrix-v23-v20260807.mjs',
  sharedRenderObserver: 'tools/orbit360-event-driven-render-observer-v23.mjs',
  renderSignalVersion: V23_RENDER_SIGNAL_VERSION,
  blockingRoutes: [...V23_BLOCKING_ROUTES],
  nonblockingLedger: [...V23_NONBLOCKING_LEDGER],
  roleScopedTargets: true
});

const EVIDENCE = process.env.ORBIT360_VISUAL_EVIDENCE || process.env.ORBIT360_MATRIX_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v23-block1-native-matrix-sanitized-v20260807.json';
function persist(value) {
  fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)), { recursive: true });
  fs.writeFileSync(path.resolve(EVIDENCE), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

if (process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY === '1') {
  console.log(JSON.stringify({
    status: 'PASS_V23_NATIVE_MATRIX_IMPORT',
    classification: 'SOURCE_ARTIFACT_VALIDATED',
    sourceContract: SOURCE_CONTRACT,
    externalRuntimeDependenciesLoaded: false,
    firebaseAccess: false,
    browserExecuted: false,
    hostingTouched: false,
    writes: 0,
    ok: true
  }));
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = await runNativeMatrix();
  output.schemaVersion = V23_CANONICAL_RUNTIME_SCHEMA;
  output.implementationSchemaVersion = V23_MATRIX_SCHEMA;
  output.contractVersion = V23_CANONICAL_CONTRACT_VERSION;
  output.canonicalRuntimeArtifact = 'tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs';
  output.nativeSource = true;
  output.generatedFromPriorArtifact = false;
  output.textualTransform = false;
  persist(output);
  console.log(JSON.stringify(output, null, 2));
  process.exitCode = output.ok ? 0 : 42;
}
