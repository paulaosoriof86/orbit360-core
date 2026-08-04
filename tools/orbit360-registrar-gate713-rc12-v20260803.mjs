#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'tools/orbit360-validar-gate-contracts-v20260717.mjs');
const GATE_ID = 'block7.13-rc12-membership-rootcause-cumulative-closure-v20260803';
const gateEntry = `  "${GATE_ID}":{contractVersion:"7.13.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-rc12-rootcause-cumulative-closure-v20260803.json",engine:"tools/orbit360-validar-gate-contracts-engine-rc12-rootcause-cumulative-closure-v20260803.mjs"},\n`;
const phaseEntry = `  "GRAVICENTRA_RC12_ROOTCAUSE_CUMULATIVE_AUDIT_CLOSURE":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":true,"browser":true,"deploy":true,"functionsDeploy":false,"rulesDeploy":false,"production":true},\n`;

let source = fs.readFileSync(FILE, 'utf8');
if (!source.includes(GATE_ID)) {
  const anchor = '  "block7-gravicentra-insurance-rc1-predeploy-readonly-v20260803":{contractVersion:"7.12.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-gravicentra-rc1-predeploy-readonly-v20260803.json",engine:"tools/orbit360-validar-gate-contracts-engine-gravicentra-rc1-predeploy-readonly-v20260803.mjs"},\n';
  const at = source.indexOf(anchor);
  if (at < 0 || source.lastIndexOf(anchor) !== at) throw new Error('GATE_CONFIG_ANCHOR_NOT_UNIQUE');
  source = source.slice(0, at + anchor.length) + gateEntry + source.slice(at + anchor.length);
}
if (!source.includes('GRAVICENTRA_RC12_ROOTCAUSE_CUMULATIVE_AUDIT_CLOSURE')) {
  const anchor = '  "RECEIPTS_PORTFOLIO_STATIC_QUALIFICATION":ZERO,\n';
  const at = source.indexOf(anchor);
  if (at < 0 || source.lastIndexOf(anchor) !== at) throw new Error('PHASE_PROFILE_ANCHOR_NOT_UNIQUE');
  source = source.slice(0, at + anchor.length) + phaseEntry + source.slice(at + anchor.length);
}
fs.writeFileSync(FILE, source, 'utf8');

const checks = {
  gateRegistered: source.includes(gateEntry.trim()),
  phaseRegistered: source.includes(phaseEntry.trim()),
  gateSingle: source.split(GATE_ID).length - 1 === 1,
  phaseSingle: source.split('GRAVICENTRA_RC12_ROOTCAUSE_CUMULATIVE_AUDIT_CLOSURE').length - 1 === 1
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ schemaVersion:'orbit360-register-gate713-rc12-v1', status:ok?'PASS':'FAIL', checks, secrets:false, firestoreRead:false, writes:false, deploy:false, production:false }, null, 2));
process.exit(ok ? 0 : 41);
