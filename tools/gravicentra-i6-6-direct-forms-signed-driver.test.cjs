'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {configuration,fixtures,assertNoOutboundChannels,assertGeneratedRow,assertSeedRestore,
  deleteSnapshotAfterCheck,waitForBusinessIdle,settleAndClose,validateSignedReport,openDraft}=require('./gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs');
const SOURCE='a'.repeat(40),SUFFIX='unique_01234567',UID='signed_qa_uid';
const BASE={I66_RENEWAL_QA_PHASE:'PREVIEW',I66_PREVIEW_ORIGIN:'https://ays-orbit-360-lab--gi-i66-rc-123-abcd1234.web.app',I66_SOURCE_SHA:SOURCE,I66_PACKAGE_ROOT:'/runner/exact-package'};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};

test('signed driver binds phase, exact permitted origin, source and immutable package; no stale source fallback',()=>{
  assert.deepEqual(configuration(BASE),{phase:'PREVIEW',live:false,origin:BASE.I66_PREVIEW_ORIGIN,source:SOURCE,packageRoot:BASE.I66_PACKAGE_ROOT});
  const live=configuration({...BASE,I66_RENEWAL_QA_PHASE:'LIVE',I66_LIVE_ORIGIN:'https://app.aysseguros.com',I66_APPROVED_LIVE_SOURCE_SHA:SOURCE});
  assert.equal(live.live,true);assert.equal(live.phase,'LIVE');
  for(const patch of [{I66_RENEWAL_QA_PHASE:'DRYRUN'},{I66_SOURCE_SHA:undefined},{I66_SOURCE_SHA:'main'},{I66_PACKAGE_ROOT:'relative'},
    {I66_PREVIEW_ORIGIN:'https://app.aysseguros.com'},{I66_PREVIEW_ORIGIN:BASE.I66_PREVIEW_ORIGIN+'/outside'}])assert.throws(()=>configuration({...BASE,...patch}));
  assert.throws(()=>configuration({...BASE,I66_RENEWAL_QA_PHASE:'LIVE',I66_LIVE_ORIGIN:'https://app.aysseguros.com'}),/SOURCE_PIN_REQUIRED/);
  assert.throws(()=>configuration({...BASE,I66_RENEWAL_QA_PHASE:'LIVE',I66_LIVE_ORIGIN:BASE.I66_PREVIEW_ORIGIN,I66_APPROVED_LIVE_SOURCE_SHA:SOURCE}),/ORIGIN_MISMATCH/);
});

test('fixtures isolate both signed roles with expired UNKNOWN source, no seeded approval and no real adviser or accounts',()=>{
  const carlos=fixtures('operativo',SUFFIX),paula=fixtures('direccion',SUFFIX);
  assert.equal(carlos.rows.length,3);assert.equal(carlos.rows.some(([c])=>c==='gestiones'),false);
  assert.notEqual(carlos.ids.client,paula.ids.client);assert.notEqual(carlos.ids.insurer,paula.ids.insurer);
  for(const fx of [carlos,paula]){
    assert.equal(fx.source.renovable,null);assert.ok(fx.source.vigenciaFin<'2026-11-24');
    assert.equal(fx.source.asesorId,'b4003qa_no_real_advisor');
    for(const [,id,row] of fx.rows){assert.match(id,/^b4003qa_renew_/);assert.equal(row.id,id);assert.equal(row.__syntheticQa,true);assert.equal(row.tenantId,'alianzas-soluciones');}
    assert.deepEqual(fx.rows[1][2].cuentas,[]);assert.deepEqual(fx.rows[1][2].portales,[]);
  }
  assert.throws(()=>fixtures('asesor',SUFFIX));assert.throws(()=>fixtures('operativo','../customer'));
});

test('no outbound profile rejects external, unknown and malformed channels before any business submission',()=>{
  assert.deepEqual(assertNoOutboundChannels(),['portal','in_app']);
  assert.deepEqual(assertNoOutboundChannels({notificationChannels:['portal','in_app','topbar','tarea']}),['portal','in_app','topbar','tarea']);
  for(const channel of ['email','whatsapp','sms','EMAIL','unknown'])assert.throws(()=>assertNoOutboundChannels({notificationChannels:['in_app',channel]}),/EXTERNAL_NOTIFICATION/);
  assert.throws(()=>assertNoOutboundChannels({notificationChannels:'email'}),/CHANNEL_SCHEMA/);
});

