'use strict';
// Runs the real write facade and Preview transport against isolated in-memory
// canonical records. A passing contract is not signed Preview/LIVE acceptance.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../functions/advisor-assignment-correction-contract');
const root=path.resolve(__dirname,'..'),clone=value=>JSON.parse(JSON.stringify(value));
const fixtureFile=path.join(__dirname,'gravicentra-i6-6-policy-metadata-preservation.test.cjs');
const fixtureModule={exports:{}};
vm.runInNewContext(fs.readFileSync(fixtureFile,'utf8')+'\nmodule.exports={harness};',{
  require:name=>name==='node:test'?()=>{}:require(name),module:fixtureModule,__dirname,console,
  TextEncoder,Buffer,setTimeout,clearTimeout
},{filename:fixtureFile});
function env({preview=false,role='Dirección',mutateReceipt}={}){
  const h=fixtureModule.exports.harness({facade:true,paid:true,preview,role});
  h.context.crypto=require('node:crypto').webcrypto;h.context.TextEncoder=TextEncoder;
  const server=clone(h.rows),calls=[],receipts=new Map();let writes=0;
  const spec={version:1,operation:'preview',clientId:h.policy.clienteId,policyIds:[h.policy.id],updateClient:false,
    targetAdvisorId:'b4003qa_new_advisor',reason:'Corrección documentada de prueba sintética',
    sourceAuthority:{decisionRef:'QA-DIRECTION-ASSIGNMENT',sourceReference:'qa-original.csv',sourceSha256:'a'.repeat(64),lineRef:'Hoja QA renglón 7',period:'2026-10'}};
  const context=()=>({tenantId:'qa_tenant',actor:{uid:'qa_actor',activeRole:'Dirección',countries:['GT']},scopeAuthorized:true,
    client:server.clientes[0],policies:server.polizas,targetAdvisor:{...server.asesores[1],roles:['Asesor'],activo:true},
    preservedRows:Object.fromEntries(C.PRESERVED_COLLECTIONS.map(collection=>[collection,server[collection]||[]]))});
  h.Orbit.productRuntimeBrowserProvidersP0.callFunction=async(name,payload,region)=>{
    calls.push(clone({name,payload,region}));
    const input=payload.advisorAssignmentCorrection;
    let receipt;
    if(input.operation==='preview')receipt={ok:true,...C.buildPlan(input,context())};
    else{
      const key=payload.requestId||'advcorr_'+input.expectedPreviewDigest.slice(0,40);
      const prior=receipts.get(key),plan=prior||C.buildPlan(input,context());
      if(!prior){
        plan.changes.forEach(change=>Object.assign(server[change.collection].find(row=>row.id===change.id),change.patch));
        writes++;receipts.set(key,clone(plan));
      }
      receipt={ok:true,...plan,...C.verifyReadback(plan,context()),readOnly:false,committed:true,reused:!!prior,requestId:key,
        readback:[{collection:'clientes',id:server.clientes[0].id,record:clone(server.clientes[0])},
          ...server.polizas.map(row=>({collection:'polizas',id:row.id,record:clone(row)}))]};
    }
    if(mutateReceipt)mutateReceipt(receipt,input.operation);
    return clone(receipt);
  };
  return{...h,server,calls,spec,writeCount:()=>writes,async preview(){return h.Orbit.store.correctAdvisorAssignment(spec);},
    commit(plan,changes={}){return h.Orbit.store.correctAdvisorAssignment({...spec,operation:'commit',expectedBefore:plan.expectedBefore,
      expectedPreviewDigest:plan.previewDigest,...changes},{requestId:'advcorr_'+plan.previewDigest.slice(0,40)});}};
}

