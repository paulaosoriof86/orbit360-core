'use strict';
// Execute the actual callable handler against an isolated transactional test
// double. No Firebase SDK, credentials, network, or production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const repo=process.env.R51_BASE_REPO || path.resolve(__dirname,'..');
const root=process.env.R51_SOURCE_ROOT || repo;
const fromDomain=createRequire(path.join(repo,'functions/cobros-reconciliation-domain.js'));
const test=require('node:test');
const contract=require(path.join(repo,'functions/cobros-ledger-contract'));
const {digest}=require(path.join(repo,'functions/proposal-application-boundary'));
const copy=x=>x==null?x:structuredClone(x);
// Firestore field transforms are legal in map fields, but never inside arrays.
// The previous in-memory transaction double accepted these invalid writes,
// masking the production callable failure at application commit.
function assertNoArrayTransforms(value,inArray=false){
 assert.notEqual(value,undefined,'Firestore does not accept an undefined field value');
 if(value&&typeof value==='object'&&value.__testServerTimestamp===true)
  assert.equal(inArray,false,'Firestore FieldValue.serverTimestamp() cannot be used inside arrays');
 if(Array.isArray(value))for(const item of value)assertNoArrayTransforms(item,true);
 else if(value&&typeof value==='object')for(const item of Object.values(value))assertNoArrayTransforms(item,inArray);
}
let documents=new Map(),writeCount=0,transactionTail=Promise.resolve();
class Ref{
 constructor(parts,filters=[],max=Infinity){this.parts=parts;this.filters=filters;this.max=max;this.id=parts[parts.length-1];this.path=parts.join('/');}
 collection(name){return new Ref([...this.parts,name]);} doc(id){return new Ref([...this.parts,id]);}
 where(field,op,value){assert.equal(op,'==');return new Ref(this.parts,[...this.filters,[field,value]],this.max);}
 limit(n){return new Ref(this.parts,this.filters,n);}
 async get(){return snapshot(this,documents);}
}
function snapshot(ref,store){
 if(ref.parts.length%2===0){const row=store.get(ref.path);return{id:ref.id,ref,exists:!!row,data:()=>copy(row)};}
 const docs=[...store.entries()].filter(([key,row])=>key.startsWith(ref.path+'/')&&key.split('/').length===ref.parts.length+1&&ref.filters.every(([k,v])=>row[k]===v))
  .slice(0,ref.max).map(([key,row])=>({id:key.split('/').pop(),ref:new Ref(key.split('/')),exists:true,data:()=>copy(row)}));
 return{docs,size:docs.length,empty:docs.length===0};
}
const db={collection:name=>new Ref([name]),runTransaction:fn=>{
 const pending=transactionTail.then(async()=>{
  const working=new Map([...documents.entries()].map(([k,v])=>[k,copy(v)]));let writes=0,writing=false;
  const tx={get:async ref=>{assert.equal(writing,false,'Firestore transactions must finish all reads before writes');return snapshot(ref,working);},
   set:(ref,data,options)=>{assertNoArrayTransforms(data);writing=true;writes++;working.set(ref.path,options&&options.merge?Object.assign({},working.get(ref.path)||{},copy(data)):copy(data));}};
  const out=await fn(tx);documents=working;writeCount+=writes;return out;
 });
 transactionTail=pending.catch(()=>{});return pending;
}};
class HttpsError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details;}}
const exportsObject={};
vm.runInNewContext(fs.readFileSync(path.join(root,'functions/cobros-reconciliation-domain.js'),'utf8'),{
 exports:exportsObject,process:{env:{}},console,
 require:name=>name==='./payment-inference-engine'?require(path.join(root,'functions/payment-inference-engine.js')):name==='firebase-admin/app'?{getApps:()=>[{}],initializeApp:()=>({})}:
  name==='firebase-admin/firestore'?{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>({__testServerTimestamp:true})}}:
  name==='firebase-functions/v2/https'?{HttpsError,onCall:(_,handler)=>({run:handler})}:fromDomain(name)
});
const command=exportsObject.orbit360CobrosReconciliationCommand;
const tenant='qa-r51',base='tenants/'+tenant,item=(c,id)=>base+'/data/'+c+'/items/'+id;
const stored=(c,id)=>documents.get(item(c,id));
function seed({paid=true,amount=100,obligation=100,insurer='qa_any_insurer',country='GT',currency='GTQ'}={}){
 documents=new Map();writeCount=0;
 documents.set(base+'/members/direction',{uid:'direction',tenantId:tenant,status:'active',roles:['Dirección'],countries:[country],dataScopes:{default:'all'}});
 documents.set(base+'/config/reconciliation',{autoCommitHighConfidence:true,requireSameCurrency:true});
 documents.set(item('polizas','qa_policy'),{id:'qa_policy',tenantId:tenant,clienteId:'qa_client',pais:country,moneda:currency,numero:'QA-R51-POLICY',cuotas:1,estado:'Vigente',aseguradoraId:insurer});
 const facts={paymentState:'PAID_DIRECT',applicationState:'PENDING_APPLICATION',directOrInferred:'DIRECT',
  paymentEvidenceType:'CRM_MIGRATED_DIRECT',paymentOrigin:'CRM_MIGRATED_DIRECT_PAYMENT',
  evidenceType:'CRM_ORIGINAL',evidenceId:'qa_original_evidence',sourceRef:'qa_original_source',
  evidenceAsOfDate:'2026-07-31',paidDate:'2026-07-15',fechaPago:'2026-07-15',
  paymentMethod:'Transferencia original',metodoPago:'Transferencia original',paymentSupportDocumentRef:'qa_original_payment_support'};
 documents.set(item('recibosEsperados','qa_receipt'),{id:'qa_receipt',tenantId:tenant,polizaId:'qa_policy',clienteId:'qa_client',pais:country,moneda:currency,monto:obligation,primaTotal:obligation,cuota:'1/1',vence:'2026-07-20',estado:paid?'Pagado':'Pendiente',...(paid?facts:{})});
 documents.set(item('carteraPrimas','qa_portfolio'),{id:'qa_portfolio',tenantId:tenant,polizaId:'qa_policy',clienteId:'qa_client',reciboId:'qa_receipt',pais:country,moneda:currency,monto:obligation,saldo:obligation,estado:'Pendiente',carteraActiva:true,vence:'2026-07-20'});
 if(paid)documents.set(item('cobros','qa_cobro'),{id:'qa_cobro',tenantId:tenant,polizaId:'qa_policy',clienteId:'qa_client',reciboId:'qa_receipt',pais:country,moneda:currency,monto:amount,estado:'Pagado',conciliado:false,...facts});
}
const call=(payload={},operation='reconcile_payment')=>command.run({auth:{uid:'direction',token:{}},data:{tenantId:tenant,activeRole:'Dirección',operation,reason:'Prueba sintética R51',payload:{receiptId:'qa_receipt',sourceType:'insurer_invoice',applicationDate:'2026-11-24',evidenceId:'qa_application_invoice',invoiceDocumentRef:'qa_invoice_document',invoiceNumber:'QA-001',amount:100,...payload}}});
const finance=()=>copy([...documents.entries()].filter(([p])=>/\/(?:recibosEsperados|carteraPrimas|cobros)\//.test(p)));
function actualProjection(){
 const Orbit={ui:{today:()=> '2026-11-24',daysFromNow:()=>-1},store:{all:c=>[...documents.entries()].filter(([p])=>p.startsWith(item(c,''))).map(([,r])=>r),get:stored,where:(c,p)=>[...documents.entries()].filter(([k])=>k.startsWith(item(c,''))).map(([,r])=>r).filter(p)}};
 vm.runInNewContext(fs.readFileSync(path.join(repo,'orbit360-platform/core/queries.js'),'utf8'),{Orbit,window:{Orbit}});
 return{receiptOpen:Orbit.q.expectedReceiptClassification(stored('recibosEsperados','qa_receipt')).open,portfolioOpen:Orbit.q.portfolioOpen(stored('carteraPrimas','qa_portfolio'))};
}
for(const insurer of ['qa_mapfre','qa_el_roble','qa_unknown_insurer'])test('documentary two-cent application preserves all original payment facts for '+insurer,async()=>{
 seed({insurer});const original=copy(stored('cobros','qa_cobro'));const result=await call({amount:100.02,paidDate:'2026-11-23',paymentMethod:'Método nuevo',paymentSupportDocumentRef:'qa_new_support'});
 const payment=stored('cobros','qa_cobro'),receipt=stored('recibosEsperados','qa_receipt'),portfolio=stored('carteraPrimas','qa_portfolio');
 assert.equal(payment.monto,100);assert.equal(receipt.monto,100);assert.equal(receipt.primaTotal,100);assert.equal(portfolio.monto,100);
 for(const k of ['paidDate','fechaPago','paymentOrigin','paymentEvidenceType','evidenceId','sourceRef','evidenceType','evidenceAsOfDate','paymentMethod','paymentSupportDocumentRef'])assert.equal(payment[k],original[k],k);
 assert.equal(receipt.paidDate,original.paidDate);assert.equal(receipt.evidenceId,original.evidenceId);
 assert.equal(payment.applicationState,'APPLIED_DIRECT');assert.equal(payment.applicationAmount,100.02);
 assert.equal(payment.applicationEvidence.evidenceId,'qa_application_invoice');assert.equal(payment.applicationEvidence.reportedPaidDate,'2026-11-23');
 assert.equal(payment.documentaryAmountVariance.differenceCents,2);assert.equal(payment.documentaryAmountVariance.bankSettlementProved,false);
 assert.equal(payment.paymentAmountComparison.obligationMinusPaymentCents,0);assert.equal(result.amount,100);
 assert.equal([...documents.keys()].filter(p=>p.startsWith(item('cobros',''))).length,1);
 const afterWrites=writeCount,again=await call({amount:100.02,paidDate:'2026-11-23',paymentMethod:'Método nuevo',paymentSupportDocumentRef:'qa_new_support'});
 assert.equal(again.reused,true);assert.equal(writeCount,afterWrites);
});
test('five cents inclusive accepts a documentary fact while retaining equal payment and obligation',async()=>{seed();await call({amount:100.05});assert.equal(stored('cobros','qa_cobro').monto,100);assert.equal(stored('cobros','qa_cobro').documentaryAmountVariance.differenceCents,5);});
test('negative five cents documents variance without a negative payment or changed obligation',async()=>{seed();await call({amount:99.95});assert.equal(stored('cobros','qa_cobro').monto,100);assert.equal(stored('recibosEsperados','qa_receipt').monto,100);assert.equal(stored('cobros','qa_cobro').documentaryAmountVariance.differenceCents,-5);});
test('six cents documentary variance holds before all financial mutations',async()=>{seed();const before=finance();await assert.rejects(()=>call({amount:100.06}),e=>e.message==='PAYMENT_APPLICATION_VARIANCE_REQUIRES_REVIEW');assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
test('existing real100 versus obligation100.02 holds with explicit residual; no payment becomes100.02',async()=>{
 seed({amount:100,obligation:100.02});const before=finance(),projection=actualProjection();
 await assert.rejects(()=>call({amount:100.02,paidDate:'2026-11-23'}),e=>{assert.equal(e.details.reason,'PAYMENT_EXISTING_RESIDUAL_REQUIRES_ALLOCATION');assert.match(e.message,/Pago: GTQ 100.00; obligación: GTQ 100.02/);assert.match(e.message,/Faltan GTQ 0.02/);assert.equal(e.details.residualCents,2);assert.equal(e.details.residualAmount,0.02);assert.equal(e.details.financialWrites,0);return true;});
 assert.deepEqual(finance(),before);assert.equal(writeCount,0);assert.deepEqual(actualProjection(),projection);assert.equal(projection.portfolioOpen,true);
});
for(const amount of [0,0.01,50,99.95,99.98,100.02,100.05,101])test('new actual payment '+amount+' cannot close a100 obligation under documentary tolerance',async()=>{
 seed({paid:false});const before=finance();await assert.rejects(()=>call({amount,sourceType:'manual',applicationDate:'',invoiceNumber:'',invoiceDocumentRef:''},'apply_payment'));
 assert.deepEqual(finance(),before);assert.equal(writeCount,0);assert.deepEqual(actualProjection(),{receiptOpen:true,portfolioOpen:true});assert.equal([...documents.keys()].filter(p=>p.startsWith(item('cobros',''))).length,0);
});
test('new exact payment remains usable and persists one paid event',async()=>{seed({paid:false});const r=await call({amount:100,sourceType:'manual',applicationDate:'',invoiceNumber:'',invoiceDocumentRef:'',paidDate:'2026-11-22'},'apply_payment');assert.equal(r.paymentState,'PAID_DIRECT');assert.equal(stored('recibosEsperados','qa_receipt').monto,100);assert.equal(stored('carteraPrimas','qa_portfolio').monto,100);assert.equal([...documents.values()].filter(r=>r.reciboId==='qa_receipt'&&r.paymentState==='PAID_DIRECT'&&r.id.startsWith('cob_')).length,1);});
for(const [country,currency] of [['GT','USD'],['CO','COP'],['CO','GTQ']])test('does not extend five cents to '+country+'/'+currency,async()=>{seed({country,currency});const before=finance();await assert.rejects(()=>call({amount:100.05}),e=>e.message==='PAYMENT_APPLICATION_VARIANCE_REQUIRES_REVIEW');assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
for(const [field,value] of [['polizaId','qa_other_policy'],['clienteId','qa_other_client'],['tenantId','qa_other_tenant'],['pais','CO'],['moneda','USD']])test('no monetary tolerance for existing payment '+field+' mismatch',async()=>{seed();stored('cobros','qa_cobro')[field]=value;const before=finance();await assert.rejects(()=>call({amount:100.02}));assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
test('source currency cannot bypass a previous exact request by sharing its idempotency digest',async()=>{seed();await call();const before=finance(),writes=writeCount;await assert.rejects(()=>call({currency:'USD'}));assert.deepEqual(finance(),before);assert.equal(writeCount,writes);});
for(const flag of ['partialPayment','reversal','conflictingEvidence'])test('contradictory '+flag+' cannot use rounding',async()=>{seed();const before=finance();await assert.rejects(()=>call({amount:100.02,[flag]:true}));assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
test('absent original paidDate is not invented from an unproven invoice date',async()=>{seed();for(const c of ['cobros','recibosEsperados']){const row=stored(c,c==='cobros'?'qa_cobro':'qa_receipt');delete row.paidDate;delete row.fechaPago;}await call({paidDate:'2026-11-23'});assert.equal(stored('cobros','qa_cobro').paidDate,undefined);assert.equal(stored('recibosEsperados','qa_receipt').paidDate,undefined);});
test('paid date aliases conflicting in stored payment hold before mutation',async()=>{seed();stored('cobros','qa_cobro').fechaPago='2026-07-16';const before=finance();await assert.rejects(()=>call());assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
test('documentary sub-cent input is not silently rounded into policy',async()=>{seed();const before=finance();await assert.rejects(()=>call({amount:100.004}));assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
test('raw existing actual amount precision is not normalized by enrichment',async()=>{seed({amount:100.004});const before=finance();await assert.rejects(()=>call());assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
test('existing payment provenance also survives the alternate reconcile_evidence owner path',async()=>{
 seed();const original=copy(stored('cobros','qa_cobro'));
 const out=await command.run({auth:{uid:'direction',token:{}},data:{tenantId:tenant,activeRole:'Dirección',operation:'reconcile_evidence',reason:'Synthetic',payload:{policyId:'qa_policy',receiptId:'qa_receipt',evidenceType:'INVOICE_INSTALLMENT_N',evidenceId:'qa_later_invoice',evidenceAsOfDate:'2026-11-24',currency:'GTQ',amount:100,paidDate:'2026-11-23',actualPaidDateEvidence:true}}});
 assert.equal(out.status,'AUTO_COMMITTED_HIGH_CONFIDENCE');const row=stored('cobros','qa_cobro');for(const k of ['monto','paidDate','fechaPago','paymentOrigin','paymentEvidenceType','evidenceId','sourceRef','evidenceAsOfDate'])assert.equal(row[k],original[k],k);assert.equal(row.reconciliationEvidence.evidenceId,'qa_later_invoice');assert.equal(stored('recibosEsperados','qa_receipt').evidenceId,original.evidenceId);
});
test('legacy paid receipt without a physical cobro retains its original payment provenance',async()=>{seed();documents.delete(item('cobros','qa_cobro'));const original=copy(stored('recibosEsperados','qa_receipt'));const result=await call();const row=stored('cobros',result.cobroId);assert.equal(row.monto,100);for(const k of ['paidDate','paymentOrigin','paymentEvidenceType','evidenceId','sourceRef','evidenceAsOfDate'])assert.equal(row[k],original[k],k);assert.equal(row.applicationEvidence.evidenceId,'qa_application_invoice');});
test('conflicting amount aliases never become a monetary comparison',async()=>{seed();const before=finance();await assert.rejects(()=>call({amount:100,monto:100.02}),e=>e.message==='PAYMENT_AMOUNT_ALIASES_CONFLICT');assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
test('conflicting currency aliases cannot reuse an already committed request',async()=>{seed();await call({currency:'GTQ'});const before=finance(),n=writeCount;await assert.rejects(()=>call({currency:'GTQ',moneda:'USD'}),e=>e.message==='PAYMENT_CURRENCY_ALIASES_CONFLICT');assert.deepEqual(finance(),before);assert.equal(writeCount,n);});
test('legacy enrichment references the actual source receipt instead of inventing a preexisting cobro id',async()=>{seed();documents.delete(item('cobros','qa_cobro'));const out=await call();assert.equal(stored('cobros',out.cobroId).documentaryAmountVariance.originalSourceRef,'recibosEsperados/qa_receipt#monto');});
test('legacy payment without its event cannot invent a different paid amount from an invoice',async()=>{seed();documents.delete(item('cobros','qa_cobro'));const before=finance();await assert.rejects(()=>call({amount:100.02}),e=>e.message==='PAYMENT_LEGACY_ACTUAL_AMOUNT_UNPROVEN');assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
for(const [field,value] of [['policyId','qa_other_policy'],['clientId','qa_other_client'],['receiptId','qa_other_receipt'],['currency','USD'],['country','CO']])test('contradictory existing '+field+' alias holds before enrichment',async()=>{seed();stored('cobros','qa_cobro')[field]=value;const before=finance();await assert.rejects(()=>call({amount:100.02}),e=>e.message==='PAYMENT_FINANCIAL_IDENTITY_ALIASES_CONFLICT');assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
test('recorded monetary aliases with different amounts are not chosen by first-match order',async()=>{seed();stored('cobros','qa_cobro').montoTotal=100.02;const before=finance();await assert.rejects(()=>call(),e=>e.message==='PAYMENT_RECORDED_AMOUNT_ALIASES_CONFLICT');assert.deepEqual(finance(),before);assert.equal(writeCount,0);});
test('equivalent country and currency labels preserve the existing valid application',async()=>{seed();Object.assign(stored('cobros','qa_cobro'),{country:'Guatemala',currency:'gtq'});const out=await call({amount:100.02});assert.equal(out.applicationState,'APPLIED_DIRECT');assert.equal(stored('cobros','qa_cobro').monto,100);});

// Independent review found that absence itself must be preserved: an invoice
// can supply application evidence, but cannot backfill unknown payment facts.
for(const [label,original] of [['absent',undefined],['blank',''],['null',null]])test('enrichment preserves '+label+' original payment provenance separately from the new invoice',async()=>{
 seed();const fields=['evidenceId','sourceRef','evidenceType','evidenceAsOfDate','paymentOrigin','paymentEvidenceType'];
 for(const [collection,id] of [['cobros','qa_cobro'],['recibosEsperados','qa_receipt']])for(const field of fields){
  const row=stored(collection,id);if(original===undefined)delete row[field];else row[field]=original;
 }
 const out=await call({amount:100.02,evidenceAsOfDate:'2026-11-24',sourceRef:'qa_application_source'});
 assert.equal(out.applicationState,'APPLIED_DIRECT');
 for(const [collection,id] of [['cobros','qa_cobro'],['recibosEsperados','qa_receipt']])for(const field of fields){
  const row=stored(collection,id);assert.equal(row[field],original,collection+':'+field);
  assert.equal(Object.hasOwn(row,field),original!==undefined,collection+':presence:'+field);
 }
 const row=stored('cobros','qa_cobro');assert.equal(row.monto,100);
 assert.equal(row.applicationEvidence.evidenceId,'qa_application_invoice');
 assert.equal(row.applicationEvidence.sourceRef,'qa_application_source');
 assert.equal(row.applicationEvidence.evidenceAsOfDate,'2026-11-24');
 assert.equal(stored('recibosEsperados','qa_receipt').monto,100);assert.equal(stored('carteraPrimas','qa_portfolio').monto,100);
});
test('unknown original method and support stay unknown while the application records the reported method and support',async()=>{
 seed();const fields=['paymentMethod','metodo','metodoPago','paymentSupportDocumentRef','soportePagoRef'];
 for(const [collection,id] of [['cobros','qa_cobro'],['recibosEsperados','qa_receipt']])for(const field of fields)delete stored(collection,id)[field];
 await call({amount:100.02,paymentMethod:'Método de la factura',paymentSupportDocumentRef:'qa_invoice_support'});
 for(const [collection,id] of [['cobros','qa_cobro'],['recibosEsperados','qa_receipt']])for(const field of fields)assert.equal(Object.hasOwn(stored(collection,id),field),false,collection+':'+field);
 const evidence=stored('cobros','qa_cobro').applicationEvidence;
 assert.equal(evidence.reportedPaymentMethod,'Método de la factura');assert.equal(evidence.reportedPaymentSupportDocumentRef,'qa_invoice_support');
});
test('original support present only as soportePagoRef cannot acquire a contradictory new canonical support',async()=>{
 seed();for(const [collection,id] of [['cobros','qa_cobro'],['recibosEsperados','qa_receipt']]){
  const row=stored(collection,id);delete row.paymentSupportDocumentRef;row.soportePagoRef='qa_original_payment_support';
 }
 await call({amount:100.02,paymentSupportDocumentRef:'qa_invoice_support'});
 for(const [collection,id] of [['cobros','qa_cobro'],['recibosEsperados','qa_receipt']]){
  const row=stored(collection,id);assert.equal(row.soportePagoRef,'qa_original_payment_support');assert.equal(Object.hasOwn(row,'paymentSupportDocumentRef'),false);
 }
 assert.equal(stored('cobros','qa_cobro').applicationEvidence.reportedPaymentSupportDocumentRef,'qa_invoice_support');
});
for(const collection of ['cobros','recibosEsperados'])test('existing contradictory support aliases in '+collection+' hold before any financial write',async()=>{
 seed();stored(collection,collection==='cobros'?'qa_cobro':'qa_receipt').soportePagoRef='qa_different_original_support';
 const before=finance();await assert.rejects(()=>call(),e=>e.message==='PAYMENT_FINANCIAL_IDENTITY_ALIASES_CONFLICT');assert.deepEqual(finance(),before);assert.equal(writeCount,0);
});
for(const [collection,id,field,value] of [
 ['recibosEsperados','qa_receipt','country','CO'],['recibosEsperados','qa_receipt','currency','USD'],
 ['recibosEsperados','qa_receipt','policyId','qa_other_policy'],['recibosEsperados','qa_receipt','clientId','qa_other_client'],
 ['polizas','qa_policy','country','CO'],['polizas','qa_policy','currency','USD'],['polizas','qa_policy','clientId','qa_other_client']
])test('legacy paid receipt without cobro or active portfolio cannot bypass '+collection+'.'+field+' identity aliases',async()=>{
 seed();documents.delete(item('cobros','qa_cobro'));documents.delete(item('carteraPrimas','qa_portfolio'));stored(collection,id)[field]=value;
 const before=finance();await assert.rejects(()=>call(),e=>e.message==='PAYMENT_FINANCIAL_IDENTITY_ALIASES_CONFLICT');
 assert.deepEqual(finance(),before);assert.equal(writeCount,0);assert.equal([...documents.keys()].some(p=>p.startsWith(item('cobros',''))),false);
});
test('valid legacy receipt without cobro or portfolio still creates one exact canonical payment with original facts',async()=>{
 seed();documents.delete(item('cobros','qa_cobro'));documents.delete(item('carteraPrimas','qa_portfolio'));
 const original=copy(stored('recibosEsperados','qa_receipt')),out=await call(),payment=stored('cobros',out.cobroId);
 assert.equal(payment.monto,100);assert.equal(payment.evidenceId,original.evidenceId);assert.equal(payment.paidDate,original.paidDate);
 assert.equal([...documents.keys()].filter(p=>p.startsWith(item('cobros',''))).length,1);assert.equal(out.portfolioUpdated,false);
});
for(const [collection,id,key,value] of [
 ['recibosEsperados','qa_receipt','primaTotal',100.02],['recibosEsperados','qa_receipt','montoTotal',101],
 ['carteraPrimas','qa_portfolio','montoTotal',101],['carteraPrimas','qa_portfolio','primaTotal',100.02],
 ['recibosEsperados','qa_receipt','monto',100.004],['carteraPrimas','qa_portfolio','monto',100.004],
 ['recibosEsperados','qa_receipt','monto',true],['carteraPrimas','qa_portfolio','monto',-1]
])test('contradictory or invalid '+collection+'.'+key+' amount holds for both existing and new payments',async()=>{
 for(const paid of [true,false]){
  seed({paid});stored(collection,id)[key]=value;const before=finance(),projection=actualProjection();
  await assert.rejects(()=>call(),e=>e.message==='PAYMENT_RECORDED_AMOUNT_ALIASES_CONFLICT');
  assert.deepEqual(finance(),before);assert.deepEqual(actualProjection(),projection);assert.equal(writeCount,0);
 }
});
test('saldo remains a balance and is not falsely treated as an alias of the original obligation total',async()=>{
 seed();stored('carteraPrimas','qa_portfolio').saldo=0;
 const out=await call({amount:100.02});assert.equal(out.applicationState,'APPLIED_DIRECT');assert.equal(stored('carteraPrimas','qa_portfolio').monto,100);assert.equal(stored('carteraPrimas','qa_portfolio').saldo,0);
});
test('explicit actual-date evidence may fill an unknown payment date while preserving unknown source facts',async()=>{
 seed();for(const [collection,id] of [['cobros','qa_cobro'],['recibosEsperados','qa_receipt']]){
  const row=stored(collection,id);for(const field of ['paidDate','fechaPago','sourceRef','evidenceId'])delete row[field];
 }
 await call({paidDate:'2026-07-16',actualPaidDateEvidence:true});
 for(const [collection,id] of [['cobros','qa_cobro'],['recibosEsperados','qa_receipt']]){
  const row=stored(collection,id);assert.equal(row.paidDate,'2026-07-16');assert.equal(row.fechaPago,'2026-07-16');assert.equal(Object.hasOwn(row,'sourceRef'),false);assert.equal(Object.hasOwn(row,'evidenceId'),false);
 }
 assert.equal(stored('cobros','qa_cobro').applicationEvidence.actualPaidDateEvidence,true);
});
test('alternate reconcile_evidence also keeps unknown original provenance separate from the application invoice',async()=>{
 seed();const fields=['evidenceId','sourceRef','evidenceType','evidenceAsOfDate','paymentMethod','metodo','metodoPago','paymentSupportDocumentRef','soportePagoRef'];
 for(const [collection,id] of [['cobros','qa_cobro'],['recibosEsperados','qa_receipt']])for(const field of fields)delete stored(collection,id)[field];
 const out=await command.run({auth:{uid:'direction',token:{}},data:{tenantId:tenant,activeRole:'Dirección',operation:'reconcile_evidence',reason:'Synthetic',payload:{policyId:'qa_policy',receiptId:'qa_receipt',evidenceType:'INVOICE_INSTALLMENT_N',evidenceId:'qa_later_invoice',evidenceAsOfDate:'2026-11-24',currency:'GTQ',amount:100,paymentMethod:'Método de factura',paymentSupportDocumentRef:'qa_invoice_support'}}});
 assert.equal(out.status,'AUTO_COMMITTED_HIGH_CONFIDENCE');
 for(const [collection,id] of [['cobros','qa_cobro'],['recibosEsperados','qa_receipt']])for(const field of fields)assert.equal(Object.hasOwn(stored(collection,id),field),false,collection+':'+field);
 const evidence=stored('cobros','qa_cobro').reconciliationEvidence;assert.equal(evidence.evidenceId,'qa_later_invoice');assert.equal(evidence.reportedPaymentMethod,'Método de factura');assert.equal(evidence.reportedPaymentSupportDocumentRef,'qa_invoice_support');
});
