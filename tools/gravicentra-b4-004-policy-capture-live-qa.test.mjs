import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {resolveProductActiveRole}=require('../functions/product-active-role-contract.js');
import {fixturePlan,verifyIdentityOnly,assertCaptureInput,assertCleanupFixture,assertCleanupReceipt,receiptIdentity,policyActivityMatches,installCaptureIdentityAdapter,capturePolicyFormValidation,policyFormErrorDiagnostic,classifyExpectedLiveAuditConsole} from './gravicentra-b4-004-policy-capture-live-qa.mjs';
const plan=fixturePlan('12345_1'),tenantId='alianzas-soluciones',uid='qa_signed_actor',copy=v=>JSON.parse(JSON.stringify(v));
function harness(){
 const calls=[];globalThis.Orbit={store:{__productOperationalWriteP0:true,batchDurable:async(ms,o)=>{calls.push({method:'batch',ms:copy(ms),o});return{ok:true};},insertDurable:async(c,p)=>{calls.push({method:'insertDurable',c,p:copy(p)});return p;},update:(c,id,p)=>{calls.push({method:'update',c,id,p:copy(p)});return p;},insert:(c,p)=>{throw Error(c==='auditLog'?'PRODUCT_WRITE_COLLECTION_NOT_AUTHORIZED':'PRODUCT_WRITE_RECORD_SCOPE_DENIED');},remove:()=>{throw Error('unreachable');},removeDurable:()=>{throw Error('unreachable');},updateDurable:()=>{throw Error('unreachable');}}};
 installCaptureIdentityAdapter({plan});return{calls,s:Orbit.store,qa:__giCaptureQa,close(){__giCaptureQa.restore();delete globalThis.Orbit;}};
}
function clientBatch(){return[{action:'insert',collection:'clientes',id:'cli_original',payload:{id:'cli_original',pais:'GT',nombre:'Synthetic client',asesorId:plan.advisor.id,email:'qa@example.invalid',estado:'pendiente_polizas'}},{action:'insert',collection:'actividades',id:'act_original',payload:{id:'act_original',pais:'GT',clienteId:'cli_original',asesorId:plan.advisor.id,detalle:'cli_original is text and must not change'}}];}
function wireInput(){return{tenantId,activeRole:'Dirección',requestId:'qa_request_12345',mutations:[{action:'update',collection:'asesores',id:plan.advisor.id,payload:{id:plan.advisor.id,tenantId,pais:'GT',shareCom:60,__syntheticQa:true}}]};}

