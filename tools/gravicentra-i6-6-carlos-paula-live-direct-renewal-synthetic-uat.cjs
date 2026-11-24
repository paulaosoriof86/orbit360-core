'use strict';
// Existing signed renewal driver. Preview verifies both real public entries and
// inherited editable fields without business submissions; the canonical Preview
// writer continues to reject relations. LIVE exercises the same UI against only
// unique synthetic fixtures, then verifies durable writes/reload/replay/restore.
// The explicit assigned-role profile uses Paula's existing Direction authority
// and normal role selector; the historical Carlos profile keeps its own grant.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const TENANT='alianzas-soluciones',LIVE_ORIGIN='https://app.aysseguros.com';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function configuration(env=process.env){
  const phase=env.I66_RENEWAL_QA_PHASE||'LIVE',live=phase==='LIVE';
  assert.ok(['PREVIEW','LIVE'].includes(phase),'I66_RENEWAL_PHASE_INVALID');
  const origin=live?env.I66_LIVE_ORIGIN:env.I66_PREVIEW_ORIGIN;
  assert.ok(live?origin===LIVE_ORIGIN:/^https:\/\/ays-orbit-360-lab--gi-i66-rc-[0-9]+-[a-z0-9]+\.web\.app$/.test(origin||''),'I66_RENEWAL_ORIGIN_MISMATCH');
  const source=live?env.I66_APPROVED_LIVE_SOURCE_SHA:env.I66_SOURCE_SHA;
  assert.match(source||'',/^[a-f0-9]{40}$/,'I66_RENEWAL_SOURCE_PIN_REQUIRED');
  assert.ok(env.I66_PACKAGE_ROOT&&path.isAbsolute(env.I66_PACKAGE_ROOT),'I66_RENEWAL_EXACT_PACKAGE_REQUIRED');
  assert.ok(env.I66_CANCELLATION_QA===undefined||['0','1'].includes(env.I66_CANCELLATION_QA),'I66_CANCELLATION_PROFILE_INVALID');
  const qaProfile=env.I66_DIRECT_FORMS_QA_PROFILE||undefined;
  if(qaProfile!==undefined){
    assert.equal(qaProfile,PAULA_ROLE_PROFILE,'I66_DIRECT_FORMS_ROLE_PROFILE_UNKNOWN');
    assert.equal(env.I66_CANCELLATION_QA,'1','I66_DIRECT_FORMS_ROLE_CANCELLATION_PROFILE_REQUIRED');
  }
  return {phase,live,origin,source,packageRoot:env.I66_PACKAGE_ROOT,...(env.I66_CANCELLATION_QA==='1'?{cancellationQa:true}:{}),...(qaProfile?{qaProfile}:{})};
}
function fixtures(role,suffix){
  assert.ok(['operativo','direccion'].includes(role));assert.match(suffix,/^[a-z0-9_]{8,80}$/);
  const base='b4003qa_renew_'+role+'_'+suffix,ids={client:base+'_client',insurer:base+'_insurer',source:base+'_source'};
  const rows=[
    ['clientes',ids.client,{id:ids.client,tenantId:TENANT,pais:'GT',asesorId:'b4003qa_no_real_advisor',nombre:'I6.6 QA direct forms',__syntheticQa:true}],
    ['aseguradoras',ids.insurer,{id:ids.insurer,tenantId:TENANT,pais:'GT',moneda:'GTQ',nombre:'I6.6 QA insurer',vinculada:true,activo:true,ramos:['Auto'],portales:[],cuentas:[],__syntheticQa:true}],
    ['polizas',ids.source,{id:ids.source,tenantId:TENANT,clienteId:ids.client,asesorId:'b4003qa_no_real_advisor',aseguradoraId:ids.insurer,
      pais:'GT',moneda:'GTQ',ramo:'Autos',producto:'QA Auto',subramo:'QA Auto',numero:'QA-OLD-'+suffix,
      vigenciaInicio:'2025-11-21',vigenciaFin:'2026-11-21',estado:'Vigente',renovable:null,
      frecuencia:'Contado',formaPago:'Transferencia',conducto:'Aseguradora',cuotas:1,primaNeta:1000,
      gastosEmision:50,gastosFinan:0,otros:0,ivaPct:12,beneficiarios:['Persona QA vigente'],historial:[],__syntheticQa:true}]
  ];
  return {ids,rows,source:rows[2][2]};
}
function assertNoOutboundChannels(raw){
  assert.ok(raw?.notificationChannels==null||Array.isArray(raw.notificationChannels),'I66_RENEWAL_NOTIFICATION_CHANNEL_SCHEMA_HOLD');
  const channels=Array.isArray(raw&&raw.notificationChannels)?raw.notificationChannels:['portal','in_app'];
  assert.ok(channels.every(c=>['portal','in_app','topbar','tarea'].includes(c)),'I66_RENEWAL_EXTERNAL_NOTIFICATION_CHANNEL_HOLD');
  return channels;
}
function assertGeneratedRow(collection,row,{ids,policyIds,managementIds,operationIds,uid}){
  assert.ok(['polizas','gestiones','recibosEsperados','carteraPrimas','vehiculos','actividades'].includes(collection),'I66_RENEWAL_RESTORE_COLLECTION');
  assert.equal(row.tenantId,TENANT);assert.equal(row.clienteId,ids.client);
  if(collection==='polizas')assert.ok(row.id===ids.source&&row.__syntheticQa===true||row.renuevaDe===ids.source&&policyIds.has(row.id),'I66_RENEWAL_RESTORE_POLICY_IDENTITY');
  else if(collection==='gestiones')assert.ok(managementIds.has(row.id)&&row.polizaId===ids.source&&['renewal_accepted','endorsement_request'].includes(row.workflowType)&&row.createdByUid===uid,'I66_RENEWAL_RESTORE_MANAGEMENT_IDENTITY');
  else if(['recibosEsperados','carteraPrimas','vehiculos'].includes(collection))assert.ok(policyIds.has(row.polizaId)&&row.polizaId!==ids.source,'I66_RENEWAL_RESTORE_CHILD_IDENTITY');
  else assert.ok(managementIds.has(row.gestionId)||operationIds.has(row.operationId)||operationIds.has(row.operacionId),'I66_RENEWAL_RESTORE_ACTIVITY_IDENTITY');
}
function assertSeedRestore(collection,row,seed,{live,uid}){
  // The canonical policy engine may update only the derived state and its
  // signed audit metadata on this disposable client. Other seed drift stops
  // restoration; Preview permits no change at all.
  if(!live||collection!=='clientes')return assert.deepEqual(row,seed,'I66_RENEWAL_RESTORE_SEED_CHANGED');
  const derived=new Set(['estadoOperativo','estado','estadoActualizado','updatedAt','updatedByUid','updatedByEmail']);
  assert.deepEqual(Object.fromEntries(Object.entries(row).filter(([key])=>!derived.has(key))),seed,'I66_RENEWAL_RESTORE_CLIENT_IDENTITY');
  const changed=Object.keys(row).some(key=>derived.has(key));
  if(changed){
    assert.equal(row.estado,'activo','I66_RENEWAL_RESTORE_CLIENT_STATE');
    assert.equal(row.estadoOperativo,'activo','I66_RENEWAL_RESTORE_CLIENT_STATE');
    assert.equal(row.updatedByUid,uid,'I66_RENEWAL_RESTORE_CLIENT_ACTOR');
    assert.ok(typeof row.estadoActualizado==='string'&&Number.isFinite(Date.parse(row.estadoActualizado)),'I66_RENEWAL_RESTORE_CLIENT_TIME');
  }
}
async function deleteSnapshotAfterCheck(snapshot,check){
  assert.ok(snapshot.exists&&snapshot.updateTime,'I66_RENEWAL_RESTORE_VERSION_REQUIRED');
  check(snapshot.data());
  await snapshot.ref.delete({lastUpdateTime:snapshot.updateTime});
}
async function waitForBusinessIdle(page){
  await page.waitForFunction(()=>{
    const state=window.Orbit?.store?._operationalWriteStatus?.();
    return !!state&&state.pending===0;
  },null,{timeout:30000});
}
async function settleAndClose(context,page,adapterReady){
  // A detached success modal can precede fire-and-forget activity/client-state
  // writes. Drain the real adapter first, then close the session before any
  // restore query. If the barrier fails, do not claim or attempt restoration.
  try{if(page&&adapterReady)await waitForBusinessIdle(page);}finally{await context.close();}
}
const DIRECT_FORMS_TARGETS=Object.freeze({RENEWAL_DIRECT:'#renewal-decision-v1200 [data-direct]'});
const DIRECT_FORMS_CLICK_FLAGS=Object.freeze(['pointerInterception','detached','notVisible','notEnabled','notStable','outsideViewport']);
const DIRECT_FORMS_FAILURE_CODES=Object.freeze(['I66_DIRECT_FORMS_EXISTING_ACTOR_LEGAL_ACCEPTANCE_REQUIRED','I66_DIRECT_FORMS_STARTUP_NOT_READY',
  'I66_DIRECT_FORMS_PERSONAL_AUTHORITY_HOLD','TIMEOUT_ERROR','ASSERTION_ERROR','RUNTIME_FAILURE']);
function safeDirectFormsFailureCode(error){
  const first=String(error?.message||'').split(/\r?\n/,1)[0];
  return /^I66_DIRECT_FORMS_PERSONAL_[A-Z0-9_]+$/.test(first)?'I66_DIRECT_FORMS_PERSONAL_AUTHORITY_HOLD':DIRECT_FORMS_FAILURE_CODES.includes(first)?first:error?.name==='TimeoutError'?'TIMEOUT_ERROR':error?.code==='ERR_ASSERTION'?'ASSERTION_ERROR':'RUNTIME_FAILURE';
}
function safeDirectFormsSnapshot(raw){
  const row=raw&&typeof raw==='object'?raw:{};
  const boolean=key=>typeof row[key]==='boolean'?row[key]:null;
  const count=key=>Number.isSafeInteger(row[key])&&row[key]>=0&&row[key]<=10000?row[key]:null;
  const coordinate=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=100000?Math.round(v):null;
  return {snapshotStatus:row.snapshotStatus==='CAPTURED'?'CAPTURED':'UNAVAILABLE',
    target:Object.hasOwn(DIRECT_FORMS_TARGETS,row.target)?row.target:'UNKNOWN',
    targetCount:count('targetCount'),targetConnected:boolean('targetConnected'),targetVisible:boolean('targetVisible'),targetEnabled:boolean('targetEnabled'),
    rect:row.rect&&typeof row.rect==='object'?Object.fromEntries(['x','y','width','height'].map(k=>[k,coordinate(row.rect[k])])):null,
    centerInViewport:boolean('centerInViewport'),targetReceivesPointer:boolean('targetReceivesPointer'),
    topTag:['DIV','SPAN','BUTTON','INPUT','LABEL','H1','H2','H3','P','UL','LI','SVG','PATH','BODY','HTML','MAIN','SECTION'].includes(row.topTag)?row.topTag:null,
    topOwner:['TARGET','LEGAL_GATE','AUTH_RESTORING','RENEWAL_DECISION','OTHER','NONE'].includes(row.topOwner)?row.topOwner:'NONE',
    legalOverlayCount:count('legalOverlayCount'),legalOverlayAtTarget:boolean('legalOverlayAtTarget'),authRestoring:boolean('authRestoring'),appStarted:boolean('appStarted')};
}
function safeDirectFormsClickFailure(error){
  const message=String(error?.message||'');
  return {failureClass:error?.name==='TimeoutError'?'TIMEOUT_ERROR':'CLICK_FAILURE',
    actionability:{pointerInterception:/intercepts pointer events/i.test(message),
      detached:/element (?:was|is) detached|not attached to the DOM/i.test(message),
      notVisible:/element is not visible/i.test(message),notEnabled:/element is not enabled/i.test(message),
      notStable:/element is not stable/i.test(message),outsideViewport:/element is outside of the viewport/i.test(message)},
    // Derive every diagnostic from the complete error before any truncation;
    // never export arbitrary DOM snippets, actor scope, visible text or URLs.
    knownInterceptors:{legalGate:/data-legal-gate/.test(message),authRestoring:/auth-restoring/.test(message)}};
}
async function captureDirectFormsSnapshot(page,target='RENEWAL_DIRECT'){
  assert.ok(Object.hasOwn(DIRECT_FORMS_TARGETS,target),'I66_DIRECT_FORMS_DIAGNOSTIC_TARGET_DENIED');
  try{
    return safeDirectFormsSnapshot(await page.evaluate(function directFormsUiSnapshot(input){
      const nodes=document.querySelectorAll(input.selector),button=nodes[0]||null;
      const r=button?.getBoundingClientRect(),style=button?getComputedStyle(button):null;
      const x=r?r.left+r.width/2:null,y=r?r.top+r.height/2:null;
      const inViewport=!!r&&x>=0&&y>=0&&x<innerWidth&&y<innerHeight;
      const top=inViewport?document.elementFromPoint(x,y):null;
      const receives=!!button&&!!top&&(button===top||button.contains(top));
      return {snapshotStatus:'CAPTURED',target:input.target,targetCount:nodes.length,targetConnected:!!button?.isConnected,
        targetVisible:!!r&&r.width>0&&r.height>0&&style?.display!=='none'&&style?.visibility!=='hidden',
        targetEnabled:!!button&&button.disabled!==true&&button.getAttribute('aria-disabled')!=='true'&&!button.closest('[inert]'),
        rect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null,centerInViewport:inViewport,targetReceivesPointer:receives,
        topTag:top?.tagName||null,topOwner:receives?'TARGET':top?.closest('[data-legal-gate]')?'LEGAL_GATE':top?.closest('#auth-restoring')?'AUTH_RESTORING':top?.closest('#renewal-decision-v1200')?'RENEWAL_DECISION':top?'OTHER':'NONE',
        legalOverlayCount:document.querySelectorAll('[data-legal-gate]').length,legalOverlayAtTarget:!!top?.closest('[data-legal-gate]'),
        authRestoring:document.documentElement.getAttribute('data-auth-restoring')==='1',appStarted:window.Orbit?.productAppP0?.isStarted?.()===true};
    },{target,selector:DIRECT_FORMS_TARGETS[target]}));
  }catch{return safeDirectFormsSnapshot(null);}
}
async function clickDirectDecision(page,diagnostic){
  diagnostic.beforeClick=await captureDirectFormsSnapshot(page);
  try{return await page.locator('#renewal-decision-v1200').locator('[data-direct]').click();}
  catch(error){
    diagnostic.onFailure=await captureDirectFormsSnapshot(page);
    Object.assign(diagnostic,safeDirectFormsClickFailure(error));
    throw error;
  }
}
async function requireExistingLegalReadiness(page){
  // showApp schedules the canonical legal gate 350 ms after activate resolves.
  // Observe its actual outcome; an early count of zero cannot prove readiness.
  // This function never invokes gate/registrar, clicks acceptance or seeds state.
  await page.waitForFunction(()=>{
    const o=window.Orbit,u=o?.auth?.user?.(),scope=u?'user:'+(u.email||u.uid||'product'):'';
    const state=o?.legal?.__gateState;
    return !!scope&&!!state&&(state.pendingScopes?.[scope]===true||state.doneScopes?.[scope]===true);
  },null,{timeout:3000});
  const readiness=await page.evaluate(function directFormsLegalReadiness(){
    const o=window.Orbit,u=o?.auth?.user?.(),scope=u?'user:'+(u.email||u.uid||'product'):'';
    const state=o?.legal?.__gateState,record=o?.legal?.aceptaciones?.()?.[scope];
    const clauses=['confidencialidad','tratamiento_datos','descargo_ia'];
    const recorded=!!record&&record.aceptado===true&&record.version==='2.0'&&record.tipo==='interno'&&record.pais==='GT'&&record.empresa==='Alianzas & Soluciones'&&
      record.actorUid===u?.uid&&record.scopeId===scope&&record.origin===location.origin&&
      record.acceptanceMethod==='VISIBLE_CHECKBOX_AND_BUTTON'&&typeof record.fecha==='string'&&Number.isFinite(Date.parse(record.fecha))&&
      Array.isArray(record.clausulas)&&JSON.stringify(record.clausulas)===JSON.stringify(clauses);
    return {appStarted:o?.productAppP0?.isStarted?.()===true,authRestoring:document.documentElement.getAttribute('data-auth-restoring')==='1',
      legalOwnerCompleted:state?.doneScopes?.[scope]===true,legalOwnerPending:state?.pendingScopes?.[scope]===true,
      existingAcceptanceMatchesRuntime:recorded&&o?.legal?.yaAcepto?.(scope)===true,legalOverlayCount:document.querySelectorAll('[data-legal-gate]').length};
  });
  assert.ok(readiness.appStarted&&!readiness.authRestoring,'I66_DIRECT_FORMS_STARTUP_NOT_READY');
  assert.ok(readiness.legalOwnerCompleted&&!readiness.legalOwnerPending&&readiness.existingAcceptanceMatchesRuntime&&readiness.legalOverlayCount===0,
    'I66_DIRECT_FORMS_EXISTING_ACTOR_LEGAL_ACCEPTANCE_REQUIRED');
  return readiness;
}
// Closed personal consent adapter inside this existing QA driver. No authorization
// is embedded in source. A later personal decision is mutable control metadata
// for exactly one immutable artifact; an absent/proposed/revoked grant is HOLD.
const PERSONAL_LEGAL=Object.freeze({
  profile:'I66_DIRECT_FORMS_EXACT_PERSONAL_LEGAL_V1',
  receiptPath:'artifacts/orbit360-recovery/release-control/I6_6_CARLOS_DIRECT_FORMS_PERSONAL_LEGAL_AUTHORIZATION.json',
  evidencePath:'artifacts/orbit360-recovery/release-control/I6_6_CARLOS_DIRECT_FORMS_PERSONAL_DELEGATION_EVIDENCE.json',
  driverPath:'tools/gravicentra-i6-6-carlos-paula-live-direct-renewal-synthetic-uat.cjs',
  branch:'recovery/fase-a-clean-20260831',
  legalOwnerPath:'orbit360-platform/core/legal.js',
  legalOwnerSha256:'b74a965b7be0d67862d82bcf73dacc0d5a8293dcf30cb4f5f3fdeaa6ee1c68a3',
  termsProjectionSha256:'485b07887091063cc7a5d1dc8f11a9bb547f2ef059490bb04d4acee73404f6b2',
  clauseIds:Object.freeze(['confidencialidad','tratamiento_datos','descargo_ia'])
});
const PERSONAL_LIMITS=Object.freeze({normalVisibleCheckboxAndButtonOnly:true,immediateReadback:true,reloadReadback:true,
  syntheticFixturesOnly:true,restoreFixtures:true,storageSeeding:false,gateBypass:false,rolesOrAuthMutations:false,
  realCustomerWrites:false,realFinancialWrites:false,externalMessages:false,otherActors:false,otherTenants:false,
  otherCountries:false,otherOrigins:false,otherArtifacts:false,futureSuccessors:false});
