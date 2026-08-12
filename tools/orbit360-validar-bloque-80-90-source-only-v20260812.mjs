#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT=process.cwd();
const EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/block-80-90-source-only-v20260812.json');
function fail(code,detail=''){const e=new Error(code+(detail?':'+detail:''));e.code=code;throw e;}
function read(rel){const p=path.join(ROOT,rel);if(!fs.existsSync(p))fail('PIPELINE_MECHANISM_FAILURE','MISSING:'+rel);return fs.readFileSync(p,'utf8');}
function parse(rel){try{return JSON.parse(read(rel));}catch(e){fail('DATA_CONTRACT_FAILURE','INVALID_JSON:'+rel);}}
function has(rel,marker){const text=read(rel);if(!text.includes(marker))fail('DATA_CONTRACT_FAILURE','MARKER_MISSING:'+rel+':'+marker);return true;}
function writeEvidence(obj){fs.mkdirSync(path.dirname(EVIDENCE),{recursive:true});fs.writeFileSync(EVIDENCE,JSON.stringify(obj,null,2)+'\n','utf8');}
const result={schemaVersion:'orbit360-block-80-90-source-only-preflight-v1',ok:false,decision:'STOP',classification:null,sourceOnly:true,secrets:false,firestore:false,writes:false,deploy:false,production:false,checks:{}};
try{
  result.checks.polizas=has('orbit360-platform/docs/CIERRE-WRITE-POLIZAS-AYS-20260730.md','WRITE_PASS');
  result.checks.vehiculos=has('orbit360-platform/docs/CIERRE-WRITE-VEHICULOS-AYS-20260730.md','WRITE_PASS');
  result.checks.recibos=has('orbit360-platform/docs/CIERRE-WRITE-RECIBOS-CARTERA-AYS-V910-20260730.md','WRITE_PASS');
  result.checks.comisiones=has('orbit360-platform/docs/CIERRE-LAB-PLANILLAS-COMISIONES-WRITE-PASS-20260801.md','WRITE_PASS');
  const lifecycle=parse('tools/orbit360-validator-lifecycle-contract-planillas-comisiones-linkage-readonly-v20260801.json');
  if(lifecycle.status!=='PLANILLAS_COMMISSION_CONTROLLED_WRITE_CLOSED'||lifecycle.controlledWrite?.status!=='WRITE_PASS'||lifecycle.authorization?.consumed!==true||lifecycle.financeActivated!==false||Number(lifecycle.operationalWritesAllowed)!==0)fail('DATA_CONTRACT_FAILURE','COMMISSION_CLOSURE_NOT_REUSABLE_AS_EVIDENCE');
  result.checks.commissionLifecycleClosed=true;
  const legacy=read('.github/workflows/orbit360-planillas-comisiones-linkage-readonly-v20260801.yml');
  result.checks.historicalCommissionWorkflowStale=legacy.includes('PLANILLAS_COMMISSION_DRYRUN_ACTIVE');
  if(!result.checks.historicalCommissionWorkflowStale)fail('VALIDATOR_STALE','HISTORICAL_STALE_SIGNATURE_NOT_DETECTED');
  const cobros=parse('orbit360-platform/runtime-gate-crm-v20260716/cobros-full-ledger-write-runtime-post-rootcause-r2-sanitized-v20260811.json');
  const b=cobros.snapshotAfter?.business||{};
  if(cobros.status!=='COBROS_REAL_LEDGER_COMPLETE'||cobros.ok!==true||Number(cobros.newCobros)!==0||Number(cobros.receiptWrites)!==0||Number(cobros.policyWrites)!==0||Number(cobros.finmovWrites)!==0)fail('DATA_CONTRACT_FAILURE','COBROS_10102_CLOSURE');
  if(Number(b.policies?.count)!==1375||Number(b.receipts?.count)!==1294||Number(b.cobros?.count)!==7||Number(b.finmovsCount)!==1)fail('DATA_CONTRACT_FAILURE','POST_COBROS_SNAPSHOT');
  result.checks.postCobrosSnapshot={polizas:1375,recibos:1294,cobros:7,finmovs:1,unchangedByCobros10102:true};
  has('orbit360-platform/core/importa-financiero-historico-contract-p0.js',"TARGET_COLLECTION = 'financiero_historico'");
  const writer=read('tools/orbit360-financiero-historico-canonical-apply-v20260812.mjs');
  for(const marker of ["TARGET_COLLECTION = 'financiero_historico'","['finmovs','cobros','recibosEsperados','carteraPrimas','polizas','clientes']","promotionToFinmovs: false","writeOperational: false"])if(!writer.includes(marker))fail('PIPELINE_MECHANISM_FAILURE','FIN_HIST_WRITER_MARKER:'+marker);
  const child=spawnSync(process.execPath,['tools/orbit360-validar-financiero-historico-canonical-writer-v20260812.mjs'],{cwd:ROOT,encoding:'utf8'});
  if(child.status!==0)fail('PIPELINE_MECHANISM_FAILURE','FIN_HIST_SOURCE_ONLY_VALIDATOR:'+String(child.stderr||child.stdout).slice(0,300));
  const validator=JSON.parse(child.stdout);
  if(validator.ok!==true||validator.decision!=='FINANCIERO_HISTORICO_WRITER_SOURCE_ONLY_PASS'||validator.firestoreWrites!==0||validator.operationalWrites!==0||validator.finmovsWrite!==false)fail('PIPELINE_MECHANISM_FAILURE','FIN_HIST_VALIDATOR_RESULT');
  result.checks.financieroHistoricoWriter={sourceOnlyPass:true,targetCollection:'financiero_historico',firestoreWrites:0,operationalWrites:0,finmovsWrite:false};
  result.checks.reusedClosures=['polizas','vehiculos','recibos_cartera','planillas_comisiones','cobros_10_10_2'];
  result.checks.reopenedHistoricalWorkflows=0;
  result.ok=true; result.decision='GO_BLOCK_80_90_SOURCE_ONLY'; result.classification='READINESS_MECHANISM_CORRECTED';
}catch(e){result.classification=String(e.code||'PIPELINE_MECHANISM_FAILURE');result.error=String(e.message||e).slice(0,600);}
writeEvidence(result);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
