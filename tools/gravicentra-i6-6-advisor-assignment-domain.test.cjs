'use strict';
// Transaction-level integration tests; every identity and amount is synthetic.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const contract=require('../functions/advisor-assignment-correction-contract');
const clone=value=>JSON.parse(JSON.stringify(value));
const harnessFile=path.join(__dirname,'gravicentra-i6-6-advisor-payables.test.cjs'),harness={exports:{}},baseRequire=createRequire(harnessFile);
vm.runInNewContext(fs.readFileSync(harnessFile,'utf8')+'\nmodule.exports={env};',{
  module:harness,exports:harness.exports,__dirname,console,Buffer,
  require:name=>name==='node:test'?()=>{}:baseRequire(name)
},{filename:harnessFile});
function setup(options={}){
  const e=harness.exports.env(options);
  for(const id of ['advisor-alpha','advisor-beta'])e.rows.set(e.ref('asesores',id),{
    ...e.rows.get(e.ref('asesores',id)),tenantId:e.tenant,roles:['Asesor'],paises:['GT'],activo:true
  });
  e.rows.set(e.ref('clientes','client-test'),{...e.rows.get(e.ref('clientes','client-test')),asesorId:'advisor-alpha',updatedAt:'UNCHANGED_CLIENT_TIMESTAMP'});
  e.rows.set(e.ref('polizas','policy-alpha'),{...e.rows.get(e.ref('polizas','policy-alpha')),tenantId:e.tenant,
    primaNeta:1800,primaTotal:2401.37,cuotas:10,updatedAt:'UNCHANGED_POLICY_TIMESTAMP'});
  const spec={version:1,operation:'preview',clientId:'client-test',policyIds:['policy-alpha'],updateClient:false,targetAdvisorId:'advisor-beta',
    reason:'Corrección documental sintética de asignación',sourceAuthority:{decisionRef:'synthetic-direction-decision',sourceReference:'synthetic-source.json',
      sourceSha256:'a'.repeat(64),lineRef:'Sheet1:14',period:'2026-10'}};
  const send=(value=spec,extra={},preview=false)=>e.mod[preview?'orbit360ProductOperationalCommandPreview':'orbit360ProductOperationalCommand']({
    auth:{uid:e.uid,token:{}},data:{tenantId:e.tenant,activeRole:options.role||'Dirección',advisorAssignmentCorrection:clone(value),...extra}
  });
  const commit=(preview,value=spec,extra={})=>send({...value,operation:'commit',expectedBefore:clone(preview.expectedBefore),expectedPreviewDigest:preview.previewDigest},extra);
  return{...e,spec,send,commit};
}
function paidHistory(e){
  for(const collection of contract.PRESERVED_COLLECTIONS)e.rows.set(e.ref(collection,'history-'+collection),{
    id:'history-'+collection,tenantId:e.tenant,polizaId:'policy-alpha',clienteId:'client-test',asesorId:'advisor-alpha',pais:'GT',
    estado:collection==='comisiones'?'Liquidada':'Pagado',fechaPago:'2026-10-12',valor:240.14,moneda:'GTQ',extra:{untouched:true}
  });
}
const failed=error=>error.code==='failed-precondition';
test('signed preview reads current paid history with zero writes, then changes only selected advisor metadata',async()=>{
  const e=setup();paidHistory(e);const before=clone([...e.rows]),preview=await e.send();
  assert.equal(preview.readOnly,true);assert.equal(e.writes.length,0);assert.equal(preview.financialWrites,0);
  for(const collection of contract.PRESERVED_COLLECTIONS)assert.equal(preview.preservationFingerprints[collection].count,1);
  const result=await e.commit(preview,e.spec,{requestId:'advcorr_test-one'});
  assert.equal(result.committed,true);assert.equal(result.canonicalReadback,true);assert.equal(result.preservationVerified,true);
  assert.equal(result.historicalAssignmentsPreserved,true);assert.equal(result.readback.length,2);
  const expected=new Map(before),policyKey=e.ref('polizas','policy-alpha');expected.set(policyKey,{...expected.get(policyKey),asesorId:'advisor-beta'});
  for(const [key,value] of expected)assert.deepEqual(clone(e.rows.get(key)),value);
  const business=e.writes.filter(w=>w.p.includes('/data/'));assert.equal(business.length,1);assert.deepEqual(clone(business[0].row),{asesorId:'advisor-beta'});
  const event=e.writes.find(w=>w.row.action==='correct_advisor_assignment');
  assert.equal(event.row.actorUid,e.uid);assert.equal(event.row.financialWrites,0);assert.equal(event.row.sourceProvenance.documentAuthenticatedByServer,false);
});
test('client reassignment is explicit and transaction contains only two advisor patches plus audit and receipt',async()=>{
  const e=setup();paidHistory(e);const spec={...e.spec,updateClient:true},preview=await e.send(spec),result=await e.commit(preview,spec);
  assert.equal(result.summary.clientChanged,true);assert.equal(e.writes.length,4);
  assert.equal(e.rows.get(e.ref('clientes','client-test')).asesorId,'advisor-beta');
  assert.equal(e.rows.get(e.ref('clientes','client-test')).updatedAt,'UNCHANGED_CLIENT_TIMESTAMP');
  assert.equal(e.rows.get(e.ref('polizas','policy-alpha')).updatedAt,'UNCHANGED_POLICY_TIMESTAMP');
});
test('identical signed commit replays without duplicate writes and still checks canonical readback',async()=>{
  const e=setup();paidHistory(e);const preview=await e.send(),extra={requestId:'advcorr_test-replay'};
  const first=await e.commit(preview,e.spec,extra),count=e.writes.length,second=await e.commit(preview,e.spec,extra);
  assert.equal(second.reused,true);assert.equal(second.previewDigest,first.previewDigest);assert.equal(e.writes.length,count);
  const row=e.rows.get(e.ref('comisiones','history-comisiones'));e.rows.set(e.ref('comisiones','history-comisiones'),{...row,valor:1});
  await assert.rejects(e.commit(preview,e.spec,extra),error=>error.details?.reason==='CORRECTION_PRESERVATION_MISMATCH');
  assert.equal(e.writes.length,count);
});
test('reusing another actor request or another intent never claims the previous correction',async()=>{
  const e=setup(),preview=await e.send(),extra={requestId:'advcorr_test-bound'};await e.commit(preview,e.spec,extra);
  await assert.rejects(e.commit(preview,{...e.spec,reason:'Another documented correction reason'},extra),error=>error.code==='already-exists');
  const key=`tenants/${e.tenant}/operationalRequests/${extra.requestId}`,prior=e.rows.get(key);e.rows.set(key,{...prior,actorUid:'different-actor'});
  await assert.rejects(e.commit(preview,e.spec,extra),error=>error.code==='already-exists');
});
test('new payment and edited source, premium, client relationship or advisor invalidate confirmation without writes',async()=>{
  for(const change of ['payment','premium','client','advisor','source']){
    const e=setup(),preview=await e.send(),spec=clone(e.spec),key=e.ref('polizas','policy-alpha');
    if(change==='payment')e.rows.set(e.ref('cobros','new-payment'),{id:'new-payment',tenantId:e.tenant,policyId:'policy-alpha',estado:'Pagado',valor:2});
    if(change==='premium')e.rows.set(key,{...e.rows.get(key),primaTotal:2401.38});
    if(change==='client')e.rows.set(key,{...e.rows.get(key),clienteId:'another-client'});
    if(change==='advisor')e.rows.set(key,{...e.rows.get(key),asesorId:'advisor-other'});
    if(change==='source')spec.sourceAuthority.lineRef='Sheet1:15';
    await assert.rejects(e.commit(preview,spec),failed);assert.equal(e.writes.length,0);
  }
});
test('roles, existing tenant permissions and country scope cannot be expanded by correction intent',async()=>{
  for(const options of [{role:'Operativo'},{role:'Admin'},{role:'AdminTenant'},{role:'SuperAdmin'},{role:'Asesor'},{countries:['CO']},{countries:[]}]){
    const e=setup(options);await assert.rejects(e.send(),error=>error.code==='permission-denied');assert.equal(e.writes.length,0);
  }
  const e=setup(),key=`tenants/${e.tenant}/config/access`,config=e.rows.get(key);config.rolePermissions['Dirección'].polizas.editar=false;e.rows.set(key,config);
  await assert.rejects(e.send(),error=>error.code==='permission-denied');assert.equal(e.writes.length,0);
});
test('Preview endpoint refuses real IDs and forged synthetic flags before any financial or metadata write',async()=>{
  const e=setup();await assert.rejects(e.send(e.spec,{},true),error=>error.code==='permission-denied');
  const spec={...e.spec,clientId:'b4003qa_client',policyIds:['b4003qa_policy'],targetAdvisorId:'b4003qa_advisor'};
  for(const [collection,id,old] of [['clientes',spec.clientId,'client-test'],['polizas',spec.policyIds[0],'policy-alpha'],['asesores',spec.targetAdvisorId,'advisor-beta']]){
    e.rows.set(e.ref(collection,id),{...e.rows.get(e.ref(collection,old)),id,clienteId:spec.clientId});
  }
  await assert.rejects(e.send(spec,{},true),error=>error.code==='permission-denied');assert.equal(e.writes.length,0);
});
test('mixed generic mutations, payable commands and undeclared fields are rejected',async()=>{
  for(const extra of [{mutations:[]},{advisorPayable:{version:1}},{override:true}]){
    const e=setup();await assert.rejects(e.send(e.spec,extra),error=>error.code==='invalid-argument');assert.equal(e.writes.length,0);
  }
});
test('generic advisor writes cannot bypass paid-policy protection even with a correct original advisor',async()=>{
  const e=setup();paidHistory(e);
  for(const expectedBefore of [undefined,{asesorId:'advisor-alpha'}]){
    const mutation={action:'update',collection:'polizas',id:'policy-alpha',payload:{asesorId:'advisor-beta'}};
    if(expectedBefore)mutation.expectedBefore=expectedBefore;
    await assert.rejects(e.generic([mutation]),failed);assert.equal(e.writes.length,0);
  }
});
test('ordinary unpaid advisor edit retains Operativo rights but requires CAS and an assignable advisor',async()=>{
  const e=setup({role:'Operativo'}),mutation={action:'update',collection:'polizas',id:'policy-alpha',payload:{asesorId:'advisor-beta'},expectedBefore:{asesorId:'advisor-alpha'}};
  await assert.rejects(e.generic([{...mutation,expectedBefore:{asesorId:'stale-advisor'}}]),failed);assert.equal(e.writes.length,0);
  const result=await e.generic([mutation]);assert.equal(result.canonicalReadback,true);assert.equal(e.rows.get(e.ref('polizas','policy-alpha')).asesorId,'advisor-beta');
  assert.equal(e.rows.get(e.ref('polizas','policy-alpha')).primaTotal,2401.37);
});
test('a compensating correction uses a fresh preview and preserves all financial rows exactly',async()=>{
  const e=setup();paidHistory(e);const before=clone([...e.rows].filter(([key])=>key.includes('/data/'))),first=await e.send();await e.commit(first);
  const compensation={...e.spec,targetAdvisorId:'advisor-alpha',reason:'Reversión documentada sintética con lectura actual',sourceAuthority:{...e.spec.sourceAuthority,decisionRef:'synthetic-compensation'}};
  const preview=await e.send(compensation);await e.commit(preview,compensation);
  assert.deepEqual(clone([...e.rows].filter(([key])=>key.includes('/data/'))),before);
  assert.equal(e.writes.filter(w=>w.row.action==='correct_advisor_assignment').length,2);
});
test('ordinary Preview metadata CAS permits only the pre-existing canonical synthetic marker',async()=>{
  for(const originalMarked of [false,true]){
    const e=setup({role:'Operativo'}),id='b4003qa_policy-metadata';
    e.rows.set(e.ref('polizas',id),{...e.rows.get(e.ref('polizas','policy-alpha')),id,...(originalMarked?{__syntheticQa:true}:{})});
    const request={auth:{uid:e.uid,token:{}},data:{tenantId:e.tenant,activeRole:'Operativo',mutations:[{
      action:'update',collection:'polizas',id,payload:{asesorId:'advisor-beta',__syntheticQa:true},expectedBefore:{asesorId:'advisor-alpha'}
    }]}};
    if(originalMarked){const result=await e.mod.orbit360ProductOperationalCommandPreview(request);assert.equal(result.canonicalReadback,true);}
    else{await assert.rejects(e.mod.orbit360ProductOperationalCommandPreview(request),error=>error.code==='permission-denied');assert.equal(e.writes.length,0);}
  }
});