test('fixture IDs require an Actions run and attempt and enumerate exact collections',()=>{assert.equal(Object.keys(plan).length,11);assert.equal(new Set(Object.values(plan).map(x=>x.id)).size,11);assert.throws(()=>fixturePlan('../live'),/RUN_REQUIRED/);});
test('actual caller objects keep their references while only record identities and marker change',async()=>{const h=harness();try{h.qa.setPhase('client-create');const ms=clientBatch(),before=copy(ms),row=ms[0].payload;await h.s.batchDurable(ms,{requestId:'same-operation'});assert.equal(row.id,plan.client.id);assert.equal(ms[1].payload.clienteId,row.id);assert.equal(ms[1].payload.detalle,before[1].payload.detalle);assert.equal(h.calls[0].o.requestId,'same-operation');const r=h.qa.snapshot().records[0];r.before.forEach((m,i)=>assert.equal(verifyIdentityOnly(m.payload,r.after[i].payload,r.mapping),true));assert.equal(h.calls.length,1);}finally{h.close();}});
test('complete policy/receipt/portfolio/vehicle graph remaps exact links without changing premiums or dates',async()=>{const h=harness();try{h.qa.setPhase('client-create');await h.s.batchDurable(clientBatch());h.qa.setPhase('policy-create');const ms=[['polizas','pol_old',{clienteId:plan.client.id,moneda:'USD',primaNeta:1000,comAseguradoraPct:10,comVendedorPct:60}],['recibosEsperados','rec_old',{polizaId:'pol_old',receiptKey:tenantId+'|pol_old|1',clienteId:plan.client.id,moneda:'USD',fechaLimite:'2026-11-19',comAseguradora:100,comVendedor:60}],['carteraPrimas','car_old',{polizaId:'pol_old',reciboId:'rec_old',clienteId:plan.client.id,moneda:'USD',monto:1120}],['vehiculos','veh_old',{polizaId:'pol_old',clienteId:plan.client.id,uso:'Particular'}],['actividades','act_pol',{polizaId:'pol_old',clienteId:plan.client.id,titulo:'Póliza creada'}]].map(([collection,id,p])=>({action:'insert',collection,id,payload:{id,pais:'GT',asesorId:plan.advisor.id,...p}}));await h.s.batchDurable(ms);assert.equal(ms[2].payload.reciboId,plan.receipt.id);assert.equal(ms[1].payload.receiptKey,tenantId+'|'+plan.policy.id+'|1');assert.equal(ms[3].payload.polizaId,plan.policy.id);assert.equal(ms[0].payload.primaNeta,1000);const r=h.qa.snapshot().records.at(-1);r.before.forEach((m,i)=>verifyIdentityOnly(m.payload,r.after[i].payload,r.mapping));}finally{h.close();}});
test('missing activity in a client batch fails before the real facade',()=>{const h=harness();try{h.qa.setPhase('client-create');assert.throws(()=>h.s.batchDurable(clientBatch().slice(0,1)),/BATCH_INCOMPLETE/);assert.equal(h.calls.length,0);}finally{h.close();}});
test('foreign receipt update, undeclared phase, duplicate and repeated commands fail closed',async()=>{const h=harness();try{assert.throws(()=>h.s.batchDurable(clientBatch()),/PHASE_NOT_OPEN/);h.qa.setPhase('advisor-commission');assert.throws(()=>h.s.batchDurable([{action:'update',collection:'asesores',id:'real_advisor',payload:{shareCom:60}}]),/FOREIGN_UPDATE/);await h.s.batchDurable([{action:'update',collection:'asesores',id:plan.advisor.id,payload:{shareCom:60}}]);assert.throws(()=>h.s.batchDurable([{action:'update',collection:'asesores',id:plan.advisor.id,payload:{shareCom:70}}]),/REPEATED_WRITE/);assert.equal(h.calls.length,1);}finally{h.close();}});
test('Equipo audit must already have correct country and advisor; adapter does not repair either',async()=>{const h=harness();try{h.qa.setPhase('advisor-commission');assert.throws(()=>h.s.insertDurable('auditoria',{id:'audit1',asesorId:plan.advisor.id}),/AUDIT_NOT_DECLARED/);await h.s.insertDurable('auditoria',{id:'audit1',asesorId:plan.advisor.id,pais:'GT',actorUid:uid,after:{shareCom:60}});const r=h.qa.snapshot().records[0];verifyIdentityOnly(r.before[0].payload,r.after[0].payload,r.mapping);assert.equal(h.calls[0].p.actorUid,uid);}finally{h.close();}});
test('derived client state remains the real nonblocking owner and allows no premium/country changes',()=>{const h=harness();try{h.qa.setPhase('policy-create');assert.throws(()=>h.s.update('clientes',plan.client.id,{pais:'CO'}),/DERIVED_UPDATE_NOT_DECLARED/);assert.throws(()=>h.s.update('clientes','real_client',{estado:'activo'}),/DERIVED_UPDATE_NOT_DECLARED/);h.s.update('clientes',plan.client.id,{estado:'activo',estadoOperativo:'activo',estadoActualizado:'2026-11-07'});assert.equal(h.calls[0].p.estado,'activo');assert.equal(h.calls[0].p.__syntheticQa,true);}finally{h.close();}});
test('supplementary legacy audit denial is observed and never presented as audit success',()=>{const h=harness();try{h.qa.setPhase('client-create');assert.throws(()=>h.s.insert('auditLog',{id:'legacy'}),/PRODUCT_WRITE_COLLECTION_NOT_AUTHORIZED/);assert.equal(h.qa.snapshot().auxiliary[0].status,'CANONICAL_DENIAL');assert.equal(h.calls.length,0);assert.throws(()=>h.s.remove('clientes',plan.client.id),/METHOD_NOT_DECLARED/);}finally{h.close();}});
test('identity-only verifier rejects rates, country, actor, dates and unlisted field additions',()=>{const keyBefore={receiptKey:'tenant|policy|1'},keyMap={tenant:'different_tenant',policy:'new_policy','1':'99'};assert.equal(verifyIdentityOnly(keyBefore,{receiptKey:'tenant|new_policy|1',__syntheticQa:true},keyMap),true);assert.throws(()=>verifyIdentityOnly(keyBefore,{receiptKey:'different_tenant|new_policy|99',__syntheticQa:true},keyMap),/BUSINESS_PAYLOAD_CHANGED/);const a={id:'old',pais:'GT',rate:10,actorUid:uid,date:'2026-11-01'},b={...a,id:plan.policy.id,__syntheticQa:true},map={old:plan.policy.id};assert.equal(verifyIdentityOnly(a,b,map),true);for(const [k,v] of [['rate',0],['pais','CO'],['actorUid','different'],['date','2026-12-01'],['extra',true]])assert.throws(()=>verifyIdentityOnly(a,{...b,[k]:v},map),/BUSINESS_PAYLOAD_CHANGED|KEY_CHANGED/);});
test('HTTP fence admits the exact QA write but rejects live IDs, missing marker, foreign references and finance',()=>{const good=wireInput();assert.equal(assertCaptureInput(good,plan,tenantId),true);for(const change of [x=>x.mutations[0].id='real',x=>delete x.mutations[0].payload.__syntheticQa,x=>x.mutations[0].payload.clienteId='real',x=>x.mutations[0].collection='finmovs',x=>x.mutations[0].action='remove',x=>x.activeRole='asesor',x=>x.mutations[0].payload.authUid='real_identity']){const x=copy(good);change(x);assert.throws(()=>assertCaptureInput(x,plan,tenantId),/CAPTURE_QA_/);}});
test('cleanup requires exact fixture identity, original owner, tenant and no auth link',()=>{const good={id:plan.advisor.id,tenantId,ownerUid:uid,__syntheticQa:true};assert.equal(assertCleanupFixture(good,plan.advisor,tenantId,uid),true);for(const change of [{ownerUid:'another_actor'},{tenantId:'other'},{__syntheticQa:false},{id:'real'},{authUid:uid}])assert.throws(()=>assertCleanupFixture({...good,...change},plan.advisor,tenantId,uid),/CLEANUP_/);});
test('request/event cleanup binds the exact normalized digest, actor, original absence and derived IDs',()=>{const input=wireInput(),exact=receiptIdentity(input,tenantId,uid),result={ok:true,serverOwned:true,requestId:exact.requestId,eventId:exact.eventId},event={...exact,tenantId,actorUid:uid,activeRole:'direccion',mutationCount:1},request={status:'committed',payloadDigest:exact.payloadDigest,result},call={input,response:result,originalReceiptAbsence:true};assert.equal(assertCleanupReceipt(event,request,call,tenantId,uid),true);for(const change of [{actorUid:'different'},{payloadDigest:'0'.repeat(64)},{eventId:'unrelated'},{mutationCount:2}])assert.throws(()=>assertCleanupReceipt({...event,...change},request,call,tenantId,uid),/CLEANUP_/);assert.throws(()=>assertCleanupReceipt(event,request,{...call,originalReceiptAbsence:false},tenantId,uid),/CLEANUP_/);});
test('missing ACK can be resolved by the exact deterministic request/event addresses',()=>{const input=wireInput();delete input.requestId;const a=receiptIdentity(input,tenantId,uid),b=receiptIdentity(copy(input),tenantId,uid);assert.deepEqual(a,b);assert.match(a.requestId,/^op_[a-f0-9]{32}$/);assert.match(a.eventId,/^opevt_[a-f0-9]{28}$/);assert.notEqual(a.requestId,receiptIdentity(input,tenantId,'another_actor').requestId);assert.equal(a.eventId,'opevt_'+createHash('sha256').update(tenantId+'|'+a.requestId).digest('hex').slice(0,28));});
test('canonical policy activity is linked by exact fixture, client, advisor and operation without inventing polizaId',()=>{const policy={numero:'QA-ONE',operationId:'policy_op_one'},activity={id:plan.policyActivity.id,clienteId:plan.client.id,asesorId:plan.advisor.id,pais:'GT',operacionId:policy.operationId,titulo:'Póliza creada: '+policy.numero};assert.equal(policyActivityMatches(activity,policy,plan),true);assert.equal(Object.hasOwn(activity,'polizaId'),false);for(const patch of [{operacionId:'other'},{clienteId:'foreign'},{id:'other'},{pais:'CO'}])assert.equal(policyActivityMatches({...activity,...patch},policy,plan),false);});


