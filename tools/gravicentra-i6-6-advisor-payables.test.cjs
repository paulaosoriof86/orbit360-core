'use strict';
// Local, synthetic-only domain/transport/UI tests. No network or Firestore SDK.
// Beneficiaries, source references and monetary examples below are independently invented QA fixtures.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),contract=require('../functions/advisor-commission-payable-contract');
const clone=value=>JSON.parse(JSON.stringify(value));
const fixture=(extra={})=>({polizaId:'policy-alpha',source:{fileId:'statement-october',lineId:'Sheet1:14',requirementRef:'REQ-QA-ALPHA-001',sha256:'a'.repeat(64),reference:'https://example.invalid/statement-october'},ordinaryCommission:42.37,commissionKind:'ordinary',accreditation:{status:'accredited',date:'2026-10-31'},collectionPeriod:'2026-10',moneda:'GTQ',participation:{pct:70,authorityRef:'owner-decision-20261107'},...extra});
const context=(extra={})=>({tenantId:'tenant-test',advisor:{id:'advisor-alpha',nombre:'Asesor QA Alfa',shareCom:70,comModo:'comision'},policy:{id:'policy-alpha',asesorId:'advisor-alpha',clienteId:'client-test',pais:'GT',moneda:'GTQ',numero:'AUTO-QA-ALPHA-001',aseguradoraId:'insurer-test'},cutoff:'2026-11-15',...extra});
function env({role='Dirección',countries=['GT'],scope='todos'}={}){
  const tenant='tenant-test',uid='actor-test',rows=new Map(),writes=[];
  const ref=(collection,id)=>`tenants/${tenant}/data/${collection}/items/${id}`;
  rows.set(`tenants/${tenant}/members/${uid}`,{tenantId:tenant,status:'active',roles:[role],activeRole:role,advisorId:'advisor-owner',countries,dataScopes:{default:scope}});
  rows.set(`tenants/${tenant}/config/access`,{roleScopes:{[role]:scope},rolePermissions:{[role]:{comisiones:{ver:true,editar:true},conciliaciones:{ver:true,editar:true},polizas:{ver:true,editar:true}}}});
  rows.set(ref('asesores','advisor-alpha'),context().advisor);rows.set(ref('polizas','policy-alpha'),context().policy);
  rows.set(ref('clientes','client-test'),{id:'client-test',tenantId:tenant,pais:'GT',nombre:'Cliente sintético'});
  rows.set(ref('asesores','advisor-beta'),{id:'advisor-beta',nombre:'Asesor QA Beta',shareCom:60,comModo:'comision'});
  rows.set(ref('polizas','policy-beta'),{...context().policy,id:'policy-beta',asesorId:'advisor-beta'});
  const snapshot=p=>({id:p.split('/').pop(),exists:rows.has(p),data:()=>clone(rows.get(p)||{})});
  class Ref{
    constructor(p,query=false,conditions=[]){this.p=p;this.query=query;this.conditions=conditions;}
    collection(k){return new Ref(this.p+'/'+k,true);}doc(k){return new Ref(this.p+'/'+k);}where(...c){return new Ref(this.p,true,[...this.conditions,c]);}limit(){return this;}orderBy(){return this;}
    async get(){if(!this.query)return snapshot(this.p);const docs=[...rows.keys()].filter(p=>p.startsWith(this.p+'/')&&!p.slice(this.p.length+1).includes('/')).map(snapshot).filter(s=>this.conditions.every(([k,op,v])=>op==='=='&&s.data()[k]===v));return{docs,empty:!docs.length};}
  }
  const db={collection:k=>new Ref(k,true),async runTransaction(fn){const pending=[];let writing=false;const tx={async get(r){if(writing)throw Error('READ_AFTER_WRITE');return r.get();},set(r,row,options){writing=true;pending.push({p:r.p,row:clone(row),merge:options?.merge});},delete(r){writing=true;pending.push({p:r.p,remove:true});}};const result=await fn(tx);for(const write of pending){if(write.remove)rows.delete(write.p);else rows.set(write.p,write.merge?{...rows.get(write.p),...write.row}:write.row);writes.push(write);}return result;}};
  class HttpsError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details;}}
  const cache={};function load(name){const file=path.resolve(root,'functions',name.endsWith('.js')?name:name+'.js');if(cache[file])return cache[file].exports;const module={exports:{}};cache[file]=module;
    const requireMock=name=>{if(name.startsWith('.'))return load(name);if(name==='node:crypto')return crypto;if(name==='firebase-admin/app')return{getApps:()=>[{}],initializeApp:()=>({})};if(name==='firebase-admin/firestore')return{getFirestore:()=>db,FieldValue:{serverTimestamp:()=> 'TEST_TIMESTAMP'}};if(name==='firebase-admin/storage')return{getStorage:()=>({})};if(name==='firebase-functions/v2/https')return{HttpsError,onCall:(_options,handler)=>handler};throw Error('UNEXPECTED_IMPORT:'+name);};
    vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,require:requireMock,Buffer,console,process:{env:{}}},{filename:file});return module.exports;
  }
  const mod=load('product-operational-domain');
  const send=(spec,extra={})=>mod.orbit360ProductOperationalCommand({auth:{uid,token:{}},data:{tenantId:tenant,activeRole:role,advisorPayable:{version:1,operation:'preview',advisorId:'advisor-alpha',cutoff:'2026-11-15',lines:[fixture()],...spec},...extra}});
  const generic=mutations=>mod.orbit360ProductOperationalCommand({auth:{uid,token:{}},data:{tenantId:tenant,activeRole:role,mutations}});
  const prepare=async(spec={})=>{const preview=await send(spec);return send({...spec,operation:'prepare',previewDigest:preview.previewDigest});};
  return{tenant,uid,rows,writes,ref,send,prepare,generic,mod};
}
test('commission amount is ordinary insurer credit × explicit advisor participation, in cents',()=>{
  const row=contract.normalizeLine(fixture(),context()).payable;assert.equal(row.valor,29.66);assert.equal(row.comisionOrdinariaAcreditada,42.37);assert.equal(row.pendiente,29.66);assert.equal(row.pagada,false);assert.equal(row.estado,'pendiente');assert.equal(row.noBankMovement,true);
});
test('synthetic ordinary credits total Q79.67 without using premium/IVA or rounding to whole quetzales',()=>{
  const c=context();c.advisor.shareCom=60;const values=[43.19,7.13,82.47].map((amount,i)=>contract.normalizeLine(fixture({ordinaryCommission:amount,source:{...fixture().source,lineId:'Sheet1:'+i},participation:{pct:60,authorityRef:'owner-explicit'}}),c).payable.valor);assert.equal(Math.round(values.reduce((a,b)=>a+b,0)*100)/100,79.67);
});
test('cutoff change does not change source-line payable identity or financial digest',()=>{
  const first=contract.normalizeLine(fixture(),context()),second=contract.normalizeLine(fixture(),context({cutoff:'2026-12-15'}));assert.equal(first.payable.id,second.payable.id);assert.equal(first.financialDigest,second.financialDigest);assert.notEqual(first.payable.fechaCorte,second.payable.fechaCorte);
});
test('missing participation never uses historical 50% default',()=>{const c=context();delete c.advisor.shareCom;assert.throws(()=>contract.normalizeLine(fixture({participation:null}),c),{code:'PARTICIPATION_REQUIRED'});});
test('paid/accredited accepted without a bank reference; pending rejected',()=>{assert.ok(contract.normalizeLine(fixture(),context()));assert.ok(contract.normalizeLine(fixture({accreditation:{status:'paid',date:'2026-10-31'}}),context()));assert.throws(()=>contract.normalizeLine(fixture({accreditation:{status:'pending',date:'2026-10-31'}}),context()),{code:'COMMISSION_NOT_ACCREDITED'});});
test('cross-advisor exact policy assignment is rejected',()=>{assert.throws(()=>contract.normalizeLine(fixture(),context({policy:{...context().policy,asesorId:'advisor-beta'}})),{code:'ADVISOR_POLICY_CONFLICT'});});
test('future/invalid credit date, currency mismatch, negative money, nonordinary amounts rejected',()=>{
  for(const [line,code] of [[{accreditation:{status:'accredited',date:'2026-11-20'}},'ACCREDITATION_AFTER_CUTOFF'],[{accreditation:{status:'accredited',date:'2026-02-30'}},'INVALID_DATE'],[{moneda:'USD'},'POLICY_CURRENCY_CONFLICT'],[{ordinaryCommission:-10},'INVALID_AMOUNT'],[{commissionKind:'incentive'},'ORDINARY_COMMISSION_REQUIRED']])assert.throws(()=>contract.normalizeLine(fixture(line),context()),{code});
});
test('preview is server-calculated and performs zero writes',async()=>{const e=env(),r=await e.send({});assert.equal(r.readOnly,true);assert.equal(r.totals.GTQ,29.66);assert.equal(e.writes.length,0);});
test('declared source provenance cannot claim remote document authentication',()=>{
  const r=contract.normalizeLine(fixture({sourceProvenance:{kind:'SERVER_AUTHENTICATED',documentAuthenticatedByServer:true}}),context());
  assert.equal(r.payable.sourceProvenance.kind,'DIRECTION_DECLARED_DOCUMENTED_IMPORT');assert.equal(r.payable.sourceProvenance.documentAuthenticatedByServer,false);
  assert.deepEqual(r.commission.sourceProvenance,r.payable.sourceProvenance);assert.equal(r.payable.valor,29.66);
});
test('canonical replay retains original declared-document provenance and distinguishes its input path',async()=>{
  const e=env(),first=await e.prepare();assert.equal(first.sourceInputMode,'DIRECTION_DECLARED_DOCUMENTED_IMPORT');
  const again=await e.prepare({lines:[],commissionIds:[first.payables[0].comisionId]});
  assert.equal(again.sourceInputMode,'CANONICAL_COMMISSION_RECORDS');assert.equal(again.payables[0].sourceProvenance.kind,'DIRECTION_DECLARED_DOCUMENTED_IMPORT');
  assert.equal(again.payables[0].sourceProvenance.documentAuthenticatedByServer,false);assert.equal(again.newPayables,0);
});
test('creation atomically records source commission + pending CxP + audit, with canonical readback',async()=>{const e=env(),r=await e.prepare();assert.equal(r.canonicalReadback,true);assert.equal(r.financialPayments,0);assert.equal(r.bankMovements,0);assert.equal(r.newPayables,1);const p=e.rows.get(e.ref('finmovs',r.payables[0].id)),c=e.rows.get(e.ref('comisiones',p.comisionId));assert.equal(p.estado,'pendiente');assert.equal(p.pagado,0);assert.equal(c.estado,'Devengada');assert.equal(c.monto,42.37);assert.equal(c.montoAsesor,29.66);assert.equal(e.writes.length,4);});
test('prepare without exact preview digest writes nothing',async()=>{const e=env();await assert.rejects(e.send({operation:'prepare',previewDigest:'wrong'}),error=>error.code==='failed-precondition');assert.equal(e.writes.length,0);});
test('retry is idempotent and another cutoff cannot create another CxP',async()=>{const e=env(),first=await e.prepare(),count=e.writes.length,again=await e.prepare();assert.equal(again.reused,true);assert.equal(e.writes.length,count);const next=await e.prepare({cutoff:'2026-12-15'});assert.equal(next.newPayables,0);assert.equal(next.reusedPayables,1);assert.equal(next.payables[0].id,first.payables[0].id);assert.equal([...e.rows.keys()].filter(k=>k.includes('/finmovs/items/')).length,1);});
test('idempotent replay reports zero new debt instead of the original creation count',async()=>{const e=env();await e.prepare();const replay=await e.prepare();assert.equal(replay.newPayables,0);assert.equal(replay.reusedPayables,1);assert.equal(replay.totals.GTQ,0);});
test('changed amount on existing source cannot overwrite/duplicate the debt',async()=>{const e=env();await e.prepare();const count=e.writes.length;await assert.rejects(e.send({lines:[fixture({ordinaryCommission:30})]}),error=>error.details?.reason==='SOURCE_LINE_ALREADY_INTERPRETED');assert.equal(e.writes.length,count);});
test('out-of-band amount corruption cannot reuse a retained financial digest',async()=>{for(const collection of ['finmovs','comisiones']){const e=env(),r=await e.prepare(),row=r.payables[0],key=e.ref(collection,collection==='finmovs'?row.id:row.comisionId);e.rows.set(key,{...e.rows.get(key),[collection==='finmovs'?'valor':'monto']:1});const count=e.writes.length;await assert.rejects(e.send({}),error=>['PAYABLE_SOURCE_CONFLICT','COMMISSION_SOURCE_CONFLICT'].includes(error.details?.reason));assert.equal(e.writes.length,count);}});
test('canonical source IDs can re-open existing payable without another insertion',async()=>{const e=env(),first=await e.prepare(),commissionId=first.payables[0].comisionId,r=await e.prepare({lines:[],commissionIds:[commissionId]});assert.equal(r.reusedPayables,1);assert.equal(r.newPayables,0);});
test('mixed good/bad sources abort the whole batch',async()=>{const e=env();await assert.rejects(e.prepare({lines:[fixture(),fixture({polizaId:'policy-beta',source:{...fixture().source,lineId:'Sheet1:15'}})]}),error=>error.details?.reason==='ADVISOR_POLICY_CONFLICT');assert.equal(e.writes.length,0);});
test('same source line twice in a batch is rejected',async()=>{const e=env();await assert.rejects(e.send({lines:[fixture(),fixture()]}),error=>error.code==='invalid-argument');assert.equal(e.writes.length,0);});
test('copy of same credited statement under another file ID reuses the economic CxP',async()=>{const e=env(),first=await e.prepare(),copy=await e.prepare({lines:[fixture({source:{...fixture().source,fileId:'statement-copy'}})]});assert.equal(copy.newPayables,0);assert.equal(copy.payables[0].id,first.payables[0].id);assert.equal([...e.rows.keys()].filter(k=>k.includes('/finmovs/items/')).length,1);});
test('one source line cannot be reinterpreted as another policy or collection period across commands',async()=>{for(const change of [{polizaId:'policy-second'},{collectionPeriod:'2026-09'}]){const e=env();e.rows.set(e.ref('polizas','policy-second'),{...context().policy,id:'policy-second'});await e.prepare();const count=e.writes.length;await assert.rejects(e.prepare({lines:[fixture(change)]}),error=>error.details?.reason==='SOURCE_LINE_ALREADY_INTERPRETED');assert.equal(e.writes.length,count);}});
test('one source line cannot generate two economic CxP within the same transaction',async()=>{for(const change of [{polizaId:'policy-second'},{collectionPeriod:'2026-09'}]){const e=env();e.rows.set(e.ref('polizas','policy-second'),{...context().policy,id:'policy-second'});await assert.rejects(e.prepare({lines:[fixture(),fixture(change)]}),error=>error.details?.reason==='SOURCE_LINE_ALREADY_INTERPRETED');assert.equal(e.writes.length,0);}});
test('same exact policy requirement cannot become another debt by changing document and collection period',async()=>{const e=env();await e.prepare();const count=e.writes.length;await assert.rejects(e.prepare({lines:[fixture({collectionPeriod:'2026-09',source:{...fixture().source,fileId:'different-statement',lineId:'row-other',sha256:'b'.repeat(64)}})]}),error=>error.details?.reason==='REQUIREMENT_ALREADY_INTERPRETED');assert.equal(e.writes.length,count);});
test('supplied line cannot choose a commission document ID',async()=>{const e=env();await assert.rejects(e.send({lines:[fixture({commissionId:'forged-id'})]}),error=>error.code==='invalid-argument');assert.equal(e.writes.length,0);});
test('idempotent replay revalidates reduced country access',async()=>{const e=env();await e.prepare();const k=`tenants/${e.tenant}/members/${e.uid}`;e.rows.set(k,{...e.rows.get(k),countries:['CO']});await assert.rejects(e.prepare(),error=>error.code==='permission-denied');});
test('historical paid advisor commission from same period blocks double payable with exact IDs',async()=>{const e=env();e.rows.set(e.ref('finmovs','old-paid'),{id:'old-paid',pais:'GT',moneda:'GTQ',asesorId:'advisor-alpha',clase:'Comisiones asesores',estado:'pagado',periodo:'2026-10',valor:29.66});await assert.rejects(e.prepare(),error=>error.details?.reason==='HISTORICAL_ADVISOR_BALANCE_LINK_REQUIRED'&&error.details.movements[0].id==='old-paid');assert.equal(e.writes.length,0);});
test('unrelated historical period and another advisor do not block this payable',async()=>{const e=env();e.rows.set(e.ref('finmovs','other-old-paid'),{id:'other-old-paid',pais:'GT',moneda:'GTQ',asesorId:'advisor-alpha',clase:'Comisiones asesores',estado:'pagado',periodo:'2026-08',valor:29.66});e.rows.set(e.ref('finmovs','beta-cxp'),{id:'beta-cxp',pais:'GT',moneda:'GTQ',asesorId:'advisor-beta',clase:'Comisiones asesores',estado:'pendiente',periodo:'2026-10',valor:500});assert.equal((await e.prepare()).newPayables,1);});
test('existing historic commission is not reimported for same policy/requirement/period',async()=>{const e=env();e.rows.set(e.ref('comisiones','old-commission'),{id:'old-commission',polizaId:'policy-alpha',periodo:'2026-10',requerimiento:'REQ-QA-ALPHA-001',monto:42.37});await assert.rejects(e.prepare(),error=>error.details?.reason==='HISTORICAL_COMMISSION_LINK_REQUIRED');assert.equal(e.writes.length,0);});
test('source assignment conflict never silently rewrites the policy advisor',async()=>{const e=env();await assert.rejects(e.send({advisorId:'advisor-beta'}),error=>error.details?.reason==='ADVISOR_POLICY_CONFLICT');assert.equal(e.rows.get(e.ref('polizas','policy-alpha')).asesorId,'advisor-alpha');assert.equal(e.writes.length,0);});
test('Operativo and Asesor do not receive financial write merely from visible commission module',async()=>{for(const role of ['Operativo','Asesor']){const e=env({role});await assert.rejects(e.prepare(),error=>error.code==='permission-denied');assert.equal(e.writes.length,0);}});
test('authorized administrative hierarchy retains preparation access',async()=>{for(const role of ['Dirección','Admin','AdminTenant','SuperAdmin']){const e=env({role});assert.equal((await e.prepare()).canonicalReadback,true);}});
test('country-denied/missing-country actor cannot prepare payable',async()=>{for(const countries of [['CO'],[]]){const e=env({countries});await assert.rejects(e.prepare(),error=>error.code==='permission-denied');assert.equal(e.writes.length,0);}});
test('canonical-path policy cannot carry another embedded tenant identity',async()=>{const e=env(),key=e.ref('polizas','policy-alpha');e.rows.set(key,{...e.rows.get(key),tenantId:'tenant-other'});await assert.rejects(e.prepare(),error=>error.code==='permission-denied');assert.equal(e.writes.length,0);});
test('missing policy client and foreign receipt are rejected before any CxP insertion',async()=>{let e=env();e.rows.delete(e.ref('clientes','client-test'));await assert.rejects(e.prepare(),error=>error.details?.reason==='POLICY_CLIENT_NOT_FOUND');assert.equal(e.writes.length,0);e=env();e.rows.set(e.ref('recibosEsperados','foreign-receipt'),{id:'foreign-receipt',polizaId:'policy-beta'});await assert.rejects(e.prepare({lines:[fixture({reciboId:'foreign-receipt'})]}),error=>error.details?.reason==='COMMISSION_RECEIPT_RELATION_CONFLICT');assert.equal(e.writes.length,0);});
test('policy-linked commission preserves valid parent despite changed client domicile',async()=>{const e=env(),key=e.ref('clientes','client-test');e.rows.set(key,{...e.rows.get(key),pais:'CO'});assert.equal((await e.prepare()).payables[0].pais,'GT');});
test('commission cannot be liquidated by generic status toggle',async()=>{const e=env();await assert.rejects(e.generic([{action:'insert',collection:'comisiones',id:'unsafe-commission',payload:{pais:'GT',asesorId:'advisor-alpha',monto:10,estado:'Liquidada'}}]),error=>error.code==='failed-precondition');assert.equal(e.writes.length,0);});
test('generic commission liquidation guard rejects equivalent state spelling and paid flag',async()=>{for(const change of [{estado:'liquidada'},{estado:'LIQUIDADA'},{pagada:true}]){const e=env();await assert.rejects(e.generic([{action:'insert',collection:'comisiones',id:'unsafe-commission',payload:{pais:'GT',asesorId:'advisor-alpha',monto:10,...change}}]),error=>error.code==='failed-precondition');assert.equal(e.writes.length,0);}});
test('protected CxP cannot be marked paid, edited, or forged via generic command',async()=>{const e=env(),r=await e.prepare(),p=r.payables[0],count=e.writes.length;for(const mutation of [{action:'update',collection:'finmovs',id:p.id,payload:{estado:'pagado',pendiente:0}},{action:'update',collection:'finmovs',id:p.id,payload:{valor:1}},{action:'insert',collection:'finmovs',id:'forged-payable',payload:{...p,id:'forged-payable'}}])await assert.rejects(e.generic([mutation]),error=>error.code==='failed-precondition');assert.equal(e.writes.length,count);assert.equal(e.rows.get(e.ref('finmovs',p.id)).estado,'pendiente');});
test('old commission payable cannot be paid by generic finance label toggle or equivalent spelling',async()=>{for(const payload of [{estado:'pagado'},{estado:'Pagado'},{estado:'PAGADA'},{estado:'liquidada'},{estado:'Liquidado'},{pagada:true}]){const e=env();e.rows.set(e.ref('finmovs','legacy-cxp'),{id:'legacy-cxp',pais:'GT',tipo:'egreso',clase:'Comisiones asesores',estado:'pendiente',valor:20});await assert.rejects(e.generic([{action:'update',collection:'finmovs',id:'legacy-cxp',payload}]),error=>error.code==='failed-precondition');assert.equal(e.writes.length,0);}});
test('Preview command rejects real advisors/policies even for a read-only preview',async()=>{const e=env();await assert.rejects(e.mod.orbit360ProductOperationalCommandPreview({auth:{uid:e.uid,token:{}},data:{tenantId:e.tenant,activeRole:'Dirección',advisorPayable:{version:1,operation:'preview',advisorId:'advisor-alpha',cutoff:'2026-11-15',lines:[fixture()]}}}),error=>error.code==='permission-denied');assert.equal(e.writes.length,0);});
test('permitted synthetic Preview envelope still requires signed financial authorization and cannot grant Operativo or Asesor debt writes',async()=>{
  for(const role of ['Operativo','Asesor']){
    const e=env({role}),advisorId='b4003qa_advisor-denied',policyId='b4003qa_policy-denied';
    e.rows.set(e.ref('asesores',advisorId),{...context().advisor,id:advisorId,__syntheticQa:true});
    e.rows.set(e.ref('polizas',policyId),{...context().policy,id:policyId,asesorId:advisorId,__syntheticQa:true});
    for(const operation of ['preview','prepare']){
      await assert.rejects(e.mod.orbit360ProductOperationalCommandPreview({auth:{uid:e.uid,token:{}},data:{tenantId:e.tenant,activeRole:role,
        advisorPayable:{version:1,operation,advisorId,cutoff:'2026-11-15',syntheticQa:true,lines:[fixture({polizaId:policyId})],previewDigest:'a'.repeat(64)}}}),
        error=>error.code==='permission-denied');
      assert.equal(e.writes.length,0);
    }
  }
});
function uiHarness(){
  const nodes=new Map(),calls=[],toasts=[],writes=[];
  const node=()=>({style:{},children:new Map(),listeners:{},innerHTML:'',textContent:'',disabled:false,appendChild(){},remove(){},addEventListener(name,fn){this.listeners[name]=fn;},querySelector(sel){if(!this.children.has(sel))this.children.set(sel,node());return this.children.get(sel);},querySelectorAll(){return[];},insertAdjacentHTML(_where,html){this.innerHTML+=html;}});
  const document={body:{appendChild(element){if(element.id)nodes.set(element.id,element);}},createElement:node,getElementById:id=>nodes.get(id)||null,addEventListener(){}};
  const ready={schemaVersion:contract.SCHEMA,source:fixture().source,commissionAccreditation:{status:'accredited',date:'2026-10-31'}};
  const rows={comisiones:[{...ready,id:'commission-f',asesorId:'advisor-alpha',pais:'GT',estado:'Devengada'},{...ready,id:'commission-g',asesorId:'advisor-beta',pais:'GT',estado:'Devengada'}],finmovs:[{id:'cxp-g',asesorId:'advisor-beta',clase:'Comisiones asesores',pais:'GT',estado:'pendiente',valor:500}]};
  const store={all:collection=>rows[collection]||[],get:(collection,id)=>(rows[collection]||[]).find(row=>row.id===id),where:(collection,fn)=>(rows[collection]||[]).filter(fn),update:(...args)=>writes.push(args),insert:(...args)=>writes.push(args),async prepareAdvisorPayables(spec){calls.push(clone(spec));return {ok:true,payables:[],totals:{GTQ:0},newPayables:0,reusedPayables:0,previewDigest:'proof'};}};
  const Orbit={store,ui:{esc:s=>String(s||''),today:()=> '2026-11-15',toast:s=>toasts.push(s),money:(amount,currency)=>currency+' '+Number(amount).toFixed(2)},q:{},kit:{},modules:{},pais:'GT'};
  const scope={window:{Orbit},Orbit,document,console,setInterval(){},setTimeout(){},clearTimeout(){},location:{},CustomEvent:function(){}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'orbit360-platform/core/queries.js'),'utf8'),scope);
  vm.runInNewContext(fs.readFileSync(path.join(root,'orbit360-platform/modules/finanzas.js'),'utf8'),scope);
  vm.runInNewContext(fs.readFileSync(path.join(root,'orbit360-platform/modules/comisiones.js'),'utf8'),scope);
  return{Orbit,calls,toasts,writes,nodes};
}
test('finance prepare for advisor Alpha excludes advisor Beta commission and existing unrelated CxP',async()=>{const h=uiHarness();await h.Orbit.modules.finanzas.lote('advisor-alpha');assert.deepEqual(h.calls[0].commissionIds,['commission-f']);assert.equal(h.calls[0].advisorId,'advisor-alpha');assert.equal(h.writes.length,0);assert.equal(h.calls[0].operation,'preview');});
test('controlled source UI preserves explicit synthetic QA marker for isolated preview',async()=>{const h=uiHarness();await h.Orbit.modules.finanzas.prepararComisionesFuente([fixture()],{advisorId:'advisor-alpha',cutoff:'2026-11-15',syntheticQa:true});assert.equal(h.calls[0].syntheticQa,true);assert.equal(h.calls[0].operation,'preview');assert.equal(h.writes.length,0);});
test('source preview explains Direction declaration rather than remote document authentication',async()=>{
  const h=uiHarness();await h.Orbit.modules.finanzas.prepararComisionesFuente([fixture()],{advisorId:'advisor-alpha',cutoff:'2026-11-15'});
  const html=h.nodes.get('fin-lote').innerHTML;assert.match(html,/Fuente declarada\/documentada y aprobada por Dirección/);assert.match(html,/no autentica el documento remoto/);assert.doesNotMatch(html,/Verificando fuentes/);
});
test('source entry is reachable in a visible modal and previews before any payable creation',async()=>{const h=uiHarness();h.Orbit.modules.finanzas.abrirFuentesAsesor('advisor-alpha');const form=h.nodes.get('fin-fuentes-asesor');assert.ok(form);form.querySelector('#fuente-asesor').value='advisor-alpha';form.querySelector('#fuente-corte').value='2026-11-15';form.querySelector('#fuente-lote').value=JSON.stringify({schemaVersion:'gravicentra-advisor-commission-source-batch-v1',advisorId:'advisor-alpha',cutoff:'2026-11-15',lines:[fixture()]});await form.querySelector('#fuente-preview').listeners.click();assert.equal(h.calls.length,1);assert.equal(h.calls[0].operation,'preview');assert.equal(h.calls[0].advisorId,'advisor-alpha');assert.equal(h.calls[0].lines[0].ordinaryCommission,42.37);assert.equal(h.writes.length,0);});
test('source entry refuses a lot addressed to another advisor without sending it',async()=>{const h=uiHarness();h.Orbit.modules.finanzas.abrirFuentesAsesor('advisor-alpha');const form=h.nodes.get('fin-fuentes-asesor');form.querySelector('#fuente-asesor').value='advisor-alpha';form.querySelector('#fuente-corte').value='2026-11-15';form.querySelector('#fuente-lote').value=JSON.stringify({schemaVersion:'gravicentra-advisor-commission-source-batch-v1',advisorId:'advisor-beta',cutoff:'2026-11-15',lines:[fixture()]});await form.querySelector('#fuente-preview').listeners.click();assert.equal(h.calls.length,0);assert.match(form.querySelector('#fuente-error').textContent,/asesor/i);});
test('visible JSON file input forwards an explicitly disposable QA batch to the protected preview',async()=>{const h=uiHarness(),advisorId='b4003qa_advisor_ui',polizaId='b4003qa_policy_ui';h.Orbit.modules.finanzas.abrirFuentesAsesor(advisorId);const form=h.nodes.get('fin-fuentes-asesor'),batch={schemaVersion:'gravicentra-advisor-commission-source-batch-v1',advisorId,cutoff:'2026-11-15',syntheticQa:true,lines:[fixture({polizaId})]};form.querySelector('#fuente-asesor').value=advisorId;form.querySelector('#fuente-corte').value=batch.cutoff;await form.querySelector('#fuente-archivo').listeners.change({target:{files:[{size:200,text:async()=>JSON.stringify(batch)}]}});assert.deepEqual(JSON.parse(form.querySelector('#fuente-lote').value),batch);await form.querySelector('#fuente-preview').listeners.click();assert.equal(h.calls.length,1);assert.equal(h.calls[0].syntheticQa,true);assert.equal(h.calls[0].lines[0].polizaId,polizaId);assert.equal(h.writes.length,0);});
test('visible source upload cannot mark a real policy or advisor as synthetic QA',async()=>{for(const change of [{advisorId:'advisor-real',polizaId:'b4003qa_policy_ui'},{advisorId:'b4003qa_advisor_ui',polizaId:'policy-real'}]){const h=uiHarness();h.Orbit.modules.finanzas.abrirFuentesAsesor(change.advisorId);const form=h.nodes.get('fin-fuentes-asesor');form.querySelector('#fuente-asesor').value=change.advisorId;form.querySelector('#fuente-corte').value='2026-11-15';form.querySelector('#fuente-lote').value=JSON.stringify({schemaVersion:'gravicentra-advisor-commission-source-batch-v1',advisorId:change.advisorId,cutoff:'2026-11-15',syntheticQa:true,lines:[fixture({polizaId:change.polizaId})]});await form.querySelector('#fuente-preview').listeners.click();assert.equal(h.calls.length,0);assert.match(form.querySelector('#fuente-error').textContent,/sintéticos/);}});
test('finance and commission legacy toggles never write or mark a payable paid',()=>{const h=uiHarness();h.Orbit.modules.finanzas.toggleEstado('cxp-g');h.Orbit.modules.finanzas.toggleComEstado('commission-f');h.Orbit.modules.comisiones.toggleEstado('commission-f');assert.equal(h.writes.length,0);assert.equal(h.toasts.length,3);});
test('all-advisors legacy button cannot combine beneficiary debts',async()=>{const h=uiHarness();await h.Orbit.modules.finanzas.lote('');assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);assert.match(h.toasts[0],/Selecciona un asesor/);});
test('synthetic preparation has an exact restore path and cannot restore real customer payables',async()=>{
  const e=env(),advisorId='b4003qa_advisor-test',policyId='b4003qa_policy-test';
  e.rows.set(e.ref('asesores',advisorId),{...context().advisor,id:advisorId,__syntheticQa:true});
  e.rows.set(e.ref('polizas',policyId),{...context().policy,id:policyId,asesorId:advisorId,__syntheticQa:true});
  const r=await e.prepare({advisorId,syntheticQa:true,lines:[fixture({polizaId:policyId})]});
  const out=await e.send({operation:'restoreSynthetic',syntheticQa:true,preparedRequestId:r.requestId});
  assert.equal(out.restored,true);assert.equal(out.canonicalReadback,true);assert.equal(e.rows.has(e.ref('finmovs',r.payables[0].id)),false);assert.equal(e.rows.has(e.ref('comisiones',r.payables[0].comisionId)),false);
  assert.equal(e.rows.has(e.ref('polizas',policyId)),true);assert.equal(e.rows.has(e.ref('asesores',advisorId)),true);
  const real=await e.prepare();await assert.rejects(e.send({operation:'restoreSynthetic',syntheticQa:true,preparedRequestId:real.requestId}),error=>error.code==='permission-denied');
});
test('synthetic restore refuses a changed balance instead of deleting it',async()=>{
  const e=env(),advisorId='b4003qa_advisor-test',policyId='b4003qa_policy-test';
  e.rows.set(e.ref('asesores',advisorId),{...context().advisor,id:advisorId,__syntheticQa:true});e.rows.set(e.ref('polizas',policyId),{...context().policy,id:policyId,asesorId:advisorId,__syntheticQa:true});
  const r=await e.prepare({advisorId,syntheticQa:true,lines:[fixture({polizaId:policyId})]}),key=e.ref('finmovs',r.payables[0].id);e.rows.set(key,{...e.rows.get(key),pendiente:1});await assert.rejects(e.send({operation:'restoreSynthetic',syntheticQa:true,preparedRequestId:r.requestId}),error=>error.code==='failed-precondition');assert.equal(e.rows.has(key),true);
});

