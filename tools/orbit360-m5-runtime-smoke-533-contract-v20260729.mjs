#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const RC='4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b';
const INPUT='tools/orbit360-m5-runtime-package-input-533-v20260729.json';
const AUTH='tools/orbit360-m5-runtime-authorization-533-v20260729.json';
const OVERLAY='tools/orbit360-m5-release-candidate-control-overlay-532-v20260729.json';
const DESC='tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json';
const BROWSER='tools/orbit360-m5-runtime-smoke-533-browser-v20260729.mjs';
const CLOSER='tools/orbit360-m5-runtime-smoke-533-close-v20260729.mjs';
const LEGACY='tools/orbit360-m5-runtime-smoke-525-browser-v20260729.mjs';
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
const json=r=>JSON.parse(read(r));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const checks=[];
const check=(id,ok,d='')=>checks.push({id,ok:Boolean(ok),detail:String(d||'').slice(0,240)});
try{
  const input=json(INPUT),auth=json(AUTH),overlay=json(OVERLAY),descriptor=json(DESC);
  const browser=read(BROWSER),closer=read(CLOSER),legacy=read(LEGACY);
  const multirol=read('orbit360-platform/core/session-multirol-visibility-v20260716.js');
  const sw=read('orbit360-platform/sw.js');
  const rows=[].concat(descriptor.criticalAssets||[]).map(rel=>{const file=path.join(ROOT,'orbit360-platform',rel);return{path:rel,present:fs.existsSync(file),sha256:fs.existsSync(file)?sha(fs.readFileSync(file)):''};});
  const computedHash=sha(JSON.stringify(rows.map(r=>({path:r.path,sha256:r.sha256}))));
  const browserSha=execFileSync('git',['hash-object',BROWSER],{cwd:ROOT,encoding:'utf8'}).trim();
  const closerSha=execFileSync('git',['hash-object',CLOSER],{cwd:ROOT,encoding:'utf8'}).trim();
  const legacySha=execFileSync('git',['hash-object',LEGACY],{cwd:ROOT,encoding:'utf8'}).trim();
  check('OVERLAY_532',overlay.status==='M5_HOSTING_532_CLOSED_26_OF_26_READY_TO_REQUEST_RUNTIME_AUTHORIZATION'&&overlay.releaseCandidate?.hash===RC&&overlay.publicParity?.assetsExpected===26&&overlay.publicParity?.assetsMatched===26&&overlay.publicParity?.mismatchCount===0&&overlay.publicParity?.remoteParity===true&&overlay.authorization?.hostingAuthorizationConsumed===true&&overlay.authorization?.runtimeSmokeAuthorized===false&&overlay.authorization?.allowedRuntimeExecutions===0&&overlay.authorization?.runtimeRequestCreated===false);
  check('AUTH',auth.schemaVersion==='orbit360-m5-runtime-authorization-533-v1'&&auth.contractVersion==='5.0.33'&&auth.authorizationSource==='user_autorizado_runtime_20260729_after_hosting_532_pass'&&auth.explicitAuthorization===true&&auth.runtimeSmokeAuthorized===true&&auth.allowedExecutions===1&&auth.releaseCandidateHash===RC&&auth.packageInput===INPUT&&auth.immutableAfterCreation===true&&auth.secrets===true&&auth.firestoreRead===true&&auth.firestoreWrite===false&&auth.operationalWrites===false&&auth.runtime===true&&auth.browser===true&&auth.deploy===false&&auth.hostingDeploy===false&&auth.functionsDeploy===false&&auth.rulesDeploy===false&&auth.production===false&&auth.mergeMain===false&&auth.policies===false&&auth.visualReview===false&&auth['pólizas']===false);
  check('INPUT',input.schemaVersion==='orbit360-m5-runtime-package-input-533-v1'&&input.contractVersion==='5.0.33'&&input.immutableAfterCreation===true&&input.sourceControlOverlay===OVERLAY&&input.descriptor===DESC&&input.expectedCandidateHash===RC&&input.criticalAssets===43&&input.remoteAssetsExpected===26&&input.remoteAssetsMatched===26&&input.browser===BROWSER&&input.closer===CLOSER&&input.snapshotTool==='tools/orbit360-m5-runtime-smoke-live-readonly-v20260729.mjs');
  check('DESCRIPTOR',descriptor.schemaVersion==='orbit360-m5-release-candidate-descriptor-v1'&&descriptor.criticalAssets?.length===43&&descriptor.remoteAssets?.length===26&&descriptor.criticalAssets.includes('core/session-multirol-visibility-v20260716.js')&&descriptor.remoteAssets.includes('core/session-multirol-visibility-v20260716.js')&&descriptor.criticalAssets.includes('sw.js')&&descriptor.remoteAssets.includes('sw.js'));
  check('RC_HASH',rows.length===43&&rows.every(r=>r.present&&r.sha256)&&computedHash===RC,computedHash);
  check('LEGACY_PROBE_IMMUTABLE',legacySha==='70d6ad22553bd0387fa08dd2eeeb6e3b9834fa12'&&legacy.includes("contractVersion:'5.0.25'")&&legacy.includes('MOBILE_MENU_INCOMPLETE')&&legacy.includes("scopeSelector:'#asg-ficha'")&&legacy.includes('expectedText:state.insurerName'),legacySha);
  check('BROWSER_ADAPTER_BINDING',browser.includes("contractVersion:'5.0.33'")&&browser.includes(`const RC='${RC}'`)&&browser.includes(`const LEGACY='${LEGACY}'`)&&browser.includes('functionalMultirolEvidence')&&browser.includes("expectedMultirolCompatibilityVersion:'20260729.2'")&&browser.includes("expectedCanonicalAccessOwnerVersion:'20260729.3'")&&browser.includes("targetPublicParityRequired:'26/26'"));
  check('CLOSER_BINDING',closer.includes("contractVersion:'5.0.33'")&&closer.includes(`const RC='${RC}'`)&&closer.includes("M5_RUNTIME_SMOKE_533_CLOSED_SUCCESS")&&closer.includes("publicParityPreserved:'26/26'")&&closer.includes('multirolCompatibilityFunctionalReady:multirolCompatibilityOk'));
  check('MULTIROL_OWNER',multirol.includes("var VERSION = '20260729.2'")&&multirol.includes("ownerMode: 'immutable-delegating-facade'")&&multirol.includes('advisorInsurerReadOnly: true')&&multirol.includes('Orbit.router.rebuildSidebar'));
  check('PWA_GENERATION',sw.includes("var CACHE = 'orbit360-v20260729-11-multirol-owner';"));
  check('TARGET',input.target?.projectId==='ays-orbit-360-lab'&&input.target?.canonicalUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app'&&input.target?.reviewUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app/ays-lab-preview.html');
  check('PACKAGE_ZERO_CAPS',input.packageCapabilities?.secrets===false&&input.packageCapabilities?.firestoreRead===false&&input.packageCapabilities?.writes===false&&input.packageCapabilities?.runtime===false&&input.packageCapabilities?.browser===false&&input.packageCapabilities?.deploy===false&&input.packageCapabilities?.production===false);
  check('RUNTIME_CEILING',input.runtimeCapabilities?.secrets===true&&input.runtimeCapabilities?.firestoreRead===true&&input.runtimeCapabilities?.writes===false&&input.runtimeCapabilities?.runtime===true&&input.runtimeCapabilities?.browser===true&&input.runtimeCapabilities?.deploy===false&&input.runtimeCapabilities?.production===false);
  const failed=checks.filter(x=>!x.ok);
  const out={schemaVersion:'orbit360-m5-runtime-smoke-533-contract-summary-v1',contractVersion:'5.0.33',ok:failed.length===0,status:failed.length?'M5_RUNTIME_SMOKE_533_CONTRACT_FAIL':'M5_RUNTIME_SMOKE_533_CONTRACT_PASS',releaseCandidateHash:RC,criticalAssets:43,remoteAssetsExpected:26,remoteAssetsMatched:overlay.publicParity?.assetsMatched||0,remoteParity:overlay.publicParity?.remoteParity===true,browserBlobSha:browserSha,closerBlobSha:closerSha,legacyProbeBlobSha:legacySha,legacyProbeContractVersion:'5.0.25',packageInputImmutable:input.immutableAfterCreation===true,multirolCompatibilityVersion:'20260729.2',accessOwnerVersion:'20260729.3',academiaPolicyVersion:'20260729.2',visibleTechnicalCopyPredicateVersion:'20260729.1',responsiveTitleResolverVersion:'20260729.1',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,secrets:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false,containsPII:false,containsSecrets:false};
  const outPath=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-533-contract-summary.json');
  fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
}catch(error){console.error(String(error&&error.stack||error));process.exit(41);}
