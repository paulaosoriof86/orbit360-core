#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import XLSX from 'xlsx';

const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const CUTOFF='2026-07-30';
const PHRASE='AUTORIZO ESCRITURA CONTROLADA RECIBOS CARTERA AYS V910 20260730';
const EXPECTED={
  clients:430,insurers:30,advisors:7,policies:1373,vehicles:1032,
  receiptsBefore:0,portfolioBefore:0,cobros:0,finmovs:0,
  activePolicies:224,activePoliciesWithCalendar:223,activePoliciesWithoutCalendar:1,futurePoliciesExcluded:7,
  activeReceipts:1261,activePortfolio:641,activeDueOrOverdue:99,futurePending:542,paymentReported:365,
  historicalReceipts:32,historicalPortfolio:32,historicalAmountGTQ:13443.48,
  receiptsCreate:1293,portfolioCreate:673,dueOrOverdue:131
};
const mode=String(process.env.ORBIT360_RECEIPTS_MODE||'DRY_RUN').toUpperCase();
const activePath=process.env.ORBIT360_RECEIPTS_ACTIVE_XLSX||'';
const historicalPath=process.env.ORBIT360_RECEIPTS_HISTORICAL_XLSX||'';
const requestPath=process.env.ORBIT360_RECEIPTS_REQUEST||'';
const evidencePath=process.env.ORBIT360_RECEIPTS_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/receipts-portfolio-prewrite-v910.json';
const expectedActiveSha=process.env.ORBIT360_RECEIPTS_ACTIVE_SHA256||'';
const expectedActiveLogical=process.env.ORBIT360_RECEIPTS_ACTIVE_LOGICAL_SHA256||'';
const expectedActiveReceiptDigest=process.env.ORBIT360_RECEIPTS_ACTIVE_ID_DIGEST||'';
const expectedActivePortfolioDigest=process.env.ORBIT360_PORTFOLIO_ACTIVE_ID_DIGEST||'';
const expectedHistoricalSha=process.env.ORBIT360_RECEIPTS_HISTORICAL_SHA256||'';
const expectedHistoricalLogical=process.env.ORBIT360_RECEIPTS_HISTORICAL_LOGICAL_SHA256||'';
const expectedHistoricalReceiptDigest=process.env.ORBIT360_RECEIPTS_HISTORICAL_ID_DIGEST||'';
const expectedHistoricalPortfolioDigest=process.env.ORBIT360_PORTFOLIO_HISTORICAL_ID_DIGEST||'';

