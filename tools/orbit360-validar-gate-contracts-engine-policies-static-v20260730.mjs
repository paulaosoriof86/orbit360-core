#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-policies-static-v20260730';
const VERSION='7.0.1';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-policies-static-v20260730.json';
const REQUEST='.github/orbit360-requests/policies-visual-readonly-lab-v20260801.json';
const EXPECTED_COLLECTIONS=['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const EXPECTED_BASELINE={clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5,finmovs:0,planillasComisiones:5,comisionesDevengadas:5,conciliacionesComisiones:5};
const REQUIRED=[
  LIFECYCLE,REQUEST,
  'tools/orbit360-m6-generate-product-runtime-config-v20260730.mjs',
  'tools/orbit360-m6-resolve-smoke-identity-readonly-v20260730.mjs',
  'tools/orbit360-m6-build-product-shell-v20260730.mjs',
  'tools/orbit360-browser-blocking-gate-readiness-v20260730.mjs',
  'tools/orbit360-visible-technical-copy-predicate-v20260729.mjs',
  'tools/orbit360-generate-policies-visual-runtime-config-v20260801.mjs',
  'tools/orbit360-policies-visual-data-snapshot-readonly-v20260801.mjs',
  'tools/orbit360-build-policies-visual-shell-v20260801.mjs',
  'tools/orbit360-policies-visual-browser-smoke-v20260801.mjs',
  'orbit360-platform/core/policies-visual-direction-role-overlay-v20260801.js',
  'orbit360-platform/modules/polizas.js',
  'orbit360-platform/modules/cliente360.js',
  'orbit360-platform/modules/cobros.js',
  'orbit360-platform/core/policy-receipts-engine.js',
  'orbit360-platform/data/store-firestore-product-readonly-p0.js',
  'firestore.product-readonly.rules',
  'firebase.product-go-live.json'
];
function read(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
try{
  add('GATE',process.argv[2]===GATE);
  const missing=REQUIRED.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));add('FILES',missing.length===0);
  if(missing.length)throw new Error('PIPELINE_MECHANISM_FAILURE:FILES:'+missing.join(','));
  const lifecycle=read(LIFECYCLE),request=read(REQUEST);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='POLICIES_VISUAL_READONLY_LAB_AUTHORIZED');
  add('PHASE',lifecycle.executionProfile?.phase==='M5_LAB_CORRECTIVE_DELIVERY_RUNTIME');
  add('AUTHORIZATION',lifecycle.authorization?.approved===true&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.consumed===false);
  add('REQUEST',request.schemaVersion==='orbit360-policies-visual-readonly-lab-request-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.approved===true&&request.consumed===false&&request.allowedExecutions===1);
  add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5);
  add('COLLECTIONS',same(request.scope?.collections,EXPECTED_COLLECTIONS)&&same(lifecycle.visualizationScope?.collections,EXPECTED_COLLECTIONS));
  add('BASELINE',same(request.expectedBaseline,EXPECTED_BASELINE)&&same(lifecycle.expectedBaseline,EXPECTED_BASELINE));
  add('DIRECTION_ONLY',request.scope?.role==='Dirección'&&lifecycle.visualizationScope?.role==='Dirección'&&request.scope?.roleProjection==='session_only_no_membership_write');
  add('HUMAN_APPROVAL_BARRIER',request.humanApproval?.clientes===true&&request.humanApproval?.polizas===false&&request.humanApproval?.vehiculos===false&&request.humanApproval?.recibos===false&&request.humanApproval?.cartera===false&&request.humanApproval?.restoCrm===false&&request.humanApproval?.automatedSmokeMaySetApproval===false);
  add('NO_WRITES',request.capabilities?.writes===false&&request.capabilities?.firestoreRead===true&&request.capabilities?.browser===true&&request.capabilities?.deploy===true&&request.capabilities?.rulesDeploy===false&&request.capabilities?.functionsDeploy===false&&request.capabilities?.production===false);
  add('PREVIEW_ONLY',request.delivery?.previewChannel==='orbit360-policies-review-20260801'&&request.delivery?.defaultHostingDeploy===false&&request.delivery?.rollbackPreviewOnFailure===true);
  add('STATIC_HISTORY_PRESERVED',lifecycle.staticQualification?.closed===true&&lifecycle.staticQualification?.evidencePreserved===true&&lifecycle.staticQualification?.sourceReprofilingAllowed===false);
  const rules=fs.readFileSync(path.join(ROOT,'firestore.product-readonly.rules'),'utf8');
  add('RULES_READONLY',rules.includes("collection in ['clientes', 'aseguradoras', 'asesores', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros']")&&rules.includes('allow create, update, delete: if false'));
  const failed=checks.filter(x=>!x.ok);
  const out={
    schemaVersion:'orbit360-policies-visual-readonly-lab-preflight-v1',gateId:GATE,contractVersion:VERSION,
    executionPhase:'M5_LAB_CORRECTIVE_DELIVERY_RUNTIME',phase:'POLICIES_VISUAL_READONLY_LAB',
    status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'POLICIES_VISUAL_READONLY_LAB_READY',
    total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,
    executionAuthorized:failed.length===0,allowedExecutions:failed.length?0:1,hostingPreviewAuthorized:failed.length===0,runtimeAuthorized:failed.length===0,visualReviewAuthorized:failed.length===0,
    role:'Dirección',collections:EXPECTED_COLLECTIONS,expectedBaseline:EXPECTED_BASELINE,
    humanApproval:{clientes:true,polizas:false,vehiculos:false,recibos:false,cartera:false,restoCrm:false,automatedSmokeMaySetApproval:false},
    capabilityProfile:lifecycle.executionProfile?.capabilities||{},previewOnly:true,defaultHostingDeploy:false,rollbackOnFailure:true,
    firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
  };
  save(out);console.log(JSON.stringify(out,null,2));process.exit(failed.length?41:0);
}catch(error){
  const out={schemaVersion:'orbit360-policies-visual-readonly-lab-preflight-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'M5_LAB_CORRECTIVE_DELIVERY_RUNTIME',phase:'POLICIES_VISUAL_READONLY_LAB',status:'VALIDATOR_STALE',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',failed:Math.max(1,checks.filter(x=>!x.ok).length),failedCheckIds:checks.filter(x=>!x.ok).map(x=>x.id),error:String(error&&error.message||error).slice(0,600),executionAuthorized:false,hostingPreviewAuthorized:false,runtimeAuthorized:false,visualReviewAuthorized:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  save(out);console.log(JSON.stringify(out,null,2));process.exit(41);
}
