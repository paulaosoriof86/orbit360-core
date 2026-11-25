'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const reader=require('./gravicentra-i66-financial-identity-readback.cjs');
const writer=require('./gravicentra-i66-source-bulk-apply.cjs');
const clone=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const root='tenants/alianzas-soluciones',at=(col,id)=>root+'/data/'+col+'/items/'+id;
class Ref{
  constructor(db,path,limit){Object.assign(this,{db,path,max:limit});}
  collection(n){return new Ref(this.db,this.path+'/'+n);}
  doc(n){return new Ref(this.db,this.path+'/'+n);}
  limit(n){return new Ref(this.db,this.path,n);}
  async get(){
    if(this.db.readUnavailable)throw Error('SIMULATED_POSTCOMMIT_OUTAGE');
    if(this.max){
      const docs=[...this.db.docs.keys()].filter(p=>p.startsWith(this.path+'/')&&
        !p.slice(this.path.length+1).includes('/')).sort().slice(0,this.max).map(p=>this.db.snap(p));
      return {docs,size:docs.length};
    }
    return this.db.snap(this.path);
  }
}
class Db{
  constructor(){this.docs=new Map();this.times=new Map();this.writes=0;}
  collection(n){return new Ref(this,n);}
  put(path,data){this.docs.set(path,clone(data));this.times.set(path,{_seconds:1,_nanoseconds:2});}
  snap(path){const data=this.docs.get(path);return {id:path.split('/').at(-1),exists:data!==undefined,
    data:()=>clone(data),updateTime:this.times.get(path)||null};}
  async runTransaction(work){
    const staged=[],tx={get:async ref=>{assert.equal(staged.length,0,'no reads after writes');return ref.get();},
      update:(ref,data)=>staged.push(['update',ref.path,clone(data)]),
      create:(ref,data)=>staged.push(['create',ref.path,clone(data)])};
    const result=await work(tx);
    for(const [kind,path,data] of staged){
      if(kind==='create')assert.ok(!this.docs.has(path),'no overwrite');
      else assert.ok(this.docs.has(path),'no obligation creates');
      this.docs.set(path,kind==='create'?data:{...this.docs.get(path),...data});
      this.writes++;this.times.set(path,{_seconds:2,_nanoseconds:this.writes});
    }
    if(this.outageAfterCommit&&staged.length)this.readUnavailable=true;
    if(this.throwAfterCommit&&staged.length)throw Error('SIMULATED_LOST_COMMIT_RESPONSE');
    return result;
  }
}
function fixture(profileId='MAPFRE_R46'){
  const binding=reader.mapfreBinding(profileId),profile=reader.mapfreProfile(binding),s=binding.preflight.scope,db=new Db();
  const name='PRIVATE SYNTHETIC MAPFRE HOLDER',witness=hash(name.replace(/ /g,''));
  binding.holder.sources.forEach(w=>w.issuedPdfNormalizedHolderSha256=witness);
  db.put(at('polizas',s.policyId),{numero:s.policyNumber,clienteId:s.clientId,aseguradoraId:s.insurerId,
    pais:'GT',moneda:'GTQ',estado:'Vigente',vigenciaInicio:s.issuedTerm[0],vigenciaFin:s.issuedTerm[1],
    ...(profileId==='MAPFRE_DOC04_2453'?{primaTotal:3715.24}: {})});
  db.put(at('clientes',s.clientId),{nombre:name,pais:'GT'});
  db.put(at('aseguradoras',s.insurerId),{nombre:'MAPFRE Seguros'});
  for(const t of binding.preflight.twoCases){
    const common={polizaId:s.policyId,clienteId:s.clientId,aseguradoraId:s.insurerId,moneda:'GTQ',
      primaTotal:profile.beforeGrossCents/100,monto:(profile.beforeGrossCents/100).toFixed(2),serie:t.installment+'/12',numeroReciboFuente:t.receiptId,
      fechaLimite:t.historicalOnlyBaseline.dates.fechaLimite,estadoOperativo:'futuro_pendiente',
      primaNeta:79.62,impuestosIVA:13.69,metadata:{keep:'exactly'}};
    db.put(at('recibosEsperados',t.receiptId),common);
    db.put(at('carteraPrimas',t.portfolioId),{...common,reciboId:t.receiptId,carteraActiva:true});
  }
  for(const [i,t] of binding.preflight.preservedPayments.entries()){
    db.put(at('recibosEsperados',t.receiptId),{polizaId:s.policyId,primaTotal:t.amountCents/100,estado:'Pagado',
      ...(profileId==='MAPFRE_DOC04_2453'?{serie:(i+1)+'/12'}:{})});
    db.put(at('carteraPrimas',t.receiptId),{polizaId:s.policyId,reciboId:t.receiptId,primaTotal:t.amountCents/100,estado:'Pagado'});
    db.put(at('cobros',t.cobroId),{polizaId:s.policyId,reciboId:t.receiptId,monto:t.amountCents/100,estado:'Pagado'});
  }
  for(const c of ['recibosEsperados','carteraPrimas'])db.put(at(c,'synthetic_installment_12'),
    {polizaId:s.policyId,primaTotal:profile.beforeGrossCents/100,serie:'12/12',reciboId:'synthetic_installment_12',estado:'Pendiente'});
  if(profileId==='MAPFRE_DOC04_2453')for(const n of [5,8,9,10,11])for(const c of ['recibosEsperados','carteraPrimas'])
    db.put(at(c,'synthetic_installment_'+n),{polizaId:s.policyId,primaTotal:309.60,serie:n+'/12',
      reciboId:'synthetic_installment_'+n,estado:'Pendiente',privateSyntheticMetadata:{preserve:true}});
  const originals=binding.preflight.originalDocumentPins.map(p=>({fileId:p.driveFileId,sha256:p.sha256,status:'ORIGINAL_BYTES_VERIFIED'}));
  return {binding,db,originals};
}
async function plan(f){const snap=await reader.mapfreSnapshot(f.db,f.binding);
  return writer.mapfreCorrectionPlan(reader.mapfreReview(f.binding,snap,f.originals),f.binding);}
