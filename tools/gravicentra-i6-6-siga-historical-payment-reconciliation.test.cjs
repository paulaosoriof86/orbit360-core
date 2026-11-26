'use strict';
// Faithful imported-field shape with synthetic identities, isolated transactional
// memory and the actual callable/query owners. No Firebase or external writes.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const repo=process.env.SIGA_BASE_REPO||path.resolve(__dirname,'..');
const sourceRoot=process.env.SIGA_SOURCE_ROOT||repo;
const fromDomain=createRequire(path.join(repo,'functions/cobros-reconciliation-domain.js'));
const source=fs.readFileSync(path.join(sourceRoot,'functions/cobros-reconciliation-domain.js'),'utf8');
const copy=x=>x==null?x:structuredClone(x);
const bundle='f445e2f4a20b9eb7a526bda8896472dab9e7ac4617b3c5d8124a939a0dee0e6a';
const tenant='historical-payment-test',receiptId='receipt-historical',policyId='policy-historical',clientId='client-historical';
function harness({role='Dirección',countries=['GT']}={}){
 const documents=new Map(),writes=[];let failReadback=false;
 const item=(collection,id)=>`tenants/${tenant}/data/${collection}/items/${id}`;
 class Ref{
  constructor(parts,filters=[]){this.parts=parts;this.filters=filters;this.id=parts.at(-1);this.path=parts.join('/');}
  collection(k){return new Ref(this.parts.concat(k));}doc(k){return new Ref(this.parts.concat(k));}
  where(k,op,value){assert.equal(op,'==');return new Ref(this.parts,this.filters.concat([[k,value]]));}
  async get(){if(failReadback&&this.parts.includes('cobros')){failReadback=false;throw Error('SYNTHETIC_ACK_LOST');}return snapshot(this,documents);}
 }
 function snapshot(ref,map){
  if(ref.parts.length%2===0){const row=map.get(ref.path);return{exists:!!row,id:ref.id,ref,data:()=>copy(row)};}
  const getField=(row,key)=>key.split('.').reduce((v,k)=>v&&v[k],row);
  const docs=[...map.entries()].filter(([p,row])=>p.startsWith(ref.path+'/')&&p.split('/').length===ref.parts.length+1&&ref.filters.every(([k,v])=>getField(row,k)===v))
   .map(([p,row])=>({id:p.split('/').at(-1),ref:new Ref(p.split('/')),exists:true,data:()=>copy(row)}));
  return{docs,size:docs.length,empty:docs.length===0};
 }
 function legal(value,inArray=false){
  assert.notEqual(value,undefined,'undefined is not a Firestore value');
  if(value&&typeof value==='object'&&value.__timestamp===true)assert.equal(inArray,false,'server timestamp cannot be stored in array');
  if(Array.isArray(value))value.forEach(v=>legal(v,true));else if(value&&typeof value==='object')Object.values(value).forEach(v=>legal(v,inArray));
 }
 let tail=Promise.resolve();
 const db={collection:k=>new Ref([k]),runTransaction(fn){const pending=tail.then(async()=>{
  const staged=new Map([...documents].map(([p,row])=>[p,copy(row)])),delta=[];let writing=false;
  const out=await fn({get:async ref=>{assert.equal(writing,false,'reads before writes');return snapshot(ref,staged);},
   set:(ref,row,opts)=>{legal(row);writing=true;delta.push({path:ref.path,row:copy(row)});staged.set(ref.path,opts?.merge?{...staged.get(ref.path),...copy(row)}:copy(row));}});
  documents.clear();for(const [p,row] of staged)documents.set(p,row);writes.push(...delta);return out;
 });tail=pending.catch(()=>{});return pending;}};
 class HttpsError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details;}}
 const exports={};vm.runInNewContext(source,{exports,process:{env:{}},console,require:name=>
  name==='firebase-admin/app'?{getApps:()=>[{}],initializeApp:()=>({})}:
  name==='firebase-admin/firestore'?{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>({__timestamp:true})}}:
  name==='firebase-functions/v2/https'?{HttpsError,onCall:(_o,fn)=>fn}:fromDomain(name)});
 documents.set(`tenants/${tenant}/members/operator`,{uid:'operator',tenantId:tenant,status:'active',roles:[role],countries,dataScopes:{default:'all'}});
 const put=(c,id,row)=>documents.set(item(c,id),copy(row));
 const get=(c,id)=>documents.get(item(c,id));
 const all=c=>[...documents.entries()].filter(([p])=>p.startsWith(item(c,''))).map(([,r])=>copy(r));
 put('clientes',clientId,{id:clientId,tenantId:tenant,pais:'GT',moneda:'GTQ',asesorId:'advisor-historical'});
 put('polizas',policyId,{id:policyId,tenantId:tenant,clienteId:clientId,asesorId:'advisor-historical',aseguradoraId:'insurer-historical',
  pais:'GT',moneda:'GTQ',numero:'HISTORICAL-POLICY',primaTotal:5880,vigenciaInicio:'2025-11-25',vigenciaFin:'2026-11-25',
  estado:'Vigente',renovacionEstado:'Renovada',renovadaPor:'policy-renewed',importadorP0:true,cobroAplicado:false,carteraMaterializada:false,recibosMaterializados:false});
 put('recibosEsperados',receiptId,{id:receiptId,aseguradoraId:'insurer-historical',asesorId:'advisor-historical',clienteId:clientId,
  conductoPago:'Asegurado',descuento:0,enCartera:false,endoso:'',estadoOperativo:'pago_reportado',estadoVisual:'Pago reportado',
  exigibilidad:'no_pendiente',fechaCorteFuente:'2026-09-18',fechaLimite:'2025-11-25',fechaPagoReportada:'2026-01-05',
  formaPago:'Depósito',frecuencia:'Pago Único',fuenteAutoridad:'SIGA',gastosExpedicion:250,gastosFinanciamiento:0,impuestosIVA:630,
  matchQuality:'I6_5_EXACT_POLICY_TERM',moneda:'GTQ',motivosCalidad:'I6_5_20260918_EXACT_POLICY_TERM_SOURCE_RECONCILIATION',
  numeroReciboFuente:'',polizaId:policyId,polizaNumero:'HISTORICAL-POLICY',primaNeta:5000,primaTotal:5880,requiereValidacion:false,serie:'1/1',
  sourceBundleSha256:bundle,sourceRef:'Cobranza Efectuada desde 2024.xlsx',sourceRefsI65:[
   'CobranzaCendoso (24).xlsx#row982','CobranzaCendoso (25).xlsx#row841','CobranzaCendoso (28).xlsx#row1570','Reporte-2026-09-18-061226.xlsx#row646'],
  vigenciaFin:'2026-11-25',vigenciaInicio:'2025-11-25'});
 const call=(payload={},operation='reconcile_payment',requestId='historical-reconciliation')=>exports.orbit360CobrosReconciliationCommand({auth:{uid:'operator',token:{}},data:{tenantId:tenant,activeRole:role,operation,requestId,
  reason:'Historical payment application',payload:{receiptId,paymentOriginSource:'insurer_invoice',applicationDate:'2026-01-05',invoiceDate:'2026-01-05',invoiceNumber:'INVOICE-HISTORICAL',paidDate:'2026-01-05',amount:5880,...payload}}});
 const edit=async payload=>{
  const operational={};
  vm.runInNewContext(fs.readFileSync(path.join(repo,'functions/product-operational-domain.js'),'utf8'),{exports:operational,process:{env:{}},console,Buffer,require:name=>
   name==='firebase-admin/app'?{getApps:()=>[{}],initializeApp:()=>({})}:
   name==='firebase-admin/firestore'?{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>({__timestamp:true})}}:
   name==='firebase-admin/storage'?{getStorage:()=>({})}:
   name==='firebase-functions/v2/https'?{HttpsError,onCall:(_o,fn)=>fn}:fromDomain(name)});
  return operational.orbit360ProductOperationalCommand({auth:{uid:'operator',token:{}},data:{tenantId:tenant,activeRole:role,
   mutations:[{collection:'recibosEsperados',action:'update',id:receiptId,payload}]}});
 };
 const readCommit=(pdf,requestId='historical-reconciliation')=>exports.orbit360CobrosReconciliationCommand({auth:{uid:'operator',token:{}},data:{tenantId:tenant,activeRole:role,operation:'read_payment_document_commit',requestId,
  payload:{receiptId,originalOperation:'reconcile_payment',invoiceDocumentRef:pdf}}});
 const projection=()=>{
  const Orbit={pais:'GT',ui:{now:()=>new Date('2026-11-25T12:00:00Z'),today:()=> '2026-11-25'},store:{all,get,where:(c,p)=>all(c).filter(p),find:(c,p)=>all(c).find(p)}};
  vm.runInNewContext(fs.readFileSync(path.join(repo,'orbit360-platform/core/queries.js'),'utf8'),{Orbit,window:{Orbit}});
  const ui=fs.readFileSync(path.join(repo,'orbit360-platform/modules/cobros.js'),'utf8');
  const a=ui.indexOf('  function paymentOriginKind('),b=ui.indexOf('  function reportedRows(',a);assert.ok(a>=0&&b>a);
  const context={Orbit,S:()=>Orbit.store,countryMatches:()=>true,rowCountry:row=>row.pais||'GT'};vm.createContext(context);vm.runInContext(ui.slice(a,b),context);
  const readRows=context.visibleFinancialRows(true),virtual=context.receiptPaymentEvidence({},readRows);
  return{current:copy(Orbit.q.recaudoMesPorMoneda('2026-11')),historical:copy(Orbit.q.recaudoMesPorMoneda('2026-01')),
   confirmed:copy(Orbit.q.cobrosConfirmadosRows()),realized:copy(Orbit.q.realizedPaymentRows()),visiblePaymentRows:readRows.cobros.length+virtual.length};
 };
 return{documents,writes,put,get,all,item,call,edit,readCommit,projection,loseReadback:()=>{failReadback=true;}};
}