function fail(code,detail=''){const e=new Error(code+(detail?':'+detail:''));e.code=code;throw e;}
function clean(v){return String(v==null?'':v).trim();}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex');}
function bool(v){return v===true||v===1||v==='1'||String(v).toLowerCase()==='true';}
function num(v){if(v==null||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function sheetRows(wb,name){const sh=wb.Sheets[name];if(!sh)fail('DATA_CONTRACT_FAILURE','SHEET_MISSING_'+name);return XLSX.utils.sheet_to_json(sh,{range:3,defval:'',raw:true}).map(normalizeRow);}
function normalizeRow(r){const out={};for(const [k,v] of Object.entries(r)){if(['enCartera','requiereValidacion','incluidoCarteraFinal'].includes(k))out[k]=bool(v);else if(['primaNeta','gastosExpedicion','gastosFinanciamiento','descuento','impuestosIVA','primaTotal','montoFuente','montoSIGA','diferenciaDias','diferenciaMonto'].includes(k))out[k]=num(v);else out[k]=v==null?'':v;}return out;}
function controlValue(sh,label){for(let row=1;row<=40;row++){if(clean(sh[`E${row}`]?.v)===label)return clean(sh[`F${row}`]?.v);}return '';}
function readWorkbook(filePath,expectedSha,label){if(!filePath||!fs.existsSync(filePath))fail('ENVIRONMENT_FAILURE',label+'_XLSX_MISSING');const bytes=fs.readFileSync(filePath),physicalSha=sha256(bytes);if(expectedSha&&physicalSha!==expectedSha)fail('DATA_CONTRACT_FAILURE',label+'_PACKAGE_SHA_MISMATCH');return {bytes,physicalSha,wb:XLSX.read(bytes,{type:'buffer',cellDates:false})};}
function digestIds(rows){const ids=rows.map(r=>clean(r.id));if(new Set(ids).size!==ids.length||ids.includes(''))fail('DATA_CONTRACT_FAILURE','DUPLICATE_OR_EMPTY_IDS');return sha256([...ids].sort().join('\n'));}
function safeDoc(row){const out={};for(const [k,v] of Object.entries(row)){if(v===undefined||typeof v==='function')continue;if(typeof v==='number'&&!Number.isFinite(v))continue;out[k]=v;}return out;}
async function countColl(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).count().get();return snap.data().count;}
async function mapDocs(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).get();return new Map(snap.docs.map(d=>[d.id,d.data()]));}
async function idsColl(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).select().get();return new Set(snap.docs.map(d=>d.id));}
async function createChunked(db,coll,rows,created){for(let i=0;i<rows.length;i+=300){const chunk=rows.slice(i,i+300),b=db.batch();for(const row of chunk)b.create(db.collection('tenantId').doc(TENANT).collection(coll).doc(clean(row.id)),safeDoc(row));await b.commit();for(const row of chunk)created.push({coll,id:clean(row.id)});}}
async function deleteCreated(db,created){for(let i=created.length;i>0;i-=300){const chunk=created.slice(Math.max(0,i-300),i),b=db.batch();for(const x of chunk)b.delete(db.collection('tenantId').doc(TENANT).collection(x.coll).doc(x.id));await b.commit();}}
function sanitizeError(e){return clean(e&&e.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,600);}
function writeEvidence(result){fs.mkdirSync(path.dirname(evidencePath),{recursive:true});const serialized=JSON.stringify(result,null,2)+'\n';JSON.parse(serialized);const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,serialized,'utf8');JSON.parse(fs.readFileSync(tmp,'utf8'));fs.renameSync(tmp,evidencePath);}
function isoLeq(a,b){return /^\d{4}-\d{2}-\d{2}$/.test(clean(a))&&clean(a)<=b;}

function parseActive(){
  const src=readWorkbook(activePath,expectedActiveSha,'ACTIVE');const summary=src.wb.Sheets['Resumen'];if(!summary)fail('DATA_CONTRACT_FAILURE','ACTIVE_SUMMARY_MISSING');
  const logical=controlValue(summary,'logicalSha256'),ridEmbedded=controlValue(summary,'receiptIdDigest'),pidEmbedded=controlValue(summary,'portfolioIdDigest');
  if(expectedActiveLogical&&logical!==expectedActiveLogical)fail('DATA_CONTRACT_FAILURE','ACTIVE_LOGICAL_SHA_MISMATCH');
  if(expectedActiveReceiptDigest&&ridEmbedded!==expectedActiveReceiptDigest)fail('DATA_CONTRACT_FAILURE','ACTIVE_RECEIPT_DIGEST_EMBEDDED_MISMATCH');
  if(expectedActivePortfolioDigest&&pidEmbedded!==expectedActivePortfolioDigest)fail('DATA_CONTRACT_FAILURE','ACTIVE_PORTFOLIO_DIGEST_EMBEDDED_MISMATCH');
  const receipts=sheetRows(src.wb,'Recibos_Calendario'),portfolio=sheetRows(src.wb,'Cartera_Canonica');
  if(receipts.length!==EXPECTED.activeReceipts||portfolio.length!==EXPECTED.activePortfolio)fail('DATA_CONTRACT_FAILURE','ACTIVE_COUNTS');
  const receiptDigest=digestIds(receipts),portfolioDigest=digestIds(portfolio);
  if(expectedActiveReceiptDigest&&receiptDigest!==expectedActiveReceiptDigest)fail('DATA_CONTRACT_FAILURE','ACTIVE_RECEIPT_ID_DIGEST');
  if(expectedActivePortfolioDigest&&portfolioDigest!==expectedActivePortfolioDigest)fail('DATA_CONTRACT_FAILURE','ACTIVE_PORTFOLIO_ID_DIGEST');
  const due=portfolio.filter(r=>clean(r.exigibilidad)!=='futura').length,future=portfolio.filter(r=>clean(r.exigibilidad)==='futura').length;
  if(due!==EXPECTED.activeDueOrOverdue||future!==EXPECTED.futurePending)fail('DATA_CONTRACT_FAILURE','ACTIVE_PORTFOLIO_PROFILE');
  return {physicalSha:src.physicalSha,logical,receiptDigest,portfolioDigest,receipts,portfolio};
}