const gate=p=>({environment:'gravicentra-live-data-writes',reviewerEvidence:true,
  repository:'paulaosoriof86/orbit360-core',ref:'refs/heads/recovery/fase-a-clean-20260831',project:'ays-orbit-360-lab',
  sourceManifestSha256:p.sourceManifestSha256,authoritySha256:p.authoritySha256});
const apply=(f,p,g=gate(p))=>writer.applyMapfreObligations(f.db,p,g,f.binding,f.originals);
test('MAPFRE corrects only two existing gross/due references, preserves nine payments and replays with zero writes',async()=>{
  const f=fixture(),p=await plan(f),before=clone([...f.db.docs]),r=await apply(f,p);
  assert.equal(r.status,'MAPFRE_OBLIGATION_APPLIED_READBACK_PASS');assert.equal(r.technicalWrites,5);
  assert.equal(r.paymentWrites,0);assert.equal(r.cobroWrites,0);assert.equal(r.newPayments,0);
  for(const [path,data] of before){
    const patch=p.patches.find(x=>at(x.collection,x.id)===path);
    assert.deepEqual(f.db.docs.get(path),patch?{...data,...patch.patch}:data);
  }
  const a=f.db.docs.get(root+'/operationalRequests/'+r.auditId);
  assert.equal(a.rollback.records.length,4);assert.equal(a.previousPaymentsPreserved,9);
  assert.deepEqual(a.originalSourceStates.map(x=>x.state),['COMMISSION_ANCHOR','PAID']);
  assert.ok(a.rollback.records.every(e=>e.updateTime&&e.data.primaTotal===127.76));
  for(const t of f.binding.preflight.twoCases){
    const d=f.db.docs.get(at('recibosEsperados',t.receiptId));
    assert.equal(d.primaTotal,127.77);assert.equal(d.monto,'127.77');assert.equal(d.primaNeta,79.62);
    assert.equal(d.fechaLimite,t.historicalOnlyBaseline.dates.fechaLimite);
    assert.equal(d.fechaVencimientoContractual,t.documentedTarget.contractualDue);
  }
  const again=await apply(f,p);assert.equal(again.status,'MAPFRE_OBLIGATION_ALREADY_APPLIED_READBACK_PASS');
  assert.equal(again.technicalWrites,0);assert.equal(f.db.writes,5);
});
test('MAPFRE rejects unauthorized environment and documentary drift before writes',async()=>{
  for(const change of [g=>g.reviewerEvidence=false,g=>g.project='other',g=>g.ref='refs/heads/main',
    g=>g.authoritySha256='f'.repeat(64)]){
    const f=fixture(),p=await plan(f),g=gate(p);change(g);await assert.rejects(apply(f,p,g),/PROTECTED_ENVIRONMENT/);assert.equal(f.db.writes,0);
  }
  const f=fixture(),p=await plan(f);f.originals[0].sha256='a'.repeat(64);
  await assert.rejects(apply(f,p),/ORIGINAL_BYTES_CHANGED/);assert.equal(f.db.writes,0);
});
test('MAPFRE full CAS detects unrelated metadata, updateTime, prior payment and installment12 changes',async()=>{
  for(const mutate of [f=>f.db.docs.get(at('recibosEsperados',f.binding.preflight.twoCases[0].receiptId)).metadata.keep='changed',
    f=>f.db.times.set(at('recibosEsperados',f.binding.preflight.twoCases[0].receiptId),{_seconds:9,_nanoseconds:9}),
    f=>f.db.docs.get(at('cobros',f.binding.preflight.preservedPayments[0].cobroId)).monto=1,
    f=>f.db.docs.get(at('recibosEsperados','synthetic_installment_12')).primaTotal=127.70]){
    const f=fixture(),p=await plan(f);mutate(f);const r=await apply(f,p);
    assert.equal(r.status,'MAPFRE_OBLIGATION_CAS_HOLD');assert.equal(f.db.writes,0);
  }
});
test('MAPFRE stale plans cannot cross newly paid, reported, canceled, inactive or duplicate relationships',async()=>{
  for(const mutate of [f=>f.db.docs.get(at('recibosEsperados',f.binding.preflight.twoCases[0].receiptId)).estado='Pagado',
    f=>f.db.docs.get(at('recibosEsperados',f.binding.preflight.twoCases[0].receiptId)).fechaPagoReportada='2026-10-01',
    f=>f.db.docs.get(at('polizas',f.binding.preflight.scope.policyId)).estado='Cancelada',
    f=>f.db.docs.get(at('carteraPrimas',f.binding.preflight.twoCases[0].portfolioId)).carteraActiva=false,
    f=>f.db.put(at('cobros','unexpected'),{reciboId:f.binding.preflight.twoCases[0].receiptId}),
    f=>f.db.put(at('carteraPrimas','duplicate'),{reciboId:f.binding.preflight.twoCases[0].receiptId})]){
    const f=fixture(),p=await plan(f);mutate(f);const r=await apply(f,p);
    assert.equal(r.status,'MAPFRE_OBLIGATION_CAS_HOLD');assert.equal(f.db.writes,0);
  }
});
test('MAPFRE refuses altered patch plans and existing audit/postimage conflicts',async()=>{
  const f=fixture(),p=await plan(f);p.patches[0].patch.primaTotal=12.77;
  assert.equal((await apply(f,p)).status,'MAPFRE_OBLIGATION_CAS_HOLD');assert.equal(f.db.writes,0);
  const second=fixture(),p2=await plan(second);await apply(second,p2);
  second.db.docs.get(at('recibosEsperados',second.binding.preflight.twoCases[0].receiptId)).metadata.keep='after-changed';
  const r=await apply(second,p2);assert.equal(r.status,'MAPFRE_OBLIGATION_CAS_HOLD');assert.equal(second.db.writes,5);
});
test('MAPFRE retains committed-but-unverified status after a postcommit outage and recovers ambiguity via audit',async()=>{
  const f=fixture(),p=await plan(f);f.db.outageAfterCommit=true;
  const held=await apply(f,p);assert.equal(held.status,'MAPFRE_OBLIGATION_COMMITTED_READBACK_HOLD');
  assert.equal(held.knownCommitted,true);assert.equal(held.technicalWrites,5);assert.equal(f.db.writes,5);
  f.db.readUnavailable=false;f.db.outageAfterCommit=false;
  assert.equal((await apply(f,p)).status,'MAPFRE_OBLIGATION_ALREADY_APPLIED_READBACK_PASS');assert.equal(f.db.writes,5);
  const a=fixture(),pa=await plan(a);a.db.throwAfterCommit=true;const recovered=await apply(a,pa);
  assert.equal(recovered.status,'MAPFRE_OBLIGATION_APPLIED_READBACK_PASS');assert.equal(recovered.recoveredAmbiguousCommit,true);
  assert.equal(recovered.writeOutcomeIndeterminate,false);assert.equal(a.db.writes,5);
});
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?
  Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const objectHash=x=>hash(JSON.stringify(stable(x)));