test('adapter previews without changing projection then publishes only verified committed advisor metadata',async()=>{
  const e=env(),before=clone(e.rows),preview=await e.preview();
  assert.equal(e.writeCount(),0);assert.deepEqual(clone(e.rows),before);
  assert.equal(e.Orbit.store.get('polizas',e.policy.id).asesorId,'b4003qa_old_advisor');
  const committed=await e.commit(preview);
  assert.equal(committed.preservationVerified,true);assert.equal(e.writeCount(),1);
  assert.equal(e.Orbit.store.get('polizas',e.policy.id).asesorId,e.spec.targetAdvisorId);
  assert.equal(e.Orbit.store.get('polizas',e.policy.id).primaTotal,2534.57);
  assert.deepEqual(clone(e.rows),before,'base read authority is not overwritten by the facade');
  assert.deepEqual(e.server.cobros,before.cobros);assert.deepEqual(e.server.recibosEsperados,before.recibosEsperados);
  assert.equal(e.calls[0].name,'orbit360ProductOperationalCommand');
  assert.equal(e.calls[0].payload.mutations,undefined);
});
test('Preview adapter selects existing isolated callable/region and keeps synthetic correction envelope',async()=>{
  const e=env({preview:true});await e.preview();
  assert.equal(e.calls[0].name,'orbit360ProductOperationalCommandPreview');assert.equal(e.calls[0].region,'us-east1');
  assert.equal(e.calls[0].payload.advisorAssignmentCorrection.clientId,e.policy.clienteId);
  assert.equal(e.calls[0].payload.advisorAssignmentCorrection.syntheticQa,undefined);
});
test('adapter requires a matching signed preview and source before a commit is sent',async()=>{
  const e=env();
  await assert.rejects(e.commit({expectedBefore:[],previewDigest:'b'.repeat(64)}),/CORRECTION_PREVIEW_REQUIRED/);
  assert.equal(e.calls.length,0);
  const preview=await e.preview();
  await assert.rejects(e.commit(preview,{sourceAuthority:{...e.spec.sourceAuthority,lineRef:'Hoja distinta'}}),/CORRECTION_PREVIEW_REQUIRED/);
  assert.equal(e.calls.length,1);assert.equal(e.writeCount(),0);
});
test('adapter rejects wrong actor, target set, financial mutation, missing collection proof and unbound source',async()=>{
  const alterations=[
    receipt=>{receipt.actorUid='some_other_user';},
    receipt=>{receipt.expectedBefore[0].id='foreign_client';},
    receipt=>{receipt.changes[0].patch.primaTotal=1;},
    receipt=>{delete receipt.preservationFingerprints.cobros;},
    receipt=>{receipt.intent.sourceAuthority.lineRef='unbound_source';}
  ];
  for(const alter of alterations){
    const e=env({mutateReceipt:alter});await assert.rejects(e.preview(),/CORRECTION_/);
    assert.equal(e.writeCount(),0);assert.equal(e.Orbit.store.get('polizas',e.policy.id).asesorId,'b4003qa_old_advisor');
  }
});
test('adapter never projects an incomplete, altered or financially different commit readback',async()=>{
  const alterations=[
    receipt=>{receipt.canonicalReadback=false;},
    receipt=>{receipt.preservationVerified=false;},
    receipt=>{receipt.readback=receipt.readback.slice(1);},
    receipt=>{receipt.readback[1].record.primaTotal=1;},
    receipt=>{receipt.readback[1].record.asesorId='foreign_advisor';},
    receipt=>{receipt.preservationFingerprints.comisiones.digest='c'.repeat(64);}
  ];
  for(const alter of alterations){
    const e=env({mutateReceipt:(r,operation)=>{if(operation==='commit')alter(r);}}),preview=await e.preview();
    await assert.rejects(e.commit(preview),/CORRECTION_/);
    assert.equal(e.Orbit.store.get('polizas',e.policy.id).asesorId,'b4003qa_old_advisor','no projection without whole proof');
  }
});
test('an exact retry reuses the request and cannot duplicate correction writes',async()=>{
  const e=env(),preview=await e.preview();await e.commit(preview);const replay=await e.commit(preview);
  assert.equal(replay.reused,true);assert.equal(e.writeCount(),1);
  assert.equal(e.calls[1].payload.requestId,e.calls[2].payload.requestId);
});
test('role denial and missing digest runtime stop before projecting a correction',async()=>{
  const denied=env({role:'Operativo'});await assert.rejects(denied.preview(),/CORRECTION_DIRECTION_REQUIRED/);assert.equal(denied.calls.length,0);
  const e=env(),preview=await e.preview();delete e.context.crypto;
  await assert.rejects(e.commit(preview),/CORRECTION_DIGEST_BROWSER_UNAVAILABLE/);
  assert.equal(e.Orbit.store.get('polizas',e.policy.id).asesorId,'b4003qa_old_advisor');
});
test('ordinary unpaid metadata carries advisor preimage CAS and optional renewable CAS through the facade',async()=>{
  for(const renewable of [false,true]){
    const h=fixtureModule.exports.harness({facade:true});
    const patch={asesorId:'b4003qa_new_advisor',...(renewable?{renovable:false}:{})};
    const result=await h.Orbit.policyReceipts.updatePolicy(h.policy.id,patch,{motivo:'Cambio administrativo documentado'});
    assert.equal(result.ok,true,result.error);
    const mutation=h.calls[0].input.mutations.find(row=>row.collection==='polizas');
    assert.deepEqual(clone(mutation.expectedBefore),{asesorId:'b4003qa_old_advisor',...(renewable?{renovable:true}:{})});
    assert.deepEqual(Object.keys(mutation.payload).sort(),Object.keys(patch).sort());
  }
});

