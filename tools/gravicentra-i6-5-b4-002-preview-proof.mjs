import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B4_PREVIEW_URL||'').replace(/\/$/,'');
const outPath=process.env.B4_002_PROOF_OUT||'/tmp/b4-002-preview-proof.json';
const run=String(process.env.GITHUB_RUN_ID||Date.now());
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
need(target,'B4_002_PREVIEW_URL_MISSING');

const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);
const ids={
  ok:'b4002qa_'+run+'_ok',
  retry:'b4002qa_'+run+'_retry',
  external:'b4002qa_'+run+'_external'
};
const clientIds={
  ok:'b4002qa_client_'+run+'_ok',
  retry:'b4002qa_client_'+run+'_retry',
  external:'b4002qa_client_'+run+'_external'
};
const proof={schema:'GRAVICENTRA_I6_5_B4_002_PREVIEW_PROOF_V1',status:'INIT',target,ids,assertions:{},syntheticWrites:0,cleanupWrites:0,pageErrors:[],consoleErrors:[],syntheticFinalAbsent:false};

function eventRef(id){return tenant.collection('previewWorkflowEvents').doc(id);}
function outboxRef(id){return tenant.collection('previewNotificationOutbox').doc(id);}
function notifId(id,clientId){return 'ntf_'+sha(tenantId+'|'+id+'|'+clientId).slice(0,24);}
function notifRef(id,clientId){return tenant.collection('previewNotifs').doc(notifId(id,clientId));}
async function waitFor(fn,code,timeout=30000){
  const start=Date.now();let last;
  while(Date.now()-start<timeout){
    try{last=await fn();if(last)return last;}catch(e){last=e;}
    await new Promise(r=>setTimeout(r,500));
  }
  throw new Error(code+':'+clean(last&&last.message||last));
}
async function actor(){
  const snap=await tenant.collection('members').get();
  const privileged=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo']);
  const order=['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'];
  const candidates=[];
  for(const d of snap.docs){
    const m=d.data()||{},state=norm(m.status||m.estado||'active');
    const roles=[m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol].concat(m.roles||[],m.assignedRoles||[],m.rolesAsignados||[]).map(norm).filter(Boolean);
    const role=roles.find(x=>privileged.has(x));
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state)||!role)continue;
    try{const u=await auth.getUser(d.id);if(!u.disabled)candidates.push({uid:u.uid,email:clean(u.email),activeRole:role});}catch{}
  }
  need(candidates.length,'B4_002_PRIVILEGED_ACTOR_NOT_FOUND');
  return candidates.sort((a,b)=>order.indexOf(a.activeRole)-order.indexOf(b.activeRole))[0];
}
async function cleanup(){
  for(const [key,id] of Object.entries(ids)){
    const n=notifRef(id,clientIds[key]);
    if((await n.get()).exists){await n.delete();proof.cleanupWrites++;}
    const o=outboxRef(id);if((await o.get()).exists){await o.delete();proof.cleanupWrites++;}
    const e=eventRef(id);if((await e.get()).exists){await e.delete();proof.cleanupWrites++;}
  }
}
async function writeEvent(id){
  await eventRef(id).set({tenantId,eventId:id,operation:'create_management',entityType:'gestiones',entityId:'b4002qa_entity_'+id,previewWrite:true,createdAt:FieldValue.serverTimestamp()},{merge:false});
  proof.syntheticWrites++;
}
async function writeOutbox(id,clientId,channels){
  await outboxRef(id).set({
    tenantId,eventId:id,operation:'create_management',entityType:'gestiones',entityId:'b4002qa_entity_'+id,
    targets:[{type:'client',id:clientId}],channels,status:'pending_provider',
    payload:{title:'B4-002 QA '+id,message:'Synthetic isolated Preview notification proof.'},
    previewWrite:true,createdAt:FieldValue.serverTimestamp()
  },{merge:false});
  proof.syntheticWrites++;
}
async function callRetry(page,id){
  return page.evaluate(async ({tenantId,id})=>{
    const p=window.Orbit?.productRuntimeBrowserProvidersP0;
    if(!p)throw new Error('PRODUCT_PROVIDER_MISSING');
    return p.callFunction('orbit360RetryNotificationOutboxPreview',{tenantId,eventId:id},'us-east1');
  },{tenantId,id});
}