const personalAuthorities=new WeakSet();
const personalHash=value=>crypto.createHash('sha256').update(value).digest('hex');
const personalBlob=value=>{const b=Buffer.from(value);return crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');};
const personalStable=v=>Array.isArray(v)?v.map(personalStable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,personalStable(v[k])])):v;
const personalDigest=value=>personalHash(JSON.stringify(personalStable(value)));
const freezePersonal=value=>{if(value&&typeof value==='object'){for(const v of Object.values(value))freezePersonal(v);Object.freeze(value);}return value;};
const personalAssert=(ok,code)=>{if(!ok)throw Error('I66_DIRECT_FORMS_PERSONAL_'+code);};
const personalEqual=(actual,expected,code)=>personalAssert(personalDigest(actual??null)===personalDigest(expected??null),code);
const personalTime=(value,code)=>{personalAssert(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value,code);return Date.parse(value);};
function personalJson(bytes,label){
  personalAssert(Buffer.isBuffer(bytes)||typeof bytes==='string',label+'_REQUIRED');
  personalAssert(Buffer.byteLength(bytes)>0&&Buffer.byteLength(bytes)<=2*1024*1024,label+'_BOUNDS');
  let out;try{out=JSON.parse(String(bytes));}catch{throw Error('I66_DIRECT_FORMS_PERSONAL_'+label+'_INVALID');}
  personalAssert(out&&typeof out==='object'&&!Array.isArray(out),label+'_INVALID');return out;
}
function personalTarget(candidate){return Object.fromEntries(['sourceSha','buildId','buildRunId','artifactId','artifactDigest'].map(k=>[k,candidate[k]]));}
function personalReviewContext(candidate,subject,validity){
  return {profile:PERSONAL_LEGAL.profile,gate:'I6.6',purpose:'DIRECT_FORMS_SYNTHETIC_QA_ONLY',driver:PERSONAL_LEGAL.driverPath,
    subject,target:personalTarget(candidate),executions:[{phase:'PREVIEW',origin:candidate.previewUrl},{phase:'LIVE',origin:LIVE_ORIGIN}],
    legal:{type:'interno',version:'2.0',clauseIds:[...PERSONAL_LEGAL.clauseIds],termsProjectionSha256:PERSONAL_LEGAL.termsProjectionSha256,
      legalOwnerSha256:PERSONAL_LEGAL.legalOwnerSha256},constraints:{...PERSONAL_LIMITS},validity};
}
function validatePersonalLegalAuthority({controlBytes,receiptBytes,evidenceBytes,controlHeadSha,cfg,actor,candidate:expectedCandidate,now=Date.now()}){
  const guard=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  personalAssert(['PREVIEW','LIVE'].includes(cfg?.phase),'PHASE_REQUIRED');
  personalAssert(/^[a-f0-9]{40}$/.test(controlHeadSha||''),'CURRENT_HEAD_REQUIRED');
  const control=personalJson(controlBytes,'CONTROL'),candidate=guard.candidateForPhase(control,cfg.phase.toLowerCase());
  if(expectedCandidate)personalEqual(candidate,expectedCandidate,'CURRENT_CANDIDATE_DRIFT');
  personalAssert(candidate.directFormsQa===true,'EXACT_DIRECT_FORMS_PROFILE_REQUIRED');
  personalAssert(candidate.sourceSha===cfg.source,'SOURCE_DRIFT');
  const origin=cfg.phase==='LIVE'?LIVE_ORIGIN:candidate.previewUrl;
  personalAssert(cfg.origin===origin,'ORIGIN_DRIFT');
  personalAssert(candidate.directFormsPersonalLegal&&typeof candidate.directFormsPersonalLegal==='object','AUTHORIZATION_REQUIRED');
  const receipt=personalJson(receiptBytes,'RECEIPT'),evidence=personalJson(evidenceBytes,'DELEGATION_EVIDENCE');
  personalEqual(Object.keys(receipt).sort(),['schema','status','decisionId','decisionAt','subject','reviewContext','reviewContextSha256'].sort(),'RECEIPT_SHAPE');
  personalAssert(receipt.schema==='I66_DIRECT_FORMS_PERSONAL_LEGAL_AUTHORIZATION_V1'&&receipt.status==='CONFIRMED_PERSONAL_AUTHORIZATION','AUTHORIZATION_NOT_CONFIRMED');
  personalAssert(typeof receipt.decisionId==='string'&&/^[A-Z][A-Z0-9_]{8,150}$/.test(receipt.decisionId),'DECISION_REQUIRED');
  const subject=receipt.subject;
  personalAssert(subject&&/^[a-f0-9]{64}$/.test(subject.actorUidSha256||''),'SUBJECT_UID_REQUIRED');
  personalAssert(typeof subject.advisorId==='string'&&/^[a-zA-Z0-9_-]{3,120}$/.test(subject.advisorId)&&subject.advisorId!=='ase-paula-osorio','SUBJECT_ADVISOR_REQUIRED');
  personalEqual(subject,{actorUidSha256:subject.actorUidSha256,advisorId:subject.advisorId,role:'operativo',tenantId:TENANT,country:'GT',company:'Alianzas & Soluciones'},'SUBJECT_SCOPE_DRIFT');
  if(actor){
    personalAssert(typeof actor.uid==='string'&&actor.uid.length>0&&personalHash(actor.uid)===subject.actorUidSha256,'SIGNED_ACTOR_DRIFT');
    personalAssert(actor.role==='operativo'&&actor.advisorId===subject.advisorId,'SIGNED_ACTOR_DRIFT');
  }
  const decidedAt=personalTime(receipt.decisionAt,'DECISION_TIME_REQUIRED');
  personalAssert(Number.isFinite(now)&&decidedAt<=now,'DECISION_NOT_YET_EFFECTIVE');
  const validity=receipt.reviewContext?.validity;
  personalAssert(validity&&Object.keys(validity).length===2&&validity.notBefore===receipt.decisionAt,'VALIDITY_REQUIRED');
  personalAssert(validity.expiresAt===null||personalTime(validity.expiresAt,'EXPIRATION_INVALID')>decidedAt&&Date.parse(validity.expiresAt)>now,'AUTHORIZATION_EXPIRED');
  const reviewContext=personalReviewContext(candidate,subject,validity),reviewContextSha256=personalDigest(reviewContext);
  personalEqual(receipt.reviewContext,reviewContext,'REVIEW_CONTEXT_DRIFT');
  personalAssert(receipt.reviewContextSha256===reviewContextSha256,'REVIEW_DIGEST_DRIFT');
  personalEqual(Object.keys(evidence).sort(),['schema','status','decisionId','decisionAt','subject','reviewContextSha256','source','confirmation'].sort(),'DELEGATION_SHAPE');
  personalAssert(evidence.schema==='I66_DIRECT_FORMS_PERSONAL_DELEGATION_EVIDENCE_V1'&&evidence.status==='CONFIRMED_PERSONAL_DECISION_AND_DELEGATION','PERSONAL_DELEGATION_REQUIRED');
  personalAssert(evidence.decisionId===receipt.decisionId&&evidence.decisionAt===receipt.decisionAt,'PERSONAL_DECISION_DRIFT');
  personalEqual(evidence.subject,subject,'DELEGATED_SUBJECT_DRIFT');
  personalAssert(evidence.reviewContextSha256===reviewContextSha256,'DELEGATED_REVIEW_DRIFT');
  personalEqual(evidence.confirmation,{personallyAuthorized:true,explicitNormalUiDelegation:true,confirmedBySubjectUidSha256:subject.actorUidSha256,
    delegatedExecutor:PERSONAL_LEGAL.driverPath,reviewContextSha256},'EXPLICIT_PERSONAL_DELEGATION_REQUIRED');
  const source=evidence.source;
  personalEqual(Object.keys(source||{}).sort(),['kind','privateEvidenceRef','declarationSha256','verificationSha256'].sort(),'PERSONAL_EVIDENCE_SOURCE_REQUIRED');
  personalAssert(['PERSONAL_DIRECT_CONFIRMATION','PERSONAL_CONFIRMATION_WITH_VERIFIED_DELEGATION'].includes(source.kind),'PERSONAL_EVIDENCE_KIND_DENIED');
  // The actual statement and human verification stay in private durable evidence.
  // Canonical public metadata attests to those records; this code does not infer
  // consent from a quote, an office role or an arbitrary local file/flag.
  for(const k of ['declarationSha256','verificationSha256'])personalAssert(/^[a-f0-9]{64}$/.test(source[k]||'')&&source[k]!=='0'.repeat(64),'PRIVATE_EVIDENCE_DIGEST_REQUIRED');
  personalAssert(source.privateEvidenceRef==='private-evidence:sha256:'+source.verificationSha256,'PRIVATE_EVIDENCE_REFERENCE_DRIFT');
  const binding={schema:'I66_DIRECT_FORMS_PERSONAL_LEGAL_BINDING_V1',phase:cfg.phase,decisionId:receipt.decisionId,
    receiptPath:PERSONAL_LEGAL.receiptPath,receiptBlobSha:personalBlob(receiptBytes),receiptSha256:personalHash(receiptBytes),
    delegationEvidencePath:PERSONAL_LEGAL.evidencePath,delegationEvidenceBlobSha:personalBlob(evidenceBytes),delegationEvidenceSha256:personalHash(evidenceBytes),
    actorUidSha256:subject.actorUidSha256,reviewContextSha256};
  personalEqual(candidate.directFormsPersonalLegal,binding,'CURRENT_PERSONAL_BINDING_DRIFT');
  // The returned context contains hashes only; the private quotation/UID/email
  // never enters the signed report or failure diagnostics.
  const result=freezePersonal(JSON.parse(JSON.stringify({profile:PERSONAL_LEGAL.profile,phase:cfg.phase,origin,
    controlHeadSha,controlBlobSha:personalBlob(controlBytes),binding,decisionAt:receipt.decisionAt,
    subject,reviewContext,candidate})));
  personalAuthorities.add(result);return result;
}
function readCurrentPersonalLegalAuthority({cfg,actor,candidate},io={}){
  const exec=io.execFileSync||require('node:child_process').execFileSync;
  const git=(...args)=>exec('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});
  try{
    // The existing release owner refreshes this same origin/branch. All data
    // below is read at one fetched commit, never from the stale workflow tree.
    git('fetch','--no-tags','--quiet','origin','refs/heads/'+PERSONAL_LEGAL.branch);
    const head=git('rev-parse','FETCH_HEAD').trim();
    personalAssert(/^[a-f0-9]{40}$/.test(head),'CURRENT_HEAD_REQUIRED');
    const guard=require('./gravicentra-i6-6-operational-release-candidate.cjs');
    const controlBytes=git('show',head+':'+guard.CONTROL);
    const control=personalJson(controlBytes,'CONTROL'),current=guard.candidateForPhase(control,cfg.phase.toLowerCase());
    personalAssert(current.directFormsPersonalLegal,'AUTHORIZATION_REQUIRED');
    git('merge-base','--is-ancestor',cfg.source,head);
    personalAssert(git('diff','--name-only',cfg.source,head,'--',...guard.PINNED_OWNER_PATHS).trim()==='','SOURCE_OR_OWNER_DRIFT');
    const receiptBytes=git('show',head+':'+PERSONAL_LEGAL.receiptPath),evidenceBytes=git('show',head+':'+PERSONAL_LEGAL.evidencePath);
    return validatePersonalLegalAuthority({controlBytes,receiptBytes,evidenceBytes,controlHeadSha:head,cfg,actor,candidate});
  }catch(error){
    // Git/provider errors can contain private remote names. Keep a closed code.
    if(/^I66_DIRECT_FORMS_PERSONAL_[A-Z0-9_]+$/.test(error?.message||''))throw error;
    throw Error('I66_DIRECT_FORMS_PERSONAL_CURRENT_AUTHORITY_UNAVAILABLE');
  }
}
function assertPersonalContext(authority,cfg,actor){
  personalAssert(personalAuthorities.has(authority),'VALIDATED_CURRENT_AUTHORITY_REQUIRED');
  personalAssert(authority.phase===cfg.phase&&authority.origin===cfg.origin&&authority.reviewContext.target.sourceSha===cfg.source,'EXECUTION_CONTEXT_DRIFT');
  if(actor)personalAssert(actor.role==='operativo'&&actor.advisorId===authority.subject.advisorId&&personalHash(actor.uid||'')===authority.subject.actorUidSha256,'SIGNED_ACTOR_DRIFT');
  const expiry=authority.reviewContext.validity.expiresAt;
  personalAssert(expiry===null||Date.parse(expiry)>Date.now(),'AUTHORIZATION_EXPIRED');
}
function validatePersonalPresentation(snapshot,actor,authority,{checked=false,countryReady=true}={}){
  personalAssert(snapshot.origin===authority.origin&&snapshot.actorUid===actor.uid&&snapshot.signedActorUid===actor.uid,'RUNTIME_ACTOR_OR_ORIGIN_DRIFT');
  personalAssert(norm(snapshot.role)==='operativo'&&snapshot.advisorId===authority.subject.advisorId&&snapshot.tenantId===TENANT,'RUNTIME_SUBJECT_DRIFT');
  personalAssert(snapshot.company==='Alianzas & Soluciones'&&snapshot.companyBound===true,'RUNTIME_COMPANY_DRIFT');
  personalAssert(snapshot.scope==='user:'+(snapshot.email||snapshot.actorUid),'RUNTIME_SCOPE_DRIFT');
  personalAssert(snapshot.appStarted===true&&snapshot.authRestoring===false,'RUNTIME_NOT_READY');
  personalAssert(snapshot.gateCount===1&&snapshot.previousAcceptance===null,'FRESH_VISIBLE_GATE_REQUIRED');
  personalAssert(snapshot.version==='2.0'&&snapshot.type==='interno','RUNTIME_LEGAL_VERSION_DRIFT');
  personalEqual(snapshot.clauseIds,PERSONAL_LEGAL.clauseIds,'RUNTIME_CLAUSES_DRIFT');
  personalAssert(snapshot.checked===checked&&snapshot.buttonDisabled===!checked,'NORMAL_UI_STATE_DRIFT');
  if(countryReady){
    personalAssert(snapshot.country==='GT'&&snapshot.checkboxDisabled===false,'RUNTIME_COUNTRY_DRIFT');
    personalAssert(personalDigest(snapshot.terms)===PERSONAL_LEGAL.termsProjectionSha256,'DISPLAYED_TERMS_DRIFT');
  }else{
    personalAssert(snapshot.countrySelectionRequired===true&&snapshot.country===''&&snapshot.countrySelectionValue===''&&snapshot.checkboxDisabled===true,'COUNTRY_SELECTION_DRIFT');
    personalEqual([...snapshot.countryOptions].sort(),['CO','GT'],'COUNTRY_OPTIONS_DRIFT');
    personalEqual(snapshot.terms,[],'COUNTRY_SELECTION_TERMS_NOT_EMPTY');
  }
}
function validatePersonalAccepted(record,actor,authority,scope,startedAt,finishedAt){
  personalAssert(record&&record.aceptado===true&&record.actorUid===actor.uid&&record.scopeId===scope&&record.origin===authority.origin,'ACCEPTED_ACTOR_SCOPE_OR_ORIGIN_DRIFT');
  personalAssert(record.version==='2.0'&&record.tipo==='interno'&&record.pais==='GT'&&record.empresa==='Alianzas & Soluciones','ACCEPTED_TERMS_SCOPE_DRIFT');
  personalEqual(record.clausulas,PERSONAL_LEGAL.clauseIds,'ACCEPTED_CLAUSES_DRIFT');
  personalAssert(record.acceptanceMethod==='VISIBLE_CHECKBOX_AND_BUTTON'&&record.ip===null&&record.ipSource==='NOT_COLLECTED','NORMAL_UI_PERSISTENCE_REQUIRED');
  const at=personalTime(record.fecha,'ACCEPTED_TIME_REQUIRED');
  personalAssert(at>=startedAt&&at<=finishedAt,'ACCEPTED_TIME_DRIFT');
}
function verifyPersonalProofHead(proof,authority,io={}){
  personalAssert(personalAuthorities.has(authority),'VALIDATED_CURRENT_AUTHORITY_REQUIRED');
  personalAssert(/^[a-f0-9]{40}$/.test(proof?.controlHeadSha||''),'PROOF_HEAD_REQUIRED');
  if(proof.controlHeadSha===authority.controlHeadSha)return true;
  const exec=io.execFileSync||require('node:child_process').execFileSync;
  const git=(...args)=>exec('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});
  try{
    // A financial receipt may advance HEAD without touching this authority.
    // Require ancestry AND the exact same transport, candidate and private-
    // evidence references at the proof commit; never accept a replaced grant.
    git('merge-base','--is-ancestor',proof.controlHeadSha,authority.controlHeadSha);
    const guard=require('./gravicentra-i6-6-operational-release-candidate.cjs');
    const bytes=git('show',proof.controlHeadSha+':'+guard.CONTROL);
    personalAssert(personalBlob(bytes)===authority.controlBlobSha,'PROOF_TRANSPORT_CHANGED');
    personalEqual(guard.candidateForPhase(personalJson(bytes,'PROOF_CONTROL'),authority.phase.toLowerCase()),authority.candidate,'PROOF_CANDIDATE_CHANGED');
    for(const [p,blob,sha] of [[PERSONAL_LEGAL.receiptPath,authority.binding.receiptBlobSha,authority.binding.receiptSha256],
      [PERSONAL_LEGAL.evidencePath,authority.binding.delegationEvidenceBlobSha,authority.binding.delegationEvidenceSha256]]){
      const value=git('show',proof.controlHeadSha+':'+p);
      personalAssert(personalBlob(value)===blob&&personalHash(value)===sha,'PROOF_PERSONAL_EVIDENCE_CHANGED');
    }
    return true;
  }catch(error){
    if(/^I66_DIRECT_FORMS_PERSONAL_[A-Z0-9_]+$/.test(error?.message||''))throw error;
    throw Error('I66_DIRECT_FORMS_PERSONAL_PROOF_HEAD_NOT_VERIFIED');
  }
}
function validatePersonalLegalProof(proof,authority,io={}){
  personalAssert(personalAuthorities.has(authority),'VALIDATED_CURRENT_AUTHORITY_REQUIRED');
  verifyPersonalProofHead(proof,authority,io);
  const expected={profile:PERSONAL_LEGAL.profile,status:'PERSONAL_DECISION_APPLIED_BY_NORMAL_UI_AND_RELOAD',
    phase:authority.phase,origin:authority.origin,...personalTarget(authority.candidate),decisionId:authority.binding.decisionId,
    controlHeadSha:proof.controlHeadSha,controlBlobSha:authority.controlBlobSha,
    receiptPath:PERSONAL_LEGAL.receiptPath,receiptBlobSha:authority.binding.receiptBlobSha,receiptSha256:authority.binding.receiptSha256,
    delegationEvidencePath:PERSONAL_LEGAL.evidencePath,delegationEvidenceBlobSha:authority.binding.delegationEvidenceBlobSha,delegationEvidenceSha256:authority.binding.delegationEvidenceSha256,
    reviewContextSha256:authority.binding.reviewContextSha256,actorUidSha256:authority.subject.actorUidSha256,
    version:'2.0',clauseIds:[...PERSONAL_LEGAL.clauseIds],termsProjectionSha256:PERSONAL_LEGAL.termsProjectionSha256,
    normalUi:true,immediateReadback:true,reloadReadback:true,reloadActorVerified:true,authorizationRecheckedBeforeClick:true,
    storageSeeded:false,gateBypassed:false,authOrMembershipMutations:0};
  personalEqual(Object.fromEntries(Object.entries(proof||{}).filter(([k])=>!['acceptedAt','scopeSha256','acceptanceRecordSha256'].includes(k))),expected,'SIGNED_PROOF_DRIFT');
  for(const k of ['scopeSha256','acceptanceRecordSha256'])personalAssert(/^[a-f0-9]{64}$/.test(proof?.[k]||''),'SIGNED_PROOF_HASH_REQUIRED');
  const time=personalTime(proof?.acceptedAt,'SIGNED_PROOF_TIME_REQUIRED');
  personalAssert(time>=Date.parse(authority.decisionAt)&&time<=Date.now(),'SIGNED_PROOF_TIME_DRIFT');
  const expiry=authority.reviewContext.validity.expiresAt;
  personalAssert(expiry===null||time<Date.parse(expiry)&&Date.now()<Date.parse(expiry),'AUTHORIZATION_EXPIRED');
  return true;
}
async function applyPersonalLegalUi({page,actor,cfg,authority},io={}){
  assertPersonalContext(authority,cfg,actor);
  const readFile=io.readFileSync||fs.readFileSync,exec=io.execFileSync||require('node:child_process').execFileSync,fetcher=io.fetch||fetch;
  const guard=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  const marker=personalJson(readFile(path.join(cfg.packageRoot,'bundle/site/__recovery__/build.json')),'PACKAGE_MARKER');
  guard.validateBuildMarker(authority.candidate,marker);
  const verifyHostedMarker=async()=>{
    const r=await fetcher(cfg.origin+'/__recovery__/build.json',{redirect:'error',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30000)});
    personalAssert(r.status===200,'HOSTED_BUILD_UNAVAILABLE');guard.validateBuildMarker(authority.candidate,await r.json(),marker);
  };
  await verifyHostedMarker();
  const source=exec('git',['show',cfg.source+':'+PERSONAL_LEGAL.legalOwnerPath],{stdio:['ignore','pipe','pipe'],maxBuffer:1024*1024});
  const bundled=readFile(path.join(cfg.packageRoot,'bundle/site/core/legal.js'));
  personalAssert(personalHash(source)===PERSONAL_LEGAL.legalOwnerSha256&&personalHash(bundled)===personalHash(source),'LEGAL_OWNER_DRIFT');
  const hosted=await fetcher(cfg.origin+'/core/legal.js',{redirect:'error',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30000)});
  personalAssert(hosted.status===200&&personalHash(Buffer.from(await hosted.arrayBuffer()))===personalHash(bundled),'HOSTED_TERMS_OWNER_DRIFT');
  await page.waitForSelector('[data-legal-gate]',{state:'visible',timeout:10000});
  const presentation=()=>page.evaluate(async function directFormsPersonalPresentation(){
    const w=v=>String(v||'').replace(/\s+/g,' ').trim(),gates=document.querySelectorAll('[data-legal-gate]'),gate=gates[0],u=Orbit.auth.user();
    const signed=await Orbit.productRuntimeBrowserProvidersP0.initialUser(),scope=gate?.getAttribute('data-legal-gate'),countrySelect=gate?.querySelector('#lg-country');
    const branding=Orbit.publicTenantBranding,brand=branding?.current?.(),config=window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__||{},bound=window.__ORBIT360_TENANT_BRANDING_SNAPSHOT__;
    const companyBound=config.enabled===true&&config.tenantHint===u.tenantId&&branding?.companyConfigAuthority==='server'&&
      (brand?.source==='tenant-config-live'||brand?.source==='build-snapshot'&&bound?.tenantId===u.tenantId&&bound?.sourcePath==='tenants/'+u.tenantId+'/config/branding');
    return {origin:location.origin,actorUid:u.uid,signedActorUid:signed?.uid||'',advisorId:u.advisorId,role:Orbit.session.rol(),tenantId:u.tenantId,
      email:u.email||'',scope,company:brand?.displayName,companyBound,appStarted:Orbit.productAppP0.isStarted()===true,
      authRestoring:document.documentElement.getAttribute('data-auth-restoring')==='1',gateCount:gates.length,
      version:gate?.getAttribute('data-legal-version'),type:gate?.getAttribute('data-legal-type'),country:gate?.getAttribute('data-legal-country'),
      clauseIds:(gate?.getAttribute('data-legal-clauses')||'').split(' '),previousAcceptance:Orbit.legal.aceptaciones()[scope]||null,
      countrySelectionRequired:gate?.getAttribute('data-legal-country-required')==='1',countrySelectionValue:countrySelect?.value||'',
      countryOptions:countrySelect?[...countrySelect.options].map(o=>o.value).filter(Boolean):[],
      checked:gate?.querySelector('#lg-chk')?.checked,checkboxDisabled:gate?.querySelector('#lg-chk')?.disabled,buttonDisabled:gate?.querySelector('#lg-ok')?.disabled,
      terms:gate?[...gate.querySelectorAll('.lg-clausula')].map(c=>({title:w(c.querySelector('.lg-cl-t')?.textContent),intro:w(c.querySelector('.lg-intro')?.textContent),
        blocks:[...c.querySelectorAll('.lg-bloque')].map(b=>({heading:w(b.querySelector('.lg-bl-h')?.textContent),paragraph:w(b.querySelector('p')?.textContent),items:[...b.querySelectorAll('li')].map(li=>w(li.textContent))})),metadata:w(c.querySelector('.lg-meta')?.textContent)})):[]};
  });
  let shown=await presentation();
  if(shown.countrySelectionRequired&&shown.country===''){
    validatePersonalPresentation(shown,actor,authority,{countryReady:false});
    await page.locator('[data-legal-gate]').locator('#lg-country').selectOption('GT');shown=await presentation();
  }
  validatePersonalPresentation(shown,actor,authority);
  // Refresh current metadata immediately before the normal checkbox, and again
  // before the committing button. Revocation or a replaced binding stops here.
  const refresh=io.readCurrentAuthority||readCurrentPersonalLegalAuthority;
  const current=refresh({cfg,actor,candidate:authority.candidate});assertPersonalContext(current,cfg,actor);
  personalEqual(current.binding,authority.binding,'AUTHORITY_CHANGED_BEFORE_ACTION');
  await page.locator('[data-legal-gate]').locator('#lg-chk').check();
  const atClick=refresh({cfg,actor,candidate:authority.candidate});assertPersonalContext(atClick,cfg,actor);
  personalEqual(atClick.binding,current.binding,'AUTHORITY_CHANGED_BEFORE_ACTION');
  validatePersonalPresentation(await presentation(),actor,atClick,{checked:true});
  const startedAt=Date.now();
  await page.locator('[data-legal-gate]').locator('#lg-ok').click();
  await page.waitForSelector('[data-legal-gate]',{state:'detached',timeout:10000});
  const record=await page.evaluate(function directFormsPersonalAccepted(scope){return Orbit.legal.aceptaciones()[scope]||null;},shown.scope),immediateAt=Date.now();
  validatePersonalAccepted(record,actor,atClick,shown.scope,startedAt,immediateAt);
  await page.reload({waitUntil:'commit',timeout:30000});
  await page.waitForFunction(()=>!!window.Orbit?.auth?.user?.()?.uid&&window.Orbit?.productAppP0?.isStarted?.()===true&&!!window.Orbit?.productRuntimeBrowserProvidersP0?.initialUser,null,{timeout:30000});
  await requireExistingLegalReadiness(page);
  const reloaded=await page.evaluate(async function directFormsPersonalReload(scope){
    const u=Orbit.auth.user(),signed=await Orbit.productRuntimeBrowserProvidersP0.initialUser();
    const branding=Orbit.publicTenantBranding,brand=branding?.current?.(),config=window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__||{},bound=window.__ORBIT360_TENANT_BRANDING_SNAPSHOT__;
    const companyBound=config.enabled===true&&config.tenantHint===u.tenantId&&branding?.companyConfigAuthority==='server'&&
      (brand?.source==='tenant-config-live'||brand?.source==='build-snapshot'&&bound?.tenantId===u.tenantId&&bound?.sourcePath==='tenants/'+u.tenantId+'/config/branding');
    return{origin:location.origin,actorUid:u.uid,signedActorUid:signed?.uid||'',advisorId:u.advisorId,role:Orbit.session.rol(),tenantId:u.tenantId,
      email:u.email||'',scope,company:brand?.displayName,companyBound,legalSatisfied:Orbit.legal.yaAcepto(scope)===true,
      gateCount:document.querySelectorAll('[data-legal-gate]').length,record:Orbit.legal.aceptaciones()[scope]||null};
  },shown.scope);
  personalAssert(reloaded.origin===cfg.origin&&reloaded.actorUid===actor.uid&&reloaded.signedActorUid===actor.uid&&norm(reloaded.role)==='operativo'&&
    reloaded.advisorId===actor.advisorId&&reloaded.tenantId===TENANT&&reloaded.company==='Alianzas & Soluciones'&&reloaded.companyBound===true,'RELOAD_ACTOR_OR_ORIGIN_DRIFT');
  personalAssert(reloaded.scope===shown.scope&&reloaded.scope==='user:'+(reloaded.email||reloaded.actorUid)&&reloaded.legalSatisfied===true&&reloaded.gateCount===0,'RELOAD_SCOPE_OR_GATE_DRIFT');
  validatePersonalAccepted(reloaded.record,actor,atClick,shown.scope,startedAt,immediateAt);
  personalEqual(reloaded.record,record,'RELOAD_ACCEPTANCE_CHANGED');await verifyHostedMarker();
  const proof={profile:PERSONAL_LEGAL.profile,status:'PERSONAL_DECISION_APPLIED_BY_NORMAL_UI_AND_RELOAD',phase:cfg.phase,origin:cfg.origin,
    ...personalTarget(atClick.candidate),decisionId:atClick.binding.decisionId,controlHeadSha:atClick.controlHeadSha,controlBlobSha:atClick.controlBlobSha,
    receiptPath:PERSONAL_LEGAL.receiptPath,receiptBlobSha:atClick.binding.receiptBlobSha,receiptSha256:atClick.binding.receiptSha256,
    delegationEvidencePath:PERSONAL_LEGAL.evidencePath,delegationEvidenceBlobSha:atClick.binding.delegationEvidenceBlobSha,delegationEvidenceSha256:atClick.binding.delegationEvidenceSha256,
    reviewContextSha256:atClick.binding.reviewContextSha256,actorUidSha256:atClick.subject.actorUidSha256,scopeSha256:personalHash(shown.scope),
    acceptedAt:record.fecha,acceptanceRecordSha256:personalDigest(record),version:'2.0',clauseIds:[...PERSONAL_LEGAL.clauseIds],termsProjectionSha256:PERSONAL_LEGAL.termsProjectionSha256,
    normalUi:true,immediateReadback:true,reloadReadback:true,reloadActorVerified:true,authorizationRecheckedBeforeClick:true,
    storageSeeded:false,gateBypassed:false,authOrMembershipMutations:0};
  validatePersonalLegalProof(proof,atClick);return proof;
}