test('restoration accepts only unique synthetic lineage and signed management identity',()=>{
  const fx=fixtures('operativo',SUFFIX),context={ids:fx.ids,policyIds:new Set([fx.ids.source,'pol_successor']),managementIds:new Set(['ges_renew','ges_end']),operationIds:new Set(['op_exact']),uid:UID};
  const base={tenantId:'alianzas-soluciones',clienteId:fx.ids.client};
  assert.doesNotThrow(()=>assertGeneratedRow('polizas',fx.source,context));
  assert.doesNotThrow(()=>assertGeneratedRow('polizas',{...base,id:'pol_successor',renuevaDe:fx.ids.source},context));
  assert.doesNotThrow(()=>assertGeneratedRow('gestiones',{...base,id:'ges_end',polizaId:fx.ids.source,workflowType:'endorsement_request',createdByUid:UID},context));
  assert.doesNotThrow(()=>assertGeneratedRow('recibosEsperados',{...base,polizaId:'pol_successor'},context));
  assert.doesNotThrow(()=>assertGeneratedRow('actividades',{...base,gestionId:'ges_renew'},context));
  assert.doesNotThrow(()=>assertGeneratedRow('actividades',{...base,operacionId:'op_exact'},context));
  for(const [c,row] of [
    ['polizas',{...fx.source,__syntheticQa:false}],['polizas',{...base,id:'pol_real',renuevaDe:'real_source'}],
    ['gestiones',{...base,id:'ges_end',polizaId:fx.ids.source,workflowType:'endorsement_request',createdByUid:'other'}],
    ['recibosEsperados',{...base,polizaId:fx.ids.source}],['actividades',{...base,operationId:'other'}],
    ['actividades',{...base,clienteId:'real_customer',gestionId:'ges_renew'}],['finmovs',{...base,operationId:'op_exact'}]
  ])assert.throws(()=>assertGeneratedRow(c,row,context));
});

test('client restore admits only canonical derived state and actor metadata; Preview seeds stay byte-equivalent',()=>{
  const fx=fixtures('operativo',SUFFIX),seed=fx.rows[0][2],opts={live:true,uid:UID};
  assert.doesNotThrow(()=>assertSeedRestore('clientes',seed,seed,opts));
  const derived={...seed,estado:'activo',estadoOperativo:'activo',estadoActualizado:'2026-11-24T12:00:00.000Z',updatedAt:'2026-11-24T12:00:00.000Z',updatedByUid:UID,updatedByEmail:'qa@example.invalid'};
  assert.doesNotThrow(()=>assertSeedRestore('clientes',derived,seed,opts));
  for(const patch of [{nombre:'changed by somebody else'},{asesorId:'real_advisor'},{documentos:['foreign']},{updatedByUid:'other'},{estado:'inactivo'},{__syntheticQa:false}])assert.throws(()=>assertSeedRestore('clientes',{...derived,...patch},seed,opts));
  assert.throws(()=>assertSeedRestore('clientes',derived,seed,{...opts,live:false}),/SEED_CHANGED/);
  assert.throws(()=>assertSeedRestore('aseguradoras',{...fx.rows[1][2],cuentas:['real']},fx.rows[1][2],opts),/SEED_CHANGED/);
});

test('restoration checks identity before compare-and-delete and propagates version conflicts without fallback',async()=>{
  const calls=[],version={seconds:12,nanoseconds:34},snapshot={exists:true,updateTime:version,data:()=>({id:'qa'}),ref:{delete:async precondition=>calls.push(precondition)}};
  await deleteSnapshotAfterCheck(snapshot,row=>assert.equal(row.id,'qa'));
  assert.deepEqual(calls,[{lastUpdateTime:version}]);
  await assert.rejects(deleteSnapshotAfterCheck(snapshot,()=>{throw Error('IDENTITY_MISMATCH');}),/IDENTITY_MISMATCH/);assert.equal(calls.length,1);
  await assert.rejects(deleteSnapshotAfterCheck({...snapshot,updateTime:undefined},()=>{}),/VERSION_REQUIRED/);assert.equal(calls.length,1);
  await assert.rejects(deleteSnapshotAfterCheck({...snapshot,ref:{delete:async precondition=>{calls.push(precondition);throw Error('CONCURRENT_UPDATE');}}},()=>{}),/CONCURRENT_UPDATE/);assert.equal(calls.length,2);
});