// Exercise the actual backend normalizer, stopping before the first transaction.
// The observer never supplies its own expected digest to this independent probe.
async function canonicalRequestPayload(payload){
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const source=path.resolve(__dirname,'../functions/cobros-reconciliation-domain.js');
  const fromDomain=require('node:module').createRequire(source),exportsObject={};
  const ref={collection(){return this;},doc(){return this;}};
  class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
  const code=fs.readFileSync(source,'utf8')+`
    operationRequestId=(_tenant,_operation,requestPayload)=>{const e=new Error('SYNTHETIC_PAYLOAD_CAPTURE');e.canonicalPayload=requestPayload;throw e;};
    exports.captureCanonicalPayload=payload=>applyPayment({tenantId:'synthetic-mapfre-tenant'},
      {requestId:'synthetic-mapfre-request'},payload);
  `;
  vm.runInNewContext(code,{exports:exportsObject,process:{env:{}},console,require:name=>
    name==='firebase-admin/app'?{getApps:()=>[{}],initializeApp:()=>({})}:
    name==='firebase-admin/firestore'?{getFirestore:()=>({collection:()=>ref,
      runTransaction:()=>{throw Error('NO_TRANSACTION_PERMITTED_IN_PAYLOAD_PROBE');}}),FieldValue:{}}:
    name==='firebase-functions/v2/https'?{HttpsError,onCall:(_,handler)=>handler}:fromDomain(name)},
    {filename:source});
  try{await exportsObject.captureCanonicalPayload(clone(payload));assert.fail('canonical probe did not stop before transaction');}
  catch(error){assert.equal(error.message,'SYNTHETIC_PAYLOAD_CAPTURE');return clone(error.canonicalPayload);}
}
test('MAPFRE observer digest equals the real backend normalizer for documentary date evidence and currency',async()=>{
  for(const original of reader.mapfreBinding().preflight.twoCases){
    for(const fields of [{},{currency:' gtq '},{moneda:'gtq'},{actualPaidDateEvidence:false}]){
      const target=clone(original);Object.assign(target.pendingConditionalCanonicalCall.payload,fields);
      const canonical=await canonicalRequestPayload(target.pendingConditionalCanonicalCall.payload);
      assert.equal(reader.mapfreCanonicalPayloadDigest(target),objectHash(canonical));
      assert.equal(canonical.actualPaidDateEvidence,target.pendingConditionalCanonicalCall.payload.actualPaidDateEvidence===true);
      assert.equal(canonical.currency,fields.currency||fields.moneda?'GTQ':'');
    }
  }
});
async function canonicalPaymentFixture(profileId='MAPFRE_R46'){
  const f=fixture(profileId),p=await plan(f),corrected=await apply(f,p),s=f.binding.preflight.scope;
  for(const t of f.binding.preflight.twoCases){
    const request=t.pendingConditionalCanonicalCall,body=request.payload;
    const shared={paymentState:'PAID_DIRECT',applicationState:'APPLIED_DIRECT',directOrInferred:'DIRECT',
      estado:'Pagado',paidDate:body.paidDate,fechaPago:body.paidDate,conciliado:true,
      evidenceId:body.evidenceId,sourceRef:body.sourceRef,evidenceType:body.evidenceType,
      invoiceNumber:body.invoiceNumber,paymentSupportDocumentRef:body.paymentSupportDocumentRef,
      evidenceAsOfDate:body.evidenceAsOfDate};
    f.db.put(at('recibosEsperados',t.receiptId),{...f.db.docs.get(at('recibosEsperados',t.receiptId)),...shared});
    f.db.put(at('carteraPrimas',t.portfolioId),{...f.db.docs.get(at('carteraPrimas',t.portfolioId)),
      estado:'Pagado',estadoCartera:'Pagado',fechaPago:body.paidDate,paymentState:'PAID_DIRECT',applicationState:'APPLIED_DIRECT'});
    f.db.put(at('cobros',request.expectedNewCobroIdIfAbsent),{polizaId:s.policyId,clienteId:s.clientId,
      reciboId:t.receiptId,moneda:'GTQ',monto:body.amount,...shared});
    const result={ok:true,receiptId:t.receiptId,cobroId:request.expectedNewCobroIdIfAbsent,
      policyId:s.policyId,clientId:s.clientId,paymentState:'PAID_DIRECT',applicationState:'APPLIED_DIRECT',
      paidDate:body.paidDate,invoiceNumber:body.invoiceNumber,portfolioUpdated:true,serverOwned:true,idempotent:true};
    const eventId='payevt_'+hash(s.tenantId+'|'+t.receiptId+'|'+request.requestId).slice(0,28);
    const payloadDigest=objectHash(await canonicalRequestPayload(body));
    f.db.put(root+'/reconciliationRequests/'+request.requestId,{status:'committed',operation:'apply_payment',eventId,payloadDigest,result});
    f.db.put(root+'/reconciliationEvents/'+eventId,{operation:'apply_payment',requestId:request.requestId,
      receiptId:t.receiptId,cobroId:request.expectedNewCobroIdIfAbsent,payloadDigest,resultDigest:objectHash(result),actor:{uid:'synthetic-authorized-actor'}});
  }
  f.auditId=corrected.auditId;return f;
}
async function paymentReview(f){
  const snapshot=await reader.mapfreSnapshot(f.db,f.binding);
  const raw=path=>{const s=f.db.snap(path);return {id:s.id,exists:s.exists,data:s.exists?s.data():null,updateTime:s.updateTime};};
  const events=f.binding.preflight.twoCases.map(t=>raw(root+'/reconciliationEvents/payevt_'+
    hash(f.binding.preflight.scope.tenantId+'|'+t.receiptId+'|'+t.pendingConditionalCanonicalCall.requestId).slice(0,28)));
  return reader.mapfrePaymentReview(f.binding,snapshot,f.originals,{correctionAudit:raw(root+'/operationalRequests/'+f.auditId),events});
}
test('MAPFRE final observer requires both canonical requests, exact sources and nine unchanged prior payments with zero writes',async()=>{
  const f=await canonicalPaymentFixture(),before=clone([...f.db.docs]),writes=f.db.writes,r=await paymentReview(f);
  assert.equal(r.status,'MAPFRE_TWO_CANONICAL_PAYMENTS_READBACK_PASS');assert.equal(r.verifiedPayments,2);
  assert.equal(r.verifiedGrossCents,25554);assert.equal(r.previousPaymentsPreserved,9);assert.equal(r.writes,0);
  assert.deepEqual([...f.db.docs],before);assert.equal(f.db.writes,writes);
});
test('MAPFRE final observer rejects wrong invoice, invented dates, duplicate payments, changed prior records and actor audit defects',async()=>{
  for(const mutate of [f=>f.db.docs.get(at('cobros',f.binding.preflight.twoCases[0].pendingConditionalCanonicalCall.expectedNewCobroIdIfAbsent)).invoiceNumber='wrong',
    f=>f.db.docs.get(at('recibosEsperados',f.binding.preflight.twoCases[0].receiptId)).applicationDate='2026-11-24',
    f=>f.db.put(at('cobros','duplicate'),{reciboId:f.binding.preflight.twoCases[0].receiptId}),
    f=>f.db.docs.get(at('cobros',f.binding.preflight.preservedPayments[0].cobroId)).monto+=0.01,
    f=>{const k=[...f.db.docs.keys()].find(k=>k.includes('/reconciliationEvents/'));f.db.docs.get(k).actor.uid='';},
    f=>{const k=[...f.db.docs.keys()].find(k=>k.includes('/reconciliationRequests/'));f.db.docs.get(k).payloadDigest='changed';}]){
    const f=await canonicalPaymentFixture();mutate(f);const count=f.db.writes,r=await paymentReview(f);
    assert.equal(r.status,'MAPFRE_PAYMENT_READBACK_HOLD');assert.ok(r.verifiedPayments<2);assert.equal(f.db.writes,count);
  }
});

