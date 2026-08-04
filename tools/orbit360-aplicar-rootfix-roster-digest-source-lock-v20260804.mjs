#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const PROVISIONER = 'tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-rc12-approved-roster-final-go-live-v20260804.json';
const ENGINE = 'tools/orbit360-validar-gate-contracts-engine-rc12-approved-roster-final-go-live-v20260804.mjs';
const ENTRYPOINT = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const PROOF = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-reconciler-rootfix-static.json';
const RESUME_REQUEST = '.github/orbit360-requests/rc12-approved-roster-final-go-live-resume-v20260804.json';
const SOURCE_COMMIT = '34fa84a60ebc38b0035ed664da87ca78aaa73ff7';
const SOURCE_PATH = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json';

function replaceOnce(source, before, after, id) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0 || first !== last) throw new Error(`${id}: expected exactly one match`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}
function replaceBlock(source, startMarker, endMarker, replacement, id) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`${id}: block markers missing`);
  return source.slice(0, start) + replacement + source.slice(end);
}

let provisioner = fs.readFileSync(PROVISIONER, 'utf8');
provisioner = replaceOnce(
  provisioner,
  "import crypto from 'node:crypto';\n",
  "import crypto from 'node:crypto';\nimport { execFileSync } from 'node:child_process';\n",
  'ADD_CHILD_PROCESS'
);
provisioner = replaceOnce(
  provisioner,
  "const MANIFEST_FILE = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json');\n",
  "const MANIFEST_FILE = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json');\nconst APPROVED_SOURCE_COMMIT = '34fa84a60ebc38b0035ed664da87ca78aaa73ff7';\nconst APPROVED_SOURCE_PATH = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-cumulative-candidate-unified-manifest.json';\n",
  'ADD_SOURCE_LOCK_CONSTANTS'
);
provisioner = replaceOnce(
  provisioner,
  "function readPrivate() {\n  return JSON.parse(fs.readFileSync(PRIVATE_STATE, 'utf8'));\n}\n",
  "function readPrivate() {\n  return JSON.parse(fs.readFileSync(PRIVATE_STATE, 'utf8'));\n}\nfunction readApprovedRosterSource() {\n  const raw = execFileSync('git', ['show', `${APPROVED_SOURCE_COMMIT}:${APPROVED_SOURCE_PATH}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });\n  const parsed = JSON.parse(raw);\n  if (!parsed?.approvedRoster) throw new Error('APPROVED_ROSTER_SOURCE_LOCK_MISSING');\n  return parsed.approvedRoster;\n}\n",
  'ADD_SOURCE_LOCK_READER'
);
provisioner = replaceBlock(
  provisioner,
  'function resolveAdvisor(contract, advisors) {',
  'function resolveAuth(',
  `function resolveAdvisor(contract, advisors) {
  const digestMatches = advisors.filter(row => row.emailSha256 && row.emailSha256 === contract.emailSha256);
  if (digestMatches.length === 1) return { status: 'resolved', source: 'email_digest', advisor: digestMatches[0] };
  if (digestMatches.length > 1) return { status: 'ambiguous', source: 'email_digest', candidates: digestMatches.length };
  const requiredTokens = tokens(contract.personRef || '');
  const nameMatches = advisors.filter(row => requiredTokens.length > 0 && requiredTokens.every(token => row.nameTokens.includes(token)));
  if (nameMatches.length !== 1) return { status: nameMatches.length ? 'ambiguous' : 'missing', source: 'canonical_name', candidates: nameMatches.length };
  return { status: 'resolved', source: 'canonical_name', advisor: nameMatches[0] };
}
`,
  'REPLACE_ADVISOR_RESOLUTION'
);
provisioner = replaceBlock(
  provisioner,
  'function resolveAuth(',
  'function desiredMembership(',
  `function resolveAuth(contract, approvedEmail, users) {
  const email = String(approvedEmail || '').trim().toLowerCase();
  if (!email || sha(email) !== contract.emailSha256) return { status: 'approved_source_digest_mismatch', candidates: 0, user: null };
  const matches = users.filter(user => sha(String(user?.email || '').toLowerCase()) === contract.emailSha256);
  if (!matches.length) return { status: 'missing', candidates: 0, user: null };
  if (matches.length !== 1) return { status: 'ambiguous', candidates: matches.length, user: null };
  const user = matches[0];
  if (String(user.email || '').toLowerCase() !== email) return { status: 'email_value_mismatch', candidates: 1, user: null };
  if (!validNormalUser(user)) return { status: 'existing_invalid', candidates: 1, user };
  return { status: 'existing_valid', candidates: 1, user };
}
`,
  'REPLACE_AUTH_RESOLUTION'
);
provisioner = replaceOnce(
  provisioner,
  "  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));\n  const { auth, db } = admin();\n",
  "  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));\n  const approvedSource = readApprovedRosterSource();\n  const { auth, db } = admin();\n",
  'LOAD_SOURCE_LOCK'
);
provisioner = replaceOnce(
  provisioner,
  "    const contract = manifest.approvedRoster?.[profile];\n    if (!contract?.personRef || !/^[a-f0-9]{64}$/.test(contract?.emailSha256 || '')) throw new Error(`APPROVED_ROSTER_CONTRACT_INVALID_${profile.toUpperCase()}`);\n    const advisorResult = resolveAdvisor(contract, advisors);\n    const authResult = advisorResult.status === 'resolved'\n      ? resolveAuth(contract, advisorResult.advisor, users)\n      : { status: 'not_evaluated', candidates: 0, user: null };\n",
  "    const contract = manifest.approvedRoster?.[profile];\n    if (!contract?.personRef || !/^[a-f0-9]{64}$/.test(contract?.emailSha256 || '')) throw new Error(`APPROVED_ROSTER_CONTRACT_INVALID_${profile.toUpperCase()}`);\n    const sourceContract = approvedSource?.[profile];\n    const approvedEmail = String(sourceContract?.email || '').trim().toLowerCase();\n    const sourcePerson = String(sourceContract?.person || '').trim();\n    if (!approvedEmail || sha(approvedEmail) !== contract.emailSha256 || clean(sourcePerson) !== clean(contract.personRef)) throw new Error(`APPROVED_ROSTER_SOURCE_LOCK_INVALID_${profile.toUpperCase()}`);\n    const advisorResult = resolveAdvisor(contract, advisors);\n    const authResult = advisorResult.status === 'resolved'\n      ? resolveAuth(contract, approvedEmail, users)\n      : { status: 'not_evaluated', candidates: 0, user: null };\n",
  'BIND_APPROVED_SOURCE'
);
provisioner = replaceOnce(
  provisioner,
  "      personRef: contract.personRef,\n      emailSha256: contract.emailSha256,\n",
  "      personRef: contract.personRef,\n      emailSha256: contract.emailSha256,\n      approvedEmail,\n",
  'KEEP_PRIVATE_APPROVED_EMAIL'
);
provisioner = replaceOnce(
  provisioner,
  "          email: item.advisor.email,\n",
  "          email: item.approvedEmail,\n",
  'PRIVATE_STATE_APPROVED_EMAIL'
);
fs.writeFileSync(PROVISIONER, provisioner, 'utf8');

