#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OLD_REQUEST = '.github/orbit360-requests/block12-operational-runtime-lab-rootfix9-resume-v20260804.json';
const NEW_REQUEST = '.github/orbit360-requests/block12-operational-runtime-layoutfree-lab-v20260804.json';
const OLD_WORKFLOW = '.github/workflows/orbit360-block12-visual-reactivation-lab-v20260804.yml';
const NEW_WORKFLOW = '.github/workflows/orbit360-block12-visual-layoutfree-reactivation-lab-v20260804.yml';
const FILES = {
  lifecycle: 'tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json',
  engine: 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-layoutfree-lab-v20260804.mjs',
  materializer: 'tools/orbit360-materializar-block12-layoutfree-visual-contract-v20260804.mjs'
};
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(ROOT, rel), value, 'utf8');
const replaceExactlyOneOrAlready = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count === 1) return source.replace(before, after);
  if (count === 0 && source.includes(after)) return source;
  throw new Error(`PIPELINE_MECHANISM_FAILURE:${label}_EXPECTED_1_FOUND_${count}`);
};

const lifecycle = JSON.parse(read(FILES.lifecycle));
if (lifecycle.gateId !== 'block12-operational-runtime-lab-v20260804' || lifecycle.gateContractVersion !== '12.0.11') {
  throw new Error('VALIDATOR_STALE:LIFECYCLE_GATE_OR_VERSION_UNEXPECTED');
}
lifecycle.authorization = lifecycle.authorization || {};
lifecycle.authorization.request = NEW_REQUEST;
write(FILES.lifecycle, JSON.stringify(lifecycle, null, 2) + '\n');

let engine = read(FILES.engine);
engine = replaceExactlyOneOrAlready(
  engine,
  `const REQUEST = process.env.ORBIT360_REQUEST_FILE || '${OLD_REQUEST}';`,
  `const REQUEST = process.env.ORBIT360_REQUEST_FILE || '${NEW_REQUEST}';`,
  'ENGINE_REQUEST_PATH'
);
engine = replaceExactlyOneOrAlready(
  engine,
  `const WORKFLOW = '${OLD_WORKFLOW}';`,
  `const WORKFLOW = '${NEW_WORKFLOW}';`,
  'ENGINE_WORKFLOW_PATH'
);
write(FILES.engine, engine);

let materializer = read(FILES.materializer);
materializer = replaceExactlyOneOrAlready(
  materializer,
  `const WORKFLOW = '${OLD_WORKFLOW}';`,
  `const WORKFLOW = '${NEW_WORKFLOW}';`,
  'MATERIALIZER_WORKFLOW_PATH'
);
write(FILES.materializer, materializer);

const result = {
  schemaVersion: 'orbit360-block12-layoutfree-reference-preparation-v1',
  status: 'LAYOUTFREE_REFERENCES_PREPARED',
  gateId: 'block12-operational-runtime-lab-v20260804',
  contractVersion: '12.0.11',
  request: NEW_REQUEST,
  workflow: NEW_WORKFLOW,
  lifecycleRequestAligned: JSON.parse(read(FILES.lifecycle)).authorization.request === NEW_REQUEST,
  engineRequestAligned: read(FILES.engine).includes(`const REQUEST = process.env.ORBIT360_REQUEST_FILE || '${NEW_REQUEST}';`),
  engineWorkflowAligned: read(FILES.engine).includes(`const WORKFLOW = '${NEW_WORKFLOW}';`),
  materializerWorkflowAligned: read(FILES.materializer).includes(`const WORKFLOW = '${NEW_WORKFLOW}';`),
  secretsRead: false,
  firebaseCommandsExecuted: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  productionTouched: false,
  ok: true
};
if (!result.lifecycleRequestAligned || !result.engineRequestAligned || !result.engineWorkflowAligned || !result.materializerWorkflowAligned) {
  throw new Error('PIPELINE_MECHANISM_FAILURE:LAYOUTFREE_REFERENCES_NOT_ALIGNED');
}
console.log(JSON.stringify(result, null, 2));
