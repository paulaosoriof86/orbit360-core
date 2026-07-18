#!/usr/bin/env node
import fs from 'node:fs';
const H='tools/orbit360-gate-bootstrap-auth-legal-v20260717.mjs';
const R='tools/orbit360-gate-runtime-crm-v20260716.mjs';
function one(s,a,b,c){const n=s.split(a).length-1;if(n!==1)throw new Error(c+':'+n);return s.replace(a,()=>b)}
let h=fs.readFileSync(H,'utf8');
const anchor=`async function waitForOwnerHandoffEvidence(report, requireState) {`;
const observer=`async function waitForAuthUiEvidence(report, requireState) {
  const required=['/data/store.js','/core/router.js','/core/auth.js'];
  const deadline=Date.now()+20000;
  let evidence=null;
  while(Date.now()<deadline){
    const parsed=new Set([].concat(report.browserParseDiagnostics&&report.browserParseDiagnostics.parsedScripts||[]).map(x=>String(x&&x.path||'')));
    const failed=new Set([].concat(report.browserParseDiagnostics&&report.browserParseDiagnostics.failedScripts||[]).map(x=>String(x&&x.path||'')));
    const transport=report.bootstrapTransportDiagnostic||{};
    const signals=[].concat(transport.runtimeSignals||[]);
    const requests=[].concat(transport.contractRequests||[]);
    const pageErrors=[].concat(transport.pageErrors||[]);
    const routerProgressObserved=signals.some(x=>/ORBIT360_RUNTIME_SIGNAL:(pwa-ready|contract-ready):/.test(String(x||'')))||requests.some(x=>/session-multirol-visibility|client-canonical-view-projection|tenant-insurer-config/.test(String(x&&x.path||'')));
    evidence={storeOwnerScriptParsed:parsed.has(required[0]),routerOwnerScriptParsed:parsed.has(required[1]),authOwnerScriptParsed:parsed.has(required[2]),ownerScriptParseFailures:required.filter(p=>failed.has(p)),authProviderReady:report.checks.canonical_auth_provider_ready===true,routerContractProgressObserved:routerProgressObserved,pageErrorCount:pageErrors.length,canonicalInitOrderEstablished:routerProgressObserved&&pageErrors.length===0};
    report.authUiDiagnostic=evidence;
    if(evidence.ownerScriptParseFailures.length)requireState(false,'AUTH_UI_OWNER_SCRIPT_PARSE_FAILED',JSON.stringify(evidence.ownerScriptParseFailures));
    if(evidence.pageErrorCount)requireState(false,'AUTH_UI_PAGE_ERROR',JSON.stringify(pageErrors.slice(0,3)));
    if(evidence.storeOwnerScriptParsed&&evidence.routerOwnerScriptParsed&&evidence.authOwnerScriptParsed&&evidence.authProviderReady&&evidence.routerContractProgressObserved)return;
    await new Promise(r=>setTimeout(r,100));
  }
  requireState(false,'AUTH_UI_EXTERNAL_EVIDENCE_MISSING',JSON.stringify(evidence||{}));
}

`;
h=one(h,anchor,observer+anchor,'AUTH_OBSERVER_ANCHOR');
h=one(h,`  await approveStage(report, bounded, 'canonical_auth_ui_ready', () => page.waitForFunction(() => {
    const form = document.getElementById('login-form');
    return Boolean(form && form.dataset.authMode === 'firestore-lab');
  }, null, { timeout: 20000, polling: 250 }), 24000);
`,`  await approveStage(report, bounded, 'canonical_auth_ui_ready', () => waitForAuthUiEvidence(report, requireState), 24000);
`,'AUTH_STAGE');
fs.writeFileSync(H,h);
let r=fs.readFileSync(R,'utf8');
r=one(r,"schemaVersion:'orbit360-runtime-gate-joint-v20-owner-handoff-external-evidence'","schemaVersion:'orbit360-runtime-gate-joint-v21-auth-ui-external-evidence'",'SCHEMA');
r=one(r,"contractVersion:'1.0.20'","contractVersion:'1.0.21'",'VERSION');
fs.writeFileSync(R,r);
console.log(JSON.stringify({ok:true,contractVersion:'1.0.21',classification:'VALIDATOR_STALE'}));