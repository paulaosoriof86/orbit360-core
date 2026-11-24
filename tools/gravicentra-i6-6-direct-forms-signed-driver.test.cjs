'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {configuration,fixtures,assertNoOutboundChannels,assertGeneratedRow,assertSeedRestore,
  deleteSnapshotAfterCheck,waitForBusinessIdle,settleAndClose,validateSignedReport,openDraft,
  safeDirectFormsSnapshot,safeDirectFormsClickFailure,safeDirectFormsFailureCode,captureDirectFormsSnapshot,clickDirectDecision,requireExistingLegalReadiness,safeDirectFormsDiagnosticReport}=require('./gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs');
const SOURCE='a'.repeat(40),BUILD='gi-i66-'+SOURCE.slice(0,12)+'-57f234755dc1',SUFFIX='unique_01234567',UID='signed_qa_uid';
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
  const page={evaluate:async(fn,arg)=>{if(fn.name==='directFormsUiSnapshot')return null;if(typeof arg==='string'){events.push('read-source');return fx.source.numero;}events.push('public-'+arg.entry);assert.equal(arg.id,fx.source.id);},locator:selector=>{
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
  return {schema:'I66_DIRECT_RENEWAL_ISSUED_ENDORSEMENT_SIGNED_UI_V1',phase,sourceSha:SOURCE,buildId:BUILD,
    status:live?'SIGNED_LIVE_DIRECT_FORMS_NORMAL_UI_PASS':'SIGNED_PREVIEW_DIRECT_FORMS_READONLY_PASS',realCustomerWrites:0,externalMessages:0,restoreComplete:true,
    actors:['operativo','direccion'].map(role=>({role,...(role==='operativo'?{personalLegalAcceptance:personalProof(personalFixture(phase))}:{}),restored:true,endorsementDraft:true,readonly:!live,pageErrorCount:0,
      status:live?'SIGNED_LIVE_NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY_PASS':'SIGNED_PREVIEW_ENTRIES_READONLY_PASS',
      entries:['Renovaciones','Cliente360'].map(entry=>({entry,expiredUnknown:true,inheritedEditable:true,noIntermediateOps:true,noDraftWrites:true})),
      writes:live?{normalUi:true,entry:role==='operativo'?'Renovaciones':'Cliente360',successors:1,receipts:1,portfolio:1,linkedManagement:true,reload:true,idempotentReplay:true}:'NOT_EXECUTED_PREVIEW_RELATIONS_PROTECTED',
      ...(live?{endorsementWrite:{normalUi:true,policyReadback:true,closedManagement:true,reload:true,idempotentReplay:true}}:{})
    }))};
}
const validate=(report,phase=report.phase)=>validateSignedReport(report,{phase,sourceSha:SOURCE,buildId:BUILD,personalAuthority:personalFixture(phase).authority});

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

test('click diagnostics inspect the complete error before truncation without retaining actor, URL or arbitrary DOM text',()=>{
  const error=Object.assign(Error('locator.click Timeout 30000ms\n'+('repeated call log '.repeat(70))+'\n<div data-legal-gate="user:private@example.invalid">Secret wording</div> intercepts pointer events\nhttps://private.invalid/token'),{name:'TimeoutError'});
  const diagnostic=safeDirectFormsClickFailure(error);
  assert.equal(diagnostic.failureClass,'TIMEOUT_ERROR');assert.equal(diagnostic.actionability.pointerInterception,true);
  assert.equal(diagnostic.knownInterceptors.legalGate,true);assert.equal(diagnostic.knownInterceptors.authRestoring,false);
  assert.doesNotMatch(JSON.stringify(diagnostic),/private|Secret|user:|https|token|repeated/);
  for(const [message,key] of [['element is not visible','notVisible'],['element is not enabled','notEnabled'],['element is not stable','notStable'],
    ['element was detached','detached'],['element is outside of the viewport','outsideViewport']])assert.equal(safeDirectFormsClickFailure(Error(message)).actionability[key],true);
});

test('safe snapshot whitelists pointer state and never exports text, identifiers or nonfinite coordinates',()=>{
  const result=safeDirectFormsSnapshot({snapshotStatus:'CAPTURED',target:'RENEWAL_DIRECT',targetCount:1,targetConnected:true,targetVisible:true,targetEnabled:true,
    rect:{x:12.4,y:-3.5,width:Infinity,height:100001,customerId:'private'},centerInViewport:true,targetReceivesPointer:false,
    topTag:'SCRIPT',topOwner:'LEGAL_GATE',legalOverlayCount:1,legalOverlayAtTarget:true,authRestoring:false,appStarted:true,
    text:'private@example.invalid',scope:'user:private',topId:'private-customer'});
  assert.deepEqual(result.rect,{x:12,y:-3,width:null,height:null});assert.equal(result.topTag,null);assert.equal(result.topOwner,'LEGAL_GATE');
  assert.equal(result.targetReceivesPointer,false);assert.doesNotMatch(JSON.stringify(result),/private|customer|user:/);
  assert.equal(safeDirectFormsSnapshot({target:'foreign-selector'}).target,'UNKNOWN');
});

test('failed normal click preserves before and failure snapshots before caller cleanup, rethrows original and never forces the click',async()=>{
  const events=[],diagnostic={},failure=Object.assign(Error('data-legal-gate intercepts pointer events'),{name:'TimeoutError'});
  const page={evaluate:async(fn,input)=>{assert.equal(fn.name,'directFormsUiSnapshot');assert.equal(input.selector,'#renewal-decision-v1200 [data-direct]');events.push('snapshot');return {snapshotStatus:'CAPTURED',target:'RENEWAL_DIRECT',targetCount:1,topOwner:events.length===1?'TARGET':'LEGAL_GATE'};},
    locator:selector=>{assert.equal(selector,'#renewal-decision-v1200');return{locator:inner=>{assert.equal(inner,'[data-direct]');return{click:async options=>{assert.equal(options,undefined);events.push('click');throw failure;}};}};}};
  await assert.rejects(clickDirectDecision(page,diagnostic),e=>e===failure);events.push('cleanup');
  assert.deepEqual(events,['snapshot','click','snapshot','cleanup']);assert.equal(diagnostic.beforeClick.topOwner,'TARGET');assert.equal(diagnostic.onFailure.topOwner,'LEGAL_GATE');
  assert.equal(diagnostic.actionability.pointerInterception,true);assert.equal(diagnostic.knownInterceptors.legalGate,true);
});

test('unavailable diagnostic capture never masks the original click error and unknown selector is denied',async()=>{
  const failure=Error('original'),diagnostic={},page={evaluate:async()=>{throw Error('closed');},locator:()=>({locator:()=>({click:async()=>{throw failure;}})})};
  await assert.rejects(clickDirectDecision(page,diagnostic),e=>e===failure);
  assert.equal(diagnostic.beforeClick.snapshotStatus,'UNAVAILABLE');assert.equal(diagnostic.onFailure.snapshotStatus,'UNAVAILABLE');
  await assert.rejects(captureDirectFormsSnapshot(page,'UNREVIEWED_TARGET'),/TARGET_DENIED/);
});

function withLegalRuntime({recordPatch={},done=true,pending=false,gates=0,restoring=false,started=true}={}){
  const previous={window:global.window,document:global.document,location:global.location};
  const actor={uid:'qa_signed_actor',email:'qa@example.invalid'},scope='user:'+actor.email,origin='https://example.invalid';
  const record={aceptado:true,version:'2.0',tipo:'interno',pais:'GT',empresa:'Alianzas & Soluciones',actorUid:actor.uid,scopeId:scope,origin,
    acceptanceMethod:'VISIBLE_CHECKBOX_AND_BUTTON',fecha:'2026-11-24T12:00:00Z',clausulas:['confidencialidad','tratamiento_datos','descargo_ia'],...recordPatch};
  const state={doneScopes:{[scope]:done},pendingScopes:{[scope]:pending}},writes=[];
  global.window={Orbit:{auth:{user:()=>actor},productAppP0:{isStarted:()=>started},legal:{__gateState:state,aceptaciones:()=>({[scope]:record}),yaAcepto:()=>record.aceptado===true&&record.version==='2.0',
    gate:()=>{writes.push('gate');throw Error('MUST_NOT_INVOKE_GATE');},registrar:()=>{writes.push('registrar');throw Error('MUST_NOT_ACCEPT');}}}};
  global.document={documentElement:{getAttribute:()=>restoring?'1':null},querySelectorAll:()=>Array.from({length:gates})};global.location={origin};
  return {scope,state,record,writes,restore:()=>Object.assign(global,previous)};
}

test('readiness waits for canonical delayed legal outcome; zero overlays before its timer cannot pass',async()=>{
  const h=withLegalRuntime({done:false,pending:false}),released=deferred(),events=[];
  const page={waitForFunction:async(fn,arg,options)=>{assert.equal(options.timeout,3000);assert.equal(arg,null);assert.equal(fn(),false);events.push('await-owner');await released.promise;
    h.state.pendingScopes[h.scope]=true;assert.equal(fn(),true);events.push('owner-pending');},evaluate:async fn=>{events.push('read-outcome');return fn();}};
  try{
    const waiting=requireExistingLegalReadiness(page);await Promise.resolve();assert.deepEqual(events,['await-owner']);released.resolve();
    await assert.rejects(waiting,/EXISTING_ACTOR_LEGAL_ACCEPTANCE_REQUIRED/);assert.deepEqual(events,['await-owner','owner-pending','read-outcome']);assert.deepEqual(h.writes,[]);
  }finally{h.restore();}
});

test('readiness uses an already recorded exact runtime acceptance without seeding or accepting anything',async()=>{
  const h=withLegalRuntime();try{
    const result=await requireExistingLegalReadiness({waitForFunction:async fn=>assert.equal(fn(),true),evaluate:async fn=>fn()});
    assert.equal(result.existingAcceptanceMatchesRuntime,true);assert.equal(result.legalOwnerCompleted,true);assert.equal(result.legalOverlayCount,0);assert.deepEqual(h.writes,[]);
    assert.doesNotMatch(JSON.stringify(result),/qa_signed_actor|qa@example|https:/);
  }finally{h.restore();}
});

test('readiness rejects another actor, origin, version, country, clauses or fabricated method despite a completed legal owner',async()=>{
  for(const recordPatch of [{actorUid:'other'},{scopeId:'user:other'},{origin:'https://other.invalid'},{version:'1.0'},{pais:'CO'},{empresa:'Another company'},
    {tipo:'socio'},{aceptado:false},{acceptanceMethod:'QA_SEEDED'},{fecha:'invalid'},{clausulas:['confidencialidad']},
    {clausulas:['tratamiento_datos','confidencialidad','descargo_ia']}]){
    const h=withLegalRuntime({recordPatch});try{
      await assert.rejects(requireExistingLegalReadiness({waitForFunction:async fn=>assert.equal(fn(),true),evaluate:async fn=>fn()}),/EXISTING_ACTOR_LEGAL_ACCEPTANCE_REQUIRED/);assert.deepEqual(h.writes,[]);
    }finally{h.restore();}
  }
});

test('pending gate or startup overlay cannot pass readiness even with an otherwise matching recorded acceptance',async()=>{
  for(const options of [{pending:true},{gates:1},{restoring:true},{started:false}]){
    const h=withLegalRuntime(options);try{await assert.rejects(requireExistingLegalReadiness({waitForFunction:async fn=>assert.equal(fn(),true),evaluate:async fn=>fn()}));assert.deepEqual(h.writes,[]);}finally{h.restore();}
  }
});

test('failure export preserves safe direct-forms proof after restore and never reclassifies it as acceptance',()=>{
  const out=safeDirectFormsDiagnosticReport({phase:'PREVIEW',sourceSha:SOURCE,status:'PASS',email:'private@example.invalid',actors:[{role:'operativo',restored:true,status:'PASS',failureStage:'BOTH_PUBLIC_RENEWAL_ENTRIES',entries:[],
    clickDiagnostic:{beforeClick:{snapshotStatus:'CAPTURED',target:'RENEWAL_DIRECT',targetCount:1,topOwner:'TARGET'},onFailure:{snapshotStatus:'CAPTURED',target:'RENEWAL_DIRECT',topOwner:'LEGAL_GATE'},
      failureClass:'TIMEOUT_ERROR',actionability:{pointerInterception:true,rawError:'private'},knownInterceptors:{legalGate:true,rawScope:'private'},arbitrary:'private'},failureUi:{snapshotStatus:'CAPTURED',topOwner:'LEGAL_GATE',text:'private'}}]});
  assert.equal(out.owner,'DIRECT_FORMS');assert.equal(out.status,'FAILED_NOT_ACCEPTED');assert.equal(out.diagnosticOnly,true);assert.equal(out.actors[0].restored,true);
  assert.equal(out.actors[0].clickDiagnostic.actionability.pointerInterception,true);assert.equal(out.actors[0].clickDiagnostic.onFailure.topOwner,'LEGAL_GATE');assert.doesNotMatch(JSON.stringify(out),/private|rawError|rawScope|arbitrary/);
});

test('terminal failure codes cannot leak arbitrary assertion values, actor names, URLs or local legal scope',()=>{
  const privateError=Object.assign(Error('I66_CUSTOM_PRIVATE_IDENTIFIER\nuser:private@example.invalid'),{code:'ERR_ASSERTION'});
  assert.equal(safeDirectFormsFailureCode(privateError),'ASSERTION_ERROR');
  assert.equal(safeDirectFormsFailureCode(Object.assign(Error('private@example.invalid'),{name:'TimeoutError'})),'TIMEOUT_ERROR');
  assert.equal(safeDirectFormsFailureCode(Error('https://private.invalid/secret')),'RUNTIME_FAILURE');
  assert.equal(safeDirectFormsFailureCode(Error('I66_DIRECT_FORMS_EXISTING_ACTOR_LEGAL_ACCEPTANCE_REQUIRED')),'I66_DIRECT_FORMS_EXISTING_ACTOR_LEGAL_ACCEPTANCE_REQUIRED');
});

// All identities, quoted decisions, controls and acceptance records below are
// labelled in-memory synthetic fixtures. No actual authorization file is written.
const personalDriver=require('./gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs');
const release=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PERSONAL_LEGAL,personalHash,personalBlob,personalDigest,personalReviewContext,validatePersonalLegalAuthority,
  readCurrentPersonalLegalAuthority,applyPersonalLegalUi,validatePersonalLegalProof}=personalDriver;
