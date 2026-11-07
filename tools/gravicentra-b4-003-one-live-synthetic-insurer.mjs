import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Based on gravicentra-i5-controlled-writes-v1.mjs blob 9a2aa582...:
// same canonical writer, atomic external audit + remove, server readback.
// UI verification is deliberately separate, through the approved connected browser.
export const FIXED=Object.freeze({
 project:'ays-orbit-360-lab',tenant:'alianzas-soluciones',branch:'recovery/fase-a-clean-20260831',
 uid:'pL8zkGdq6phHm5z2DiXIcoNHiw83',role:'superadmin',fixture:'asg_mw5qeno8',
 source:'857f1222f360a42a06e012810a1c01bce155a26f',build:'gi-i65-b4-857f1222f360-57f234755dc1',
 artifact:13549460562,version:'sites/ays-orbit-360-lab/versions/c5e1ae001fae793b',
 digest:'308b669105c380294177f1a8d2350216af95fec31f800955d611e607542b42da',
 origin:'https://ays-orbit-360-lab.web.app',
 endpoint:'https://us-central1-ays-orbit-360-lab.cloudfunctions.net/orbit360ProductOperationalCommand',
 createRequest:'b4003_live_create_mw5qeno8',cleanupRequest:'b4003_live_cleanup_mw5qeno8',
 audit:'audasg_b4003_live_mw5qeno8',
 failedCreateRun:'42327828328',failedCreateParent:'891f5c573abbecb1206ced40e30934217dc300cf',
 failedCreateReceiptBlob:'98d59774740eae283ac395c130621d9f4ebf9d41',
 previousConsentBlob:'b180b6a3566c6c5f9c0b9f9da66962c00511e963',
 previousHelperBlob:'66995bd06b05e23faade01f5d0f5045d601a9fbe',
 previousExecutorBlob:'21209328d79127f841c522a6e71c18d197653dda',uiWindowMs:240000,
 planPath:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_ONE_LIVE_SYNTHETIC_INSURER_PLAN_20261107.json'
});
const SELF=fileURLToPath(import.meta.url);
const CONTROL=process.env.CONTROL||'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const PLAN=process.env.B4_LIVE_SYNTHETIC_PLAN||FIXED.planPath;
const OUT=process.env.B4_LIVE_SYNTHETIC_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b4003-live-synthetic');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const norm=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
function need(v,code){if(!v){const e=new Error(code);e.safeCode=code;throw e;}}
function repoFile(p){const absolute=path.resolve(p);need(absolute.startsWith(process.cwd()+path.sep),'PATH_OUTSIDE_REPOSITORY');return fs.readFileSync(absolute);}
function jsonFile(p){return JSON.parse(repoFile(p));}
function pinnedReceipt(p,b){need(typeof p==='string'&&p.startsWith('artifacts/orbit360-recovery/release-control/'),'RECEIPT_PATH');const bytes=repoFile(p);need(blob(bytes)===b,'RECEIPT_BLOB');return JSON.parse(bytes);}
export function normalizedMutations(command){
 return command.mutations.map(m=>({action:m.action,collection:m.collection,id:m.id,payload:m.payload?stable(m.payload):null,...(m.collection==='aseguradoras'&&m.action!=='remove'?{auditReason:m.auditReason||''}:{})}));
}
export const payloadDigest=command=>sha(JSON.stringify(stable(normalizedMutations(command))));
export const eventId=requestId=>'opevt_'+sha(FIXED.tenant+'|'+requestId).slice(0,28);
export function normalizeVersionResource(raw){
 let value=String(raw||'');const q=value.match(/^projects\/([^/]+)\/(sites\/.*)$/);
 if(q){need(q[1]==='646761409743','HOSTING_VERSION_PROJECT_MISMATCH');value=q[2];}
 need(/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(value),'HOSTING_VERSION_SITE_MISMATCH');return value;
}
export function requireAuthorizedPhasePush(scope,consent,event,phase,headSha){
 const key={create:'createAuthorizedParentSha',cleanup:'cleanupAuthorizedParentSha',complete:'completeAuthorizedParentSha'}[phase];need(key,'PHASE');
 const parent=scope[key];need(/^[a-f0-9]{40}$/.test(parent||'')&&!/^0+$/.test(parent),'AUTHORIZED_PARENT_REQUIRED');
 need(consent[key]===parent,'CONSENT_PARENT_BINDING');
 need(event.before===parent,'AUTHORIZED_PARENT_MISMATCH');
 need(event.forced!==true&&event.created!==true&&event.deleted!==true&&event.ref==='refs/heads/'+FIXED.branch,'EXISTING_CANONICAL_PUSH_REQUIRED');
 need(event.head_commit?.id===headSha&&event.commits?.length===1&&event.commits[0].id===headSha,'SINGLE_AUTHORIZED_PUSH_REQUIRED');
 return true;
}
export function validatePlan(p){
 need(p.projectId===FIXED.project&&p.tenantId===FIXED.tenant,'PLAN_TARGET');
 need(p.hosting.sourceSha===FIXED.source&&p.hosting.buildId===FIXED.build&&p.hosting.artifactId===FIXED.artifact&&p.hosting.version===FIXED.version&&p.hosting.hostedPayloadDigest===FIXED.digest&&p.hosting.origin===FIXED.origin,'PLAN_CANDIDATE42');
 need(p.principal.uid===FIXED.uid&&p.principal.activeRole===FIXED.role&&p.principal.customTokenCountMaximum===2,'PLAN_PRINCIPAL');
 need(p.fixture.id===FIXED.fixture&&p.fixture.maxDistinctBusinessIds===1&&/^asg_[0-9a-z]+$/.test(FIXED.fixture),'PLAN_FIXTURE');
 const c=p.commands.create,d=p.commands.cleanup;
 need(p.commands.endpoint===FIXED.endpoint&&c.requestId===FIXED.createRequest&&d.requestId===FIXED.cleanupRequest,'PLAN_OWNER_REQUESTS');
 need([c,d].every(x=>x.tenantId===FIXED.tenant&&x.activeRole===FIXED.role),'PLAN_SIGNED_CONTEXT');
 need(c.mutations.length===1&&c.mutations[0].action==='insert'&&c.mutations[0].collection==='aseguradoras'&&c.mutations[0].id===FIXED.fixture,'PLAN_CREATE');
 need(d.mutations.length===2&&d.mutations[0].action==='remove'&&d.mutations[0].collection==='aseguradoras'&&d.mutations[0].id===FIXED.fixture&&d.mutations[1].action==='insert'&&d.mutations[1].collection==='auditoriaAsegExterna'&&d.mutations[1].id===FIXED.audit&&d.mutations[1].payload.aseguradoraId===FIXED.fixture,'PLAN_ATOMIC_CLEANUP');
 need(c.mutations[0].payload.nombre==='QA B4-003 LIVE 2026-11-07'&&c.mutations[0].payload.pais==='GT'&&c.mutations[0].payload.vinculada===false,'PLAN_SYNTHETIC_PAYLOAD');
 need(['contactos','portales','cuentas','ramos','docs'].every(k=>Array.isArray(c.mutations[0].payload[k])&&c.mutations[0].payload[k].length===0),'PLAN_EMPTY_RELATIONS');
 need(p.browserPolicy?.ciBrowserAutomation===false&&p.browserPolicy?.hiddenBrowserTokenAccess===false,'NO_BROWSER_BYPASS');
 return true;
}
export function authorization(cp,p,phase,bindings){
 validatePlan(p);need(['create','cleanup','complete'].includes(phase),'PHASE');
 const c=cp.b4003ActiveCertificationCursor20261106,a=c?.liveSyntheticInsurerWrite20261107;
 need(a?.status==='AUTHORIZED_ONCE'&&a.authorized===true&&a.consumed===false,'OWNER_AUTHORIZATION_PENDING');
 need(c.activeSourceSha===FIXED.source&&c.activeBuildId===FIXED.build&&Number(c.activeImmutableArtifactId)===FIXED.artifact,'ACTIVE42');
 need(c.formalPreviewAcceptance?.status==='LATEST_APPROVED_VERSION_PREVIEW_PASS'&&c.formalPreviewAcceptance.hostingVersion===FIXED.version,'PREVIEW_PASS_REQUIRED');
 need(c.retainedHostingPromotion20261107?.status==='EXACT_HOSTING_VERSION_PROMOTED_LIVE_BYTES_PASS_FUNCTIONAL_LIVE_PENDING','PROMOTED42_REQUIRED');
 need(c.retainedHostingPromotion20261107.liveVersionName===FIXED.version&&c.retainedHostingPromotion20261107.rawProductDigest===FIXED.digest&&c.retainedHostingPromotion20261107.all218RawBytesExact===true&&c.retainedHostingPromotion20261107.sameExistingFinalizedVersion===true,'PROMOTION_EXACT_BYTES');
 need(a.planSha256===bindings.planSha&&a.helperBlobSha===bindings.helperBlob&&a.executorBlobSha===bindings.executorBlob,'APPROVED_BYTES');
 need(a.projectId===FIXED.project&&a.tenantId===FIXED.tenant&&a.origin===FIXED.origin&&a.version===FIXED.version&&a.hostedPayloadDigest===FIXED.digest,'APPROVED_TARGET');
 need(a.principal?.uid===FIXED.uid&&a.principal.activeRole===FIXED.role&&a.principal.customTokenAuthorized===true&&a.principal.customTokenCountMaximum===2,'PAULA_TOKEN_AUTHORIZATION_PENDING');
 need(a.principal.accountOrMembershipMutationAuthorized===false&&a.realRecordWritesAuthorized===false&&a.rebuildOrDeployAuthorized===false&&a.reimportAuthorized===false,'SCOPE_BOUNDARIES');
 need(a.fixture?.id===FIXED.fixture&&a.fixture.collection==='aseguradoras'&&a.fixture.maxDistinctIds===1&&JSON.stringify(a.fixture.allowedActions)===JSON.stringify(['insert','remove']),'APPROVED_ONE_FIXTURE');
 need(a.createRequestId===FIXED.createRequest&&a.cleanupRequestId===FIXED.cleanupRequest&&a.auditId===FIXED.audit&&a.atomicExternalAuditInsertAuthorized===true&&a.cleanupOnFailureAuthorized===true,'ATOMIC_CLEANUP_AUTHORIZATION');
 need(!a[{create:'createRunId',cleanup:'cleanupRunId',complete:'completeRunId'}[phase]],'PHASE_ALREADY_CONSUMED');
 if(a.continuationMode==='COMPLETE_WITH_ONE_REMAINING_TOKEN')need(phase==='complete','ONLY_REMAINING_COMPLETE_ALLOWED');
 if(phase==='complete'){
  need(a.continuationMode==='COMPLETE_WITH_ONE_REMAINING_TOKEN'&&String(a.createRunId)===FIXED.failedCreateRun&&a.completeRunId===null&&a.cleanupRunId===null,'COMPLETE_PREVIOUS_ATTEMPT_REQUIRED');
  need(a.tokensPreviouslyIssued===1&&a.remainingTokenBudget===1&&a.createAuthorizedParentSha===FIXED.failedCreateParent,'COMPLETE_BUDGET_AND_CONSUMED_PARENT');
  need(a.createEvidenceBlobSha===FIXED.failedCreateReceiptBlob,'EXACT_FAILED_CREATE_RECEIPT_REQUIRED');
 }
 return a;
}
export function validateFailedCreateReceipt(prior,planSha){
 need(prior.schema==='B4_003_ONE_LIVE_SYNTHETIC_PHASE_EVIDENCE_V1'&&prior.phase==='create'&&prior.status==='HOLD'&&String(prior.workflowRunId)===FIXED.failedCreateRun,'FAILED_CREATE_IDENTITY');
 need(prior.fixtureId===FIXED.fixture&&prior.planSha256===planSha&&prior.sourceSha===FIXED.source&&prior.buildId===FIXED.build&&prior.hostingVersion===FIXED.version,'FAILED_CREATE_BINDING');
 need(prior.customTokensIssued===1&&prior.mutationsExecuted===0&&prior.observations?.beforeExists===false&&prior.canonicalOwnerPostSubmitted===false,'FAILED_CREATE_NO_MUTATION_PROOF');
 need(!Object.hasOwn(prior.observations,'createRequestSubmittedAtUtc')&&!Object.hasOwn(prior.observations,'createResponse')&&JSON.stringify(prior.errors)===JSON.stringify(['SIGNED_PAULA_UID']),'FAILED_CREATE_PREPOST_FAILURE');
 need(prior.helperBlobSha===FIXED.previousHelperBlob&&prior.executorBlobSha===FIXED.previousExecutorBlob&&prior.authorizationReceiptBlobSha===FIXED.previousConsentBlob,'FAILED_CREATE_ORIGINAL_BYTES');
 need(prior.temporaryAccessBudget?.authorizedMaximum===2&&prior.temporaryAccessBudget.alreadyIssued===1&&prior.temporaryAccessBudget.remainingMaximum===1,'FAILED_CREATE_TOKEN_BUDGET');
 return true;
}
export async function verifiedSessionIdToken(auth,session){
 need(typeof session.idToken==='string'&&session.idToken.length>0,'SIGNED_PAULA_ID_TOKEN_MISSING');
 delete session.refreshToken;
 let decoded;try{decoded=await auth.verifyIdToken(session.idToken,true);}catch{need(false,'SIGNED_PAULA_ID_TOKEN_INVALID');}
 need(decoded.uid===FIXED.uid&&decoded.sub===FIXED.uid&&decoded.aud===FIXED.project&&decoded.iss==='https://securetoken.google.com/'+FIXED.project,'SIGNED_PAULA_UID');
 need(Number(decoded.exp)*1000-Date.now()>FIXED.uiWindowMs+180000,'SIGNED_SESSION_CLEANUP_TIME_REQUIRED');
 return session.idToken;
}
async function fetchJson(url,options,code){
 let r;try{r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(25000),...options});}catch{need(false,code+'_TRANSPORT');}
 need(r.ok,code+'_HTTP_'+r.status);try{return await r.json();}catch{need(false,code+'_JSON');}
}
async function headLease(){
 need(process.env.GITHUB_REF_NAME===FIXED.branch&&/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||''),'BRANCH_HEAD_CONTEXT');
 need(process.env.GH_TOKEN||process.env.GITHUB_TOKEN,'GITHUB_READ_CREDENTIAL');
 const r=await fetchJson('https://api.github.com/repos/paulaosoriof86/orbit360-core/git/ref/heads/'+FIXED.branch,
 {headers:{Authorization:'Bearer '+(process.env.GH_TOKEN||process.env.GITHUB_TOKEN),Accept:'application/vnd.github+json'}},'HEAD_LEASE');
 need(r.object?.sha===process.env.GITHUB_SHA,'CANONICAL_HEAD_CHANGED');
}
function serviceAccount(){
 if(process.env.GOOGLE_APPLICATION_CREDENTIALS){const a=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));need(a.type==='service_account'&&a.project_id===FIXED.project,'SERVICE_ACCOUNT_PROJECT');return a;}
 for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){
  try{const a=JSON.parse(raw);if(a.type==='service_account'&&a.project_id===FIXED.project)return a;}catch{}
 }
 need(false,'EXISTING_SERVICE_ACCOUNT_REQUIRED');
}
async function liveBinding(credential){
 const {access_token}=await credential.getAccessToken();
 const live=await fetchJson('https://firebasehosting.googleapis.com/v1beta1/projects/-/sites/'+FIXED.project+'/channels/live',{headers:{Authorization:'Bearer '+access_token}},'LIVE_CHANNEL');
 need(normalizeVersionResource(live.release?.version?.name)===FIXED.version,'LIVE_VERSION_DRIFT');
 const marker=await fetchJson(FIXED.origin+'/__recovery__/build.json?b4003='+FIXED.fixture,{headers:{'Cache-Control':'no-cache'}},'LIVE_MARKER');
 need(marker.sourceSha===FIXED.source&&marker.buildId===FIXED.build,'LIVE_BUILD_DRIFT');
}
async function main(){
 const phase=(process.argv.find(x=>x.startsWith('--phase='))||'').slice(8);
 const p=jsonFile(PLAN),cp=jsonFile(CONTROL);
 validatePlan(p);
 if(!process.argv.includes('--execute')&&!process.argv.includes('--check-authorization')){console.log('B4_003_LIVE_SYNTHETIC=PREPARED_HOLD_NO_EXECUTION');return;}
 const bindings={planSha:sha(repoFile(PLAN)),helperBlob:blob(fs.readFileSync(SELF)),executorBlob:blob(repoFile('.github/workflows/gravicentra-b4-003-executor.yml'))};
 const a=authorization(cp,p,phase,bindings);
 const consent=pinnedReceipt(a.authorizationReceiptPath,a.authorizationReceiptBlobSha);
 need(consent.authorized===true&&consent.ownerUid===FIXED.uid&&consent.planSha256===bindings.planSha&&consent.helperBlobSha===bindings.helperBlob&&consent.executorBlobSha===bindings.executorBlob&&consent.maxCustomTokens===2,'EXPLICIT_RECEIPT');
 need(consent.operations?.join('|')==='create_exact_synthetic_insurer|readback_and_visible_ui_reload|atomic_remove_plus_external_audit|same_scope_recovery','EXPLICIT_OPERATIONS');
 need(process.env.GITHUB_EVENT_PATH,'CANONICAL_PUSH_EVENT_REQUIRED');
 requireAuthorizedPhasePush(a,consent,JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')),phase,process.env.GITHUB_SHA);
 if(phase==='complete'){
  need(consent.tokensPreviouslyIssued===1&&consent.remainingTokenBudget===1&&consent.cleanupRunId===null&&consent.previousAuthorizationReceiptBlobSha===FIXED.previousConsentBlob&&consent.createAuthorizedParentSha===FIXED.failedCreateParent,'CONSENT_REMAINING_BUDGET');
  validateFailedCreateReceipt(pinnedReceipt(a.createEvidencePath,a.createEvidenceBlobSha),bindings.planSha);
 }
 if(phase==='cleanup'){
  const prior=pinnedReceipt(a.createEvidencePath,a.createEvidenceBlobSha);
  need(prior.fixtureId===FIXED.fixture&&prior.planSha256===bindings.planSha&&prior.sourceSha===FIXED.source&&prior.phase==='create','CREATE_EVIDENCE_BINDING');
  if(!a.recoveryOnly){const ui=pinnedReceipt(a.uiCreateReadbackPath,a.uiCreateReadbackBlobSha);need(ui.status==='PASS_VISIBLE_UI_AFTER_CREATE_RELOAD'&&ui.fixtureId===FIXED.fixture&&ui.buildId===FIXED.build&&ui.actualPaulaSession===true&&ui.reloadObserved===true,'VISIBLE_UI_CREATE_RELOAD_REQUIRED');}
 }
 if(process.argv.includes('--check-authorization')){console.log('B4_003_LIVE_SYNTHETIC_AUTHORIZATION=PASS_PHASE_'+phase.toUpperCase());return;}
 need(process.env.B4_LIVE_SYNTHETIC_EXECUTION_NONCE===p.executionNonce,'EXECUTION_NONCE');
 need(process.env.GITHUB_RUN_ATTEMPT==='1','NO_AUTOMATIC_TOKEN_REMINT_ON_RERUN');
 await headLease();
 const root=process.env.B4_LIVE_SYNTHETIC_DEPS_ROOT;need(root,'PINNED_DEPS_ROOT');
 const require=createRequire(path.join(root,'package.json'));
 const {initializeApp,cert,deleteApp}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth'),{getFirestore}=require('firebase-admin/firestore');
 need(JSON.parse(fs.readFileSync(path.join(root,'node_modules/firebase-admin/package.json'),'utf8')).version==='13.10.0','ADMIN_VERSION');
 const credential=cert(serviceAccount());await liveBinding(credential);
 const app=initializeApp({credential,projectId:FIXED.project},'b4003-one-live-'+phase),auth=getAuth(app),db=getFirestore(app);
 const tenant=db.collection('tenants').doc(FIXED.tenant);
 const doc=(collection,id)=>tenant.collection('data').doc(collection).collection('items').doc(id);
 const request=id=>tenant.collection('operationalRequests').doc(id),event=id=>tenant.collection('operationalEvents').doc(eventId(id));
 const fixture=doc('aseguradoras',FIXED.fixture),audit=doc('auditoriaAsegExterna',FIXED.audit);
 const ev={schema:'B4_003_ONE_LIVE_SYNTHETIC_PHASE_EVIDENCE_V1',status:'HOLD',phase,fixtureId:FIXED.fixture,planSha256:bindings.planSha,sourceSha:FIXED.source,buildId:FIXED.build,hostingVersion:FIXED.version,workflowRunId:process.env.GITHUB_RUN_ID||null,principalUidSha256:sha(FIXED.uid),activeRole:FIXED.role,customTokensIssued:0,mutationsExecuted:0,browserAutomated:false,visibleUiReloadClaimed:false,observations:{},errors:[]};
 if(phase==='complete'){ev.tokensPreviouslyIssued=1;ev.tokenBudgetMaximumTotal=2;ev.previousCreateRunId=FIXED.failedCreateRun;ev.previousCreateReceiptBlobSha=FIXED.failedCreateReceiptBlob;}
 let idToken='',attemptedCreate=false;
 async function call(command){
  await headLease();
  if(command.requestId===FIXED.createRequest){attemptedCreate=true;ev.observations.createRequestSubmittedAtUtc=new Date().toISOString();}
  const r=await fetchJson(FIXED.endpoint,{method:'POST',headers:{Authorization:'Bearer '+idToken,'Content-Type':'application/json'},body:JSON.stringify({data:command})},'CANONICAL_OWNER');
  const data=r.result||r.data;need(!r.error&&data?.ok===true&&data.serverOwned===true&&data.requestId===command.requestId&&data.eventId===eventId(command.requestId)&&data.mutationCount===command.mutations.length,'OWNER_RECEIPT');
  for(const m of command.mutations){const rb=data.readback?.find(x=>x.collection===m.collection&&x.id===m.id&&x.action===m.action);need(rb?.exists===(m.action!=='remove'),'OWNER_CANONICAL_READBACK');}
  return {ok:true,serverOwned:true,requestId:data.requestId,eventId:data.eventId,mutationCount:data.mutationCount,readback:data.readback.map(x=>({collection:x.collection,id:x.id,action:x.action,exists:x.exists}))};
 }
 async function auditProof(command){
  const [r,e]=await Promise.all([request(command.requestId).get(),event(command.requestId).get()]);
  need(r.exists&&e.exists,'CANONICAL_AUDIT_MISSING');const rq=r.data(),et=e.data(),dg=payloadDigest(command);
  need(rq.status==='committed'&&rq.payloadDigest===dg&&rq.result?.serverOwned===true&&rq.result?.mutationCount===command.mutations.length,'REQUEST_AUDIT_BINDING');
  need(rq.insurerActor?.uid===FIXED.uid&&rq.insurerActor?.activeRole===FIXED.role,'REQUEST_ACTOR_BINDING');
  need(et.requestId===command.requestId&&et.eventId===eventId(command.requestId)&&et.actorUid===FIXED.uid&&et.activeRole===FIXED.role&&et.payloadDigest===dg&&et.containsSecrets===false,'EVENT_AUDIT_BINDING');
  return {requestId:command.requestId,eventId:eventId(command.requestId),requestCommitted:true,eventMatched:true,actorMatched:true,payloadDigest:dg};
 }
 async function exactRelations(){
  const found=[];for(const col of ['polizas','cobros','comisiones','reclamos','gestiones','negocios','recibosEsperados','carteraPrimas']){
   const s=await tenant.collection('data').doc(col).collection('items').where('aseguradoraId','==',FIXED.fixture).limit(1).get();
   if(!s.empty)found.push(col);
  }need(found.length===0,'SYNTHETIC_RELATIONS_PRESENT');return {queriedExactInsurerId:true,collections:8,matches:0};
 }
 async function exactSideEffects(){
  const roots=[tenant.collection('notificationOutbox'),tenant.collection('workflowRequests'),tenant.collection('workflowEvents'),tenant.collection('data').doc('actividades').collection('items'),tenant.collection('data').doc('eventosIntegracion').collection('items')];
  const fields=['aseguradoraId','entidadId','entityId','recordId','payload.aseguradoraId','data.aseguradoraId','context.aseguradoraId'];
  for(const ref of roots)for(const field of fields){const s=await ref.where(field,'==',FIXED.fixture).limit(1).get();need(s.empty,'EXACT_ID_UNEXPECTED_SIDE_EFFECT');}
  return {boundedEqualityQueriesOnly:true,collections:roots.length,fields,matches:0,unknownSchemaAbsenceNotClaimed:true};
 }
 function verifyFixture(row){
  need(row&&row.id===FIXED.fixture&&row.nombre===p.fixture.name&&row.pais==='GT'&&row.tenantId===FIXED.tenant&&row.createdByUid===FIXED.uid,'SYNTHETIC_IDENTITY_MISMATCH');
  need(['contactos','portales','cuentas','ramos','docs'].every(k=>Array.isArray(row[k])&&row[k].length===0),'SYNTHETIC_CONTENT_CHANGED');
  const keys=Object.keys(row);need(!keys.some(k=>/password|contrasena|credential|secretvalue|tokenvalue/i.test(k)),'SYNTHETIC_SECRET_FIELD');
  need(row.actividad?.some(x=>x.serverOwned===true&&x.actorUid===FIXED.uid&&x.activeRole===FIXED.role),'SERVER_ACTIVITY_MISSING');
  return {id:row.id,nombre:row.nombre,pais:row.pais,tenantMatched:true,actorMatched:true,serverOwnedActivity:true};
 }
 async function cleanup(){
  const [current,ar,rr]=await Promise.all([fixture.get(),audit.get(),request(FIXED.cleanupRequest).get()]);
  if(!current.exists){need(ar.exists&&rr.exists,'ABSENCE_WITHOUT_ATOMIC_CLEANUP_PROOF');}
  else{
   need(!ar.exists&&!rr.exists,'PARTIAL_CLEANUP_STATE');verifyFixture(current.data());await exactRelations();
   try{ev.observations.cleanupResponse=await call(p.commands.cleanup);ev.mutationsExecuted+=2;}
   catch(error){
    const [left,record,external]=await Promise.all([fixture.get(),request(FIXED.cleanupRequest).get(),audit.get()]);
    if(!left.exists&&record.exists&&external.exists){ev.observations.cleanupResponseRecoveredByCanonicalReadback=true;}
    else if(left.exists&&!record.exists&&!external.exists){ev.observations.cleanupResponse=await call(p.commands.cleanup);ev.mutationsExecuted+=2;}
    else throw error;
   }
  }
  const [after,external]=await Promise.all([fixture.get(),audit.get()]);
  need(!after.exists&&external.exists,'FINAL_ABSENCE_OR_EXTERNAL_AUDIT');
  const ex=external.data();need(ex.aseguradoraId===FIXED.fixture&&ex.id===FIXED.audit&&ex.createdByUid===FIXED.uid&&ex.b4003Synthetic===true,'EXTERNAL_AUDIT_BINDING');
  ev.observations.cleanupAudit=await auditProof(p.commands.cleanup);
  ev.observations.externalAudit={id:FIXED.audit,exists:true,fixtureMatched:true,actorMatched:true};
  ev.observations.finalCanonicalAbsence=true;await exactRelations();ev.observations.sideEffectsAfterCleanup=await exactSideEffects();
 }
 try{
  const [ms,u]=await Promise.all([tenant.collection('members').doc(FIXED.uid).get(),auth.getUser(FIXED.uid)]);
  need(ms.exists,'EXISTING_PAULA_MEMBERSHIP');const m=ms.data();
  need((!m.uid||m.uid===FIXED.uid)&&(!m.tenantId||m.tenantId===FIXED.tenant)&&m.active!==false&&m.activo!==false&&m.inactivo!==true,'PAULA_MEMBERSHIP_IDENTITY');
  const states=[m.status,m.estado].filter(Boolean).map(norm);need(states.length&&states.every(x=>['active','activo'].includes(x)),'PAULA_MEMBER_STATUS');
  const roles=[...(m.roles||[]),...(m.rolesAsignados||[]),...(m.assignedRoles||[]),...(m.rolesDisponibles||[])].map(norm);
  need(roles.includes(FIXED.role)&&[...(m.countries||[]),...(m.paises||[]),...(m.paisesAutorizados||[])].includes('GT'),'PAULA_ASSIGNED_ROLE_COUNTRY');
  need(u.uid===FIXED.uid&&!u.disabled&&u.emailVerified===true,'EXISTING_ENABLED_VERIFIED_PAULA');
  const before=await fixture.get();ev.observations.beforeExists=before.exists;
  if(phase==='create'||phase==='complete'){
   const checks=await Promise.all([request(FIXED.createRequest).get(),request(FIXED.cleanupRequest).get(),audit.get(),event(FIXED.createRequest).get(),event(FIXED.cleanupRequest).get()]);
   need(!before.exists&&checks.every(x=>!x.exists),'NEW_EXECUTION_ABSENCE');
  }else{need(before.exists||((await audit.get()).exists&&(await request(FIXED.cleanupRequest).get()).exists),'CLEANUP_SCOPE_NOT_FOUND');if(before.exists)verifyFixture(before.data());}
  await exactRelations();ev.observations.sideEffectsBefore=await exactSideEffects();
  if(phase==='cleanup'&&!before.exists){
   ev.observations.createAudit=await auditProof(p.commands.create);await cleanup();
   ev.status='CLEANED_CANONICAL_ABSENCE_PENDING_FINAL_UI_RELOAD';
   await headLease();await liveBinding(credential);return;
  }
  const config=await fetchJson(FIXED.origin+'/__/firebase/init.json',{},'PUBLIC_FIREBASE_CONFIG');need(config.projectId===FIXED.project&&typeof config.apiKey==='string','PUBLIC_CONFIG_PROJECT');
  const customToken=await auth.createCustomToken(FIXED.uid);ev.customTokensIssued=1;
  const session=await fetchJson('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key='+encodeURIComponent(config.apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:customToken,returnSecureToken:true})},'EPHEMERAL_SIGN_IN');
  idToken=await verifiedSessionIdToken(auth,session);
  if(phase==='create'||phase==='complete'){
   ev.observations.createResponse=await call(p.commands.create);ev.mutationsExecuted=1;
   const after=await fixture.get();need(after.exists,'CREATE_SERVER_ABSENCE');ev.observations.afterCreate=verifyFixture(after.data());ev.observations.createAudit=await auditProof(p.commands.create);
   ev.observations.relations=await exactRelations();ev.observations.sideEffectsAfterCreate=await exactSideEffects();ev.status='CREATED_SERVER_READBACK_PENDING_UI_RELOAD';
   if(phase==='complete'){
    ev.observations.uiWindow={openedAtUtc:new Date().toISOString(),durationMs:FIXED.uiWindowMs,closedAtUtc:null,uiObservationByThisHelper:false};
    fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'complete-created-checkpoint.json'),JSON.stringify(ev,null,2)+'\n');
    console.log('B4_003_LIVE_SYNTHETIC_CREATED='+FIXED.fixture);console.log('B4_003_LIVE_SYNTHETIC_UI_WINDOW_SECONDS=240');
    await new Promise(resolve=>setTimeout(resolve,FIXED.uiWindowMs));
    ev.observations.uiWindow.closedAtUtc=new Date().toISOString();
    await cleanup();ev.status='CLEANED_CANONICAL_ABSENCE_UI_EVIDENCE_REQUIRED';
   }
  }else{
   ev.observations.createAudit=await auditProof(p.commands.create);await cleanup();ev.status='CLEANED_CANONICAL_ABSENCE_PENDING_FINAL_UI_RELOAD';
  }
  await headLease();await liveBinding(credential);ev.observations.finalLiveIdentityVerified=true;
 }catch(e){
  ev.errors.push(e.safeCode||'UNEXPECTED_FAILURE_SANITIZED');process.exitCode=1;
  if((phase==='create'||phase==='complete')&&attemptedCreate&&idToken){
   try{
    // Writer timeout is 60 s in the pinned backend. A timed-out client POST
    // is not proof of absence. Observe the exact transaction records, with
    // a 15 s margin; never issue another create or claim PASS from one GET.
    const sent=Date.parse(ev.observations.createRequestSubmittedAtUtc),deadline=sent+75000;
    let committed=false;
    do{
     const [s,r,evt]=await Promise.all([fixture.get(),request(FIXED.createRequest).get(),event(FIXED.createRequest).get()]);
     ev.observations.uncertainCreateReadback={fixtureExists:s.exists,requestExists:r.exists,eventExists:evt.exists,observedAtUtc:new Date().toISOString()};
     if(r.exists&&evt.exists){
      ev.observations.createAudit=await auditProof(p.commands.create);
      need(s.exists,'COMMITTED_CREATE_WITH_UNEXPLAINED_ABSENCE');verifyFixture(s.data());
      await cleanup();ev.status='FAILED_CREATE_RECOVERED_CANONICAL_ABSENCE';committed=true;break;
     }
     if(Date.now()>=deadline)break;
     await new Promise(resolve=>setTimeout(resolve,Math.min(3000,deadline-Date.now())));
    }while(true);
    if(!committed){ev.status='HOLD_CREATE_SUBMISSION_UNRESOLVED';ev.errors.push('NO_VISIBLE_COMMIT_IS_NOT_FINAL_ABSENCE_PROOF');}
   }
   catch(x){ev.errors.push(x.safeCode||'RECOVERY_FAILURE_SANITIZED');ev.status='HOLD_EXACT_SYNTHETIC_RESIDUE_REVIEW_REQUIRED';}
  }
 }finally{
  idToken='';await deleteApp(app).catch(()=>{});
  if(phase==='complete'){ev.customTokensTotal=ev.tokensPreviouslyIssued+ev.customTokensIssued;ev.remainingTokenBudget=2-ev.customTokensTotal;}
  fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'phase-'+phase+'.json'),JSON.stringify(ev,null,2)+'\n');
  console.log('B4_003_LIVE_SYNTHETIC_PHASE='+phase);console.log('B4_003_LIVE_SYNTHETIC_STATUS='+ev.status);console.log('B4_003_LIVE_SYNTHETIC_CUSTOM_TOKENS='+ev.customTokensIssued);
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===SELF)main().catch(e=>{console.error('B4_003_LIVE_SYNTHETIC=HOLD:'+String(e.safeCode||'LOCAL_OR_AUTHORIZATION_FAILURE_SANITIZED'));process.exitCode=1;});