const PAULA_ROLE_PROFILE='PAULA_ASSIGNED_ROLES_EFFECTIVE_FORMS_V1';
const paulaRoleAuthorities=new WeakSet();
function directFormsProfile(candidate){
  if(candidate?.directFormsQaProfile===undefined)return null;
  assert.equal(candidate.directFormsQa,true,'I66_DIRECT_FORMS_ROLE_PROFILE_WITHOUT_QA');
  assert.equal(candidate.cancellationQa,true,'I66_DIRECT_FORMS_ROLE_CANCELLATION_PROFILE_REQUIRED');
  assert.equal(candidate.directFormsQaProfile,PAULA_ROLE_PROFILE,'I66_DIRECT_FORMS_ROLE_PROFILE_UNKNOWN');
  assert.equal(candidate.directFormsPersonalLegal,undefined,'I66_DIRECT_FORMS_ROLE_MIXED_PERSONAL_GRANTS');
  return PAULA_ROLE_PROFILE;
}
function validatePaulaRoleAuthority({cfg,controlBytes,candidate:expected,previewReceiptBytes,liveReceiptBytes,proposalBytes,controlHeadSha}){
  assert.ok(['PREVIEW','LIVE'].includes(cfg?.phase),'I66_DIRECT_FORMS_ROLE_PHASE');
  assert.match(controlHeadSha||'',/^[a-f0-9]{40}$/,'I66_DIRECT_FORMS_ROLE_CURRENT_HEAD');
  const guard=require('./gravicentra-i6-6-operational-release-candidate.cjs');
  const legal=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
  const control=JSON.parse(controlBytes),candidate=guard.candidateForPhase(control,cfg.phase.toLowerCase());
  assert.equal(directFormsProfile(candidate),PAULA_ROLE_PROFILE,'I66_DIRECT_FORMS_ROLE_PROFILE_REQUIRED');
  if(expected)assert.deepEqual(candidate,expected,'I66_DIRECT_FORMS_ROLE_CURRENT_CANDIDATE_DRIFT');
  assert.equal(candidate.sourceSha,cfg.source,'I66_DIRECT_FORMS_ROLE_SOURCE_DRIFT');
  assert.equal(cfg.origin,cfg.phase==='LIVE'?LIVE_ORIGIN:candidate.previewUrl,'I66_DIRECT_FORMS_ROLE_ORIGIN_DRIFT');
  assert.equal(personalHash(previewReceiptBytes),legal.I66_SCOPE.receiptSha256,'I66_DIRECT_FORMS_ROLE_DIRECTION_AUTHORITY_DRIFT');
  if(cfg.phase==='LIVE')legal.validateLiveScopeDecision({receipt:JSON.parse(liveReceiptBytes),receiptSha256:personalHash(liveReceiptBytes),candidate,proposalBytes,control});
  else legal.validateI66ScopeCandidate(candidate);
  const authority=freezePersonal({profile:PAULA_ROLE_PROFILE,phase:cfg.phase,origin:cfg.origin,candidate,controlHeadSha,
    actorUidSha256:cfg.phase==='LIVE'?candidate.liveLegalAcceptance.actorUidSha256:null,
    legalAuthoritySha256:cfg.phase==='LIVE'?personalHash(liveReceiptBytes):personalHash(previewReceiptBytes)});
  paulaRoleAuthorities.add(authority);return authority;
}
function readCurrentPaulaRoleAuthority({cfg,candidate},io={}){
  const exec=io.execFileSync||require('node:child_process').execFileSync;
  const git=(...args)=>exec('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});
  try{
    const guard=require('./gravicentra-i6-6-operational-release-candidate.cjs'),legal=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
    git('fetch','--no-tags','--quiet','origin','refs/heads/'+PERSONAL_LEGAL.branch);
    const head=git('rev-parse','FETCH_HEAD').trim();assert.match(head,/^[a-f0-9]{40}$/,'I66_DIRECT_FORMS_ROLE_CURRENT_HEAD');
    git('merge-base','--is-ancestor',cfg.source,head);
    assert.equal(git('diff','--name-only',cfg.source,head,'--',...guard.PINNED_OWNER_PATHS).trim(),'','I66_DIRECT_FORMS_ROLE_SOURCE_OR_OWNER_DRIFT');
    const sourceBytes=p=>git('show',cfg.source+':'+p),currentBytes=p=>git('show',head+':'+p);
    const previewReceiptBytes=currentBytes(legal.I66_SCOPE.receiptPath);
    assert.equal(previewReceiptBytes,sourceBytes(legal.I66_SCOPE.receiptPath),'I66_DIRECT_FORMS_ROLE_DIRECTION_AUTHORITY_DRIFT');
    assert.equal(personalHash(sourceBytes(PERSONAL_LEGAL.legalOwnerPath)),PERSONAL_LEGAL.legalOwnerSha256,'I66_DIRECT_FORMS_ROLE_TERMS_DRIFT');
    let liveReceiptBytes,proposalBytes;
    if(cfg.phase==='LIVE'){
      liveReceiptBytes=currentBytes(legal.LIVE_SCOPE.authorizationPath);proposalBytes=currentBytes(legal.LIVE_SCOPE.proposalPath);
      assert.equal(liveReceiptBytes,sourceBytes(legal.LIVE_SCOPE.authorizationPath),'I66_DIRECT_FORMS_ROLE_DIRECTION_AUTHORITY_DRIFT');
      assert.equal(proposalBytes,sourceBytes(legal.LIVE_SCOPE.proposalPath),'I66_DIRECT_FORMS_ROLE_DIRECTION_AUTHORITY_DRIFT');
    }
    return validatePaulaRoleAuthority({cfg,candidate,controlHeadSha:head,controlBytes:currentBytes(guard.CONTROL),previewReceiptBytes,liveReceiptBytes,proposalBytes});
  }catch(error){
    if(/^I66_DIRECT_FORMS_ROLE_[A-Z0-9_]+$/.test(error?.message||''))throw error;
    throw Error('I66_DIRECT_FORMS_ROLE_CURRENT_AUTHORITY_UNAVAILABLE');
  }
}
function resolvePaulaAssignedActors(members,authority){
  assert.ok(paulaRoleAuthorities.has(authority),'I66_DIRECT_FORMS_ROLE_CURRENT_AUTHORITY_REQUIRED');
  const matches=members.filter(row=>String(row.data?.advisorId||row.data?.asesorId||'')==='ase-paula-osorio');
  assert.equal(matches.length,1,'I66_DIRECT_FORMS_ROLE_PAULA_MEMBERSHIP_AMBIGUOUS');
  const {uid,data}=matches[0],roles=[].concat(data.roles||[]).map(norm),countries=[].concat(data.countries||data.paises||[]).map(v=>String(v).toUpperCase());
  assert.ok(typeof uid==='string'&&uid,'I66_DIRECT_FORMS_ROLE_UID_REQUIRED');
  assert.ok(data.active!==false&&data.activo!==false&&['active','activo'].includes(norm(data.status||data.estado)),'I66_DIRECT_FORMS_ROLE_MEMBERSHIP_INACTIVE');
  assert.ok(roles.includes('direccion')&&roles.includes('operativo'),'I66_DIRECT_FORMS_ROLE_NOT_ASSIGNED');
  assert.equal(norm(data.activeRole),'direccion','I66_DIRECT_FORMS_ROLE_INITIAL_DIRECTION_REQUIRED');
  assert.ok(countries.includes('GT'),'I66_DIRECT_FORMS_ROLE_COUNTRY_DENIED');
  if(data.tenantId!==undefined)assert.equal(data.tenantId,TENANT,'I66_DIRECT_FORMS_ROLE_TENANT_DRIFT');
  if(authority.actorUidSha256)assert.equal(personalHash(uid),authority.actorUidSha256,'I66_DIRECT_FORMS_ROLE_UID_DRIFT');
  const base={uid,advisorId:'ase-paula-osorio',membershipSha256:personalDigest(data),assignedRolesSha256:personalDigest([...new Set(roles)].sort())};
  return ['operativo','direccion'].map(role=>({...base,role}));
}
function validatePaulaRuntime(snapshot,actor,role){
  assert.equal(snapshot.actorUidSha256,personalHash(actor.uid),'I66_DIRECT_FORMS_ROLE_RUNTIME_UID_DRIFT');
  assert.equal(snapshot.signedActorUidSha256,snapshot.actorUidSha256,'I66_DIRECT_FORMS_ROLE_AUTH_UID_DRIFT');
  assert.equal(snapshot.advisorId,'ase-paula-osorio','I66_DIRECT_FORMS_ROLE_ADVISOR_DRIFT');
  assert.equal(snapshot.tenantId,TENANT,'I66_DIRECT_FORMS_ROLE_TENANT_DRIFT');
  assert.equal(snapshot.country,'GT','I66_DIRECT_FORMS_ROLE_COUNTRY_DRIFT');
  assert.equal(norm(snapshot.role),role,'I66_DIRECT_FORMS_ROLE_EFFECTIVE_ROLE_DRIFT');
  assert.ok(snapshot.assignedRoles.includes('direccion')&&snapshot.assignedRoles.includes('operativo'),'I66_DIRECT_FORMS_ROLE_NOT_ASSIGNED');
  assert.equal(personalDigest([...new Set(snapshot.assignedRoles)].sort()),actor.assignedRolesSha256,'I66_DIRECT_FORMS_ROLE_ASSIGNMENTS_DRIFT');
  assert.equal(snapshot.appStarted,true,'I66_DIRECT_FORMS_ROLE_APP_NOT_STARTED');
  for(const key of ['canRenew','canIssue','canCancel'])assert.equal(snapshot[key],true,'I66_DIRECT_FORMS_ROLE_CAPABILITY_DENIED_'+key);
  return {actorUidSha256:snapshot.actorUidSha256,advisorId:snapshot.advisorId,tenantId:snapshot.tenantId,country:snapshot.country};
}
async function readPaulaRuntimeSnapshot(page){
    const data=await page.evaluate(async function directFormsPaulaRoleSnapshot(){
      const o=Orbit,u=o.auth.user(),signed=await o.productRuntimeBrowserProvidersP0.initialUser();
      return {uid:u.uid,signedUid:signed?.uid||'',advisorId:u.advisorId,tenantId:u.tenantId,role:o.session.rol(),
        country:document.getElementById('pais-sel')?.value||'',assignedRoles:o.session.allowedRoles(),appStarted:o.productAppP0.isStarted()===true,
        canRenew:o.access.can('renovaciones','edit')===true,canIssue:o.issuance.canManage()===true,canCancel:o.policyReceipts.canRegisterEffectiveCancellation()===true};
    });
    return {...data,actorUidSha256:personalHash(data.uid),signedActorUidSha256:personalHash(data.signedUid),assignedRoles:data.assignedRoles.map(norm)};
}
async function selectPaulaAssignedRole({page,actor,authority,directionLegalAcceptance},io={}){
  assert.ok(paulaRoleAuthorities.has(authority),'I66_DIRECT_FORMS_ROLE_CURRENT_AUTHORITY_REQUIRED');
  const legal=io.legal||require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
  if(authority.phase==='LIVE')legal.validateLiveAcceptanceProof(directionLegalAcceptance,authority.candidate);
  else legal.validateAcceptanceProof(directionLegalAcceptance,authority.candidate);
  assert.equal(directionLegalAcceptance.actorUidSha256,personalHash(actor.uid),'I66_DIRECT_FORMS_ROLE_LEGAL_ACTOR_DRIFT');
  // Only normal selectors. The canonical owner refuses unassigned roles and
  // invalidates scope before rehydration; no membership or storage injection.
  const country=page.locator('#pais-sel');if(await country.inputValue()!=='GT')await country.selectOption('GT');
  const before=validatePaulaRuntime(await readPaulaRuntimeSnapshot(page),actor,'direccion');
  await page.locator('#rol-sel').selectOption(actor.role==='operativo'?'Operativo':'Dirección');
  await page.waitForFunction(role=>window.Orbit?.session?.rol?.()===role,actor.role==='operativo'?'Operativo':'Dirección',{timeout:10000});
  await page.evaluate(async()=>{await Orbit.store._ensureCollections(['clientes','polizas','gestiones','aseguradoras']);});
  await page.waitForFunction(()=>['clientes','polizas','gestiones','aseguradoras'].every(c=>Orbit.store._productStatus().serverConfirmedCollections.includes(c)),null,{timeout:30000});
  const after=validatePaulaRuntime(await readPaulaRuntimeSnapshot(page),actor,actor.role);
  assert.deepEqual(after,before,'I66_DIRECT_FORMS_ROLE_IDENTITY_CHANGED_ON_SELECTION');
  await (io.readiness||requireExistingLegalReadiness)(page);
  return {profile:PAULA_ROLE_PROFILE,actorUidSha256:after.actorUidSha256,advisorId:after.advisorId,tenantId:after.tenantId,country:'GT',
    initialRole:'direccion',activeRole:actor.role,normalSelector:true,rehydrated:true,sameIdentity:true,
    assignedRolesSha256:actor.assignedRolesSha256,membershipBeforeSha256:actor.membershipSha256,membershipAfterSha256:null,
    identityScopeSha256:personalDigest(after),legalAcceptedAsRole:'direccion',reloadIdentityChecks:0};
}
function validatePaulaRoleProof(actor,authority){
  assert.ok(paulaRoleAuthorities.has(authority),'I66_DIRECT_FORMS_ROLE_CURRENT_AUTHORITY_REQUIRED');
  const legal=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs'),proof=actor.roleSelection;
  const acceptance=actor.directionLegalAcceptance;
  if(authority.phase==='LIVE')legal.validateLiveAcceptanceProof(acceptance,authority.candidate);else legal.validateAcceptanceProof(acceptance,authority.candidate);
  for(const [k,v] of Object.entries({profile:PAULA_ROLE_PROFILE,advisorId:'ase-paula-osorio',tenantId:TENANT,country:'GT',initialRole:'direccion',activeRole:actor.role,
    normalSelector:true,rehydrated:true,sameIdentity:true,legalAcceptedAsRole:'direccion'}))assert.deepEqual(proof?.[k],v,'I66_DIRECT_FORMS_ROLE_PROOF_'+k);
  for(const k of ['actorUidSha256','assignedRolesSha256','membershipBeforeSha256','membershipAfterSha256','identityScopeSha256'])assert.match(proof[k]||'',/^[a-f0-9]{64}$/,'I66_DIRECT_FORMS_ROLE_PROOF_DIGEST');
  assert.equal(proof.actorUidSha256,acceptance.actorUidSha256,'I66_DIRECT_FORMS_ROLE_PROOF_LEGAL_ACTOR_DRIFT');
  if(authority.actorUidSha256)assert.equal(proof.actorUidSha256,authority.actorUidSha256,'I66_DIRECT_FORMS_ROLE_PROOF_UID_DRIFT');
  assert.equal(proof.membershipBeforeSha256,proof.membershipAfterSha256,'I66_DIRECT_FORMS_ROLE_MEMBERSHIP_CHANGED');
  assert.equal(proof.identityScopeSha256,personalDigest({actorUidSha256:proof.actorUidSha256,advisorId:'ase-paula-osorio',tenantId:TENANT,country:'GT'}),'I66_DIRECT_FORMS_ROLE_PROOF_IDENTITY_DRIFT');
  assert.equal(proof.reloadIdentityChecks,authority.phase==='LIVE'?2:0,'I66_DIRECT_FORMS_ROLE_RELOAD_IDENTITY_REQUIRED');
  assert.equal(actor.personalLegalAcceptance,undefined,'I66_DIRECT_FORMS_ROLE_OTHER_PERSONAL_ACCEPTANCE_FORBIDDEN');
}

function safeDirectFormsDiagnosticReport(report){
  const knownStage=['SEED','SIGNED_SESSION','DIRECTION_EXISTING_LEGAL_SCOPE','EXISTING_LEGAL_READINESS','PROTECTED_HYDRATION',
    'PERSONAL_LEGAL_AUTHORITY','PERSONAL_LEGAL_NORMAL_UI','PAULA_ASSIGNED_ROLE_SELECTION','BOTH_PUBLIC_RENEWAL_ENTRIES','ISSUED_BENEFICIARY_ENDORSEMENT_DRAFT','ISSUED_ENDORSEMENT_SAVE','DIRECT_RENEWAL_SAVE','RELOAD_READBACK',
    'EFFECTIVE_CANCELLATION_DRAFT','EFFECTIVE_CANCELLATION_SAVE','EFFECTIVE_CANCELLATION_RELOAD_REPLAY'];
  const cleanClick=raw=>{
    if(!raw||typeof raw!=='object')return null;
    const out={};for(const key of ['beforeClick','onFailure'])if(Object.hasOwn(raw,key))out[key]=safeDirectFormsSnapshot(raw[key]);
    if(raw.actionability&&typeof raw.actionability==='object')out.actionability=Object.fromEntries(DIRECT_FORMS_CLICK_FLAGS.map(k=>[k,raw.actionability[k]===true]));
    if(raw.knownInterceptors&&typeof raw.knownInterceptors==='object')out.knownInterceptors={legalGate:raw.knownInterceptors.legalGate===true,authRestoring:raw.knownInterceptors.authRestoring===true};
    if(raw.failureClass)out.failureClass=raw.failureClass==='TIMEOUT_ERROR'?'TIMEOUT_ERROR':'CLICK_FAILURE';return out;
  };
  return {owner:'DIRECT_FORMS',diagnosticOnly:true,status:'FAILED_NOT_ACCEPTED',
    phase:['PREVIEW','LIVE'].includes(report?.phase)?report.phase:null,
    sourceSha:/^[a-f0-9]{40}$/.test(report?.sourceSha||'')?report.sourceSha:null,
    actors:Array.isArray(report?.actors)?report.actors.slice(0,2).map(actor=>({
      role:['operativo','direccion'].includes(actor?.role)?actor.role:'UNKNOWN',restored:actor?.restored===true,
      failureStage:knownStage.includes(actor?.failureStage)?actor.failureStage:'UNKNOWN_STAGE',
      failureCode:DIRECT_FORMS_FAILURE_CODES.includes(actor?.failureCode)?actor.failureCode:'RUNTIME_FAILURE',
      entriesCompleted:Array.isArray(actor?.entries)?Math.min(actor.entries.length,2):0,
      clickDiagnostic:cleanClick(actor?.clickDiagnostic),failureUi:actor?.failureUi?safeDirectFormsSnapshot(actor.failureUi):null
    })):[]};
}
function validateSignedReport(report,{phase,sourceSha,buildId,personalAuthority,roleAuthority,cancellationQa=false}){
  assert.ok(['PREVIEW','LIVE'].includes(phase),'I66_DIRECT_FORMS_REPORT_PHASE');
  assert.match(sourceSha||'',/^[a-f0-9]{40}$/,'I66_DIRECT_FORMS_REPORT_SOURCE_REQUIRED');
  assert.ok(typeof buildId==='string'&&buildId.length>0,'I66_DIRECT_FORMS_REPORT_BUILD_REQUIRED');
  const live=phase==='LIVE',paula=roleAuthority?.profile===PAULA_ROLE_PROFILE;let checks=0;
  if(paula){
    assert.ok(paulaRoleAuthorities.has(roleAuthority),'I66_DIRECT_FORMS_ROLE_CURRENT_AUTHORITY_REQUIRED');
    assert.equal(roleAuthority.phase,phase,'I66_DIRECT_FORMS_ROLE_PHASE_DRIFT');
    assert.equal(roleAuthority.candidate.sourceSha,sourceSha,'I66_DIRECT_FORMS_ROLE_SOURCE_DRIFT');
    assert.equal(roleAuthority.candidate.buildId,buildId,'I66_DIRECT_FORMS_ROLE_BUILD_DRIFT');
    assert.equal(report.profile,PAULA_ROLE_PROFILE,'I66_DIRECT_FORMS_ROLE_REPORT_PROFILE_REQUIRED');
    assert.equal(cancellationQa,roleAuthority.candidate.cancellationQa===true,'I66_DIRECT_FORMS_REPORT_CANCELLATION_CANDIDATE_DRIFT');
  }else assert.equal(report?.profile,undefined,'I66_DIRECT_FORMS_ROLE_UNBOUND_PROFILE');
  const equal=(actual,expected,code)=>{assert.deepEqual(actual,expected,'I66_DIRECT_FORMS_REPORT_'+code);checks++;};
  equal(report?.schema,'I66_DIRECT_RENEWAL_ISSUED_ENDORSEMENT_SIGNED_UI_V1','SCHEMA');
  equal(report.phase,phase,'PHASE');equal(report.sourceSha,sourceSha,'SOURCE');equal(report.buildId,buildId,'BUILD');
  equal(report.status,live?'SIGNED_LIVE_DIRECT_FORMS_NORMAL_UI_PASS':'SIGNED_PREVIEW_DIRECT_FORMS_READONLY_PASS','STATUS');
  equal(report.realCustomerWrites,0,'REAL_WRITES');equal(report.externalMessages,0,'EXTERNAL_MESSAGES');
  equal(report.restoreComplete,true,'RESTORE');
  equal(Array.isArray(report.actors),true,'ACTORS');
  equal(report.actors.map(x=>x?.role).sort(),['direccion','operativo'],'EXACT_ROLES');
  if(cancellationQa)equal(report.cancellationQa,true,'CANCELLATION_PROFILE');
  else assert.equal(report.cancellationQa,undefined,'I66_DIRECT_FORMS_REPORT_UNAUTHORIZED_CANCELLATION_PROFILE');
  for(const actor of report.actors){
    equal(actor.restored,true,'ACTOR_RESTORE');equal(actor.endorsementDraft,true,'ENDORSEMENT_DRAFT');
    equal(actor.readonly,!live,'READONLY');equal(actor.pageErrorCount,0,'PAGE_ERRORS');
    equal(Array.isArray(actor.entries),true,'ENTRIES');
    equal(actor.entries.map(x=>x?.entry).sort(),['Cliente360','Renovaciones'],'EXACT_ENTRIES');
    for(const entry of actor.entries)for(const field of ['expiredUnknown','inheritedEditable','noIntermediateOps','noDraftWrites'])equal(entry[field],true,'ENTRY_'+field);
    if(live){
      equal(actor.status,'SIGNED_LIVE_NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY_PASS','ACTOR_LIVE_STATUS');
      equal(actor.writes?.entry,actor.role==='operativo'?'Renovaciones':'Cliente360','SAVE_ENTRY');
      for(const field of ['normalUi','linkedManagement','reload','idempotentReplay'])equal(actor.writes?.[field],true,'RENEWAL_'+field);
      for(const field of ['successors','receipts','portfolio'])equal(actor.writes?.[field],1,'RENEWAL_'+field);
      for(const field of ['normalUi','policyReadback','closedManagement','reload','idempotentReplay'])equal(actor.endorsementWrite?.[field],true,'ENDORSEMENT_'+field);
    }else{
      equal(actor.status,'SIGNED_PREVIEW_ENTRIES_READONLY_PASS','ACTOR_PREVIEW_STATUS');
      equal(actor.writes,'NOT_EXECUTED_PREVIEW_RELATIONS_PROTECTED','PREVIEW_NO_WRITE_CLAIM');
      equal(actor.endorsementWrite,undefined,'PREVIEW_NO_ENDORSEMENT_WRITE');
    }
    if(cancellationQa){
      for(const field of ['publicDetail','directForm','opsSeparate','inheritedContext','editableFields','explicitConfirmation','noDraftWrites'])
        equal(actor.cancellationDraft?.[field],true,'CANCELLATION_DRAFT_'+field);
      equal(actor.cancellationDraft?.status,'SIGNED_PUBLIC_CANCELLATION_DRAFT_READONLY_PASS','CANCELLATION_DRAFT_STATUS');
      if(live){
        for(const field of ['normalUi','successorOnly','serverReadback','reload','idempotentReplay','noReplayWrite','financePreserved','noOpsCreated','policyFieldsPreserved','auditReadback','auditCleanup'])
          equal(actor.cancellationWrite?.[field],true,'CANCELLATION_'+field);
        for(const [field,value] of Object.entries({receiptRows:1,portfolioRows:1,paymentRows:0,commandWrites:1}))
          equal(actor.cancellationWrite?.[field],value,'CANCELLATION_'+field);
      }else equal(actor.cancellationWrite,undefined,'PREVIEW_NO_CANCELLATION_WRITE');
    }else{
      assert.equal(actor.cancellationDraft,undefined,'I66_DIRECT_FORMS_REPORT_UNAUTHORIZED_CANCELLATION_DRAFT');
      assert.equal(actor.cancellationWrite,undefined,'I66_DIRECT_FORMS_REPORT_UNAUTHORIZED_CANCELLATION_WRITE');
    }
  }
  // Actor authorization is separate from the existing 44/66 base and 63/113
  // conditional cancellation checks. The cancellation exercise is unchanged.
  if(paula){
    for(const actor of report.actors)validatePaulaRoleProof(actor,roleAuthority);
    for(const key of ['actorUidSha256','advisorId','tenantId','country','assignedRolesSha256','membershipBeforeSha256','membershipAfterSha256','identityScopeSha256'])
      assert.equal(report.actors[0].roleSelection[key],report.actors[1].roleSelection[key],'I66_DIRECT_FORMS_ROLE_BETWEEN_RUNS_DRIFT');
  }else{
    personalAssert(personalAuthorities.has(personalAuthority),'VALIDATED_CURRENT_AUTHORITY_REQUIRED');
    assert.equal(cancellationQa,personalAuthority.candidate.cancellationQa===true,'I66_DIRECT_FORMS_REPORT_CANCELLATION_CANDIDATE_DRIFT');
    personalAssert(personalAuthority.phase===phase&&personalAuthority.reviewContext.target.sourceSha===sourceSha&&personalAuthority.reviewContext.target.buildId===buildId,'SIGNED_REPORT_CONTEXT_DRIFT');
    validatePersonalLegalProof(report.actors.find(a=>a.role==='operativo').personalLegalAcceptance,personalAuthority);
    personalAssert(report.actors.find(a=>a.role==='direccion').personalLegalAcceptance===undefined,'OTHER_ACTOR_PROOF_FORBIDDEN');
  }
  return {status:'PASS',cleanup:'PASS',checks,phase,...(paula?{profile:PAULA_ROLE_PROFILE}:{}),coverage:cancellationQa?(live?'NORMAL_UI_RENEWAL_ENDORSEMENT_CANCELLATION_READBACK_RELOAD_REPLAY':'PUBLIC_ENTRIES_AND_CANCELLATION_READONLY'):(live?'NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY':'PUBLIC_ENTRIES_READONLY')};
}
async function openDraft(page,entry,source,diagnostic={}){
  assert.ok(['Renovaciones','Cliente360'].includes(entry),'I66_RENEWAL_UNKNOWN_PUBLIC_ENTRY');
  await page.evaluate(x=>{if(x.entry==='Cliente360')Orbit.modules.cliente360.renovar(x.id);else Orbit.modules.renovaciones.registrarAceptacion(x.id);},{entry,id:source.id});
  await clickDirectDecision(page,diagnostic);
  const form=page.locator('#ops-direct-renewal-v1201');
  await form.waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#renewal-direct-approval-v1201').count(),0,'I66_RENEWAL_INTERMEDIATE_FORM_RETURNED');
  for(const [field,value] of Object.entries({num:source.numero,asg:source.aseguradoraId,start:source.vigenciaFin,end:'2027-11-21',prod:source.producto,freq:source.frecuencia,payments:'1',form:source.formaPago,conduct:source.conducto,net:'1000'})){
    const locator=form.locator('#rend-'+field);assert.equal(await locator.inputValue(),value,'I66_RENEWAL_INHERITANCE_'+field);
    assert.equal(await locator.isEditable(),true,'I66_RENEWAL_FIELD_NOT_EDITABLE_'+field);
  }
  await form.locator('#rend-num').fill('QA-EDITABLE-CHECK');
  assert.equal(await page.evaluate(id=>Orbit.store.get('polizas',id).numero,source.id),source.numero,'I66_RENEWAL_DRAFT_MUTATED_SOURCE');
  await form.locator('#rend-num').fill(source.numero);
  return form;
}
const CANCELLATION_FINANCE_COLLECTIONS=Object.freeze(['recibosEsperados','carteraPrimas','cobros','vehiculos','comisiones','finmovs']);
function cancellationPayload(suffix,live){
  assert.match(suffix,/^[a-z0-9_]{8,80}$/,'I66_CANCELLATION_FIXTURE_SUFFIX');
  return {fechaCancelacion:live?'2026-11-24':'2026-11-20',motivoCancelacion:'I6.6 synthetic issued cancellation',
    cancelacionDocumentoRef:'qa-isolated-cancellation-document-'+suffix,referenciaCancelacion:'QA-CAN-'+suffix};
}
async function openCancellationDraft(page,policy,{checkOps=true}={}){
  await page.evaluate(x=>Orbit.router.go('cliente360?c='+encodeURIComponent(x.clienteId)+'&p='+encodeURIComponent(x.id)),policy);
  const detail=page.locator('[data-policy-fullpage]');await detail.waitFor({state:'visible',timeout:10000});
  const direct=detail.locator('[data-policy-cancellation-effective]'),request=detail.locator('[data-policy-cancellation-request]');
  assert.equal(await direct.isVisible(),true,'I66_CANCELLATION_DIRECT_ACTION_MISSING');
  assert.equal(await request.isVisible(),true,'I66_CANCELLATION_OPS_ACTION_MISSING');
  if(checkOps){
    await request.click();const ops=page.locator('#ciclo-modal');await ops.waitFor({state:'visible',timeout:10000});
    for(const [selector,value] of Object.entries({'#mg-cli':policy.clienteId,'#mg-pol':policy.id,'#mg-tipo':'Solicitud de cancelación'}))
      assert.equal(await ops.locator(selector).inputValue(),value,'I66_CANCELLATION_OPS_CONTEXT');
    assert.equal(await page.locator('#policy-v1199').count(),0,'I66_CANCELLATION_OPS_OPENED_DIRECT_FORM');
    await ops.locator('[data-close]').first().click();await ops.waitFor({state:'detached',timeout:10000});
  }
  await direct.click();const form=page.locator('#policy-v1199');await form.waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#ciclo-modal').count(),0,'I66_CANCELLATION_DIRECT_OPENED_OPS');
  for(const [field,value] of Object.entries({policy:policy.numero,term:policy.vigenciaInicio+' → '+policy.vigenciaFin})){
    assert.equal(await form.locator('[data-cancellation-'+field+']').inputValue(),value,'I66_CANCELLATION_CONTEXT');
    assert.equal(await form.locator('[data-cancellation-'+field+']').isEditable(),false,'I66_CANCELLATION_CONTEXT_MUTABLE');
  }
  for(const [field,key] of Object.entries({date:'fechaCancelacion',reason:'motivoCancelacion',reference:'referenciaCancelacion',document:'cancelacionDocumentoRef'})){
    const locator=form.locator('[data-cancellation-'+field+']');
    assert.equal(await locator.inputValue(),policy[key]||'','I66_CANCELLATION_INHERITED_FIELD');
    assert.equal(await locator.isEditable(),true,'I66_CANCELLATION_FIELD_NOT_EDITABLE');
  }
  assert.equal(await form.locator('[data-cancellation-confirmed]').isChecked(),false,'I66_CANCELLATION_SILENT_CONFIRMATION');
  return form;
}
async function fillCancellationDraft(form,payload){
  for(const [field,key] of Object.entries({date:'fechaCancelacion',reason:'motivoCancelacion',reference:'referenciaCancelacion',document:'cancelacionDocumentoRef'}))
    await form.locator('[data-cancellation-'+field+']').fill(payload[key]);
}
async function exerciseCancellationDraft({page,policy,payload,writeCalls,collection,item,ids}){
  await waitForBusinessIdle(page);
  const beforeWrites=writeCalls.length,beforePolicy=cancellationSnapshot(await item('polizas',policy.id).get());
  const beforeState=await cancellationPreservationSnapshot(collection,ids,policy.id);
  const form=await openCancellationDraft(page,policy);await fillCancellationDraft(form,payload);
  // The required personal document confirmation remains unchecked in a draft.
  // Pressing the ordinary save button must stop locally before any command.
  await form.locator('[data-save]').click();await form.locator('[data-error]').waitFor({state:'visible',timeout:10000});
  assert.match(await form.locator('[data-error]').textContent(),/Confirma que la cancelación ya fue emitida/,'I66_CANCELLATION_CONFIRMATION_NOT_REQUIRED');
  await waitForBusinessIdle(page);assert.equal(writeCalls.length,beforeWrites,'I66_CANCELLATION_DRAFT_SENT_WRITE');
  assert.deepEqual(cancellationSnapshot(await item('polizas',policy.id).get()),beforePolicy,'I66_CANCELLATION_DRAFT_CHANGED_POLICY');
  assert.deepEqual(await cancellationPreservationSnapshot(collection,ids,policy.id),beforeState,'I66_CANCELLATION_DRAFT_CHANGED_RELATIONS');
  return {form,beforePolicy,beforeState,proof:{publicDetail:true,directForm:true,opsSeparate:true,inheritedContext:true,editableFields:true,
    explicitConfirmation:true,noDraftWrites:true,status:'SIGNED_PUBLIC_CANCELLATION_DRAFT_READONLY_PASS'}};
}
function cancellationSnapshot(snapshot){
  assert.ok(snapshot.exists&&snapshot.updateTime,'I66_CANCELLATION_SNAPSHOT_REQUIRED');
  assert.ok(Number.isSafeInteger(snapshot.updateTime.seconds)&&Number.isSafeInteger(snapshot.updateTime.nanoseconds),'I66_CANCELLATION_SNAPSHOT_VERSION_REQUIRED');
  return {id:snapshot.id,data:snapshot.data(),version:{seconds:snapshot.updateTime.seconds,nanoseconds:snapshot.updateTime.nanoseconds}};
}
async function cancellationPreservationSnapshot(collection,ids,policyId){
  const names=[...CANCELLATION_FINANCE_COLLECTIONS,'gestiones'];
  return Object.fromEntries(await Promise.all(names.map(async name=>{
    const snap=await collection(name).where(name==='gestiones'?'clienteId':'polizaId','==',name==='gestiones'?ids.client:policyId).limit(30).get();
    assert.ok(snap.size<30,'I66_CANCELLATION_PRESERVATION_BOUND');
    return [name,snap.docs.map(cancellationSnapshot).sort((a,b)=>a.id.localeCompare(b.id))];
  })));
}
function cancellationCommandIdentity(input,{ids,policyId,actor,payload}){
  assert.deepEqual(Object.keys(input||{}).sort(),['tenantId','activeRole','requestId','mutations'].sort(),'I66_CANCELLATION_COMMAND_SHAPE');
  assert.equal(input.tenantId,TENANT);assert.equal(norm(input.activeRole),actor.role);
  assert.match(input.requestId||'',/^polcan_[a-z0-9]+_[a-z0-9]{5}$/,'I66_CANCELLATION_REQUEST_ID');
  assert.match(policyId||'',/^pol_/,'I66_CANCELLATION_SUCCESSOR_REQUIRED');
  assert.match(ids.client||'',/^b4003qa_renew_/,'I66_CANCELLATION_SYNTHETIC_CLIENT_REQUIRED');
  assert.equal(input.mutations?.length,2,'I66_CANCELLATION_MUTATION_COUNT');
  for(const mutation of input.mutations)assert.deepEqual(Object.keys(mutation).sort(),['action','collection','id','payload'].sort(),'I66_CANCELLATION_MUTATION_SHAPE');
  const [policy,activity]=input.mutations;
  assert.deepEqual(policy,{action:'update',collection:'polizas',id:policyId,payload:{estado:'Cancelada',...payload}},'I66_CANCELLATION_SPARSE_POLICY_CONTRACT');
  assert.equal(activity.action,'insert');assert.equal(activity.collection,'actividades');
  assert.equal(activity.id,'act_'+input.requestId);assert.equal(activity.payload?.id,activity.id);
  for(const [key,value] of Object.entries({tenantId:TENANT,clienteId:ids.client,polizaId:policyId,pais:'GT',operacionId:input.requestId,tipo:'poliza',ownerUid:actor.uid}))
    assert.equal(activity.payload[key],value,'I66_CANCELLATION_ACTIVITY_IDENTITY');
  return {requestId:input.requestId,eventId:'opevt_'+personalHash(TENANT+'|'+input.requestId).slice(0,28),activityId:activity.id,
    policyId,clientId:ids.client,uid:actor.uid,role:actor.role,payloadDigest:personalDigest(input.mutations),
    policyPatch:JSON.parse(JSON.stringify(policy.payload)),activityPayload:JSON.parse(JSON.stringify(activity.payload))};
}
function assertCancellationAudit(kind,row,identity){
  assert.ok(identity&&/^polcan_[a-z0-9]+_[a-z0-9]{5}$/.test(identity.requestId),'I66_CANCELLATION_KNOWN_REQUEST_REQUIRED');
  assert.equal(row?.payloadDigest,identity.payloadDigest,'I66_CANCELLATION_AUDIT_PAYLOAD_DRIFT');
  if(kind==='request'){
    assert.equal(row.status,'committed');assert.equal(row.result?.ok,true);assert.equal(row.result?.serverOwned,true);
    assert.equal(row.result?.requestId,identity.requestId);assert.equal(row.result?.eventId,identity.eventId);
    assert.equal(row.result?.mutationCount,2);assert.deepEqual(row.result?.collections,['polizas','actividades']);
  }else{
    assert.equal(kind,'event');assert.equal(row.tenantId,TENANT);assert.equal(row.actorUid,identity.uid);assert.equal(norm(row.activeRole),identity.role);
    assert.equal(row.requestId,identity.requestId);assert.equal(row.eventId,identity.eventId);assert.equal(row.mutationCount,2);
    assert.deepEqual(row.collections,['polizas','actividades']);assert.equal(row.containsSecrets,false);
  }
}
function assertCancellationActivity(row,identity){
  for(const [key,value] of Object.entries({id:identity.activityId,tenantId:TENANT,clienteId:identity.clientId,polizaId:identity.policyId,
    operacionId:identity.requestId,createdByUid:identity.uid,updatedByUid:identity.uid,tipo:'poliza'}))
    assert.equal(row?.[key],value,'I66_CANCELLATION_ACTIVITY_RESTORE_IDENTITY');
  for(const key of ['titulo','detalle','fecha','ownerUid'])assert.equal(row[key],identity.activityPayload[key],'I66_CANCELLATION_ACTIVITY_PAYLOAD_DRIFT');
}
function assertCancellationPolicy(before,after,payload,uid){
  for(const [key,value] of Object.entries({estado:'Cancelada',...payload,updatedByUid:uid}))assert.equal(after?.[key],value,'I66_CANCELLATION_POLICY_READBACK');
  const allowed=new Set(['estado',...Object.keys(payload),'updatedAt','updatedByUid']);
  const preserve=row=>Object.fromEntries(Object.entries(row||{}).filter(([key])=>!allowed.has(key)));
  assert.deepEqual(preserve(after),preserve(before),'I66_CANCELLATION_POLICY_UNRELATED_DRIFT');
}
async function cancellationAuditSnapshots(tenant,item,identity){
  const refs=[['activity',item('actividades',identity.activityId)],['request',tenant.collection('operationalRequests').doc(identity.requestId)],
    ['event',tenant.collection('operationalEvents').doc(identity.eventId)]];
  return Promise.all(refs.map(async([kind,ref])=>({kind,snapshot:await ref.get()})));
}
function validateCancellationAuditSnapshots(entries,identity,{allowAbsent=false}={}){
  assert.deepEqual(entries.map(x=>x.kind),['activity','request','event'],'I66_CANCELLATION_AUDIT_SET');
  if(allowAbsent&&entries.every(x=>!x.snapshot.exists))return false;
  for(const {kind,snapshot} of entries){
    assert.ok(snapshot.exists,'I66_CANCELLATION_ATOMIC_AUDIT_MISSING');
    assert.equal(snapshot.id,kind==='activity'?identity.activityId:kind==='request'?identity.requestId:identity.eventId,'I66_CANCELLATION_AUDIT_DOCUMENT_ID');
    if(kind==='activity')assertCancellationActivity(snapshot.data(),identity);else assertCancellationAudit(kind,snapshot.data(),identity);
  }
  return true;
}
async function restoreCancellationAudit(tenant,item,identity){
  // Only the three IDs observed from this real UI command may be removed. All
  // identities are checked together before any version-conditional deletion.
  const entries=await cancellationAuditSnapshots(tenant,item,identity);
  if(!validateCancellationAuditSnapshots(entries,identity,{allowAbsent:true}))return;
  for(const {kind,snapshot} of entries)await deleteSnapshotAfterCheck(snapshot,row=>kind==='activity'?assertCancellationActivity(row,identity):assertCancellationAudit(kind,row,identity));
  assert.ok((await cancellationAuditSnapshots(tenant,item,identity)).every(x=>!x.snapshot.exists),'I66_CANCELLATION_AUDIT_RESTORE_INCOMPLETE');
}
async function main(){
  const cfg=configuration(),admin=require('firebase-admin'),{chromium}=require('playwright');
  const credential=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean).map(x=>{try{return JSON.parse(x);}catch{return null;}})
    .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
  assert.ok(credential,'I66_RENEWAL_SIGNED_AUTHORITY_MISSING');
  admin.initializeApp({credential:admin.credential.cert(credential),projectId:'ays-orbit-360-lab'});
  const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
  const collection=c=>tenant.collection('data').doc(c).collection('items'),item=(c,id)=>collection(c).doc(id);
  const suffix=Date.now().toString(36)+'_'+crypto.randomBytes(4).toString('hex');
  const report={schema:'I66_DIRECT_RENEWAL_ISSUED_ENDORSEMENT_SIGNED_UI_V1',phase:cfg.phase,sourceSha:cfg.source,
    status:'RUNNING',realCustomerWrites:0,externalMessages:0,actors:[],restoreComplete:false,...(cfg.cancellationQa?{cancellationQa:true}:{}),...(cfg.qaProfile?{profile:cfg.qaProfile}:{})};
  let browser;
  try{
    const marker=await fetch(cfg.origin+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
    assert.equal(marker.sourceSha,cfg.source,'I66_RENEWAL_EXACT_ARTIFACT_DRIFT');report.buildId=marker.buildId;
    assert.equal(JSON.parse(fs.readFileSync(path.join(cfg.packageRoot,'bundle/site/__recovery__/build.json'))).sourceSha,cfg.source,'I66_RENEWAL_PACKAGE_SOURCE_DRIFT');
    if(cfg.live)assertNoOutboundChannels((await tenant.collection('config').doc('workflow').get()).data());
    const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),collection('asesores').limit(400).get()]);
    assert.ok(members.size<150&&advisors.size<400,'I66_RENEWAL_STAFF_BOUND');
    const resolve=(predicate,role)=>{
      const ids=new Set(),uids=new Set();
      for(const d of advisors.docs){const a=d.data()||{};if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(x=>predicate(norm(x)))){
        ids.add(d.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(x=>uids.add(String(x)));}}
      const matches=members.docs.filter(d=>{const x=d.data()||{};return(
        [x.nombre,x.displayName,x.name,x.nombreCompleto,x.fullName].some(v=>predicate(norm(v)))||
        ids.has(String(x.advisorId||x.asesorId||''))||uids.has(d.id))&&norm(x.activeRole)===role&&x.active!==false&&x.activo!==false&&
        ['active','activo'].includes(norm(x.status||x.estado))&&[].concat(x.countries||x.paises||[]).map(v=>String(v).toUpperCase()).includes('GT');});
      assert.equal(matches.length,1,'I66_RENEWAL_STAFF_AMBIGUOUS_'+role);
      const row=matches[0].data()||{};return {uid:matches[0].id,advisorId:row.advisorId||row.asesorId||'',role};
    };
    const roleAuthority=cfg.qaProfile===PAULA_ROLE_PROFILE?readCurrentPaulaRoleAuthority({cfg}):null;
    const actors=roleAuthority?resolvePaulaAssignedActors(members.docs.map(d=>({uid:d.id,data:d.data()})),roleAuthority):
      [resolve(x=>x.startsWith('carlos castro'),'operativo'),resolve(x=>x.includes('paula')&&x.includes('osorio'),'direccion')];
    // Validate the exact current authority before fixtures or sessions. Paula's
    // assigned-role profile never reads or substitutes Carlos's personal grant.
    const personalAuthority=roleAuthority?null:readCurrentPersonalLegalAuthority({cfg,actor:actors[0]});
    assert.equal(cfg.cancellationQa===true,(roleAuthority||personalAuthority).candidate.cancellationQa===true,'I66_CANCELLATION_CANDIDATE_PROFILE_DRIFT');
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    for(const actor of actors){
      const fx=fixtures(actor.role,suffix),{ids}=fx,seeds=[],context=await browser.newContext({viewport:{width:1280,height:900}});
      const result={role:actor.role,entries:[],endorsementDraft:false,readonly:!cfg.live,writes:cfg.live?'PENDING':'NOT_EXECUTED_PREVIEW_RELATIONS_PROTECTED',restored:false};
      report.actors.push(result);let outcome='',renewalManagement='',endorsementManagement='',page=null,adapterReady=false;
      const errors=[],writeCalls=[];let stage='SEED',cancellationCommand=null,cancellationCaptureError=null;
      try{
        for(const [c,id,row] of fx.rows){assert.equal((await item(c,id).get()).exists,false,'I66_RENEWAL_QA_FIXTURE_COLLISION');await item(c,id).create(row);seeds.push([c,id,row]);}
        const user=await auth.getUser(actor.uid);assert.ok(!user.disabled&&user.emailVerified);
        const token=await auth.createCustomToken(actor.uid);page=await context.newPage();
        page.on('pageerror',()=>errors.push('PAGE_ERROR'));
        page.on('request',request=>{
          if(request.method()==='POST'&&/\/orbit360(?:OpsLeadsCommand|ProductOperationalCommand|CobrosReconciliationCommand)(?:Preview)?(?:\?|$)/.test(request.url()))writeCalls.push('BUSINESS_COMMAND');
          if(cfg.cancellationQa&&stage==='EFFECTIVE_CANCELLATION_SAVE'&&request.method()==='POST'&&/\/orbit360ProductOperationalCommand(?:\?|$)/.test(request.url())){
            try{
              assert.equal(cancellationCommand,null,'I66_CANCELLATION_DUPLICATE_COMMAND');
              cancellationCommand=cancellationCommandIdentity(request.postDataJSON()?.data,{ids,policyId:outcome,actor,payload:cancellationPayload(suffix,true)});
            }catch(error){cancellationCaptureError=error;}
          }
        });
        stage='SIGNED_SESSION';await page.goto(cfg.origin+'/#/inicio',{waitUntil:'commit',timeout:30000});
        await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
        const session=await page.evaluate(async token=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
          await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);await c.modules.auth.signInWithCustomToken(c.auth,token);
          const result=await Orbit.productAppP0.activate();return {started:result?.started===true,role:Orbit.session?.rol?.(),preview:p.isI66PreviewHost(),canRenew:Orbit.access?.can('renovaciones','edit'),canIssue:Orbit.issuance?.canManage?.()};},token);
        assert.ok(session.started&&session.preview===!cfg.live&&norm(session.role)===(roleAuthority?'direccion':actor.role)&&session.canRenew&&session.canIssue,'I66_RENEWAL_SIGNED_ROLE_DENIED');
        adapterReady=true;
        if(!roleAuthority&&actor.role==='operativo'){
          stage='PERSONAL_LEGAL_NORMAL_UI';
          result.personalLegalAcceptance=await applyPersonalLegalUi({page,actor,cfg,authority:personalAuthority});
        }
        if(roleAuthority||actor.role==='direccion'){
          stage='DIRECTION_EXISTING_LEGAL_SCOPE';
          const legal=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs'),legalActor=roleAuthority?{...actor,role:'direccion'}:actor;
          const proof=cfg.live?await legal.acceptDirectionLiveLegal({page,actor:legalActor,cfg}):await legal.acceptDirectionPreviewLegal({page,actor:legalActor,cfg});
          if(roleAuthority){
            result.directionLegalAcceptance=proof;stage='PAULA_ASSIGNED_ROLE_SELECTION';
            result.roleSelection=await selectPaulaAssignedRole({page,actor,authority:roleAuthority,directionLegalAcceptance:proof});
          }
        }
        stage='EXISTING_LEGAL_READINESS';
        result.legalReadiness=await requireExistingLegalReadiness(page);
        stage='PROTECTED_HYDRATION';
        const denied=await page.evaluate(async id=>Orbit.issuance.createDirectRenewal(id,{}, {operationId:'qa_missing_management_readonly'}),'b4003qa_missing_'+suffix);
        assert.ok([].concat(denied.errors||[]).includes('gestion_renovacion_aceptada_no_encontrada'),'I66_RENEWAL_MISSING_MANAGEMENT_NOT_FAIL_CLOSED');
        await page.evaluate(()=>Orbit.store._ensureCollections(['gestiones','polizas','vehiculos','clientes','aseguradoras']));
        await page.waitForFunction(x=>!!Orbit.store.get('polizas',x.source)&&!!Orbit.store.get('clientes',x.client)&&!!Orbit.store.get('aseguradoras',x.insurer),ids,{timeout:30000});
        const life=await page.evaluate(id=>{Orbit.renewalLifecycle.invalidate();return Orbit.renewalLifecycle.evaluate(Orbit.store.get('polizas',id));},ids.source);
        assert.equal(life.reason,'RENOVABILIDAD_SIN_CONFIRMAR');assert.ok(life.days<0&&life.reviewOnly&&life.bucketEligible);
        const beforeWrites=writeCalls.length;
        stage='BOTH_PUBLIC_RENEWAL_ENTRIES';
        for(const entry of ['Renovaciones','Cliente360']){
          const diagnostic={};result.clickDiagnostic=diagnostic;
          const form=await openDraft(page,entry,fx.source,diagnostic);
          await form.locator('[data-create]').click();
          assert.equal(await collection('gestiones').where('clienteId','==',ids.client).limit(1).get().then(x=>x.size),0,'I66_RENEWAL_UNCONFIRMED_DRAFT_CREATED_MANAGEMENT');
          await form.locator('[data-close]').first().click();
          result.entries.push({entry,expiredUnknown:true,inheritedEditable:true,noIntermediateOps:true,noDraftWrites:true});
        }
        stage='ISSUED_BENEFICIARY_ENDORSEMENT_DRAFT';
        await page.evaluate(id=>Orbit.modules.cliente360.endoso(id),ids.source);
        const end=page.locator('#endorsement-request-v1201');await end.locator('#end-type').selectOption('beneficiarios');
        assert.equal(await end.locator('[data-direct]').isVisible(),true,'I66_ENDORSEMENT_DIRECT_BENEFICIARY_ACTION_MISSING');
        assert.equal(await end.locator('#end-benef').inputValue(),'Persona QA vigente','I66_ENDORSEMENT_BENEFICIARIES_NOT_INHERITED');
        assert.equal(await end.locator('#end-benef').isEditable(),true);
        await end.locator('[data-direct]').click();
        assert.equal((await collection('gestiones').where('clienteId','==',ids.client).limit(1).get()).size,0,'I66_ENDORSEMENT_MISSING_SUPPORT_CREATED_REQUEST');
        result.endorsementDraft=true;
        assert.equal(writeCalls.length,beforeWrites,'I66_DRAFT_SENT_BUSINESS_WRITE');
        if(!cfg.live){
          await end.locator('[data-close]').first().click();
          if(cfg.cancellationQa){
            stage='EFFECTIVE_CANCELLATION_DRAFT';
            const draft=await exerciseCancellationDraft({page,policy:fx.source,payload:cancellationPayload(suffix,false),writeCalls,collection,item,ids});
            result.cancellationDraft=draft.proof;await draft.form.locator('[data-close]').first().click();
          }
          for(const [c,id,row] of seeds)assert.deepEqual((await item(c,id).get()).data(),row,'I66_PREVIEW_DRAFT_SEED_CHANGED');
          assert.deepEqual(errors,[],'I66_RENEWAL_PAGE_ERRORS');result.pageErrorCount=0;
          result.readonly=true;result.status='SIGNED_PREVIEW_ENTRIES_READONLY_PASS';
          continue;
        }
        stage='ISSUED_ENDORSEMENT_SAVE';
        assertNoOutboundChannels((await tenant.collection('config').doc('workflow').get()).data());
        await end.locator('#end-benef').fill('Persona QA ajustada');
        await end.locator('#end-doc').fill('qa-isolated-endorsement-document-'+suffix);
        await end.locator('#end-note').fill('I6.6 synthetic issued beneficiary change');
        await end.locator('#end-direct-ref').fill('QA-END-'+suffix);
        await end.locator('#end-direct-date').fill('2026-11-24');
        await end.locator('[data-direct]').click();
        await end.waitFor({state:'detached',timeout:30000});
        const appliedSource=(await item('polizas',ids.source).get()).data();endorsementManagement=appliedSource?.ultimoEndosoId||'';
        assert.ok(endorsementManagement);assert.deepEqual(appliedSource.beneficiarios,['Persona QA ajustada']);
        assert.equal((await item('gestiones',endorsementManagement).get()).data()?.endorsementStage,'APLICADO');
        result.endorsementWrite={normalUi:true,policyReadback:true,closedManagement:true};
        stage='DIRECT_RENEWAL_SAVE';
        // Close the read-only policy detail opened by the canonical success path.
        const close=page.locator('#vp-x');if(await close.count())await close.click();
        result.clickDiagnostic={};
        const entry=actor.role==='operativo'?'Renovaciones':'Cliente360',form=await openDraft(page,entry,fx.source,result.clickDiagnostic);
        await form.locator('#rend-approval-confirm').check();
        await form.locator('#rend-approval-note').fill('I6.6 synthetic client approval');
        await form.locator('#rend-doc').fill('qa-isolated-placeholder-not-real-insurer-doc-'+suffix);
        await form.locator('#rend-num').fill('QA-NEW-'+suffix);
        await form.locator('#rend-net').fill('1200');
        assertNoOutboundChannels((await tenant.collection('config').doc('workflow').get()).data());
        await form.locator('[data-create]').click();
        await form.waitFor({state:'detached',timeout:30000});
        outcome=(await item('polizas',ids.source).get()).data()?.renovadaPor||'';assert.ok(outcome.startsWith('pol_'),'I66_RENEWAL_SUCCESSOR_MISSING');
        const [policy,gestions,receipts,portfolio]=await Promise.all([item('polizas',outcome).get(),
          collection('gestiones').where('clienteId','==',ids.client).limit(10).get(),collection('recibosEsperados').where('polizaId','==',outcome).limit(25).get(),
          collection('carteraPrimas').where('polizaId','==',outcome).limit(25).get()]);
        const accepted=gestions.docs.filter(d=>d.data()?.workflowType==='renewal_accepted');assert.equal(accepted.length,1);renewalManagement=accepted[0].id;
        assert.equal(accepted[0].data().directRenewalPolicyId,outcome);assert.equal(accepted[0].data().estado,'Resuelta');
        assert.equal(policy.data()?.clienteId,ids.client);assert.equal(policy.data()?.renuevaDe,ids.source);assert.equal(policy.data()?.primaNeta,1200);
        assert.equal(receipts.size,1);assert.equal(portfolio.size,1);assert.equal(portfolio.docs[0].data()?.reciboId,receipts.docs[0].id);
        assert.equal((await item('polizas',ids.source).get()).data()?.renovable,null,'I66_RENEWAL_SILENT_CLASSIFICATION_WRITE');
        const note='I6.6 signed normal policy edit '+suffix;
        await page.evaluate(async x=>Orbit.store.updateDurable('polizas',x.id,{observaciones:x.note}),{id:outcome,note});
        assert.equal((await item('polizas',outcome).get()).data()?.updatedByUid,actor.uid,'I66_RENEWAL_MANUAL_EDIT_ACTOR_MISSING');
        const replay=await page.evaluate(async x=>({renewal:await Orbit.issuance.createDirectRenewal(x.renewal,{}),endorsement:await Orbit.endorsements.apply(x.endorsement,{})}),
          {renewal:renewalManagement,endorsement:endorsementManagement});
        assert.ok(replay.renewal?.alreadyCreated&&replay.renewal.policy.id===outcome);assert.ok(replay.endorsement?.alreadyApplied);
        await waitForBusinessIdle(page);
        assert.equal(await page.evaluate(()=>Orbit.store._operationalWriteStatus().failed),0,'I66_RENEWAL_BACKGROUND_WRITE_FAILED');
        stage='RELOAD_READBACK';await page.reload({waitUntil:'commit',timeout:30000});
        await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
        await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();await p.waitForUser();await Orbit.productAppP0.activate();await Orbit.store._ensureCollections(['gestiones','polizas','recibosEsperados','carteraPrimas']);});
        await page.waitForFunction(x=>Orbit.store.get('polizas',x.policy)?.renuevaDe===x.source&&Orbit.store.get('polizas',x.policy)?.observaciones===x.note&&
          JSON.stringify(Orbit.store.get('polizas',x.source)?.beneficiarios)===JSON.stringify(['Persona QA ajustada'])&&
          Orbit.store.get('gestiones',x.renewal)?.directRenewalPolicyId===x.policy&&Orbit.store.get('gestiones',x.endorsement)?.endorsementStage==='APLICADO',
          {policy:outcome,source:ids.source,renewal:renewalManagement,endorsement:endorsementManagement,note},{timeout:30000});
        assert.deepEqual(errors,[],'I66_RENEWAL_PAGE_ERRORS');
        if(roleAuthority){
          validatePaulaRuntime(await readPaulaRuntimeSnapshot(page),actor,actor.role);
          result.roleSelection.reloadIdentityChecks++;
        }
        result.pageErrorCount=0;Object.assign(result.endorsementWrite,{reload:true,idempotentReplay:true});
        result.writes={normalUi:true,entry,successors:1,receipts:1,portfolio:1,linkedManagement:true,reload:true,idempotentReplay:true};
        if(cfg.cancellationQa){
          stage='EFFECTIVE_CANCELLATION_DRAFT';
          await requireExistingLegalReadiness(page);
          const policyBefore=(await item('polizas',outcome).get()).data(),payload=cancellationPayload(suffix,true);
          assert.equal(policyBefore.renuevaDe,ids.source,'I66_CANCELLATION_SUCCESSOR_LINEAGE');
          assert.ok(policyBefore.vigenciaInicio<=payload.fechaCancelacion&&payload.fechaCancelacion<=policyBefore.vigenciaFin,'I66_CANCELLATION_DATE_OUTSIDE_SUCCESSOR');
          const draft=await exerciseCancellationDraft({page,policy:policyBefore,payload,writeCalls,collection,item,ids});
          result.cancellationDraft=draft.proof;
          assert.equal(draft.beforeState.recibosEsperados.length,1);assert.equal(draft.beforeState.carteraPrimas.length,1);
          // This fixture has no payment; the report states zero, and must not
          // imply that a paid-policy signed scenario was exercised.
          assert.equal(draft.beforeState.cobros.length,0);
          assertNoOutboundChannels((await tenant.collection('config').doc('workflow').get()).data());
          const beforeCancelWrites=writeCalls.length;
          stage='EFFECTIVE_CANCELLATION_SAVE';await draft.form.locator('[data-cancellation-confirmed]').check();
          await draft.form.locator('[data-save]').click();await draft.form.waitFor({state:'detached',timeout:30000});
          await waitForBusinessIdle(page);if(cancellationCaptureError)throw cancellationCaptureError;
          assert.ok(cancellationCommand,'I66_CANCELLATION_COMMAND_NOT_OBSERVED');
          assert.equal(writeCalls.length-beforeCancelWrites,1,'I66_CANCELLATION_UNEXPECTED_BUSINESS_WRITES');
          const policyAfter=cancellationSnapshot(await item('polizas',outcome).get());
          assertCancellationPolicy(draft.beforePolicy.data,policyAfter.data,payload,actor.uid);
          assert.deepEqual(await cancellationPreservationSnapshot(collection,ids,outcome),draft.beforeState,'I66_CANCELLATION_FINANCE_OR_OPS_CHANGED');
          const audits=await cancellationAuditSnapshots(tenant,item,cancellationCommand);validateCancellationAuditSnapshots(audits,cancellationCommand);
          const auditProof=audits.map(x=>({kind:x.kind,snapshot:cancellationSnapshot(x.snapshot)}));
          stage='EFFECTIVE_CANCELLATION_RELOAD_REPLAY';await page.reload({waitUntil:'commit',timeout:30000});
          await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
          await page.evaluate(async()=>{const p=Orbit.productRuntimeBrowserProvidersP0;await p.initialize();await p.waitForUser();await Orbit.productAppP0.activate();
            await Orbit.store._ensureCollections(['polizas','clientes','aseguradoras','gestiones','recibosEsperados','carteraPrimas','cobros']);});
          await requireExistingLegalReadiness(page);
          if(roleAuthority){
            validatePaulaRuntime(await readPaulaRuntimeSnapshot(page),actor,actor.role);
            result.roleSelection.reloadIdentityChecks++;
          }
          await page.waitForFunction(x=>{const p=Orbit.store.get('polizas',x.id);return p?.estado==='Cancelada'&&Object.keys(x.payload).every(k=>p[k]===x.payload[k]);},
            {id:outcome,payload},{timeout:30000});
          const replayForm=await openCancellationDraft(page,policyAfter.data,{checkOps:false});
          await replayForm.locator('[data-cancellation-confirmed]').check();await replayForm.locator('[data-save]').click();
          await replayForm.locator('[data-error]').waitFor({state:'visible',timeout:10000});
          assert.match(await replayForm.locator('[data-error]').textContent(),/La póliza ya muestra esta cancelación/,'I66_CANCELLATION_REPLAY_NOT_IDEMPOTENT');
          await waitForBusinessIdle(page);assert.equal(writeCalls.length-beforeCancelWrites,1,'I66_CANCELLATION_REPLAY_SENT_WRITE');
          assert.deepEqual(cancellationSnapshot(await item('polizas',outcome).get()),policyAfter,'I66_CANCELLATION_REPLAY_CHANGED_POLICY');
          assert.deepEqual(await cancellationPreservationSnapshot(collection,ids,outcome),draft.beforeState,'I66_CANCELLATION_REPLAY_CHANGED_FINANCE_OR_OPS');
          assert.deepEqual((await cancellationAuditSnapshots(tenant,item,cancellationCommand)).map(x=>({kind:x.kind,snapshot:cancellationSnapshot(x.snapshot)})),auditProof,
            'I66_CANCELLATION_REPLAY_CHANGED_AUDIT');
          await replayForm.locator('[data-close]').first().click();
          assert.deepEqual(errors,[],'I66_CANCELLATION_PAGE_ERRORS');assert.equal(await page.evaluate(()=>Orbit.store._operationalWriteStatus().failed),0,'I66_CANCELLATION_BACKGROUND_WRITE_FAILED');
          result.cancellationWrite={normalUi:true,successorOnly:true,serverReadback:true,reload:true,idempotentReplay:true,noReplayWrite:true,
            financePreserved:true,noOpsCreated:true,policyFieldsPreserved:true,auditReadback:true,auditCleanup:false,
            receiptRows:1,portfolioRows:1,paymentRows:0,commandWrites:1};
        }
        result.status='SIGNED_LIVE_NORMAL_UI_SAVE_READBACK_RELOAD_REPLAY_PASS';
      }catch(error){
        result.failureStage=stage;result.status='HOLD';result.failureCode=safeDirectFormsFailureCode(error);
        // Preserve actionability before settleAndClose destroys the signed DOM.
        if(page)result.failureUi=await captureDirectFormsSnapshot(page);
        console.log('I66_DIRECT_FORMS_UI_DIAGNOSTIC '+JSON.stringify(safeDirectFormsDiagnosticReport(report)));
        throw error;
      }
      finally{
        const cleanupErrors=[];
        try{
          await settleAndClose(context,page,adapterReady);
          if(cancellationCaptureError)throw cancellationCaptureError;
          if(cancellationCommand){
            await restoreCancellationAudit(tenant,item,cancellationCommand);
            if(result.cancellationWrite)result.cancellationWrite.auditCleanup=true;
          }
          const [policies,managements]=await Promise.all([collection('polizas').where('clienteId','==',ids.client).limit(10).get(),collection('gestiones').where('clienteId','==',ids.client).limit(10).get()]);
          assert.ok(policies.size<10&&managements.size<10);
          const policyIds=new Set(policies.docs.filter(d=>d.id===ids.source||d.data()?.renuevaDe===ids.source).map(d=>d.id));
          const managementIds=new Set(managements.docs.filter(d=>d.data()?.polizaId===ids.source&&['renewal_accepted','endorsement_request'].includes(d.data()?.workflowType)).map(d=>d.id));
          const operationIds=new Set([...policies.docs,...managements.docs].flatMap(d=>[d.data()?.operationId,d.data()?.operacionId,d.data()?.renewalOperationId].filter(Boolean)));
          for(const c of ['actividades','vehiculos','carteraPrimas','recibosEsperados','polizas','gestiones']){
            const snap=await collection(c).where('clienteId','==',ids.client).limit(70).get();assert.ok(snap.size<70,'I66_RENEWAL_RESTORE_UNBOUNDED');
            for(const doc of snap.docs)await deleteSnapshotAfterCheck(doc,row=>{assert.equal(row.id,doc.id,'I66_RENEWAL_RESTORE_DOCUMENT_ID');assertGeneratedRow(c,row,{ids,policyIds,managementIds,operationIds,uid:actor.uid});});
            assert.equal((await collection(c).where('clienteId','==',ids.client).limit(1).get()).size,0);
          }
          for(const id of managementIds)for(const c of ['workflowRequests','workflowEvents','notificationOutbox','previewWorkflowRequests','previewWorkflowEvents','previewNotificationOutbox']){
            const snap=await tenant.collection(c).where('entityId','==',id).limit(30).get();assert.ok(snap.size<30,'I66_RENEWAL_RESTORE_AUDIT_UNBOUNDED');
            for(const doc of snap.docs)await deleteSnapshotAfterCheck(doc,row=>{assert.equal(row.entityId,id);if(c.toLowerCase().includes('outbox'))assertNoOutboundChannels({notificationChannels:row.channels});});
          }
        }catch(e){cleanupErrors.push(String(e.message||e).slice(0,100));}
        for(const [c,id,row] of (cleanupErrors.length?[]:seeds.filter(x=>x[0]!=='polizas')))try{
          const snap=await item(c,id).get();if(snap.exists)await deleteSnapshotAfterCheck(snap,current=>assertSeedRestore(c,current,row,{live:cfg.live,uid:actor.uid}));
          assert.equal((await item(c,id).get()).exists,false);
        }catch(e){cleanupErrors.push(String(e.message||e).slice(0,100));}
        if(roleAuthority)try{
          const membership=await tenant.collection('members').doc(actor.uid).get();
          assert.equal(membership.exists,true,'I66_DIRECT_FORMS_ROLE_MEMBERSHIP_MISSING');
          assert.equal(personalDigest(membership.data()),actor.membershipSha256,'I66_DIRECT_FORMS_ROLE_MEMBERSHIP_CHANGED');
          if(result.roleSelection)result.roleSelection.membershipAfterSha256=actor.membershipSha256;
        }catch(e){cleanupErrors.push('I66_DIRECT_FORMS_ROLE_MEMBERSHIP_CHANGED');}
        result.restored=cleanupErrors.length===0;
        if(cleanupErrors.length)throw Error('I66_RENEWAL_SYNTHETIC_RESTORE_HOLD:'+cleanupErrors.join(','));
        console.log('I66_'+cfg.phase+'_'+actor.role.toUpperCase()+'_DIRECT_FORMS_SYNTHETIC_RESTORED');
      }
    }
    report.restoreComplete=report.actors.every(a=>a.restored);
    assert.equal(report.actors.length,2);assert.ok(report.restoreComplete);
    report.status=cfg.live?'SIGNED_LIVE_DIRECT_FORMS_NORMAL_UI_PASS':'SIGNED_PREVIEW_DIRECT_FORMS_READONLY_PASS';
    validateSignedReport(report,{phase:cfg.phase,sourceSha:cfg.source,buildId:report.buildId,
      ...(roleAuthority?{roleAuthority:readCurrentPaulaRoleAuthority({cfg})}:{personalAuthority:readCurrentPersonalLegalAuthority({cfg,actor:actors[0]})}),cancellationQa:cfg.cancellationQa===true});
    console.log(report.status+' real_customer_writes=0 external_messages=0 genuine_insurer_document_gate_NOT_CERTIFIED');
  }catch(error){report.status='HOLD';report.failureCode=safeDirectFormsFailureCode(error);throw error;}
  finally{
    const output=path.join(process.env.RUNNER_TEMP||cfg.packageRoot,'gi-i66-direct-forms-'+cfg.phase.toLowerCase()+'.json');
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    if(browser)await browser.close();await admin.app().delete();
  }
}
module.exports={configuration,fixtures,assertNoOutboundChannels,assertGeneratedRow,assertSeedRestore,deleteSnapshotAfterCheck,waitForBusinessIdle,settleAndClose,validateSignedReport,openDraft,
  PAULA_ROLE_PROFILE,directFormsProfile,validatePaulaRoleAuthority,readCurrentPaulaRoleAuthority,resolvePaulaAssignedActors,validatePaulaRuntime,selectPaulaAssignedRole,validatePaulaRoleProof,
  CANCELLATION_FINANCE_COLLECTIONS,cancellationPayload,openCancellationDraft,fillCancellationDraft,exerciseCancellationDraft,cancellationSnapshot,cancellationPreservationSnapshot,
  cancellationCommandIdentity,assertCancellationAudit,assertCancellationActivity,assertCancellationPolicy,cancellationAuditSnapshots,validateCancellationAuditSnapshots,restoreCancellationAudit,
  PERSONAL_LEGAL,PERSONAL_LIMITS,personalHash,personalBlob,personalDigest,personalReviewContext,validatePersonalLegalAuthority,readCurrentPersonalLegalAuthority,
  validatePersonalPresentation,validatePersonalAccepted,verifyPersonalProofHead,validatePersonalLegalProof,applyPersonalLegalUi,
  safeDirectFormsSnapshot,safeDirectFormsClickFailure,safeDirectFormsFailureCode,captureDirectFormsSnapshot,clickDirectDecision,requireExistingLegalReadiness,safeDirectFormsDiagnosticReport};
if(require.main===module)main().catch(e=>{console.error('I66_DIRECT_FORMS_SIGNED_HOLD '+safeDirectFormsFailureCode(e));process.exitCode=1;});