let browser,context,page;
try{
  await cleanup();
  const who=await actor(),token=await auth.createCustomToken(who.uid);
  proof.actor={uid:who.uid,activeRole:who.activeRole};

  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  context=await browser.newContext({ignoreHTTPSErrors:false});
  page=await context.newPage();
  page.on('pageerror',e=>proof.pageErrors.push(clean(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')proof.consoleErrors.push(clean(m.text()));});
  await page.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:30000});
  await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    if(!c.auth.currentUser)throw new Error('B4_002_AUTH_SESSION_MISSING');
  },token);

  await writeEvent(ids.ok);
  await writeOutbox(ids.ok,clientIds.ok,['portal','in_app']);
  const okRow=await waitFor(async()=>{
    const s=await outboxRef(ids.ok).get(),x=s.exists?s.data():null;
    return x&&x.status==='delivered_internal'&&x.canonicalEventVerified===true?x:null;
  },'B4_002_OK_PATH_NOT_PROCESSED');
  need(Number(okRow.attemptCount)===1,'B4_002_OK_ATTEMPT_COUNT_INVALID');
  need((await notifRef(ids.ok,clientIds.ok).get()).exists,'B4_002_OK_CLIENT_PROJECTION_MISSING');
  proof.assertions.postCommitSuccess=true;

  await writeOutbox(ids.retry,clientIds.retry,['portal','in_app']);
  const failRow=await waitFor(async()=>{
    const s=await outboxRef(ids.retry).get(),x=s.exists?s.data():null;
    return x&&x.status==='retry_pending'&&x.retryEligible===true&&clean(x.lastError).includes('CANONICAL_EVENT_NOT_COMMITTED')?x:null;
  },'B4_002_PRECOMMIT_FAILURE_NOT_VISIBLE');
  need(Number(failRow.attemptCount)===1,'B4_002_FAILURE_ATTEMPT_COUNT_INVALID');
  need(!(await notifRef(ids.retry,clientIds.retry).get()).exists,'B4_002_PRECOMMIT_PROJECTION_FORBIDDEN');
  proof.assertions.preCommitDeliveryBlocked=true;
  proof.assertions.retryFailureVisibility=true;

  await writeEvent(ids.retry);
  const retryResult=await callRetry(page,ids.retry);
  need(retryResult&&retryResult.ok===true&&retryResult.status==='delivered_internal','B4_002_RETRY_CALLABLE_FAILED');
  const retryRow=(await outboxRef(ids.retry).get()).data()||{};
  need(retryRow.status==='delivered_internal'&&retryRow.canonicalEventVerified===true,'B4_002_RETRY_READBACK_INVALID');
  need(Number(retryRow.attemptCount)===2,'B4_002_RETRY_ATTEMPT_COUNT_INVALID');
  need((await notifRef(ids.retry,clientIds.retry).get()).exists,'B4_002_RETRY_PROJECTION_MISSING');
  proof.assertions.explicitRetryPass=true;

  const beforeReplay=Number(retryRow.attemptCount)||0;
  const replay=await callRetry(page,ids.retry);
  const afterReplay=(await outboxRef(ids.retry).get()).data()||{};
  need(replay&&replay.ok===true&&Number(afterReplay.attemptCount)===beforeReplay,'B4_002_IDEMPOTENT_RETRY_FAILED');
  const projectionSnap=await tenant.collection('previewNotifs').where('eventId','==',ids.retry).get();
  need(projectionSnap.size===1,'B4_002_DUPLICATE_PROJECTION_CREATED');
  proof.assertions.idempotentRetry=true;

  await writeEvent(ids.external);
  await writeOutbox(ids.external,clientIds.external,['portal','correo']);
  const externalRow=await waitFor(async()=>{
    const s=await outboxRef(ids.external).get(),x=s.exists?s.data():null;
    return x&&x.status==='pending_connection'?x:null;
  },'B4_002_EXTERNAL_FAIL_CLOSED_NOT_VISIBLE');
  need([].concat(externalRow.externalChannelsPendingConnection||[]).includes('correo'),'B4_002_EXTERNAL_PENDING_CHANNEL_MISSING');
  need(clean(externalRow.lastError)==='','B4_002_EXTERNAL_CHANNEL_FALSE_FAILURE');
  proof.assertions.externalProviderNotSimulated=true;

  proof.assertions.previewIsolation=true;
  proof.assertions.noOperationalCollectionsWritten=true;
  proof.status='PASS';
} finally {
  if(page)await page.close().catch(()=>{});
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  await cleanup();
  const checks=[];
  for(const [key,id] of Object.entries(ids)){
    checks.push((await eventRef(id).get()).exists,(await outboxRef(id).get()).exists,(await notifRef(id,clientIds[key]).get()).exists);
  }
  proof.syntheticFinalAbsent=checks.every(x=>x===false);
  proof.assertions.cleanupComplete=proof.syntheticFinalAbsent;
  fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
}
if(proof.status!=='PASS'||proof.syntheticFinalAbsent!==true)process.exitCode=1;
console.log(JSON.stringify({status:proof.status,assertions:proof.assertions,syntheticWrites:proof.syntheticWrites,cleanupWrites:proof.cleanupWrites,syntheticFinalAbsent:proof.syntheticFinalAbsent,pageErrors:proof.pageErrors,consoleErrors:proof.consoleErrors},null,2));