const copy=value=>JSON.parse(JSON.stringify(value)),personalFixtureTime=new Date(Date.now()-60000).toISOString();
function sealPersonal(f,{refreshReview=false}={}){
  if(refreshReview){f.receipt.reviewContext=personalReviewContext(f.candidate,f.receipt.subject,f.receipt.reviewContext.validity);f.receipt.reviewContextSha256=personalDigest(f.receipt.reviewContext);}
  f.evidence.reviewContextSha256=f.receipt.reviewContextSha256;
  f.evidence.confirmation.reviewContextSha256=f.receipt.reviewContextSha256;
  f.receiptBytes=Buffer.from(JSON.stringify(f.receipt));f.evidenceBytes=Buffer.from(JSON.stringify(f.evidence));
  f.candidate.directFormsPersonalLegal={schema:'I66_DIRECT_FORMS_PERSONAL_LEGAL_BINDING_V1',phase:f.cfg.phase,decisionId:f.receipt.decisionId,
    receiptPath:PERSONAL_LEGAL.receiptPath,receiptBlobSha:personalBlob(f.receiptBytes),receiptSha256:personalHash(f.receiptBytes),
    delegationEvidencePath:PERSONAL_LEGAL.evidencePath,delegationEvidenceBlobSha:personalBlob(f.evidenceBytes),delegationEvidenceSha256:personalHash(f.evidenceBytes),
    actorUidSha256:f.receipt.subject.actorUidSha256,reviewContextSha256:f.receipt.reviewContextSha256};
  f.controlBytes=Buffer.from(JSON.stringify(f.control));return f;
}
function personalFixture(phase='PREVIEW',{validate=true}={}){
  const live=phase==='LIVE',physical={sourceSha:'1'.repeat(40),buildId:'gi-i66-'+'1'.repeat(12)+'-57f234755dc1',artifactId:148,
    artifactDigest:'sha256:'+'a'.repeat(64),previewRunId:149,liveCloneRunId:150,liveHostingVersion:'sites/ays-orbit-360-lab/versions/physical'};
  const candidate={schema:'I6_6_OPERATIONAL_EXACT_RELEASE_V1',approvedByDirection:true,
    status:live?'EXACT_PREVIEW_SIGNED_LIVE_AUTHORIZED':'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED',
    sourceSha:SOURCE,buildId:BUILD,buildRunId:151,artifactId:152,artifactDigest:'sha256:'+'b'.repeat(64),
    previewChannelId:'gi-i66-rc-151',previewUrl:'https://ays-orbit-360-lab--gi-i66-rc-151-ab12cd34.web.app',
    targets:copy(release.TARGETS),requiredPreviewDrivers:[...release.DRIVERS],sameImmutableArtifactOnly:true,
    syntheticRecordsOnly:true,noRealFinancialOrCustomerWrites:true,noRulesAuthIamWrites:true,
    rollbackThreeBackendRevisionsAndHosting:true,expectedSiteFileCount:223,directFormsQa:true,
    syntheticQaIsolation:copy(release.PROPOSAL_QA_ISOLATION),advisorPayableQaIsolation:copy(release.ADVISOR_QA_ISOLATION),
    currentLive:{sourceSha:physical.sourceSha,buildId:physical.buildId,artifactId:physical.artifactId,artifactDigest:physical.artifactDigest,
      buildRunId:physical.previewRunId,liveRunId:physical.liveCloneRunId,hostingVersion:physical.liveHostingVersion}};
  if(live)candidate.previewQa={runId:153,headSha:'3'.repeat(40),receiptArtifactId:154,receiptArtifactDigest:'sha256:'+'c'.repeat(64),status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS'};
  const control={gate:'I6.6',historicalClosedGate:'B4-007',status:live?'OPERATIONAL_EXACT_LIVE_PROMOTION_AUTHORIZED':'OPERATIONAL_BACKEND_PREVIEW_AUTHORIZED',
    forbidBackendFunctionDeploy:false,forbidFirestoreRulesDataAuthWrites:true,backendFunctionPreviewOnly:!live,forbidBackendLiveFunctionDeploy:!live,
    livePromotionAuthorized:live,previewApproved:live,noHostingPromotion:!live,currentExactHostingRelease:physical,operationalReleaseCandidate:candidate};
  const actor={role:'operativo',advisorId:'synthetic_carlos_qa_advisor',uid:'synthetic_carlos_personal_qa_uid'};
  const cfg={phase,source:SOURCE,origin:live?'https://app.aysseguros.com':candidate.previewUrl,packageRoot:'/synthetic/exact-package'};
  const subject={actorUidSha256:personalHash(actor.uid),advisorId:actor.advisorId,role:'operativo',tenantId:'alianzas-soluciones',country:'GT',company:'Alianzas & Soluciones'};
  const reviewContext=personalReviewContext(candidate,subject,{notBefore:personalFixtureTime,expiresAt:null});
  const receipt={schema:'I66_DIRECT_FORMS_PERSONAL_LEGAL_AUTHORIZATION_V1',status:'CONFIRMED_PERSONAL_AUTHORIZATION',
    decisionId:'SYNTHETIC_ONLY_PERSONAL_DECISION_NEVER_A_REAL_GRANT',decisionAt:personalFixtureTime,subject,reviewContext,reviewContextSha256:personalDigest(reviewContext)};
  const quote='SYNTHETIC TEST ONLY: this is an in-memory delegated personal decision fixture, never a real person\'s authorization.';
  const evidence={schema:'I66_DIRECT_FORMS_PERSONAL_DELEGATION_EVIDENCE_V1',status:'CONFIRMED_PERSONAL_DECISION_AND_DELEGATION',
    decisionId:receipt.decisionId,decisionAt:receipt.decisionAt,subject:copy(subject),reviewContextSha256:receipt.reviewContextSha256,
    source:{kind:'PERSONAL_DIRECT_CONFIRMATION',privateEvidenceRef:'private-evidence:sha256:'+personalHash('SYNTHETIC ONLY PRIVATE VERIFICATION'),
      declarationSha256:personalHash(quote),verificationSha256:personalHash('SYNTHETIC ONLY PRIVATE VERIFICATION')},
    confirmation:{personallyAuthorized:true,explicitNormalUiDelegation:true,confirmedBySubjectUidSha256:subject.actorUidSha256,
      delegatedExecutor:PERSONAL_LEGAL.driverPath,reviewContextSha256:receipt.reviewContextSha256}};
  const f=sealPersonal({candidate,control,actor,cfg,receipt,evidence,controlHeadSha:'9'.repeat(40)});
  if(validate)f.authority=validatePersonalLegalAuthority(f);return f;
}
function personalProof(f){return{profile:PERSONAL_LEGAL.profile,status:'PERSONAL_DECISION_APPLIED_BY_NORMAL_UI_AND_RELOAD',phase:f.cfg.phase,origin:f.cfg.origin,
  ...Object.fromEntries(['sourceSha','buildId','buildRunId','artifactId','artifactDigest'].map(k=>[k,f.candidate[k]])),decisionId:f.receipt.decisionId,
  controlHeadSha:f.controlHeadSha,controlBlobSha:personalBlob(f.controlBytes),receiptPath:PERSONAL_LEGAL.receiptPath,
  receiptBlobSha:personalBlob(f.receiptBytes),receiptSha256:personalHash(f.receiptBytes),delegationEvidencePath:PERSONAL_LEGAL.evidencePath,
  delegationEvidenceBlobSha:personalBlob(f.evidenceBytes),delegationEvidenceSha256:personalHash(f.evidenceBytes),
  reviewContextSha256:f.receipt.reviewContextSha256,actorUidSha256:personalHash(f.actor.uid),scopeSha256:personalHash('user:synthetic@example.invalid'),
  acceptedAt:personalFixtureTime,acceptanceRecordSha256:'a'.repeat(64),version:'2.0',clauseIds:[...PERSONAL_LEGAL.clauseIds],termsProjectionSha256:PERSONAL_LEGAL.termsProjectionSha256,
  normalUi:true,immediateReadback:true,reloadReadback:true,reloadActorVerified:true,authorizationRecheckedBeforeClick:true,storageSeeded:false,gateBypassed:false,authOrMembershipMutations:0};}
function personalGit(f,changes={}){
  const calls=[];
  const execFileSync=(command,args)=>{
    assert.equal(command,'git');calls.push(args);
    if(args[0]==='fetch'){assert.deepEqual(args,['fetch','--no-tags','--quiet','origin','refs/heads/recovery/fase-a-clean-20260831']);return '';}
    if(args[0]==='rev-parse'){assert.deepEqual(args,['rev-parse','FETCH_HEAD']);return f.controlHeadSha+'\n';}
    if(args[0]==='merge-base'){assert.deepEqual(args,['merge-base','--is-ancestor',f.cfg.source,f.controlHeadSha]);if(changes.notAncestor)throw Error('PRIVATE_REMOTE_TOKEN');return '';}
    if(args[0]==='diff'){assert.equal(args[3],f.controlHeadSha);return changes.ownerDrift?'tools/changed-owner.cjs':'';}
    if(args[0]==='show'){
      const refs={[release.CONTROL]:changes.controlBytes||f.controlBytes,[PERSONAL_LEGAL.receiptPath]:changes.receiptBytes||f.receiptBytes,[PERSONAL_LEGAL.evidencePath]:changes.evidenceBytes||f.evidenceBytes};
      assert.ok(args[1].startsWith(f.controlHeadSha+':'),'must read all control bytes from the same remote commit');
      const path=args[1].slice(41);if(changes.missing===path)throw Error('PRIVATE_REMOTE_TOKEN');assert.ok(refs[path]);return refs[path].toString();
    }
    throw Error('UNEXPECTED_OFFLINE_GIT_CALL');
  };
  return{calls,execFileSync};
}
const personalOwnerBytes=fs.readFileSync(path.join(__dirname,'../orbit360-platform/core/legal.js'));
function legalPresentation(f){
  const direction=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
  const orbit={auth:{user:()=>({uid:f.actor.uid})},tenant:{get:()=>({paisDefault:'GT',nombre:'Alianzas & Soluciones'})}};
  vm.runInNewContext(personalOwnerBytes.toString(),{window:{Orbit:orbit,location:{origin:f.cfg.origin}},Orbit:orbit,
    localStorage:{getItem:()=>null,setItem:()=>{throw Error('TEST_FORBIDS_STORAGE_SEED');}}});
  return {origin:f.cfg.origin,actorUid:f.actor.uid,signedActorUid:f.actor.uid,advisorId:f.actor.advisorId,role:'Operativo',tenantId:'alianzas-soluciones',
    email:'synthetic-private-person@example.invalid',scope:'user:synthetic-private-person@example.invalid',company:'Alianzas & Soluciones',companyBound:true,
    appStarted:true,authRestoring:false,gateCount:1,version:'2.0',type:'interno',country:'GT',clauseIds:[...PERSONAL_LEGAL.clauseIds],previousAcceptance:null,
    countrySelectionRequired:false,countrySelectionValue:'',countryOptions:[],checked:false,checkboxDisabled:false,buttonDisabled:true,terms:copy(direction.projectCatalog(orbit.legal.catalogo()))};
}
function personalUiHarness(options={}){
  const f=personalFixture(options.phase||'PREVIEW'),shown=legalPresentation(f),events=[];let checked=false,selected=false,record=null,reloaded=false,refresh=0;
  const marker={product:'Gravicentra Insurance',gate:'I6.6',sourceSha:SOURCE,buildId:BUILD};
  const page={
    waitForSelector:async(selector,options)=>{assert.equal(selector,'[data-legal-gate]');assert.equal(options.timeout,10000);events.push('gate-'+options.state);},
    waitForFunction:async()=>{events.push('wait-ready');},
    evaluate:async(fn,arg)=>{
      if(fn.name==='directFormsPersonalPresentation')return{...copy(shown),checked,buttonDisabled:!checked,
        ...(options.needsCountry&&!selected?{countrySelectionRequired:true,country:'',countrySelectionValue:'',countryOptions:['GT','CO'],checkboxDisabled:true,terms:[]}:{}),...(options.presentation||{})};
      if(fn.name==='directFormsPersonalAccepted'){assert.equal(arg,shown.scope);events.push('immediate');return options.record===null?null:{...record,...options.record};}
      if(fn.name==='directFormsLegalReadiness')return{appStarted:true,authRestoring:false,legalOwnerCompleted:true,legalOwnerPending:false,existingAcceptanceMatchesRuntime:true,legalOverlayCount:0};
      if(fn.name==='directFormsPersonalReload'){assert.equal(arg,shown.scope);assert.equal(reloaded,true);events.push('readback');return{...copy(shown),gateCount:0,legalSatisfied:true,record:{...record,...options.reloadRecord},...options.reload};}
      throw Error('UNEXPECTED_OFFLINE_PAGE_EVALUATE_'+fn.name);
    },
    locator:selector=>{assert.equal(selector,'[data-legal-gate]');return{locator:sub=>({
      selectOption:async value=>{assert.equal(sub,'#lg-country');assert.equal(value,'GT');events.push('country');selected=true;},
      check:async options=>{assert.equal(sub,'#lg-chk');assert.equal(options,undefined);events.push('check');checked=true;},
      click:async options=>{assert.equal(sub,'#lg-ok');assert.equal(options,undefined);assert.equal(checked,true);events.push('click');
        record={aceptado:true,actorUid:f.actor.uid,scopeId:shown.scope,origin:f.cfg.origin,version:'2.0',tipo:'interno',pais:'GT',empresa:'Alianzas & Soluciones',
          clausulas:[...PERSONAL_LEGAL.clauseIds],acceptanceMethod:'VISIBLE_CHECKBOX_AND_BUTTON',ip:null,ipSource:'NOT_COLLECTED',fecha:new Date().toISOString()};}
    })};},
    reload:async value=>{assert.deepEqual(value,{waitUntil:'commit',timeout:30000});events.push('reload');reloaded=true;}
  };
  const io={
    readFileSync:file=>{if(file.endsWith('/__recovery__/build.json'))return Buffer.from(JSON.stringify(options.marker||marker));if(file.endsWith('/core/legal.js'))return options.packageOwner||personalOwnerBytes;throw Error('UNEXPECTED_OFFLINE_FILE');},
    execFileSync:(command,args)=>{assert.equal(command,'git');assert.deepEqual(args,['show',SOURCE+':orbit360-platform/core/legal.js']);return options.sourceOwner||personalOwnerBytes;},
    fetch:async(url)=>{events.push('fetch');assert.ok(url.startsWith(f.cfg.origin+'/'));return url.endsWith('/__recovery__/build.json')?
      {status:200,json:async()=>reloaded&&options.reloadMarker?options.reloadMarker:options.hostedMarker||marker}:
      {status:200,arrayBuffer:async()=>options.hostedOwner||personalOwnerBytes};},
    readCurrentAuthority:()=>{events.push('authority-'+(++refresh));if(options.revokeAt===refresh)throw Error('I66_DIRECT_FORMS_PERSONAL_AUTHORIZATION_NOT_CONFIRMED');return f.authority;}
  };
  return{f,page,io,events,shown,run:()=>applyPersonalLegalUi({page,actor:f.actor,cfg:f.cfg,authority:options.authority===undefined?f.authority:options.authority},io)};
}

test('personal adapter accepts only a separately evidenced exact decision; general Direction approval is not personal consent',()=>{
  for(const phase of ['PREVIEW','LIVE']){const f=personalFixture(phase);assert.equal(f.authority.phase,phase);assert.equal(f.authority.origin,f.cfg.origin);assert.ok(Object.isFrozen(f.authority));}
  const f=personalFixture();delete f.control.operationalReleaseCandidate.directFormsPersonalLegal;f.controlBytes=Buffer.from(JSON.stringify(f.control));
  assert.throws(()=>validatePersonalLegalAuthority(f),/PERSONAL_AUTHORIZATION_REQUIRED/);
  assert.throws(()=>validatePersonalLegalAuthority({...personalFixture(),receiptBytes:null}),/RECEIPT_REQUIRED/);
  assert.throws(()=>validatePersonalLegalAuthority({...personalFixture(),evidenceBytes:null}),/DELEGATION_EVIDENCE_REQUIRED/);
});
for(const [label,mutate] of [
  ['pending proposal',f=>{f.receipt.status='PENDING_PERSONAL_AUTHORIZATION';}],
  ['revoked decision',f=>{f.receipt.status='REVOKED';}],
  ['invented Direction authority substitute',f=>{f.evidence.confirmation={approvedByDirection:true};}],
  ['no confirmed delegation',f=>{f.evidence.confirmation.explicitNormalUiDelegation=false;}],
  ['different signed actor',f=>{f.actor.uid='another_synthetic_uid';}],
  ['different signed adviser',f=>{f.actor.advisorId='other_synthetic_adviser';}],
  ['Direction acting instead of Operativo',f=>{f.actor.role='direccion';}],
  ['other tenant',f=>{f.receipt.subject.tenantId='other';}],
  ['other country',f=>{f.receipt.subject.country='CO';}],
  ['other company',f=>{f.receipt.subject.company='Other';}],
  ['changed legal version',f=>{f.receipt.reviewContext.legal.version='2.1';}],
  ['changed terms digest',f=>{f.receipt.reviewContext.legal.termsProjectionSha256='0'.repeat(64);}],
  ['additional legal clause',f=>{f.receipt.reviewContext.legal.clauseIds.push('socios');}],
  ['other artifact',f=>{f.receipt.reviewContext.target.artifactId++;}],
  ['other digest',f=>{f.receipt.reviewContext.target.artifactDigest='sha256:'+'0'.repeat(64);}],
  ['other source',f=>{f.receipt.reviewContext.target.sourceSha='b'.repeat(40);}],
  ['other build',f=>{f.receipt.reviewContext.target.buildId='other';}],
  ['other Preview origin',f=>{f.receipt.reviewContext.executions[0].origin='https://example.invalid';}],
  ['other LIVE origin',f=>{f.receipt.reviewContext.executions[1].origin='https://example.invalid';}],
  ['wrong phase execution',f=>{f.receipt.reviewContext.executions[0].phase='LIVE';}],
  ['future source extension',f=>{f.receipt.reviewContext.constraints.futureSuccessors=true;}],
  ['storage seed',f=>{f.receipt.reviewContext.constraints.storageSeeding=true;}],
  ['gate bypass',f=>{f.receipt.reviewContext.constraints.gateBypass=true;}],
  ['delegate to another executor',f=>{f.evidence.confirmation.delegatedExecutor='other-driver.cjs';}],
  ['missing private evidence reference',f=>{f.evidence.source.privateEvidenceRef='';}],
  ['missing personal statement digest',f=>{delete f.evidence.source.declarationSha256;}],
  ['malformed verification digest',f=>{f.evidence.source.verificationSha256='not-a-digest';}],
  ['zero placeholder digest',f=>{f.evidence.source.declarationSha256='0'.repeat(64);}],
  ['raw quote in public metadata',f=>{f.evidence.source.exactQuote='PRIVATE_PERSONAL_QUOTE_MUST_NOT_ENTER_CANONICAL_JSON';}],
  ['raw message reference in public metadata',f=>{f.evidence.source.reference='private-message-id';}],
  ['unconfirmed evidence source',f=>{f.evidence.source.kind='DIRECTION_INFERRED_AUTHORIZATION';}]
])test('personal authorization rejects '+label+' before any browser action',()=>{
  const f=personalFixture('PREVIEW',{validate:false});mutate(f);sealPersonal(f);
  assert.throws(()=>validatePersonalLegalAuthority(f));
});
test('personal authorization enforces only the decision actual validity and never manufactures an expiry or future extension',()=>{
  const f=personalFixture('PREVIEW',{validate:false});
  f.receipt.reviewContext.validity.expiresAt=new Date(Date.now()-1000).toISOString();sealPersonal(f,{refreshReview:true});
  assert.throws(()=>validatePersonalLegalAuthority(f),/AUTHORIZATION_EXPIRED/);
  const future=personalFixture('PREVIEW',{validate:false});future.receipt.decisionAt=new Date(Date.now()+60000).toISOString();future.receipt.reviewContext.validity.notBefore=future.receipt.decisionAt;
  sealPersonal(future,{refreshReview:true});assert.throws(()=>validatePersonalLegalAuthority(future),/NOT_YET_EFFECTIVE/);
  assert.equal(personalFixture().authority.reviewContext.validity.expiresAt,null);
});
test('remote authority reads one current canonical commit and never consults checkout consent flags',()=>{
  const f=personalFixture(),g=personalGit(f),result=readCurrentPersonalLegalAuthority({cfg:f.cfg,actor:f.actor,candidate:f.candidate},g);
  assert.deepEqual(result.binding,f.authority.binding);assert.equal(g.calls[0][0],'fetch');
  assert.deepEqual(g.calls.filter(x=>x[0]==='show').map(x=>x[1]),[release.CONTROL,PERSONAL_LEGAL.receiptPath,PERSONAL_LEGAL.evidencePath].map(p=>f.controlHeadSha+':'+p));
  for(const changes of [{ownerDrift:true},{notAncestor:true},{missing:PERSONAL_LEGAL.receiptPath},{missing:PERSONAL_LEGAL.evidencePath},{receiptBytes:'{}'},{evidenceBytes:'{}'}]){
    assert.throws(()=>readCurrentPersonalLegalAuthority({cfg:f.cfg,actor:f.actor,candidate:f.candidate},personalGit(f,changes)),e=>/^I66_DIRECT_FORMS_PERSONAL_/.test(e.message)&&!e.message.includes('PRIVATE'));
  }
});
test('remote authority rejects phase, current candidate, bound blob and revoked control drift even when local input was valid',()=>{
  for(const mutate of [f=>{f.candidate.directFormsPersonalLegal.phase='LIVE';},f=>{f.candidate.directFormsPersonalLegal.receiptBlobSha='f'.repeat(40);},
    f=>{f.candidate.directFormsPersonalLegal.delegationEvidenceSha256='f'.repeat(64);},f=>{delete f.candidate.directFormsPersonalLegal;},
    f=>{f.control.status='OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED';}]){
    const f=personalFixture(),expected=copy(f.candidate);mutate(f);f.controlBytes=Buffer.from(JSON.stringify(f.control));
    assert.throws(()=>readCurrentPersonalLegalAuthority({cfg:f.cfg,actor:f.actor,candidate:expected},personalGit(f)));
  }
});
test('absent or unvalidated personal authority produces no page, file, network, checkbox or button action',async()=>{
  for(const authority of [null,{},copy(personalFixture().authority)]){const h=personalUiHarness({authority});await assert.rejects(h.run(),/VALIDATED_CURRENT_AUTHORITY_REQUIRED/);assert.deepEqual(h.events,[]);}
});
test('valid synthetic personal UI path uses ordinary checkbox/button and verifies same actor and record after reload in each exact phase',async()=>{
  for(const phase of ['PREVIEW','LIVE']){
    const h=personalUiHarness({phase}),proof=await h.run();validatePersonalLegalProof(proof,h.f.authority);
    assert.equal(h.events.filter(x=>x==='check').length,1);assert.equal(h.events.filter(x=>x==='click').length,1);assert.equal(h.events.filter(x=>x==='reload').length,1);
    for(const [before,after] of [['authority-1','check'],['check','authority-2'],['authority-2','click'],['click','immediate'],['immediate','reload'],['reload','readback']])assert.ok(h.events.indexOf(before)<h.events.indexOf(after));
    assert.equal(proof.storageSeeded,false);assert.doesNotMatch(JSON.stringify(proof),/synthetic-private|@|exactQuote|synthetic_carlos_personal_qa_uid|SYNTHETIC TEST ONLY/);
  }
});
test('country selection uses the visible GT choice only under validated exact personal delegation',async()=>{
  const h=personalUiHarness({needsCountry:true});await h.run();assert.equal(h.events.filter(x=>x==='country').length,1);assert.ok(h.events.indexOf('country')<h.events.indexOf('check'));
});
for(const [label,options] of [
  ['UID swap',{presentation:{actorUid:'other'}}],['signed Firebase UID swap',{presentation:{signedActorUid:'other'}}],
  ['role swap',{presentation:{role:'Dirección'}}],['adviser swap',{presentation:{advisorId:'other'}}],
  ['tenant swap',{presentation:{tenantId:'other'}}],['company mismatch',{presentation:{company:'other'}}],['unbound company',{presentation:{companyBound:false}}],
  ['origin mismatch',{presentation:{origin:'https://example.invalid'}}],['country mismatch',{presentation:{country:'CO'}}],
  ['changed terms',{presentation:{terms:[]}}],['different clause set',{presentation:{clauseIds:['socios']}}],
  ['no visible gate',{presentation:{gateCount:0}}],['unaccredited preexisting acceptance',{presentation:{previousAcceptance:{aceptado:true}}}],
  ['unexpected checked box',{presentation:{checked:true}}],['startup not ready',{presentation:{authRestoring:true}}],
  ['package legal drift',{packageOwner:Buffer.from('different')}],['source legal drift',{sourceOwner:Buffer.from('different')}],
  ['hosted legal drift',{hostedOwner:Buffer.from('different')}],['hosted source drift',{hostedMarker:{sourceSha:'b'.repeat(40)}}]
])test('personal UI rejects '+label+' before acceptance actions',async()=>{
  const h=personalUiHarness(options);await assert.rejects(h.run());assert.equal(h.events.includes('check'),false);assert.equal(h.events.includes('click'),false);
});
test('revocation before checkbox or between checkbox and button never registers acceptance',async()=>{
  for(const revokeAt of [1,2]){const h=personalUiHarness({revokeAt});await assert.rejects(h.run(),/AUTHORIZATION_NOT_CONFIRMED/);assert.equal(h.events.includes('click'),false);assert.equal(h.events.includes('reload'),false);assert.equal(h.events.includes('check'),revokeAt===2);}
});
for(const [label,options] of [
  ['missing record',{record:null}],['record UID drift',{record:{actorUid:'other'}}],['record country drift',{record:{pais:'CO'}}],
  ['fabricated IP',{record:{ip:'1.2.3.4'}}],['record method drift',{record:{acceptanceMethod:'SEEDED'}}],
  ['reload UID drift',{reload:{signedActorUid:'other'}}],['reload company drift',{reload:{company:'other'}}],
  ['reload gate pending',{reload:{gateCount:1}}],['reload record drift',{reloadRecord:{fecha:'2000-01-01T00:00:00.000Z'}}],
  ['reload build drift',{reloadMarker:{sourceSha:'b'.repeat(40)}}]
])test('personal UI never returns acceptance proof after '+label,async()=>{await assert.rejects(personalUiHarness(options).run());});
test('signed functional checks stay exactly 44/66 and additionally require current personal proof without extending Direction scope',()=>{
  for(const phase of ['PREVIEW','LIVE']){
    assert.equal(validate(signedReport(phase),phase).checks,phase==='PREVIEW'?44:66);
    const report=signedReport(phase);
    assert.throws(()=>validateSignedReport(report,{phase,sourceSha:SOURCE,buildId:BUILD}),/VALIDATED_CURRENT_AUTHORITY_REQUIRED/);
    for(const change of [r=>delete r.actors[0].personalLegalAcceptance,r=>{r.actors[0].personalLegalAcceptance.reloadReadback=false;},
      r=>{r.actors[0].personalLegalAcceptance.artifactId++;},r=>{r.actors[1].personalLegalAcceptance=r.actors[0].personalLegalAcceptance;}]){
      const r=copy(report);change(r);assert.throws(()=>validate(r,phase));
    }
  }
});
test('existing release preflight rejects missing personal authority before backend/Make mutations and does not require it for historical non-DirectForms candidates',()=>{
  const f=personalFixture(),calls=[];
  assert.throws(()=>release.assertDirectFormsPersonalAuthority(f.candidate,'PREVIEW',args=>{calls.push(args);throw Error('I66_DIRECT_FORMS_PERSONAL_AUTHORIZATION_REQUIRED');}),/AUTHORIZATION_REQUIRED/);
  assert.equal(calls.length,1);assert.equal(calls[0].candidate,f.candidate);assert.equal(calls[0].cfg.phase,'PREVIEW');
  assert.equal(release.assertDirectFormsPersonalAuthority({...f.candidate,directFormsQa:undefined},'PREVIEW',()=>{throw Error('SHOULD_NOT_RUN');}),null);
  const source=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-operational-release-candidate.cjs'),'utf8');
  const start=source.indexOf('async function main(){'),body=source.slice(start,source.indexOf('// A completed operational successor',start));
  assert.ok(body.indexOf('assertDirectFormsPersonalAuthority')<body.indexOf('verifyPinnedOwners'));
  const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-privileged-role-three-function-preview-uat.yml'),'utf8');
  assert.ok(workflow.indexOf('node tools/gravicentra-i6-6-operational-release-candidate.cjs preview')<workflow.indexOf('snapshot-trigger preview'));
});
test('existing report collector calls current personal preflight before any report reads; failed authority cannot turn report flags into a PASS',()=>{
  const source=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-operational-release-candidate.cjs'),'utf8');
  const start=source.indexOf('function focusedReportsFromDisk('),end=source.indexOf('\nfunction verifyPinnedOwners',start),code=source.slice(start,end);
  const f=personalFixture(),reads=[];let validated=0;
  const context={assert,path,crypto:require('node:crypto'),JSON,process:{env:{}},
    fs:{readFileSync:p=>{reads.push(p);return JSON.stringify(p.includes('gi-i66-direct-forms')?signedReport('PREVIEW'):{status:'PASS',cleanup:{status:'PASS'},checks:[1]});}},
    validateFocusedReports:()=>{},signedObservabilityReports:()=>null,
    assertDirectFormsPersonalAuthority:()=>f.authority,
    require:()=>({directFormsProfile:personalDriver.directFormsProfile,PAULA_ROLE_PROFILE:personalDriver.PAULA_ROLE_PROFILE,validateSignedReport:(report,options)=>{assert.equal(options.personalAuthority,f.authority);validated++;return validateSignedReport(report,options);}})};
  vm.runInNewContext(code+'\nthis.collect=focusedReportsFromDisk;',context);
  const env={RUNNER_TEMP:'/synthetic',I66_PACKAGE_ROOT:'/synthetic'};
  assert.equal(context.collect(f.candidate,'PREVIEW',env).directForms.status,'PASS');assert.equal(validated,1);
  reads.length=0;context.assertDirectFormsPersonalAuthority=()=>{throw Error('I66_DIRECT_FORMS_PERSONAL_AUTHORIZATION_REQUIRED');};
  assert.throws(()=>context.collect(f.candidate,'PREVIEW',env),/AUTHORIZATION_REQUIRED/);assert.deepEqual(reads,[]);
});


test('public personal metadata retains only opaque references and digests; raw statement, message IDs and actor UID are never serialized',()=>{
  const f=personalFixture(),canonical=JSON.stringify({receipt:f.receipt,evidence:f.evidence});
  assert.doesNotMatch(canonical,/exactQuote|synthetic_carlos_personal_qa_uid|@|SYNTHETIC TEST ONLY|private-message-id/);
  assert.equal(f.evidence.source.privateEvidenceRef,'private-evidence:sha256:'+f.evidence.source.verificationSha256);
  assert.match(f.evidence.source.declarationSha256,/^[a-f0-9]{64}$/);
});
function personalAncestry(f,{notAncestor=false,controlBytes=f.controlBytes,receiptBytes=f.receiptBytes,evidenceBytes=f.evidenceBytes}={}){
  const calls=[];return{calls,execFileSync:(command,args)=>{
    assert.equal(command,'git');calls.push(args);
    if(args[0]==='merge-base'){assert.deepEqual(args,['merge-base','--is-ancestor','8'.repeat(40),f.controlHeadSha]);if(notAncestor)throw Error('PRIVATE_REFERENCE');return '';}
    assert.equal(args[0],'show');assert.ok(args[1].startsWith('8'.repeat(40)+':'));
    const p=args[1].slice(41),bytes={[release.CONTROL]:controlBytes,[PERSONAL_LEGAL.receiptPath]:receiptBytes,[PERSONAL_LEGAL.evidencePath]:evidenceBytes}[p];
    assert.ok(bytes);return bytes.toString();
  }};
}
test('an irrelevant later commit may advance HEAD only with verified ancestry and exact transport, candidate and personal evidence bytes',()=>{
  const f=personalFixture(),proof={...personalProof(f),controlHeadSha:'8'.repeat(40)},io=personalAncestry(f);
  assert.equal(validatePersonalLegalProof(proof,f.authority,io),true);
  assert.equal(io.calls.filter(x=>x[0]==='merge-base').length,1);assert.equal(io.calls.filter(x=>x[0]==='show').length,3);
});
test('non-ancestor, changed transport or changed personal evidence cannot be excused as a metadata-only HEAD change',()=>{
  const f=personalFixture(),proof={...personalProof(f),controlHeadSha:'8'.repeat(40)};
  for(const changes of [{notAncestor:true},{controlBytes:Buffer.from('{}')},{receiptBytes:Buffer.from('{}')},{evidenceBytes:Buffer.from('{}')}]){
    assert.throws(()=>validatePersonalLegalProof(proof,f.authority,personalAncestry(f,changes)),e=>/^I66_DIRECT_FORMS_PERSONAL_/.test(e.message)&&!e.message.includes('PRIVATE_REFERENCE'));
  }
  const revoked=personalFixture('PREVIEW',{validate:false});revoked.receipt.status='REVOKED';sealPersonal(revoked);
  assert.throws(()=>validatePersonalLegalAuthority(revoked),/AUTHORIZATION_NOT_CONFIRMED/);
});

const {cancellationPayload,openCancellationDraft,exerciseCancellationDraft,cancellationSnapshot,cancellationPreservationSnapshot,
  cancellationCommandIdentity,assertCancellationAudit,assertCancellationActivity,assertCancellationPolicy,
  validateCancellationAuditSnapshots,restoreCancellationAudit}=personalDriver;
function cancellationFixture(){
  const fx=fixtures('operativo',SUFFIX),policyId='pol_synthetic_successor',actor={uid:UID,role:'operativo'},payload=cancellationPayload(SUFFIX,true);
  const requestId='polcan_synthetic_ab123',activityId='act_'+requestId;
  const input={tenantId:'alianzas-soluciones',activeRole:'Operativo',requestId,mutations:[
    {action:'update',collection:'polizas',id:policyId,payload:{estado:'Cancelada',...payload}},
    {action:'insert',collection:'actividades',id:activityId,payload:{id:activityId,tenantId:'alianzas-soluciones',clienteId:fx.ids.client,
      polizaId:policyId,pais:'GT',operacionId:requestId,tipo:'poliza',ownerUid:UID,titulo:'Synthetic cancellation',detalle:'Synthetic documentary support',fecha:'2026-11-24'}}]};
  const context={ids:fx.ids,policyId,actor,payload},identity=cancellationCommandIdentity(input,context);
  const rows={activity:{...input.mutations[1].payload,createdByUid:UID,updatedByUid:UID},
    request:{status:'committed',payloadDigest:identity.payloadDigest,result:{ok:true,serverOwned:true,requestId,eventId:identity.eventId,mutationCount:2,collections:['polizas','actividades']}},
    event:{tenantId:'alianzas-soluciones',actorUid:UID,activeRole:'Operativo',requestId,eventId:identity.eventId,payloadDigest:identity.payloadDigest,
      mutationCount:2,collections:['polizas','actividades'],containsSecrets:false}};
  return {fx,policyId,actor,payload,input,context,identity,rows};
}
function cancellationProfile(phase){
  const f=personalFixture(phase,{validate:false}),authority=require('./gravicentra-i6-6-frontend-preview-authority.cjs');
  f.candidate.cancellationQa=true;
  f.candidate.cancellationRecoveryQa={profile:authority.CANCELLATION_QA_PROFILE,receiptPath:authority.CANCELLATION_RECEIPT_PATH,
    receiptBlob:personalBlob('SYNTHETIC ONLY cancellation receipt; not real release authority')};
  sealPersonal(f);f.authority=validatePersonalLegalAuthority(f);
  const report=signedReport(phase);report.cancellationQa=true;report.actors[0].personalLegalAcceptance=personalProof(f);
  for(const actor of report.actors){
    actor.cancellationDraft={publicDetail:true,directForm:true,opsSeparate:true,inheritedContext:true,editableFields:true,
      explicitConfirmation:true,noDraftWrites:true,status:'SIGNED_PUBLIC_CANCELLATION_DRAFT_READONLY_PASS'};
    if(phase==='LIVE')actor.cancellationWrite={normalUi:true,successorOnly:true,serverReadback:true,reload:true,idempotentReplay:true,noReplayWrite:true,
      financePreserved:true,noOpsCreated:true,policyFieldsPreserved:true,auditReadback:true,auditCleanup:true,receiptRows:1,portfolioRows:1,paymentRows:0,commandWrites:1};
  }
  const options={phase,sourceSha:SOURCE,buildId:BUILD,personalAuthority:f.authority,cancellationQa:true};
  return {f,report,options,run:()=>validateSignedReport(report,options)};
}
test('cancellation capability is opt-in and refuses malformed flags without changing historical configuration',()=>{
  assert.equal(configuration(BASE).cancellationQa,undefined);
  assert.equal(configuration({...BASE,I66_CANCELLATION_QA:'0'}).cancellationQa,undefined);
  assert.equal(configuration({...BASE,I66_CANCELLATION_QA:'1'}).cancellationQa,true);
  for(const value of ['true','false','yes','',1,true])assert.throws(()=>configuration({...BASE,I66_CANCELLATION_QA:value}),/CANCELLATION_PROFILE_INVALID/);
});
test('conditional cancellation report binds both actors, personal candidate and exact phase without replacing the preserved renewal/endoso checks',()=>{
  const preview=cancellationProfile('PREVIEW').run(),live=cancellationProfile('LIVE').run();
  assert.deepEqual(preview,{status:'PASS',cleanup:'PASS',checks:63,phase:'PREVIEW',coverage:'PUBLIC_ENTRIES_AND_CANCELLATION_READONLY'});
  assert.deepEqual(live,{status:'PASS',cleanup:'PASS',checks:113,phase:'LIVE',coverage:'NORMAL_UI_RENEWAL_ENDORSEMENT_CANCELLATION_READBACK_RELOAD_REPLAY'});
  for(const phase of ['PREVIEW','LIVE']){
    const h=cancellationProfile(phase);delete h.options.cancellationQa;assert.throws(h.run,/UNAUTHORIZED_CANCELLATION_PROFILE/);
    const missing=cancellationProfile(phase);missing.options.personalAuthority=personalFixture(phase).authority;assert.throws(missing.run,/CANCELLATION_CANDIDATE_DRIFT/);
  }
});
test('a draft, one actor, missing audit cleanup or invented paid-policy coverage cannot satisfy the signed cancellation profile',()=>{
  for(const phase of ['PREVIEW','LIVE'])for(const mutate of [
    r=>{delete r.cancellationQa;},r=>{delete r.actors[1].cancellationDraft;},r=>{r.actors[0].cancellationDraft.opsSeparate=false;},
    r=>{r.actors[0].cancellationDraft.noDraftWrites=false;},r=>{r.actors[1].cancellationDraft.explicitConfirmation=false;}
  ]){const h=cancellationProfile(phase);mutate(h.report);assert.throws(h.run);}
  const preview=cancellationProfile('PREVIEW');preview.report.actors[0].cancellationWrite={normalUi:true};assert.throws(preview.run,/PREVIEW_NO_CANCELLATION_WRITE/);
  for(const key of ['normalUi','serverReadback','reload','idempotentReplay','noReplayWrite','financePreserved','noOpsCreated','policyFieldsPreserved','auditReadback','auditCleanup']){
    const h=cancellationProfile('LIVE');h.report.actors[0].cancellationWrite[key]=false;assert.throws(h.run);
  }
  for(const [key,value] of [['receiptRows',0],['portfolioRows',0],['paymentRows',1],['commandWrites',2]]){
    const h=cancellationProfile('LIVE');h.report.actors[1].cancellationWrite[key]=value;assert.throws(h.run);
  }
});
test('cancellation dates correspond to the draft source and the renewed successor, with no invented genuine insurer document',()=>{
  const {fx}=cancellationFixture(),preview=cancellationPayload(SUFFIX,false),live=cancellationPayload(SUFFIX,true);
  assert.ok(preview.fechaCancelacion>=fx.source.vigenciaInicio&&preview.fechaCancelacion<=fx.source.vigenciaFin);
  assert.ok(live.fechaCancelacion>=fx.source.vigenciaFin&&live.fechaCancelacion<='2027-11-21');
  assert.match(live.cancelacionDocumentoRef,/^qa-isolated-/);assert.throws(()=>cancellationPayload('../customer',true));
});
test('passive command capture binds exactly the synthetic successor, sparse cancellation and known activity before cleanup authority exists',()=>{
  const f=cancellationFixture();assert.match(f.identity.eventId,/^opevt_[a-f0-9]{28}$/);
  assert.equal(f.identity.payloadDigest,personalDigest(f.input.mutations));
  for(const mutate of [
    x=>{x.tenantId='foreign';},x=>{x.activeRole='Asesor';},x=>{x.requestId='other_request';},x=>{x.unrelatedOperation=true;},
    x=>{x.mutations[0].id='real_policy';},x=>{x.mutations[0].payload.primaTotal=0;},x=>{x.mutations[0].expectedBefore={estado:'Vigente'};},
    x=>{x.mutations[1].payload.polizaId='pol_foreign';},x=>{x.mutations[1].payload.clienteId='real_customer';},
    x=>{x.mutations[1].payload.ownerUid='other_actor';},x=>{x.mutations[1].id='unknown_activity';},x=>{x.mutations.pop();}
  ]){const input=copy(f.input);mutate(input);assert.throws(()=>cancellationCommandIdentity(input,f.context));}
});
test('server readback verifies only cancellation fields changed and rejects unrelated premium, identity, schedule or actor drift',()=>{
  const f=cancellationFixture(),before={...f.fx.source,id:f.policyId,renuevaDe:f.fx.ids.source,vigenciaInicio:'2026-11-21',vigenciaFin:'2027-11-21',observaciones:'Preserve'},
    after={...before,estado:'Cancelada',...f.payload,updatedByUid:UID,updatedAt:{seconds:12,nanoseconds:34}};
  assert.doesNotThrow(()=>assertCancellationPolicy(before,after,f.payload,UID));
  for(const patch of [{primaNeta:0},{clienteId:'another'},{cuotas:12},{observaciones:'lost'},{updatedByUid:'other'},{fechaCancelacion:'2026-11-25'}])
    assert.throws(()=>assertCancellationPolicy(before,{...after,...patch},f.payload,UID));
});
function cancellationAuditHarness({mutate,missing,conflict}={}){
  const f=cancellationFixture(),events=[],rows=copy(f.rows),version={seconds:99,nanoseconds:12};if(mutate)mutate(rows);
  if(missing)delete rows[missing];
  const ids={activity:f.identity.activityId,request:f.identity.requestId,event:f.identity.eventId};
  const ref=kind=>({get:async()=>({id:ids[kind],exists:!!rows[kind],updateTime:version,data:()=>copy(rows[kind]),ref:{delete:async precondition=>{
    assert.deepEqual(precondition,{lastUpdateTime:version});events.push(kind);if(conflict===kind)throw Error('CONCURRENT_VERSION');delete rows[kind];}}})});
  const item=(collection,id)=>{assert.equal(collection,'actividades');assert.equal(id,ids.activity);return ref('activity');};
  const tenant={collection:name=>({doc:id=>{const kind=name==='operationalRequests'?'request':name==='operationalEvents'?'event':null;assert.ok(kind);assert.equal(id,ids[kind]);return ref(kind);}})};
  return{...f,events,rows,tenant,item,run:()=>restoreCancellationAudit(tenant,item,f.identity)};
}
test('cancellation cleanup deletes only three captured IDs with version preconditions and verifies absence',async()=>{
  const h=cancellationAuditHarness();await h.run();assert.deepEqual(h.events,['activity','request','event']);assert.deepEqual(h.rows,{});
});
test('foreign actor, partial atomic audit, hidden extra mutation or payload drift prevents all cleanup',async()=>{
  for(const opts of [
    {missing:'event'},{missing:'activity'},{mutate:r=>{r.activity.id='unknown';}},
    {mutate:r=>{r.activity.polizaId='pol_other';}},{mutate:r=>{r.activity.createdByUid='other';}},
    {mutate:r=>{r.request.payloadDigest='0'.repeat(64);}},{mutate:r=>{r.request.result.mutationCount=3;}},
    {mutate:r=>{r.event.actorUid='other';}},{mutate:r=>{r.event.requestId='another';}},
    {mutate:r=>{r.event.collections=['polizas','cobros'];}}
  ]){const h=cancellationAuditHarness(opts);await assert.rejects(h.run);assert.deepEqual(h.events,[]);}
});
test('cancellation cleanup propagates concurrent versions and never broadens into another record',async()=>{
  const h=cancellationAuditHarness({conflict:'activity'});await assert.rejects(h.run,/CONCURRENT_VERSION/);
  assert.deepEqual(h.events,['activity']);assert.equal(Object.keys(h.rows).length,3);
  const absent=cancellationAuditHarness();delete absent.rows.activity;delete absent.rows.request;delete absent.rows.event;
  await absent.run();assert.deepEqual(absent.events,[]);
});
test('preservation snapshots include nanosecond versions so an identical-value rewrite cannot count as no write',async()=>{
  const f=cancellationFixture(),version={seconds:1,nanoseconds:2},row={id:'qa_receipt',polizaId:f.policyId,monto:1200};
  const snap={id:row.id,exists:true,updateTime:version,data:()=>row};
  const original=cancellationSnapshot(snap),rewritten=cancellationSnapshot({...snap,updateTime:{seconds:1,nanoseconds:3}});
  assert.notDeepEqual(original,rewritten);assert.deepEqual(original.data,rewritten.data);
  assert.throws(()=>cancellationSnapshot({...snap,updateTime:null}),/SNAPSHOT_REQUIRED/);
  const requests=[],collection=name=>({where:(key,_op,value)=>{requests.push([name,key,value]);return{limit:bound=>{assert.equal(bound,30);return{get:async()=>({size:0,docs:[]})};}};}});
  const result=await cancellationPreservationSnapshot(collection,f.fx.ids,f.policyId);
  assert.deepEqual(Object.keys(result),['recibosEsperados','carteraPrimas','cobros','vehiculos','comisiones','finmovs','gestiones']);
  assert.equal(requests.at(-1)[1],'clienteId');assert.equal(requests.at(-1)[2],f.fx.ids.client);
  await assert.rejects(cancellationPreservationSnapshot(()=>({where:()=>({limit:()=>({get:async()=>({size:30,docs:[]})})})}),f.fx.ids,f.policyId),/PRESERVATION_BOUND/);
});

function cancellationUiHarness({directMissing=false,opsPolicyWrong=false,implicitConfirmation=false,submitWrites=false}={}){
  const f=cancellationFixture(),policy=f.fx.source,events=[],values={policy:policy.numero,term:policy.vigenciaInicio+' → '+policy.vigenciaFin,date:'',reason:'',reference:'',document:''};
  let ops=false,formOpen=false;const writeCalls=[];
  const close={first:()=>({click:async()=>{events.push('close-ops');ops=false;}})};
  const form={waitFor:async()=>assert.equal(formOpen,true),locator:selector=>{
    if(selector==='[data-save]')return{click:async options=>{assert.equal(options,undefined);events.push('save-unconfirmed');if(submitWrites)writeCalls.push('UNEXPECTED');}};
    if(selector==='[data-error]')return{waitFor:async()=>{},textContent:async()=>'Confirma que la cancelación ya fue emitida y corresponde a esta póliza.'};
    const field=selector.match(/^\[data-cancellation-(.+)\]$/)?.[1];assert.ok(field);
    return {inputValue:async()=>values[field],isEditable:async()=>!['policy','term'].includes(field),isChecked:async()=>implicitConfirmation,
      fill:async value=>{events.push('fill-'+field);values[field]=value;}};
  }};
  const page={evaluate:async(_fn,arg)=>{assert.equal(arg.id,policy.id);events.push('navigate-policy-detail');},waitForFunction:async()=>{},locator:selector=>{
    if(selector==='[data-policy-fullpage]')return{waitFor:async()=>{},locator:s=>({isVisible:async()=>s==='[data-policy-cancellation-effective]'?!directMissing:true,
      click:async options=>{assert.equal(options,undefined);if(s==='[data-policy-cancellation-request]'){events.push('click-ops');ops=true;}else{events.push('click-direct');formOpen=true;}}})};
    if(selector==='#ciclo-modal')return{waitFor:async options=>assert.equal(ops,options.state==='visible'),count:async()=>ops?1:0,locator:s=>s==='[data-close]'?close:{inputValue:async()=>({'#mg-cli':policy.clienteId,'#mg-pol':opsPolicyWrong?'other':policy.id,'#mg-tipo':'Solicitud de cancelación'})[s]}};
    if(selector==='#policy-v1199')return{...form,count:async()=>formOpen?1:0};
    throw Error('UNEXPECTED_LOCATOR');
  }};
  const item=(_c,id)=>({get:async()=>({id,exists:true,updateTime:{seconds:10,nanoseconds:20},data:()=>policy})});
  const collection=()=>({where:()=>({limit:()=>({get:async()=>({size:0,docs:[]})})})});
  return{f,policy,events,values,page,writeCalls,item,collection,run:()=>exerciseCancellationDraft({page,policy,payload:cancellationPayload(SUFFIX,false),writeCalls,item,collection,ids:f.fx.ids})};
}
test('signed draft follows the public policy detail, opens and closes Ops separately, then validates unconfirmed direct fields without a write',async()=>{
  const h=cancellationUiHarness(),result=await h.run();assert.equal(result.proof.opsSeparate,true);assert.equal(result.proof.noDraftWrites,true);
  assert.deepEqual(h.events.slice(0,4),['navigate-policy-detail','click-ops','close-ops','click-direct']);
  assert.equal(h.events.at(-1),'save-unconfirmed');assert.deepEqual(h.writeCalls,[]);assert.equal(h.values.date,'2026-11-20');
});
test('signed draft refuses missing direct action, wrong Ops policy, silent confirmation and any submission from the unchecked draft',async()=>{
  for(const options of [{directMissing:true},{opsPolicyWrong:true},{implicitConfirmation:true},{submitWrites:true}]){
    const h=cancellationUiHarness(options);await assert.rejects(h.run);
    if(!options.submitWrites)assert.equal(h.events.includes('save-unconfirmed'),false);
  }
});

test('the release candidate cannot omit cancellation QA from a request that includes the product correction',()=>{
  for(const phase of ['PREVIEW','LIVE']){
    const h=cancellationProfile(phase),control=h.f.control;
    control.frontendPreviewRequest={cancellationRecovery:{syntheticFixtureOnly:true},cancellationRecoveryQa:copy(h.f.candidate.cancellationRecoveryQa)};
    assert.equal(release.candidateForPhase(control,phase.toLowerCase()),h.f.candidate);
    assert.equal(release.envFor(h.f.candidate).I66_CANCELLATION_QA,'1');
    for(const mutate of [c=>{delete c.operationalReleaseCandidate.cancellationQa;},c=>{c.operationalReleaseCandidate.cancellationQa=false;},
      c=>{delete c.operationalReleaseCandidate.cancellationRecoveryQa;},c=>{delete c.operationalReleaseCandidate.directFormsQa;},
      c=>{c.operationalReleaseCandidate.cancellationRecoveryQa.receiptBlob='c'.repeat(40);}]){
      const bad=copy(control);mutate(bad);assert.throws(()=>release.candidateForPhase(bad,phase.toLowerCase()),/I66_CANCELLATION_/);
    }
  }
});
test('cancellation flag requires the exact reviewed QA profile and receipt binding even without a request alias',()=>{
  const h=cancellationProfile('PREVIEW');assert.doesNotThrow(()=>release.candidateForPhase(h.f.control,'preview'));
  for(const mutate of [c=>{delete c.operationalReleaseCandidate.cancellationRecoveryQa;},c=>{delete c.operationalReleaseCandidate.cancellationQa;},
    c=>{c.operationalReleaseCandidate.cancellationRecoveryQa.profile='unreviewed';},
    c=>{c.operationalReleaseCandidate.cancellationRecoveryQa.receiptPath='artifacts/other-receipt.json';},
    c=>{c.operationalReleaseCandidate.cancellationRecoveryQa.receiptBlob='not-a-sha';},
    c=>{c.operationalReleaseCandidate.cancellationRecoveryQa.skipSignedQa=true;}]){
    const bad=copy(h.f.control);mutate(bad);assert.throws(()=>release.candidateForPhase(bad,'preview'),/I66_CANCELLATION_/);
  }
  const historic=personalFixture();assert.doesNotThrow(()=>release.candidateForPhase(historic.control,'preview'));
  assert.equal(release.envFor(historic.candidate).I66_CANCELLATION_QA,'0');
});
test('Preview admission rejects the old renewal-only report, a missing driver, or inflated/decreased cancellation checks',()=>{
  const h=cancellationProfile('PREVIEW'),p=h.f.candidate;
  const proof={schema:'I6_6_OPERATIONAL_SIGNED_PREVIEW_PROOF_V1',status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS',
    ...Object.fromEntries(['sourceSha','buildId','buildRunId','artifactId','artifactDigest','previewUrl','previewChannelId'].map(k=>[k,p[k]])),
    targets:copy(release.targetsForCandidate(p,'preview')),signedDrivers:[...release.DRIVERS],realFinancialOrCustomerWrites:0,
    syntheticRestoreComplete:true,liveHostingUnchanged:true,liveBackendUnchanged:true,
    focusedReports:Object.fromEntries(['advisorPayables','proposalApplication','directForms'].map(k=>[k,{status:'PASS',cleanup:'PASS',checks:k==='directForms'?63:1,digest:'sha256:'+'7'.repeat(64)}]))};
  Object.assign(proof.focusedReports.directForms,{phase:'PREVIEW',coverage:'SIGNED_PUBLIC_ENTRIES_AND_CANCELLATION_READONLY'});
  assert.doesNotThrow(()=>release.validateProof(p,proof));
  for(const mutate of [r=>{delete r.focusedReports.directForms;},r=>{r.focusedReports.directForms.coverage='SIGNED_PUBLIC_ENTRIES_READONLY';},
    r=>{r.focusedReports.directForms.phase='LIVE';},...([44,62,64,113].map(n=>r=>{r.focusedReports.directForms.checks=n;}))]){
    const bad=copy(proof);mutate(bad);assert.throws(()=>release.validateProof(p,bad));
  }
});
test('LIVE admission requires the new cancellation report independently of the preserved historical 66 checks',()=>{
  // Reuse the existing offline LIVE fixture, stopping before its test cases.
  // This does not produce a receipt, real personal decision or release authority.
  const fixturePath=path.join(__dirname,'gravicentra-i6-6-operational-live-acceptance.test.cjs'),source=fs.readFileSync(fixturePath,'utf8');
  const end=source.indexOf('\nfunction sealed(');assert.ok(end>0);
  const sandbox={require:require('node:module').createRequire(fixturePath),module:{exports:{}}};
  vm.runInNewContext(source.slice(0,end)+'\nthis.makeCancellationLiveFixture=fixture;',sandbox);
  const f=copy(sandbox.makeCancellationLiveFixture()),p=f.receipt.candidate;
  p.directFormsQa=true;p.cancellationQa=true;p.cancellationRecoveryQa=copy(cancellationProfile('LIVE').f.candidate.cancellationRecoveryQa);
  f.proof.focusedReports.directForms={status:'PASS',cleanup:'PASS',checks:113,digest:'sha256:'+'7'.repeat(64),phase:'LIVE',
    coverage:'SIGNED_NORMAL_UI_RENEWAL_ENDORSEMENT_CANCELLATION_READBACK_RELOAD_REPLAY'};
  assert.doesNotThrow(()=>release.validateLiveProof(p,f.proof));
  for(const mutate of [r=>{delete r.focusedReports.directForms;},r=>{r.focusedReports.directForms.coverage='SIGNED_NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY_RESTORE';},
    r=>{r.focusedReports.directForms.phase='PREVIEW';},...([63,66,112,114].map(n=>r=>{r.focusedReports.directForms.checks=n;}))]){
    const bad=copy(f.proof);mutate(bad);assert.throws(()=>release.validateLiveProof(p,bad));
  }
});


const {PAULA_ROLE_PROFILE,directFormsProfile,validatePaulaRoleAuthority,readCurrentPaulaRoleAuthority,
 resolvePaulaAssignedActors,validatePaulaRuntime,selectPaulaAssignedRole,validatePaulaRoleProof}=personalDriver;
const directionOwner=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
function paulaFixture(phase='PREVIEW'){
 const f=cancellationProfile(phase).f;delete f.candidate.directFormsPersonalLegal;
 f.candidate.directFormsQaProfile=PAULA_ROLE_PROFILE;f.candidate.legalAcceptance=directionOwner.i66ScopeCandidatePin(f.candidate);
 f.cfg.qaProfile=PAULA_ROLE_PROFILE;f.previewReceiptBytes=fs.readFileSync(path.join(__dirname,'..',directionOwner.I66_SCOPE.receiptPath));
 f.liveReceiptBytes=fs.readFileSync(path.join(__dirname,'..',directionOwner.LIVE_SCOPE.authorizationPath));
 f.proposalBytes=fs.readFileSync(path.join(__dirname,'..',directionOwner.LIVE_SCOPE.proposalPath));
 if(phase==='LIVE')f.candidate.liveLegalAcceptance=directionOwner.liveScopeCandidatePin(f.candidate,personalHash(f.liveReceiptBytes),JSON.parse(f.liveReceiptBytes));
 f.controlBytes=Buffer.from(JSON.stringify(f.control));f.authority=validatePaulaRoleAuthority(f);
 f.member={tenantId:'alianzas-soluciones',advisorId:'ase-paula-osorio',activeRole:'Dirección',roles:['Dirección','Operativo','Asesor'],countries:['GT','CO'],status:'active',active:true};
 f.actor={uid:'SYNTHETIC_PAULA_ROLE_UID',advisorId:'ase-paula-osorio',role:'operativo',membershipSha256:personalDigest(f.member),assignedRolesSha256:personalDigest(['asesor','direccion','operativo'])};
 return f;
}
function paulaLegalProof(f){
 const live=f.cfg.phase==='LIVE',uidHash=live?f.candidate.liveLegalAcceptance.actorUidSha256:personalHash(f.actor.uid);
 return {status:'EXPLICIT_OWNER_DECISION_APPLIED_BY_NORMAL_UI',decisionId:live?directionOwner.LIVE_SCOPE.decisionId:directionOwner.I66_SCOPE.decisionId,
  receiptSha256:live?personalHash(f.liveReceiptBytes):personalHash(f.previewReceiptBytes),sourceSha:SOURCE,buildId:BUILD,origin:f.cfg.origin,
  authorizationScope:live?directionOwner.LIVE_SCOPE.authorizationScope:directionOwner.I66_SCOPE.authorizationScope,gate:'I6.6',
  version:'2.0',clauseIds:[...PERSONAL_LEGAL.clauseIds],termsProjectionSha256:PERSONAL_LEGAL.termsProjectionSha256,
  actorUidSha256:uidHash,scopeSha256:personalHash('SYNTHETIC_PAULA_SCOPE'),acceptedAt:personalFixtureTime,
  immediateReadback:true,reloadReadback:true,reloadActorVerified:true,acceptedForOtherActors:false,liveAcceptance:live,storageSeeded:false,gateBypassed:false,
  ...(live?{phase:'LIVE',authorizationSourceBaseHead:f.candidate.liveLegalAcceptance.sourceBaseHead,advisorId:'ase-paula-osorio',actorRole:'direccion',tenantId:'alianzas-soluciones',country:'GT'}:{})};
}
function paulaSignedReport(f){
 const report=cancellationProfile(f.cfg.phase).report;report.profile=PAULA_ROLE_PROFILE;
 for(const actor of report.actors){
  delete actor.personalLegalAcceptance;
  actor.directionLegalAcceptance=paulaLegalProof(f);
  const identity={actorUidSha256:actor.directionLegalAcceptance.actorUidSha256,advisorId:'ase-paula-osorio',tenantId:'alianzas-soluciones',country:'GT'};
  actor.roleSelection={profile:PAULA_ROLE_PROFILE,...identity,initialRole:'direccion',activeRole:actor.role,normalSelector:true,rehydrated:true,sameIdentity:true,
   legalAcceptedAsRole:'direccion',membershipBeforeSha256:f.actor.membershipSha256,membershipAfterSha256:f.actor.membershipSha256,
   assignedRolesSha256:f.actor.assignedRolesSha256,identityScopeSha256:personalDigest(identity),reloadIdentityChecks:f.cfg.phase==='LIVE'?2:0};
 }
 return report;
}
const validatePaula=(r,f)=>validateSignedReport(r,{phase:f.cfg.phase,sourceSha:SOURCE,buildId:BUILD,roleAuthority:f.authority,cancellationQa:true});

test('Paula assigned roles preserve the published 63 Preview readonly and 113 LIVE cancellation audit restore checks',()=>{
 for(const phase of ['PREVIEW','LIVE']){
  const f=paulaFixture(phase),report=paulaSignedReport(f),result=validatePaula(report,f);
  assert.equal(result.checks,phase==='PREVIEW'?63:113);assert.equal(result.profile,PAULA_ROLE_PROFILE);
  assert.equal(result.coverage,phase==='PREVIEW'?'PUBLIC_ENTRIES_AND_CANCELLATION_READONLY':'NORMAL_UI_RENEWAL_ENDORSEMENT_CANCELLATION_READBACK_RELOAD_REPLAY');
  for(const actor of report.actors){
   assert.equal(actor.readonly,phase==='PREVIEW');
   assert.equal(actor.roleSelection.reloadIdentityChecks,phase==='LIVE'?2:0);
   if(phase==='LIVE'){assert.equal(actor.cancellationWrite.paymentRows,0);assert.equal(actor.cancellationWrite.auditCleanup,true);}
   else assert.equal(actor.cancellationWrite,undefined);
  }
 }
});
test('closed role profile is explicit; absent keeps legacy Carlos, mixed or unknown profiles are refused',()=>{
 assert.equal(directFormsProfile({directFormsQa:true}),null);
 for(const p of [{directFormsQa:true,cancellationQa:true,directFormsQaProfile:'ANY_ROLE'},
  {cancellationQa:true,directFormsQaProfile:PAULA_ROLE_PROFILE},{directFormsQa:true,directFormsQaProfile:PAULA_ROLE_PROFILE},
  {directFormsQa:true,cancellationQa:true,directFormsQaProfile:PAULA_ROLE_PROFILE,directFormsPersonalLegal:{}}])assert.throws(()=>directFormsProfile(p));
 const f=paulaFixture();assert.equal(configuration({...BASE,I66_CANCELLATION_QA:'1',I66_DIRECT_FORMS_QA_PROFILE:PAULA_ROLE_PROFILE}).qaProfile,PAULA_ROLE_PROFILE);
 assert.throws(()=>configuration({...BASE,I66_CANCELLATION_QA:'1',I66_DIRECT_FORMS_QA_PROFILE:'ANY_ROLE'}));
 assert.throws(()=>configuration({...BASE,I66_DIRECT_FORMS_QA_PROFILE:PAULA_ROLE_PROFILE}),/CANCELLATION_PROFILE_REQUIRED/);
 assert.equal(release.envFor(f.candidate).I66_DIRECT_FORMS_QA_PROFILE,PAULA_ROLE_PROFILE);
 assert.throws(()=>validateSignedReport(paulaSignedReport(f),{phase:'PREVIEW',sourceSha:SOURCE,buildId:BUILD,personalAuthority:personalFixture().authority,cancellationQa:true}),/UNBOUND_PROFILE/);
});
test('Paula profile cannot omit current cancellation proof, claim paid-policy coverage or use the old 78/100 contract',()=>{
 for(const phase of ['PREVIEW','LIVE'])for(const mutate of [
  r=>{delete r.cancellationQa;},r=>{delete r.actors[1].cancellationDraft;},r=>{r.actors[0].cancellationDraft.noDraftWrites=false;},
  r=>{r.actors[0].roleSelection.reloadIdentityChecks=99;},
  r=>{if(phase==='LIVE')r.actors[0].cancellationWrite.auditCleanup=false;else r.actors[0].cancellationWrite={normalUi:true};},
  r=>{if(phase==='LIVE')r.actors[0].cancellationWrite.paymentRows=1;else r.actors[0].readonly=false;}
 ]){const f=paulaFixture(phase),r=paulaSignedReport(f);mutate(r);assert.throws(()=>validatePaula(r,f));}
});
test('new role proof refuses changed identity, country, membership, unassigned roles and substituted personal acceptance',()=>{
 const mutations=[r=>r.actors[0].roleSelection.actorUidSha256='0'.repeat(64),r=>r.actors[0].roleSelection.country='CO',
  r=>r.actors[0].roleSelection.advisorId='ase-carlos-castro',r=>r.actors[0].roleSelection.normalSelector=false,
  r=>r.actors[0].roleSelection.rehydrated=false,r=>r.actors[0].roleSelection.membershipAfterSha256='1'.repeat(64),
  r=>r.actors[1].roleSelection.assignedRolesSha256='2'.repeat(64),r=>r.actors[0].personalLegalAcceptance={},
  r=>r.actors[0].directionLegalAcceptance.storageSeeded=true,r=>r.actors[0].directionLegalAcceptance.acceptedForOtherActors=true];
 for(const mutate of mutations){const f=paulaFixture(),r=paulaSignedReport(f);mutate(r);assert.throws(()=>validatePaula(r,f));}
});
test('membership resolution reads one real Paula assignment and refuses role changes or another actor before fixtures',()=>{
 const f=paulaFixture(),row={uid:f.actor.uid,data:f.member},actors=resolvePaulaAssignedActors([row],f.authority);
 assert.deepEqual(actors.map(a=>a.role),['operativo','direccion']);assert.equal(actors[0].uid,actors[1].uid);
 assert.equal(actors[0].advisorId,'ase-paula-osorio');assert.deepEqual(row.data,f.member);
 for(const patch of [{roles:['Dirección']},{activeRole:'Operativo'},{status:'pending'},{countries:['CO']},{tenantId:'other'},{advisorId:'other'}])
  assert.throws(()=>resolvePaulaAssignedActors([{uid:row.uid,data:{...f.member,...patch}}],f.authority));
 assert.throws(()=>resolvePaulaAssignedActors([row,row],f.authority));assert.throws(()=>resolvePaulaAssignedActors([row],{...f.authority}));
});
function paulaGit(f,overrides={}){
 const calls=[];return{calls,execFileSync(command,args){calls.push([command,...args]);const [action,...tail]=args;
  if(action==='fetch')return'';if(action==='rev-parse')return f.controlHeadSha;
  if(action==='merge-base'){if(overrides.ancestry)throw Error('PRIVATE_GIT_ERROR');return'';}
  if(action==='diff')return overrides.ownerDrift?'tools/changed.cjs':'';
  if(action==='show'){
   const [ref,...pieces]=tail[0].split(':'),file=pieces.join(':');
   if(file===release.CONTROL)return f.controlBytes.toString();
   if(file===directionOwner.I66_SCOPE.receiptPath)return overrides.revoked&&ref===f.controlHeadSha?'{}':f.previewReceiptBytes.toString();
   if(file===directionOwner.LIVE_SCOPE.authorizationPath)return f.liveReceiptBytes.toString();
   if(file===directionOwner.LIVE_SCOPE.proposalPath)return f.proposalBytes.toString();
   if(file===PERSONAL_LEGAL.legalOwnerPath)return fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  }
  throw Error('UNEXPECTED_TEST_GIT');
 }};
}
test('new profile current-control preflight never reads Carlos personal authorization and rejects revoked or drifted sources',()=>{
 const f=paulaFixture(),io=paulaGit(f),a=readCurrentPaulaRoleAuthority({cfg:f.cfg,candidate:f.candidate},io);
 assert.equal(a.profile,PAULA_ROLE_PROFILE);assert.equal(io.calls.some(x=>x.some(v=>String(v).includes('CARLOS_DIRECT_FORMS_PERSONAL'))),false);
 for(const overrides of [{ancestry:true},{ownerDrift:true},{revoked:true}])assert.throws(()=>readCurrentPaulaRoleAuthority({cfg:f.cfg,candidate:f.candidate},paulaGit(f,overrides)));
 const bad={...f.candidate,artifactId:999};assert.throws(()=>readCurrentPaulaRoleAuthority({cfg:f.cfg,candidate:bad},paulaGit(f)));
});
test('metadata-only current HEAD movement preserves exact candidate and existing Direction legal bytes',()=>{
 const f=paulaFixture();f.controlHeadSha='8'.repeat(40);
 assert.equal(readCurrentPaulaRoleAuthority({cfg:f.cfg,candidate:f.candidate},paulaGit(f)).controlHeadSha,f.controlHeadSha);
});
function rolePage(f,{afterUid,missingRole=false}={}){
 const events=[];let active='Dirección',country='GT';
 const page={locator(selector){return{inputValue:async()=>country,selectOption:async v=>{events.push(['normal-select',selector,v]);if(selector==='#rol-sel')active=v;else country=v;}};},
  async evaluate(fn){if(fn.name==='directFormsPaulaRoleSnapshot')return{uid:active==='Operativo'&&afterUid?afterUid:f.actor.uid,signedUid:f.actor.uid,advisorId:'ase-paula-osorio',tenantId:'alianzas-soluciones',role:active,country,
    assignedRoles:missingRole?['Dirección']:['Dirección','Operativo','Asesor'],appStarted:true,canRenew:true,canIssue:true,canCancel:true};events.push(['rehydrate']);},
  async waitForFunction(_fn,arg){events.push(['wait',arg]);}};
 return{page,events};
}
test('Paula switches only through the normal assigned-role selector after her Direction proof and verifies scope before proceeding',async()=>{
 const f=paulaFixture(),h=rolePage(f),proof=await selectPaulaAssignedRole({page:h.page,actor:f.actor,authority:f.authority,directionLegalAcceptance:paulaLegalProof(f)},
  {readiness:async()=>h.events.push(['legal-record-reused-same-actor'])});
 assert.deepEqual(h.events[0],['normal-select','#rol-sel','Operativo']);assert.equal(proof.sameIdentity,true);assert.equal(proof.activeRole,'operativo');
 assert.ok(h.events.some(x=>x[0]==='rehydrate'));assert.equal(h.events.at(-1)[0],'legal-record-reused-same-actor');
 assert.equal(proof.membershipBeforeSha256,f.actor.membershipSha256);assert.equal(proof.membershipAfterSha256,null);
 assert.doesNotMatch(selectPaulaAssignedRole.toString(),/session\.set|localStorage|createCustomToken|\.update\(|\.set\(/);
});
test('a different signed actor after role selection or an unassigned role cannot proceed',async()=>{
 const f=paulaFixture();for(const opts of [{afterUid:'OTHER_UID'},{missingRole:true}]){
  const h=rolePage(f,opts);await assert.rejects(selectPaulaAssignedRole({page:h.page,actor:f.actor,authority:f.authority,directionLegalAcceptance:paulaLegalProof(f)},{readiness:async()=>{throw Error('SHOULD_NOT_REACH');}}));
 }
});

for(const phase of ['PREVIEW','LIVE'])test('request-required assigned-role cancellation profile cannot be omitted or substituted in '+phase,()=>{
 const f=paulaFixture(phase);f.control.frontendPreviewRequest={directFormsQa:true,directFormsQaProfile:PAULA_ROLE_PROFILE};
 assert.equal(release.candidateForPhase(f.control,phase.toLowerCase()).directFormsQaProfile,PAULA_ROLE_PROFILE);
 for(const mutate of [p=>delete p.directFormsQaProfile,p=>p.directFormsQaProfile='OTHER_PROFILE',p=>delete p.directFormsQa,p=>p.directFormsQa=false]){
  const c=JSON.parse(JSON.stringify(f.control));mutate(c.operationalReleaseCandidate);
  assert.throws(()=>release.candidateForPhase(c,phase.toLowerCase()),/I66_(DIRECT_FORMS_REQUIRED_|CANCELLATION_DIRECT_FORMS_QA_REQUIRED)/);
 }
 const legacy=personalFixture(phase);assert.equal(legacy.control.frontendPreviewRequest?.directFormsQaProfile,undefined);
 assert.equal(release.candidateForPhase(legacy.control,phase.toLowerCase()).directFormsQaProfile,undefined);
});

for(const phase of ['PREVIEW','LIVE'])test('assigned-role preflight routes only the current Paula authority before mutations in '+phase,()=>{
 const source=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-operational-release-candidate.cjs'),'utf8');
 const start=source.indexOf('function assertDirectFormsPersonalAuthority('),end=source.indexOf('\nfunction focusedReportsFromDisk',start);
 const f=paulaFixture(phase),calls=[];
 const context={assert,LIVE:'https://app.aysseguros.com',require:()=>({PAULA_ROLE_PROFILE,directFormsProfile,
  readCurrentPersonalLegalAuthority:()=>{throw Error('CARLOS_AUTHORITY_MUST_NOT_BE_READ');},
  readCurrentPaulaRoleAuthority:args=>{calls.push(args);return f.authority;}})};
 vm.runInNewContext(source.slice(start,end)+'\nthis.preflight=assertDirectFormsPersonalAuthority;',context);
 assert.equal(context.preflight(f.candidate,phase),f.authority);assert.equal(calls.length,1);
 assert.equal(calls[0].candidate,f.candidate);assert.equal(calls[0].cfg.qaProfile,PAULA_ROLE_PROFILE);
 assert.equal(calls[0].cfg.origin,f.cfg.origin);assert.equal(calls[0].cfg.source,SOURCE);
});

for(const phase of ['PREVIEW','LIVE'])test('collector validates current assigned-role authority and retains cancellation audit coverage in '+phase,()=>{
 const source=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-operational-release-candidate.cjs'),'utf8');
 const start=source.indexOf('function focusedReportsFromDisk('),end=source.indexOf('\nfunction verifyPinnedOwners',start);
 const f=paulaFixture(phase),report=paulaSignedReport(f),reads=[];let validated=0;
 const context={assert,path,crypto:require('node:crypto'),JSON,process:{env:{}},
  fs:{readFileSync:p=>{reads.push(p);return JSON.stringify(p.includes('gi-i66-direct-forms')?report:{status:'PASS',cleanup:{status:'PASS'},checks:[1]});}},
  validateFocusedReports:()=>{},signedObservabilityReports:()=>null,
  assertDirectFormsPersonalAuthority:()=>f.authority,
  require:()=>({PAULA_ROLE_PROFILE,directFormsProfile,validateSignedReport:(r,options)=>{
   assert.equal(options.personalAuthority,undefined);assert.equal(options.roleAuthority,f.authority);
   assert.equal(options.cancellationQa,true);validated++;return validateSignedReport(r,options);
  }})};
 vm.runInNewContext(source.slice(start,end)+'\nthis.collect=focusedReportsFromDisk;',context);
 const env={RUNNER_TEMP:'/synthetic',I66_PACKAGE_ROOT:'/synthetic'},compact=context.collect(f.candidate,phase,env).directForms;
 assert.equal(compact.status,'PASS');assert.equal(compact.profile,PAULA_ROLE_PROFILE);assert.equal(validated,1);
 assert.equal(compact.checks,phase==='PREVIEW'?63:113);
 assert.equal(compact.coverage,phase==='PREVIEW'?'SIGNED_PUBLIC_ENTRIES_AND_CANCELLATION_READONLY':'SIGNED_NORMAL_UI_RENEWAL_ENDORSEMENT_CANCELLATION_READBACK_RELOAD_REPLAY');
 assert.equal(compact.digest,'sha256:'+personalHash(JSON.stringify(report)));
 reads.length=0;context.assertDirectFormsPersonalAuthority=()=>{throw Error('I66_DIRECT_FORMS_ROLE_CURRENT_AUTHORITY_UNAVAILABLE');};
 assert.throws(()=>context.collect(f.candidate,phase,env),/CURRENT_AUTHORITY_UNAVAILABLE/);assert.deepEqual(reads,[]);
});

test('Preview proof cannot substitute a legacy actor summary for the request-bound Paula profile',()=>{
 const f=paulaFixture('PREVIEW'),p=f.candidate;
 const proof={schema:'I6_6_OPERATIONAL_SIGNED_PREVIEW_PROOF_V1',status:'SIGNED_DRIVERS_DURABLE_READBACK_RELOAD_RESTORE_PASS',
  ...Object.fromEntries(['sourceSha','buildId','buildRunId','artifactId','artifactDigest','previewUrl','previewChannelId'].map(k=>[k,p[k]])),
  targets:copy(release.targetsForCandidate(p,'preview')),signedDrivers:[...release.DRIVERS],realFinancialOrCustomerWrites:0,
  syntheticRestoreComplete:true,liveHostingUnchanged:true,liveBackendUnchanged:true,
  focusedReports:Object.fromEntries(['advisorPayables','proposalApplication','directForms'].map(k=>[k,{status:'PASS',cleanup:'PASS',checks:k==='directForms'?63:1,digest:'sha256:'+'7'.repeat(64)}]))};
 Object.assign(proof.focusedReports.directForms,{phase:'PREVIEW',profile:PAULA_ROLE_PROFILE,coverage:'SIGNED_PUBLIC_ENTRIES_AND_CANCELLATION_READONLY'});
 assert.doesNotThrow(()=>release.validateProof(p,proof));
 for(const profile of [undefined,'OTHER_PROFILE']){const bad=copy(proof);bad.focusedReports.directForms.profile=profile;assert.throws(()=>release.validateProof(p,bad),/ROLE_PROFILE_DRIFT/);}
});

test('LIVE proof cannot substitute a legacy actor summary while preserving all 113 cancellation checks',()=>{
 const fixturePath=path.join(__dirname,'gravicentra-i6-6-operational-live-acceptance.test.cjs'),source=fs.readFileSync(fixturePath,'utf8');
 const end=source.indexOf('\nfunction sealed(');assert.ok(end>0);
 const sandbox={require:require('node:module').createRequire(fixturePath),module:{exports:{}}};
 vm.runInNewContext(source.slice(0,end)+'\nthis.makeRoleLiveFixture=fixture;',sandbox);
 const f=copy(sandbox.makeRoleLiveFixture()),p=f.receipt.candidate;
 p.directFormsQa=true;p.cancellationQa=true;p.directFormsQaProfile=PAULA_ROLE_PROFILE;
 p.cancellationRecoveryQa=copy(paulaFixture('LIVE').candidate.cancellationRecoveryQa);
 f.proof.focusedReports.directForms={status:'PASS',cleanup:'PASS',checks:113,digest:'sha256:'+'7'.repeat(64),phase:'LIVE',
  profile:PAULA_ROLE_PROFILE,coverage:'SIGNED_NORMAL_UI_RENEWAL_ENDORSEMENT_CANCELLATION_READBACK_RELOAD_REPLAY'};
 assert.doesNotThrow(()=>release.validateLiveProof(p,f.proof));
 for(const profile of [undefined,'OTHER_PROFILE']){const bad=copy(f.proof);bad.focusedReports.directForms.profile=profile;assert.throws(()=>release.validateLiveProof(p,bad),/ROLE_PROFILE_DRIFT/);}
});

test('assigned-role proof requires both real LIVE reload identity readbacks and no simulated Preview reload claim',()=>{
 for(const phase of ['PREVIEW','LIVE'])for(const count of phase==='LIVE'?[0,1,3]:[1,2]){
  const f=paulaFixture(phase),report=paulaSignedReport(f);report.actors[0].roleSelection.reloadIdentityChecks=count;
  assert.throws(()=>validatePaula(report,f),/RELOAD_IDENTITY_REQUIRED/);
 }
});

test('normal role selector fails before interaction for changed Direction legal proof',async()=>{
 const f=paulaFixture();for(const mutate of [p=>p.actorUidSha256='0'.repeat(64),p=>p.storageSeeded=true,p=>p.origin='https://other.invalid',p=>p.version='3.0']){
  const h=rolePage(f),proof=paulaLegalProof(f);mutate(proof);
  await assert.rejects(selectPaulaAssignedRole({page:h.page,actor:f.actor,authority:f.authority,directionLegalAcceptance:proof}));
  assert.deepEqual(h.events,[]);
 }
});

test('source-current authority refuses drift in each newly selected causal receipt before assigned-role fixtures',()=>{
 const receipts=[
  'I6_6_DIRECT_FORMS_ASSIGNED_ROLES_AND_INSURER_EDITOR_CAUSAL_SOURCE_20261124.json',
  'I6_6_EFFECTIVE_CANCELLATION_ASSIGNED_ROLES_CAUSAL_SOURCE_20261124.json',
  'I6_6_R51_ASSIGNED_ROLES_INSURER_FINANCIAL_RECOVERY_SOURCE_20261124.json'];
 for(const name of receipts){
  const f=paulaFixture(),io=paulaGit(f),original=io.execFileSync;
  const receipt='artifacts/orbit360-recovery/release-control/'+name;
  io.execFileSync=(command,args)=>args[0]==='diff'?(args.includes(receipt)?receipt:''):original(command,args);
  assert.throws(()=>readCurrentPaulaRoleAuthority({cfg:f.cfg,candidate:f.candidate},io),/CURRENT_AUTHORITY_UNAVAILABLE|SOURCE_OR_OWNER_DRIFT/);
 }
});