test('restore barrier waits for the real writer pending counter before closing the session or allowing deletion',async()=>{
  const done=deferred(),events=[],previous=global.window;
  const page={waitForFunction:async(fn,arg,options)=>{
    events.push('wait');assert.equal(options.timeout,30000);assert.equal(arg,null);
    global.window={Orbit:{store:{_operationalWriteStatus:()=>({pending:1})}}};assert.equal(fn(),false);
    await done.promise;global.window.Orbit.store._operationalWriteStatus=()=>({pending:0});assert.equal(fn(),true);events.push('idle');
  }};
  try{
    const restore=settleAndClose({close:async()=>events.push('close')},page,true).then(()=>events.push('restore-may-start'));
    await Promise.resolve();assert.deepEqual(events,['wait']);
    done.resolve();await restore;assert.deepEqual(events,['wait','idle','close','restore-may-start']);
  }finally{global.window=previous;}
});

test('failed writer drain closes the browser but prevents restoration from claiming completion',async()=>{
  const events=[];
  await assert.rejects(settleAndClose({close:async()=>events.push('close')},{waitForFunction:async()=>{throw Error('PENDING_WRITE_HOLD');}},true).then(()=>events.push('delete')),/PENDING_WRITE_HOLD/);
  assert.deepEqual(events,['close']);
  await settleAndClose({close:async()=>events.push('no-session-close')},null,false);assert.deepEqual(events,['close','no-session-close']);
});

test('public entry waits for the visible inherited form, edits without source writes, and never shortcuts the approval decision',async()=>{
  const fx=fixtures('operativo',SUFFIX),visible=deferred(),events=[],values={num:fx.source.numero,asg:fx.source.aseguradoraId,start:fx.source.vigenciaFin,end:'2027-11-21',prod:fx.source.producto,freq:fx.source.frecuencia,payments:'1',form:fx.source.formaPago,conduct:fx.source.conducto,net:'1000'};
  const form={waitFor:async options=>{assert.equal(options.state,'visible');events.push('wait-visible');await visible.promise;events.push('visible');},locator:selector=>{
    const key=selector.replace('#rend-','');return {inputValue:async()=>{assert.ok(events.includes('visible'));return values[key];},isEditable:async()=>true,fill:async value=>{events.push('edit-'+key);values[key]=value;}};
  }};
  const page={evaluate:async(fn,arg)=>{if(typeof arg==='string'){events.push('read-source');return fx.source.numero;}events.push('public-'+arg.entry);assert.equal(arg.id,fx.source.id);},locator:selector=>{
    if(selector==='#renewal-decision-v1200')return{locator:sub=>({click:async()=>{assert.equal(sub,'[data-direct]');events.push('click-direct');}})};
    if(selector==='#ops-direct-renewal-v1201')return form;
    if(selector==='#renewal-direct-approval-v1201')return{count:async()=>0};
    throw Error('Unexpected locator '+selector);
  }};
  const pending=openDraft(page,'Cliente360',fx.source);await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events,['public-Cliente360','click-direct','wait-visible']);
  visible.resolve();assert.equal(await pending,form);assert.deepEqual(events.slice(-3),['edit-num','read-source','edit-num']);assert.equal(values.num,fx.source.numero);
  events.length=0;await openDraft(page,'Renovaciones',fx.source);assert.equal(events[0],'public-Renovaciones');
  await assert.rejects(openDraft(page,'Ops',fx.source),/UNKNOWN_PUBLIC_ENTRY/);
});

test('missing write adapter never satisfies the idle barrier',async()=>{
  const previous=global.window;
  try{
    await waitForBusinessIdle({waitForFunction:async fn=>{global.window={Orbit:{store:{}}};assert.equal(fn(),false);}});
  }finally{global.window=previous;}
});

