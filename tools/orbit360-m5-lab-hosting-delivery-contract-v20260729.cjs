#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform');
const EXPECTED_HASH='b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091';
const REQUEST='tools/orbit360-m5-lab-hosting-delivery-request-v20260729.json';
const ASSETS=['index.html','ays-lab-preview.html','styles/tokens.css','styles/base.css','styles/infra.css','styles/v1197-empalme.css','styles/client-insurer-visual-contract-v20260720.css','styles/client-insurer-edit-mode-v20260722.css','styles/aseguradoras-candidate.css','sw.js','core/pwa.js','core/router-tenant-config-bootstrap.js','core/router.js','core/auth.js','modules/cliente360.js','modules/aseguradoras.js','core/client-insurer-edit-owner-v20260722.js','core/client-insurer-operational-directory-owner-v20260722.js','core/client-insurer-visual-stability-barrier-v20260721.js','core/client-insurer-visual-contract-v20260720.js','core/operational-directory-field-policy-v20260722.js','core/aseguradoras-credentials-provider-lab-v20260720.js','core/insurer-secure-target-bridge-v20260720.js','data/tenant-alianzas-soluciones-insurers-p10.js','product-readonly.html','core/backend-product-readiness-contract-p0.js','core/backend-product-readonly-bootstrap-p0.js','core/membership-multirol-effective-p0.js','core/tenant-access-policy-product-p0.js','core/product-role-taxonomy-p0.js','core/access-role-session-owner-v20260728.js','core/product-runtime-provider-contracts-p0.js','data/store-firestore-product-readonly-p0.js','core/tenant-activation-runtime-contract-p0.js','core/membership-multirol-contract-p0.js','core/tenant-access-policy-contract-p0.js','core/product-query-planner-contract-p0.js','core/tenant-canonical-paths-contract-p0.js','core/tenant-access-policy-effective-p0.js','core/aseguradoras-bank-account-visibility-policy-p0.js','data/academia-v1230-operational-directory-v20260722.js','core/academia-static-content-write-policy-v20260729.js'];
const REMOTE=['index.html','ays-lab-preview.html','styles/tokens.css','styles/base.css','styles/infra.css','styles/v1197-empalme.css','styles/client-insurer-visual-contract-v20260720.css','styles/client-insurer-edit-mode-v20260722.css','styles/aseguradoras-candidate.css','sw.js','core/pwa.js','modules/aseguradoras.js','core/router-tenant-config-bootstrap.js','core/client-insurer-edit-owner-v20260722.js','core/client-insurer-operational-directory-owner-v20260722.js','core/client-insurer-visual-stability-barrier-v20260721.js','core/client-insurer-visual-contract-v20260720.js','data/academia-v1230-operational-directory-v20260722.js','data/tenant-alianzas-soluciones-insurers-p10.js','core/operational-directory-field-policy-v20260722.js','core/aseguradoras-credentials-provider-lab-v20260720.js','core/insurer-secure-target-bridge-v20260720.js','core/product-role-taxonomy-p0.js','core/access-role-session-owner-v20260728.js','core/academia-static-content-write-policy-v20260729.js'];
function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8')}function json(rel){return JSON.parse(read(rel))}function sha(b){return crypto.createHash('sha256').update(b).digest('hex')}
const checks=[];function check(id,ok,detail=''){checks.push({id,ok:!!ok,detail:String(detail||'').slice(0,200)});}
try{
 const closure=json('orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-remediation-static-506-closure.json');
 const globalFreeze=json('tools/orbit360-m5-release-candidate-freeze-v20260728.json');
 const auth=json('tools/orbit360-m5-lab-hosting-delivery-authorization-v20260729.json');
 const freeze=json('tools/orbit360-m5-lab-hosting-delivery-freeze-v20260729.json');
 const lifecycle=json('tools/orbit360-validator-lifecycle-contract-m5-lab-hosting-delivery-v20260729.json');
 const overlay=json('tools/orbit360-gate-contract-overlay-m5-lab-hosting-delivery-v20260729.json');
 const registry=json('tools/orbit360-gate-contract-registry-extension-m5-lab-hosting-delivery-v20260729.json');
 const firebase=json('firebase.json');
 const requestPresent=fs.existsSync(path.join(ROOT,REQUEST));
 const rows=ASSETS.map(p=>({path:p,present:fs.existsSync(path.join(PLAT,p)),sha256:fs.existsSync(path.join(PLAT,p))?sha(fs.readFileSync(path.join(PLAT,p))):''}));
 const candidateHash=sha(JSON.stringify(rows.map(x=>({path:x.path,sha256:x.sha256}))));
 check('CLOSURE_STATUS',closure.status==='M5_RUNTIME_SMOKE_REMEDIATION_STATIC_CLOSED_NEW_RC_READY_FOR_LAB_DELIVERY');
 check('CLOSURE_HASH',closure.releaseCandidate?.hash===EXPECTED_HASH);
 check('CLOSURE_COUNTS',closure.releaseCandidate?.criticalAssets===42&&closure.remoteLab?.assetsExpected===25&&closure.remoteLab?.assetsMatched===22&&closure.remoteLab?.mismatchCount===3);
 check('CLOSURE_APPROVAL',closure.approvalReadyForLabDelivery===true&&closure.hostingDeployAuthorized===false&&closure.allowedHostingDeployExecutions===0);
 check('GLOBAL_FREEZE',globalFreeze.status==='M5_STATIC_ROOT_CAUSE_REMEDIATION_CLOSED_NEW_RC_HOSTING_DELIVERY_AUTHORIZATION_REQUIRED'&&globalFreeze.releaseCandidate?.hash===EXPECTED_HASH);
 check('AUTH_VERSION',auth.contractVersion==='5.0.7'&&auth.explicitAuthorization===true);
 check('AUTH_ONE_SHOT',auth.hostingLabDeliveryAuthorized===true&&auth.allowedExecutions===1&&auth.requestCreated===requestPresent);
 check('AUTH_HASH',auth.releaseCandidateHash===EXPECTED_HASH&&auth.criticalAssets===42&&auth.remoteAssetsExpected===25);
 check('AUTH_TARGET',auth.projectId==='ays-orbit-360-lab'&&auth.channel==='orbit360-ays-lab');
 check('AUTH_CAPABILITIES',auth.secrets===true&&auth.deploy===true&&auth.hostingOnly===true&&auth.firestoreRead===false&&auth.firestoreWrite===false&&auth.operationalWrites===false&&auth.browser===false&&auth.runtimeSmoke===false&&auth.rulesDeploy===false&&auth.functionsDeploy===false&&auth.production===false&&auth.mergeMain===false&&auth.policies===false);
 check('FREEZE_VERSION',freeze.contractVersion==='5.0.7');
 check('FREEZE_STATE',requestPresent?freeze.status==='REQUEST_CREATED_AWAITING_ONE_HOSTING_LAB_DELIVERY':freeze.status==='READY_FOR_PACKAGE_CHECK_BEFORE_ONE_HOSTING_LAB_DELIVERY');
 check('FREEZE_REQUEST',freeze.authorization?.hostingLabDeliveryAuthorized===true&&freeze.authorization?.allowedExecutions===1&&freeze.authorization?.requestCreated===requestPresent);
 check('FREEZE_HASH',freeze.baseline?.releaseCandidateHash===EXPECTED_HASH);
 check('FREEZE_COUNTS',freeze.baseline?.criticalAssets===42&&freeze.baseline?.remoteAssetsExpected===25&&freeze.requiredAfterDelivery?.remoteAssetsMatched===25);
 check('FREEZE_TARGET',freeze.target?.projectId==='ays-orbit-360-lab'&&freeze.target?.channel==='orbit360-ays-lab');
 check('FREEZE_FORBIDDEN',freeze.forbidden?.firestoreRead===true&&freeze.forbidden?.firestoreWrite===true&&freeze.forbidden?.operationalWrites===true&&freeze.forbidden?.runtime===true&&freeze.forbidden?.browser===true&&freeze.forbidden?.rulesDeploy===true&&freeze.forbidden?.functionsDeploy===true&&freeze.forbidden?.production===true);
 check('LIFECYCLE_VERSION',lifecycle.gateContractVersion==='5.0.7'&&lifecycle.executionProfile?.phase==='M5_LAB_HOSTING_DELIVERY');
 check('LIFECYCLE_REQUEST',lifecycle.authorization?.requestCreated===requestPresent&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.hostingLabDeliveryAuthorized===true);
 check('LIFECYCLE_CAPABILITIES',lifecycle.executionProfile?.capabilities?.secrets===true&&lifecycle.executionProfile?.capabilities?.deploy===true&&lifecycle.executionProfile?.capabilities?.firestoreRead===false&&lifecycle.executionProfile?.capabilities?.writes===false&&lifecycle.executionProfile?.capabilities?.runtime===false&&lifecycle.executionProfile?.capabilities?.browser===false&&lifecycle.executionProfile?.capabilities?.functionsDeploy===false&&lifecycle.executionProfile?.capabilities?.rulesDeploy===false&&lifecycle.executionProfile?.capabilities?.production===false);
 check('OVERLAY_SCOPE',overlay.contractVersion==='5.0.7'&&overlay.phase==='M5_LAB_HOSTING_DELIVERY'&&overlay.required?.releaseCandidateHash===EXPECTED_HASH);
 check('OVERLAY_CAPABILITIES',overlay.capabilityBoundary?.secrets===true&&overlay.capabilityBoundary?.deploy===true&&overlay.capabilityBoundary?.firestoreRead===false&&overlay.capabilityBoundary?.writes===false&&overlay.capabilityBoundary?.browser===false&&overlay.capabilityBoundary?.functionsDeploy===false&&overlay.capabilityBoundary?.rulesDeploy===false&&overlay.capabilityBoundary?.production===false);
 check('REGISTRY_ENTRY',registry.gates?.length===1&&registry.gates[0]?.contractVersion==='5.0.7'&&registry.gates[0]?.phase==='M5_LAB_HOSTING_DELIVERY');
 check('FIREBASE_PUBLIC',firebase.hosting?.public==='orbit360-platform');
 check('FIREBASE_DOCS_IGNORED',Array.isArray(firebase.hosting?.ignore)&&firebase.hosting.ignore.includes('docs/**'));
 check('FIREBASE_NO_REWRITES',!firebase.hosting?.rewrites);
 check('ASSET_COUNT',ASSETS.length===42);
 check('ASSETS_PRESENT',rows.every(x=>x.present));
 check('RC_HASH',candidateHash===EXPECTED_HASH,candidateHash);
 check('REMOTE_COUNT',REMOTE.length===25);
 check('ACADEMIA_ASSETS',REMOTE.includes('data/academia-v1230-operational-directory-v20260722.js')&&REMOTE.includes('core/academia-static-content-write-policy-v20260729.js'));
 check('PREVIEW_RUNTIME_SPLIT',read('orbit360-platform/ays-lab-preview.html').includes("var LAB_RUNTIME = '20260717-2'")&&read('orbit360-platform/ays-lab-preview.html').includes("var SW_BUILD = '20260723-10'"));
 check('WORKFLOW_PRESENT',fs.existsSync(path.join(ROOT,'.github/workflows/orbit360-m5-lab-hosting-delivery-v20260729.yml')));
 if(requestPresent){const r=json(REQUEST),parent=cp.execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim();check('REQUEST_SCHEMA',r.schemaVersion==='orbit360-m5-lab-hosting-delivery-request-v2'&&r.contractVersion==='5.0.7');check('REQUEST_BINDING',r.authorizedBaseCommit===parent&&r.allowedExecutions===1&&r.releaseCandidateHash===EXPECTED_HASH);}
 const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-m5-lab-hosting-delivery-contract-summary-v2',contractVersion:'5.0.7',ok:failed.length===0,status:failed.length?'M5_LAB_HOSTING_DELIVERY_CONTRACT_FAIL':'M5_LAB_HOSTING_DELIVERY_CONTRACT_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),requestPresent,releaseCandidateHash:candidateHash,criticalAssets:ASSETS.length,remoteAssets:REMOTE.length,projectId:'ays-orbit-360-lab',channel:'orbit360-ays-lab',secretsRequired:true,firestoreRead:false,operationalWrites:0,browser:false,runtimeSmoke:false,hostingDeploy:true,functionsDeploy:false,rulesDeploy:false,production:false,containsPII:false,containsSecrets:false};
 const outPath=path.join(PLAT,'runtime-gate-crm-v20260716/m5-lab-hosting-delivery-507-contract-summary.json');fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
}catch(error){console.error(String(error&&error.message||error));process.exit(41)}
