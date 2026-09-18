import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const PROD='https://ays-orbit-360-lab.web.app';
const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const SOURCE='artifacts/orbit360-recovery/release-control/I6_3_CLIENTES_SOURCE_INTAKE_20260918.json';
const ENVELOPE='.github/i6-ephemeral/i63-clientes-apply-envelope.encrypted.json';
const OUT=process.env.I63_EVIDENCE_DIR||path.join(process.env.RUNNER_TEMP||process.cwd(),'i63-evidence');
const EXPECTED_SOURCE='4f0a1307605ad5dcc947355dbbc98a50b510358e5f6a9835b75d02e45f5a8c7c';
const EXPECTED_PAYLOAD_SHA='85af65dec822dad6a4c40be5d89202ae5c9f44d302e4e9ea0b4d850f01cc9af7';
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:Buffer.from(String(v??''),'utf8')).digest('hex');
const stable=v=>{if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(typeof v.toDate==='function'){try{return{$timestamp:v.toDate().toISOString()};}catch{}}if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;};
const digest=v=>sha(JSON.stringify(stable(v)));
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const dataRef=(db,id)=>db.collection('tenants').doc(TENANT).collection('data').doc('clientes').collection('items').doc(id);
const collectionRef=db=>db.collection('tenants').doc(TENANT).collection('data').doc('clientes').collection('items');
const noSecretKeys=(v)=>{const secret=/^(?:password|pass|pwd|contrasena|contraseña|clave|secret|token|accessToken|refreshToken|privateKey|clientSecret|credentialValue|credential_value)$/i;const walk=x=>{if(!x||typeof x!=='object')return true;for(const [k,y] of Object.entries(x)){if(secret.test(k)&&y!==null&&y!==undefined&&clean(y))return false;if(y&&typeof y==='object'&&!walk(y))return false;}return true;};return walk(v);};
const subsetEqual=(actual,expected)=>{if(expected===null||typeof expected!=='object')return JSON.stringify(stable(actual))===JSON.stringify(stable(expected));if(Array.isArray(expected))return JSON.stringify(stable(actual))===JSON.stringify(stable(expected));if(!actual||typeof actual!=='object')return false;return Object.keys(expected).every(k=>subsetEqual(actual[k],expected[k]));};

