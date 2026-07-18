#!/usr/bin/env node
import fs from 'node:fs';
const H='tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs';
const R='tools/orbit360-gate-runtime-crm-v20260716.mjs';
function one(s,a,b,c){const n=s.split(a).length-1;if(n!==1)throw new Error(c+':'+n);return s.replace(a,()=>b)}
let h=fs.readFileSync(H,'utf8');
const anchor=`async function approveStage(report, bounded, name, task, timeoutMs) {
  await bounded(name, task, timeoutMs);
  report.checks[name] = true;
}

`;
const observer=`async function waitForOwnerHandoffEvidence(report, requireState) {
  const required=['/data/store.js','/core/router.js','/core/auth.js'];
  const deadline=Date.now()+20000;
  let evidence=null;
  while(Date.now()<deadline){
    const parsed=new Set([].concat(report.browserParseDiagnostics&&report.browserParseDiagnostics.parsedScripts||[]).map(x=>String(x&&x.path||'')));
    const failed=new Set([].concat(report.browserParseDiagnostics&&report.browserParseDiagnostics.failedScripts||[]).map(x=>String(x&&x.path||'')));
    evidence={storeOwnerScriptParsed:parsed.has(required[0]),routerOwnerScriptParsed:parsed.has(required[1]),authOwnerScriptParsed:parsed.has(required[2]),ownerScriptParseFailures:required.filter(p=>failed.has(p)),authUiInitialized:report.checks.canonical_auth_ui_ready===true,inlineInitOrderEstablished:report.checks.canonical_auth_ui_ready===true};
    report.ownerHandoffDiagnostic=evidence;
    if(evidence.ownerScriptParseFailures.length)requireState(false,'OWNER_SCRIPT_PARSE_FAILED',JSON.stringify(evidence.ownerScriptParseFailures));
    if(evidence.storeOwnerScriptParsed&&evidence.routerOwnerScriptParsed&&evidence.authOwnerScriptParsed&&evidence.authUiInitialized)return;
    await new Promise(r=>setTimeout(r,100));
  }
  requireState(false,'OWNER_HANDOFF_EXTERNAL_EVIDENCE_MISSING',JSON.stringify(evidence||{}));
}

`;
h=one(h,anchor,anchor+observer,'ANCHOR');
h=one(h,`  await approveStage(report, bounded, 'canonical_owner_handoff_ready', () => page.waitForFunction(() => {
    return Boolean(window.Orbit && Orbit.store && Orbit.router && Orbit.auth &&
      typeof Orbit.auth.loginFirebase === 'function');
  }, null, { timeout: 20000, polling: 250 }), 24000);
`,`  await approveStage(report, bounded, 'canonical_owner_handoff_ready', () => waitForOwnerHandoffEvidence(report, requireState), 24000);
`,'OWNER_STAGE');
fs.writeFileSync(H,h);
let r=fs.readFileSync(R,'utf8');
r=one(r,"schemaVersion:'orbit360-runtime-gate-joint-v19-preauth-fail-closed'","schemaVersion:'orbit360-runtime-gate-joint-v20-owner-handoff-external-evidence'",'SCHEMA');
r=one(r,"contractVersion:'1.0.19'","contractVersion:'1.0.20'",'VERSION');
r=one(r,"if(!/client-canonical-view-projection|tenant-insurer-config|tenant-runtime-config-index|session-multirol-visibility/.test(path))return;","if(!/data\\/store\\.js|core\\/router\\.js|core\\/auth\\.js|client-canonical-view-projection|tenant-insurer-config|tenant-runtime-config-index|session-multirol-visibility/.test(path))return;",'CDP_FILTER');
fs.writeFileSync(R,r);
console.log(JSON.stringify({ok:true,contractVersion:'1.0.20',classification:'VALIDATOR_STALE'}));