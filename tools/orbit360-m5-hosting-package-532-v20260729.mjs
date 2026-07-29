#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validatePackageInput,validateEvidenceLedger} from './orbit360-m5-hosting-control-plane-contract-531-v20260729.mjs';

const ROOT=process.cwd();
const PLAT=path.join(ROOT,'orbit360-platform');
const OUT=path.join(PLAT,'runtime-gate-crm-v20260716/m5-hosting-package-532-summary.json');
const INPUT_REL='tools/orbit360-m5-hosting-package-input-531-v20260729.json';
const LEDGER_REL='tools/orbit360-m5-hosting-evidence-ledger-531-v20260729.json';
const DESCRIPTOR_REL='tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json';
const STOP_REL='tools/orbit360-m5-release-candidate-hosting-stop-overlay-530-v20260729.json';
const CONTROL_REL='tools/orbit360-m5-release-candidate-control-overlay-531-v20260729.json';
const FREEZE_REL='tools/orbit360-m5-hosting-control-plane-531-freeze-v20260729.json';
const AUTH_REL='tools/orbit360-m5-hosting-authorization-532-v20260729.json';
const REQUEST_REL='tools/orbit360-m5-hosting-request-532-v20260729.json';
const HASH='4bf3c8025654f43f6e4af20e5d16115bdc0851352ccddc6f099649405883cf3b';

const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const checks=[];
const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail||'').slice(0,220)});
const assetRow=rel=>{const p=path.join(PLAT,rel);return {path:rel,present:fs.existsSync(p),sha256:fs.existsSync(p)?sha(fs.readFileSync(p)):''};};

try{
  const input=json(INPUT_REL),ledger=json(LEDGER_REL),descriptor=json(DESCRIPTOR_REL),stop=json(STOP_REL),control=json(CONTROL_REL),freeze=json(FREEZE_REL),auth=json(AUTH_REL),firebase=json('firebase.json');
  const rows=(descriptor.criticalAssets||[]).map(assetRow);
  const pkg=validatePackageInput({input,descriptor,assetRows:rows,firebaseConfig:firebase,stopOverlay:stop});
  const led=validateEvidenceLedger(ledger,INPUT_REL);
  check('CONTROL_531',control.status==='M5_HOSTING_CONTROL_PLANE_531_STATIC_PASS_READY_FOR_NEW_HOSTING_AUTHORIZATION'&&control.authorization?.hostingLabDeliveryAuthorized===false&&control.authorization?.allowedHostingExecutions===0);
  check('FREEZE_531',freeze.status==='M5_HOSTING_CONTROL_PLANE_531_STATIC_PASS'&&freeze.evidence?.packageInputImmutable===true&&freeze.evidence?.evidenceLedgerSeparate===true&&freeze.evidence?.packageResultStableAfterEvidence===true);
  check('PACKAGE_INPUT',pkg.ok,pkg.errors.join(','));
  check('LEDGER_SEPARATE',led.ok&&ledger.appendOnly===true,led.errors.join(','));
  check('CANDIDATE',pkg.computedHash===HASH&&auth.releaseCandidateHash===HASH&&input.expectedCandidateHash===HASH);
  check('COUNTS',pkg.criticalAssets===43&&pkg.remoteAssetsExpected===26&&auth.criticalAssets===43&&auth.remoteAssetsExpected===26);
  check('AUTH_SCHEMA',auth.schemaVersion==='orbit360-m5-hosting-authorization-532-v1'&&auth.contractVersion==='5.0.32'&&auth.explicitAuthorization===true&&auth.immutableAfterCreation===true);
  check('AUTH_SOURCE',auth.authorizationSource==='user_autorizado_hosting_nuevo_20260729_post_531');
  check('AUTH_EXECUTION',auth.hostingLabDeliveryAuthorized===true&&auth.allowedExecutions===1&&auth.hostingOnly===true);
  check('AUTH_TARGET',auth.target?.projectId==='ays-orbit-360-lab'&&auth.target?.channel==='orbit360-ays-lab'&&auth.target?.canonicalUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app');
  check('AUTH_FORBIDDEN',auth.firestoreRead===false&&auth.firestoreWrite===false&&auth.operationalWrites===false&&auth.browser===false&&auth.runtimeSmoke===false&&auth.functionsDeploy===false&&auth.rulesDeploy===false&&auth.production===false&&auth.mergeMain===false&&auth.policies===false&&auth.pólizas===false&&auth.visualReview===false);
  check('REQUEST_ABSENT',!fs.existsSync(path.join(ROOT,REQUEST_REL)));
  check('PACKAGE_INPUT_IMMUTABLE',input.immutableAfterCreation===true&&control.controlPlane?.packageInputImmutable===true);
  check('LEDGER_APPEND_ONLY',ledger.appendOnly===true&&control.controlPlane?.evidenceLedgerSeparate===true);
  check('MULTIROL_BOUND',descriptor.criticalAssets?.includes('core/session-multirol-visibility-v20260716.js')&&descriptor.remoteAssets?.includes('core/session-multirol-visibility-v20260716.js'));
  check('PWA_BOUND',descriptor.remoteAssets?.includes('sw.js')&&descriptor.requiredBindings?.pwaCacheGeneration==='orbit360-v20260729-11-multirol-owner');
  check('BASELINE',descriptor.baseline?.clients===414&&descriptor.baseline?.insurers===26&&descriptor.baseline?.advisors===7&&descriptor.baseline?.missingCurrency===0&&descriptor.baseline?.targetOnlyClients===0&&descriptor.baseline?.targetOnlyInsurers===0);
  check('SANITIZED',auth.containsPII===false&&auth.containsSecrets===false&&input.containsPII===false&&input.containsSecrets===false&&ledger.containsPII===false&&ledger.containsSecrets===false);
  const failed=checks.filter(x=>!x.ok);
  const out={schemaVersion:'orbit360-m5-hosting-package-532-summary-v1',generatedAt:new Date().toISOString(),gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.32',ok:failed.length===0,status:failed.length?'M5_HOSTING_532_PACKAGE_FAIL':'M5_HOSTING_532_PACKAGE_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,releaseCandidateHash:pkg.computedHash,criticalAssets:pkg.criticalAssets,remoteAssetsExpected:pkg.remoteAssetsExpected,packageInput:INPUT_REL,evidenceLedger:LEDGER_REL,authorization:AUTH_REL,requestPresent:false,secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false,containsPII:false,containsSecrets:false};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
}catch(error){const out={schemaVersion:'orbit360-m5-hosting-package-532-summary-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.32',ok:false,status:'PIPELINE_MECHANISM_FAILURE',failed:1,error:String(error&&error.message||error).slice(0,300),secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,production:false,containsPII:false,containsSecrets:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.error(out.error);process.exit(41);}
