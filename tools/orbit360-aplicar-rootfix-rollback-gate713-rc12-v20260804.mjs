#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const PROVISIONER = 'tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs';
const GATE713 = 'tools/orbit360-validar-gate-contracts-engine-rc12-rootcause-cumulative-closure-v20260803.mjs';
const ENTRYPOINT = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const PROOF = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-rollback-gate713-rootfix-static.json';
const GATE_LINE = '  "block7.15.2-rc12-approved-roster-rollback-recovery-v20260804":{contractVersion:"7.15.2",lifecycle:"tools/orbit360-validator-lifecycle-contract-rc12-approved-roster-rollback-recovery-v20260804.json",engine:"tools/orbit360-validar-gate-contracts-engine-rc12-approved-roster-rollback-recovery-v20260804.mjs"},';
const PHASE_LINE = '  "GRAVICENTRA_RC12_APPROVED_ROSTER_ROLLBACK_RECOVERY":{"secrets":true,"firestoreRead":true,"writes":true,"runtime":false,"browser":false,"deploy":false,"functionsDeploy":false,"rulesDeploy":false,"production":false},';

function replaceBlock(source, startMarker, endMarker, replacement, id) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`${id}_MARKERS_MISSING`);
  return source.slice(0, start) + replacement + source.slice(end);
}
function replaceOnce(source, before, after, id) {
  if (source.includes(after)) return source;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${id}_MATCH_COUNT_${count}`);
  return source.replace(before, after);
}

let provisioner = fs.readFileSync(PROVISIONER, 'utf8');
const fixedMembershipRollback = `async function deleteCreatedMemberships(db, state) {
  let deleted = 0;
  await db.runTransaction(async tx => {
    const owned = [];
    for (const profile of state.createdMembershipProfiles || []) {
      const item = state.roster?.[profile];
      if (!item?.uid) continue;
      const ref = db.collection('tenants').doc(TENANT).collection('members').doc(item.uid);
      const snap = await tx.get(ref);
      if (!snap.exists) continue;
      const data = snap.data() || {};
      if (data.onboardingVersion !== 'rc12-approved-roster-final-v1' || text(data.onboardingRunId) !== text(process.env.GITHUB_RUN_ID)) {
        throw new Error(\`ROLLBACK_MEMBERSHIP_OWNERSHIP_MISMATCH_\${profile.toUpperCase()}\`);
      }
      owned.push({ profile, ref });
    }
    for (const entry of owned) {
      tx.delete(entry.ref);
      deleted += 1;
    }
  });
  return deleted;
}
`;
if (!provisioner.includes('const owned = [];') || !provisioner.includes('for (const entry of owned)')) {
  provisioner = replaceBlock(provisioner, 'async function deleteCreatedMemberships(db, state) {', 'async function apply() {', fixedMembershipRollback, 'ROLLBACK_TRANSACTION_ORDER');
}
fs.writeFileSync(PROVISIONER, provisioner, 'utf8');

let gate713 = fs.readFileSync(GATE713, 'utf8');
gate713 = replaceOnce(
  gate713,
  "const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));\nconst exists = rel => fs.existsSync(path.join(ROOT, rel));",
  "const read = rel => JSON.parse(fs.readFileSync(path.isAbsolute(rel) ? rel : path.join(ROOT, rel), 'utf8'));\nconst exists = rel => fs.existsSync(path.isAbsolute(rel) ? rel : path.join(ROOT, rel));",
  'GATE713_ABSOLUTE_PATH'
);
fs.writeFileSync(GATE713, gate713, 'utf8');

let entrypoint = fs.readFileSync(ENTRYPOINT, 'utf8');
if (!entrypoint.includes(GATE_LINE)) {
  const marker = '  "block8-vehicles-static-v20260730":';
  if (!entrypoint.includes(marker)) throw new Error('GATE_REGISTER_MARKER_MISSING');
  entrypoint = entrypoint.replace(marker, `${GATE_LINE}\n${marker}`);
}
if (!entrypoint.includes(PHASE_LINE)) {
  const marker = '  "M5_LAB_HOSTING_DELIVERY":';
  if (!entrypoint.includes(marker)) throw new Error('PHASE_REGISTER_MARKER_MISSING');
  entrypoint = entrypoint.replace(marker, `${PHASE_LINE}\n${marker}`);
}
fs.writeFileSync(ENTRYPOINT, entrypoint, 'utf8');

const checks = {
  rollbackReadsBeforeWrites: provisioner.includes('const owned = [];') && provisioner.indexOf('owned.push({ profile, ref });') < provisioner.indexOf('for (const entry of owned)') && provisioner.includes('tx.delete(entry.ref)'),
  rollbackOwnershipGuardsPreserved: provisioner.includes("data.onboardingVersion !== 'rc12-approved-roster-final-v1'") && provisioner.includes('data.onboardingRunId'),
  gate713AbsoluteReadSupported: gate713.includes("path.isAbsolute(rel) ? rel : path.join(ROOT, rel)"),
  gate713AbsoluteExistsSupported: gate713.includes("path.isAbsolute(rel) ? rel : path.join(ROOT, rel)"),
  rollbackGateRegistered: entrypoint.includes(GATE_LINE),
  rollbackPhaseRegistered: entrypoint.includes(PHASE_LINE)
};
const ok = Object.values(checks).every(Boolean);
fs.mkdirSync(path.dirname(PROOF), { recursive:true });
fs.writeFileSync(PROOF, JSON.stringify({
  schemaVersion:'orbit360-rc12-rollback-gate713-rootfix-static-v1',
  generatedAt:new Date().toISOString(),
  decision:ok?'RC12_ROLLBACK_GATE713_ROOTFIX_STATIC_PASS':'RC12_ROLLBACK_GATE713_ROOTFIX_STATIC_FAIL',
  classification:ok?'GO_STATIC_PIPELINE_ROOTFIX':'PIPELINE_MECHANISM_FAILURE',
  failedRun:30910775651,
  owners:[PROVISIONER,GATE713,ENTRYPOINT],
  checks,
  secretAccess:false,
  firestoreRead:false,
  firestoreWrites:0,
  authRead:false,
  authWrites:0,
  deployExecuted:false,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false,
  ok
},null,2)+'\n','utf8');
console.log(JSON.stringify({decision:ok?'PASS':'FAIL',checks,ok},null,2));
process.exit(ok?0:41);
