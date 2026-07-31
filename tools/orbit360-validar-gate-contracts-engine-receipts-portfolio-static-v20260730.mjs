#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const GATE='block9-receipts-portfolio-static-v20260730';
const VERSION='9.0.0';
const files={
  vehiclesClose:'orbit360-platform/docs/CIERRE-WRITE-VEHICULOS-AYS-20260730.md',
  sourceClose:'orbit360-platform/docs/CIERRE-SOURCE-RECONCILIACION-RECIBOS-CARTERA-AYS-20260730.md',
  sourceRegistry:'orbit360-platform/docs/REGISTRO-FUENTES-RECIBOS-CARTERA-INGESTA-DIRECTA-20260730.md',
  academia:'orbit360-platform/docs/ACADEMIA-IMPACT-RECIBOS-CARTERA-CONCILIACION-20260730.md',
  freeze:'tools/orbit360-receipts-portfolio-source-freeze-v20260730.json',
  owner:'tools/orbit360-receipts-portfolio-canonical-apply-v20260730.mjs',
  staticTest:'tools/orbit360-test-receipts-portfolio-controlled-write-static-v20260730.mjs'
};
const requestPath='.github/orbit360-requests/receipts-portfolio-write-20260730.json';
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').replace(/\s+/g,' ').trim().slice(0,420)});
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const readJson=rel=>JSON.parse(read(rel));
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');}
try{
  add('GATE',process.argv[2]===GATE);
  const missing=Object.values(files).filter(f=>!fs.existsSync(path.join(ROOT,f)));
  add('FILES',missing.length===0,missing.join(','));if(missing.length)throw new Error('RECEIPTS_STATIC_FILES_MISSING:'+missing.join(','));
  const vehiclesClose=read(files.vehiclesClose),sourceClose=read(files.sourceClose),sourceRegistry=read(files.sourceRegistry),
    academia=read(files.academia),freeze=readJson(files.freeze),owner=read(files.owner);
  execFileSync(process.execPath,['--check',files.owner],{cwd:ROOT,stdio:'pipe'});add('OWNER_SYNTAX',true);
  execFileSync(process.execPath,['--check',files.staticTest],{cwd:ROOT,stdio:'pipe'});add('STATIC_TEST_SYNTAX',true);
  const staticOut=JSON.parse(execFileSync(process.execPath,[files.staticTest],{cwd:ROOT,encoding:'utf8'}));add('STATIC_WRITE_TEST',staticOut.status==='STATIC_WRITE_READY'&&staticOut.failed===0);
  add('VEHICLES_WRITE_PASS',vehiclesClose.includes('WRITE_PASS')&&vehiclesClose.includes('vehiculos: 1032')&&vehiclesClose.includes('recibosEsperados: 0')&&vehiclesClose.includes('carteraPrimas: 0'));
  add('SOURCE_RECONCILIATION_CLOSED',sourceClose.includes('SOURCE_RECONCILED_READY')&&sourceClose.includes('recibosEsperados candidatos: 1261')&&sourceClose.includes('carteraPrimas candidatos: 641'));
  add('FREEZE_SCHEMA',freeze.schemaVersion==='orbit360-receipts-portfolio-source-freeze-v1'&&freeze.tenantId==='alianzas-soluciones'&&freeze.cutoff==='2026-07-30');
  add('PRIVATE_PACKAGE_HASHES',/^[a-f0-9]{64}$/.test(freeze.package?.physicalSha256||'')&&/^[a-f0-9]{64}$/.test(freeze.package?.logicalSha256||'')&&/^[a-f0-9]{64}$/.test(freeze.package?.receiptIdDigest||'')&&/^[a-f0-9]{64}$/.test(freeze.package?.portfolioIdDigest||''));
  add('COUNTS_EXACT',freeze.dryRun?.activePolicies===224&&freeze.dryRun?.activePoliciesWithCalendar===223&&freeze.dryRun?.activePoliciesWithoutCalendar===1&&freeze.dryRun?.receiptsExpected===1261&&freeze.dryRun?.portfolioPending===641);
  add('PORTFOLIO_SPLIT',freeze.dryRun?.dueOrOverdue===99&&freeze.dryRun?.futurePending===542);
  add('STATE_PROFILE',freeze.dryRun?.paymentReported===365&&freeze.dryRun?.noPendingAccordingInsurer===211&&freeze.dryRun?.receiptHolds===44&&freeze.dryRun?.portfolioQualityFlags===28&&freeze.dryRun?.obsoleteScheduleExcluded===20);
  add('ACTIVE_POLICY_FILTER',Array.isArray(freeze.identityContract?.activePolicyStates)&&freeze.identityContract.activePolicyStates.includes('Vigente')&&freeze.identityContract.activePolicyStates.includes('Por renovar')&&freeze.identityContract?.futurePolicyTermsExcluded===true&&freeze.identityContract?.historicalCancelledRenewedTermsExcluded===true);
  add('CONTRACTUAL_STATUS_AUTHORITY',freeze.identityContract?.sourceCollectionStatusOperational===false&&freeze.identityContract?.canonicalPolicyStatusAuthoritative===true&&sourceClose.includes('estado contractual canónico'));
  add('ENDORSEMENT_AWARE',freeze.identityContract?.endorsementAware===true&&sourceClose.includes('endoso'));
  add('INSURER_REFINES_SIGA',freeze.identityContract?.insurerBalanceMayOverrideSigaSchedule===true&&sourceClose.includes('balance')&&sourceClose.includes('SIGA'));
  add('PAYMENT_NOT_COBRO',freeze.identityContract?.reportedPaymentIsCobro===false&&sourceClose.includes('pago reportado')&&sourceClose.includes('no crea `cobros`'));
  add('DOWNSTREAM_ZERO',freeze.downstreamWrites?.cobros===0&&freeze.downstreamWrites?.finmovs===0);
  add('OWNER_WRITE_GUARDED',owner.includes('REQUEST_MISSING')&&owner.includes('REQUEST_MISMATCH')&&owner.includes('REQUEST_SCOPE_MISMATCH')&&owner.includes('AUTORIZO ESCRITURA CONTROLADA RECIBOS CARTERA AYS 20260730'));
  add('OWNER_ROLLBACK',owner.includes('deleteCreated')&&owner.includes('ROLLBACK_INCOMPLETE'));
  add('OWNER_CREATE_ONLY',owner.includes('b.create(')&&!owner.includes('b.set(')&&!owner.includes('b.update('));
  add('REQUEST_ABSENT',!fs.existsSync(path.join(ROOT,requestPath)));
  add('NO_REAL_WRITE',freeze.realWriteExecuted===false&&freeze.authorizationRequiredForWrite===true&&freeze.requestExistsAtFreeze===false);
  add('REUSABLE_DOCUMENTED',sourceRegistry.includes('Centro de importación')&&academia.includes('Importación individual y masiva'));
  add('NO_PII_IN_FREEZE',freeze.containsPII===false&&freeze.containsSecrets===false&&!JSON.stringify(freeze).includes('@'));
  const failed=checks.filter(c=>!c.ok),status=failed.length?'DATA_CONTRACT_FAILURE':'GO_GATE_CONTRACT';
  const out={schemaVersion:'orbit360-receipts-portfolio-static-qualification-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'RECEIPTS_PORTFOLIO_STATIC_QUALIFICATION',
    status,classification:failed.length?'DATA_CONTRACT_FAILURE':null,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,
    policiesWritePass:true,vehiclesWritePass:true,reuseTransverseInfrastructure:true,rebuildTransverseInfrastructure:false,sourceDomain:'recibos_cartera',
    activePolicies:freeze.dryRun?.activePolicies,activePoliciesWithCalendar:freeze.dryRun?.activePoliciesWithCalendar,receiptsExpected:freeze.dryRun?.receiptsExpected,
    portfolioPending:freeze.dryRun?.portfolioPending,dueOrOverdue:freeze.dryRun?.dueOrOverdue,futurePending:freeze.dryRun?.futurePending,paymentReported:freeze.dryRun?.paymentReported,
    downstreamCobroWrites:0,downstreamFinmovWrites:0,firestoreDataWrites:0,operationalWrites:0,dataAccess:false,secretAccess:false,firestoreRead:false,runtimeExecuted:false,browserExecuted:false,
    rulesApplied:false,deployExecuted:false,productionTouched:false,nextPhase:failed.length?'RECEIPTS_PORTFOLIO_STATIC_REMEDIATION':'RECEIPTS_PORTFOLIO_PREWRITE_READONLY',
    nextWriteRequestPrepared:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
}catch(error){
  const failed=checks.filter(c=>!c.ok);
  const out={schemaVersion:'orbit360-receipts-portfolio-static-qualification-v1',gateId:GATE,contractVersion:VERSION,executionPhase:'RECEIPTS_PORTFOLIO_STATIC_QUALIFICATION',
    status:'DATA_CONTRACT_FAILURE',classification:'PIPELINE_MECHANISM_FAILURE',total:checks.length,passed:checks.length-failed.length,failed:Math.max(1,failed.length),
    failedCheckIds:failed.length?failed.map(c=>c.id):['RECEIPTS_PORTFOLIO_STATIC_EXCEPTION'],checks,error:String(error&&error.message||error).slice(0,600),
    dataAccess:false,secretAccess:false,firestoreRead:false,firestoreDataWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,rulesApplied:false,deployExecuted:false,productionTouched:false,
    nextWriteRequestPrepared:false,containsPII:false,containsSecrets:false};
  write(out);console.log(JSON.stringify(out,null,2));process.exit(41);
}
