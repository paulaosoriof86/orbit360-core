#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block8-vehicles-static-v20260730';
const VERSION='8.0.0';
const files={
  policiesClose:'orbit360-platform/docs/CIERRE-WRITE-POLIZAS-AYS-20260730.md',
  dryrun:'orbit360-platform/docs/DRYRUN-VEHICULOS-AYS-20260730.md',
  freeze:'tools/orbit360-vehicles-source-freeze-v20260730.json',
  policyModule:'orbit360-platform/modules/polizas.js',
  sourceRule:'orbit360-platform/docs/REGLA-FUENTES-OPERATIVAS-VIGENTES-BAJO-DEMANDA-20260730.md'
};
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').replace(/\s+/g,' ').trim().slice(0,420)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const readJson=rel=>JSON.parse(read(rel));
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
try{
  add('GATE',process.argv[2]===GATE);
  const missing=Object.values(files).filter(f=>!fs.existsSync(path.join(ROOT,f)));
  add('FILES',missing.length===0,missing.join(','));
  if(missing.length)throw new Error('VEHICLES_STATIC_FILES_MISSING:'+missing.join(','));
  const policiesClose=read(files.policiesClose),dryrun=read(files.dryrun),freeze=readJson(files.freeze),module=read(files.policyModule),sourceRule=read(files.sourceRule);
  add('POLICIES_WRITE_PASS',policiesClose.includes('Estado: `WRITE_PASS`')&&policiesClose.includes('workflow run: `30586726130`')&&policiesClose.includes('polizas: 1373')&&policiesClose.includes('recibosEsperados: 0')&&policiesClose.includes('cobros: 0'));
  add('SOURCE_DOMAIN_SEPARATION',sourceRule.includes('vehiculos')||sourceRule.toLowerCase().includes('vehículos'));
  add('SOURCE_FREEZE_SCHEMA',freeze.schemaVersion==='orbit360-vehicles-source-freeze-v1'&&freeze.tenantId==='alianzas-soluciones'&&freeze.cutoff==='2026-07-30');
  add('SOURCE_ROWS_EXACT',freeze.sources?.historical?.dataRows===1041&&freeze.sources?.delta?.dataRows===19&&freeze.dryRun?.rawRows===1060);
  add('SOURCE_HASHES_EXACT',freeze.sources?.historical?.sha256==='68904f19705cfa742bba11219725ce1f10de7912d82b88dc085f4119cc3204af'&&freeze.sources?.delta?.sha256==='dbd31e3436946ef65bb737068394e6ee5eed44dc4a2dd96fcf975d5b3995f1d2'&&freeze.sources?.canonicalPolicies?.sha256==='b63c5d10be40fcd4039be1b7844cafb0bf45c2a9904dd47ad65443b5fb43a89f');
  add('DEDUP_EXACT',freeze.dryRun?.canonicalSourceIdentities===1036&&freeze.dryRun?.duplicateGroups===18&&freeze.dryRun?.duplicateExtraRowsMerged===24);
  add('SAFE_PARENT_RELATIONS',freeze.dryRun?.vehiclePolicyRelationsCreate===1032&&freeze.dryRun?.mappingNumeroVigencia===1030&&freeze.dryRun?.mappingNumeroVigenciaNombre===2&&freeze.dryRun?.unsafeNumberOnlyFallback===0);
  add('EXCLUDED_ELIMINATED',freeze.dryRun?.excluded===4&&freeze.dryRun?.excludedReason==='ESTADO_FUENTE_ELIMINADA'&&dryrun.includes('fallback queda prohibido'));
  add('QUALITY_PENDING_PERSISTIBLE',freeze.dryRun?.qualityPending===60&&dryrun.includes('60 relaciones pueden persistirse')&&dryrun.includes('sin inventar atributos'));
  add('POLICY_STATUS_NOT_VEHICLE_AUTHORITY',freeze.identityContract?.sourcePolicyStatusOperational===false&&freeze.identityContract?.canonicalPolicyParentAuthoritative===true&&dryrun.includes('póliza canónica ya persistida es la autoridad'));
  add('NO_CROSS_RENEWAL_COLLAPSE',freeze.identityContract?.writeUnit==='vehicle_policy_association'&&freeze.identityContract?.collapseAcrossPolicyRenewals===false&&freeze.identityContract?.plateOnlyDoesNotReassignClientOwnership===true);
  add('PHYSICAL_KEY_CANDIDATE_ONLY',freeze.identityContract?.physicalVehicleKey==='candidate_plate_only'&&dryrun.includes('physicalVehicleKeyCandidate'));
  add('UI_CONTRACT_COMPATIBLE',module.includes("S().all('vehiculos').find(v => v.polizaId === p.id)")&&module.includes('veh.placa')&&module.includes('veh.marca')&&module.includes('veh.linea'));
  add('DOWNSTREAM_WRITES_ZERO',freeze.downstreamWrites?.receipts===0&&freeze.downstreamWrites?.cartera===0&&freeze.downstreamWrites?.cobros===0&&freeze.downstreamWrites?.finmovs===0);
  add('NO_REAL_WRITE_YET',freeze.realWriteExecuted===false&&freeze.authorizationRequiredForWrite===true&&dryrun.includes('No existe todavía autorización para ese write'));
  add('HASHES_READY',/^[a-f0-9]{64}$/.test(freeze.dryRun?.logicalSha256||'')&&/^[a-f0-9]{64}$/.test(freeze.dryRun?.targetIdDigest||''));
  const failed=checks.filter(c=>!c.ok),status=failed.length?'DATA_CONTRACT_FAILURE':'GO_GATE_CONTRACT';
  const out={schemaVersion:'orbit360-vehicles-static-qualification-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'VEHICLES_STATIC_QUALIFICATION',status,classification:failed.length?'DATA_CONTRACT_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,policiesWritePass:true,reuseTransverseInfrastructure:true,rebuildTransverseInfrastructure:false,sourceDomain:'vehiculos',sourceFilesAlreadyReceived:true,rawRows:freeze.dryRun?.rawRows,canonicalSourceIdentities:freeze.dryRun?.canonicalSourceIdentities,vehiclePolicyRelationsCreate:freeze.dryRun?.vehiclePolicyRelationsCreate,qualityPending:freeze.dryRun?.qualityPending,excluded:freeze.dryRun?.excluded,unsafePolicyNumberOnlyFallback:0,writeUnit:'vehicle_policy_association',physicalVehicleKeyCandidateOnly:true,sourcePolicyStatusOperational:false,downstreamFinancialWrites:0,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,nextPhase:failed.length?'VEHICLES_STATIC_REMEDIATION':'VEHICLES_PRIVATE_SOURCE_READCHECK',nextWriteRequestPrepared:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){const failed=checks.filter(c=>!c.ok);const out={schemaVersion:'orbit360-vehicles-static-qualification-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'VEHICLES_STATIC_QUALIFICATION',status:'DATA_CONTRACT_FAILURE',classification:'PIPELINE_MECHANISM_FAILURE',total:checks.length,passed:checks.length-failed.length,failed:Math.max(1,failed.length),failedCheckIds:failed.length?failed.map(c=>c.id):['VEHICLES_STATIC_EXCEPTION'],checks,error:String(error&&error.message||error).slice(0,600),dataAccess:false,secretAccess:false,firestoreRead:false,firestoreDataWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,nextWriteRequestPrepared:false,containsPII:false,containsSecrets:false};write(out);console.log(JSON.stringify(out,null,2));process.exit(41);}
