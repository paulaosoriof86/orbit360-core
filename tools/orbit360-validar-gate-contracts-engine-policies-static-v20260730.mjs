#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block7-policies-static-v20260730';
const VERSION='7.0.1';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-policies-static-v20260730.json';
const ROOT_CAUSE='tools/orbit360-policies-visual-country-projection-root-cause-v20260801.json';
const REQUEST='.github/orbit360-diagnostics/policies-country-projection-readonly-v20260801.json';
const RESUME='.github/orbit360-resume/policies-country-projection-validator-resume-v20260801.json';
const EXPECTED_COLLECTIONS=['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const EXPECTED_BASELINE={clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5,finmovs:0,planillasComisiones:5,comisionesDevengadas:5,conciliacionesComisiones:5};
const FAILED_BROWSER={clientes:414,aseguradoras:26,polizas:2,vehiculos:1,recibosEsperados:0,carteraPrimas:0,cobros:2};
const REQUIRED=[LIFECYCLE,ROOT_CAUSE,REQUEST,RESUME,'tools/orbit360-diagnosticar-policies-country-projection-readonly-v20260801.mjs','orbit360-platform/core/tenant-access-policy-contract-p0.js','orbit360-platform/core/tenant-access-policy-product-p0.js','orbit360-platform/data/store-firestore-product-readonly-p0.js','firestore.product-readonly.rules'];
function read(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
function save(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
try{
  add('GATE',process.argv[2]===GATE);
  const missing=REQUIRED.filter(rel=>!fs.existsSync(path.join(ROOT,rel)));add('FILES',missing.length===0);if(missing.length)throw new Error('PIPELINE_MECHANISM_FAILURE:FILES:'+missing.join(','));
  const lifecycle=read(LIFECYCLE),root=read(ROOT_CAUSE),request=read(REQUEST),resume=read(RESUME);
  add('LIFECYCLE',lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION&&lifecycle.status==='POLICIES_COUNTRY_PROJECTION_DIAGNOSTIC_RESUME_AUTHORIZED');
  add('PHASE',lifecycle.executionProfile?.phase==='LAB_DATA_CONTRACT_REPAIR_DRYRUN');
  const cap=lifecycle.executionProfile?.capabilities||{};
  add('CAPABILITIES',cap.secrets===true&&cap.firestoreRead===true&&cap.writes===false&&cap.runtime===false&&cap.browser===false&&cap.deploy===false&&cap.functionsDeploy===false&&cap.rulesDeploy===false&&cap.production===false);
  add('AUTHORIZATION',lifecycle.authorization?.approved===true&&lifecycle.authorization?.diagnosticWithinAuthorizedReadOnlyScope===true&&lifecycle.authorization?.diagnosticExecutionsAllowed===1&&lifecycle.authorization?.diagnosticConsumed===false&&lifecycle.authorization?.diagnosticResumeAllowedOnce===true&&lifecycle.authorization?.diagnosticResumeSequence===2&&lifecycle.authorization?.additionalPreviewAuthorized===false);
  add('VISUAL_ROOT_CAUSE',root.schemaVersion==='orbit360-policies-visual-country-projection-root-cause-v1'&&root.gateId===GATE&&root.classification==='DATA_CONTRACT_FAILURE'&&root.sourceRun===30723733270&&root.sourceJob===91431611947&&root.sourceArtifact===8825662341&&root.failureCode==='VISUAL_COUNTS_MISMATCH');
  add('VISUAL_ROLLBACK',root.executionSafety?.previewCreated===true&&root.executionSafety?.previewRolledBack===true&&root.executionSafety?.defaultHostingTouched===false&&root.executionSafety?.firestoreWrites===0&&root.executionSafety?.operationalWrites===0&&root.executionSafety?.productionTouched===false&&root.executionSafety?.humanApprovalRecorded===false);
  add('REQUEST',request.schemaVersion==='orbit360-policies-country-projection-diagnostic-request-v1'&&request.gateId===GATE&&request.contractVersion===VERSION&&request.approved===true&&request.consumed===false&&request.allowedExecutions===1&&request.sourceRun===30723733270);
  add('RESUME',resume.schemaVersion==='orbit360-policies-country-projection-diagnostic-resume-v1'&&resume.gateId===GATE&&resume.contractVersion===VERSION&&resume.approved===true&&resume.resumeSequence===2&&resume.sourceRun===30723931071&&resume.sourceJob===91432109841&&resume.sourceArtifact===8825711437);
  add('VALIDATOR_STALE_PROOF',resume.classification==='VALIDATOR_STALE'&&resume.rootCause==='NESTED_COUNTRY_COUNTED_AS_TOP_LEVEL_FIRESTORE_FIELD'&&resume.reportedStatus==='POLICIES_COUNTRY_PROJECTION_DIAGNOSTIC_INCONCLUSIVE'&&resume.canonicalPreflightPassed===17&&resume.canonicalPreflightFailed===0&&resume.firestoreRead===true&&resume.firestoreWrites===0&&resume.operationalWrites===0&&resume.browserExecuted===false&&resume.deployExecuted===false&&resume.productionTouched===false);
  add('VALIDATOR_CORRECTION',resume.validatorRevision==='top-level-country-v2'&&resume.topLevelPaisSeparated===true&&resume.topLevelCountrySeparated===true&&resume.nestedCountryEvidenceReportedSeparately===true&&resume.countryInferenceAllowed===false&&resume.countryWriteAllowed===false);
  add('LIFECYCLE_HISTORY',same(lifecycle.diagnosticHistory?.firstRun,resume.lifecycleProof)&&same(lifecycle.diagnosticHistory?.validatorCorrection,resume.validatorCorrection));
  add('BRANCH',request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5&&resume.branch===request.branch&&resume.pullRequest===5);
  add('COLLECTIONS',same(request.collections,EXPECTED_COLLECTIONS)&&same(lifecycle.diagnosticScope?.collections,EXPECTED_COLLECTIONS));
  add('BASELINE',same(request.expectedBaseline,EXPECTED_BASELINE)&&same(lifecycle.expectedBaseline,EXPECTED_BASELINE));
  add('FAILED_PROJECTION',same(request.failedBrowserProjection,FAILED_BROWSER)&&same(lifecycle.failedBrowserProjection,FAILED_BROWSER));
  add('NO_INFERENCE',request.rules?.inferCountry===false&&request.rules?.writeCountry===false&&lifecycle.diagnosticScope?.inferCountry===false&&lifecycle.diagnosticScope?.writeCountry===false);
  add('NO_VISUAL_CAPABILITIES',request.capabilities?.firestoreRead===true&&request.capabilities?.writes===false&&request.capabilities?.runtime===false&&request.capabilities?.browser===false&&request.capabilities?.deploy===false&&request.capabilities?.rulesDeploy===false&&request.capabilities?.production===false);
  add('HUMAN_APPROVAL_BARRIER',lifecycle.humanApproval?.clientes===true&&lifecycle.humanApproval?.polizas===false&&lifecycle.humanApproval?.vehiculos===false&&lifecycle.humanApproval?.recibos===false&&lifecycle.humanApproval?.cartera===false&&lifecycle.humanApproval?.automatedDiagnosticMaySetApproval===false);
  const productPolicy=fs.readFileSync(path.join(ROOT,'orbit360-platform/core/tenant-access-policy-product-p0.js'),'utf8');
  const basePolicy=fs.readFileSync(path.join(ROOT,'orbit360-platform/core/tenant-access-policy-contract-p0.js'),'utf8');
  const diagnostic=fs.readFileSync(path.join(ROOT,'tools/orbit360-diagnosticar-policies-country-projection-readonly-v20260801.mjs'),'utf8');
  add('QUERY_CONTRACT',productPolicy.includes("country: 'pais'")&&basePolicy.includes("field: 'country'")&&basePolicy.includes('m.countries.length === 1'));
  add('VALIDATOR_REVISION_PRESENT',diagnostic.includes("validatorRevision:'top-level-country-v2'")&&diagnostic.includes('topLevelCountry')&&diagnostic.includes('nestedCountryEvidence'));
  const failed=checks.filter(x=>!x.ok);
  const out={schemaVersion:'orbit360-policies-country-projection-diagnostic-preflight-v2',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',phase:'POLICIES_COUNTRY_PROJECTION_READONLY_DIAGNOSTIC_RESUME',resumeSequence:2,sourceValidatorStaleRun:30723931071,status:failed.length?'VALIDATOR_STALE':'GO_GATE_CONTRACT',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'POLICIES_COUNTRY_PROJECTION_DIAGNOSTIC_RESUME_READY',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:failed.length===0,allowedExecutions:failed.length?0:1,pipelineResumeAllowed:failed.length===0,firestoreReadAuthorized:failed.length===0,writeAuthorized:false,browserAuthorized:false,deployAuthorized:false,collections:EXPECTED_COLLECTIONS,expectedBaseline:EXPECTED_BASELINE,failedBrowserProjection:FAILED_BROWSER,validatorRevision:'top-level-country-v2',humanApproval:{clientes:true,polizas:false,vehiculos:false,recibos:false,cartera:false,restoCrm:false,automatedDiagnosticMaySetApproval:false},countryInferenceAllowed:false,countryRepairAllowed:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
  save(out);console.log(JSON.stringify(out,null,2));process.exit(failed.length?41:0);
}catch(error){const out={schemaVersion:'orbit360-policies-country-projection-diagnostic-preflight-v2',gateId:GATE,contractVersion:VERSION,executionPhase:'LAB_DATA_CONTRACT_REPAIR_DRYRUN',phase:'POLICIES_COUNTRY_PROJECTION_READONLY_DIAGNOSTIC_RESUME',resumeSequence:2,status:'VALIDATOR_STALE',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',failed:Math.max(1,checks.filter(x=>!x.ok).length),failedCheckIds:checks.filter(x=>!x.ok).map(x=>x.id),error:String(error&&error.message||error).slice(0,600),executionAuthorized:false,pipelineResumeAllowed:false,firestoreReadAuthorized:false,writeAuthorized:false,browserAuthorized:false,deployAuthorized:false,countryInferenceAllowed:false,countryRepairAllowed:false,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};save(out);console.log(JSON.stringify(out,null,2));process.exit(41);}
