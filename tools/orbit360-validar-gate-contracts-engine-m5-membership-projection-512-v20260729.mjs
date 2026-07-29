#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
const ROOT=process.cwd();
const PLAT=path.join(ROOT,'orbit360-platform');
const GATE_ID=process.argv[2]||'';
const EXPECTED_GATE='block5-release-candidate-visualization-v20260728';
const VERSION='5.0.12';
const PRIOR_RC='f6dfa37ec1449b627c04cde2caf7d3c43acfe453fb0a7eb73924861bb4e7d324';
const OUT=path.join(PLAT,'runtime-gate-crm-v20260716/preflight-sanitizado.json');
const SUMMARY=path.join(PLAT,'runtime-gate-crm-v20260716/m5-membership-projection-remediation-512-summary.json');
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-m5-membership-projection-512-v20260729.json';
const FIXTURE='tools/orbit360-m5-access-membership-projection-fixture-v20260729.mjs';
const OWNER='orbit360-platform/core/access-role-session-owner-v20260728.js';
const ASSETS=['index.html','ays-lab-preview.html','styles/tokens.css','styles/base.css','styles/infra.css','styles/v1197-empalme.css','styles/client-insurer-visual-contract-v20260720.css','styles/client-insurer-edit-mode-v20260722.css','styles/aseguradoras-candidate.css','sw.js','core/pwa.js','core/router-tenant-config-bootstrap.js','core/router.js','core/auth.js','modules/cliente360.js','modules/aseguradoras.js','core/client-insurer-edit-owner-v20260722.js','core/client-insurer-operational-directory-owner-v20260722.js','core/client-insurer-visual-stability-barrier-v20260721.js','core/client-insurer-visual-contract-v20260720.js','core/operational-directory-field-policy-v20260722.js','core/aseguradoras-credentials-provider-lab-v20260720.js','core/insurer-secure-target-bridge-v20260720.js','data/tenant-alianzas-soluciones-insurers-p10.js','product-readonly.html','core/backend-product-readiness-contract-p0.js','core/backend-product-readonly-bootstrap-p0.js','core/membership-multirol-effective-p0.js','core/tenant-access-policy-product-p0.js','core/product-role-taxonomy-p0.js','core/access-role-session-owner-v20260728.js','core/product-runtime-provider-contracts-p0.js','data/store-firestore-product-readonly-p0.js','core/tenant-activation-runtime-contract-p0.js','core/membership-multirol-contract-p0.js','core/tenant-access-policy-contract-p0.js','core/product-query-planner-contract-p0.js','core/tenant-canonical-paths-contract-p0.js','core/tenant-access-policy-effective-p0.js','core/aseguradoras-bank-account-visibility-policy-p0.js','data/academia-v1230-operational-directory-v20260722.js','core/academia-static-content-write-policy-v20260729.js'];
const PROTECTED={
 'orbit360-platform/data/store.js':'cec636757725dea975a63b4aa98fb859baba7316',
 'orbit360-platform/data/store-firestore-lab.local.js':'aa1bd2734653dd67b8f6c07875c2e0f9a1013fdf',
 'orbit360-platform/core/backend-lab-init.js':'d4e288995081627dfcdd177a530d99cd92ab8686',
 'orbit360-platform/core/auth.js':'f38dd2c29a9df54ddbbd85bbc42e3c2a4d5a5840',
 'firestore.rules':'35fba451bbbeb97dbae3f08303b786ddbcbdd29f'
};
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const blob=rel=>execFileSync('git',['rev-parse',`HEAD:${rel}`],{cwd:ROOT,encoding:'utf8'}).trim();
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,240)});
let candidateHash='';
try{
 const lifecycle=json(LIFECYCLE);
 const freeze=json('tools/orbit360-m5-release-candidate-freeze-v20260728.json');
 const auth=json('tools/orbit360-m5-runtime-smoke-511-authorization-v20260729.json');
 const runtimeFreeze=json('tools/orbit360-m5-runtime-smoke-511-freeze-v20260729.json');
 const hosting=json('orbit360-platform/runtime-gate-crm-v20260716/m5-lab-hosting-delivery-510-closure.json');
 const owner=read(OWNER);
 check('GATE_ID',GATE_ID===EXPECTED_GATE);
 check('BRANCH',(process.env.ORBIT360_BRANCH||'')==='ays/backend-tenant-lab-v99-20260703');
 check('LIFECYCLE',lifecycle.gateId===EXPECTED_GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.executionProfile?.phase==='M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC');
 const caps=lifecycle.executionProfile?.capabilities||{};
 check('STATIC_CAPABILITIES',caps.secrets===false&&caps.firestoreRead===false&&caps.writes===false&&caps.runtime===false&&caps.browser===false&&caps.deploy===false&&caps.functionsDeploy===false&&caps.rulesDeploy===false&&caps.production===false);
 check('PRIOR_RUNTIME_STOP_LINE',freeze.runtimeSmoke511?.status==='M5_RUNTIME_SMOKE_511_FAILED_STOP_LINE'&&freeze.runtimeSmoke511?.firstFailure==='MEMBERSHIP_BOUNDARY_NOT_ACTIVE'&&freeze.runtimeSmoke511?.allCountsStable===true&&freeze.runtimeSmoke511?.allDigestsStable===true&&freeze.runtimeSmoke511?.firestoreWrites===0&&freeze.runtimeSmoke511?.operationalWrites===0);
 check('PRIOR_AUTHORIZATION_CONSUMED',auth.authorizationConsumed===true&&auth.runtimeSmokeAuthorized===false&&auth.allowedExecutions===0&&runtimeFreeze.authorization?.authorizationConsumed===true&&runtimeFreeze.authorization?.runtimeSmokeAuthorized===false&&runtimeFreeze.authorization?.allowedExecutions===0);
 check('GLOBAL_RUNTIME_FROZEN',freeze.authorization?.runtimeAuthorizationConsumed===true&&freeze.authorization?.runtimeSmokeAuthorized===false&&freeze.authorization?.allowedRuntimeSmokeExecutions===0&&freeze.authorization?.visualReviewAuthorized===false&&freeze.authorization?.productionAuthorized===false);
 check('HOSTING_510_PRESERVED',hosting.status==='M5_LAB_HOSTING_DELIVERED_AND_25_OF_25_VERIFIED'&&hosting.releaseCandidateHash===PRIOR_RC&&hosting.evidence?.publicParity?.assetsMatched===25&&hosting.evidence?.publicParity?.mismatchCount===0);
 for(const [rel,expected] of Object.entries(PROTECTED)){let actual='';try{actual=blob(rel);}catch{}check('PROTECTED:'+rel,actual===expected,actual);}
 for(const rel of [OWNER,FIXTURE]){const run=spawnSync(process.execPath,['--check',rel],{cwd:ROOT,encoding:'utf8'});check('SYNTAX:'+rel,run.status===0,(run.stderr||'').slice(0,180));}
 check('OWNER_VERSION',owner.includes("var VERSION = '20260729.3'")||owner.includes("var VERSION='20260729.3'"));
 check('OWNER_CANONICAL_MEMBERSHIP_READ',owner.includes("db.collection('tenants').doc(tenantId).collection('members').doc(text(user.uid)).get()"));
 check('OWNER_PRODUCT_PROJECTION_ONLY',owner.includes('window.Orbit.auth.productUser = projection')&&!owner.includes('Orbit.auth.user =')&&!owner.includes('window.Orbit.auth.user ='));
 check('OWNER_FAIL_CLOSED',owner.includes('membership_projection_missing')&&owner.includes("return requiresMembership() ? []"));
 check('OWNER_NO_A_AND_S_TENANT_HARDCODE',!owner.includes('alianzas-soluciones'));
 check('OWNER_NO_LAB_UID_HARDCODE',!owner.includes('woJlxR1iFEeiQZvTscPj4qQ5Qc73'));
 check('OWNER_NO_ADVISOR_HARDCODE',!owner.includes('ase-paula-osorio'));
 check('OWNER_ZERO_WRITE_DECLARATION',owner.includes('writeAuthorized: false')&&owner.includes('membershipWrites: false'));
 const fixtureRun=spawnSync(process.execPath,[FIXTURE],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
 check('FIXTURE_EXECUTED',fixtureRun.status===0,(fixtureRun.stderr||'').slice(0,220));
 const fixturePath='orbit360-platform/runtime-gate-crm-v20260716/m5-access-membership-projection-fixture.json';
 const fixture=fs.existsSync(path.join(ROOT,fixturePath))?json(fixturePath):{};
 check('FIXTURE_PASS',fixture.ok===true&&fixture.status==='M5_ACCESS_MEMBERSHIP_PROJECTION_FIXTURE_PASS'&&fixture.failed===0&&fixture.firestoreWrites===0&&fixture.operationalWrites===0,JSON.stringify({passed:fixture.passed,total:fixture.total,failed:fixture.failed}));
 const rows=ASSETS.map(asset=>({path:asset,present:fs.existsSync(path.join(PLAT,asset)),sha256:fs.existsSync(path.join(PLAT,asset))?sha(fs.readFileSync(path.join(PLAT,asset))):''}));
 candidateHash=sha(JSON.stringify(rows.map(row=>({path:row.path,sha256:row.sha256}))));
 check('ASSET_COUNT',ASSETS.length===42,String(ASSETS.length));
 check('ASSETS_PRESENT',rows.every(row=>row.present),rows.filter(row=>!row.present).map(row=>row.path).join(','));
 check('NEW_RC_HASH',candidateHash.length===64&&candidateHash!==PRIOR_RC,candidateHash);
 const failed=checks.filter(item=>!item.ok);
 const summary={schemaVersion:'orbit360-m5-membership-projection-remediation-512-summary-v1',generatedAt:new Date().toISOString(),gateId:EXPECTED_GATE,contractVersion:VERSION,status:failed.length?'M5_MEMBERSHIP_PROJECTION_512_STATIC_FAIL':'M5_MEMBERSHIP_PROJECTION_512_STATIC_PASS',ok:failed.length===0,classification:'FUNCTIONAL_DEFECT',rootCause:'LAB access owner lacked a real membership-backed product projection at runtime.',priorReleaseCandidateHash:PRIOR_RC,releaseCandidateHash:candidateHash,criticalAssets:ASSETS.length,fixOwner:OWNER,ownerVersion:'20260729.3',fixtureStatus:fixture.status||'NOT_RUN',fixturePassed:Number(fixture.passed||0),fixtureTotal:Number(fixture.total||0),protectedFilesUnchanged:checks.filter(x=>x.id.startsWith('PROTECTED:')).every(x=>x.ok),firestoreRead:false,firestoreWrites:0,operationalWrites:0,secrets:false,runtime:false,browser:false,hostingDeploy:false,functionsDeploy:false,rulesDeploy:false,production:false,visualReview:false,policies:false,passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,approvalReadyForHostingLabDelivery:failed.length===0,containsPII:false,containsSecrets:false};
 fs.mkdirSync(path.dirname(SUMMARY),{recursive:true});fs.writeFileSync(SUMMARY,JSON.stringify(summary,null,2)+'\n');
 const preflight={schemaVersion:'orbit360-gate-contract-preflight-m5-membership-projection-v1',gateId:EXPECTED_GATE,contractVersion:VERSION,status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':null,executionPhase:'M5_RUNTIME_SMOKE_ROOT_CAUSE_REMEDIATION_STATIC',validatorRevision:VERSION,releaseCandidateHash:candidateHash,priorReleaseCandidateHash:PRIOR_RC,criticalAssets:ASSETS.length,fixOwner:OWNER,fixtureStatus:fixture.status||'NOT_RUN',protectedFilesUnchanged:summary.protectedFilesUnchanged,approvalReadyForHostingLabDelivery:summary.approvalReadyForHostingLabDelivery,passed:summary.passed,total:summary.total,failed:summary.failed,failedCheckIds:summary.failedCheckIds,checks,capabilityProfile:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,functionsDeployed:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
 fs.writeFileSync(OUT,JSON.stringify(preflight,null,2)+'\n');
 console.log(JSON.stringify(summary,null,2));if(failed.length)process.exit(41);
}catch(error){
 const out={schemaVersion:'orbit360-gate-contract-preflight-m5-membership-projection-v1',gateId:EXPECTED_GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',releaseCandidateHash:candidateHash,passed:checks.filter(x=>x.ok).length,total:checks.length+1,failed:1,failedCheckIds:['ENGINE_EXCEPTION'],error:String(error&&error.stack||error).slice(0,700),capabilityProfile:{secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},sourceTransformed:false,dataAccess:false,secretAccess:false,operationalWrites:0,secretsRead:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,functionsDeployed:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
 fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.error(JSON.stringify(out,null,2));process.exit(41);
}