const lifecycle = JSON.parse(fs.readFileSync(LIFECYCLE, 'utf8'));
lifecycle.gateContractVersion = '7.15.1';
lifecycle.status = 'RC12_APPROVED_ROSTER_FINAL_GO_LIVE_POST_ROOTFIX_AUTHORIZED';
lifecycle.authorization = {
  ...lifecycle.authorization,
  activeRequest: true,
  allowedExecutions: 1,
  request: RESUME_REQUEST,
  replayAllowed: false,
  previousRun: 30908259200,
  previousDecision: 'RC12_APPROVED_ROSTER_RECONCILIATION_NO_GO_NO_WRITE'
};
lifecycle.rootFix = {
  classification: 'VALIDATOR_STALE',
  failureFamily: 'ADVISOR_EMAIL_REQUIRED_WHEN_CANONICAL_RECORD_HAS_NO_EMAIL',
  owner: PROVISIONER,
  approvedRosterSourceCommit: SOURCE_COMMIT,
  approvedRosterSourcePath: SOURCE_PATH,
  digestVerificationRequired: true,
  rawEmailPersistenceAllowed: false,
  evidence: PROOF
};
fs.writeFileSync(LIFECYCLE, JSON.stringify(lifecycle, null, 2) + '\n', 'utf8');

