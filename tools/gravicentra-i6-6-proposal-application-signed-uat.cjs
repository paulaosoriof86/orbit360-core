'use strict';
// Signed, reversible UAT in the existing Firebase project. No active production
// ledger pointer, real customer, real membership, rule or IAM change is allowed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {digest,applicationIdFor}=require('../functions/proposal-application-boundary');
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
function validateEnvironment(env){
 const phase=env.I66_SIGNED_TEST_LIVE==='true'?'LIVE':'PREVIEW';
 const origin=String(env.I66_PREVIEW_ORIGIN||'');
 assert.ok(phase==='LIVE'?origin==='https://app.aysseguros.com':/^https:\/\/ays-orbit-360-lab--gi-i66-rc-\d+-[a-z0-9]+\.web\.app$/.test(origin),'I66_PROPOSAL_AUTHORIZED_ORIGIN_REQUIRED');
 assert.match(String(env.I66_SOURCE_SHA||''),/^[a-f0-9]{40}$/,'I66_PROPOSAL_SOURCE_SHA_REQUIRED');
 assert.ok(env.I66_PACKAGE_ROOT&&path.isAbsolute(env.I66_PACKAGE_ROOT),'I66_PROPOSAL_PACKAGE_ROOT_REQUIRED');
 return{phase,origin,sourceSha:env.I66_SOURCE_SHA,packageRoot:env.I66_PACKAGE_ROOT};
}
function owned(row,runId){return !!row&&row.__syntheticQa===true&&row.qaRunId===runId;}
function makeStage(kind,id,tenant,runId,source,hashes){
 const original={...source,documentId:id,tenantId:tenant,__syntheticQa:true,qaRunId:runId};
 return {...original,documentClass:kind,runId,activationState:'STAGED',...hashes,payloadDigest:digest(original)};
}
async function main(){
 const cfg=validateEnvironment(process.env);
 const reportPath=path.join(cfg.packageRoot,'evidence','i66-proposal-application-signed-uat-'+cfg.phase.toLowerCase()+'.json');
 const report={sourceSha:cfg.sourceSha,phase:cfg.phase,status:'HOLD',syntheticOnly:true,realControlUnchanged:false,checks:[],cleanup:{status:'HOLD',remaining:null}};
 const admin=require('firebase-admin'),{chromium}=require('playwright');
 const credentialPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;
 const credential=credentialPath?JSON.parse(fs.readFileSync(credentialPath,'utf8')):
   ['SA_LAB','SA_LAB_ALT','SA_ALT','SA_DEFAULT'].map(key=>{try{return JSON.parse(process.env[key]||'');}catch{return null;}})
    .find(value=>value?.type==='service_account'&&value.project_id===PROJECT&&value.private_key);
 assert.ok(credential?.type==='service_account'&&credential.project_id===PROJECT&&credential.private_key,'I66_PROPOSAL_CONFIGURED_CREDENTIAL_REQUIRED');
 admin.initializeApp({credential:admin.credential.cert(credential),projectId:PROJECT});
 const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
 const items=c=>tenant.collection('data').doc(c).collection('items'),item=(c,id)=>items(c).doc(id);
 const nonce=Date.now().toString(36)+'_'+crypto.randomBytes(5).toString('hex'),runId='cobledgerqa_'+nonce;
 const prefix='b3005qa_i66_proposal_'+nonce;
 const ids={proposal:prefix,source:prefix+'_source',client:prefix+'_client',policy:prefix+'_policy',receipt:prefix+'_receipt',portfolio:prefix+'_portfolio'};
 const runRef=item('cobrosLedgerQaRuns',runId),controlRef=item('cobrosLedgerQaControl',runId);
 const applicationId=applicationIdFor(TENANT,runId,ids.proposal),resolutionId=applicationId.replace(/^propapp_/,'propres_');
 const cobroId='cob_'+hash(TENANT+'|receipt|'+ids.receipt).slice(0,28);
 const applicationRef=item('reconciliationApplications',applicationId),resolutionRef=item('reconciliationResolutions',resolutionId);
 const paymentEventId='payinf_'+hash(TENANT+'|'+ids.policy+'|'+applicationId).slice(0,28);
 const targetRefs=[item('clientes',ids.client),item('polizas',ids.policy),item('recibosEsperados',ids.receipt),item('carteraPrimas',ids.portfolio),item('cobros',cobroId),applicationRef,resolutionRef,
   tenant.collection('reconciliationRequests').doc(applicationId),tenant.collection('reconciliationEvents').doc(paymentEventId),
   runRef.collection('propuestasConciliacion').doc(ids.proposal),runRef.collection('evidenciasCobro').doc(ids.source),runRef,controlRef];
 const sessions=[];let browser=null,originalControl=null,originalManifest=null,activeManifestRef=null,failure=null,cleanupArmed=false;
 const mark={tenantId:TENANT,__syntheticQa:true,qaRunId:runId};
 const checked=name=>{report.checks.push(name);console.log('I66_PROPOSAL_UAT_CHECK='+name);};
 const snapshot=async ref=>{const s=await ref.get();return s.exists?s.data():null;};
 async function create(ref,row){assert.equal((await ref.get()).exists,false,'I66_PROPOSAL_FIXTURE_COLLISION');await ref.create(row);}
 async function restoreQa(ref,row){const s=await ref.get();assert.ok(s.exists&&owned(s.data(),runId),'I66_PROPOSAL_FIXTURE_OWNERSHIP_LOST');await ref.set(row);}
 async function staff(){
  const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),items('asesores').limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'I66_PROPOSAL_ACTOR_BOUNDED_SCAN');
  const select=(predicate,role)=>{
   const links=new Set(),uids=new Set();
   for(const d of advisors.docs){const a=d.data()||{};if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(v=>predicate(norm(v)))){links.add(d.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(v=>uids.add(v));}}
   const found=members.docs.filter(d=>{const m=d.data()||{};return ([m.nombre,m.nombreCompleto,m.displayName,m.name,m.fullName].some(v=>predicate(norm(v)))||links.has(m.advisorId||m.asesorId)||uids.has(d.id))&&
    norm(m.activeRole)===role&&m.active!==false&&m.activo!==false&&['active','activo'].includes(norm(m.status||m.estado))&&[].concat(m.countries||m.paises||[]).includes('GT');});
   assert.equal(found.length,1,'I66_PROPOSAL_REAL_ACTOR_NOT_UNIQUE_'+role);
   return{uid:found[0].id,role,member:found[0].data()};
  };
  const actors=[select(v=>v.includes('paula')&&v.includes('osorio'),'direccion'),select(v=>v.startsWith('carloscastro'),'operativo')];
  for(const actor of actors){const u=await auth.getUser(actor.uid);assert.ok(!u.disabled&&u.emailVerified,'I66_PROPOSAL_ACTOR_AUTH_NOT_READY');actor.token=await auth.createCustomToken(actor.uid);}
  return actors;
 }
 async function sign(actor){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();sessions.push(context);
  await page.goto(cfg.origin+'/#/conciliaciones',{waitUntil:'commit',timeout:30000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
  const result=await page.evaluate(async token=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
   await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);await c.modules.auth.signInWithCustomToken(c.auth,token);
   const active=await Orbit.productAppP0.activate();return{started:active?.started===true,role:Orbit.session?.rol?.(),endpoint:Orbit.reconciliationDomain?.status?.().functionName};},actor.token);
  assert.ok(result.started&&norm(result.role)===actor.role,'I66_PROPOSAL_SIGNED_ACTIVATION_MISMATCH');
  assert.equal(result.endpoint,cfg.phase==='LIVE'?'orbit360CobrosReconciliationCommand':'orbit360CobrosReconciliationCommandPreview');
  return page;
 }
 const rawCall=(page,operation,payload,activeRole)=>page.evaluate(async x=>{
  try{const p=Orbit.productRuntimeBrowserProvidersP0,name=Orbit.reconciliationDomain.status().functionName;
   return{result:await p.callFunction(name,{tenantId:x.tenantId,activeRole:x.activeRole||Orbit.session.rol(),operation:x.operation,payload:x.payload,reason:'I6.6 prueba firmada totalmente sintética y reversible'},'us-central1')};
  }catch(error){return{denied:true,code:String(error.code||''),message:String(error.message||'').slice(0,180)};}
 },{tenantId:TENANT,operation,payload,activeRole});
 const proposalPayload={proposalId:ids.proposal,sourceRunId:runId};
 try{
  const bundled=JSON.parse(fs.readFileSync(path.join(cfg.packageRoot,'bundle/site/__recovery__/build.json'),'utf8'));
  const remote=await fetch(cfg.origin+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}});assert.equal(remote.status,200,'I66_PROPOSAL_BUILD_UNAVAILABLE');
  const build=await remote.json();assert.equal(build.sourceSha,cfg.sourceSha);assert.equal(bundled.sourceSha,cfg.sourceSha);assert.equal(build.buildId,bundled.buildId);report.buildId=build.buildId;
  for(const name of ['modules/conciliaciones.js','core/cobros-reconciliation-domain-client.js']){
   const bytes=fs.readFileSync(path.join(cfg.packageRoot,'bundle/site',name));const response=await fetch(cfg.origin+'/'+name,{headers:{'cache-control':'no-cache'}});
   assert.equal(response.status,200);assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(bytes),'I66_PROPOSAL_UI_ARTIFACT_DRIFT');
  }
  checked('EXACT_BUILD_AND_UI_BYTES');
  const realControlRef=item('cobrosLedgerControl','active');originalControl=await snapshot(realControlRef);
  assert.ok(originalControl?.activeRunId,'I66_PROPOSAL_REAL_CONTROL_MISSING');activeManifestRef=item('cobrosLedgerRuns',originalControl.activeRunId);originalManifest=await snapshot(activeManifestRef);
  for(const ref of targetRefs)assert.equal((await ref.get()).exists,false,'I66_PROPOSAL_TARGET_PREEXISTED');
  assert.equal((await tenant.collection('reconciliationEvents').where('qaRunId','==',runId).limit(1).get()).empty,true,'I66_PROPOSAL_AUDIT_NAMESPACE_PREEXISTED');
  cleanupArmed=true;
  const actors=await staff();browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const direction=await sign(actors[0]),carlos=await sign(actors[1]);
  const source={sourceRowId:prefix+'_source_row',sourceRowIdSha256:hash(prefix+'_source_row'),policyNumber:'QA-I66-'+nonce,currency:'GTQ',amount:173.23,reportedDate:'2026-11-15'};
  const hashes={sourceLedgerDigest:digest(source),packageLogicalSha256:digest({source,runId})};
  const stageProposal=makeStage('propuestasConciliacion',ids.proposal,TENANT,runId,source,hashes),stageEvidence=makeStage('evidenciasCobro',ids.source,TENANT,runId,source,hashes);
  const policy={id:ids.policy,...mark,clienteId:ids.client,numero:source.policyNumber,pais:'GT',moneda:'GTQ',estado:'Vigente',vigenciaDesde:'2026-01-01',vigenciaHasta:'2027-01-01'};
  const receipt={id:ids.receipt,...mark,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',monto:173.23,cuota:'1/1',vence:'2026-11-01',estado:'Pendiente'};
  const portfolio={id:ids.portfolio,...mark,polizaId:ids.policy,clienteId:ids.client,reciboId:ids.receipt,pais:'GT',moneda:'GTQ',monto:173.23,estado:'Pendiente',carteraActiva:true};
  await create(item('clientes',ids.client),{id:ids.client,...mark,pais:'GT',nombre:'I6.6 UAT sintética — no cliente real'});
  await create(item('polizas',ids.policy),policy);await create(item('recibosEsperados',ids.receipt),receipt);await create(item('carteraPrimas',ids.portfolio),portfolio);
  await create(runRef,{...mark,id:runId,runId,schemaVersion:'gi-i66-synthetic-proposal-ledger-v1',status:'ACTIVE',sourceLedgerCount:1,stageDocumentCount:2,...hashes});
  await create(controlRef,{...mark,activeRunId:runId,schemaVersion:'gi-i66-synthetic-proposal-pointer-v1',status:'ACTIVE',...hashes});
  await create(runRef.collection('propuestasConciliacion').doc(ids.proposal),stageProposal);await create(runRef.collection('evidenciasCobro').doc(ids.source),stageEvidence);
  checked('ISOLATED_SYNTHETIC_STAGE_NO_REAL_POINTER_CHANGE');
  const first=await rawCall(direction,'preview_proposal_application',proposalPayload);assert.equal(first.result?.reason,'SOURCE_RECEIPT_IDENTITY_MISSING');
  assert.ok(first.result.resolutionOptions.some(row=>row.receiptId===ids.receipt));checked('SERVER_LOADED_EXACT_CANDIDATE');
  const carlosAccess=await carlos.evaluate(async()=>{
   const canView=Orbit.access?.can('conciliaciones','view')===true;
   try{const result=await Orbit.productRuntimeBrowserProvidersP0.protectedReadPage({tenantId:'alianzas-soluciones',collection:'conciliaciones',country:'GT',activeRole:Orbit.session.rol(),pageSize:1});
     return {canView,serverAllowed:result?.ok===true,scope:result?.scope||''};}
   catch(_){return{canView,serverAllowed:false,scope:''};}
  });
  const operativoAssessment=await rawCall(carlos,'preview_proposal_application',proposalPayload);
  if(!carlosAccess.canView){
   assert.equal(carlosAccess.serverAllowed,false,'I66_PROPOSAL_OPERATIVO_UI_SERVER_VISIBILITY_DRIFT');
   assert.ok(operativoAssessment.denied||!operativoAssessment.result?.eligible&&!(operativoAssessment.result?.resolutionOptions||[]).length,'I66_PROPOSAL_UNASSIGNED_MODULE_EXPOSED');
   checked('SIGNED_OPERATIVO_UNASSIGNED_MODULE_DENIED');
  }else{
   assert.equal(carlosAccess.serverAllowed,true,'I66_PROPOSAL_OPERATIVO_GRANTED_MODULE_DENIED');
   if(carlosAccess.scope==='all'){
    assert.ok(!operativoAssessment.denied&&operativoAssessment.result?.resolutionOptions?.some(row=>row.receiptId===ids.receipt),'I66_PROPOSAL_OPERATIVO_FULL_PORTFOLIO_CANDIDATE_MISSING');
    checked('SIGNED_OPERATIVO_FULL_PORTFOLIO_READ_NO_ADVISOR_REQUIRED');
   }else{
    assert.ok(operativoAssessment.denied||!operativoAssessment.result?.eligible&&!(operativoAssessment.result?.resolutionOptions||[]).length,'I66_PROPOSAL_OPERATIVO_OUTSIDE_OWN_TEAM_SCOPE_EXPOSED');
    checked('SIGNED_OPERATIVO_ASSIGNED_MODULE_DATA_SCOPE_PRESERVED');
   }
  }
  const advisorDenied=await rawCall(direction,'resolve_proposal_application',{...proposalPayload,policyId:ids.policy,receiptId:ids.receipt},'Asesor');assert.equal(advisorDenied.denied,true);
  checked('SIGNED_ADVISOR_RESOLUTION_REQUEST_DENIED');
  const forbidden=await rawCall(direction,'apply_proposal_application',{...proposalPayload,amount:999});assert.equal(forbidden.denied,true);checked('CALLER_MONEY_OVERRIDE_DENIED');
  await restoreQa(item('polizas',ids.policy),{...policy,pais:'ZZ'});
  const foreign=await rawCall(direction,'preview_proposal_application',proposalPayload);assert.ok(!foreign.result?.eligible&&!(foreign.result?.resolutionOptions||[]).length);
  await restoreQa(item('polizas',ids.policy),policy);checked('OUT_OF_SCOPE_COUNTRY_DENIED');
  await direction.waitForFunction(()=>!!Orbit.modules?.conciliaciones?.verificarAplicacion,null,{timeout:30000});
  // Exercise the production UI owner with a clearly synthetic drawer; the QA
  // namespace is intentionally excluded from the customer's real proposal list.
  await direction.evaluate(async row=>{
   const back=document.createElement('div');back.id='i66-proposal-uat-drawer';back.style.cssText='position:fixed;inset:0;z-index:99999;background:white;padding:24px;overflow:auto';
   back.innerHTML='<div data-conc-application-status></div><div data-conc-application-targets></div><button data-conc-apply hidden disabled>Aprobar y aplicar</button>';
   document.body.appendChild(back);await Orbit.modules.conciliaciones.verificarAplicacion(row,back);
  },{sourceEntityId:ids.proposal,poliza:source.policyNumber,original:{origenLibroActivo:true,sourceRunId:runId}});
  const selected=first.result.resolutionOptions.findIndex(row=>row.receiptId===ids.receipt);
  await direction.locator('[data-conc-resolution-receipt]').selectOption(String(selected));
  await direction.locator('[data-conc-resolution-type]').selectOption('BANK_STATEMENT_MATCH');
  await direction.locator('[data-conc-resolution-date]').fill('2026-11-15');await direction.locator('[data-conc-resolution-paid]').fill('2026-11-14');
  await direction.locator('[data-conc-resolution-reason]').fill('UAT sintética autorizada I6.6; no cliente real');await direction.locator('[data-conc-resolution-attested]').check();
  await direction.locator('[data-conc-resolve]').click();
  await direction.waitForFunction(()=>{const button=document.querySelector('#i66-proposal-uat-drawer [data-conc-apply]');return button&&!button.hidden&&!button.disabled;},null,{timeout:30000});
  const resolved=await snapshot(resolutionRef);assert.ok(owned(resolved,runId)&&resolved.sourceAttestation===true);
  assert.deepEqual(await snapshot(item('recibosEsperados',ids.receipt)),receipt);assert.deepEqual(await snapshot(item('carteraPrimas',ids.portfolio)),portfolio);assert.equal(await snapshot(item('cobros',cobroId)),null);
  checked('UI_BINDING_PERSISTED_WITH_ZERO_FINANCIAL_WRITES');
  const ready=await rawCall(direction,'preview_proposal_application',proposalPayload);assert.equal(ready.result?.eligible,true);assert.equal(ready.result.targets[0].amount,173.23);
  // Replace only our own synthetic evidence, then verify a formerly valid
  // approval digest cannot apply while source facts have changed.
  const changed=makeStage('evidenciasCobro',ids.source,TENANT,runId,{...source,amount:174.23},hashes);
  await restoreQa(runRef.collection('evidenciasCobro').doc(ids.source),changed);
  const stale=await rawCall(direction,'apply_proposal_application',{...proposalPayload,planDigest:ready.result.planDigest});assert.equal(stale.result?.eligible,false);assert.equal(await snapshot(item('cobros',cobroId)),null);
  await restoreQa(runRef.collection('evidenciasCobro').doc(ids.source),stageEvidence);checked('STALE_SOURCE_APPLICATION_DENIED');
  await Promise.all([direction.waitForEvent('framenavigated',{timeout:30000}),direction.locator('[data-conc-apply]').click()]);
  await direction.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
  const reload=await direction.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();await p.waitForUser();return(await Orbit.productAppP0.activate())?.started===true;});assert.equal(reload,true);
  const [application,paid,cobro,closed]=await Promise.all([snapshot(applicationRef),snapshot(item('recibosEsperados',ids.receipt)),snapshot(item('cobros',cobroId)),snapshot(item('carteraPrimas',ids.portfolio))]);
  assert.ok(owned(application,runId)&&application.status==='APPLIED'&&application.beforeAfter.length===3);
  assert.equal(paid.paymentState,'PAID_DIRECT');assert.equal(cobro.monto,173.23);assert.equal(cobro.moneda,'GTQ');assert.equal(cobro.applicationState,'PENDING_APPLICATION');assert.equal(closed.carteraActiva,false);assert.equal(closed.cobroId,cobroId);
  checked('UI_APPLY_RECEIPT_COBRO_PORTFOLIO_ATOMIC_PERSISTENCE_RELOAD');
  const repeated=await rawCall(direction,'apply_proposal_application',{...proposalPayload,planDigest:ready.result.planDigest});assert.equal(repeated.result?.reused,true);assert.equal(repeated.result?.readbackConfirmed,true);
  assert.equal((await items('cobros').where('reciboId','==',ids.receipt).get()).size,1);checked('SECOND_APPLY_IDEMPOTENT_NO_DOUBLE_PAYMENT');
  assert.deepEqual(await snapshot(runRef.collection('propuestasConciliacion').doc(ids.proposal)),stageProposal);assert.deepEqual(await snapshot(runRef.collection('evidenciasCobro').doc(ids.source)),stageEvidence);
  checked('IMMUTABLE_SOURCE_UNCHANGED_AFTER_APPLICATION');
 }catch(error){failure=error;report.failureCode=String(error.code||error.message||'UNKNOWN').replace(/[^A-Za-z0-9_.:-]/g,'_').slice(0,180);}
 finally{
  const cleanupErrors=[];
  // Only records proven to belong to this exact QA execution are removable.
  // No collection deletion, broad prefix deletion, or real record restoration.
  try{
   let removed=0;
   if(cleanupArmed){
   const events=await tenant.collection('reconciliationEvents').where('qaRunId','==',runId).limit(20).get();assert.ok(events.size<20,'I66_PROPOSAL_AUDIT_CLEANUP_BOUND');
   for(const doc of events.docs)if(!targetRefs.some(ref=>ref.path===doc.ref.path))targetRefs.push(doc.ref);
   for(const ref of targetRefs){const s=await ref.get();if(!s.exists)continue;
    if(!owned(s.data(),runId)){cleanupErrors.push('NON_OWNED_TARGET');continue;}
    await ref.delete({lastUpdateTime:s.updateTime});assert.equal((await ref.get()).exists,false,'I66_PROPOSAL_CLEANUP_READBACK');removed++;
   }
   }
   const remaining=cleanupArmed?(await Promise.all(targetRefs.map(ref=>ref.get()))).filter(s=>s.exists).length:0;
   if(originalControl){assert.deepEqual(await snapshot(item('cobrosLedgerControl','active')),originalControl);assert.deepEqual(await snapshot(activeManifestRef),originalManifest);report.realControlUnchanged=true;}
   report.cleanup={status:cleanupErrors.length||remaining?'HOLD':'PASS',remaining,removedOwnedTargets:removed,errors:cleanupErrors};
  }catch(error){report.cleanup={status:'HOLD',remaining:null,errorCode:String(error.code||'CLEANUP_CHECK_FAILED')};failure=failure||error;}
  for(const context of sessions)try{await context.close();}catch(_){}
  if(browser)await browser.close();
  report.status=!failure&&report.cleanup.status==='PASS'&&report.realControlUnchanged?'PASS':'HOLD';
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify({sourceSha:report.sourceSha,phase:report.phase,status:report.status,checks:report.checks.length,cleanup:report.cleanup,realControlUnchanged:report.realControlUnchanged}));
 if(report.status!=='PASS')throw failure||Error('I66_PROPOSAL_SIGNED_UAT_HOLD');
}
module.exports={validateEnvironment,owned,makeStage};
if(require.main===module)main().catch(error=>{console.error('I66_PROPOSAL_SIGNED_UAT_HOLD '+String(error.code||error.message||'UNKNOWN').replace(/[^A-Za-z0-9_.:-]/g,'_').slice(0,180));process.exitCode=1;});
