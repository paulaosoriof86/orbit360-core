'use strict';
// Signed I6.6 A5/A6 readback. Never mutates financial or customer records.
// Source rows have been extracted from SHA-verifiable Nov 2026 insurer files;
// Columna intermediary 346 only, including paid/current duplicate suppression.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const source=require('../artifacts/orbit360-recovery/release-control/I6_6_CARTERA_A5_A6_SOURCE_EXACT_20261112.json');
const issuerEvidence=require('../artifacts/orbit360-recovery/release-control/I6_6_A5_A6_INSURER_ISSUED_INSTALLMENT_SCHEDULE_LIVE_DIFF_20261112.json').insurerIssuedScheduleEvidence;
const {resolveEditions,policyVariants,numbers,amount}=require('./gravicentra-i66-cartera-a1-a4-readonly.cjs');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const text=x=>String(x==null?'':x).trim();
const norm=x=>text(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ');
const h=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,16);
const cents=a=>a.reduce((s,r)=>s+r.cents,0);
const EXTERNAL_REFERENCE_FIELDS=Object.freeze([
  'numeroReciboFuente','numeroReciboAseguradora','numeroRequerimiento',
  'requerimiento','numeroBoleta','sourceNumber','referenciaCobro','receiptNumber'
]);
// These schedules are transcribed from insurer-issued 2026 PDF annexes, not
// inferred from the application's generic monthly frequency. No client PII.
function issuerInstallments(caseId){
  const e=issuerEvidence[caseId];
  if(!e||!['A5.P7','A6.P4'].includes(caseId))return [];
  const start=caseId==='A5.P7'?'2026-08-21':'2026-03-04';
  const count=caseId==='A5.P7'?10:12;
  const firstRef=caseId==='A5.P7'?14518453:7043045;
  const rows=Array.from({length:count},(_,i)=>{
    const month=Number(start.slice(0,4))*12+Number(start.slice(5,7))-1+i;
    const due=String(Math.floor(month/12)).padStart(4,'0')+'-'+String(month%12+1).padStart(2,'0')+'-'+start.slice(8);
    return {quota:i+1,requirement:String(firstRef+i),due,
      cents:caseId==='A6.P4'&&i===count-1?14799:caseId==='A6.P4'?14803:32586};
  });
  assert.equal(rows.length,e.issuedInstallmentCount);
  assert.equal(cents(rows),e.issuedTotalCents);
  assert.equal(rows[0].due,e.firstInsurerDueDate);
  assert.equal(rows.at(-1).due,e.lastInsurerDueDate);
  assert.equal(rows[e.paidStatementQuota-1].requirement,e.paidStatementRequirement);
  assert.equal(rows[e.paidStatementQuota-1].cents,e.paidStatementAmountCents);
  return rows;
}
function receiptOrdinal(r){
  const candidates=['secuencia','numeroCuota','cuotaNumero','cuota','serie']
    .map(k=>String(r?.[k]??'').trim().match(/^(\d{1,2})(?:\s*\/\s*\d{1,2})?$/))
    .filter(Boolean).map(m=>Number(m[1])).filter(n=>n>=1&&n<=24);
  const unique=[...new Set(candidates)];
  return unique.length===1?unique[0]:null;
}
function paymentOrReportEvidence(r){
  return !!(r&&(r.pagado===true||r.conciliado===true||r.conciliadoPago===true||
    r.reportado||r.validadoReporte||r.fechaPago||r.fechaPagoReportada||
    /^(pagado|conciliado|pago.?reportado)$/i.test(String(r.estado||'').trim())));
}
function issuerSchedulePreview(caseId,snapshot){
  const issued=issuerInstallments(caseId),receipts=snapshot.receipts||[];
  if(!issued.length)return null;
  const byOrdinal=receipts.map(r=>({r,quota:receiptOrdinal(r)}));
  const sequenced=byOrdinal.filter(x=>x.quota!=null);
  const unique=new Set(sequenced.map(x=>x.quota));
  const completeIdentity=sequenced.length===receipts.length&&unique.size===receipts.length;
  const occupied=receipts.filter(r=>numbers(r).length>0).length;
  const paidOrReported=receipts.filter(paymentOrReportEvidence).length;
  const diff=completeIdentity?issued.map(i=>{
    const row=byOrdinal.find(x=>x.quota===i.quota)?.r;
    if(!row)return{quota:i.quota,missing:true};
    const date=String(row.fechaLimite||row.vence||row.fechaVencimiento||'');
    return{quota:i.quota,amountMatches:amount(row)===i.cents,
      dueMatches:date===i.due,sourceMatches:numbers(row).includes(i.requirement),
      sourceOccupiedByDifferentValue:numbers(row).some(n=>n!==i.requirement),
      paymentEvidence:paymentOrReportEvidence(row)};
  }):[];
  return {mode:'READ_ONLY_INSURER_ISSUED_SCHEDULE_PREFLIGHT',issuerQuotaCount:issued.length,
    issuerTotalCents:cents(issued),liveReceiptCount:receipts.length,
    liveReceiptTotalCents:receipts.reduce((s,r)=>s+(amount(r)||0),0),
    identifiedUniqueInternalQuotas:unique.size,completeInternalQuotaIdentity:completeIdentity,
    preexistingExternalReferenceRows:occupied,paymentOrReportEvidenceRows:paidOrReported,
    liveDateAmountOrReferenceDifferences:diff,
    // A summary alone cannot approve a mutation. Full preimages, conflict-free
    // source identities, a protected transaction and signed LIVE readback are
    // always required in a separate, reviewer-gated workflow.
    safeToAutoApply:false,writes:0};
}
// Operational mini-batch triage: show actual issuer reference conflicts, but
// never emit client data, raw Firestore document IDs or a write permit.
// A prior payment *report* is protected just like an already reconciled cash
// receipt; the insurer-issued schedule cannot silently replace that history.
function issuerScheduleAdjudication(caseId,snapshot){
  const issued=issuerInstallments(caseId),receipts=snapshot.receipts||[];
  if(!issued.length)return null;
  const byQuota=Object.create(null),duplicates=[];
  for(const row of receipts){
    const quota=receiptOrdinal(row);
    if(quota==null||Object.hasOwn(byQuota,quota))duplicates.push(quota);
    else byQuota[quota]=row;
  }
  const officialRefs=new Set(issued.map(x=>x.requirement));
  const cases=[];
  for(let quota=1;quota<=Math.max(issued.length,...Object.keys(byQuota).map(Number),0);quota++){
    const document=issued.find(x=>x.quota===quota)||null;
    const live=byQuota[quota]||null;
    const actualReferences=live?EXTERNAL_REFERENCE_FIELDS.filter(k=>text(live[k]))
      .map(k=>({field:k,value:text(live[k])})):[];
    const actualDue=live?text(live.fechaLimite||live.vence||live.fechaVencimiento):'';
    const beforeAmount=live?amount(live):null;
    const evidence=paymentOrReportEvidence(live);
    const exact=!!document&&!!live&&beforeAmount===document.cents&&
      actualDue===document.due&&actualReferences.some(x=>x.value===document.requirement)&&
      actualReferences.every(x=>x.value===document.requirement);
    let decision='HOLD_SOURCE_EXACT_REVIEW';
    if(!document)decision='HOLD_EXTRA_LIVE_QUOTA_NOT_IN_INSURER_POLICY';
    else if(!live)decision='HOLD_MISSING_LIVE_QUOTA';
    else if(exact)decision='NOOP_ALREADY_INSURER_EXACT';
    else if(evidence)decision='HOLD_PAYMENT_OR_REPORT_PROTECTED';
    else if(actualReferences.some(x=>x.value!==document.requirement))
      decision=actualReferences.some(x=>officialRefs.has(x.value))?
        'HOLD_REFERENCE_BELONGS_TO_ANOTHER_INSURER_QUOTA':
        'HOLD_EXISTING_EXTERNAL_REFERENCE_NOT_PROVEN_REPLACEABLE';
    else if(receipts.length!==issued.length)decision='HOLD_OVERALL_INSTALLMENT_COUNT_MISMATCH';
    else decision='CANDIDATE_EMPTY_REFERENCE_REVIEW_REQUIRED';
    cases.push({quota,document,live:live?{
      cents:beforeAmount,due:actualDue,externalReferences:actualReferences,
      paymentOrReportProtected:evidence,
      receiptIdFingerprint:h([caseId,live.id||null,quota])
    }:null,decision});
  }
  const statusCounts=cases.reduce((out,x)=>(out[x.decision]=(out[x.decision]||0)+1,out),{});
  return {mode:'READ_ONLY_FULL_REFERENCE_ADJUDICATION_NO_AUTO_WRITE',
    caseId,insurerQuotaCount:issued.length,liveQuotaCount:receipts.length,
    completeQuotaIdentity:duplicates.length===0&&Object.keys(byQuota).length===receipts.length,
    duplicateOrUnparseableQuotas:duplicates,
    issuerTotalCents:cents(issued),liveTotalCents:receipts.reduce((s,r)=>s+(amount(r)||0),0),
    cases,statusCounts,safeToAutoApply:false,writes:0};
}
function validateSource(){
  assert.equal(source.mode,'READ_ONLY_SOURCE_FORENSICS_NO_FINANCIAL_WRITE');
  const a=source.insurers.A5,b=source.insurers.A6;
  assert.equal(a.paid.length,7);assert.equal(a.pending.length,9);
  assert.equal(cents(a.paid),317161);assert.equal(cents(a.pending),512548);
  assert.equal(b.intermediaryCode,'346');assert.equal(b.paid.length,4);
  assert.equal(b.current.length,9);assert.equal(cents(b.paid),102256);
  assert.equal(cents(b.current),287056);
  const overlap=b.current.filter(r=>r.alsoInPaidSheet);
  assert.equal(overlap.length,1);assert.equal(overlap[0].requirement,'7043053');
  assert.equal(overlap[0].collectedCents,14803);
  assert.ok(b.paid.some(r=>r.requirement===overlap[0].requirement&&r.cents===overlap[0].cents));
  assert.equal(b.current.filter(r=>!r.alsoInPaidSheet).length,8);
  assert.equal(cents(b.current.filter(r=>!r.alsoInPaidSheet)),272253);
  assert.equal(source.safety.writes,0);
}
const paid=(k,code,r,i)=>Object.assign({id:code+'.P'+(i+1),insurer:k,sourceKind:'PAID'},r);
const unpaid=(k,code,r,i)=>Object.assign({id:code+'.U'+(i+1),insurer:k,sourceKind:'PENDING'},r);
const CASES=Object.freeze([
  ...source.insurers.A5.paid.map((r,i)=>paid('ASEGURADORA GENERAL','A5',r,i)),
  ...source.insurers.A5.pending.map((r,i)=>unpaid('ASEGURADORA GENERAL','A5',r,i)),
  ...source.insurers.A6.paid.map((r,i)=>paid('COLUMNA','A6',r,i)),
  ...source.insurers.A6.current.filter(r=>!r.alsoInPaidSheet).map((r,i)=>unpaid('COLUMNA','A6',r,i))
]);
assert.equal(CASES.length,28);
function aliases(one){
  const base=policyVariants(one.policy);
  if(one.insurer==='COLUMNA'){
    const digits=one.policy.replace(/^VA[-\s]*/i,'');
    base.push(digits,Number(digits));
  }
  return Array.from(new Set(base));
}
function sameInsurer(name,expected){
  const n=norm(name),e=norm(expected);
  return e==='COLUMNA'?n.includes('COLUMNA'):
    n.includes('ASEGURADORA GENERAL')||n.includes('SEGUROS GENERAL');
}
async function sourceInsurerName(db,policy,insurerCache){
  const inline=[policy.aseguradoraNombre,policy.compania,policy.nombreAseguradora,
    typeof policy.aseguradora==='string'?policy.aseguradora:''].filter(Boolean);
  if(inline.length)return inline.join(' ');
  const id=text(policy.aseguradoraId||policy.companiaId);
  if(!id)return '';
  if(!Object.hasOwn(insurerCache,id)){
    const ref=db.collection('tenants').doc(TENANT).collection('data').doc('aseguradoras').collection('items').doc(id);
    insurerCache[id]=ref.get().then(s=>s.exists?s.data()?.nombre||s.data()?.razonSocial||'':'');
  }
  return insurerCache[id];
}
async function scan(db){
  const tenant=db.collection('tenants').doc(TENANT);
  const col=n=>tenant.collection('data').doc(n).collection('items');
  const [member,probe]=await Promise.all([tenant.collection('members').limit(1).get(),col('polizas').limit(1).get()]);
  assert.ok(!member.empty&&!probe.empty,'I66_A5_A6_TENANT_SCOPE_NOT_PRESENT');
  const buckets=Object.create(null),insurerCache=Object.create(null);
  const unique=Array.from(new Set(CASES.map(x=>x.insurer+'|'+x.policy)));
  for(const key of unique){
    const one=CASES.find(x=>x.insurer+'|'+x.policy===key),docs=Object.create(null);
    const fields=['numero','numeroPoliza','numero_poliza','numPoliza','polizaNumero','policyNumber'];
    for(const field of fields)for(const value of aliases(one)){
      const read=await col('polizas').where(field,'==',value).limit(5).get();
      for(const d of read.docs)docs[d.id]=d;
      assert.ok(Object.keys(docs).length<25,'I66_A5_A6_POLICY_EDITION_SCAN_LIMIT');
    }
    const matches=[];
    for(const d of Object.values(docs)){
      const p=d.data()||{},actual=await sourceInsurerName(db,p,insurerCache);
      if(!sameInsurer(actual,one.insurer))continue;
      matches.push({id:d.id,data:p});
    }
    buckets[key]=matches;
  }
  const cache=Object.create(null);
  async function readEdition(edition){
    if(Object.hasOwn(cache,edition.id))return cache[edition.id];
    const r=(async()=>{
      const [receipts,cobros,client]=await Promise.all([
        col('recibosEsperados').where('polizaId','==',edition.id).limit(80).get(),
        col('cobros').where('polizaId','==',edition.id).limit(80).get(),
        text(edition.data.clienteId)?col('clientes').doc(text(edition.data.clienteId)).get():Promise.resolve(null)
      ]);
      assert.ok(receipts.size<80&&cobros.size<80,'I66_A5_A6_EDITION_BOUND');
      const rRows=receipts.docs.map(d=>Object.assign({id:d.id},d.data()||{}));
      const cRows=cobros.docs.map(d=>Object.assign({id:d.id},d.data()||{}));
      return{policies:[edition.data],receipts:rRows,cobros:cRows,clientExists:!!client&&client.exists,
        fingerprint:h({policy:edition.data,receipts:rRows,cobros:cRows})};
    })();cache[edition.id]=r;return r;
  }
  const output=[];
  for(const one of CASES){
    const matches=buckets[one.insurer+'|'+one.policy]||[];
    const snapshots=await Promise.all(matches.map(readEdition));
    const result=resolveEditions(one,snapshots);
    let linked=0,quotaExact=0,sourceAmountExact=0;
    for(const snapshot of snapshots)for(const receipt of snapshot.receipts){
      if(!numbers(receipt).includes(one.requirement))continue;
      linked++;if(amount(receipt)===one.cents)sourceAmountExact++;
      const quota=[receipt.secuencia,receipt.cuota,receipt.numeroCuota,receipt.cuotaNumero].some(v=>
        v!=null&&Number(v)===Number(one.quota));
      if(quota)quotaExact++;
    }
    // Do not classify as an appliable payment based on a number/amount alone:
    // insurer, policy edition, source requirement, quota and due need receipts.
    const status=!matches.length?'HOLD_EXACT_INSURER_POLICY_NOT_FOUND':
      linked===0?'HOLD_REQUIREMENT_NOT_LINKED':
      linked!==1?'HOLD_REQUIREMENT_MULTIPLE_EDITIONS':
      sourceAmountExact!==1?'HOLD_AMOUNT_MISMATCH':
      quotaExact!==1?'HOLD_EXACT_QUOTA_NOT_LINKED':
      one.paidDate?'PAID_SOURCE_EXACT_RECEIPT_ELIGIBILITY_REVIEW_NOT_WRITE':
      'PENDING_SOURCE_EXACT_RECEIPT_ELIGIBILITY_REVIEW_NOT_WRITE';
    // Focal read-only investigation of documented 2026 insurer-issued policy
    // editions. Never include customer names, raw policy IDs or receipt IDs.
    const focal=one.id==='A5.P7'||one.id==='A6.P4';
    const receiptCandidateReview=focal?snapshots.map((snapshot,index)=>({
      editionOrdinal:index+1,
      hasClient:snapshot.clientExists,
      receiptCount:snapshot.receipts.length,
      cobroCount:snapshot.cobros.length,
      policyDateEvidence:Object.fromEntries(Object.entries(snapshot.policies[0]||{})
        .filter(([k,v])=>/^(fechaInicio|fechaFin|vigenciaInicio|vigenciaFin|vigenciaIni|vigenciaFinal|inicioVigencia|finVigencia|vigenciaDesde|vigenciaHasta|fechaVencimiento|periodicidad|frecuencia|cuotas)$/i.test(k)
          &&(typeof v==='string'||typeof v==='number')&&String(v).length<=35)
        .map(([k,v])=>[k,v])),
      insurerIssuedPlanPreflight:issuerSchedulePreview(one.id,snapshot),
      insurerIssuedAdjudication:issuerScheduleAdjudication(one.id,snapshot),
      receiptCandidates:snapshot.receipts.filter(r=>one.id==='A5.P7'||
        amount(r)===one.cents||[r.secuencia,r.cuota,r.numeroCuota,r.cuotaNumero]
          .some(v=>v!=null&&Number(v)===Number(one.quota)))
        .slice(0,12).map(r=>({
          cents:amount(r),
          quota:[r.secuencia,r.cuota,r.numeroCuota,r.cuotaNumero]
            .map(v=>v==null?null:Number(v)).find(v=>Number.isSafeInteger(v)&&v>=1)||receiptOrdinal(r),
          internalSerieIsParseable:receiptOrdinal(r)!=null,
          sourceRequirementMatched:numbers(r).includes(one.requirement),
          hasDifferentSourceNumber:numbers(r).some(n=>n!==one.requirement),
          hasAnySourceNumber:numbers(r).length>0,
          dateDue:/^\d{4}-\d{2}-\d{2}$/.test(String(r.fechaVencimiento||r.fechaLimite||r.vence||''))
            ?String(r.fechaVencimiento||r.fechaLimite||r.vence):null,
          hasPaymentOrReportEvidence:paymentOrReportEvidence(r),
          state:['Pendiente','Vencido','Pagado','Anulado'].includes(String(r.estado||''))
            ?r.estado:'OTHER'
        }))
    })):undefined;
    output.push({id:one.id,sourceKind:one.sourceKind,sourceCaseRow:one.row,
      policyEditionsMatchingInsurer:matches.length,linkedExactRequirements:linked,
      exactAmountLinked:sourceAmountExact,exactQuotaLinked:quotaExact,
      candidateEditionCount:result.exactAmountEditions||0,
      status,writes:0,snapshotFingerprint:h(snapshots.map(s=>s.fingerprint)),
      ...(focal?{focalReceiptsForDocumentaryReconciliation:receiptCandidateReview}:{})});
  }
  return output;
}
// Optional bounded query to the same read-only owner. Source references remain
// in dispatch input/private artifact; no customer rows enter repository files.
function validateReferenceQuery(input){
  assert.equal(typeof input,'string','I66_EXTRA_QUERY_STRING_REQUIRED');
  assert.ok(Buffer.byteLength(input,'utf8')<=48000,'I66_EXTRA_QUERY_TOO_LARGE');
  const q=JSON.parse(input);
  assert.deepEqual(Object.keys(q).sort(),['schema','tenantId','projectId','writes','noEligibilityEffect','sources','targets','responsePublicKeyPem'].sort(),'I66_EXTRA_QUERY_FIELDS');
  const key=crypto.createPublicKey(q.responsePublicKeyPem);
  assert.equal(key.asymmetricKeyType,'rsa');
  assert.ok(key.asymmetricKeyDetails.modulusLength>=3072&&key.asymmetricKeyDetails.modulusLength<=8192,'I66_EXTRA_RESPONSE_KEY_BOUND');
  assert.equal(q.schema,'GI_I66_READONLY_INSURER_REFERENCE_QUERY_V1');
  assert.equal(q.projectId,PROJECT);assert.equal(q.tenantId,TENANT);
  assert.equal(q.writes,0);assert.equal(q.noEligibilityEffect,true);
  assert.ok(Array.isArray(q.sources)&&q.sources.length>=1&&q.sources.length<=20);
  assert.ok(q.sources.every(s=>Object.keys(s).sort().join(',')==='key,sha256'&&/^[a-z0-9_]{10,100}$/.test(s.key)&&/^[a-f0-9]{64}$/.test(s.sha256)));
  assert.equal(new Set(q.sources.map(s=>s.key)).size,q.sources.length);
  assert.ok(Array.isArray(q.targets)&&q.targets.length>=1&&q.targets.length<=60);
  let refs=0;
  for(const t of q.targets){
    assert.deepEqual(Object.keys(t).sort(),['insurer','policy','aliases','sourceKey','holderWitness','references'].sort(),'I66_EXTRA_TARGET_FIELDS');
    assert.ok(['COLUMNA','ASEGURADORA_GUATEMALTECA','ASEGURADORA_RURAL'].includes(t.insurer));
    assert.ok(/^[A-Za-z0-9 /-]{1,80}$/.test(t.policy));
    assert.ok(q.sources.some(s=>s.key===t.sourceKey));
    assert.ok(!t.holderWitness||/^[a-f0-9]{64}$/.test(t.holderWitness));
    assert.ok(Array.isArray(t.aliases)&&t.aliases.length>=1&&t.aliases.length<=8);
    assert.ok(t.aliases.every(a=>typeof a==='string'&&/^[A-Za-z0-9 /-]{1,80}$/.test(a)));
    assert.ok(Array.isArray(t.references)&&t.references.length>=1&&t.references.length<=120);
    for(const r of t.references){
      assert.ok(Object.keys(r).every(k=>['sourceFactId','requirement','invoiceNumber','installment','totalInstallments'].includes(k)),'I66_EXTRA_PRIVATE_SOURCE_FIELDS_FORBIDDEN');
      assert.ok(/^[a-zA-Z0-9_-]{1,100}$/.test(r.sourceFactId));
      for(const k of ['requirement','invoiceNumber'])if(r[k]!=null)assert.ok(/^[A-Za-z0-9 /-]{1,100}$/.test(r[k]));
      assert.ok(r.requirement||r.invoiceNumber);
      for(const k of ['installment','totalInstallments'])if(r[k]!=null)assert.ok(Number.isSafeInteger(r[k])&&r[k]>=1&&r[k]<=120);
      refs++;
    }
  }
  assert.ok(refs<=500,'I66_EXTRA_REFERENCE_BOUND');
  assert.equal(new Set(q.targets.map(t=>t.insurer+'|'+t.policy)).size,q.targets.length);
  return q;
}
const stableReferenceValue=v=>Array.isArray(v)?v.map(stableReferenceValue):v&&typeof v==='object'?
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,stableReferenceValue(v[k])])):v;
const referenceDigest=v=>crypto.createHash('sha256').update(JSON.stringify(stableReferenceValue(v))).digest('hex');
function projectReferenceDocument(d){
  const value=d.data()||{},keys=[
    'numero','numeroPoliza','numero_poliza','numPoliza','polizaNumero','policyNumber',
    'pais','moneda','clienteId','clientId','aseguradoraId','companiaId','asesorId','renuevaDe','renovadaPor',
    'vigenciaInicio','vigenciaFin','fechaInicio','fechaFin','frecuencia','cuotas',
    'polizaId','policyId','reciboId','receiptId','reciboEsperadoId','cobroId','carteraId',
    'secuencia','numeroCuota','cuotaNumero','cuota','serie','totalCuotas','totalInstallments',
    'numeroReciboFuente','numeroReciboAseguradora','numeroRequerimiento','requerimiento','numeroBoleta',
    'sourceNumber','referenciaCobro','receiptNumber','numeroRecibo','sourceId','sourceRef','evidenceId',
    'numeroFactura','invoiceNumber','serieFactura','invoiceSeries',
    'primaTotal','monto','montoTotal','primaNeta','neta','saldo','saldoPendiente','montoPagado',
    'periodoInicioFuente','periodStart','receiptPeriodStart','fechaVencimientoContractual','vence','fechaVencimiento','fechaLimite',
    'fechaPago','paidDate','actualPaidDate','inferredEffectiveDate','evidenceAsOfDate','applicationDate','fechaAplicacion',
    'estado','paymentState','applicationState','pagado','confirmado','conciliado','conciliadoPago','inferredPaid',
    'carteraActiva','historicalExigible','paymentOrigin','paymentEvidenceType','directOrInferred',
    'auditId','operationId','requestId','applicationAuditId','applicationEvidenceVerified'];
  return {id:d.id,updateTime:d.updateTime?.toJSON?.()||null,documentSha256:referenceDigest(value),
    fields:Object.fromEntries(keys.filter(k=>value[k]!=null).map(k=>[k,value[k]]))};
}
async function scanReferenceQuery(db,q){
  const col=n=>db.collection('tenants').doc(TENANT).collection('data').doc(n).collection('items');
  const byId=docs=>Object.values(Object.fromEntries(docs.map(d=>[d.id,d])));
  const insurerMatch=(name,wanted)=>wanted==='COLUMNA'?norm(name).includes('COLUMNA'):
    wanted==='ASEGURADORA_GUATEMALTECA'?norm(name).includes('GUATEMALTECA'):
    /ASEGURADORA RURAL|SEGUROS RURAL|BANRURAL/.test(norm(name));
  async function bounded(promises,limit=120){
    const snaps=await Promise.all(promises);assert.ok(snaps.every(s=>s.size<=limit),'I66_EXTRA_QUERY_ROWS_BOUND');
    return byId(snaps.flatMap(s=>s.docs));
  }
  const results=[];
  for(const t of q.targets){
    const values=[...t.aliases,...t.aliases.filter(a=>/^\d+$/.test(a)).map(Number)];
    const requests=['numero','numeroPoliza','numero_poliza','numPoliza','polizaNumero','policyNumber']
      .flatMap(f=>values.map(v=>()=>col('polizas').where(f,'==',v).limit(21).get()));
    let docs=[];
    for(let i=0;i<requests.length;i+=6)docs.push(...await bounded(requests.slice(i,i+6).map(f=>f()),20));
    docs=byId(docs);assert.ok(docs.length<=24,'I66_EXTRA_POLICY_EDITIONS_BOUND');
    const editions=[];
    for(const d of docs){
      const p=d.data()||{};if(text(p.pais).toUpperCase()!=='GT')continue;
      const insurerId=text(p.aseguradoraId||p.companiaId);
      const insurer=insurerId?await col('aseguradoras').doc(insurerId).get():null;
      if(!insurer?.exists||!insurerMatch(insurer.data()?.nombre||insurer.data()?.razonSocial,t.insurer))continue;
      const clientId=text(p.clienteId||p.clientId);
      const client=clientId?await col('clientes').doc(clientId).get():null;
      const readRelated=name=>bounded(['polizaId','policyId'].map(f=>col(name).where(f,'==',d.id).limit(121).get()));
      const receipts=await readRelated('recibosEsperados');
      const linked={};
      for(const name of ['carteraPrimas','cobros']){
        let rows=await readRelated(name);
        for(let i=0;i<receipts.length;i+=10){
          const ids=receipts.slice(i,i+10).map(r=>r.id);
          rows.push(...await bounded(['reciboId','reciboEsperadoId','receiptId'].map(f=>col(name).where(f,'in',ids).limit(121).get())));
        }
        linked[name]=byId(rows);assert.ok(linked[name].length<=240,'I66_EXTRA_LINKED_ROWS_BOUND');
      }
      const sourceSha=q.sources.find(s=>s.key===t.sourceKey).sha256;
      const holderMatched=!!client?.exists&&!!t.holderWitness&&['nombre','nombreCompleto','razonSocial'].some(k=>
        text(client.data()?.[k])&&crypto.createHash('sha256').update(sourceSha+'|'+norm(client.data()[k]).replace(/ /g,'')).digest('hex')===t.holderWitness);
      const rr=receipts.map(projectReferenceDocument),cc=linked.cobros.map(projectReferenceDocument);
      const comparisons=t.references.map(ref=>{
        const external=ref.requirement||ref.invoiceNumber;
        const matched=rr.filter(r=>EXTERNAL_REFERENCE_FIELDS.concat('numeroRecibo').some(k=>text(r.fields[k])===text(external)));
        const ordinal=ref.installment==null?[]:rr.filter(r=>receiptOrdinal(r.fields)===ref.installment);
        const exactIds=matched.map(r=>r.id);
        const cobros=cc.filter(c=>['reciboId','reciboEsperadoId','receiptId'].some(k=>exactIds.includes(c.fields[k])));
        return {sourceFactId:ref.sourceFactId,exactReferenceReceiptIds:exactIds,ordinalCandidateReceiptIds:ordinal.map(r=>r.id),
          linkedCobroIds:cobros.map(c=>c.id),
          paymentEvidenceReceiptIds:matched.filter(r=>paymentOrReportEvidence(r.fields)).map(r=>r.id),
          writeEligible:false,reason:'READ_ONLY_EVIDENCE_REQUIRES_CANONICAL_WRITER_PREFLIGHT'};
      });
      editions.push({policy:projectReferenceDocument(d),insurer:projectReferenceDocument(insurer),
        clientExists:!!client?.exists,clientId:client?.exists?client.id:null,holderWitnessMatches:holderMatched,
        receipts:rr,portfolio:linked.carteraPrimas.map(projectReferenceDocument),cobros:cc,comparisons});
    }
    results.push({insurer:t.insurer,policy:t.policy,sourceKey:t.sourceKey,editions,
      diagnosticOnly:true,noEligibilityEffect:true,writes:0});
  }
  return {schema:'GI_I66_READONLY_INSURER_REFERENCE_RESULT_V1',readOnly:true,writes:0,noEligibilityEffect:true,
    projectId:PROJECT,tenantId:TENANT,sourceQuerySha256:referenceDigest(q),observedAtUtc:new Date().toISOString(),
    sourceSha:process.env.GITHUB_SHA||null,runId:process.env.GITHUB_RUN_ID||null,targets:results,
    guard:'No write plan; fresh canonical writer must verify preimages and exact source identity before any financial mutation'};
}