function parseHistorical(){
  const src=readWorkbook(historicalPath,expectedHistoricalSha,'HISTORICAL');const summary=src.wb.Sheets['Resumen'];if(!summary)fail('DATA_CONTRACT_FAILURE','HISTORICAL_SUMMARY_MISSING');
  if(controlValue(summary,'schemaVersion')!=='orbit360-historical-exigible-delta-v1')fail('DATA_CONTRACT_FAILURE','HISTORICAL_SCHEMA');
  const logical=controlValue(summary,'logicalSha256'),ridEmbedded=controlValue(summary,'receiptIdDigest'),pidEmbedded=controlValue(summary,'portfolioIdDigest');
  if(expectedHistoricalLogical&&logical!==expectedHistoricalLogical)fail('DATA_CONTRACT_FAILURE','HISTORICAL_LOGICAL_SHA_MISMATCH');
  if(expectedHistoricalReceiptDigest&&ridEmbedded!==expectedHistoricalReceiptDigest)fail('DATA_CONTRACT_FAILURE','HISTORICAL_RECEIPT_DIGEST_EMBEDDED_MISMATCH');
  if(expectedHistoricalPortfolioDigest&&pidEmbedded!==expectedHistoricalPortfolioDigest)fail('DATA_CONTRACT_FAILURE','HISTORICAL_PORTFOLIO_DIGEST_EMBEDDED_MISMATCH');
  const receipts=sheetRows(src.wb,'Recibos_Historicos'),portfolio=sheetRows(src.wb,'Cartera_Historica');
  if(receipts.length!==EXPECTED.historicalReceipts||portfolio.length!==EXPECTED.historicalPortfolio)fail('DATA_CONTRACT_FAILURE','HISTORICAL_COUNTS');
  const receiptDigest=digestIds(receipts),portfolioDigest=digestIds(portfolio);
  if(expectedHistoricalReceiptDigest&&receiptDigest!==expectedHistoricalReceiptDigest)fail('DATA_CONTRACT_FAILURE','HISTORICAL_RECEIPT_ID_DIGEST');
  if(expectedHistoricalPortfolioDigest&&portfolioDigest!==expectedHistoricalPortfolioDigest)fail('DATA_CONTRACT_FAILURE','HISTORICAL_PORTFOLIO_ID_DIGEST');
  const allowedSources=new Set(['SIGA','Mapfre','ElRoble']);let amount=0;
  for(const r of receipts){
    if(clean(r.estadoOperativo)!=='pendiente_vencido'||clean(r.exigibilidad)!=='historica_exigible'||clean(r.carteraTipo)!=='historica_exigible'||clean(r.origenRegistro)!=='source_backed_no_schedule_generation'||!bool(r.enCartera))fail('DATA_CONTRACT_FAILURE','HISTORICAL_RECEIPT_PROFILE');
    if(!allowedSources.has(clean(r.fuenteAutoridad)))fail('DATA_CONTRACT_FAILURE','HISTORICAL_SOURCE_AUTHORITY');
    if(!isoLeq(r.fechaLimite,CUTOFF))fail('DATA_CONTRACT_FAILURE','HISTORICAL_NOT_DUE_AT_CUTOFF');
    amount+=Number(r.primaTotal||0);
  }
  if(Math.abs(amount-EXPECTED.historicalAmountGTQ)>0.009)fail('DATA_CONTRACT_FAILURE','HISTORICAL_AMOUNT');
  const receiptById=new Map(receipts.map(r=>[clean(r.id),r]));
  for(const c of portfolio){const rr=receiptById.get(clean(c.reciboId));if(!rr)fail('DATA_CONTRACT_FAILURE','HISTORICAL_PORTFOLIO_RECEIPT_MISSING');if(clean(c.carteraTipo)!=='historica_exigible'||clean(c.exigibilidad)!=='historica_exigible')fail('DATA_CONTRACT_FAILURE','HISTORICAL_PORTFOLIO_PROFILE');if(clean(rr.polizaId)!==clean(c.polizaId)||clean(rr.clienteId)!==clean(c.clienteId)||clean(rr.aseguradoraId)!==clean(c.aseguradoraId)||Number(rr.primaTotal)!==Number(c.primaTotal))fail('DATA_CONTRACT_FAILURE','HISTORICAL_PORTFOLIO_RELATION');}
  return {physicalSha:src.physicalSha,logical,receiptDigest,portfolioDigest,receipts,portfolio,amount:Math.round(amount*100)/100};
}

