#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { patchChromiumCaptureWatchdog } from './orbit360-playwright-capture-watchdog-lib-v20260806.mjs';

const ROOT = process.cwd();
const wrapperPath = path.join(ROOT, 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs');
const v22BuilderPath = path.join(ROOT, 'tools/orbit360-build-v22-block1-matrix-artifact-v20260807.mjs');
const v21BuilderPath = path.join(ROOT, 'tools/orbit360-build-v21-event-driven-matrix-artifact-v20260807.mjs');
const helperPath = path.join(ROOT, 'tools/orbit360-playwright-capture-watchdog-lib-v20260806.mjs');
const wrapper = fs.readFileSync(wrapperPath, 'utf8');
const builder = fs.readFileSync(v22BuilderPath, 'utf8');
const helper = fs.readFileSync(helperPath, 'utf8');
const checks = {};

checks.filesExist = [wrapperPath, v22BuilderPath, v21BuilderPath, helperPath].every(fs.existsSync);
checks.wrapperCurrentOwnerV22 = wrapper.includes('buildV22MatrixArtifact') && wrapper.includes('.orbit360-v22-exact-block1-matrix-artifact-') && wrapper.includes('?v22=');
checks.wrapperHistoricalV21Visible = wrapper.includes('buildV21MatrixArtifact') && wrapper.includes('void buildV21MatrixArtifact');
checks.builderLayersOnV21 = builder.includes('buildV21MatrixArtifact') && builder.includes("go(page, role, 'aseguradoras')") && builder.includes('BLOCK1_CLIENT360_INSURERS');
checks.builderNoLegacyDetailBlockers = !['vehicle-detail-button','receipt-detail-button','cobro-detail-button','polizas-kpis-stable'].some(token => builder.includes(token));
checks.wrapperExactArtifactGate = wrapper.includes("spawnSync(process.execPath, ['--check', tempPath]") && wrapper.includes('MATRIX_ARTIFACT_COMPILE_FAILED') && wrapper.includes('PIPELINE_MECHANISM_FAILURE');
checks.wrapperNoProductLogic = !wrapper.includes('canonicalRef(') && !wrapper.includes('testRole(') && !wrapper.includes('protectedSnapshot(');
checks.helperUsesCDP = helper.includes('Page.captureScreenshot') && helper.includes('Runtime.evaluate');
checks.helperHasHardTimeout = helper.includes('CAPTURE_HARD_TIMEOUT_') && helper.includes('Promise.race');
checks.helperDoesNotCloseFunctionalContext = !helper.includes('context.close(') && !helper.includes('browser.close(');

function harness(mode) {
  const calls = { detach:0, contextClose:0, browserClose:0 };
  const page = { context:()=>context, evaluate:async()=>true, screenshot:async()=>{ throw new Error('UNPATCHED'); } };
  const session = { send:async cmd=>{ if(cmd==='Runtime.evaluate') return {result:{value:true}}; if(cmd==='Page.captureScreenshot'){ if(mode==='hang') return new Promise(()=>{}); return {data:Buffer.from('png').toString('base64')}; } throw new Error('BAD'); }, detach:async()=>{calls.detach+=1;} };
  const context = { newPage:async()=>page, newCDPSession:async()=>session, close:async()=>{calls.contextClose+=1;} };
  const browser = { newContext:async()=>context, close:async()=>{calls.browserClose+=1;} };
  return { chromium:{launch:async()=>browser}, calls };
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-v22-watchdog-'));
const evidence = path.join(tmp,'evidence.json');
fs.writeFileSync(evidence, JSON.stringify({currentCheckpoint:'START',checkpoints:[]})+'\n');
const h = harness('hang');
patchChromiumCaptureWatchdog({chromium:h.chromium,evidencePath:evidence,hardTimeoutMs:300,heartbeatMs:200,detachTimeoutMs:15});
const b=await h.chromium.launch(); const c=await b.newContext(); const p=await c.newPage();
let message=''; const started=Date.now(); try{await p.screenshot({path:path.join(tmp,'x.png')});}catch(e){message=String(e.message||e);} const elapsed=Date.now()-started;
const ev=JSON.parse(fs.readFileSync(evidence,'utf8'));
checks.timeoutBounded=/CAPTURE_HARD_TIMEOUT_300MS/.test(message) && elapsed<1000;
checks.timeoutTerminal=ev.checkpoints.some(x=>String(x.checkpoint||'').endsWith('_CAPTURE_TIMEOUT'));
checks.timeoutDetachedOnly=h.calls.detach===1 && h.calls.contextClose===0 && h.calls.browserClose===0;

const failedCheckIds=Object.entries(checks).filter(([,ok])=>ok!==true).map(([id])=>id);
const output={schemaVersion:'orbit360-capture-watchdog-source-test-v4-v22-block1-owner',status:failedCheckIds.length?'STOP_CAPTURE_WATCHDOG_V22_SOURCE':'PASS_CAPTURE_WATCHDOG_V22_SOURCE_ONLY',classification:failedCheckIds.length?'VALIDATOR_STALE':'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY',total:Object.keys(checks).length,passed:Object.values(checks).filter(Boolean).length,failed:failedCheckIds.length,failedCheckIds,checks,exactArtifactOwner:'tools/orbit360-build-v22-block1-matrix-artifact-v20260807.mjs',priorExactArtifactOwner:'tools/orbit360-build-v21-event-driven-matrix-artifact-v20260807.mjs',secretAccess:false,firebaseAccess:false,firestoreReads:0,firestoreWrites:0,authWrites:0,operationalWrites:0,browserExecuted:false,hostingTouched:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:failedCheckIds.length===0};
console.log(JSON.stringify(output,null,2));
try{fs.rmSync(tmp,{recursive:true,force:true});}catch{}
process.exit(output.ok?0:41);
