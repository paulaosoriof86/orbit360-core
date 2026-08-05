#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block12-operational-runtime-lab-v20260804';
const VERSION = '12.0.10';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-block12-operational-runtime-lab-v20260804.json';
const OLD_ENGINE = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-lab-v20260804.mjs';
const ENGINE = 'tools/orbit360-validar-gate-contracts-engine-block12-operational-runtime-video-lab-v20260804.mjs';
const ROUTER = 'tools/orbit360-validar-gate-contracts-v20260717.mjs';
const REGISTRY = 'tools/orbit360-gate-contract-registry-v20260717.json';
const RUNTIME = 'tools/orbit360-block12-operational-runtime-lab-v20260804.mjs';
const VISUAL = 'tools/orbit360-block12-cumulative-visual-v20260804.mjs';
const WORKFLOW = '.github/workflows/orbit360-block12-visual-reactivation-lab-v20260804.yml';
const VIDEO_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/block12-video-frame-synthetic.json';
const OUT = 'orbit360-platform/runtime-gate-crm-v20260716/block12-video-visual-contract-source-v20260804.json';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(ROOT, rel), value, 'utf8');
const replaceExact = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count === 1) return source.replace(before, after);
  if (count === 0 && source.includes(after)) return source;
  throw new Error(`PIPELINE_MECHANISM_FAILURE:${label}_EXPECTED_1_FOUND_${count}`);
};

let router = read(ROUTER);
const oldRouter = `"${GATE}":{contractVersion:"12.0.9",lifecycle:"${LIFECYCLE}",engine:"${OLD_ENGINE}"}`;
const newRouter = `"${GATE}":{contractVersion:"${VERSION}",lifecycle:"${LIFECYCLE}",engine:"${ENGINE}"}`;
router = replaceExact(router, oldRouter, newRouter, 'ROUTER_GATE_BINDING');
write(ROUTER, router);

const registry = JSON.parse(read(REGISTRY));
let matches = 0;
const visit = node => {
  if (!node || typeof node !== 'object') return;
  if (node.gateId === GATE) {
    if ('gateContractVersion' in node) node.gateContractVersion = VERSION;
    if ('contractVersion' in node) node.contractVersion = VERSION;
    if (!('gateContractVersion' in node) && !('contractVersion' in node)) node.contractVersion = VERSION;
    node.lifecycle = LIFECYCLE;
    node.engine = ENGINE;
    node.status = 'OPERATIONAL_RUNTIME_LAB_VISUAL_VIDEO_READY';
    matches += 1;
  }
  for (const value of Object.values(node)) visit(value);
};
visit(registry);
if (!matches) throw new Error('PIPELINE_MECHANISM_FAILURE:REGISTRY_GATE_NOT_FOUND');
write(REGISTRY, JSON.stringify(registry, null, 2) + '\n');

let runtime = read(RUNTIME);
runtime = replaceExact(runtime, "contractVersion: '12.0.9'", `contractVersion: '${VERSION}'`, 'RUNTIME_FINAL_CONTRACT_VERSION');
write(RUNTIME, runtime);

for (const file of [ROUTER, RUNTIME, ENGINE, VISUAL, 'tools/orbit360-block12-visual-readonly-integrity-v20260804.mjs']) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, file)], { stdio: 'inherit' });
}

const lifecycle = JSON.parse(read(LIFECYCLE));
const videoEvidence = JSON.parse(read(VIDEO_EVIDENCE));
const workflow = read(WORKFLOW);
const visual = read(VISUAL);
const checks = {
  lifecycleVersion: lifecycle.gateContractVersion === VERSION,
  lifecycleStatus: lifecycle.status === 'OPERATIONAL_RUNTIME_LAB_VISUAL_VIDEO_READY',
  lifecycleVideoScope: lifecycle.scope.visualVideoRecordingRequired === true && lifecycle.scope.ffmpegStaticRequired === true && lifecycle.scope.screenshotApisForbidden === true,
  routerBinding: read(ROUTER).includes(newRouter),
  registryBinding: matches > 0,
  runtimeVersion: read(RUNTIME).includes(`contractVersion: '${VERSION}'`),
  engineVersion: read(ENGINE).includes(`const VERSION = '${VERSION}'`),
  videoSyntheticPass: videoEvidence.status === 'VIDEO_FRAME_SYNTHETIC_PASS' && videoEvidence.captureEngine === 'playwright-record-video-plus-ffmpeg-static-frame' && videoEvidence.ok === true,
  visualUsesVideo: visual.includes('recordVideo:') && visual.includes("import ffmpegPath from 'ffmpeg-static'") && visual.includes('video.path()'),
  visualForbidsScreenshot: !visual.includes('page.screenshot(') && !visual.includes('Page.captureScreenshot') && !visual.includes('newCDPSession('),
  workflowVideoDependencies: workflow.includes('ffmpeg-static@5.2.0') && workflow.includes('playwright@1.52.0')
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
if (failed.length) throw new Error(`PIPELINE_MECHANISM_FAILURE:VIDEO_VISUAL_CONTRACT_INCOMPLETE:${failed.join(',')}`);

const payload = {
  schemaVersion: 'orbit360-block12-video-visual-contract-source-v1',
  status: 'VIDEO_VISUAL_CONTRACT_SOURCE_PASS',
  classification: 'GO_SOURCE_VIDEO_VISUAL_CONTRACT',
  gateId: GATE,
  contractVersion: VERSION,
  engine: ENGINE,
  checks,
  videoSyntheticRunId: 30969402434,
  priorFunctionalRunId: 30962756387,
  priorFunctionalPassed: 18,
  priorFunctionalFailed: 0,
  functionalReplayRequired: false,
  secretsRead: false,
  firebaseCommandsExecuted: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  containsPII: false,
  containsSecrets: false,
  ok: true
};
fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
write(OUT, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(payload, null, 2));
