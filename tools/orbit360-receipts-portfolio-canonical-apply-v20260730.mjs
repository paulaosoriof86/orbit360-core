#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import XLSX from 'xlsx';

const TENANT='alianzas-soluciones';
const PROJECT='ays-orbit-360-lab';
const PHRASE='AUTORIZO ESCRITURA CONTROLADA RECIBOS CARTERA AYS 20260730';
const EXPECTED={
  clients:430,insurers:30,advisors:7,policies:1373,vehicles:1032,
  receiptsBefore:0,portfolioBefore:0,cobros:0,finmovs:0,
  activePolicies:224,activePoliciesWithCalendar:223,activePoliciesWithoutCalendar:1,futurePoliciesExcluded:7,
  receiptsCreate:1261,portfolioCreate:641,dueOrOverdue:99,futurePending:542,paymentReported:365,
  noPendingAccordingInsurer:211,receiptHolds:44,portfolioQualityFlags:28,obsoleteScheduleExcluded:20
};
const mode=String(process.env.ORBIT360_RECEIPTS_MODE||'DRY_RUN').toUpperCase();
const xlsxPath=process.env.ORBIT360_RECEIPTS_XLSX||'';
const requestPath=process.env.ORBIT360_RECEIPTS_REQUEST||'';
const evidencePath=process.env.ORBIT360_RECEIPTS_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/receipts-portfolio-prewrite.json';
const expectedSha=process.env.ORBIT360_RECEIPTS_XLSX_SHA256||'';
const expectedLogical=process.env.ORBIT360_RECEIPTS_LOGICAL_SHA256||'';
const expectedReceiptDigest=process.env.ORBIT360_RECEIPTS_ID_DIGEST||'';
const expectedPortfolioDigest=process.env.ORBIT360_PORTFOLIO_ID_DIGEST||'';