function signedReport(phase){
  const live=phase==='LIVE';
  return {schema:'I66_DIRECT_RENEWAL_ISSUED_ENDORSEMENT_SIGNED_UI_V1',phase,sourceSha:SOURCE,buildId:'exact-build-24',
    status:live?'SIGNED_LIVE_DIRECT_FORMS_NORMAL_UI_PASS':'SIGNED_PREVIEW_DIRECT_FORMS_READONLY_PASS',realCustomerWrites:0,externalMessages:0,restoreComplete:true,
    actors:['operativo','direccion'].map(role=>({role,restored:true,endorsementDraft:true,readonly:!live,pageErrorCount:0,
      status:live?'SIGNED_LIVE_NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY_PASS':'SIGNED_PREVIEW_ENTRIES_READONLY_PASS',
      entries:['Renovaciones','Cliente360'].map(entry=>({entry,expiredUnknown:true,inheritedEditable:true,noIntermediateOps:true,noDraftWrites:true})),
      writes:live?{normalUi:true,entry:role==='operativo'?'Renovaciones':'Cliente360',successors:1,receipts:1,portfolio:1,linkedManagement:true,reload:true,idempotentReplay:true}:'NOT_EXECUTED_PREVIEW_RELATIONS_PROTECTED',
      ...(live?{endorsementWrite:{normalUi:true,policyReadback:true,closedManagement:true,reload:true,idempotentReplay:true}}:{})
    }))};
}
const validate=(report,phase=report.phase)=>validateSignedReport(report,{phase,sourceSha:SOURCE,buildId:'exact-build-24'});

test('signed report has exact phase coverage; readonly Preview cannot satisfy LIVE',()=>{
  const preview=validate(signedReport('PREVIEW')),live=validate(signedReport('LIVE'));
  assert.deepEqual(preview,{status:'PASS',cleanup:'PASS',checks:44,phase:'PREVIEW',coverage:'PUBLIC_ENTRIES_READONLY'});
  assert.deepEqual(live,{status:'PASS',cleanup:'PASS',checks:66,phase:'LIVE',coverage:'NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY'});
  assert.throws(()=>validate(signedReport('PREVIEW'),'LIVE'),/REPORT_PHASE/);
  assert.throws(()=>validateSignedReport(signedReport('LIVE'),{phase:'LIVE',sourceSha:SOURCE,buildId:''}),/BUILD_REQUIRED/);
});

test('signed report rejects stale artifact, partial actors, wrong entry, errors, incomplete restoration and real/outbound writes',()=>{
  for(const phase of ['PREVIEW','LIVE'])for(const mutate of [
    r=>{r.schema='OTHER';},r=>{r.sourceSha='b'.repeat(40);},r=>{r.buildId='other';},r=>{r.status='PASS';},r=>{r.phase='UNKNOWN';},
    r=>{r.restoreComplete=false;},r=>{r.realCustomerWrites=1;},r=>{r.externalMessages=1;},r=>{r.actors.pop();},
    r=>{r.actors[1].role='operativo';},r=>{r.actors[0].restored=false;},r=>{r.actors[0].endorsementDraft=false;},r=>{r.actors[0].pageErrorCount=1;},
    r=>{r.actors[0].entries.pop();},r=>{r.actors[0].entries[1].entry='Ops';},r=>{r.actors[0].entries[0].expiredUnknown=false;},
    r=>{r.actors[0].entries[0].inheritedEditable=false;},r=>{r.actors[0].entries[1].noIntermediateOps=false;},r=>{r.actors[0].entries[1].noDraftWrites=false;}
  ]){const report=signedReport(phase);mutate(report);assert.throws(()=>validate(report,phase));}
});

test('signed report requires actual LIVE UI write/readback/reload/replay and refuses any Preview write PASS',()=>{
  for(const mutate of [
    r=>{r.actors[0].readonly=true;},r=>{r.actors[0].writes.entry='Cliente360';},r=>{r.actors[0].writes.normalUi=false;},
    r=>{r.actors[0].writes.successors=2;},r=>{r.actors[0].writes.receipts=0;},r=>{r.actors[0].writes.portfolio=0;},
    r=>{r.actors[0].writes.linkedManagement=false;},r=>{r.actors[0].writes.reload=false;},r=>{r.actors[0].writes.idempotentReplay=false;},
    r=>{delete r.actors[1].endorsementWrite;},r=>{r.actors[0].endorsementWrite.policyReadback=false;},r=>{r.actors[0].endorsementWrite.closedManagement=false;},
    r=>{r.actors[0].endorsementWrite.reload=false;},r=>{r.actors[0].endorsementWrite.idempotentReplay=false;}
  ]){const report=signedReport('LIVE');mutate(report);assert.throws(()=>validate(report));}
  for(const mutate of [r=>{r.actors[0].readonly=false;},r=>{r.actors[0].writes={normalUi:true};},r=>{r.actors[0].endorsementWrite={normalUi:true};}]){
    const report=signedReport('PREVIEW');mutate(report);assert.throws(()=>validate(report));
  }
});
