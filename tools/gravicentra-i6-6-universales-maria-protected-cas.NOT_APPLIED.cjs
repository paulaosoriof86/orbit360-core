'use strict';
/**
 * I6.6 Maria / Universales protected CAS candidate.
 * Defaults to READ ONLY. No workflow may invoke --mode=apply until the
 * required existing GitHub environment and reviewer have been verified.
 * NO client identity, credential, or payment data is embedded in this file.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const fixturePath='artifacts/orbit360-recovery/release-control/I6_6_UNIVERSALES_MARIA_EXACT_CURRENT_CAS_PREVIEW_NOT_APPLIED_20261110.json';
const readFixture=()=>JSON.parse(fs.readFileSync(fixturePath,'utf8'));
const sha=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const stable=x=>x===null||typeof x!=='object'?x:typeof x.toJSON==='function'?stable(x.toJSON()):
  Array.isArray(x)?x.map(stable):Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const fingerprint=x=>sha(JSON.stringify(stable(x)));
const clean=x=>String(x===null||x===undefined?'':x).trim();
const pad=i=>String(i).padStart(3,'0');
const fail=s=>{throw Error('GI_I66_MARIA_CAS_HOLD:'+s)};
const duePlus15=day=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(day))fail('BAD_DUE');const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+15);return d.toISOString().slice(0,10)};
function validateFixture(f){
  if(f.schema!=='GI_I66_UNIVERSALES_MARIA_EXACT_CURRENT_LIVE_CAS_PREVIEW_NOT_APPLIED_V1'||f.projectId!=='ays-orbit-360-lab'||f.country!=='GT'||f.livePolicyDocumentId!=='pol_mwajp407'||f.clientId!=='cli_mwafruvk')fail('SOURCE_BOUNDARY');
  if(f.source.cut!=='2026-11-09'||f.source.pdfSha256!=='f7bd1833a1573d4d0a1e6b494b71383aa1209f0b9afec3f06972a31213f1bd4b')fail('SOURCE_PDF_BOUNDARY');
  if(f.patches.receiptSourceNumbers.length!==10||f.patches.receiptAndPortfolioDates.length!==7)fail('SOURCE_ROW_COUNTS');
  for(let i=0;i<10;i++){
    const x=f.patches.receiptSourceNumbers[i],seq=i+3;
    if(x.sequence!==seq||x.receiptId!=='cob_pol_mwajp407_'+pad(seq)||x.sourceReceiptNumber!==String(39460328+i))fail('SOURCE_SEQ_'+seq);
  }
  const seven=[4,5,6,7,9,11,12];
  for(let i=0;i<7;i++){
    const d=f.patches.receiptAndPortfolioDates[i],seq=seven[i];
    if(d.sequence!==seq||d.receiptId!=='cob_pol_mwajp407_'+pad(seq)||d.portfolioId!=='car_'+d.receiptId)fail('DATES_SEQ_'+seq);
    const due=new Date(Date.UTC(2026,11+seq-3,1)).toISOString().slice(0,10);
    if(d.receiptPatchPreview.vence.after!==due||d.receiptPatchPreview.fechaLimite.after!==duePlus15(due)||d.receiptPatchPreview.fechaLimite.before!==duePlus15(d.receiptPatchPreview.vence.before))fail('DATE_SOURCE_OR_PLUS15_'+seq);
    for(const key of ['vence','fechaLimite','fechaVencimiento']){
      const target=d.portfolioPatchPreview[key];
      const expected=key==='vence'?due:duePlus15(due);
      if(target.after!==expected)fail('PORTFOLIO_DERIVED_DATE_'+seq);
    }
  }
  return f;
}
function buildExactPlan(f,policy,receipts,portfolio,sourceExistsForNumber=new Map()){
  validateFixture(f);
  const guard=[];
  if(!policy||policy.id&&policy.id!==f.livePolicyDocumentId||clean(policy.numero)!==f.policyNumber||clean(policy.clienteId)!==f.clientId||clean(policy.pais).toUpperCase()!=='GT')guard.push('POLICY_IDENTITY');
  if(receipts.length!==12||portfolio.length!==12)guard.push('CARDINALITY_12_12');
  const receiptSorted=receipts.slice().sort((a,b)=>Number(a.secuencia)-Number(b.secuencia));
  const carSorted=portfolio.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const sourceDigest=fingerprint({policy,receipts:receiptSorted});
  const carDigest=fingerprint(carSorted);
  if(sourceDigest!==f.readOnlyEvidence.receiptAndPolicyBeforeDigest)guard.push('RECEIPT_PREIMAGE_DRIFT');
  if(carDigest!==f.readOnlyEvidence.portfolioBeforeDigest)guard.push('PORTFOLIO_PREIMAGE_DRIFT');
  const rBy=new Map(receipts.map(r=>[r.id,r])),cBy=new Map(portfolio.map(r=>[r.reciboId,r]));
  if(rBy.size!==12||cBy.size!==12)guard.push('DUPLICATE_LINKS');
  for(let seq=1;seq<=12;seq++){
    const id='cob_pol_mwajp407_'+pad(seq),r=rBy.get(id),c=cBy.get(id);
    if(!r||!c||r.polizaId!==f.livePolicyDocumentId||c.polizaId!==f.livePolicyDocumentId||c.id!=='car_'+id)guard.push('MISSING_OR_CROSS_LINK_'+seq);
    else if(Number(r.secuencia)!==seq||clean(r.cuota)!==seq+'/12'||Number(r.monto).toFixed(2)!=='952.56'||Number(c.monto).toFixed(2)!=='952.56')guard.push('SEQUENCE_AMOUNT_'+seq);
  }
  const receiptPatches=new Map(),portfolioPatches=new Map();
  for(const x of f.patches.receiptSourceNumbers){
    const r=rBy.get(x.receiptId);
    if(!r)continue;
    if(clean(r.numeroReciboFuente)||r.pagado===true||r.conciliado===true||r.fechaPago||clean(r.estado).toLowerCase()!=='pendiente')guard.push('RECEIPT_STATUS_NUMBER_'+x.sequence);
    const sources=sourceExistsForNumber.get(x.sourceReceiptNumber)||[];
    if(sources.some(id=>id!==x.receiptId)||sources.length>1)guard.push('DUPLICATE_SOURCE_NUMBER_'+x.sequence);
    receiptPatches.set(x.receiptId,{numeroReciboFuente:x.sourceReceiptNumber});
  }
  for(const d of f.patches.receiptAndPortfolioDates){
    const r=rBy.get(d.receiptId),c=cBy.get(d.receiptId);
    if(!r||!c)continue;
    for(const key of ['vence','fechaLimite']){
      const expected=d.receiptPatchPreview[key];
      if(clean(r[key])!==expected.before)guard.push('RECEIPT_DATE_DRIFT_'+d.sequence+'_'+key);
    }
    for(const key of ['vence','fechaLimite','fechaVencimiento']){
      const expected=d.portfolioPatchPreview[key];
      if(clean(c[key])!==expected.before)guard.push('PORTFOLIO_DATE_DRIFT_'+d.sequence+'_'+key);
    }
    if(clean(c.estado).toLowerCase()!=='pendiente'||clean(c.estadoOperativo)!=='futuro_pendiente'||c.carteraActiva!==true)guard.push('PORTFOLIO_STATE_'+d.sequence);
    if(clean(r.fechaLimite)!==duePlus15(clean(r.vence)))guard.push('LIVE_PLUS15_INVARIANT_'+d.sequence);
    Object.assign(receiptPatches.get(d.receiptId),{vence:d.receiptPatchPreview.vence.after,fechaLimite:d.receiptPatchPreview.fechaLimite.after});
    portfolioPatches.set(d.portfolioId,{vence:d.portfolioPatchPreview.vence.after,fechaLimite:d.portfolioPatchPreview.fechaLimite.after,fechaVencimiento:d.portfolioPatchPreview.fechaVencimiento.after});
  }
  if(guard.length)fail([...new Set(guard)].join(','));
  if(receiptPatches.size!==10||portfolioPatches.size!==7)fail('PATCH_CARDINALITY');
  const requestId='i66_univ_maria_'+sha(f.source.pdfSha256+'|'+f.livePolicyDocumentId+'|'+sourceDigest+'|'+carDigest).slice(0,28);
  // Sparse reverse images retain the field's original *presence* as well as its value.
  // A missing numeroReciboFuente must be restored by deletion, not by writing null.
  const reverse=(entries,original)=>[...entries].map(([id,patch])=>({
    id,fields:Object.keys(patch).map(field=>({field,
      present:Object.prototype.hasOwnProperty.call(original.get(id),field),
      value:original.get(id)[field]===undefined?null:original.get(id)[field]
    }))
  }));
  const carById=new Map(portfolio.map(c=>[c.id,c]));
  const expectedReceipts=receiptSorted.map(r=>({...r,...(receiptPatches.get(r.id)||{})}));
  const expectedPortfolio=carSorted.map(c=>({...c,...(portfolioPatches.get(c.id)||{})}));
  return{
    status:'EXACT_PREIMAGE_DRY_RUN_PASS_APPLY_NOT_ENABLED',
    sourceDigest,portfolioDigest:carDigest,requestId,
    expectedReceiptAndPolicyAfterDigest:fingerprint({policy,receipts:expectedReceipts}),
    expectedPortfolioAfterDigest:fingerprint(expectedPortfolio),
    receiptPatches:[...receiptPatches].map(([id,patch])=>({id,patch})),
    portfolioPatches:[...portfolioPatches].map(([id,patch])=>({id,patch})),
    rollbackSparseBeforeFields:{receipts:reverse(receiptPatches,rBy),portfolio:reverse(portfolioPatches,carById)},
    allowedReceiptFields:['numeroReciboFuente','vence','fechaLimite'],
    allowedPortfolioFields:['vence','fechaLimite','fechaVencimiento'],
    documentWritesIfApproved:18,liveDataWrites:0
  };
}
async function readCurrent(db,f,transact=null,resolvedTenantId=null){
  // Tenant discovery is outside the Firestore transaction; the transaction then
  // re-checks every exact document under the uniquely discovered tenant.
  let t=resolvedTenantId;
  if(!t){
    const tids=await db.collection('tenants').listDocuments();
    if(tids.length<1||tids.length>300)fail('TENANTS_BOUND');
    const exact=[];
    for(const tenant of tids){
      const q=await tenant.collection('data').doc('polizas').collection('items').where('numero','==',f.policyNumber).limit(3).get();
      for(const d of q.docs){const p=d.data()||{};if(d.id===f.livePolicyDocumentId&&clean(p.clienteId)===f.clientId&&clean(p.pais).toUpperCase()==='GT')exact.push({tenantId:tenant.id,doc:d});}
    }
    if(exact.length!==1)fail('NOT_UNIQUE_TENANT_POLICY_'+exact.length);
    t=exact[0].tenantId;
  }
  const root=db.collection('tenants').doc(t).collection('data');
  const policyRef=root.doc('polizas').collection('items').doc(f.livePolicyDocumentId);
  const receiptsCol=root.doc('recibosEsperados').collection('items'),carCol=root.doc('carteraPrimas').collection('items');
  const read=async ref=>transact?transact.get(ref):ref.get();
  const pSnap=await read(policyRef);if(!pSnap.exists)fail('POLICY_GONE');
  // Query cardinality within the same transaction to catch linked records beyond the 12 exact IDs.
  const allReceiptsQuery=receiptsCol.where('polizaId','==',f.livePolicyDocumentId).limit(13);
  const allPortfolioQuery=carCol.where('polizaId','==',f.livePolicyDocumentId).limit(13);
  const allReceipts=await (transact?transact.get(allReceiptsQuery):allReceiptsQuery.get());
  const allPortfolio=await (transact?transact.get(allPortfolioQuery):allPortfolioQuery.get());
  if(allReceipts.size!==12||allPortfolio.size!==12)fail('EXACT_POLICY_LINKED_CARDINALITY_'+allReceipts.size+'_'+allPortfolio.size);
  const receipts=[],portfolio=[];
  // Read all before any transactional writes.
  for(let seq=1;seq<=12;seq++){
    const rid='cob_pol_mwajp407_'+pad(seq),cid='car_'+rid;
    const rs=await read(receiptsCol.doc(rid)),cs=await read(carCol.doc(cid));
    if(!rs.exists||!cs.exists)fail('RECEIPT_OR_PORTFOLIO_GONE_'+seq);
    receipts.push({id:rs.id,...(rs.data()||{})});
    portfolio.push({id:cs.id,...(cs.data()||{})});
  }
  const found=new Map();
  for(const x of f.patches.receiptSourceNumbers){
    const query=receiptsCol.where('numeroReciboFuente','==',x.sourceReceiptNumber).limit(3);
    const q=await (transact?transact.get(query):query.get());
    found.set(x.sourceReceiptNumber,q.docs.map(d=>d.id));
  }
  const plan=buildExactPlan(f,pSnap.data()||{},receipts,portfolio,found);
  return{plan,t,root,receiptsCol,carCol,policyRef,receipts,portfolio};
}
async function readExactPostImage(db,f,tenantId,requestId){
  if(!tenantId||!requestId)fail('POST_READBACK_CONTEXT_MISSING');
  const root=db.collection('tenants').doc(tenantId).collection('data');
  const policySnap=await root.doc('polizas').collection('items').doc(f.livePolicyDocumentId).get();
  if(!policySnap.exists)fail('POST_POLICY_MISSING');
  const receiptsCol=root.doc('recibosEsperados').collection('items');
  const portfolioCol=root.doc('carteraPrimas').collection('items');
  const counts=await Promise.all([
    receiptsCol.where('polizaId','==',f.livePolicyDocumentId).limit(13).get(),
    portfolioCol.where('polizaId','==',f.livePolicyDocumentId).limit(13).get()
  ]);
  if(counts[0].size!==12||counts[1].size!==12)fail('POST_LINKED_CARDINALITY');
  const receipts=[],portfolio=[];
  for(let seq=1;seq<=12;seq++){
    const rid='cob_pol_mwajp407_'+pad(seq);
    const [rs,cs]=await Promise.all([receiptsCol.doc(rid).get(),portfolioCol.doc('car_'+rid).get()]);
    if(!rs.exists||!cs.exists)fail('POST_DOCUMENT_MISSING_'+seq);
    receipts.push({id:rs.id,...rs.data()});
    portfolio.push({id:cs.id,...cs.data()});
  }
  portfolio.sort((a,b)=>a.id.localeCompare(b.id));
  const audit=await db.collection('tenants').doc(tenantId).collection('operationalRequests').doc(requestId).get();
  if(!audit.exists)fail('POST_AUDIT_MISSING');
  const receiptDigest=fingerprint({policy:policySnap.data(),receipts});
  const portfolioDigest=fingerprint(portfolio);
  for(const x of f.patches.receiptSourceNumbers){
    const q=await receiptsCol.where('numeroReciboFuente','==',x.sourceReceiptNumber).limit(3).get();
    if(q.size!==1||q.docs[0].id!==x.receiptId)fail('POST_SOURCE_NUMBER_DUPLICATE_'+x.sequence);
  }
  return{receiptDigest,portfolioDigest,audit:audit.data()};
}
async function protectedTransactionalApply(db,f,gate){
  if(!gate||gate.environment!=='gravicentra-live-data-writes'||gate.reviewerEvidence!==true)fail('PROTECTED_REVIEWER_GATE_NOT_PROVEN');
  // Full read-only tenant identity and preimage check precede the transaction.
  const discovered=await readCurrent(db,f);
  const applied=await db.runTransaction(async tx=>{
    const x=await readCurrent(db,f,tx,discovered.t);
    const auditRef=db.collection('tenants').doc(x.t).collection('operationalRequests').doc(x.plan.requestId);
    const already=await tx.get(auditRef);
    if(already.exists)fail('REQUEST_ID_ALREADY_PRESENT_MANUAL_READBACK_REQUIRED');
    // No transaction writes before every 24-doc preimage and ten source-number checks.
    for(const item of x.plan.receiptPatches)tx.update(x.receiptsCol.doc(item.id),item.patch);
    for(const item of x.plan.portfolioPatches)tx.update(x.carCol.doc(item.id),item.patch);
    tx.create(auditRef,{id:x.plan.requestId,sourcePdfSha256:f.source.pdfSha256,
      policyId:f.livePolicyDocumentId,receiptBeforeDigest:x.plan.sourceDigest,portfolioBeforeDigest:x.plan.portfolioDigest,
      sourceNumberPatchCount:10,receiptDatePatchCount:7,portfolioDatePatchCount:7,
      fieldsAllowed:x.plan.allowedReceiptFields.concat(x.plan.allowedPortfolioFields),
      archivedBeforeFields:x.plan.rollbackSparseBeforeFields,
      expectedReceiptAndPolicyAfterDigest:x.plan.expectedReceiptAndPolicyAfterDigest,
      expectedPortfolioAfterDigest:x.plan.expectedPortfolioAfterDigest,
      appliedAt:require('firebase-admin/firestore').FieldValue.serverTimestamp(),
      status:'APPLIED_TRANSACTIONAL_CAS'});
    return{receiptWrites:10,portfolioWrites:7,auditWrites:1,requestId:x.plan.requestId,
      tenantId:x.t,expectedReceiptAndPolicyAfterDigest:x.plan.expectedReceiptAndPolicyAfterDigest,
      expectedPortfolioAfterDigest:x.plan.expectedPortfolioAfterDigest};
  });
  // Out-of-transaction, independently re-read ALL 24 records and immutable audit.
  // If this fails, an operator must execute the protected, exact-postimage CAS rollback.
  const after=await readExactPostImage(db,f,applied.tenantId,applied.requestId);
  if(after.receiptDigest!==applied.expectedReceiptAndPolicyAfterDigest||
     after.portfolioDigest!==applied.expectedPortfolioAfterDigest)fail('POST_FULL_DIGEST_MISMATCH_REQUIRES_FOCAL_REVIEW');
  if(after.audit.sourcePdfSha256!==f.source.pdfSha256||after.audit.status!=='APPLIED_TRANSACTIONAL_CAS'||
     after.audit.receiptBeforeDigest!==f.readOnlyEvidence.receiptAndPolicyBeforeDigest||
     after.audit.portfolioBeforeDigest!==f.readOnlyEvidence.portfolioBeforeDigest)fail('POST_AUDIT_MISMATCH');
  return{receiptWrites:10,portfolioWrites:7,auditWrites:1,requestId:applied.requestId,
    receiptAndPolicyAfterDigest:after.receiptDigest,portfolioAfterDigest:after.portfolioDigest,
    readback:'PASS_ALL_24_DOCUMENTS_AUDIT_AND_TEN_SOURCE_NUMBERS'};
}
async function cli(){
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=dry-run').slice(7);
  const f=validateFixture(readFixture());
  if(mode==='apply')fail('APPLY_DISABLED_UNTIL_EXISTING_PROTECTED_ENV_REVIEWER_VERIFIED');
  if(mode!=='dry-run')fail('UNRECOGNIZED_MODE');
  if(process.env.GCLOUD_PROJECT!=='ays-orbit-360-lab'||process.env.FIRESTORE_EMULATOR_HOST)fail('PROJECT_BOUNDARY');
  const {initializeApp,getApps}=require('firebase-admin/app');
  const {getFirestore}=require('firebase-admin/firestore');
  const db=getFirestore(getApps()[0]||initializeApp({projectId:'ays-orbit-360-lab'}));
  const result=await readCurrent(db,f);
  const confirm=await readCurrent(db,f);
  if(confirm.plan.sourceDigest!==result.plan.sourceDigest||confirm.plan.portfolioDigest!==result.plan.portfolioDigest)fail('CONCURRENT_SNAPSHOT_CHANGE');
  const safe={...result.plan,sourcePdfSha256:f.source.pdfSha256,liveDataWrites:0,protectedReviewerVerified:false};
  const dest=process.env.GI_I66_CAS_REPORT_PATH;
  if(dest)fs.writeFileSync(dest,JSON.stringify(safe,null,2)+'\n',{mode:0o600});
  console.log('I66_MARIA_CAS_READONLY_RESULT='+safe.status);
  console.log('I66_MARIA_CAS_SOURCE_DIGEST='+safe.sourceDigest);
  console.log('I66_MARIA_CAS_PORTFOLIO_DIGEST='+safe.portfolioDigest);
  console.log('I66_MARIA_CAS_RECEIPT_PATCHES='+safe.receiptPatches.length);
  console.log('I66_MARIA_CAS_PORTFOLIO_PATCHES='+safe.portfolioPatches.length);
  console.log('I66_MARIA_CAS_DATA_WRITES=0');
}
if(require.main===module)cli().catch(e=>{console.error(String(e.message||e).slice(0,250));process.exitCode=1});
module.exports={sha,stable,fingerprint,duePlus15,validateFixture,buildExactPlan,protectedTransactionalApply,readCurrent,readExactPostImage};

