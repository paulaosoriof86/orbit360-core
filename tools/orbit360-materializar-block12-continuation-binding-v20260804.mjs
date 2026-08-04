#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REL = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs';
const file = path.join(ROOT, REL);
let source = fs.readFileSync(file, 'utf8');
function replaceExact(before, after, code) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`PIPELINE_MECHANISM_FAILURE:${code}`);
  source = source.replace(before, after);
}
replaceExact(
  "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix-v20260804.json';",
  "const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/block12-operational-runtime-lab-rootfix2-v20260804.json';",
  'CONTINUATION_REQUEST_PATH'
);
replaceExact(
  "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix-request-v1' && request.status === 'AUTHORIZED_ROOTFIX' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && request.previousRunId === 30945951133 && request.previousRunStoppedBeforeSecrets === true && request.authorizationRef === lifecycle.authorization.source",
  "request.schemaVersion === 'orbit360-block12-operational-runtime-lab-rootfix2-request-v1' && request.status === 'AUTHORIZED_ROOTFIX_CONTINUATION' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && Array.isArray(request.previousRunIds) && request.previousRunIds.length === 2 && request.previousRunIds[0] === 30945951133 && request.previousRunIds[1] === 30948708843 && request.previousRunsStoppedBeforeSecrets === true && request.authorizationRef === lifecycle.authorization.source",
  'CONTINUATION_REQUEST_ACTIVE'
);
replaceExact(
  "'.github/workflows/orbit360-block12-operational-runtime-lab-rootfix-v20260804.yml'",
  "'.github/workflows/orbit360-block12-operational-runtime-lab-rootfix2-v20260804.yml'",
  'CONTINUATION_REQUIRED_WORKFLOW'
);
fs.writeFileSync(file, source, 'utf8');
for (const token of ['rootfix2-v20260804.json', 'AUTHORIZED_ROOTFIX_CONTINUATION', '30948708843', 'rootfix2-v20260804.yml']) {
  if (!source.includes(token)) throw new Error(`PIPELINE_MECHANISM_FAILURE:CONTINUATION_BINDING_MISSING:${token}`);
}
console.log(JSON.stringify({
  schemaVersion: 'orbit360-block12-continuation-binding-v1',
  status: 'CONTINUATION_BINDING_MATERIALIZED',
  previousRunIds: [30945951133, 30948708843],
  priorRunsStoppedBeforeSecrets: true,
  secretAccess: false,
  firestoreRead: false,
  deployExecuted: false,
  ok: true
}, null, 2));