// Use the product taxonomy, access owner and complete operational facade. The
// provider is an in-memory boundary, not a replacement authorization engine.
function canonicalFacadeHarness({countries=['GT'],sessionRole}={}){
 const rows=new Map(),calls=[],listeners=[];
 const put=(c,r)=>rows.set(c+'|'+r.id,copy(r)),get=(c,id)=>copy(rows.get(c+'|'+id)||null);
 const all=c=>[...rows].filter(([k])=>k.startsWith(c+'|')).map(([,v])=>copy(v));
 const readStore={__productReadOnlyP0:true,_productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false}),get,all,where:(c,f)=>all(c).filter(f),on:(c,f)=>listeners.push(f),pref:(k,d)=>d};
 const context=vm.createContext({console,Date,Math,Set,Map,Promise,JSON,setTimeout,clearTimeout,location:{hostname:'ays-orbit-360-lab.web.app'},document:{dispatchEvent(){}},CustomEvent:class {constructor(type,options){this.type=type;Object.assign(this,options);}},dispatchEvent(){},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{goalParticipationPreviewCandidate:true}});
 context.window=context;context.Orbit={store:readStore,pais:'GT'};
 const load=path=>vm.runInContext(fs.readFileSync(new URL('../orbit360-platform/'+path,import.meta.url),'utf8'),context,{filename:path});
 load('core/product-role-taxonomy-p0.js');
 const O=context.Orbit,member=O.productRoleTaxonomyP0.normalizeMembership({uid,tenantId,email:'synthetic@example.invalid',status:'active',active:true,productReadOnly:true,activeRole:'direccion',roles:['direccion'],countries,advisorId:plan.advisor.id,scopeDatos:'todos'});
 let role=sessionRole||member.activeRole;
 put('asesores',{id:plan.advisor.id,tenantId,pais:'GT',paisDefault:'GT',paises:['GT'],scopeDatos:'todos',shareCom:50,ownerUid:uid,__syntheticQa:true});
 O.auth={productUser:member,user:()=>({uid,nombre:'Synthetic actor',rol:role})};
 O.session={rol:()=>role,asesorId:()=>plan.advisor.id,rolesAsignados:()=>member.roles};
 O.tenant={id:tenantId,get:()=>({tenantId}),isActive:()=>true};
 O.ROLES={'Dirección':{modulos:['cliente360','polizas','cobros','equipo','inicio'],nivel:10}};
 O.productRuntimeBrowserProvidersP0={browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,initialize:async()=>({auth:{currentUser:{uid}}}),async callFunction(name,input,region){
  const original=JSON.stringify(input);
  assert.equal(name,'orbit360ProductOperationalCommand');assert.equal(region,'us-central1');
  assert.equal(assertCaptureInput(input,plan,tenantId),true);assert.equal(JSON.stringify(input),original);
  assert.equal(resolveProductActiveRole(member,input.activeRole).activeRole,'direccion');
  calls.push({name,input:copy(input),region});
  for(const m of input.mutations)put(m.collection,m.payload);
  listeners.forEach(fn=>fn('*'));
  return{ok:true,serverOwned:true,canonicalReadback:true,canonicalReadbackCount:input.mutations.length,readback:input.mutations.map(m=>({action:m.action,collection:m.collection,id:m.id,exists:true}))};
 }};
 load('core/access-scope.js');load('data/store-firestore-product-operational-p0.js');
 O.productOperationalWriteP0.install(readStore);
 return{O,member,calls,get,setRole:v=>{role=v;}};
}
test('actual taxonomy/access/facade serialize Dirección for batch, durable audit, client activity and ordinary state update',async()=>{
 const h=canonicalFacadeHarness();assert.equal(h.member.activeRole,'Dirección');
 await h.O.store.batchDurable([{action:'update',collection:'asesores',id:plan.advisor.id,payload:{shareCom:60,__syntheticQa:true}}],{requestId:'qa_actual_advisor'});
 await h.O.store.insertDurable('auditoria',{id:plan.advisorAudit.id,pais:'GT',asesorId:plan.advisor.id,actorUid:uid,after:{shareCom:60},__syntheticQa:true});
 await h.O.store.batchDurable([{action:'insert',collection:'clientes',id:plan.client.id,payload:{id:plan.client.id,pais:'GT',asesorId:plan.advisor.id,nombre:'Synthetic client',estado:'pendiente_polizas',__syntheticQa:true}},{action:'insert',collection:'actividades',id:plan.clientActivity.id,payload:{id:plan.clientActivity.id,pais:'GT',clienteId:plan.client.id,asesorId:plan.advisor.id,titulo:'Synthetic creation',__syntheticQa:true}}],{requestId:'qa_actual_client'});
 h.O.store.update('clientes',plan.client.id,{estado:'activo',estadoOperativo:'activo',__syntheticQa:true});
 await new Promise(setImmediate);
 assert.equal(h.calls.length,4);assert.equal(h.get('asesores',plan.advisor.id).shareCom,60);assert.equal(h.get('clientes',plan.client.id).estado,'activo');
 for(const call of h.calls){assert.equal(call.input.activeRole,'Dirección');assert.equal(call.input.tenantId,tenantId);for(const m of call.input.mutations){assert.equal(m.payload.id,m.id);assert.equal(m.payload.tenantId,tenantId);assert.equal(m.payload.pais,'GT');assert.equal(m.payload.__syntheticQa,true);}}
 assert.equal(h.calls[0].input.requestId,'qa_actual_advisor');assert.equal(Object.hasOwn(h.calls[1].input,'requestId'),false);assert.equal(Object.hasOwn(h.calls[3].input,'requestId'),false);
 const outbound=h.calls[0].input;assert.throws(()=>assertCaptureInput({...outbound,activeRole:'direccion'},plan,tenantId),/REQUEST_ACTOR_CONTEXT/);
});
test('canonical role correction preserves actual country and assigned-role denials before provider admission',async()=>{
 const denied=canonicalFacadeHarness({countries:['CO']});
 await assert.rejects(denied.O.store.batchDurable([{action:'update',collection:'asesores',id:plan.advisor.id,payload:{shareCom:60,__syntheticQa:true}}]),/SCOPE_DENIED/);
 assert.equal(denied.calls.length,0);
 const h=canonicalFacadeHarness();h.setRole('SuperAdmin');
 assert.throws(()=>h.O.store.batchDurable([{action:'update',collection:'asesores',id:plan.advisor.id,payload:{shareCom:60,__syntheticQa:true}}]),/MEMBERSHIP_REQUIRED/);assert.equal(h.calls.length,0);
});