let engine = fs.readFileSync(ENGINE, 'utf8');
engine = replaceOnce(engine, "const VERSION = '7.15.0';", "const VERSION = '7.15.1';", 'ENGINE_VERSION');
engine = replaceOnce(engine, ".github/orbit360-requests/rc12-approved-roster-final-go-live-v20260804.json';", ".github/orbit360-requests/rc12-approved-roster-final-go-live-resume-v20260804.json';", 'ENGINE_REQUEST');
engine = replaceOnce(engine, "  'tools/orbit360-validar-auth-membership-antiregression-rootfix-v20260803.mjs',\n", "  'tools/orbit360-validar-auth-membership-antiregression-rootfix-v20260803.mjs',\n  'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-reconciler-rootfix-static.json',\n", 'ENGINE_PROOF_REQUIRED');
engine = replaceOnce(engine, "lifecycle.status === 'RC12_APPROVED_ROSTER_FINAL_GO_LIVE_AUTHORIZED'", "lifecycle.status === 'RC12_APPROVED_ROSTER_FINAL_GO_LIVE_POST_ROOTFIX_AUTHORIZED'", 'ENGINE_LIFECYCLE_STATUS');
engine = replaceOnce(engine, "request.status === 'AUTHORIZED_SINGLE_MACRO'", "request.status === 'AUTHORIZED_POST_ROOTFIX_RESUME'", 'ENGINE_REQUEST_STATUS');
engine = replaceOnce(engine, "  add('REQUEST_BINDING', request.branch === LIVE_BRANCH", "  add('LIFECYCLE_REQUEST_BINDING', lifecycle.authorization?.request === REQUEST && lifecycle.authorization?.previousRun === 30908259200 && lifecycle.rootFix?.evidence === 'orbit360-platform/runtime-gate-crm-v20260716/rc12-approved-roster-reconciler-rootfix-static.json');\n  add('REQUEST_BINDING', request.branch === LIVE_BRANCH", 'ENGINE_LIFECYCLE_BINDING');
fs.writeFileSync(ENGINE, engine, 'utf8');

let entrypoint = fs.readFileSync(ENTRYPOINT, 'utf8');
entrypoint = replaceOnce(
  entrypoint,
  '"block7.15-rc12-approved-roster-final-go-live-v20260804":{contractVersion:"7.15.0"',
  '"block7.15-rc12-approved-roster-final-go-live-v20260804":{contractVersion:"7.15.1"',
  'ENTRYPOINT_GATE_VERSION'
);
fs.writeFileSync(ENTRYPOINT, entrypoint, 'utf8');

const rawMarkers = /[A-Z0-9._%+-]+@aysseguros\.com/gi;
const checks = {
  sourceLockReaderPresent: provisioner.includes('readApprovedRosterSource()') && provisioner.includes(SOURCE_COMMIT),
  sourceLockDigestRequired: provisioner.includes('sha(approvedEmail) !== contract.emailSha256'),
  advisorEmailNoLongerRequired: !provisioner.includes("return { status: 'missing_email'"),
  approvedEmailPrivateOnly: provisioner.includes('email: item.approvedEmail') && !rawMarkers.test(provisioner),
  existingUsersRemainImmutable: provisioner.includes('EXISTING_AUTH_USER_CHANGED_') && provisioner.includes('maximumAuthUsersUpdated') === false,
  lifecycleResumeBound: lifecycle.gateContractVersion === '7.15.1' && lifecycle.authorization.request === RESUME_REQUEST,
  engineResumeBound: engine.includes("const VERSION = '7.15.1'") && engine.includes('AUTHORIZED_POST_ROOTFIX_RESUME'),
  centralRegistryUpdated: entrypoint.includes('"block7.15-rc12-approved-roster-final-go-live-v20260804":{contractVersion:"7.15.1"')
};
const ok = Object.values(checks).every(Boolean);
fs.mkdirSync(PROOF.split('/').slice(0, -1).join('/'), { recursive: true });
fs.writeFileSync(PROOF, JSON.stringify({
  schemaVersion: 'orbit360-approved-roster-reconciler-rootfix-static-v1',
  generatedAt: new Date().toISOString(),
  decision: ok ? 'APPROVED_ROSTER_RECONCILER_ROOTFIX_STATIC_PASS' : 'APPROVED_ROSTER_RECONCILER_ROOTFIX_STATIC_FAIL',
  classification: ok ? 'GO_STATIC_VALIDATOR_ROOTFIX' : 'VALIDATOR_STALE',
  sourceCommitSha256: 'sha256:' + (await import('node:crypto')).createHash('sha256').update(SOURCE_COMMIT).digest('hex'),
  sourcePathSha256: 'sha256:' + (await import('node:crypto')).createHash('sha256').update(SOURCE_PATH).digest('hex'),
  rawEmailStored: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authRead: false,
  authWrites: 0,
  userCreates: 0,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  checks,
  ok
}, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ decision: ok ? 'PASS' : 'FAIL', checks, ok }, null, 2));
process.exit(ok ? 0 : 41);