function previewGate(){
  const file=path.join(root,'orbit360-platform/core/product-runtime-browser-providers-p0.js');
  const original=fs.readFileSync(file,'utf8'),needle='window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze(';
  assert.ok(original.includes(needle));
  const scope={window:{Orbit:{},location:{hostname:'ays-orbit-360-lab--gi-i66-rc-qa.web.app'}},console};
  vm.runInNewContext(original.replace(needle,'window.__testPreviewGate=i66ReadOnlyCallableError;'+needle),scope,{filename:file});
  return scope.window.__testPreviewGate;
}
test('browser Preview guard allows only bounded explicit synthetic assignment correction on existing endpoint',()=>{
  const gate=previewGate(),e=env(),data={tenantId:'alianzas-soluciones',activeRole:'Dirección',advisorAssignmentCorrection:e.spec};
  assert.equal(gate('orbit360ProductOperationalCommandPreview',data,'us-east1'),'');
  assert.equal(gate('orbit360ProductOperationalCommandPreview',{...data,advisorAssignmentCorrection:{...e.spec,operation:'commit'}},'us-east1'),'');
  assert.equal(gate('orbit360ProductOperationalCommandPreview',data,'us-central1'),'I66_PREVIEW_REGION_DENIED');
  assert.equal(gate('orbit360ProductOperationalCommand',data,'us-east1'),'I66_PREVIEW_MUTATION_CALLABLE_DENIED');
});
test('Preview guard refuses any real target, generic mutations, mixed command or duplicate/oversized target list',()=>{
  const gate=previewGate(),e=env(),data={tenantId:'alianzas-soluciones',advisorAssignmentCorrection:e.spec};
  const bad=[
    {...data,tenantId:'foreign_tenant'},
    {...data,mutations:[]},
    {...data,advisorPayable:{version:1}},
    ...[{clientId:'real_client'},{targetAdvisorId:'real_advisor'},{policyIds:['real_policy']},
      {policyIds:[e.policy.id,e.policy.id]},
      {policyIds:Array.from({length:20},(_,i)=>'b4003qa_policy_'+i),updateClient:true}]
      .map(patch=>({...data,advisorAssignmentCorrection:{...e.spec,...patch}}))
  ];
  for(const input of bad)assert.equal(gate('orbit360ProductOperationalCommandPreview',input,'us-east1'),'I66_PREVIEW_MUTATION_CALLABLE_DENIED');
});