test('optional documented premium and insurer rate survive without calculating or replacing the credited commission',()=>{
  const r=contract.normalizeLine(fixture({base:321.09,pct:17.5}),context());
  for(const row of [r.payable,r.commission]){assert.equal(row.base,321.09);assert.equal(row.pct,17.5);}
  assert.equal(r.commission.monto,42.37);assert.equal(r.payable.valor,29.66);
  const old=contract.normalizeLine(fixture(),context());
  assert.equal(Object.hasOwn(old.commission,'base'),false);assert.equal(Object.hasOwn(old.commission,'pct'),false);
  assert.notEqual(old.financialDigest,r.financialDigest);
  const baseOnly=contract.normalizeLine(fixture({base:321.09}),context());
  assert.equal(baseOnly.commission.base,321.09);assert.equal(Object.hasOwn(baseOnly.commission,'pct'),false);
});
test('documentary fields reject invalid cents and insurer percentages rather than coercing or inventing them',()=>{
  for(const base of [null,undefined,'321.09',0,-1,1.001,Infinity,NaN])assert.throws(()=>contract.normalizeLine(fixture({base}),context()),{code:'INVALID_AMOUNT'});
  for(const pct of [null,undefined,'17.5',0,-1,100.001,1.00001,Infinity,NaN])assert.throws(()=>contract.normalizeLine(fixture({pct}),context()),{code:'INVALID_INSURER_RATE'});
  assert.equal(contract.normalizeLine(fixture({pct:17.1234}),context()).commission.pct,17.1234);
});
test('documentary fields are digest-bound and canonical replay preserves both fields without a new debt',async()=>{
  const e=env(),first=await e.prepare({lines:[fixture({base:321.09,pct:17.5})]});
  assert.equal(first.commissions.length,1);assert.equal(first.commissionReadback.length,1);
  const commission=first.commissions[0];
  assert.equal(commission.base,321.09);assert.equal(commission.pct,17.5);assert.equal(commission.cxpAsesorId,first.payables[0].id);
  assert.equal(first.commissionReadback[0].financialDigest,commission.financialDigest);
  const replay=await e.prepare({lines:[],commissionIds:[commission.id]});
  assert.equal(replay.newPayables,0);assert.equal(replay.commissions[0].base,321.09);
  // A different input mode has its own audit/request record, not another debt.
  assert.equal(e.writes.filter(w=>/\/data\/(comisiones|finmovs)\/items\//.test(w.p)).length,2);
  const count=e.writes.length;
  for(const change of [{base:321.10,pct:17.5},{base:321.09,pct:18}])await assert.rejects(e.send({lines:[fixture(change)]}),error=>error.details?.reason==='SOURCE_LINE_ALREADY_INTERPRETED');
  assert.equal(e.writes.length,count);
});
test('legacy source records remain unchanged and optional metadata cannot silently backfill a posted debt',async()=>{
  const e=env(),first=await e.prepare();
  assert.equal(Object.hasOwn(first.commissions[0],'base'),false);assert.equal(Object.hasOwn(first.commissions[0],'pct'),false);
  const replay=await e.prepare({lines:[],commissionIds:[first.commissions[0].id]});
  assert.equal(replay.newPayables,0);assert.equal(replay.commissions[0].financialDigest,first.commissions[0].financialDigest);
  assert.equal(e.writes.filter(w=>/\/data\/(comisiones|finmovs)\/items\//.test(w.p)).length,2);
  const count=e.writes.length;
  await assert.rejects(e.send({lines:[fixture({base:321.09,pct:17.5})]}),error=>error.details?.reason==='SOURCE_LINE_ALREADY_INTERPRETED');
  assert.equal(e.writes.length,count);
});
test('retained digest does not hide edited documentary premium or rate in either stored ledger',async()=>{
  for(const collection of ['comisiones','finmovs'])for(const field of ['base','pct']){
    const e=env(),first=await e.prepare({lines:[fixture({base:321.09,pct:17.5})]}),row=first.payables[0];
    const key=e.ref(collection,collection==='comisiones'?row.comisionId:row.id),count=e.writes.length;
    e.rows.set(key,{...e.rows.get(key),[field]:1});
    await assert.rejects(e.send({lines:[fixture({base:321.09,pct:17.5})]}),error=>['PAYABLE_SOURCE_CONFLICT','COMMISSION_SOURCE_CONFLICT'].includes(error.details?.reason));
    assert.equal(e.writes.length,count);
  }
});
function payableFacade(receipt){
  const source=fs.readFileSync(path.join(root,'orbit360-platform/data/store-firestore-product-operational-p0.js'),'utf8');
  const match=source.match(/  function prepareAdvisorPayables\(spec\)\{[\s\S]*?\n  \}\n  function status/);
  assert.ok(match,'ADVISOR_PAYABLE_FACADE_ANCHOR_MISSING');
  const pending=[],emitted=[],calls=[];
  const fn=vm.runInNewContext('('+match[0].replace(/\n  function status$/,'')+')',{
    clone,member:()=>({uid:'actor-test',tenantId:'tenant-test',activeRole:'Dirección'}),
    Orbit:{access:{can:()=>true}},signedContext:async()=>({}),provider:{async callFunction(name,payload,region){calls.push({name,payload,region});return clone(receipt);}},
    isB2PreviewHost:()=>false,previewGeneralCommand:()=> 'preview-command',GENERAL_COMMAND:'orbit360ProductOperationalCommand',
    setPending:(collection,id,row)=>pending.push({collection,id,row}),emit:collection=>emitted.push(collection)
  });
  return{fn,pending,emitted,calls};
}
test('both canonical ledgers hydrate immediately only after complete server readback proof',async()=>{
  const e=env(),receipt=await e.prepare({lines:[fixture({base:321.09,pct:17.5})]}),h=payableFacade(receipt);
  await h.fn({version:1,operation:'prepare',advisorId:'advisor-alpha'});
  assert.deepEqual(h.pending.map(row=>row.collection),['comisiones','finmovs']);
  assert.deepEqual(h.emitted,['comisiones','finmovs']);assert.equal(h.pending[0].row.base,321.09);
  assert.equal(h.pending[0].row.id,receipt.commissions[0].id);assert.equal(h.pending[1].row.estado,'pendiente');
  assert.equal(h.calls[0].name,'orbit360ProductOperationalCommand');assert.equal(h.calls[0].region,'us-central1');
});
test('missing or corrupted commission readback exposes neither optimistic commission nor payable',async()=>{
  const e=env(),receipt=await e.prepare({lines:[fixture({base:321.09,pct:17.5})]});
  for(const alter of [r=>{delete r.commissions;},r=>{delete r.commissionReadback;},r=>{r.commissions[0].tenantId='other';},
    r=>{r.commissions[0].base=1;},r=>{r.commissionReadback[0].monto=1;},r=>{r.commissions[0].cxpAsesorId='other';}]){
    const changed=clone(receipt);alter(changed);const h=payableFacade(changed);
    await assert.rejects(h.fn({version:1,operation:'prepare',advisorId:'advisor-alpha'}),/ADVISOR_COMMISSION/);
    assert.equal(h.pending.length,0);assert.equal(h.emitted.length,0);
  }
});
test('read-only preview and legacy omitted basis still never optimistically write or infer metadata',async()=>{
  const e=env(),preview=await e.send({}),p=payableFacade(preview);
  await p.fn({version:1,operation:'preview',advisorId:'advisor-alpha'});assert.equal(p.pending.length,0);
  const receipt=await e.prepare(),h=payableFacade(receipt);
  await h.fn({version:1,operation:'prepare',advisorId:'advisor-alpha'});
  assert.equal(Object.hasOwn(h.pending[0].row,'base'),false);assert.equal(Object.hasOwn(h.pending[0].row,'pct'),false);
});