function fail(code,detail=''){const e=new Error(code+(detail?':'+detail:''));e.code=code;throw e;}
function clean(v){return String(v==null?'':v).trim();}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex');}
function bool(v){return v===true||v===1||v==='1'||String(v).toLowerCase()==='true';}
function num(v){if(v==null||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function sheetRows(wb,name){
  const sh=wb.Sheets[name];if(!sh)fail('DATA_CONTRACT_FAILURE','SHEET_MISSING_'+name);
  return XLSX.utils.sheet_to_json(sh,{range:3,defval:'',raw:true}).map(r=>normalizeRow(r));
}
function normalizeRow(r){
  const out={};
  for(const [k,v] of Object.entries(r)){
    if(['enCartera','requiereValidacion','incluidoCarteraFinal'].includes(k))out[k]=bool(v);
    else if(['primaNeta','gastosExpedicion','gastosFinanciamiento','descuento','impuestosIVA','primaTotal','montoFuente','montoSIGA','diferenciaDias','diferenciaMonto'].includes(k))out[k]=num(v);
    else out[k]=v==null?'':v;
  }
  return out;
}
function controlValue(sh,label){
  for(let row=1;row<=40;row++){if(clean(sh[`E${row}`]?.v)===label)return clean(sh[`F${row}`]?.v);}
  return '';
}
async function countColl(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).count().get();return snap.data().count;}
async function mapDocs(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).get();return new Map(snap.docs.map(d=>[d.id,d.data()]));}
async function idsColl(db,coll){const snap=await db.collection('tenantId').doc(TENANT).collection(coll).select().get();return new Set(snap.docs.map(d=>d.id));}
function safeDoc(row){
  const out={};
  for(const [k,v] of Object.entries(row)){
    if(v===undefined||typeof v==='function')continue;
    if(typeof v==='number'&&!Number.isFinite(v))continue;
    out[k]=v;
  }
  return out;
}
async function createChunked(db,coll,rows,created){
  for(let i=0;i<rows.length;i+=300){
    const chunk=rows.slice(i,i+300),b=db.batch();
    for(const row of chunk)b.create(db.collection('tenantId').doc(TENANT).collection(coll).doc(clean(row.id)),safeDoc(row));
    await b.commit();
    for(const row of chunk)created.push({coll,id:clean(row.id)});
  }
}
async function deleteCreated(db,created){
  for(let i=created.length;i>0;i-=300){
    const chunk=created.slice(Math.max(0,i-300),i),b=db.batch();
    for(const x of chunk)b.delete(db.collection('tenantId').doc(TENANT).collection(x.coll).doc(x.id));
    await b.commit();
  }
}
function sanitizeError(e){return clean(e&&e.message||e).replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,600);}
function writeEvidence(result){
  fs.mkdirSync(path.dirname(evidencePath),{recursive:true});
  const serialized=JSON.stringify(result,null,2)+'\n';JSON.parse(serialized);
  const tmp=`${evidencePath}.tmp-${process.pid}`;fs.writeFileSync(tmp,serialized,'utf8');JSON.parse(fs.readFileSync(tmp,'utf8'));fs.renameSync(tmp,evidencePath);
}
function parsePackage(){
  if(!xlsxPath||!fs.existsSync(xlsxPath))fail('ENVIRONMENT_FAILURE','XLSX_MISSING');
  const bytes=fs.readFileSync(xlsxPath),physicalSha=sha256(bytes);
  if(expectedSha&&physicalSha!==expectedSha)fail('DATA_CONTRACT_FAILURE','PACKAGE_SHA_MISMATCH');
  const wb=XLSX.read(bytes,{type:'buffer',cellDates:false});
  const summary=wb.Sheets['Resumen'];if(!summary)fail('DATA_CONTRACT_FAILURE','SUMMARY_SHEET_MISSING');
  const logicalSha=controlValue(summary,'logicalSha256'),receiptDigestEmbedded=controlValue(summary,'receiptIdDigest'),portfolioDigestEmbedded=controlValue(summary,'portfolioIdDigest');
  if(expectedLogical&&logicalSha!==expectedLogical)fail('DATA_CONTRACT_FAILURE','LOGICAL_SHA_MISMATCH');
  if(expectedReceiptDigest&&receiptDigestEmbedded!==expectedReceiptDigest)fail('DATA_CONTRACT_FAILURE','RECEIPT_DIGEST_EMBEDDED_MISMATCH');
  if(expectedPortfolioDigest&&portfolioDigestEmbedded!==expectedPortfolioDigest)fail('DATA_CONTRACT_FAILURE','PORTFOLIO_DIGEST_EMBEDDED_MISMATCH');
  const receipts=sheetRows(wb,'Recibos_Calendario'),portfolio=sheetRows(wb,'Cartera_Canonica'),holds=sheetRows(wb,'HOLD_Calidad'),adjustments=sheetRows(wb,'Ajustes_Calendario');
  if(receipts.length!==EXPECTED.receiptsCreate)fail('DATA_CONTRACT_FAILURE','RECEIPT_COUNT');
  if(portfolio.length!==EXPECTED.portfolioCreate)fail('DATA_CONTRACT_FAILURE','PORTFOLIO_COUNT');
  const receiptIds=new Set(receipts.map(r=>clean(r.id))),portfolioIds=new Set(portfolio.map(r=>clean(r.id)));
  if(receiptIds.size!==receipts.length||receiptIds.has(''))fail('DATA_CONTRACT_FAILURE','RECEIPT_IDS');
  if(portfolioIds.size!==portfolio.length||portfolioIds.has(''))fail('DATA_CONTRACT_FAILURE','PORTFOLIO_IDS');
  const receiptDigest=sha256([...receiptIds].sort().join('\n')),portfolioDigest=sha256([...portfolioIds].sort().join('\n'));
  if(expectedReceiptDigest&&receiptDigest!==expectedReceiptDigest)fail('DATA_CONTRACT_FAILURE','RECEIPT_ID_DIGEST');
  if(expectedPortfolioDigest&&portfolioDigest!==expectedPortfolioDigest)fail('DATA_CONTRACT_FAILURE','PORTFOLIO_ID_DIGEST');
  const states={};for(const r of receipts)states[clean(r.estadoOperativo)]=(states[clean(r.estadoOperativo)]||0)+1;
  const due=portfolio.filter(r=>clean(r.exigibilidad)!=='futura').length,future=portfolio.filter(r=>clean(r.exigibilidad)==='futura').length;
  const receiptHolds=receipts.filter(r=>bool(r.requiereValidacion)&&!bool(r.enCartera)).length,portfolioQuality=portfolio.filter(r=>bool(r.requiereValidacion)).length;
  const obsolete=adjustments.filter(r=>clean(r.accion)==='EXCLUIR_PROGRAMACION_SIGA_SUPERADA_POR_BALANCE_ASEGURADORA').length;
  if(states.futuro_pendiente!==EXPECTED.futurePending||states.pago_reportado!==EXPECTED.paymentReported||states.no_pendiente_segun_aseguradora!==EXPECTED.noPendingAccordingInsurer||states.pendiente_vencido!==97||states.requiere_validacion_estado!==EXPECTED.receiptHolds||states.pendiente_vence_corte!==2)fail('DATA_CONTRACT_FAILURE','RECEIPT_STATE_COUNTS');
  if(due!==EXPECTED.dueOrOverdue||future!==EXPECTED.futurePending||receiptHolds!==EXPECTED.receiptHolds||portfolioQuality!==EXPECTED.portfolioQualityFlags||obsolete!==EXPECTED.obsoleteScheduleExcluded)fail('DATA_CONTRACT_FAILURE','PORTFOLIO_PROFILE');
  const receiptById=new Map(receipts.map(r=>[clean(r.id),r]));
  for(const c of portfolio){
    const rr=receiptById.get(clean(c.reciboId));if(!rr)fail('DATA_CONTRACT_FAILURE','PORTFOLIO_RECEIPT_MISSING');
    if(clean(rr.polizaId)!==clean(c.polizaId)||clean(rr.clienteId)!==clean(c.clienteId)||clean(rr.aseguradoraId)!==clean(c.aseguradoraId))fail('DATA_CONTRACT_FAILURE','PORTFOLIO_RELATION_MISMATCH');
    if(!bool(rr.enCartera))fail('DATA_CONTRACT_FAILURE','PORTFOLIO_RECEIPT_NOT_PENDING');
  }
  return {physicalSha,logicalSha,receiptDigest,portfolioDigest,receipts,portfolio,holds,adjustments,states};
}

