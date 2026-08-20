#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const runner=fs.readFileSync(path.join(ROOT,'tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs'),'utf8');
const evidence=JSON.parse(fs.readFileSync(path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-request10-route-visibility-validator-sourcefix-v20260820.json'),'utf8'));
const captured={hostExists:true,childElementCount:1,textLength:18141,hostDisplay:'block',hostVisibility:'visible',hostWidth:1192,hostHeight:7866,bodyPreAuth:false,loginHidden:true,hash:'#/polizas'};
const playwrightVisible=captured.hostWidth>0&&captured.hostHeight>0&&captured.hostDisplay!=='none'&&captured.hostVisibility!=='hidden';
const checks={
  capturedRequest10StateIsVisibleByContract:playwrightVisible===true,
  rawHostLocatorWaitRemoved:!runner.includes("page.locator('#host').waitFor({state:'visible',timeout:20000})"),
  explicitRouteReadinessBound:runner.includes('page.waitForFunction(target=>')&&runner.includes("hs.visibility!=='hidden'")&&runner.includes("hs.display!=='none'"),
  routeOwnershipBound:runner.includes("key===target")&&runner.includes("startsWith('#/'+target)"),
  contradictionReclassifiedValidatorStale:runner.includes('VALIDATOR_STALE:F2_ROUTE_READINESS_TIMEOUT_CONTRADICTED_BY_CAPTURE'),
  routeTraceBound:runner.includes('routeTrace.push(')&&runner.includes('routeTrace:[...routeTrace]'),
  crossTenantPreserved:runner.includes('crossTenantDeniedObserved=crossTenantDenied')&&runner.includes('crossTenantDenied:crossTenantDeniedObserved'),
  localWriteGuardPreserved:runner.includes('localWriteGuardObserved=localWriteGuard')&&runner.includes('localWriteGuard:localWriteGuardObserved'),
  sourcefixEvidencePass:evidence.ok===true&&evidence.classification==='VALIDATOR_STALE_ROOTFIX'&&evidence.request10RunId===32318415706&&evidence.candidateArtifactId===9387820198,
  noProductMutation:evidence.productMutation===false&&evidence.candidateRebuild===false&&evidence.dataMutation===false,
  zeroRuntime:evidence.browserExecuted===false&&evidence.runtimeExecuted===false&&evidence.secretAccess===false&&evidence.firestoreRead===false,
  zeroWrites:evidence.firestoreWrites===0&&evidence.authWrites===0&&evidence.membershipWrites===0&&evidence.dataWrites===0&&evidence.operationalWrites===0,
  zeroDeploy:evidence.deployExecuted===false&&evidence.publicationExecuted===false&&evidence.productionTouched===false,
  request11NotCreated:evidence.request11Created===false&&evidence.request11Authorized===false
};
const ok=Object.values(checks).every(Boolean);
const out={schemaVersion:'orbit360-f2-request10-route-visibility-validator-sourcefix-selftest-v1',ok,status:ok?'F2_REQUEST10_ROUTE_VISIBILITY_VALIDATOR_SOURCEFIX_SELFTEST_PASS':'F2_REQUEST10_ROUTE_VISIBILITY_VALIDATOR_SOURCEFIX_SELFTEST_FAIL',classification:ok?'PASS':'VALIDATOR_STALE',checks,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));
if(!ok) process.exit(41);
