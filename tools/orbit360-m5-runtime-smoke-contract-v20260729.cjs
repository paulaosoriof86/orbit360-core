#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform');
const EXPECTED_HASH='d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045';
const ASSETS=["index.html","ays-lab-preview.html","styles/tokens.css","styles/base.css","styles/infra.css","styles/v1197-empalme.css","styles/client-insurer-visual-contract-v20260720.css","styles/client-insurer-edit-mode-v20260722.css","styles/aseguradoras-candidate.css","sw.js","core/pwa.js","core/router-tenant-config-bootstrap.js","core/router.js","core/auth.js","modules/cliente360.js","modules/aseguradoras.js","core/client-insurer-edit-owner-v20260722.js","core/client-insurer-operational-directory-owner-v20260722.js","core/client-insurer-visual-stability-barrier-v20260721.js","core/client-insurer-visual-contract-v20260720.js","core/operational-directory-field-policy-v20260722.js","core/aseguradoras-credentials-provider-lab-v20260720.js","core/insurer-secure-target-bridge-v20260720.js","data/tenant-alianzas-soluciones-insurers-p10.js","product-readonly.html","core/backend-product-readiness-contract-p0.js","core/backend-product-readonly-bootstrap-p0.js","core/membership-multirol-effective-p0.js","core/tenant-access-policy-product-p0.js","core/product-role-taxonomy-p0.js","core/access-role-session-owner-v20260728.js","core/product-runtime-provider-contracts-p0.js","data/store-firestore-product-readonly-p0.js","core/tenant-activation-runtime-contract-p0.js","core/membership-multirol-contract-p0.js","core/tenant-access-policy-contract-p0.js","core/product-query-planner-contract-p0.js","core/tenant-canonical-paths-contract-p0.js","core/tenant-access-policy-effective-p0.js","core/aseguradoras-bank-account-visibility-policy-p0.js","data/academia-v1230-operational-directory-v20260722.js"];
function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8')}
function json(rel){return JSON.parse(read(rel))}
function sha(b){return crypto.createHash('sha256').update(b).digest('hex')}
const checks=[];function check(id,ok){checks.push({id,ok:!!ok})}
try{
 const hosting=json('orbit360-platform/runtime-gate-crm-v20260716/m5-lab-hosting-delivery-504-closure.json');
 const globalFreeze=json('tools/orbit360-m5-release-candidate-freeze-v20260728.json');
 const auth=json('tools/orbit360-m5-runtime-smoke-authorization-v20260729.json');
 const freeze=json('tools/orbit360-m5-runtime-smoke-freeze-v20260729.json');
 const lifecycle=json('tools/orbit360-validator-lifecycle-contract-m5-runtime-smoke-v20260729.json');
 const overlay=json('tools/orbit360-gate-contract-overlay-m5-runtime-smoke-v20260729.json');
 const registry=json('tools/orbit360-gate-contract-registry-extension-m5-runtime-smoke-v20260729.json');
 const workflow=read('.github/workflows/orbit360-m5-runtime-smoke-lab-v20260729.yml');
 const runtime=read('tools/orbit360-m5-runtime-smoke-browser-v20260729.mjs');
 const snapshot=read('tools/orbit360-m5-runtime-smoke-live-readonly-v20260729.mjs');
 const rows=ASSETS.map(p=>({path:p,present:fs.existsSync(path.join(PLAT,p)),sha256:fs.existsSync(path.join(PLAT,p))?sha(fs.readFileSync(path.join(PLAT,p))):''}));
 const candidateHash=sha(JSON.stringify(rows.map(x=>({path:x.path,sha256:x.sha256}))));
 check('HOSTING_504_CLOSED',hosting.status==='M5_LAB_HOSTING_DELIVERED_AND_24_OF_24_VERIFIED'&&hosting.remoteParity?.assetsMatched===24&&hosting.remoteParity?.remoteParity===true);
 check('HOSTING_AUTH_CONSUMED',hosting.authorizationConsumed===true&&hosting.hostingLabDeliveryAuthorized===false&&hosting.allowedHostingLabDeliveryExecutions===0);
 check('GLOBAL_FREEZE',globalFreeze.status==='M5_LAB_HOSTING_DELIVERY_CLOSED_RUNTIME_SMOKE_AUTHORIZATION_REQUIRED'&&globalFreeze.releaseCandidate?.remoteParity===true&&globalFreeze.authorization?.runtimeSmokeAuthorized===false);
 check('AUTH_VERSION',auth.contractVersion==='5.0.5'&&auth.explicitAuthorization===true);
 check('AUTH_ONE_SHOT',auth.runtimeSmokeAuthorized===true&&auth.allowedExecutions===1&&auth.requestCreated===false);
 check('AUTH_HASH',auth.releaseCandidateHash===EXPECTED_HASH);
 check('AUTH_SCOPE',auth.secrets===true&&auth.firestoreRead===true&&auth.firestoreWrite===false&&auth.operationalWrites===false&&auth.runtime===true&&auth.browser===true&&auth.deploy===false&&auth.hostingDeploy===false&&auth.functionsDeploy===false&&auth.rulesDeploy===false&&auth.production===false&&auth.policies===false&&auth.mergeMain===false&&auth.visualReview===false);
 check('FREEZE_STATUS',freeze.status==='READY_FOR_ONE_RUNTIME_SMOKE_LAB'&&freeze.authorization?.runtimeSmokeAuthorized===true&&freeze.authorization?.allowedExecutions===1&&freeze.authorization?.requestCreated===false);
 check('FREEZE_BASELINE',freeze.baseline?.hosting504Closed===true&&freeze.baseline?.releaseCandidateHash===EXPECTED_HASH&&freeze.baseline?.remoteAssetsMatched===24&&freeze.baseline?.sourceClients===414&&freeze.baseline?.sourceInsurers===26&&freeze.baseline?.canonicalClients===414&&freeze.baseline?.canonicalInsurers===26&&freeze.baseline?.advisors===7&&freeze.baseline?.missingClientCurrency===0);
 check('FREEZE_EXPECTED',freeze.expected?.countryCounts?.GT===398&&freeze.expected?.countryCounts?.CO===16&&freeze.expected?.countryCounts?.REQUIERE_VALIDACION===0&&freeze.expected?.typeCounts?.Persona===391&&freeze.expected?.typeCounts?.Empresa===23);
 check('LIFECYCLE',lifecycle.gateContractVersion==='5.0.5'&&lifecycle.executionProfile?.phase==='LAB_RUNTIME_GATE');
 const c=lifecycle.executionProfile?.capabilities||{};
 check('LIFECYCLE_CAPABILITIES',c.secrets===true&&c.firestoreRead===true&&c.writes===false&&c.runtime===true&&c.browser===true&&c.deploy===false&&c.functionsDeploy===false&&c.rulesDeploy===false&&c.production===false);
 check('OVERLAY',overlay.contractVersion==='5.0.5'&&overlay.phase==='LAB_RUNTIME_GATE'&&overlay.required?.releaseCandidateHash===EXPECTED_HASH);
 check('REGISTRY',registry.gates?.length===1&&registry.gates[0]?.contractVersion==='5.0.5'&&registry.gates[0]?.phase==='LAB_RUNTIME_GATE');
 check('ASSET_COUNT',ASSETS.length===41);
 check('ASSETS_PRESENT',rows.every(x=>x.present));
 check('RC_HASH',candidateHash===EXPECTED_HASH);
 check('WORKFLOW_TRIGGER',workflow.includes('tools/orbit360-m5-runtime-smoke-request-v20260729.json'));
 check('WORKFLOW_NO_DEPLOY',!workflow.includes('hosting:channel:deploy')&&!workflow.includes('firebase deploy')&&!workflow.includes('functions:deploy')&&!workflow.includes('firestore:delete'));
 check('WORKFLOW_ONE_ATTEMPT',workflow.includes('GITHUB_RUN_ATTEMPT')&&workflow.includes('= "1"'));
 check('WORKFLOW_PREFLIGHT_BEFORE_SECRETS',workflow.indexOf('Preflight canónico antes de identidad')>=0&&workflow.indexOf('Preflight canónico antes de identidad')<workflow.indexOf('Resolver identidad LAB después del preflight'));
 check('RUNTIME_NO_STALE_VALIDATOR',!runtime.includes('orbit360-runtime-check-client360-v20260716'));
 check('RUNTIME_EXPECTS_CURRENT_COUNTRIES',runtime.includes('GT:398')&&runtime.includes('CO:16')&&runtime.includes('REQUIERE_VALIDACION:0'));
 check('RUNTIME_ACCESS_BOUNDARY',runtime.includes("'Dirección','Operativo','Asesor'")&&runtime.includes("'Finanzas'")&&runtime.includes('role_not_assigned'));
 check('RUNTIME_WRITE_GUARD',runtime.includes('M5_RUNTIME_WRITE_BLOCKED')&&runtime.includes('networkWriteCandidates'));
 check('RUNTIME_THREE_VIEWPORTS',runtime.includes('1440,height:1000')&&runtime.includes('820,height:1180')&&runtime.includes('390,height:844'));
 check('SNAPSHOT_SOURCE_COUNTS',snapshot.includes('sourceClients:414')&&snapshot.includes('sourceInsurers:26')&&snapshot.includes('advisors:7'));
 check('SNAPSHOT_CANONICAL_COUNTS',snapshot.includes('canonicalClients:414')&&snapshot.includes('canonicalInsurers:26')&&snapshot.includes('memberships:1'));
 const snapshotWriteScan=snapshot.replace(/crypto\.createHash\([^)]*\)\.update/g,'cryptoHashUpdate');
 check('SNAPSHOT_NO_WRITES',!/\.(?:set|update|delete|add|commit)\s*\(/.test(snapshotWriteScan)&&!/\b(?:writeBatch|runTransaction|bulkWriter)\s*\(/.test(snapshotWriteScan));
 const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-m5-runtime-smoke-contract-summary-v1',contractVersion:'5.0.5',ok:failed.length===0,status:failed.length?'M5_RUNTIME_SMOKE_CONTRACT_FAIL':'M5_RUNTIME_SMOKE_CONTRACT_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),releaseCandidateHash:candidateHash,criticalAssets:ASSETS.length,projectId:'ays-orbit-360-lab',canonicalUrl:'https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app',secretsRequired:true,firestoreRead:true,firestoreWrites:0,operationalWrites:0,runtime:true,browser:true,hostingDeploy:false,functionsDeploy:false,rulesDeploy:false,production:false,containsPII:false,containsSecrets:false};
 const outPath=path.join(PLAT,'runtime-gate-crm-v20260716/m5-runtime-smoke-contract-summary.json');fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
}catch(error){console.error(String(error&&error.message||error));process.exit(41)}