// Reuse the repository's existing real-owner/real-backend memory fixture. Only
// its test registration is disabled; production source bytes are not rewritten.
function realPolicyFixture(){
 const file=fileURLToPath(new URL('./gravicentra-policy-writer-backend-causal.test.cjs',import.meta.url));
 const fixtureRequire=createRequire(file),context=vm.createContext({console,process,Buffer,setTimeout,clearTimeout,__dirname:path.dirname(file),module:{exports:{}},require:n=>n==='node:test'?()=>{}:fixtureRequire(n)});
 vm.runInContext(fs.readFileSync(file,'utf8')+'\nmodule.exports={integrated};',context,{filename:file});
 const h=context.module.exports.integrated(),signedTenant=h.Orbit.tenant;
 vm.runInContext(fs.readFileSync(new URL('../orbit360-platform/core/config.js',import.meta.url),'utf8'),h.context,{filename:'core/config.js'});
 // The signed bootstrap supplies tenant authority after base config loads.
 h.Orbit.tenant=signedTenant;h.Orbit.pais='GT';return h;
}
async function actualQaPolicyForm(selectProduct){
 const h=realPolicyFixture();h.Orbit.modules.cliente360.nuevaPoliza('qa_client');
 const form=h.doc.getElementById('policy-v1199'),field=k=>form.querySelector('[data-'+k+']');
 for(const [k,v]of [['insurer','qa_insurer'],['advisor','qa_advisor'],['currency','USD'],['ramo','Automóviles']]){field(k).value=v;await field(k).fire('change');}
 assert.equal(field('product').value,'','the actual ramo change clears the required product');
 assert.ok(h.Orbit.cat.subramosDe('GT','Automóviles').includes('Vehículo Liviano'));
 if(selectProduct){field('product').value='Vehículo Liviano';await field('product').fire('change');}
 for(const [k,v]of Object.entries({number:'QA-CAPTURE-12345_1',renewable:'no',frequency:'Contado',start:'2026-11-07',end:'2026-12-07',net:'1000',issue:'0','commission-insurer':'10','commission-seller':'60'})){field(k).value=v;await field(k).fire('change');}
 const expected={clientId:'qa_client',advisorId:'qa_advisor',insurerId:'qa_insurer',product:'Vehículo Liviano'};
 const preflight=()=>vm.runInContext('('+capturePolicyFormValidation.toString()+')('+JSON.stringify(expected)+')',h.context);
 return{...h,form,field,preflight};
}
test('the original Preview fill sequence leaves product empty, reports producto_requerido and starts zero writes',async()=>{
 const h=await actualQaPolicyForm(false),p=h.preflight();assert.equal(p.ok,false);assert.deepEqual(copy(p.errorCodes),['producto_requerido']);assert.deepEqual(copy(p.missingFields),['product']);
 await h.field('save').fire('click');const diagnostic=policyFormErrorDiagnostic(h.field('error').textContent);
 assert.deepEqual(diagnostic.errorCodes,['producto_requerido']);assert.equal(h.calls.length,0);assert.equal(h.db.commits,0);assert.equal(h.db.rows('polizas').length,0);
});
test('explicit product selection follows the actual form and validates every required field before its atomic write',async()=>{
 const h=await actualQaPolicyForm(true);assert.equal(h.preflight().ok,true);
 for(const key of ['client','advisor','insurer','currency','number','status','renewable','ramo','product','start','end','frequency','installments','payment-form','conduct','net','commission-insurer','commission-seller']){
  const field=h.field(key),prior=field.value;field.value='';const result=h.preflight();assert.equal(result.ok,false,key);assert.ok(result.missingFields.includes(key),key);field.value=prior;
 }
 assert.equal(h.calls.length,0);assert.equal(h.db.commits,0);await h.field('save').fire('click');
 assert.equal(policyFormErrorDiagnostic(h.field('error').textContent),null);assert.equal(h.calls.length,1);assert.equal(h.db.commits,1);
 const policy=h.db.rows('polizas')[0],receipt=h.db.rows('recibosEsperados')[0];
 assert.equal(policy.producto,'Vehículo Liviano');assert.equal(policy.moneda,'USD');assert.equal(policy.primaNeta,1000);assert.equal(receipt.comAseguradora,100);assert.equal(receipt.comVendedor,60);
});
test('form diagnostics expose only known codes and message hashes, never raw unknown client or actor text',()=>{
 assert.equal(policyFormErrorDiagnostic(''),null);
 const text='Unexpected detail for private-client@example.invalid / private_actor';
 const diagnostic=policyFormErrorDiagnostic(text);assert.deepEqual(diagnostic.errorCodes,['unmapped_form_error']);assert.equal(diagnostic.messageSha256,createHash('sha256').update(text).digest('hex'));assert.equal(JSON.stringify(diagnostic).includes('private'),false);
});

test('LIVE console classifier admits only the exact observed legacy audit denial family',()=>{
 const direct=classifyExpectedLiveAuditConsole('PRODUCT_WRITE_COLLECTION_NOT_AUTHORIZED');
 assert.equal(direct.expected,true);assert.equal(direct.code,'PRODUCT_WRITE_COLLECTION_NOT_AUTHORIZED');
 const scoped=classifyExpectedLiveAuditConsole('PRODUCT_WRITE_RECORD_SCOPE_DENIED');
 assert.equal(scoped.expected,true);assert.equal(scoped.code,'PRODUCT_WRITE_RECORD_SCOPE_DENIED');
 const unexpected=classifyExpectedLiveAuditConsole('TypeError: unexpected production failure');
 assert.equal(unexpected.expected,false);assert.match(unexpected.messageSha256,/^[a-f0-9]{64}$/);
});
