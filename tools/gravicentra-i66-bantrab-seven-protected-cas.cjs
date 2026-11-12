'use strict';
// I6.6 A3 focal, source-backed 7 Bantrab requirements. Product financial data
// stays immutable except the insurer's receipt-number reference. No payment,
// amount, dates, renewal, membership, or client creation is allowed here.
const crypto=require('node:crypto');
const fs=require('node:fs');
const SOURCE_SHA='b945a98c7c572909c643be4c849a7526a363eb490cdcf24ac8d0ae54ca3025b7';
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab',POLICY='AUTO-45580';
const ROWS=Object.freeze([
  {id:'A3.B1',number:'AC-11349841',due:'2026-10-21',amountCents:29994},
  {id:'A3.B4',number:'AC-11349842',due:'2026-11-21',amountCents:29994},
  {id:'A3.B5',number:'AC-11349843',due:'2026-12-21',amountCents:29994},
  {id:'A3.B6',number:'AC-11349844',due:'2027-01-21',amountCents:29994},
  {id:'A3.B7',number:'AC-11349845',due:'2027-02-21',amountCents:29994},
  {id:'A3.B8',number:'AC-11349846',due:'2027-03-21',amountCents:29994},
  {id:'A3.B9',number:'AC-11349847',due:'2027-04-21',amountCents:29994}
]);
const str=x=>String(x==null?'':x).trim();
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const stable=x=>x==null?x:typeof x.toJSON==='function'?stable(x.toJSON()):Array.isArray(x)?x.map(stable):typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const fingerprint=x=>hash(JSON.stringify(stable(x)));
const fail=code=>{throw Error('I66_BANTRAB_7_HOLD_'+code);};
const validIso=x=>/^\d{4}-\d{2}-\d{2}$/.test(str(x))?str(x):'';
const moneyCents=r=>{const v=r.monto??r.montoTotal??r.primaTotal;if(v==null||v==='')return null;return Number.isFinite(+v)?Math.round((+v+Number.EPSILON)*100):null;};
const due=r=>validIso(r.fechaLimite||r.vence||r.fechaVencimiento);
const paid=r=>r.pagado===true||r.conciliadoPago===true||r.conciliado===true||!!str(r.fechaPago||r.paidDate)||/^(pagado|paid)$/i.test(str(r.estado))||/^PAID_/i.test(str(r.paymentState));
const norm=s=>str(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const dataRef=(db,name)=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
const requestRef=db=>db.collection('tenants').doc(TENANT).collection('operationalRequests');
function chooseSeven(policy,receipts,cobros,existingSourceNumberMatches){
  if(!policy||str(policy.numero)!==POLICY||str(policy.pais).toUpperCase()!=='GT'||
     validIso(policy.vigenciaInicio)!=='2026-07-21'||validIso(policy.vigenciaFin)!=='2027-07-21'||
     !str(policy.clienteId)||!str(policy.aseguradoraId))fail('POLICY_COUNTRY_EDITION_CLIENT_INSURER');
  if(!Array.isArray(receipts)||receipts.length===0||receipts.length>=80||!Array.isArray(cobros))fail('RECEIPT_COLLECTION_BOUND');
  const selected=[],ids=new Set();
  for(const source of ROWS){
    if((existingSourceNumberMatches[source.number]||[]).length!==0)fail('SOURCE_NUMBER_ALREADY_ASSIGNED_'+source.id);
    const candidates=receipts.filter(r=>moneyCents(r)===source.amountCents&&due(r)===source.due);
    if(candidates.length!==1)fail('RECEIPT_DATE_AMOUNT_NOT_UNIQUE_'+source.id);
    const receipt=candidates[0],rid=str(receipt.id);
    if(!rid||ids.has(rid)||str(receipt.polizaId)!==str(policy.id))fail('RECEIPT_LINK_OR_DUPLICATE_'+source.id);
    if(paid(receipt)||cobros.some(c=>str(c.reciboId)===rid))fail('RECEIPT_ALREADY_PAID_OR_LINKED_'+source.id);
    if(str(receipt.numeroReciboFuente)===source.number)fail('SOURCE_NUMBER_RACE_'+source.id);
    ids.add(rid);
    selected.push({id:rid,caseId:source.id,newSourceNumber:source.number,
      oldSourceNumber:receipt.numeroReciboFuente===undefined?null:receipt.numeroReciboFuente,
      oldFieldPresent:Object.prototype.hasOwnProperty.call(receipt,'numeroReciboFuente')});
  }
  if(ids.size!==7||selected.length!==7)fail('SEVEN_UNIQUE_REQUIRED');
  return selected;
}
async function readPlan(db,tx){
  const read=ref=>tx?tx.get(ref):ref.get();
  const policyQuery=dataRef(db,'polizas').where('numero','==',POLICY).limit(8);
  const policies=await read(policyQuery);
  if(policies.size>=8)fail('POLICY_QUERY_LIMIT');
  const current=policies.docs.filter(d=>validIso(d.data().vigenciaInicio)==='2026-07-21'&&
    validIso(d.data().vigenciaFin)==='2027-07-21'&&str(d.data().pais).toUpperCase()==='GT');
  if(current.length!==1)fail('UNIQUE_POLICY_EDITION_'+current.length);
  const ps=current[0],p={...(ps.data()||{}),id:ps.id};
  const [client,insurer,receiptsQuery,cobrosQuery]=await Promise.all([
    read(dataRef(db,'clientes').doc(str(p.clienteId))),
    read(dataRef(db,'aseguradoras').doc(str(p.aseguradoraId))),
    read(dataRef(db,'recibosEsperados').where('polizaId','==',ps.id).limit(80)),
    read(dataRef(db,'cobros').where('polizaId','==',ps.id).limit(80))
  ]);
  if(!client.exists||!insurer.exists||!norm(insurer.data()?.nombre||insurer.data()?.razonSocial).includes('bantrab'))fail('CLIENT_OR_BANTRAB_INSURER_IDENTITY');
  if(receiptsQuery.size>=80||cobrosQuery.size>=80)fail('CARDINALITY_LIMIT');
  const receipts=receiptsQuery.docs.map(d=>({...(d.data()||{}),id:d.id}));
  const cobros=cobrosQuery.docs.map(d=>({...(d.data()||{}),id:d.id}));
  // Read the seven global source-number indices within this tenant BEFORE
  // making a single change. This prevents a number being linked elsewhere.
  const numbers={};
  for(const row of ROWS){
    const q=await read(dataRef(db,'recibosEsperados').where('numeroReciboFuente','==',row.number).limit(3));
    if(q.size>=3)fail('EXTERNAL_NUMBER_INDEX_BOUND');
    numbers[row.number]=q.docs.map(d=>d.id);
  }
  const selected=chooseSeven(p,receipts,cobros,numbers);
  const beforeFingerprint=fingerprint({policy:p,receipts:receipts.slice().sort((a,b)=>a.id.localeCompare(b.id)),cobros:cobros.slice().sort((a,b)=>a.id.localeCompare(b.id))});
  const afterRows=receipts.map(r=>{
    const q=selected.find(x=>x.id===r.id);return q?{...r,numeroReciboFuente:q.newSourceNumber}:r;
  }).sort((a,b)=>a.id.localeCompare(b.id));
  const afterFingerprint=fingerprint({policy:p,receipts:afterRows,cobros:cobros.slice().sort((a,b)=>a.id.localeCompare(b.id))});
  const requestId='gi_i66_bantrab7_'+hash(SOURCE_SHA+'|'+ps.id).slice(0,22);
  return {policyId:ps.id,selected,beforeFingerprint,afterFingerprint,requestId,sourceSha256:SOURCE_SHA,
    policiesObserved:policies.size,receiptRows:receipts.length,cobrosRows:cobros.length,
    attemptedPaymentWrites:0,amountDateStatusWrites:0};
}
async function execute(db,mode,gate){
  if(mode!=='dry-run'&&mode!=='apply')fail('UNKNOWN_MODE');
  const initial=await readPlan(db),repeat=await readPlan(db);
  if(initial.beforeFingerprint!==repeat.beforeFingerprint||initial.afterFingerprint!==repeat.afterFingerprint)fail('CONCURRENT_READ_CHANGE');
  if(mode==='dry-run')return {status:'PREIMAGE_SIGNED_READONLY_PASS_NOT_APPLIED',...initial,writes:0};
  if(gate?.environment!=='gravicentra-live-data-writes'||gate?.reviewerEvidence!==true||
    process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REF!=='refs/heads/recovery/fase-a-clean-20260831'||
    process.env.GI_I66_BANTRAB_MODE!=='apply')fail('PROTECTED_ENVIRONMENT_AUTH');
  const applied=await db.runTransaction(async tx=>{
    const plan=await readPlan(db,tx);
    if(plan.beforeFingerprint!==initial.beforeFingerprint||plan.afterFingerprint!==initial.afterFingerprint)fail('CAS_PREIMAGE_CHANGED');
    const audit=requestRef(db).doc(plan.requestId),prior=await tx.get(audit);
    if(prior.exists)fail('REQUEST_ALREADY_APPLIED');
    for(const r of plan.selected)tx.update(dataRef(db,'recibosEsperados').doc(r.id),{numeroReciboFuente:r.newSourceNumber});
    tx.create(audit,{status:'APPLIED_PROTECTED_BANTRAB_SEVEN_SOURCE_REFERENCE_CAS',sourceSha256:SOURCE_SHA,
      policyId:plan.policyId,caseIds:plan.selected.map(x=>x.caseId),
      beforeFingerprint:plan.beforeFingerprint,expectedAfterFingerprint:plan.afterFingerprint,
      rollbackBeforeFields:plan.selected.map(x=>({receiptId:x.id,field:'numeroReciboFuente',present:x.oldFieldPresent,value:x.oldSourceNumber})),
      sourceNumberWrites:7,paymentWrites:0,amountDateStatusWrites:0,
      committedAt:require('firebase-admin/firestore').FieldValue.serverTimestamp()});
    return {requestId:plan.requestId,afterFingerprint:plan.afterFingerprint};
  });
  // The number index must map each source requirement to exactly one receipt.
  // The post-read digest covers all policy-linked receipts and payments.
  const ps=await dataRef(db,'polizas').doc(initial.policyId).get();
  const [rs,cs,audit]=await Promise.all([
    dataRef(db,'recibosEsperados').where('polizaId','==',initial.policyId).limit(80).get(),
    dataRef(db,'cobros').where('polizaId','==',initial.policyId).limit(80).get(),
    requestRef(db).doc(applied.requestId).get()
  ]);
  const r=rs.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.id.localeCompare(b.id));
  const c=cs.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.id.localeCompare(b.id));
  const actual=fingerprint({policy:{...ps.data(),id:ps.id},receipts:r,cobros:c});
  if(!audit.exists||actual!==applied.afterFingerprint||audit.data()?.status!=='APPLIED_PROTECTED_BANTRAB_SEVEN_SOURCE_REFERENCE_CAS')fail('POSTIMAGE_OR_AUDIT_MISMATCH');
  for(const row of ROWS){
    const q=await dataRef(db,'recibosEsperados').where('numeroReciboFuente','==',row.number).limit(3).get();
    if(q.size!==1||q.docs[0].get('polizaId')!==initial.policyId)fail('POST_NUMBER_NOT_UNIQUE_'+row.id);
  }
  return {status:'PROTECTED_LIVE_BANTRAB_SEVEN_SOURCE_REFERENCES_PASS',sourceSha256:SOURCE_SHA,
    receiptSourceReferenceWrites:7,paymentWrites:0,amountDateStatusWrites:0,
    beforeFingerprint:initial.beforeFingerprint,afterFingerprint:actual,rollbackRecorded:true,auditRecorded:true};
}
async function main(){
  if(process.env.GCLOUD_PROJECT!==PROJECT||process.env.FIRESTORE_EMULATOR_HOST)fail('PROJECT_BOUND');
  const mode=process.env.GI_I66_BANTRAB_MODE||'dry-run';
  const {initializeApp,getApps}=require('firebase-admin/app');
  const {getFirestore}=require('firebase-admin/firestore');
  const db=getFirestore(getApps()[0]||initializeApp({projectId:PROJECT}));
  const result=await execute(db,mode,mode==='apply'?{environment:'gravicentra-live-data-writes',reviewerEvidence:true}:null);
  const out=process.env.GI_I66_BANTRAB_REPORT||'';
  if(out){
    const prefix=String(process.env.RUNNER_TEMP||'')+'/';
    if(!prefix.startsWith('/home/runner/work/_temp/')||!out.startsWith(prefix)||!/\/gi-i66-bantrab-7-report\.json$/.test(out))fail('REPORT_DESTINATION');
    fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{mode:0o600});
  }
  console.log('I66_BANTRAB_SEVEN_STATUS='+result.status);
  console.log('I66_BANTRAB_SEVEN_WRITE_COUNT='+(result.receiptSourceReferenceWrites||0));
}
if(require.main===module)main().catch(e=>{console.error(/^I66_BANTRAB_7_HOLD_/.test(e.message)?e.message:'I66_BANTRAB_7_PRIVATE_FAILURE');process.exitCode=1;});
module.exports={SOURCE_SHA,ROWS,chooseSeven,execute,moneyCents,due,paid};