function sealReferenceReport(result,publicKeyPem){
  const bytes=Buffer.from(JSON.stringify(result)),key=crypto.randomBytes(32),iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(bytes),cipher.final()]);
  return {schema:'GI_I66_READONLY_ENCRYPTED_REFERENCE_RESULT_V1',algorithm:'RSA-OAEP-SHA256+AES-256-GCM',
    wrappedKey:crypto.publicEncrypt({key:publicKeyPem,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},key).toString('base64'),
    iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64'),
    plaintextSha256:crypto.createHash('sha256').update(bytes).digest('hex'),sourceQuerySha256:result.sourceQuerySha256,
    targetCount:result.targets.length,writes:0,noEligibilityEffect:true};
}

async function main(){
  validateSource();
  assert.equal(process.env.GCLOUD_PROJECT,PROJECT);
  assert.equal(process.env.GI_I66_CARTERA_MODE,'readonly');
  assert.ok(!process.env.FIRESTORE_EMULATOR_HOST);
  const {getFirestore}=require('firebase-admin/firestore');
  const {initializeApp,getApps}=require('firebase-admin/app');
  const db=getFirestore(getApps()[0]||initializeApp({projectId:PROJECT}));
  // Read dispatch selectors from the runner event file: never interpolate or
  // bind customer input into shell/job env, where Actions may echo it.
  const referenceInput=process.env.GITHUB_EVENT_NAME==='workflow_dispatch'&&process.env.GITHUB_EVENT_PATH?
    JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')).inputs?.readonly_reference_query||'':'';
  if(referenceInput){
    const query=validateReferenceQuery(referenceInput);
    const result=await scanReferenceQuery(db,query);
    const dest=text(process.env.GI_I66_CARTERA_REPORT),prefix=text(process.env.RUNNER_TEMP)+'/';
    assert.ok(prefix.startsWith('/home/runner/work/_temp/')&&dest.startsWith(prefix)&&dest.endsWith('/gi-i66-a5-a6-live-readonly.json'));
    fs.writeFileSync(dest,JSON.stringify(sealReferenceReport(result,query.responsePublicKeyPem),null,2)+'\n',{flag:'wx',mode:0o600});
    console.log('I66_REFERENCE_QUERY_READONLY '+JSON.stringify({targets:result.targets.length,
      editions:result.targets.reduce((n,t)=>n+t.editions.length,0),writes:0,noEligibilityEffect:true}));
    return;
  }
  const first=await scan(db),second=await scan(db);
  assert.deepEqual(first,second,'I66_A5_A6_CONCURRENT_LIVE_CHANGE_HOLD');
  const counts=first.reduce((m,r)=>(m[r.status]=(m[r.status]||0)+1,m),{});
  const report={schema:'gi.i66.cartera.a5-a6.live.readonly.v1',
    dateGuatemala:'2026-11-12',sourceSha256:{
      aseguradoraGeneralPaid:source.insurers.A5.paidSha256,
      aseguradoraGeneralPending:source.insurers.A5.pendingSha256,
      columna:source.insurers.A6.sha256},
    source:{A5:{paid:7,pending:9},A6:{paid:4,pendingSourceRows:9,
      overlappingPaidCurrent:1,uniquePendingUncollected:8}},
    cases:first,caseCount:first.length,statusCounts:counts,writes:0,certifiedApplied:0,
    next:'Exact edition and endorsement, external receipt, quota, insured identity and amount must be validated before isolated protected CAS.'};
  const dest=text(process.env.GI_I66_CARTERA_REPORT);
  if(dest){
    const prefix=text(process.env.RUNNER_TEMP)+'/';
    assert.ok(prefix.startsWith('/home/runner/work/_temp/'));
    assert.ok(dest.startsWith(prefix)&&dest.endsWith('/gi-i66-a5-a6-live-readonly.json'));
    fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  }
  console.log('I66_A5_A6_LIVE_READONLY='+JSON.stringify({caseCount:first.length,statusCounts:counts,
    source:report.source,certifiedApplied:0,writes:0}));
}
if(require.main===module)main().catch(e=>{
  console.error(/^I66_A5_A6_[A-Z0-9_]+$/.test(text(e.message))?e.message:'I66_A5_A6_READONLY_HOLD');
  process.exitCode=1;
});
module.exports={validateSource,CASES,aliases,sameInsurer,issuerInstallments,receiptOrdinal,paymentOrReportEvidence,issuerSchedulePreview,issuerScheduleAdjudication,validateReferenceQuery,scanReferenceQuery,projectReferenceDocument,sealReferenceReport};