function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('I63_SERVICE_ACCOUNT_NOT_AVAILABLE');
}
function readEnvelope(){
  const e=JSON.parse(fs.readFileSync(ENVELOPE,'utf8'));
  need(e.schema==='GRAVICENTRA_I6_3_APPLY_ENVELOPE_GZIP_V1','I63_ENVELOPE_SCHEMA');
  return e;
}
function decryptPayload(envelope,privateKey){
  const key=crypto.privateDecrypt({key:privateKey,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(envelope.wrappedKey,'base64'));
  const dec=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
  dec.setAuthTag(Buffer.from(envelope.tag,'base64'));
  const gz=Buffer.concat([dec.update(Buffer.from(envelope.ciphertext,'base64')),dec.final()]);
  need(sha(gz)===envelope.plaintextGzipSha256,'I63_ENVELOPE_GZIP_HASH_MISMATCH');
  const plain=zlib.gunzipSync(gz);
  need(sha(plain)===EXPECTED_PAYLOAD_SHA,'I63_PAYLOAD_HASH_MISMATCH');
  return JSON.parse(plain.toString('utf8'));
}
function rolesOf(m){
  return [...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.rolesDisponibles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[]).map(v=>clean(v)).filter(Boolean))];
}
async function selectManager(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get();
  const pref=['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'];
  for(const p of pref){
    for(const d of snap.docs){
      const m=d.data()||{},uid=clean(m.uid||d.id,180),rs=rolesOf(m),role=rs.find(r=>norm(r)===p),state=norm(m.status||m.estado||'active');
      if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;
      try{const u=await auth.getUser(uid);if(!u.disabled&&u.emailVerified===true)return{uid,role};}catch{}
    }
  }
  throw new Error('I63_NO_PRIVILEGED_MANAGER_ACTOR');
}
async function activate(page,auth,actor){
  const token=await auth.createCustomToken(actor.uid,{gravicentraI63Delta:true});
  await page.goto(PROD,{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:12000});
  const s=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();},token);
  need(s?.started===true,'I63_PRODUCT_APP_DID_NOT_START');
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:15000});
  const gate=page.locator('[data-legal-gate].open');
  if(await gate.count()){const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');if(await chk.count())await chk.check();if(await ok.count())await ok.click();await gate.waitFor({state:'detached',timeout:5000}).catch(()=>{});}
  const sess=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));
  if(sess.active!==actor.role){need(sess.assigned.includes(actor.role),'I63_MANAGER_ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),actor.role),'I63_MANAGER_ROLE_SWITCH_REJECTED');await page.waitForFunction(r=>Orbit.session?.rol?.()===r,actor.role,{timeout:6000});}
}
function chunks(a,n){const out=[];for(let i=0;i<a.length;i+=n)out.push(a.slice(i,i+n));return out;}

fs.mkdirSync(OUT,{recursive:true});
const evidence={schema:'GRAVICENTRA_I6_3_APPLY_READBACK_FUNCTIONAL_V1',gate:'I6.3',module:'CLIENTES',status:'FAIL',sourceSha256:EXPECTED_SOURCE,diff:{},apply:{operationalMutations:0,batchesCommitted:0,deletes:0},readback:{},functional:{},rollback:{executed:false},containsPII:false,containsSecrets:false,errors:[]};
const cp=JSON.parse(fs.readFileSync(CONTROL,'utf8')),src=JSON.parse(fs.readFileSync(SOURCE,'utf8'));
need(cp.status==='PRODUCTION_ACCEPTED','I63_BASELINE_NOT_ACCEPTED');
need(cp.gateState?.gates?.I6?.status==='I6_3_DATA_UPDATE_V5_ACTIVE'&&cp.gateState?.gates?.I6?.activeSubgate==='I6.3','I63_GATE_NOT_ACTIVE');
need(cp.nextAction==='I6_3_APPLY_DETERMINISTIC_DELTA','I63_APPLY_NOT_CURRENT_ACTION');
need(src.status==='PINNED_FOR_V5_DELTA'&&src.execution?.cursorState==='DETERMINISTIC_DIFF_READY'&&src.source?.sha256===EXPECTED_SOURCE,'I63_SOURCE_OR_CURSOR_MISMATCH');

const sa=serviceAccount(),payload=decryptPayload(readEnvelope(),sa.private_key);
need(payload.schema==='GRAVICENTRA_I6_3_DETERMINISTIC_DELTA_PAYLOAD_V1','I63_PAYLOAD_SCHEMA');
need(payload.sourceSha256===EXPECTED_SOURCE,'I63_PAYLOAD_SOURCE_MISMATCH');
need(Array.isArray(payload.mutations)&&payload.mutations.length===312,'I63_MUTATION_COUNT');
need(payload.mutations.filter(m=>m.action==='update').length===300,'I63_UPDATE_COUNT');
need(payload.mutations.filter(m=>m.action==='insert').length===12,'I63_INSERT_COUNT');
need(payload.mutations.every(m=>m.collection==='clientes'&&['update','insert'].includes(m.action)&&noSecretKeys(m.payload)),'I63_UNSAFE_OPERATIONAL_PAYLOAD');
need(Array.isArray(payload.conflictPreserve)&&payload.conflictPreserve.length===3,'I63_CONFLICT_PRESERVE_COUNT');
evidence.diff={sourceRows:450,sourceUniqueEntities:442,liveDocuments:430,updates:300,inserts:12,unchanged:130,deletes:0,duplicateExtraRows:8,ambiguousFieldConflicts:3,fieldChangeCounts:payload.summary?.fieldChangeCounts||{},newCountryValidatedGT:payload.summary?.newCountryValidatedGT||0,newCountryRequiresValidation:payload.summary?.newCountryRequiresValidation||0,advisorChangesExisting:payload.summary?.advisorChangesExisting||0};

const app=initializeApp({credential:cert(sa),projectId:PROJECT},'i63-delta');
const db=getFirestore(app),auth=getAuth(app);
let browser=null,anyCommitted=false;
const beforeDocs=new Map(),unrelatedBefore=new Map();
try{
  const allBefore=await collectionRef(db).get();
  need(allBefore.size===430,'I63_LIVE_DOCUMENT_COUNT_DRIFT');
  const mutationIds=new Set(payload.mutations.map(m=>m.id));
  for(const d of allBefore.docs){const row=d.data()||{};if(mutationIds.has(d.id))beforeDocs.set(d.id,row);else unrelatedBefore.set(d.id,digest(row));}
  need(unrelatedBefore.size===130,'I63_UNCHANGED_BASELINE_COUNT');
  for(const m of payload.mutations){const snap=await dataRef(db,m.id).get();if(m.action==='update'){need(snap.exists,'I63_UPDATE_TARGET_MISSING:'+m.id);need(digest(snap.data()||{})===m.expectedBeforeSha256,'I63_PREWRITE_DRIFT:'+m.id);}else need(!snap.exists,'I63_INSERT_TARGET_EXISTS:'+m.id);}
  for(const x of payload.conflictPreserve){const snap=await dataRef(db,x.id).get();need(snap.exists,'I63_CONFLICT_TARGET_MISSING');need(sha(JSON.stringify(stable((snap.data()||{})[x.field])))===x.beforeValueSha256,'I63_CONFLICT_BEFORE_DRIFT');}

  const actor=await selectManager(db,auth);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const pageErrors=[],httpErrors=[];
  page.on('pageerror',e=>pageErrors.push(clean(e?.message||e)));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(PROD))httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
  await activate(page,auth,actor);

  const batches=chunks(payload.mutations,80);
  for(let i=0;i<batches.length;i++){
    const batch=batches[i];
    const requestId='i63_'+EXPECTED_SOURCE.slice(0,10)+'_'+clean(process.env.GITHUB_RUN_ID||'run',20)+'_'+String(i+1)+'_'+sha(JSON.stringify(batch.map(m=>[m.action,m.id]))).slice(0,10);
    const opResult=await page.evaluate(async input=>{const p=Orbit.productRuntimeBrowserProvidersP0;const r=await p.callFunction('orbit360ProductOperationalCommand',input,'us-central1');return r&&r.data?r.data:r;},{tenantId:TENANT,activeRole:actor.role,requestId,mutations:batch.map(({expectedBeforeSha256,...m})=>m)});
    need(opResult?.ok===true&&opResult?.serverOwned===true&&Number(opResult?.mutationCount)===batch.length,'I63_OPERATIONAL_APPLY_REJECTED_BATCH_'+String(i+1));
    anyCommitted=true;evidence.apply.batchesCommitted=i+1;evidence.apply.operationalMutations+=batch.length;
  }
  need(evidence.apply.operationalMutations===312,'I63_APPLY_COUNT_MISMATCH');

  const allAfter=await collectionRef(db).get();
  need(allAfter.size===442,'I63_POSTWRITE_DOCUMENT_COUNT');
  for(const m of payload.mutations){const snap=await dataRef(db,m.id).get();need(snap.exists,'I63_POSTWRITE_MISSING:'+m.id);need(subsetEqual(snap.data()||{},m.payload),'I63_POSTWRITE_PAYLOAD_MISMATCH:'+m.id);need(noSecretKeys(snap.data()||{}),'I63_POSTWRITE_SECRET_LEAK:'+m.id);}
  for(const [id,h] of unrelatedBefore){const snap=await dataRef(db,id).get();need(snap.exists&&digest(snap.data()||{})===h,'I63_UNCHANGED_DOC_CHANGED:'+id);}
  for(const x of payload.conflictPreserve){const snap=await dataRef(db,x.id).get();need(snap.exists,'I63_CONFLICT_POSTWRITE_TARGET_MISSING');need(sha(JSON.stringify(stable((snap.data()||{})[x.field])))===x.beforeValueSha256,'I63_AMBIGUOUS_FIELD_CHANGED');}
  evidence.readback={status:'PASS',documentCount:allAfter.size,operationalRowsMatched:312,updatesMatched:300,insertsMatched:12,unchangedRowsVerified:130,ambiguousFieldsPreserved:3,deletes:0};

  await page.reload({waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:12000});
  await page.evaluate(async()=>Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate());
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:15000});
  await page.evaluate(()=>{location.hash='#/cliente360';});
  await page.waitForFunction(()=>Orbit?.route?.key==='cliente360'&&window.OrbitRuntimeDiagnostics?.cliente360?.list?.renderSeq>0,null,{timeout:20000});
  const insertSample=payload.mutations.find(m=>m.action==='insert');
  const updateSample=payload.mutations.find(m=>m.action==='update'&&Object.prototype.hasOwnProperty.call(m.payload||{},'fechaNacimiento'))||payload.mutations.find(m=>m.action==='update');
  need(insertSample&&updateSample,'I63_FUNCTIONAL_SAMPLE_MISSING');
  await page.evaluate(id=>{location.hash='#/cliente360?c='+encodeURIComponent(id);},insertSample.id);
  await page.waitForFunction(id=>Orbit?.route?.key==='cliente360'&&!!Orbit.store?.get?.('clientes',id),insertSample.id,{timeout:15000});
  const uiCheck=await page.evaluate(({insertId,updateId,expected})=>{const ins=Orbit.store.get('clientes',insertId)||{},upd=Orbit.store.get('clientes',updateId)||{};const eq=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);return{route:Orbit.route?.key||'',count:Orbit.store.all('clientes').length,diagTotalRows:window.OrbitRuntimeDiagnostics?.cliente360?.list?.totalRows??null,renderedRows:window.OrbitRuntimeDiagnostics?.cliente360?.list?.renderedRows??null,insertExists:!!ins.id,updateExists:!!upd.id,updateSubset:Object.keys(expected).every(k=>eq(upd[k],expected[k]))};},{insertId:insertSample.id,updateId:updateSample.id,expected:updateSample.payload});
  need(uiCheck.route==='cliente360'&&uiCheck.insertExists&&uiCheck.updateExists&&uiCheck.updateSubset,'I63_FUNCTIONAL_CLIENTE360_DATA');
  need(pageErrors.length===0,'I63_PAGE_ERRORS');
  need(httpErrors.filter(x=>x.status===404).length===0,'I63_HTTP_404');
  evidence.functional={status:'PASS',cliente360Loads:true,runtimeVisibleClientCount:uiCheck.count,diagnosticTotalRows:uiCheck.diagTotalRows,renderedRows:uiCheck.renderedRows,backendReadbackClientCount:442,insertedClientHydrated:true,updatedClientHydrated:true,updatedSampleMatched:true,pageErrors:0,http404:0,actorRole:actor.role};
  evidence.status='PASS';
}catch(error){
  evidence.errors.push(clean(error?.message||error,240));
  if(anyCommitted){
    evidence.rollback.executed=true;
    try{
      let batch=db.batch(),ops=0;
      const flush=async()=>{if(ops){await batch.commit();batch=db.batch();ops=0;}};
      for(const m of payload.mutations){const ref=dataRef(db,m.id);if(m.action==='insert')batch.delete(ref);else batch.set(ref,beforeDocs.get(m.id),{merge:false});ops++;if(ops>=400)await flush();}
      await flush();
      let ok=true;
      const after=await collectionRef(db).get();if(after.size!==430)ok=false;
      for(const m of payload.mutations){const snap=await dataRef(db,m.id).get();if(m.action==='insert'){if(snap.exists)ok=false;}else if(!snap.exists||digest(snap.data()||{})!==m.expectedBeforeSha256)ok=false;}
      evidence.rollback.status=ok?'PASS':'FAIL';
    }catch(rb){evidence.rollback.status='FAIL';evidence.errors.push('ROLLBACK:'+clean(rb?.message||rb,180));}
  }
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'i63-apply-readback-functional.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('I63_STATUS='+evidence.status);
  console.log('I63_OPERATIONAL_MUTATIONS='+evidence.apply.operationalMutations);
  console.log('I63_READBACK='+(evidence.readback.status||'NOT_PASS'));
  console.log('I63_FUNCTIONAL='+(evidence.functional.status||'NOT_PASS'));
  console.log('I63_ROLLBACK='+(evidence.rollback.executed?(evidence.rollback.status||'UNKNOWN'):'NOT_NEEDED'));
}
