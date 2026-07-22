#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const repo = process.cwd();
const branch = 'ays/backend-tenant-lab-v99-20260703';
const payloadDir = path.join(repo, 'tools/.m1-visual-remediation-payload-v20260722');
const workflowRel = '.github/workflows/orbit360-apply-m1-visual-remediation-v20260722.yml';
const scriptRel = 'tools/orbit360-apply-m1-visual-remediation-v20260722.mjs';
const expectedBaseBlobs = {
  'orbit360-platform/core/client-insurer-visual-contract-v20260720.js': '94ba6c951ff7a7f7050f8e4ac55ac719133efc34',
  'orbit360-platform/styles/client-insurer-visual-contract-v20260720.css': '7739a7e91e2fd485ad9d0bd3a8fa7f8cb423738a',
  'orbit360-platform/data/academia-v1221-m1-visual-integrity.js': 'ac88c0b7037af796fe04b311a04bdd4e163b2e86',
  'orbit360-platform/tools/orbit360-block0-architecture-gate-v20260717.js': '76169094fb78dfb7a0221258fe05af1ad929e9fe',
  'tools/orbit360-gate-contract-overlay-v20260718.json': '48f48e2236ac1a3f029541501f9790a2dd22ffb9',
  'tools/orbit360-critical-runtime-integrity-manifest-v20260721.json': '3082e1fbdb3f408997fb85e5354ca4000387be9a'
};
const allowedFinal = new Set([
  ...Object.keys(expectedBaseBlobs),
  'orbit360-platform/tools/orbit360-m1-visual-remediation-contract-v20260722.js',
  'orbit360-platform/docs/BLOQUE1-FUNCTIONAL-DEFECT-REVISION-VISUAL-20260722.md'
]);
function run(args, options={}) { return execFileSync(args[0], args.slice(1), { cwd: repo, encoding:'utf8', stdio: options.capture ? 'pipe' : 'inherit' }); }
function fail(message) { console.error(message); process.exit(1); }
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

const activeBranch = run(['git','branch','--show-current'],{capture:true}).trim();
if (activeBranch !== branch) fail(`BRANCH_MISMATCH:${activeBranch}`);
const freeze = JSON.parse(fs.readFileSync(path.join(repo,'tools/orbit360-incident-freeze-v20260721.json'),'utf8'));
const auth = JSON.parse(fs.readFileSync(path.join(repo,'tools/orbit360-authorize-final-block1-gate-readonly-v20260721.json'),'utf8'));
if (!String(freeze.status||'').startsWith('STOP_THE_LINE')) fail('FREEZE_NOT_ACTIVE');
if (!Array.isArray(freeze.classification) || !freeze.classification.includes('FUNCTIONAL_DEFECT')) fail('FREEZE_CLASSIFICATION_MISMATCH');
if (auth.allowedExecutions !== 0 || auth.runtimeAllowed !== false || auth.deployAllowed !== false) fail('AUTHORIZATION_NOT_CONSUMED');

for (const [rel, expected] of Object.entries(expectedBaseBlobs)) {
  const actual = run(['git','hash-object',rel],{capture:true}).trim();
  if (actual !== expected) fail(`BASE_BLOB_MISMATCH:${rel}:${actual}:${expected}`);
}
const manifestPath = path.join(payloadDir,'manifest.json');
if (!fs.existsSync(manifestPath)) fail('PAYLOAD_MANIFEST_MISSING');
const payload = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if (payload.schemaVersion !== 'orbit360-m1-visual-remediation-payload-v1') fail('PAYLOAD_SCHEMA_MISMATCH');
for (const item of payload.files || []) {
  if (!allowedFinal.has(item.target)) fail(`TARGET_NOT_ALLOWED:${item.target}`);
  const encoded = item.chunks.map(name => fs.readFileSync(path.join(payloadDir,name),'utf8').trim()).join('');
  const buffer = Buffer.from(encoded,'base64');
  if (buffer.length !== item.bytes) fail(`PAYLOAD_SIZE_MISMATCH:${item.target}`);
  if (sha256(buffer) !== item.sha256) fail(`PAYLOAD_HASH_MISMATCH:${item.target}`);
  const target = path.join(repo,item.target);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,buffer);
}

for (const rel of [
  'orbit360-platform/core/client-insurer-visual-contract-v20260720.js',
  'orbit360-platform/data/academia-v1221-m1-visual-integrity.js',
  'orbit360-platform/tools/orbit360-m1-visual-remediation-contract-v20260722.js',
  'orbit360-platform/tools/orbit360-block0-architecture-gate-v20260717.js'
]) run(['node','--check',rel]);
const dedicated = JSON.parse(run(['node','orbit360-platform/tools/orbit360-m1-visual-remediation-contract-v20260722.js'],{capture:true}));
if (dedicated.status !== 'PASS' || dedicated.failed !== 0 || dedicated.writes !== 0 || dedicated.runtimeExecuted || dedicated.browserExecuted || dedicated.deployExecuted) fail('DEDICATED_STATIC_CONTRACT_FAILED');
const architecture = JSON.parse(run(['node','orbit360-platform/tools/orbit360-block0-architecture-gate-v20260717.js'],{capture:true}));
if (architecture.status !== 'GO_STATIC_ARCHITECTURE' || architecture.failed !== 0) fail('ARCHITECTURE_GATE_FAILED');

fs.rmSync(payloadDir,{recursive:true,force:true});
fs.rmSync(path.join(repo,scriptRel),{force:true});
fs.rmSync(path.join(repo,workflowRel),{force:true});
run(['git','add','-A']);
const names = run(['git','diff','--cached','--name-only'],{capture:true}).trim().split(/\r?\n/).filter(Boolean);
for (const name of names) {
  const temporary = name === scriptRel || name === workflowRel || name.startsWith('tools/.m1-visual-remediation-payload-v20260722/');
  if (!temporary && !allowedFinal.has(name)) fail(`UNEXPECTED_STAGED_PATH:${name}`);
}
for (const required of allowedFinal) if (!names.includes(required)) fail(`EXPECTED_FINAL_PATH_NOT_STAGED:${required}`);
run(['git','config','user.name','github-actions[bot]']);
run(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
run(['git','commit','-m','fix(m1): corregir semántica visual y responsive bajo contrato 1.0.37']);
run(['git','push','origin',`HEAD:${branch}`]);
console.log(JSON.stringify({status:'PASS',contractVersion:'1.0.37',dedicatedChecks:dedicated.total,architectureChecks:architecture.total,retiredTemporaryArtifacts:true,writesOperational:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,commit:run(['git','rev-parse','HEAD'],{capture:true}).trim()},null,2));
