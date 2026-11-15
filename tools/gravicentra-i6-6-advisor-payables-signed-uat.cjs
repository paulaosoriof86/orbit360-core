'use strict';
// Existing same-project CI credentials + existing signed actors only.
// No Auth/membership changes, no bank/payment commands, no real source lines.
// This runner is opt-in and deletes only exact disposable fixtures it created.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const contract=require('../functions/advisor-commission-payable-contract');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const SOURCE_SCHEMA='gravicentra-advisor-commission-source-batch-v1';
const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const digest=value=>hash(JSON.stringify(stable(value)));
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function configuration(env){
  const live=env.I66_SIGNED_TEST_LIVE==='true',origin=String(env.I66_PREVIEW_ORIGIN||''),source=String(env.I66_SOURCE_SHA||'');
  assert.match(source,/^[a-f0-9]{40}$/,'ADVISOR_UAT_SOURCE_SHA_REQUIRED');
  assert.match(origin,live?/^https:\/\/app\.aysseguros\.com$/:/^https:\/\/ays-orbit-360-lab--gi-i66-rc-[a-z0-9-]+\.web\.app$/,'ADVISOR_UAT_EXACT_AUTHORIZED_ORIGIN_REQUIRED');
  return {live,origin,source,phase:live?'LIVE':'PREVIEW',region:live?'us-central1':'us-east1',
    functionName:live?'orbit360ProductOperationalCommand':'orbit360ProductOperationalCommandPreview',
    packageRoot:env.I66_PACKAGE_ROOT||'',reportPath:env.I66_ADVISOR_PAYABLE_UAT_REPORT||
      path.join(env.RUNNER_TEMP||os.tmpdir(),'gravicentra-i66-advisor-payables-signed-uat-'+(live?'live':'preview')+'.json')};
}
function sourceIdentity(spec,uid,previewOnly){
  const inputDigest=digest({advisorId:spec.advisorId,cutoff:spec.cutoff,refs:[].concat(spec.commissionIds||[]),
    supplied:[].concat(spec.lines||[]),syntheticRun:spec.syntheticQa===true,previewOnly});
  const requestId='advisorpay_'+hash(TENANT+'|'+uid+'|'+inputDigest).slice(0,32);
  return {requestId,inputDigest,eventId:'opevt_'+hash(TENANT+'|'+requestId).slice(0,28),
    restoreEventId:'opevt_'+hash(TENANT+'|'+requestId+'|restore').slice(0,28)};
}
function fixtures(runId){
  assert.match(runId,/^b4003qa_i66_cxp_[a-z0-9_]+$/,'ADVISOR_UAT_DISPOSABLE_RUN_ID_REQUIRED');
  const ids={client:runId+'_client',advisor70:runId+'_advisor70',advisor60:runId+'_advisor60',
    policy70:runId+'_policy70',policy60:runId+'_policy60',oldPayablePolicy:runId+'_old_cxp_policy',
    oldCommissionPolicy:runId+'_old_com_policy',oldPayable:runId+'_old_cxp',oldCommission:runId+'_old_com',ordinary:runId+'_ordinary'};
  const base=id=>({id,tenantId:TENANT,pais:'GT',__syntheticQa:true,__qaRunId:runId});
  const adviser=(id,pct)=>({...base(id),nombre:'QA liquidación '+pct,activo:true,estado:'Activo',paises:['GT'],countries:['GT'],paisDefault:'GT',roles:['Asesor'],tipo:'Asesor',comModo:'comision',shareCom:pct});
  const policy=(id,advisorId)=>({...base(id),clienteId:ids.client,asesorId:advisorId,numero:'QA-'+id,
    moneda:'GTQ',estado:'Vigente',renovable:true,vigenciaInicio:'2026-01-01',vigenciaFin:'2026-12-31'});
  const rows=[
    ['asesores',adviser(ids.advisor70,70)],['asesores',adviser(ids.advisor60,60)],
    ['clientes',{...base(ids.client),nombre:'QA cliente descartable',asesorId:ids.advisor70}],
    ['polizas',policy(ids.policy70,ids.advisor70)],['polizas',policy(ids.policy60,ids.advisor60)],
    ['polizas',policy(ids.oldPayablePolicy,ids.advisor70)],['polizas',policy(ids.oldCommissionPolicy,ids.advisor70)],
    ['finmovs',{...base(ids.oldPayable),tipo:'egreso',clase:'Comisiones asesores',estado:'pagado',pagada:true,
      polizaId:ids.oldPayablePolicy,asesorId:ids.advisor70,clienteId:ids.client,periodo:'2026-10',moneda:'GTQ',valor:7,pagado:7,pendiente:0}],
    ['comisiones',{...base(ids.oldCommission),polizaId:ids.oldCommissionPolicy,asesorId:ids.advisor70,
      clienteId:ids.client,periodo:'2026-10',moneda:'GTQ',monto:10,estado:'Liquidada'}],
    ['finmovs',{...base(ids.ordinary),tipo:'egreso',clase:'Servicios',concepto:'QA servicio anterior',estado:'pendiente',
      asesorId:ids.advisor70,periodo:'2026-10',moneda:'GTQ',valor:5,pagado:0,pendiente:5}]
  ];
  const line=(policyId,pct,index,amount)=>({polizaId:policyId,ordinaryCommission:amount,commissionKind:'ordinary',
    source:{fileId:runId+'_statement',lineId:'QA-sheet:'+index,sha256:hash(runId+'_statement_bytes'),
      reference:'https://example.invalid/qa-only/'+runId,requirementRef:'QA-OCT-'+runId+'-'+index},
    accreditation:{status:'accredited',date:'2026-10-31'},collectionPeriod:'2026-10',moneda:'GTQ',
    participation:{pct,authorityRef:'QA-only-explicit-'+pct}});
  const specs=[{version:1,operation:'preview',advisorId:ids.advisor70,cutoff:'2026-11-15',syntheticQa:true,lines:[line(ids.policy70,70,1,101.31)]},
    {version:1,operation:'preview',advisorId:ids.advisor60,cutoff:'2026-11-15',syntheticQa:true,lines:[line(ids.policy60,60,2,75.55)]}];
  const historical=[{...specs[0],lines:[line(ids.oldPayablePolicy,70,3,10)]},
    {...specs[0],lines:[line(ids.oldCommissionPolicy,70,4,10)]}];
  const plans=specs.map(spec=>contract.normalizeLine(spec.lines[0],{tenantId:TENANT,cutoff:spec.cutoff,synthetic:true,
    advisor:rows.find(([collection,row])=>collection==='asesores'&&row.id===spec.advisorId)[1],
    policy:rows.find(([collection,row])=>collection==='polizas'&&row.id===spec.lines[0].polizaId)[1]}));
  return {runId,ids,rows,specs,historical,plans};
}
function assertGenerated(row,expected,requestId,uid,kind){
  assert.ok(row&&row.__syntheticQa===true&&/^b4003qa_/.test(row.id),'ADVISOR_UAT_NON_SYNTHETIC_CLEANUP_DENIED');
  assert.equal(row.tenantId,TENANT,'ADVISOR_UAT_CLEANUP_TENANT_CONFLICT');
  assert.equal(row.preparationRequestId,requestId,'ADVISOR_UAT_CLEANUP_REQUEST_CONFLICT');
  assert.equal(row.createdByUid,uid,'ADVISOR_UAT_CLEANUP_ACTOR_CONFLICT');
  assert.equal(row.financialDigest,expected.financialDigest,'ADVISOR_UAT_CLEANUP_DIGEST_CONFLICT');
  const metadata=new Set(['preparationRequestId','createdAt','createdByUid','updatedAt','updatedByUid']);
  assert.equal(digest(Object.fromEntries(Object.keys(expected).map(key=>[key,row[key]]))),digest(expected),'ADVISOR_UAT_CLEANUP_SOURCE_OR_BUSINESS_CHANGED');
  assert.ok(Object.keys(row).every(key=>Object.prototype.hasOwnProperty.call(expected,key)||metadata.has(key)),'ADVISOR_UAT_CLEANUP_UNRECOGNIZED_FIELD');
  if(kind==='finmovs'){
    assert.ok(contract.compatiblePayable(row,expected),'ADVISOR_UAT_CLEANUP_PAYABLE_CONFLICT');
    assert.equal(row.estado,'pendiente');assert.equal(row.pagada,false);assert.equal(row.pagado,0);
    assert.equal(row.pendiente,row.valor);assert.equal(row.noBankMovement,true);
  }else{
    for(const key of ['id','tenantId','polizaId','asesorId','clienteId','moneda','pais','monto','montoAsesor','cxpAsesorId'])
      assert.equal(row[key],expected[key],'ADVISOR_UAT_CLEANUP_COMMISSION_CONFLICT_'+key);
    assert.equal(row.estado,'Devengada');
  }
}
function sourceAuditGuard(kind,row,identity,uid,live,expectedIds,expectedTargetIds=[]){
  assert.ok(row,'ADVISOR_UAT_SOURCE_AUDIT_MISSING');
  if(kind==='request'){
    assert.equal(row.actorUid,uid);assert.equal(row.payloadDigest,identity.inputDigest);
    assert.ok(['committed','restored'].includes(row.status));
    assert.equal(row.result?.schemaVersion,contract.SCHEMA);assert.equal(row.result?.syntheticQa,true);
    assert.equal(row.result?.previewIsolated,!live);assert.equal(row.result?.requestId,identity.requestId);
    assert.deepEqual(row.result.payables.map(item=>item.id).sort(),expectedIds.slice().sort());
    assert.equal(row.result.financialPayments,0);assert.equal(row.result.bankMovements,0);
  }else{
    assert.equal(row.tenantId,TENANT);assert.equal(row.actorUid,uid);assert.equal(row.schemaVersion,contract.SCHEMA);
    if(kind==='event'){
      assert.equal(row.requestId,identity.requestId);assert.equal(row.payloadDigest,identity.inputDigest);
      assert.equal(row.action,'prepare_advisor_commission_payables');
      assert.deepEqual(row.payableIds.slice().sort(),expectedIds.slice().sort());
      assert.equal(row.financialPayments,0);assert.equal(row.bankMovements,0);
    }else{
      assert.equal(row.preparedRequestId,identity.requestId);assert.equal(row.action,'restore_advisor_payable_synthetic');
      assert.ok(row.targets.every(item=>/^b4003qa_/.test(item.id)&&expectedTargetIds.includes(item.id)&&['finmovs','comisiones'].includes(item.collection)));
    }
  }
}
function genericAuditGuard(kind,row,expected,uid){
  assert.equal(row.payloadDigest,expected.payloadDigest,'ADVISOR_UAT_GENERIC_AUDIT_PAYLOAD_CHANGED');
  if(kind==='request'){
    assert.equal(row.status,'committed');assert.equal(row.result?.requestId,expected.requestId);
    assert.equal(row.result?.eventId,expected.eventId);assert.equal(row.result?.mutationCount,1);
    assert.deepEqual(row.result?.collections,['finmovs']);assert.equal(row.result?.serverOwned,true);
  }else{
    assert.equal(row.tenantId,TENANT);assert.equal(row.actorUid,uid);assert.equal(row.requestId,expected.requestId);
    assert.equal(row.eventId,expected.eventId);assert.equal(row.mutationCount,1);assert.deepEqual(row.collections,['finmovs']);
  }
}
function unchangedSeed(row,original,ordinaryId,uid){
  if(digest(row)===digest(original))return true;
  if(original.id!==ordinaryId||row.updatedByUid!==uid||!row.updatedAt)return false;
  const {updatedAt,updatedByUid,...business}=row;
  return digest(business)===digest({...original,concepto:'QA servicio editado'});
}
function configuredCredential(env){
  // Only keys already provisioned to this workflow. Never search disk or vaults.
  if(env.GOOGLE_APPLICATION_CREDENTIALS){
    const candidate=JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    assert.ok(candidate.type==='service_account'&&candidate.project_id===PROJECT&&candidate.private_key,
      'ADVISOR_UAT_CONFIGURED_SAME_PROJECT_CREDENTIAL_REQUIRED');
    return candidate;
  }
  const candidate=['SA_LAB','SA_ALT','SA_DEFAULT'].map(key=>env[key]).filter(Boolean)
    .map(value=>{try{return JSON.parse(value);}catch{return null;}})
    .find(value=>value?.type==='service_account'&&value.project_id===PROJECT&&value.private_key);
  assert.ok(candidate,'ADVISOR_UAT_CONFIGURED_SAME_PROJECT_CREDENTIAL_REQUIRED');return candidate;
}
function assertServerDenial(out,code,reason){
  assert.equal(out.ok,false,'ADVISOR_UAT_UNEXPECTED_PERMISSION_GRANT');
  // A browser guard or runtime exception has no Functions status code. It
  // cannot count as evidence that the signed backend denied the operation.
  assert.ok(typeof out.code==='string'&&out.code.length>0,'ADVISOR_UAT_SERVER_DENIAL_NOT_REACHED');
  assert.ok(out.code.endsWith(code),'ADVISOR_UAT_DENIAL_CLASS_MISMATCH');
  if(reason)assert.equal(out.reason,reason,'ADVISOR_UAT_DENIAL_REASON_MISMATCH');
}
function safeFailureEvidence(error,stage){
  const stages=new Set(['BUILD_IDENTITY','FIXTURE_SETUP','SIGNED_SESSION','OPERATIVE_FINANCIAL_DENIAL',
    'FINANCE_UI_HYDRATION','DOCUMENT_FILE_UI_70','DOCUMENT_FILE_UI_60','REPLAY_AND_SOURCE_GUARDS',
    'LEGACY_GUARDS','LEGACY_FINANCE_EDIT','PENDING_CXP_RELOAD','SYNTHETIC_RESTORE']);
  const checks=['ADVISOR_UAT_SERVER_DENIAL_NOT_REACHED','ADVISOR_UAT_DENIAL_CLASS_MISMATCH',
    'ADVISOR_UAT_DENIAL_REASON_MISMATCH','ADVISOR_UAT_UNEXPECTED_PERMISSION_GRANT',
    'ADVISOR_UAT_SIGNED_COMMAND_REJECTED','ADVISOR_UAT_FILE_PREVIEW_NOT_CONFIRMED',
    'ADVISOR_UAT_UI_COMMIT_READBACK_MISSING','ADVISOR_UAT_BUSINESS_LIQUIDATION_SEMANTICS',
    'ADVISOR_UAT_REPLAY_DUPLICATED_DEBT','ADVISOR_UAT_ORDINARY_FINANCE_REGRESSION',
    'ADVISOR_UAT_PROTECTED_RELOAD_MISMATCH','ADVISOR_UAT_DIRECTION_PAGE_ERROR',
    'ADVISOR_UAT_OPERATIVE_PAGE_ERROR','ADVISOR_UAT_FIRST_PARTY_ASSET_ERROR',
    'ADVISOR_UAT_SIGNED_SESSION_MISMATCH','ADVISOR_UAT_BUILD_SOURCE_DRIFT',
    'ADVISOR_UAT_ARTIFACT_MARKER_DRIFT','ADVISOR_UAT_CLEANUP_HOLD'];
  const message=String(error?.message||'');
  const check=checks.find(value=>message===value||message.startsWith(value+'_')||message.startsWith(value+'\n'));
  const location=String(error?.stack||'').match(/(?:^|[/\\])gravicentra-i6-6-advisor-payables-signed-uat\.cjs:(\d+):(\d+)/);
  return {failureClass:error?.code==='ERR_ASSERTION'?'ERR_ASSERTION':error?.name==='TimeoutError'?'TIMEOUT_ERROR':'ASSERTION_OR_RUNTIME_FAILURE',
    failureStage:stages.has(stage)?stage:'UNKNOWN_STAGE',failureCheck:check||'ASSERTION_OR_RUNTIME_FAILURE',
    failureLocation:location?{file:'gravicentra-i6-6-advisor-payables-signed-uat.cjs',line:Number(location[1]),column:Number(location[2])}:null};
}

