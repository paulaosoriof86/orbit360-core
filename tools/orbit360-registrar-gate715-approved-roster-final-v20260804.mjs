#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const FILE = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const gateLine = '  "block7.15-rc12-approved-roster-final-go-live-v20260804":{contractVersion:"7.15.0",lifecycle:"tools/orbit360-validator-lifecycle-contract-rc12-approved-roster-final-go-live-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-rc12-approved-roster-final-go-live-v20260804.mjs"},';
const phaseLine = '  "GRAVICENTRA_RC12_APPROVED_ROSTER_FINAL_GO_LIVE":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":true,"browser":true,"deploy":true,"functionsDeploy":false,"rulesDeploy":false,"production":true},';

let source = fs.readFileSync(FILE, 'utf8');
if (!source.includes(gateLine)) {
  const marker = '  "block8-vehicles-static-v20260730":';
  if (!source.includes(marker)) throw new Error('GATE715_INSERT_MARKER_NOT_FOUND');
  source = source.replace(marker, `${gateLine}\n${marker}`);
}
if (!source.includes(phaseLine)) {
  const marker = '  "M5_LAB_HOSTING_DELIVERY":';
  if (!source.includes(marker)) throw new Error('PHASE715_INSERT_MARKER_NOT_FOUND');
  source = source.replace(marker, `${phaseLine}\n${marker}`);
}
fs.writeFileSync(FILE, source, 'utf8');
const ok = source.includes(gateLine) && source.includes(phaseLine);
console.log(JSON.stringify({
  schemaVersion: 'orbit360-register-gate715-v1',
  gateRegistered: source.includes(gateLine),
  phaseRegistered: source.includes(phaseLine),
  changedFile: FILE,
  secrets: false,
  firestoreRead: false,
  authRead: false,
  writes: false,
  browser: false,
  deploy: false,
  production: false,
  ok
}, null, 2));
process.exit(ok ? 0 : 41);