test('MAPFRE observer rejects the legacy digest missing currency and actual date evidence',async()=>{
  const f=await canonicalPaymentFixture(),before=clone([...f.db.docs]),writes=f.db.writes;
  for(const target of f.binding.preflight.twoCases){
    const body=await canonicalRequestPayload(target.pendingConditionalCanonicalCall.payload);
    delete body.currency;delete body.actualPaidDateEvidence;
    f.db.docs.get(root+'/reconciliationRequests/'+target.pendingConditionalCanonicalCall.requestId).payloadDigest=objectHash(body);
  }
  const r=await paymentReview(f);
  assert.equal(r.status,'MAPFRE_PAYMENT_READBACK_HOLD');assert.equal(r.verifiedPayments,0);
  assert.equal(f.db.writes,writes);assert.equal(f.db.docs.size,before.length);
});

test('DOC04 binding admits only its two original requirements and preserves truthful source states',()=>{
  const binding=reader.mapfreBinding('MAPFRE_DOC04_2453'),p=binding.preflight;
  assert.equal(p.scope.policyNumber,'3002600002453');assert.equal(p.scope.knownPreviousPaymentsToPreserve,4);
  assert.deepEqual(p.twoCases.map(t=>[t.installment,t.requirement]),[[6,'3041843'],[7,'3041844']]);
  assert.deepEqual(p.twoCases.map(t=>binding.source.facts.find(f=>f.sourceFactId===t.sourceFactId).state),['COMMISSION_ANCHOR','PAID']);
  assert.equal(binding.source.facts.find(f=>f.sourceFactId===p.twoCases[0].sourceFactId).installment,null);
  assert.equal(p.originalDocumentPins.length,4);assert.equal(p.documentedSchedule.length,12);
  assert.deepEqual(p.documentedSchedule.map(t=>Math.round(Number(t.gross)*100)),[...Array(11).fill(30961),30953]);
  assert.equal(p.annualDocumentaryBoundary.documentedSumScheduleCents,371524);
  assert.equal(p.effects.paymentWrites,0);assert.equal(binding.holder.rawHolderNameIncluded,false);assert.equal(binding.holder.rawTaxIdIncluded,false);
  assert.throws(()=>reader.mapfreBinding('MAPFRE_ARBITRARY_POLICY'),/MAPFRE_CLOSED_PROFILE_REQUIRED/);
});
test('DOC04 uses the same protected CAS for four existing records and one audit, preserving actual payments and operational dates',async()=>{
  const f=fixture('MAPFRE_DOC04_2453'),p=await plan(f),before=clone([...f.db.docs]),r=await apply(f,p);
  assert.equal(p.profileId,'MAPFRE_DOC04_2453');assert.equal(p.priorPayments,4);
  assert.equal(p.calendarDiagnostic.contractMinusCurrentReceiptsCents,4);assert.equal(p.annualVariancePreserved,false);
  assert.equal(r.status,'MAPFRE_OBLIGATION_APPLIED_READBACK_PASS');assert.equal(r.technicalWrites,5);
  assert.equal(r.receiptWrites,2);assert.equal(r.portfolioWrites,2);assert.equal(r.auditWrites,1);
  assert.equal(r.paymentWrites,0);assert.equal(r.cobroWrites,0);assert.equal(r.newPayments,0);
  assert.equal(r.privateAfter.calendarDiagnostic.contractMinusCurrentReceiptsCents,2);
  assert.equal(r.privateAfter.calendarDiagnostic.wholeCalendarAccepted,false);
  for(const [key,data] of before){
    const patch=p.patches.find(e=>at(e.collection,e.id)===key);
    assert.deepEqual(f.db.docs.get(key),patch?{...data,...patch.patch}:data);
  }
  for(const target of f.binding.preflight.twoCases){
    const receipt=f.db.docs.get(at('recibosEsperados',target.receiptId));
    assert.equal(receipt.primaTotal,309.61);assert.equal(receipt.monto,'309.61');
    assert.equal(receipt.fechaLimite,target.historicalOnlyBaseline.dates.fechaLimite);
    assert.equal(receipt.fechaVencimientoContractual,target.documentedTarget.contractualDue);
  }
  const audit=f.db.docs.get(root+'/operationalRequests/'+r.auditId);
  assert.equal(audit.previousPaymentsPreserved,4);assert.equal(audit.rollback.records.length,4);
  assert.equal(audit.rollback.onlyIfWholeCurrentAfterDataHashMatches,true);
  const replay=await apply(f,p);assert.equal(replay.status,'MAPFRE_OBLIGATION_ALREADY_APPLIED_READBACK_PASS');
  assert.equal(replay.technicalWrites,0);assert.equal(f.db.writes,5);
});
test('DOC04 refuses unknown holder, contradictory NIT, missing calendar and competing payment with zero writes',async()=>{
  for(const mutate of [
    f=>f.db.docs.get(at('clientes',f.binding.preflight.scope.clientId)).nombre='DIFFERENT SYNTHETIC HOLDER',
    f=>f.db.docs.get(at('clientes',f.binding.preflight.scope.clientId)).nit='SYNTHETIC-CONTRADICTORY-NIT',
    f=>f.db.docs.delete(at('recibosEsperados','synthetic_installment_8')),
    f=>f.db.docs.get(at('recibosEsperados','synthetic_installment_8')).serie='7/12',
    f=>f.db.docs.get(at('polizas',f.binding.preflight.scope.policyId)).vigenciaFin='2027-05-21',
    f=>f.db.put(at('cobros','synthetic-extra-paid-record'),{polizaId:f.binding.preflight.scope.policyId,reciboId:'synthetic_installment_5',monto:309.6,estado:'Pagado'}),
    f=>f.db.docs.get(at('recibosEsperados',f.binding.preflight.twoCases[0].receiptId)).partialPayment=true
  ]){
    const f=fixture('MAPFRE_DOC04_2453');mutate(f);await assert.rejects(plan(f));assert.equal(f.db.writes,0);
  }
});
test('DOC04 holds original drift and cannot use the historical R46 plan or overwrite an unrelated postimage',async()=>{
  const f=fixture('MAPFRE_DOC04_2453'),p=await plan(f);
  const badOriginals=clone(f.originals);badOriginals[0].sha256='0'.repeat(64);
  await assert.rejects(writer.applyMapfreObligations(f.db,p,gate(p),f.binding,badOriginals),/MAPFRE_ORIGINAL_BYTES_CHANGED/);
  const legacy=fixture(),legacyPlan=await plan(legacy);
  await assert.rejects(apply(f,legacyPlan,gate(legacyPlan)),/MAPFRE_PLAN_PROFILE_CHANGED/);
  const receipt=f.binding.preflight.twoCases[0].receiptId;
  f.db.docs.get(at('recibosEsperados',receipt)).metadata.keep='new concurrent value';
  const held=await apply(f,p);assert.equal(held.status,'MAPFRE_OBLIGATION_CAS_HOLD');assert.equal(f.db.writes,0);
});
test('DOC04 canonical payment observer verifies two exact real-owner-shaped requests, four preserved payments and gross61922 without writes',async()=>{
  const f=await canonicalPaymentFixture('MAPFRE_DOC04_2453'),before=clone([...f.db.docs]),writes=f.db.writes,r=await paymentReview(f);
  assert.equal(r.status,'MAPFRE_TWO_CANONICAL_PAYMENTS_READBACK_PASS');assert.equal(r.verifiedPayments,2);
  assert.equal(r.verifiedGrossCents,61922);assert.equal(r.previousPaymentsPreserved,4);assert.equal(r.writes,0);
  assert.deepEqual([...f.db.docs],before);assert.equal(f.db.writes,writes);
  f.db.docs.get(at('cobros',f.binding.preflight.preservedPayments[0].cobroId)).monto+=0.01;
  const held=await paymentReview(f);assert.equal(held.status,'MAPFRE_PAYMENT_READBACK_HOLD');assert.equal(held.verifiedPayments,0);
  assert.equal(f.db.writes,writes);
});
test('DOC04 workflow selects only a closed profile in existing modes and retains protected financial approval',()=>{
  const fs=require('node:fs'),path=require('node:path'),base=path.resolve(__dirname,'..');
  const wf=fs.readFileSync(path.join(base,'.github/workflows/gravicentra-i66-insurer-source-bulk-protected.yml'),'utf8');
  assert.match(wf,/GI_I66_MAPFRE_PROFILE:.*'I66_MAPFRE_DOC04_2453'.*'MAPFRE_DOC04_2453'.*'MAPFRE_R46'/);
  assert.match(wf,/environment: gravicentra-live-data-writes/);
  assert.match(wf,/GI_I66_BULK_MODE:.*'mapfre-cas-preflight'/);assert.match(wf,/GI_I66_BULK_MODE:.*'mapfre-cas-apply'/);
  const live=fs.readFileSync(path.join(base,'tools/gravicentra-i66-source-bulk-live.cjs'),'utf8');
  assert.ok(live.indexOf('MAPFRE_PROFILE_CANNOT_ENTER_OTHER_WRITERS')<live.indexOf("const admin=require('firebase-admin')"));
  assert.match(live,/MAPFRE_LOADED_PLAN_PROFILE_MISMATCH/);
});