const result={schemaVersion:'orbit360-receipts-portfolio-prewrite-v1',mode,status:'STARTED',tenantId:TENANT,projectId:PROJECT,
  expected:EXPECTED,packageSha256:'',logicalSha256:'',receiptIdDigest:'',portfolioIdDigest:'',before:{},after:{},
  validation:{},rollback:{executed:false,restored:false},writes:{receipts:0,portfolio:0,audit:0,cobros:0,finmovs:0},
  firestoreRead:false,firestoreWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false};

try{
  const pkg=parsePackage();result.packageSha256=pkg.physicalSha;result.logicalSha256=pkg.logicalSha;result.receiptIdDigest=pkg.receiptDigest;result.portfolioIdDigest=pkg.portfolioDigest;
  result.validation={receiptCount:pkg.receipts.length,portfolioCount:pkg.portfolio.length,stateCounts:pkg.states,
    dueOrOverdue:pkg.portfolio.filter(r=>clean(r.exigibilidad)!=='futura').length,
    futurePending:pkg.portfolio.filter(r=>clean(r.exigibilidad)==='futura').length,
    receiptHolds:pkg.receipts.filter(r=>bool(r.requiereValidacion)&&!bool(r.enCartera)).length,
    portfolioQualityFlags:pkg.portfolio.filter(r=>bool(r.requiereValidacion)).length};
  if(mode==='PACKAGE_CHECK'){
    result.status='PACKAGE_CHECK_PASS';result.ok=true;
  }else{
    const sa=JSON.parse(process.env.SERVICE_ACCOUNT||'{}');if(sa.project_id!==PROJECT)fail('ENVIRONMENT_FAILURE','PROJECT_ID_MISMATCH');
    admin.initializeApp({credential:admin.credential.cert(sa),projectId:PROJECT});const db=admin.firestore();result.firestoreRead=true;
    const watched=['clientes','aseguradoras','asesores','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','finmovs'];
    for(const c of watched)result.before[c]=await countColl(db,c);
    const b=result.before;
    if(b.clientes!==EXPECTED.clients||b.aseguradoras!==EXPECTED.insurers||b.asesores!==EXPECTED.advisors||b.polizas!==EXPECTED.policies||b.vehiculos!==EXPECTED.vehicles)fail('DATA_CONTRACT_FAILURE','PARENT_BASELINE_COUNTS_CHANGED');
    if(b.recibosEsperados!==EXPECTED.receiptsBefore||b.carteraPrimas!==EXPECTED.portfolioBefore||b.cobros!==EXPECTED.cobros||b.finmovs!==EXPECTED.finmovs)fail('DATA_CONTRACT_FAILURE','TARGET_OR_DOWNSTREAM_BASELINE_CHANGED');
    const policyDocs=await mapDocs(db,'polizas'),existingReceiptIds=await idsColl(db,'recibosEsperados'),existingPortfolioIds=await idsColl(db,'carteraPrimas');
    let missingParents=0,invalidPolicyState=0,policyRelationMismatches=0,targetReceiptCollisions=0,targetPortfolioCollisions=0;
    const calendarPolicyIds=new Set();
    for(const r of pkg.receipts){
      const p=policyDocs.get(clean(r.polizaId));if(!p){missingParents++;continue;}calendarPolicyIds.add(clean(r.polizaId));
      if(!['Vigente','Por renovar'].includes(clean(p.estado)))invalidPolicyState++;
      if(clean(p.clienteId)!==clean(r.clienteId)||clean(p.aseguradoraId)!==clean(r.aseguradoraId)||clean(p.numero)!==clean(r.polizaNumero))policyRelationMismatches++;
      if(existingReceiptIds.has(clean(r.id)))targetReceiptCollisions++;
    }
    for(const c of pkg.portfolio)if(existingPortfolioIds.has(clean(c.id)))targetPortfolioCollisions++;
    const activePolicies=[...policyDocs.values()].filter(p=>['Vigente','Por renovar'].includes(clean(p.estado))).length;
    const futurePolicies=[...policyDocs.values()].filter(p=>clean(p.estado)==='Vigente futura').length;
    result.validation={...result.validation,missingParents,invalidPolicyState,policyRelationMismatches,targetReceiptCollisions,targetPortfolioCollisions,
      parentPoliciesAvailable:policyDocs.size,activePolicies,activePoliciesWithCalendar:calendarPolicyIds.size,activePoliciesWithoutCalendar:activePolicies-calendarPolicyIds.size,futurePoliciesExcluded:futurePolicies};
    if(missingParents||invalidPolicyState||policyRelationMismatches||targetReceiptCollisions||targetPortfolioCollisions)fail('DATA_CONTRACT_FAILURE','LIVE_RELATION_VALIDATION');
    if(activePolicies!==EXPECTED.activePolicies||calendarPolicyIds.size!==EXPECTED.activePoliciesWithCalendar||activePolicies-calendarPolicyIds.size!==EXPECTED.activePoliciesWithoutCalendar||futurePolicies!==EXPECTED.futurePoliciesExcluded)fail('DATA_CONTRACT_FAILURE','ACTIVE_POLICY_PROFILE_CHANGED');
    if(mode==='DRY_RUN'){
      result.status='PREWRITE_READY';result.ok=true;for(const c of watched)result.after[c]=result.before[c];
    }else if(mode==='WRITE'){
      if(!requestPath||!fs.existsSync(requestPath))fail('AUTHORIZATION_REQUIRED','REQUEST_MISSING');
      const req=JSON.parse(fs.readFileSync(requestPath,'utf8'));
      if(req.schemaVersion!=='orbit360-receipts-portfolio-write-request-v1'||req.approved!==true||clean(req.phrase)!==PHRASE||clean(req.packageSha256)!==pkg.physicalSha||clean(req.logicalSha256)!==pkg.logicalSha||clean(req.receiptIdDigest)!==pkg.receiptDigest||clean(req.portfolioIdDigest)!==pkg.portfolioDigest)fail('AUTHORIZATION_REQUIRED','REQUEST_MISMATCH');
      if(Number(req.scope?.receipts)!==EXPECTED.receiptsCreate||Number(req.scope?.portfolio)!==EXPECTED.portfolioCreate||Number(req.scope?.cobros)!==0||Number(req.scope?.finmovs)!==0)fail('AUTHORIZATION_REQUIRED','REQUEST_SCOPE_MISMATCH');
      const created=[];
      try{
        await createChunked(db,'recibosEsperados',pkg.receipts,created);result.writes.receipts=pkg.receipts.length;
        await createChunked(db,'carteraPrimas',pkg.portfolio,created);result.writes.portfolio=pkg.portfolio.length;
        for(const c of watched)result.after[c]=await countColl(db,c);
        const a=result.after;
        const unchanged=['clientes','aseguradoras','asesores','polizas','vehiculos','cobros','finmovs'];
        if(a.recibosEsperados!==EXPECTED.receiptsCreate||a.carteraPrimas!==EXPECTED.portfolioCreate||unchanged.some(c=>a[c]!==result.before[c]))fail('DATA_CONTRACT_FAILURE','POSTWRITE_INVARIANT');
        const auditId=`receipts_portfolio_20260730_${pkg.physicalSha.slice(0,16)}`;
        const audit={tenantId:TENANT,batchId:auditId,sourceType:'recibos_cartera',packageSha256:pkg.physicalSha,logicalSha256:pkg.logicalSha,receiptIdDigest:pkg.receiptDigest,portfolioIdDigest:pkg.portfolioDigest,
          counts:{receipts:EXPECTED.receiptsCreate,portfolio:EXPECTED.portfolioCreate,paymentReported:EXPECTED.paymentReported,dueOrOverdue:EXPECTED.dueOrOverdue,futurePending:EXPECTED.futurePending},
          confirmedBy:clean(req.confirmedBy||'paula'),confirmedAt:new Date().toISOString(),reason:clean(req.reason||'Carga canónica Recibos/Cartera A&S'),status:'written_controlled',
          rollbackAvailable:true,noCobroWrites:true,noFinmovWrites:true};
        await db.collection('tenantId').doc(TENANT).collection('auditoriaImportaciones').doc(auditId).create(audit);
        created.push({coll:'auditoriaImportaciones',id:auditId});result.writes.audit=1;
        result.status='WRITE_PASS';result.ok=true;result.firestoreWrites=created.length;result.operationalWrites=EXPECTED.receiptsCreate+EXPECTED.portfolioCreate;
      }catch(e){
        await deleteCreated(db,created);result.rollback.executed=true;
        const restored={};for(const c of watched)restored[c]=await countColl(db,c);
        result.rollback.after=restored;result.rollback.restored=Object.keys(result.before).every(c=>restored[c]===result.before[c]);
        if(!result.rollback.restored)fail('SECURITY_FAILURE','ROLLBACK_INCOMPLETE');
        throw e;
      }
    }else fail('PIPELINE_MECHANISM_FAILURE','MODE_INVALID');
  }
}catch(e){
  result.status=result.rollback.executed&&result.rollback.restored?'ROLLED_BACK_SAFE':'BLOCKED';
  result.classification=String(e.code||'PIPELINE_MECHANISM_FAILURE');result.error=sanitizeError(e);result.ok=false;
}
try{writeEvidence(result);}catch(e){console.error('PIPELINE_MECHANISM_FAILURE:EVIDENCE_SERIALIZATION:'+sanitizeError(e));process.exit(42);}
console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(41);
