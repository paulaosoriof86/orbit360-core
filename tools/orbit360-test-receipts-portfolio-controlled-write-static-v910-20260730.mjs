#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
const req='.github/orbit360-requests/receipts-portfolio-write-v910-20260730.json';
const owner=fs.readFileSync('tools/orbit360-receipts-portfolio-canonical-apply-v910-20260730.mjs','utf8');
const freeze=JSON.parse(fs.readFileSync('tools/orbit360-receipts-portfolio-source-freeze-v910-20260730.json','utf8'));
const lifecycle=JSON.parse(fs.readFileSync('tools/orbit360-validator-lifecycle-contract-receipts-portfolio-static-v910-20260730.json','utf8'));
const close=fs.readFileSync('orbit360-platform/docs/CIERRE-RECALC-CARTERA-HISTORICA-EXIGIBLE-AYS-20260730.md','utf8');
const note=fs.readFileSync('orbit360-platform/docs/NOTA-RECTORA-CARTERA-HISTORICA-EXIGIBLE-FIFO-20260730.md','utf8');
const academia=fs.readFileSync('orbit360-platform/docs/ACADEMIA-IMPACT-CARTERA-HISTORICA-EXIGIBLE-20260730.md','utf8');
const phase=String(process.env.ORBIT360_RECEIPTS_GATE_PHASE||'PREWRITE').toUpperCase();
const authorized=phase==='AUTHORIZED_WRITE';
const checks=[];const add=(id,ok)=>checks.push({id,ok:Boolean(ok)});
function exactRequest(){
  if(!fs.existsSync(req))return false;
  try{
    const r=JSON.parse(fs.readFileSync(req,'utf8'));
    return r.schemaVersion==='orbit360-receipts-portfolio-write-request-v2'&&r.contractVersion==='9.1.0'&&r.approved===true&&r.phrase==='AUTORIZO ESCRITURA CONTROLADA RECIBOS CARTERA AYS V910 20260730'&&
      r.activePackageSha256===freeze.activePackage?.physicalSha256&&r.historicalPackageSha256===freeze.historicalDeltaPackage?.physicalSha256&&
      r.activeLogicalSha256===freeze.activePackage?.logicalSha256&&r.historicalLogicalSha256===freeze.historicalDeltaPackage?.logicalSha256&&
      r.activeReceiptIdDigest===freeze.activePackage?.receiptIdDigest&&r.historicalReceiptIdDigest===freeze.historicalDeltaPackage?.receiptIdDigest&&
      r.activePortfolioIdDigest===freeze.activePackage?.portfolioIdDigest&&r.historicalPortfolioIdDigest===freeze.historicalDeltaPackage?.portfolioIdDigest&&
      Number(r.scope?.receipts)===1293&&Number(r.scope?.portfolio)===673&&Number(r.scope?.historical)===32&&Number(r.scope?.cobros)===0&&Number(r.scope?.finmovs)===0;
  }catch{return false;}
}
add('FREEZE_SCHEMA',freeze.schemaVersion==='orbit360-receipts-portfolio-source-freeze-v2'&&freeze.contractVersion==='9.1.0');
add('ACTIVE_COUNTS',freeze.activeUniverse?.receipts===1261&&freeze.activeUniverse?.portfolio===641&&freeze.activeUniverse?.dueOrOverdue===99&&freeze.activeUniverse?.futurePending===542);
add('HIST_COUNTS',freeze.historicalReconciliation?.historicalReceipts===32&&freeze.historicalReconciliation?.historicalPortfolio===32&&freeze.historicalReconciliation?.sigaMaterialized===27&&freeze.historicalReconciliation?.mapfreMaterialized===4&&freeze.historicalReconciliation?.elRobleMaterialized===1);
add('HIST_AMOUNT',Number(freeze.historicalReconciliation?.historicalAmountGTQ)===13443.48);
add('COMBINED_COUNTS',freeze.combinedExpected?.receipts===1293&&freeze.combinedExpected?.portfolio===673&&freeze.combinedExpected?.dueOrOverdue===131&&freeze.combinedExpected?.historicalExigible===32);
add('HASHES',[freeze.activePackage?.physicalSha256,freeze.activePackage?.logicalSha256,freeze.activePackage?.receiptIdDigest,freeze.activePackage?.portfolioIdDigest,freeze.historicalDeltaPackage?.physicalSha256,freeze.historicalDeltaPackage?.logicalSha256,freeze.historicalDeltaPackage?.receiptIdDigest,freeze.historicalDeltaPackage?.portfolioIdDigest].every(x=>/^[a-f0-9]{64}$/.test(x||'')));
add('REQUEST_LIFECYCLE',authorized?exactRequest():!fs.existsSync(req));
add('AUTHORIZED_PHASE_DECLARED',!authorized||lifecycle.authorizationLifecycle?.authorizedWriteRequiresExactImmutableRequest===true);
add('WRITE_GUARD',owner.includes("mode==='WRITE'")&&owner.includes('REQUEST_MISSING')&&owner.includes('REQUEST_MISMATCH')&&owner.includes('REQUEST_SCOPE_MISMATCH'));
add('EXACT_PHRASE',owner.includes('AUTORIZO ESCRITURA CONTROLADA RECIBOS CARTERA AYS V910 20260730'));
add('DRYRUN_READY',owner.includes("mode==='DRY_RUN'")&&owner.includes("result.status='PREWRITE_READY'"));
add('PACKAGE_CHECK',owner.includes("mode==='PACKAGE_CHECK'")&&owner.includes("result.status='PACKAGE_CHECK_PASS'"));
add('TARGET_COLLECTIONS',owner.includes("'recibosEsperados'")&&owner.includes("'carteraPrimas'"));
add('DOWNSTREAM_ZERO',owner.includes("Number(req.scope?.cobros)!==0")&&owner.includes("Number(req.scope?.finmovs)!==0"));
add('ROLLBACK',owner.includes('deleteCreated')&&owner.includes('ROLLBACK_INCOMPLETE')&&owner.includes("result.status='WRITE_PASS'"));
add('CREATE_ONLY',owner.includes('b.create(')&&!owner.includes('b.set(')&&!owner.includes('b.update('));
add('ACTIVE_STATE_RULE',owner.includes("['Vigente','Por renovar']")&&owner.includes('activeInvalidPolicyState'));
add('HIST_STATE_RULE',owner.includes("['Histórica','Renovada']")&&owner.includes('historicalInvalidPolicyState'));
add('HIST_EXPIRED_TERM_RULE',owner.includes('historicalTermNotExpired')&&owner.includes('HISTORICAL_NOT_DUE_AT_CUTOFF'));
add('NO_COVERAGE_END_DATE_BLOCK',freeze.identityContract?.historicalReceiptMayFallAfterCoverageEnd===true&&!owner.includes('HISTORICAL_RECEIPT_AFTER_POLICY_END'));
add('SOURCE_BACKED_ONLY',freeze.identityContract?.historicalRowsSourceBackedOnly===true&&owner.includes('source_backed_no_schedule_generation'));
add('INSURER_SUPERSEDES_SIGA',freeze.identityContract?.higherInsurerAuthoritySupersedesSiga===true&&close.includes('sustituye el calendario SIGA'));
add('NO_SCHEDULE_REACTIVATION',freeze.identityContract?.historicalRowsGenerateSchedule===false&&freeze.identityContract?.historicalRowsReactivatePolicy===false&&note.includes('no genera nuevas cuotas'));
add('PAYMENT_NOT_COBRO',freeze.identityContract?.reportedPaymentIsCobro===false&&close.includes('no crea `cobros`'));
add('FIFO_DOWNSTREAM',freeze.identityContract?.fifoAppliedInThisBlock===false&&freeze.identityContract?.fifoReservedForCobrosConciliacion===true&&academia.includes('Cobros/conciliación'));
add('NO_PRODUCTION',lifecycle.executionProfile?.capabilities?.production===false&&lifecycle.executionProfile?.capabilities?.writes===false);
add('OLD_PREWRITE_FROZEN',freeze.oldPrewrite900Frozen===true&&close.includes('9.0.0 queda congelado'));
add('NO_REAL_WRITE_AT_FREEZE',freeze.realWriteExecuted===false&&freeze.authorizationRequiredForWrite===true&&freeze.requestExistsAtFreeze===false);
const failed=checks.filter(c=>!c.ok);
const out={schemaVersion:'orbit360-receipts-portfolio-write-static-test-v2',contractVersion:'9.1.0',gatePhase:phase,status:failed.length?'STATIC_WRITE_BLOCKED':'STATIC_WRITE_READY',ok:failed.length===0,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,requestState:authorized?'EXACT_AUTHORIZED_REQUIRED':'ABSENT_REQUIRED',operationalWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(41);
