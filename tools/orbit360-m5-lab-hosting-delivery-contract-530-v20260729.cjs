#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform');
const VERSION='5.0.30';
const REQUEST='tools/orbit360-m5-lab-hosting-delivery-request-530-v20260729.json';
const DESCRIPTOR='tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json';
const FILES={
  control:'tools/orbit360-m5-release-candidate-control-overlay-529-v20260729.json',
  authorization:'tools/orbit360-m5-lab-hosting-delivery-authorization-530-v20260729.json',
  freeze:'tools/orbit360-m5-lab-hosting-delivery-freeze-530-v20260729.json',
  lifecycle:'tools/orbit360-validator-lifecycle-contract-m5-lab-hosting-delivery-530-v20260729.json',
  overlay:'tools/orbit360-gate-contract-overlay-m5-lab-hosting-delivery-530-v20260729.json',
  registry:'tools/orbit360-gate-contract-registry-extension-m5-lab-hosting-delivery-530-v20260729.json',
  readiness:'tools/orbit360-m5-release-candidate-readiness-530-v20260729.mjs',
  workflow:'.github/workflows/orbit360-m5-lab-hosting-delivery-530-v20260729.yml'
};
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:!!ok,detail:String(detail||'').slice(0,240)});
try{
  const descriptor=json(DESCRIPTOR),control=json(FILES.control),auth=json(FILES.authorization),freeze=json(FILES.freeze),lifecycle=json(FILES.lifecycle),overlay=json(FILES.overlay),registry=json(FILES.registry),firebase=json('firebase.json');
  const requestPresent=fs.existsSync(path.join(ROOT,REQUEST));
  const assets=[].concat(descriptor.criticalAssets||[]).map(rel=>{const file=path.join(PLAT,rel),present=fs.existsSync(file);return{path:rel,present,sha256:present?sha(fs.readFileSync(file)):''};});
  const candidateHash=sha(JSON.stringify(assets.map(row=>({path:row.path,sha256:row.sha256}))));
  const multirol=read('orbit360-platform/core/session-multirol-visibility-v20260716.js'),access=read('orbit360-platform/core/access-role-session-owner-v20260728.js'),sw=read('orbit360-platform/sw.js');

  check('CONTROL_529',control.status==='M5_MULTIROL_OWNER_REMEDIATION_529_STATIC_PASS_READY_TO_REQUEST_NEW_HOSTING_LAB_DELIVERY'&&control.remediation529?.closed===true&&control.remediation529?.failed===0&&control.authorization?.hostingDeployAuthorized===false&&control.authorization?.allowedHostingDeployExecutions===0);
  check('DESCRIPTOR_SCHEMA',descriptor.schemaVersion==='orbit360-m5-release-candidate-descriptor-v1'&&descriptor.contractVersion===VERSION);
  check('DESCRIPTOR_COUNTS',descriptor.criticalAssets?.length===43&&descriptor.remoteAssets?.length===26);
  check('DESCRIPTOR_MULTIROL',descriptor.criticalAssets?.includes('core/session-multirol-visibility-v20260716.js')&&descriptor.remoteAssets?.includes('core/session-multirol-visibility-v20260716.js'));
  check('ASSETS_PRESENT',assets.length===43&&assets.every(row=>row.present));
  check('CANDIDATE_HASH',candidateHash.length===64,candidateHash);
  check('BINDINGS',((access.includes("var VERSION = '20260729.3'")||access.includes("var VERSION='20260729.3'")))&&((multirol.includes("var VERSION = '20260729.2'")||multirol.includes("var VERSION='20260729.2'")))&&multirol.includes('immutable-delegating-facade')&&sw.includes("var CACHE = 'orbit360-v20260729-11-multirol-owner';"));
  check('AUTH',auth.contractVersion===VERSION&&auth.explicitAuthorization===true&&auth.hostingLabDeliveryAuthorized===true&&auth.allowedExecutions===1&&auth.requestCreated===requestPresent&&auth.criticalAssets===43&&auth.remoteAssetsExpected===26&&auth.descriptor===DESCRIPTOR&&(requestPresent?auth.releaseCandidateHash===candidateHash:auth.releaseCandidateHash===null));
  check('AUTH_SCOPE',auth.secrets===true&&auth.deploy===true&&auth.hostingOnly===true&&auth.firestoreRead===false&&auth.firestoreWrite===false&&auth.operationalWrites===false&&auth.browser===false&&auth.runtimeSmoke===false&&auth.functionsDeploy===false&&auth.rulesDeploy===false&&auth.production===false&&auth.mergeMain===false&&auth.policies===false&&auth.pólizas===false&&auth.visualReview===false);
  check('FREEZE',freeze.contractVersion===VERSION&&freeze.authorization?.hostingLabDeliveryAuthorized===true&&freeze.authorization?.allowedExecutions===1&&freeze.authorization?.requestCreated===requestPresent&&freeze.baseline?.criticalAssets===43&&freeze.baseline?.remoteAssetsExpected===26&&(requestPresent?freeze.baseline?.newReleaseCandidateHash===candidateHash:freeze.baseline?.newReleaseCandidateHash===null));
  check('LIFECYCLE',lifecycle.gateContractVersion===VERSION&&lifecycle.executionProfile?.phase==='M5_LAB_HOSTING_DELIVERY'&&lifecycle.authorization?.requestCreated===requestPresent&&(requestPresent?lifecycle.baseline?.releaseCandidateHash===candidateHash:lifecycle.baseline?.releaseCandidateHash===null));
  const cap=lifecycle.executionProfile?.capabilities||{};check('CAPABILITIES',cap.secrets===true&&cap.firestoreRead===false&&cap.writes===false&&cap.runtime===false&&cap.browser===false&&cap.deploy===true&&cap.functionsDeploy===false&&cap.rulesDeploy===false&&cap.production===false);
  check('OVERLAY',overlay.contractVersion===VERSION&&overlay.descriptor===DESCRIPTOR&&overlay.required?.criticalAssets===43&&overlay.required?.remoteAssetsExpected===26&&overlay.required?.remoteAssetsMatchedAfter===26&&overlay.required?.mismatchCountAfter===0&&(requestPresent?overlay.required?.releaseCandidateHash===candidateHash:overlay.required?.releaseCandidateHash===null));
  check('REGISTRY',registry.gates?.length===1&&registry.gates[0]?.contractVersion===VERSION&&registry.gates[0]?.phase==='M5_LAB_HOSTING_DELIVERY');
  check('FIREBASE',firebase.hosting?.public==='orbit360-platform'&&Array.isArray(firebase.hosting?.ignore)&&firebase.hosting.ignore.includes('docs/**')&&!firebase.hosting?.rewrites);
  check('READINESS_TOOL',fs.existsSync(path.join(ROOT,FILES.readiness)));
  check('WORKFLOW_PRESENT',fs.existsSync(path.join(ROOT,FILES.workflow)));
  if(requestPresent){
    const request=json(REQUEST),parent=cp.execFileSync('git',['rev-parse','HEAD^'],{cwd:ROOT,encoding:'utf8'}).trim();
    check('REQUEST_SCHEMA',request.schemaVersion==='orbit360-m5-lab-hosting-delivery-request-530-v1'&&request.gateId==='block5-release-candidate-visualization-v20260728'&&request.contractVersion===VERSION);
    check('REQUEST_BINDING',request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.authorizedBaseCommit===parent&&request.allowedExecutions===1&&request.hostingLabDelivery===true&&request.releaseCandidateHash===candidateHash&&request.criticalAssets===43&&request.remoteAssetsExpected===26);
    check('REQUEST_TARGET',request.projectId==='ays-orbit-360-lab'&&request.channel==='orbit360-ays-lab'&&request.canonicalUrl==='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app');
    check('REQUEST_SCOPE',request.secrets===true&&request.deploy===true&&request.hostingOnly===true&&request.firestoreRead===false&&request.firestoreWrite===false&&request.operationalWrites===false&&request.browser===false&&request.runtimeSmoke===false&&request.functionsDeploy===false&&request.rulesDeploy===false&&request.production===false&&request.mergeMain===false&&request.policies===false&&request.pólizas===false&&request.visualReview===false&&request.containsPII===false&&request.containsSecrets===false);
  }
  const failed=checks.filter(row=>!row.ok),out={schemaVersion:'orbit360-m5-lab-hosting-delivery-contract-530-summary-v1',contractVersion:VERSION,ok:failed.length===0,status:failed.length?'M5_LAB_HOSTING_530_CONTRACT_FAIL':'M5_LAB_HOSTING_530_CONTRACT_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(row=>row.id),requestPresent,releaseCandidateHash:candidateHash,criticalAssets:43,remoteAssets:26,descriptor:DESCRIPTOR,projectId:'ays-orbit-360-lab',channel:'orbit360-ays-lab',secretsRequired:true,firestoreRead:false,firestoreWrites:0,operationalWrites:0,browser:false,runtimeSmoke:false,hostingDeploy:true,functionsDeploy:false,rulesDeploy:false,production:false,containsPII:false,containsSecrets:false};
  const outPath=path.join(PLAT,'runtime-gate-crm-v20260716/m5-lab-hosting-delivery-530-contract-summary.json');fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
}catch(error){console.error(String(error&&error.stack||error));process.exit(41);}