const result={schemaVersion:'orbit360-receipts-portfolio-prewrite-v2',contractVersion:'9.1.0',mode,status:'STARTED',tenantId:TENANT,projectId:PROJECT,cutoff:CUTOFF,expected:EXPECTED,
  activePackage:{},historicalPackage:{},before:{},after:{},validation:{},rollback:{executed:false,restored:false},writes:{receipts:0,portfolio:0,audit:0,cobros:0,finmovs:0},
  firestoreRead:false,firestoreWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false};

try{
  const active=parseActive(),historical=parseHistorical();
  result.activePackage={packageSha256:active.physicalSha,logicalSha256:active.logical,receiptIdDigest:active.receiptDigest,portfolioIdDigest:active.portfolioDigest};
  result.historicalPackage={packageSha256:historical.physicalSha,logicalSha256:historical.logical,receiptIdDigest:historical.receiptDigest,portfolioIdDigest:historical.portfolioDigest,amountGTQ:historical.amount};
  const receipts=[...active.receipts,...historical.receipts],portfolio=[...active.portfolio,...historical.portfolio];
  if(receipts.length!==EXPECTED.receiptsCreate||portfolio.length!==EXPECTED.portfolioCreate)fail('DATA_CONTRACT_FAILURE','COMBINED_COUNTS');
  if(new Set(receipts.map(r=>clean(r.id))).size!==receipts.length||new Set(portfolio.map(r=>clean(r.id))).size!==portfolio.length)fail('DATA_CONTRACT_FAILURE','COMBINED_ID_COLLISION');
  result.validation={receiptCount:receipts.length,portfolioCount:portfolio.length,activeReceipts:active.receipts.length,activePortfolio:active.portfolio.length,historicalReceipts:historical.receipts.length,historicalPortfolio:historical.portfolio.length,historicalAmountGTQ:historical.amount,dueOrOverdue:EXPECTED.dueOrOverdue,futurePending:EXPECTED.futurePending};
  if(mode==='PACKAGE_CHECK'){result.status='PACKAGE_CHECK_PASS';result.ok=true;}
  else {
    const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');
    admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const db=admin.firestore();result.firestoreRead=true;
    const watched=['clientes','aseguradoras','asesores','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','finmovs'];for(const c of watched)result.before[c]=await countColl(db,c);
    const b=result.before;
    if(b.clientes!==EXPECTED.clients||b.aseguradoras!==EXPECTED.insurers||b.asesores!==EXPECTED.advisors||b.polizas!==EXPECTED.policies||b.vehiculos!==EXPECTED.vehicles)fail('DATA_CONTRACT_FAILURE','PARENT_BASELINE_COUNTS_CHANGED');
    if(b.recibosEsperados!==EXPECTED.receiptsBefore||b.carteraPrimas!==EXPECTED.portfolioBefore||b.cobros!==EXPECTED.cobros||b.finmovs!==EXPECTED.finmovs)fail('DATA_CONTRACT_FAILURE','TARGET_OR_DOWNSTREAM_BASELINE_CHANGED');
    const policyDocs=await mapDocs(db,'polizas'),existingReceiptIds=await idsColl(db,'recibosEsperados'),existingPortfolioIds=await idsColl(db,'carteraPrimas');
    let missingParents=0,activeInvalidPolicyState=0,historicalInvalidPolicyState=0,historicalTermNotExpired=0,relationMismatches=0,targetReceiptCollisions=0,targetPortfolioCollisions=0;
    const activeCalendarPolicyIds=new Set();
    for(const r of active.receipts){const p=policyDocs.get(clean(r.polizaId));if(!p){missingParents++;continue;}activeCalendarPolicyIds.add(clean(r.polizaId));if(!['Vigente','Por renovar'].includes(clean(p.estado)))activeInvalidPolicyState++;if(clean(p.clienteId)!==clean(r.clienteId)||clean(p.aseguradoraId)!==clean(r.aseguradoraId)||clean(p.numero)!==clean(r.polizaNumero))relationMismatches++;if(existingReceiptIds.has(clean(r.id)))targetReceiptCollisions++;}
    for(const r of historical.receipts){const p=policyDocs.get(clean(r.polizaId));if(!p){missingParents++;continue;}if(!['Histórica','Renovada'].includes(clean(p.estado)))historicalInvalidPolicyState++;if(!isoLeq(p.vigenciaFin,CUTOFF))historicalTermNotExpired++;if(clean(p.clienteId)!==clean(r.clienteId)||clean(p.aseguradoraId)!==clean(r.aseguradoraId)||clean(p.numero)!==clean(r.polizaNumero))relationMismatches++;if(existingReceiptIds.has(clean(r.id)))targetReceiptCollisions++;}
    for(const c of portfolio)if(existingPortfolioIds.has(clean(c.id)))targetPortfolioCollisions++;
    const activePolicies=[...policyDocs.values()].filter(p=>['Vigente','Por renovar'].includes(clean(p.estado))).length;
    const futurePolicies=[...policyDocs.values()].filter(p=>clean(p.estado)==='Vigente futura').length;
    result.validation={...result.validation,missingParents,activeInvalidPolicyState,historicalInvalidPolicyState,historicalTermNotExpired,relationMismatches,targetReceiptCollisions,targetPortfolioCollisions,parentPoliciesAvailable:policyDocs.size,activePolicies,activePoliciesWithCalendar:activeCalendarPolicyIds.size,activePoliciesWithoutCalendar:activePolicies-activeCalendarPolicyIds.size,futurePoliciesExcluded:futurePolicies,historicalDueMayExceedCoverageEnd:true};
    if(missingParents||activeInvalidPolicyState||historicalInvalidPolicyState||historicalTermNotExpired||relationMismatches||targetReceiptCollisions||targetPortfolioCollisions)fail('DATA_CONTRACT_FAILURE','LIVE_RELATION_VALIDATION');
    if(activePolicies!==EXPECTED.activePolicies||activeCalendarPolicyIds.size!==EXPECTED.activePoliciesWithCalendar||activePolicies-activeCalendarPolicyIds.size!==EXPECTED.activePoliciesWithoutCalendar||futurePolicies!==EXPECTED.futurePoliciesExcluded)fail('DATA_CONTRACT_FAILURE','ACTIVE_POLICY_PROFILE_CHANGED');
    if(mode==='DRY_RUN'){result.status='PREWRITE_READY';result.ok=true;for(const c of watched)result.after[c]=result.before[c];}
    else if(mode==='WRITE'){
      if(!requestPath||!fs.existsSync(requestPath))fail('AUTHORIZATION_REQUIRED','REQUEST_MISSING');
      const req=JSON.parse(fs.readFileSync(requestPath,'utf8'));
      if(req.schemaVersion!=='orbit360-receipts-portfolio-write-request-v2'||req.approved!==true||clean(req.phrase)!==PHRASE||clean(req.activePackageSha256)!==active.physicalSha||clean(req.historicalPackageSha256)!==historical.physicalSha||clean(req.activeLogicalSha256)!==active.logical||clean(req.historicalLogicalSha256)!==historical.logical||clean(req.activeReceiptIdDigest)!==active.receiptDigest||clean(req.historicalReceiptIdDigest)!==historical.receiptDigest||clean(req.activePortfolioIdDigest)!==active.portfolioDigest||clean(req.historicalPortfolioIdDigest)!==historical.portfolioDigest)fail('AUTHORIZATION_REQUIRED','REQUEST_MISMATCH');
      if(Number(req.scope?.receipts)!==EXPECTED.receiptsCreate||Number(req.scope?.portfolio)!==EXPECTED.portfolioCreate||Number(req.scope?.historical)!==EXPECTED.historicalPortfolio||Number(req.scope?.cobros)!==0||Number(req.scope?.finmovs)!==0)fail('AUTHORIZATION_REQUIRED','REQUEST_SCOPE_MISMATCH');
      const created=[];
      try{
        await createChunked(db,'recibosEsperados',receipts,created);result.writes.receipts=receipts.length;
        await createChunked(db,'carteraPrimas',portfolio,created);result.writes.portfolio=portfolio.length;
        for(const c of watched)result.after[c]=await countColl(db,c);
        const a=result.after,unchanged=['clientes','aseguradoras','asesores','polizas','vehiculos','cobros','finmovs'];
        if(a.recibosEsperados!==EXPECTED.receiptsCreate||a.carteraPrimas!==EXPECTED.portfolioCreate||unchanged.some(c=>a[c]!==result.before[c]))fail('DATA_CONTRACT_FAILURE','POSTWRITE_INVARIANT');
        const auditId=`receipts_portfolio_v910_20260730_${Date.now()}`;await db.collection('tenantId').doc(TENANT).collection('auditoria').doc(auditId).create({tipo:'recibos_cartera_write_v910',createdAt:admin.firestore.FieldValue.serverTimestamp(),receipts:EXPECTED.receiptsCreate,portfolio:EXPECTED.portfolioCreate,historical:EXPECTED.historicalPortfolio,activePackageSha256:active.physicalSha,historicalPackageSha256:historical.physicalSha,containsPII:false});result.writes.audit=1;result.firestoreWrites=receipts.length+portfolio.length+1;result.operationalWrites=receipts.length+portfolio.length;result.status='WRITE_PASS';result.ok=true;
      }catch(e){result.rollback.executed=true;await deleteCreated(db,created);result.rollback.restored=true;for(const c of watched)result.after[c]=await countColl(db,c);if(result.after.recibosEsperados!==result.before.recibosEsperados||result.after.carteraPrimas!==result.before.carteraPrimas)fail('ROLLBACK_INCOMPLETE');throw e;}
    }else fail('ENVIRONMENT_FAILURE','MODE_UNSUPPORTED');
  }
}catch(e){result.ok=false;result.status=e.code||'BLOCKED';result.classification=result.status.startsWith('AUTHORIZATION_')?'AUTHORIZATION_REQUIRED':result.status.startsWith('ENVIRONMENT_')?'ENVIRONMENT_FAILURE':'DATA_CONTRACT_FAILURE';result.error=sanitizeError(e);}
writeEvidence(result);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
