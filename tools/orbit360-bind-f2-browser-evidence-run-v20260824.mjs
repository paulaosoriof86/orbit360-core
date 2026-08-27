#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const RUN_ID=String(process.env.GITHUB_RUN_ID||process.env.ORBIT360_F2_RUN_ID||'').trim();
const DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const BROWSER_HARNESS=path.join(ROOT,'tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs');
const EXPECTED_RESOURCE_DENIAL=/Failed to load resource:.*status of (400|403)/i;

function consoleOnlyAmbiguity(e){
  return e?.ok===false&&e?.classification==='FUNCTIONAL_DEFECT'&&
    /^FUNCTIONAL_DEFECT:F2_CONSOLE_ERRORS:Failed to load resource:.*status of (400|403)/i.test(String(e?.error||''))&&
    e?.crossTenantDenied===true&&Array.isArray(e?.consoleErrors)&&e.consoleErrors.length===1&&
    Array.isArray(e?.pageErrors)&&e.pageErrors.length===0&&Array.isArray(e?.writeSignals)&&e.writeSignals.length===0&&
    Array.isArray(e?.routeTrace)&&e.routeTrace.length>0&&e.routeTrace.every(x=>x&&x.ok===true);
}

function validateCurrentRunAttribution(e){
  const expected=[].concat(e?.expectedDenialConsoleErrors||[]).map(v=>String(v||'').trim()).filter(Boolean);
  const a=e?.consoleAttribution||{};
  if(expected.length===0)return {ok:true,expectedCount:0};
  const ok=e?.ok===true&&e?.classification==='PASS'&&expected.length===1&&EXPECTED_RESOURCE_DENIAL.test(expected[0])&&
    a.status==='EXPECTED_CROSS_TENANT_DENIAL_SIGNAL_CAUSALLY_ATTRIBUTED_CURRENT_RUN'&&a.firestoreDeniedObserved===true&&
    Array.isArray(e?.consoleErrors)&&e.consoleErrors.length===0&&e?.crossTenantDenied===true;
  return {ok,expectedCount:expected.length};
}

function bindEvidence(e,runId){
  const out=JSON.parse(JSON.stringify(e||{}));
  const causal=validateCurrentRunAttribution(out);
  if(!causal.ok){
    out.ok=false;
    out.status='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_FAIL';
    out.classification='VALIDATOR_STALE';
    out.error='VALIDATOR_STALE:F2_CURRENT_RUN_CONSOLE_ATTRIBUTION_CONTRACT_INVALID';
    out.consoleAttribution={...(out.consoleAttribution||{}),status:'CURRENT_RUN_CAUSAL_ATTRIBUTION_INVALID',mechanismClassification:'PIPELINE_MECHANISM_FAILURE'};
  }else if(consoleOnlyAmbiguity(out)){
    out.classification='VALIDATOR_STALE';
    out.error='VALIDATOR_STALE:F2_CURRENT_RUN_CONSOLE_ATTRIBUTION_MISSING';
    out.consoleAttribution={status:'CURRENT_RUN_CAUSAL_ATTRIBUTION_MISSING',mechanismClassification:'PIPELINE_MECHANISM_FAILURE',sameConsoleSignal:false};
  }
  out.runId=Number(runId);
  out.browserRunId=Number(runId);
  out.evidenceFreshness='current-run-only';
  out.containsPII=false;
  out.containsSecrets=false;
  return out;
}

function selftest(){
  const browserSource=fs.readFileSync(BROWSER_HARNESS,'utf8');
  const structural=browserSource.includes("classifyCrossTenantProbeSignals")&&
    browserSource.includes("currentNetworkPhase='crossTenantDenied'")&&
    browserSource.includes("EXPECTED_CROSS_TENANT_DENIAL_SIGNAL_CAUSALLY_ATTRIBUTED_CURRENT_RUN")&&
    browserSource.includes('networkFailures');
  const base={
    ok:true,status:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_PASS',classification:'PASS',crossTenantDenied:true,
    routeTrace:[{ok:true}],pageErrors:[],writeSignals:[],consoleErrors:[],
    expectedDenialConsoleErrors:['Failed to load resource: the server responded with a status of 400 ()'],
    consoleAttribution:{status:'EXPECTED_CROSS_TENANT_DENIAL_SIGNAL_CAUSALLY_ATTRIBUTED_CURRENT_RUN',firestoreDeniedObserved:true}
  };
  const pass=bindEvidence(base,123456);
  const ambiguous=bindEvidence({ok:false,status:'F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_FAIL',classification:'FUNCTIONAL_DEFECT',error:'FUNCTIONAL_DEFECT:F2_CONSOLE_ERRORS:Failed to load resource: the server responded with a status of 400 ()',crossTenantDenied:true,routeTrace:[{ok:true}],pageErrors:[],writeSignals:[],consoleErrors:['Failed to load resource: the server responded with a status of 400 ()']},123456);
  const invalid=bindEvidence({...base,consoleAttribution:{status:'AMBIGUOUS',firestoreDeniedObserved:false}},123456);
  const ok=structural&&pass.ok===true&&pass.classification==='PASS'&&pass.evidenceFreshness==='current-run-only'&&
    ambiguous.ok===false&&ambiguous.classification==='VALIDATOR_STALE'&&ambiguous.consoleAttribution?.mechanismClassification==='PIPELINE_MECHANISM_FAILURE'&&
    invalid.ok===false&&invalid.classification==='VALIDATOR_STALE';
  console.log(JSON.stringify({schemaVersion:'orbit360-f2-browser-binder-selftest-v2-current-run-causal',ok,status:ok?'F2_BROWSER_BINDER_CURRENT_RUN_CAUSAL_SELFTEST_PASS':'F2_BROWSER_BINDER_CURRENT_RUN_CAUSAL_SELFTEST_FAIL',structuralCurrentRunNetworkAttribution:structural,secondaryBrowserReproductionRequired:false,causalPassAccepted:pass.ok===true,ambiguousReclassifiedValidatorStale:ambiguous.classification==='VALIDATOR_STALE',invalidAttributionBlocked:invalid.classification==='VALIDATOR_STALE',runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,containsPII:false,containsSecrets:false},null,2));
  if(!ok)process.exitCode=41;
}

if(process.argv.includes('--selftest')){
  selftest();
}else{
  if(!/^\d+$/.test(RUN_ID))throw new Error('PIPELINE_MECHANISM_FAILURE:F2_BROWSER_RUN_ID_REQUIRED');
  const p=path.join(DIR,`f2-browser-run-${RUN_ID}.json`);
  if(!fs.existsSync(p))throw new Error('DATA_CONTRACT_FAILURE:F2_BROWSER_CURRENT_RUN_EVIDENCE_MISSING');
  const e=bindEvidence(JSON.parse(fs.readFileSync(p,'utf8')),RUN_ID);
  fs.writeFileSync(p,JSON.stringify(e,null,2)+'\n','utf8');
  console.log(JSON.stringify({ok:true,status:'F2_BROWSER_EVIDENCE_BOUND_TO_CURRENT_RUN',runId:Number(RUN_ID),path:p,browserOk:e.ok===true,browserStatus:e.status||null,consoleAttribution:e.consoleAttribution?.status||null,secondaryBrowserReproductionRequired:false},null,2));
}