async function main(){
  const cfg=configuration(process.env),runId='b4003qa_i66_cxp_'+Date.now().toString(36)+'_'+crypto.randomBytes(5).toString('hex');
  const report={schemaVersion:'gravicentra-i66-advisor-payables-signed-uat-v1',phase:cfg.phase,sourceSha:cfg.source,
    status:'HOLD',checks:[],realCustomerWritesRequested:0,bankMovements:0,financialPayments:0,
    authOrMembershipMutations:0,cleanup:{status:'NOT_STARTED',seeded:0,remaining:0}};
  const pass=name=>{report.checks.push({name,status:'PASS'});console.log('I66_ADVISOR_UAT_CHECK='+name);};
  let admin,browser,direction,operator,tenant,db,fx,sourceRequests=[],genericRequest,generated=[],seeds=[],allTargets=[],memberBefore=[];
  const observedAbsent=new Set();
  let originalFailure=null,cleanupFailure=null,stage='BUILD_IDENTITY';
  const rowRef=(collection,id)=>tenant.collection('data').doc(collection).collection('items').doc(id);
  const auditRef=(kind,id)=>tenant.collection(kind==='request'?'operationalRequests':'operationalEvents').doc(id);
  const exactBefore=async refs=>{
    for(const ref of refs){assert.equal((await ref.get()).exists,false,'ADVISOR_UAT_EXISTING_TARGET_COLLISION');allTargets.push(ref);observedAbsent.add(ref.path);}
  };
  const rawCall=async(session,input)=>session.page.evaluate(async({cfg,input})=>{
    try{
      const result=await Orbit.productRuntimeBrowserProvidersP0.callFunction(cfg.functionName,
        Object.assign({tenantId:'alianzas-soluciones',activeRole:Orbit.session.rol()},input),cfg.region);
      return {ok:true,result};
    }catch(error){return{ok:false,code:String(error.code||''),reason:String(error.details?.reason||'')};}
  },{cfg:{functionName:cfg.functionName,region:cfg.region},input});
  const call=async(session,input)=>{const out=await rawCall(session,input);assert.equal(out.ok,true,'ADVISOR_UAT_SIGNED_COMMAND_REJECTED_'+out.code+'_'+out.reason);return out.result;};
  const deny=async(session,input,code,reason)=>assertServerDenial(await rawCall(session,input),code,reason);
  try{
    const markerResponse=await fetch(cfg.origin+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}});
    assert.equal(markerResponse.ok,true,'ADVISOR_UAT_BUILD_MARKER_MISSING');const markerText=await markerResponse.text(),marker=JSON.parse(markerText);
    assert.equal(marker.sourceSha,cfg.source,'ADVISOR_UAT_BUILD_SOURCE_DRIFT');report.buildMarkerSha256=hash(markerText);
    if(cfg.packageRoot){
      const paths=['bundle/site/__recovery__/build.json','site/__recovery__/build.json','__recovery__/build.json'].map(p=>path.join(cfg.packageRoot,p)).filter(p=>fs.existsSync(p));
      assert.equal(paths.length,1,'ADVISOR_UAT_IMMUTABLE_PACKAGE_MARKER_REQUIRED');
      assert.equal(hash(fs.readFileSync(paths[0],'utf8')),report.buildMarkerSha256,'ADVISOR_UAT_ARTIFACT_MARKER_DRIFT');
    }
    pass('EXACT_SOURCE_AND_IMMUTABLE_BUILD_MARKER');
    stage='FIXTURE_SETUP';
    admin=require('firebase-admin');admin.initializeApp({credential:admin.credential.cert(configuredCredential(process.env)),projectId:PROJECT});
    db=admin.firestore();tenant=db.collection('tenants').doc(TENANT);
    const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),rowRef('asesores','unused').parent.limit(400).get()]);
    assert.ok(members.size<150&&advisors.size<400,'ADVISOR_UAT_ACTOR_BOUND_EXCEEDED');
    const choose=(name,role)=>{
      const advisorIds=new Set(),uids=new Set();
      for(const doc of advisors.docs){const row=doc.data()||{};if([row.nombre,row.nombreCompleto,row.displayName,row.name].some(value=>name(norm(value)))){advisorIds.add(doc.id);[row.authUid,row.uid,row.userId].filter(Boolean).forEach(value=>uids.add(String(value)));}}
      const hits=members.docs.filter(doc=>{const row=doc.data()||{};return (
        [row.nombre,row.displayName,row.name,row.nombreCompleto,row.fullName].some(value=>name(norm(value)))||
        advisorIds.has(String(row.advisorId||row.asesorId||''))||uids.has(doc.id))&&norm(row.activeRole)===role&&
        row.active!==false&&row.activo!==false&&['active','activo'].includes(norm(row.status||row.estado))&&
        [].concat(row.countries||row.paises||[]).map(value=>String(value).toUpperCase()).includes('GT');});
      assert.equal(hits.length,1,'ADVISOR_UAT_SIGNED_ACTOR_NOT_UNIQUE_'+role);
      memberBefore.push({ref:hits[0].ref,digest:digest(hits[0].data())});return{uid:hits[0].id,role};
    };
    const actors=[choose(value=>value.includes('paula')&&value.includes('osorio'),'direccion'),choose(value=>value.startsWith('carlos castro'),'operativo')];
    const accessRef=tenant.collection('config').doc('access'),accessSnap=await accessRef.get();
    memberBefore.push({ref:accessRef,digest:accessSnap.exists?digest(accessSnap.data()):null});
    fx=fixtures(runId);
    const identities=fx.specs.map(spec=>sourceIdentity(spec,actors[0].uid,!cfg.live));
    sourceRequests=identities.map((identity,index)=>({...identity,expectedIds:[fx.plans[index].payable.id]}));
    const laterSpec={...fx.specs[0],cutoff:'2026-12-15'};
    sourceRequests.push({...sourceIdentity(laterSpec,actors[0].uid,!cfg.live),expectedIds:[fx.plans[0].payable.id]});
    generated=fx.plans.flatMap((plan,index)=>[['comisiones',plan.commission],['finmovs',plan.payable]].map(([collection,expected])=>({collection,expected,requestId:identities[index].requestId,uid:actors[0].uid})));
    genericRequest={requestId:runId+'_legacy_update',eventId:'opevt_'+hash(TENANT+'|'+runId+'_legacy_update').slice(0,28),
      payloadDigest:digest([{collection:'finmovs',id:fx.ids.ordinary,action:'update',payload:{concepto:'QA servicio editado',__syntheticQa:true}}])};
    const refs=[...fx.rows.map(([collection,row])=>rowRef(collection,row.id)),...generated.map(item=>rowRef(item.collection,item.expected.id)),
      ...sourceRequests.flatMap(item=>[auditRef('request',item.requestId),auditRef('event',item.eventId),auditRef('event',item.restoreEventId)]),
      auditRef('request',genericRequest.requestId),auditRef('event',genericRequest.eventId)];
    await exactBefore(refs);pass('EVERY_FIXTURE_AND_AUDIT_TARGET_ORIGINALLY_ABSENT');
    for(const [collection,row] of fx.rows){const ref=rowRef(collection,row.id);await ref.create(row);seeds.push({ref,expected:row});}
    report.cleanup.seeded=seeds.length;
    stage='SIGNED_SESSION';
    const {chromium}=require('playwright');browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const openActor=async actor=>{
      const user=await admin.auth().getUser(actor.uid);assert.ok(!user.disabled&&user.emailVerified,'ADVISOR_UAT_ACTOR_AUTH_NOT_READY');
      const token=await admin.auth().createCustomToken(actor.uid),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
      const pageErrors=[],assetErrors=[],consoleErrors=[];page.on('pageerror',()=>pageErrors.push('PAGE_ERROR'));
      page.on('response',response=>{if(response.url().startsWith(cfg.origin+'/')&&response.status()>=400)assetErrors.push('FIRST_PARTY_HTTP_ERROR');});
      page.on('console',message=>{if(message.type()==='error')consoleErrors.push('CONSOLE_ERROR');});
      await page.goto(cfg.origin+'/#/inicio',{waitUntil:'commit',timeout:30000});
      await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
      const result=await page.evaluate(async token=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);await c.modules.auth.signInWithCustomToken(c.auth,token);const started=await Orbit.productAppP0.activate();return{started:started?.started===true,role:Orbit.session?.rol?.(),preview:p.isI66PreviewHost()};},token);
      assert.ok(result.started&&result.preview===!cfg.live&&norm(result.role)===actor.role,'ADVISOR_UAT_SIGNED_SESSION_MISMATCH');
      return{...actor,context,page,pageErrors,assetErrors,consoleErrors};
    };
    direction=await openActor(actors[0]);operator=await openActor(actors[1]);
    pass('EXISTING_DIRECTION_AND_OPERATIVE_SIGNED_WITH_UNCHANGED_MEMBERSHIP');
    stage='OPERATIVE_FINANCIAL_DENIAL';
    await deny(operator,{advisorPayable:fx.specs[0]},'permission-denied');
    for(const item of generated)assert.equal((await rowRef(item.collection,item.expected.id).get()).exists,false);
    pass('OPERATIVE_FINANCIAL_WRITE_DENIED_SERVER_SIDE_WITH_ZERO_DEBT');
    stage='FINANCE_UI_HYDRATION';
    await direction.page.evaluate(()=>Orbit.router.go('finanzas'));
    await direction.page.waitForSelector('.tab[data-t="asesores"]',{state:'visible',timeout:30000});
    await direction.page.evaluate(async()=>{await Orbit.store._ensureCollections(['asesores','clientes','polizas','comisiones','finmovs']);});
    await direction.page.waitForFunction(ids=>!!Orbit.store.get('asesores',ids.advisor70)&&!!Orbit.store.get('asesores',ids.advisor60)&&!!Orbit.store.get('polizas',ids.policy70)&&!!Orbit.store.get('finmovs',ids.ordinary),fx.ids,{timeout:30000});
    await direction.page.locator('.tab[data-t="asesores"]').click();
    const responseFor=operation=>direction.page.waitForResponse(response=>{
      try{return response.url()==='https://'+cfg.region+'-'+PROJECT+'.cloudfunctions.net/'+cfg.functionName&&response.request().postDataJSON()?.data?.advisorPayable?.operation===operation;}catch{return false;}
    },{timeout:30000});
    for(let index=0;index<fx.specs.length;index++){
      const spec=fx.specs[index],plan=fx.plans[index];
      stage=index===0?'DOCUMENT_FILE_UI_70':'DOCUMENT_FILE_UI_60';
      await direction.page.getByRole('button',{name:'Cargar liquidación documentada',exact:true}).click();
      await direction.page.locator('#fuente-asesor').selectOption(spec.advisorId);await direction.page.locator('#fuente-corte').fill(spec.cutoff);
      const batch={schemaVersion:SOURCE_SCHEMA,advisorId:spec.advisorId,cutoff:spec.cutoff,syntheticQa:true,lines:spec.lines};
      await direction.page.locator('#fuente-archivo').setInputFiles({name:'qa-document-source.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(batch))});
      await direction.page.waitForFunction(()=>document.querySelector('#fuente-lote')?.value.includes('gravicentra-advisor-commission-source-batch-v1'));
      const previewResponse=responseFor('preview');await direction.page.locator('#fuente-preview').click();
      const preview=(await (await previewResponse).json()).result;
      assert.ok(preview?.ok&&preview.readOnly&&preview.syntheticQa&&preview.newPayables===1,'ADVISOR_UAT_FILE_PREVIEW_NOT_CONFIRMED');
      assert.equal(preview.totals.GTQ,plan.payable.valor);assert.equal(preview.requestId,identities[index].requestId);
      assert.equal((await rowRef('finmovs',plan.payable.id).get()).exists,false);assert.equal((await auditRef('request',preview.requestId).get()).exists,false);
      await direction.page.waitForFunction(()=>document.querySelector('#lt-ok')?.disabled===false);
      const prepareResponse=responseFor('prepare');await direction.page.locator('#lt-ok').click();
      const receipt=(await (await prepareResponse).json()).result;
      assert.ok(receipt?.ok&&receipt.committed&&receipt.canonicalReadback&&receipt.canonicalReadbackCount===1,'ADVISOR_UAT_UI_COMMIT_READBACK_MISSING');
      assert.equal(receipt.financialPayments,0);assert.equal(receipt.bankMovements,0);assert.equal(receipt.payables[0].id,plan.payable.id);
      await direction.page.waitForSelector('#fin-liquidacion-asesor #liq-document',{state:'visible',timeout:30000});
      const documentText=await direction.page.locator('#liq-document').innerText();
      assert.ok(documentText.includes('no es comprobante de pago')&&documentText.includes(spec.advisorId===fx.ids.advisor70?'70%':'60%'),'ADVISOR_UAT_BUSINESS_LIQUIDATION_SEMANTICS');
      await direction.page.locator('#liq-close').click();
      for(const item of generated.filter(item=>item.requestId===receipt.requestId))assertGenerated((await rowRef(item.collection,item.expected.id).get()).data(),item.expected,item.requestId,direction.uid,item.collection);
      sourceAuditGuard('request',(await auditRef('request',receipt.requestId).get()).data(),identities[index],direction.uid,cfg.live,[plan.payable.id]);
      sourceAuditGuard('event',(await auditRef('event',receipt.eventId).get()).data(),identities[index],direction.uid,cfg.live,[plan.payable.id]);
      const replay=await call(direction,{advisorPayable:{...spec,operation:'prepare',previewDigest:preview.previewDigest}});
      assert.ok(replay.reused&&replay.newPayables===0&&replay.reusedPayables===1&&replay.totals.GTQ===0&&replay.canonicalReadback,'ADVISOR_UAT_REPLAY_DUPLICATED_DEBT');
      pass('DOCUMENT_FILE_UI_TO_PENDING_CXP_'+spec.lines[0].participation.pct+'_PERCENT_WITH_AUDIT_AND_IDEMPOTENCE');
    }
    stage='REPLAY_AND_SOURCE_GUARDS';
    const laterPreview=await call(direction,{advisorPayable:laterSpec});
    assert.equal(laterPreview.newPayables,0);assert.equal(laterPreview.reusedPayables,1);assert.equal(laterPreview.totals.GTQ,0);
    const later=await call(direction,{advisorPayable:{...laterSpec,operation:'prepare',previewDigest:laterPreview.previewDigest}});
    assert.equal(later.payables[0].id,fx.plans[0].payable.id);assert.equal(later.newPayables,0);assert.equal(later.canonicalReadback,true);
    await deny(direction,{advisorPayable:{...fx.specs[0],advisorId:fx.ids.advisor60}},'failed-precondition','ADVISOR_POLICY_CONFLICT');
    const changed={...fx.specs[0],lines:[{...fx.specs[0].lines[0],ordinaryCommission:102}]};
    await deny(direction,{advisorPayable:changed},'failed-precondition','SOURCE_LINE_ALREADY_INTERPRETED');
    pass('CROSS_CUTOFF_REUSES_DEBT_AND_CROSS_ADVISOR_OR_CHANGED_SOURCE_DENIED');
    stage='LEGACY_GUARDS';
    await deny(direction,{advisorPayable:fx.historical[0]},'failed-precondition','HISTORICAL_ADVISOR_BALANCE_LINK_REQUIRED');
    await deny(direction,{advisorPayable:fx.historical[1]},'failed-precondition','HISTORICAL_COMMISSION_LINK_REQUIRED');
    await deny(direction,{mutations:[{collection:'comisiones',id:fx.ids.oldCommission,action:'update',payload:{estado:'liquidada',__syntheticQa:true}}]},'failed-precondition');
    await deny(direction,{mutations:[{collection:'finmovs',id:fx.plans[0].payable.id,action:'update',payload:{estado:'pagado',pagada:true,__syntheticQa:true}}]},'failed-precondition');
    pass('LEGACY_PAYMENTS_COMMISSIONS_AND_PROTECTED_PAID_TOGGLE_PREVENT_DUPLICATION');
    stage='LEGACY_FINANCE_EDIT';
    const genericPayload={mutations:[{collection:'finmovs',id:fx.ids.ordinary,action:'update',payload:{concepto:'QA servicio editado',__syntheticQa:true}}],requestId:genericRequest.requestId};
    const generic=await call(direction,genericPayload);assert.ok(generic.ok&&generic.canonicalReadback,'ADVISOR_UAT_ORDINARY_FINANCE_REGRESSION');
    const ordinary=seeds.find(item=>item.expected.id===fx.ids.ordinary),ordinaryAfter=(await ordinary.ref.get()).data();
    assert.equal(ordinaryAfter.concepto,'QA servicio editado');assert.equal(ordinaryAfter.valor,5);assert.equal(ordinaryAfter.pagado,0);
    assert.equal(ordinaryAfter.__qaRunId,runId);ordinary.expected=ordinaryAfter;
    genericAuditGuard('request',(await auditRef('request',genericRequest.requestId).get()).data(),genericRequest,direction.uid);
    genericAuditGuard('event',(await auditRef('event',genericRequest.eventId).get()).data(),genericRequest,direction.uid);
    pass('UNRELATED_LEGACY_FINANCE_RETAINS_AUTHORIZED_EDIT');
    stage='PENDING_CXP_RELOAD';
    await direction.page.reload({waitUntil:'commit',timeout:30000});
    await direction.page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const reloaded=await direction.page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();const uid=(await p.waitForUser())?.uid;const ready=(await Orbit.productAppP0.activate())?.started===true;Orbit.router.go('finanzas');await Orbit.store._ensureCollections(['finmovs','comisiones']);return{uid,ready};});
    assert.equal(reloaded.uid,direction.uid);assert.equal(reloaded.ready,true);
    await direction.page.waitForFunction(ids=>ids.every(id=>!!Orbit.store.get('finmovs',id)),fx.plans.map(plan=>plan.payable.id),{timeout:30000});
    const reread=await direction.page.evaluate(ids=>ids.map(id=>{const row=Orbit.store.get('finmovs',id);return{id:row.id,estado:row.estado,pendiente:row.pendiente,pagado:row.pagado,pctAsesor:row.pctAsesor,asesorId:row.asesorId,source:row.source,financialDigest:row.financialDigest};}),fx.plans.map(plan=>plan.payable.id));
    reread.forEach((row,index)=>{const expected=fx.plans[index].payable;for(const key of ['id','estado','pendiente','pagado','pctAsesor','asesorId','financialDigest'])assert.equal(row[key],expected[key],'ADVISOR_UAT_PROTECTED_RELOAD_MISMATCH_'+key);assert.deepEqual(row.source,expected.source);});
    assert.equal(direction.pageErrors.length,0,'ADVISOR_UAT_DIRECTION_PAGE_ERROR');assert.equal(operator.pageErrors.length,0,'ADVISOR_UAT_OPERATIVE_PAGE_ERROR');
    assert.equal(direction.assetErrors.length+operator.assetErrors.length,0,'ADVISOR_UAT_FIRST_PARTY_ASSET_ERROR');
    // Expected HTTP denials from this security matrix are not asset failures.
    report.consoleErrorCount=direction.consoleErrors.length+operator.consoleErrors.length;
    pass('PENDING_CXP_BOTH_ADVISORS_PERSIST_THROUGH_RELOAD_NO_PAGE_ERRORS');
  }catch(error){originalFailure=error;}
  finally{
    if(tenant&&fx){
      report.cleanup.status='IN_PROGRESS';const cleanupErrors=[];
      // Signed restore is exercised first. Guarded admin fallback is ONLY for
      // known disposable records, never an alternative business-write path.
      for(const identity of sourceRequests){
        try{
          const ref=auditRef('request',identity.requestId);if(!observedAbsent.has(ref.path))continue;
          const snap=await ref.get();if(!snap.exists)continue;
          sourceAuditGuard('request',snap.data(),identity,direction?.uid||memberBefore[0]?.ref.id,cfg.live,identity.expectedIds);
          if(direction){const out=await call(direction,{advisorPayable:{version:1,operation:'restoreSynthetic',syntheticQa:true,preparedRequestId:identity.requestId}});assert.ok(out.restored&&out.canonicalReadback&&out.financialPayments===0&&out.bankMovements===0);}
          else throw Error('ADVISOR_UAT_SIGNED_RESTORE_SESSION_UNAVAILABLE');
        }catch(error){cleanupErrors.push('SIGNED_RESTORE');}
      }
      for(const item of generated){
        try{const ref=rowRef(item.collection,item.expected.id);if(!observedAbsent.has(ref.path))continue;
          const snap=await ref.get();if(!snap.exists)continue;
          assertGenerated(snap.data(),item.expected,item.requestId,item.uid,item.collection);
          await ref.delete({lastUpdateTime:snap.updateTime});assert.equal((await ref.get()).exists,false);
        }catch(error){cleanupErrors.push('GENERATED_RECORD_PROVENANCE_OR_DELETE');}
      }
      for(const identity of sourceRequests){
        for(const [kind,id] of [['request',identity.requestId],['event',identity.eventId],['restore',identity.restoreEventId]]){
          try{const ref=auditRef(kind,id);if(!observedAbsent.has(ref.path))continue;
            const snap=await ref.get();if(!snap.exists)continue;
            sourceAuditGuard(kind,snap.data(),identity,memberBefore[0].ref.id,cfg.live,identity.expectedIds,
              generated.filter(item=>item.requestId===identity.requestId).map(item=>item.expected.id));
            await ref.delete({lastUpdateTime:snap.updateTime});assert.equal((await ref.get()).exists,false);
          }catch(error){cleanupErrors.push('SOURCE_AUDIT_PROVENANCE_OR_DELETE');}
        }
      }
      if(genericRequest){
        for(const [kind,id] of [['request',genericRequest.requestId],['event',genericRequest.eventId]]){
          try{const ref=auditRef(kind,id);if(!observedAbsent.has(ref.path))continue;
            const snap=await ref.get();if(!snap.exists)continue;
            genericAuditGuard(kind,snap.data(),genericRequest,memberBefore[0].ref.id);
            await ref.delete({lastUpdateTime:snap.updateTime});
          }catch(error){cleanupErrors.push('GENERIC_AUDIT_PROVENANCE_OR_DELETE');}
        }
      }
      for(const item of seeds.slice().reverse()){
        try{const snap=await item.ref.get();if(!snap.exists)continue;const row=snap.data();
          assert.ok(row.__syntheticQa===true&&row.__qaRunId===runId&&row.tenantId===TENANT&&unchangedSeed(row,item.expected,fx.ids.ordinary,memberBefore[0].ref.id),'ADVISOR_UAT_SEED_CHANGED');
          await item.ref.delete({lastUpdateTime:snap.updateTime});assert.equal((await item.ref.get()).exists,false);
        }catch(error){cleanupErrors.push('SEED_PROVENANCE_OR_DELETE');}
      }
      for(const before of memberBefore){try{const snap=await before.ref.get();assert.equal(snap.exists?digest(snap.data()):null,before.digest,'ADVISOR_UAT_MEMBERSHIP_OR_ACCESS_CHANGED');}catch(error){cleanupErrors.push('MEMBERSHIP_CHANGED');}}
      for(const ref of allTargets){try{if((await ref.get()).exists)report.cleanup.remaining+=1;}catch(error){cleanupErrors.push('FINAL_ABSENCE_READ_FAILED');}}
      if(cleanupErrors.length||report.cleanup.remaining){cleanupFailure=Error('ADVISOR_UAT_CLEANUP_HOLD');report.cleanup.status='HOLD';report.cleanup.failureClasses=[...new Set(cleanupErrors)];}
      else{report.cleanup.status='PASS';pass('EXACT_SYNTHETIC_DATA_AND_AUDIT_ABSENCE_RESTORED_MEMBERSHIP_UNCHANGED');}
    }
    if(browser)await browser.close();
    if(!originalFailure&&!cleanupFailure&&report.cleanup.status==='PASS')report.status='PASS';
    // Only constant allowlisted diagnostics and a source line may be exposed;
    // never error messages/values, tokens, actor UIDs, customer rows or paths.
    const failure=originalFailure?safeFailureEvidence(originalFailure,stage):cleanupFailure?safeFailureEvidence(cleanupFailure,'SYNTHETIC_RESTORE'):{};
    Object.assign(report,failure);
    fs.writeFileSync(cfg.reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log('I66_ADVISOR_PAYABLE_SIGNED_'+cfg.phase+'_'+report.status+' '+JSON.stringify({checks:report.checks.length,cleanup:report.cleanup.status,remaining:report.cleanup.remaining,realCustomerWritesRequested:0,bankMovements:0,financialPayments:0,authOrMembershipMutations:0,...failure}));
  }
  if(originalFailure||cleanupFailure)throw Error('ADVISOR_PAYABLE_SIGNED_UAT_HOLD');
  return report;
}
module.exports={configuration,sourceIdentity,fixtures,assertGenerated,sourceAuditGuard,genericAuditGuard,unchangedSeed,configuredCredential,assertServerDenial,safeFailureEvidence,main};
if(require.main===module)main().catch(error=>{console.error('I66_ADVISOR_PAYABLE_SIGNED_UAT_HOLD '+String(error.code||'ASSERTION_OR_RUNTIME_FAILURE').replace(/[^A-Za-z0-9_./:-]+/g,'_').slice(0,120));process.exitCode=1;});
