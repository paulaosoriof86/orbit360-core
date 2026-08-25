#!/usr/bin/env node
'use strict';

const EXPECTED_RESOURCE_DENIAL=/Failed to load resource:.*status of (400|403)/i;

export function classifyCrossTenantProbeSignals({crossTenantDenied=false,consoleErrors=[],pageErrors=[],networkFailures=[]}={}){
  const consoles=[].concat(consoleErrors||[]).map(v=>String(v||'').trim()).filter(Boolean);
  const pages=[].concat(pageErrors||[]).map(v=>String(v||'').trim()).filter(Boolean);
  const network=[].concat(networkFailures||[]).map(v=>({phase:String(v?.phase||''),provider:String(v?.provider||''),status:Number(v?.status||0)}));
  const firestoreDenied=network.some(v=>v.phase==='crossTenantDenied'&&v.provider==='firestore'&&(v.status===400||v.status===403));
  if(crossTenantDenied!==true)return{ok:false,code:'SECURITY_FAILURE:F2_CROSS_TENANT_READ_NOT_DENIED',expectedConsoleErrors:[],residualConsoleErrors:consoles};
  if(pages.length)return{ok:false,code:'FUNCTIONAL_DEFECT:F2_CROSS_TENANT_PROBE_PAGE_ERROR',expectedConsoleErrors:[],residualConsoleErrors:consoles};
  if(consoles.length===0)return{ok:true,code:'PASS',expectedConsoleErrors:[],residualConsoleErrors:[],firestoreDeniedObserved:firestoreDenied};
  if(consoles.length>1)return{ok:false,code:'VALIDATOR_STALE:F2_CROSS_TENANT_PROBE_MULTIPLE_CONSOLE_ERRORS',expectedConsoleErrors:[],residualConsoleErrors:consoles};
  if(!EXPECTED_RESOURCE_DENIAL.test(consoles[0]))return{ok:false,code:'FUNCTIONAL_DEFECT:F2_CROSS_TENANT_PROBE_UNEXPECTED_CONSOLE_ERROR',expectedConsoleErrors:[],residualConsoleErrors:consoles};
  if(!firestoreDenied)return{ok:false,code:'VALIDATOR_STALE:F2_CROSS_TENANT_PROBE_CONSOLE_WITHOUT_FIRESTORE_DENIAL_RESPONSE',expectedConsoleErrors:[],residualConsoleErrors:consoles};
  return{ok:true,code:'PASS',expectedConsoleErrors:consoles,residualConsoleErrors:[],firestoreDeniedObserved:true};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const expected=classifyCrossTenantProbeSignals({crossTenantDenied:true,consoleErrors:['Failed to load resource: the server responded with a status of 400 ()'],pageErrors:[],networkFailures:[{phase:'crossTenantDenied',provider:'firestore',status:400}]});
  const unexpected=classifyCrossTenantProbeSignals({crossTenantDenied:true,consoleErrors:['Failed to load resource: the server responded with a status of 400 ()'],pageErrors:[],networkFailures:[{phase:'runtime',provider:'other',status:400}]});
  const clean=classifyCrossTenantProbeSignals({crossTenantDenied:true,consoleErrors:[],pageErrors:[],networkFailures:[]});
  const ok=expected.ok===true&&expected.expectedConsoleErrors.length===1&&unexpected.ok===false&&unexpected.residualConsoleErrors.length===1&&clean.ok===true;
  console.log(JSON.stringify({schemaVersion:'orbit360-f2-cross-tenant-console-attribution-v1',ok,status:ok?'F2_CROSS_TENANT_CONSOLE_ATTRIBUTION_SELFTEST_PASS':'F2_CROSS_TENANT_CONSOLE_ATTRIBUTION_SELFTEST_FAIL',expectedDenialIsolated:expected.ok===true,unrelated400Rejected:unexpected.ok===false,cleanDenialAccepted:clean.ok===true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,containsPII:false,containsSecrets:false},null,2));
  if(!ok)process.exit(41);
}