for(const pdf of ['', 'document:confirmed-historical-invoice'])test('historical primary evidence reconciles once '+(pdf?'with PDF':'without PDF')+' and preserves raw provenance',async()=>{
 const h=harness(),original=copy(h.get('recibosEsperados',receiptId)),policy=copy(h.get('polizas',policyId)),before=h.projection();
 assert.equal(before.visiblePaymentRows,1);assert.equal(before.confirmed.length,0);assert.deepEqual(before.current,{});
 const out=await h.call({invoiceDocumentRef:pdf}),receipt=h.get('recibosEsperados',receiptId),payment=h.get('cobros',out.cobroId);
 assert.equal(out.ok,true);assert.equal(out.operation,'reconcile_payment');assert.equal(out.historicalPaymentLinked,true);
 assert.equal(payment.monto,5880);assert.equal(payment.paidDate,'2026-01-05');assert.equal(payment.fechaPago,'2026-01-05');
 assert.equal(payment.paymentOrigin,'CRM_MIGRATED_DIRECT_PAYMENT');assert.equal(payment.paymentState,'PAID_DIRECT');
 assert.equal(payment.paymentEvidenceType,'CRM_MIGRATED_DIRECT');assert.equal(payment.directOrInferred,'DIRECT');
 assert.equal(payment.applicationDate,'2026-01-05');assert.equal(payment.invoiceDate,'2026-01-05');
 assert.equal(payment.invoiceNumber,'INVOICE-HISTORICAL');assert.equal(payment.applicationEvidence.sourceType,'insurer_invoice');
 assert.equal(payment.applicationEvidence.invoiceDocumentRef,pdf);assert.equal(payment.historicalPaymentEvidence.sourceBundleSha256,bundle);
 assert.equal(payment.sourceRef,original.sourceRef);assert.equal(payment.paymentMethod,'Depósito');
 for(const key of ['fechaPagoReportada','fechaCorteFuente','sourceBundleSha256','sourceRef','sourceRefsI65','matchQuality','motivosCalidad','primaTotal','primaNeta','formaPago','vigenciaInicio','vigenciaFin','serie'])
  assert.deepEqual(receipt[key],original[key],key);
 assert.equal(receipt.estadoOperativo,'pagado');assert.equal(receipt.paymentState,'PAID_DIRECT');
 assert.deepEqual(h.get('polizas',policyId),policy);assert.equal(h.all('carteraPrimas').length,0);assert.equal(h.all('finmovs').length,0);
 assert.ok(h.writes.every(w=>!/(polizas|clientes|carteraPrimas|finmovs|comisiones)\/items\//.test(w.path)));
 const after=h.projection();assert.equal(after.visiblePaymentRows,1);assert.equal(after.confirmed.length,1);assert.equal(after.realized.length,1);
 assert.deepEqual(after.current,before.current);assert.deepEqual(after.historical,{GTQ:5880});
 const count=h.writes.length;assert.equal((await h.call({invoiceDocumentRef:pdf})).reused,true);assert.equal(h.writes.length,count);
 if(pdf){const beforeRead=h.writes.length;assert.equal((await h.readCommit(pdf)).confirmed,true);assert.equal(h.writes.length,beforeRead,'Work documentary recovery remains read-only');}
});

test('reload/new request enriches the same historic cobro without new current-month revenue or projection duplication',async()=>{
 const h=harness();const first=await h.call();
 const second=await h.call({applicationDate:'2026-11-25',invoiceDate:'2026-11-25',invoiceNumber:'INVOICE-LATER'},'reconcile_payment','after-reload');
 assert.equal(second.cobroId,first.cobroId);assert.equal(h.all('cobros').length,1);
 assert.equal(h.get('cobros',first.cobroId).paidDate,'2026-01-05');assert.deepEqual(h.projection().current,{});
 assert.deepEqual(h.projection().historical,{GTQ:5880});assert.equal(h.projection().visiblePaymentRows,1);
 const before=copy([...h.documents]);await assert.rejects(()=>h.call({sourceType:'manual'},'apply_payment','do-not-pay-again'),e=>e.code==='failed-precondition');
 assert.deepEqual([...h.documents],before);
});

test('an ordinary apply_payment cannot treat historical primary evidence as a new deposit, even with an active portfolio',async()=>{
 const h=harness();h.put('carteraPrimas','active-obligation',{id:'active-obligation',tenantId:tenant,polizaId:policyId,clienteId:clientId,reciboId:receiptId,pais:'GT',moneda:'GTQ',monto:5880,carteraActiva:true,estado:'Pendiente'});
 const before=copy([...h.documents]);await assert.rejects(()=>h.call({sourceType:'manual',paymentOriginSource:'manual'},'apply_payment'),e=>e.code==='failed-precondition');
 assert.equal(h.writes.length,0);assert.deepEqual([...h.documents],before);
});

const invalid=[
 ['source only',r=>{delete r.sourceBundleSha256;delete r.sourceRefsI65;}],
 ['unadmitted bundle',r=>{r.sourceBundleSha256='a'.repeat(64);}],
 ['admitted hash with an invalid suffix',r=>{r.sourceBundleSha256=bundle+'-unverified';}],
 ['schedule not payment',r=>{r.sourceRefsI65=['CobranzaCendoso (28).xlsx#row982'];}],
 ['corroboration without primary',r=>{r.sourceRefsI65=['CobranzaCendoso (25).xlsx#row841'];}],
 ['report crosscheck not payment',r=>{r.sourceRefsI65=['Reporte-2026-09-18-061226.xlsx#row646'];}],
 ['bad primary reference',r=>{r.sourceRefsI65=['CobranzaCendoso (24).xlsx#row0'];}],
 ['header row is not a payment',r=>{r.sourceRefsI65=['CobranzaCendoso (24).xlsx#row10'];}],
 ['row outside verified worksheet',r=>{r.sourceRefsI65=['CobranzaCendoso (24).xlsx#row1570'];}],
 ['composite forged row reference',r=>{r.sourceRefsI65=['CobranzaCendoso (24).xlsx#row11/other#row982'];}],
 ['ambiguous primary references',r=>{r.sourceRefsI65.push('CobranzaCendoso (24).xlsx#row983');}],
 ['pending validation',r=>{r.requiereValidacion=true;}],
 ['nonexact edition',r=>{r.matchQuality='PROBABLE';}],
 ['different policy term',r=>{r.vigenciaInicio='2025-11-26';}],
 ['different insurer',r=>{r.aseguradoraId='other-insurer';}],
 ['different policy number',r=>{r.polizaNumero='other-number';}],
 ['missing paid date',r=>{delete r.fechaPagoReportada;}],
 ['invalid calendar paid date',r=>{r.fechaPagoReportada='2026-02-30';}],
 ['paid date outside authority',r=>{r.fechaPagoReportada='2026-11-25';}],
 ['different source cutoff',r=>{r.fechaCorteFuente='2026-11-25';}],
 ['partial payment',r=>{r.partialPayment=true;}],
 ['reversed evidence',r=>{r.reversal=true;}],
 ['conflicting evidence',r=>{r.conflictingEvidence=true;}],
 ['inferred evidence',r=>{r.inferredPaid=true;}],
 ['open collection marker',r=>{r.enCartera=true;}],
 ['existing unresolved cobro link',r=>{r.cobroId='other-cobro';}],
 ['conflicting payment dates',r=>{r.paidDate='2026-02-05';}],
 ['conflicting original provenance',r=>{r.paymentOrigin='CLIENT_PORTAL';}],
 ['conflicting original evidence',r=>{r.evidenceId='other-evidence';}],
 ['conflicting original method',r=>{r.metodoPago='other-method';}],
 ['conflicting amount alias',r=>{r.monto=5000;}],
 ['conflicting currency',r=>{r.moneda='USD';}],
 ['different tenant',r=>{r.tenantId='other-tenant';}],
 ['different client',r=>{r.clienteId='other-client';}],
 ['null receipt edit timestamp',r=>{r.updatedAt=null;}],
 ['empty receipt editor marker',r=>{r.updatedByUid='';}]
];
for(const [label,change] of invalid)test('unproved or contradictory historical record is held: '+label,async()=>{
 const h=harness();change(h.get('recibosEsperados',receiptId));const before=copy([...h.documents]);
 await assert.rejects(()=>h.call(),e=>e.code==='failed-precondition');assert.equal(h.writes.length,0);assert.deepEqual([...h.documents],before);
});

for(const [label,payload] of [['different reported paid date',{paidDate:'2026-11-25',actualPaidDateEvidence:true}],['no application date',{applicationDate:''}],['no invoice number',{invoiceNumber:''}],['different amount',{amount:5880.01}],['different currency',{currency:'USD'}]])
 test('documentary input cannot override historical proof: '+label,async()=>{const h=harness(),before=copy([...h.documents]);await assert.rejects(()=>h.call(payload),e=>e.code==='failed-precondition');assert.equal(h.writes.length,0);assert.deepEqual([...h.documents],before);});

test('untrusted payload cannot supply missing historical source evidence',async()=>{
 const h=harness();delete h.get('recibosEsperados',receiptId).sourceBundleSha256;
 await assert.rejects(()=>h.call({sourceBundleSha256:bundle,sourceRefsI65:['CobranzaCendoso (24).xlsx#row982']}));assert.equal(h.writes.length,0);
});

for(const role of ['Dirección','Operativo'])test('signed operational role is accepted only for authorized country: '+role,async()=>{
 const allowed=harness({role});assert.equal((await allowed.call()).ok,true);
 const denied=harness({role,countries:['CO']});await assert.rejects(()=>denied.call(),e=>e.code==='permission-denied');assert.equal(denied.writes.length,0);
});

for(const role of ['Dirección','Operativo'])for(const change of [
 {label:'amount',patch:{primaTotal:6000},payment:{amount:6000}},
 {label:'actual paid date',patch:{fechaPagoReportada:'2026-02-05'},payment:{paidDate:'2026-02-05'}}
])test(role+' ordinary receipt '+change.label+' correction stays editable but cannot reuse imported historical proof',async()=>{
 const h=harness({role}),receipt=h.get('recibosEsperados',receiptId);
 // This separate permitted-country import variant exercises the actual
 // generic writer; the observed Rural record has no country or edit marks.
 receipt.pais='GT';
 const primary=copy(receipt.sourceRefsI65),sourceBundle=receipt.sourceBundleSha256;
 const updated=await h.edit({...change.patch,updatedAt:null,updatedByUid:null});
 assert.equal(updated.canonicalReadback,true,'ordinary correction is still permitted');
 const corrected=h.get('recibosEsperados',receiptId);
 for(const [key,value] of Object.entries(change.patch))assert.equal(corrected[key],value);
 assert.equal(corrected.updatedAt.__timestamp,true,'writer overwrites client-supplied null timestamp');
 assert.equal(corrected.updatedByUid,'operator','writer overwrites client-supplied null editor');
 assert.deepEqual(corrected.sourceRefsI65,primary);assert.equal(corrected.sourceBundleSha256,sourceBundle);
 const before=copy([...h.documents]),count=h.writes.length;
 await assert.rejects(()=>h.call(change.payment),e=>e.code==='failed-precondition'&&e.message==='PAYMENT_SIGA_HISTORICAL_PROOF_REQUIRED');
 assert.equal(h.writes.length,count,'reconciliation makes no further writes');assert.deepEqual([...h.documents],before);
 assert.equal(h.all('cobros').length,0);assert.equal(h.all('finmovs').length,0);assert.equal(h.all('carteraPrimas').length,0);
});

test('an existing payment under an alternate receipt alias cannot be duplicated by the historical bridge',async()=>{
 const h=harness();h.put('cobros','existing-alias',{id:'existing-alias',tenantId:tenant,receiptId,polizaId:policyId,clienteId:clientId,pais:'GT',moneda:'GTQ',monto:5880,estado:'Pagado'});
 await assert.rejects(()=>h.call(),e=>e.code==='failed-precondition');assert.equal(h.writes.length,0);assert.equal(h.all('cobros').length,1);
});

test('two concurrent documentary submissions materialize one historical cobro and one realized payment',async()=>{
 const h=harness();const out=await Promise.all([h.call({},'reconcile_payment','parallel-one'),h.call({},'reconcile_payment','parallel-two')]);
 assert.equal(out[0].cobroId,out[1].cobroId);assert.equal(h.all('cobros').length,1);assert.equal(h.projection().realized.length,1);assert.deepEqual(h.projection().current,{});
});

for(const row of [11,1569])test('real worksheet boundaries include source data row '+row+' without truncating the last ten payments',async()=>{
 const h=harness();h.get('recibosEsperados',receiptId).sourceRefsI65=['CobranzaCendoso (24).xlsx#row'+row];
 assert.equal((await h.call()).historicalPaymentLinked,true);assert.equal(h.all('cobros').length,1);
});

test('source primary reference cannot be linked again through a different imported receipt ID',async()=>{
 const h=harness(),original=copy(h.get('recibosEsperados',receiptId));await h.call();
 h.put('recibosEsperados','receipt-duplicate',{...original,id:'receipt-duplicate'});const count=h.writes.length;
 await assert.rejects(()=>h.call({receiptId:'receipt-duplicate'},'reconcile_payment','different-receipt'),e=>e.code==='failed-precondition');
 assert.equal(h.writes.length,count);assert.equal(h.all('cobros').length,1);
});

test('omitting paidDate uses the verified historical date without borrowing invoice/application dates',async()=>{
 const h=harness();const out=await h.call({paidDate:'',applicationDate:'2026-11-25',invoiceDate:'2026-11-25'});
 assert.equal(out.paidDate,'2026-01-05');assert.equal(h.get('cobros',out.cobroId).fechaPago,'2026-01-05');
 assert.deepEqual(h.projection().current,{});assert.deepEqual(h.projection().historical,{GTQ:5880});
});
