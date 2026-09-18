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
const SOURCE='artifacts/orbit360-recovery/release-control/I6_4_POLIZAS_RIESGOS_SOURCE_INTAKE_20260918.json';
const RECEIPT='artifacts/orbit360-recovery/release-control/I6_4_DETERMINISTIC_DIFF_20260918.json';
const PARTS=[1,2,3,4].map(n=>'.github/i6-ephemeral/i64-apply-envelope.part'+String(n).padStart(2,'0'));
const OUT=process.env.I64_EVIDENCE_DIR||path.join(process.env.RUNNER_TEMP||process.cwd(),'i64-evidence');
const SOURCE_SHA='7130ed56467da438f5c6e2823ede65f73d6356de63de94e19da30f3aed26c68f';
const ENVELOPE_SHA='e9964f4a671e9c1858da86eb2c5519fb55a0eea2861ecdb015817dc0d4c53fd3';
const PAYLOAD_SHA='925dd4fbbda44e2532cec253d9d47949358c84df0e0d0c596c48e8153d7ad358';
const GZIP_SHA='24dc9e60e39f6eef4771716090268952d3f8fec3c233670fea31fd5af794b8e6';
const PUBLIC_KEY_SHA='342371840986ee008bdef3ee9523fe9e52509d12a654ac1d4c0fa6b3cb781579';
const BASE={clientes:'a35cf9c55f42f7f7c961579af99ce10aa71fbfe7f8d12d5b98df18b47d2dabff',polizas:'c4b904611b041733caad85133001a8b7ffc536f468bd5c0f434840c8bd9fc4f3',vehiculos:'613ddacae4212d76d3739bec690567b678c9f2776042a3a45ca83413ab099b4d'};
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:Buffer.from(String(v??''),'utf8')).digest('hex');
const stable=v=>{if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(typeof v.toDate==='function'){try{return{$timestamp:v.toDate().toISOString()};}catch{}}if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;};
const digest=v=>sha(JSON.stringify(stable(v)));
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const noSecretKeys=(v)=>{const secret=/^(?:password|pass|pwd|contrasena|contraseña|clave|secret|token|accessToken|refreshToken|privateKey|clientSecret|credentialValue|credential_value)$/i;const walk=x=>{if(!x||typeof x!=='object')return true;for(const [k,y] of Object.entries(x)){if(secret.test(k)&&y!==null&&y!==undefined&&clean(y))return false;if(y&&typeof y==='object'&&!walk(y))return false;}return true;};return walk(v);};
const subsetEqual=(actual,expected)=>{if(expected===null||typeof expected!=='object')return JSON.stringify(stable(actual))===JSON.stringify(stable(expected));if(Array.isArray(expected))return JSON.stringify(stable(actual))===JSON.stringify(stable(expected));if(!actual||typeof actual!=='object')return false;return Object.keys(expected).every(k=>subsetEqual(actual[k],expected[k]));};
function serviceAccount(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I64_SERVICE_ACCOUNT_NOT_AVAILABLE');}
function dataCol(db,n){return db.collection('tenants').doc(TENANT).collection('data').doc(n).collection('items');}
function dataRef(db,n,id){return dataCol(db,n).doc(id);}
function collectionDigest(snap){return sha(snap.docs.map(d=>d.id+'|'+digest(d.data()||{})).sort().join('\n'));}
function chunks(a,n){const out=[];for(let i=0;i<a.length;i+=n)out.push(a.slice(i,i+n));return out;}
function rolesOf(m){return [...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.rolesDisponibles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[]).map(v=>clean(v)).filter(Boolean))];}
async function selectManager(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get();
  const pref=['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'];
  for(const p of pref){for(const d of snap.docs){const m=d.data()||{},uid=clean(m.uid||d.id,180),rs=rolesOf(m),role=rs.find(r=>norm(r)===p),state=norm(m.status||m.estado||'active');if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;try{const u=await auth.getUser(uid);if(!u.disabled&&u.emailVerified===true)return{uid,role};}catch{}}}
  throw new Error('I64_NO_PRIVILEGED_MANAGER_ACTOR');
}
async function activate(page,auth,actor){
  const token=await auth.createCustomToken(actor.uid,{gravicentraI64Delta:true});
  await page.goto(PROD,{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:12000});
  const s=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();},token);
  need(s?.started===true,'I64_PRODUCT_APP_DID_NOT_START');
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:15000});
  const gate=page.locator('[data-legal-gate].open');
  if(await gate.count()){const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');if(await chk.count())await chk.check();if(await ok.count())await ok.click();await gate.waitFor({state:'detached',timeout:5000}).catch(()=>{});}
  const sess=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));
  if(sess.active!==actor.role){need(sess.assigned.includes(actor.role),'I64_MANAGER_ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),actor.role),'I64_MANAGER_ROLE_SWITCH_REJECTED');await page.waitForFunction(r=>Orbit.session?.rol?.()===r,actor.role,{timeout:6000});}
}
function readEnvelope(){
  const raw=PARTS.map(p=>fs.readFileSync(p,'utf8')).join('');
  need(sha(raw)===ENVELOPE_SHA,'I64_ENVELOPE_HASH_MISMATCH');
  const e=JSON.parse(raw);
  need(e.schema==='GRAVICENTRA_I6_4_COMPACT_APPLY_ENVELOPE_V1','I64_ENVELOPE_SCHEMA');
  need(e.sourceBundleSha256===SOURCE_SHA&&e.payloadSha256===PAYLOAD_SHA&&e.plaintextGzipSha256===GZIP_SHA&&e.publicKeySha256===PUBLIC_KEY_SHA,'I64_ENVELOPE_METADATA_MISMATCH');
  need(e.baselinePolicyDigest===BASE.polizas&&e.baselineVehicleDigest===BASE.vehiculos&&e.baselineClientDigest===BASE.clientes,'I64_ENVELOPE_BASELINE_MISMATCH');
  return e;
}
function decryptPayload(e,privateKey){
  const publicKey=crypto.createPublicKey(privateKey).export({type:'spki',format:'pem'});
  need(sha(publicKey)===PUBLIC_KEY_SHA,'I64_PRIVATE_KEY_PUBLIC_FINGERPRINT_MISMATCH');
  const key=crypto.privateDecrypt({key:privateKey,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(e.wrappedKey,'base64'));
  const dec=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));dec.setAuthTag(Buffer.from(e.tag,'base64'));
  const gz=Buffer.concat([dec.update(Buffer.from(e.ciphertext,'base64')),dec.final()]);
  need(sha(gz)===GZIP_SHA,'I64_GZIP_HASH_MISMATCH');
  const plain=zlib.gunzipSync(gz);need(sha(plain)===PAYLOAD_SHA,'I64_PAYLOAD_HASH_MISMATCH');
  const compact=JSON.parse(plain.toString('utf8'));
  need(compact.schema==='GRAVICENTRA_I6_4_COMPACT_APPLY_V1'&&compact.b===SOURCE_SHA&&Array.isArray(compact.m),'I64_COMPACT_PAYLOAD_INVALID');
  const collections=['polizas','vehiculos'], actions=['update','insert'];
  return compact.m.map((m,i)=>{need(Array.isArray(m)&&m.length===4,'I64_MUTATION_TUPLE_'+i);const [ci,ai,id,payload]=m;need(collections[ci]&&actions[ai]&&clean(id,256)&&payload&&typeof payload==='object'&&!Array.isArray(payload),'I64_MUTATION_TUPLE_VALUES_'+i);return{collection:collections[ci],action:actions[ai],id:clean(id,256),payload};});
}
async function relationAudit(db){
  const [cs,ps,vs]=await Promise.all([dataCol(db,'clientes').get(),dataCol(db,'polizas').get(),dataCol(db,'vehiculos').get()]);
  const clients=new Map(cs.docs.map(d=>[d.id,d.data()||{}])), policies=new Map(ps.docs.map(d=>[d.id,d.data()||{}]));
  let policyClientMissing=0,policyClientTombstone=0,vehiclePolicyMissing=0,vehicleClientMissing=0,vehicleClientTombstone=0;
  for(const d of ps.docs){const x=d.data()||{},cid=clean(x.clienteId,256);if(cid){const c=clients.get(cid);if(!c)policyClientMissing++;else if(c.fusionado===true||clean(c.mergedIntoClientId,256))policyClientTombstone++;}}
  for(const d of vs.docs){const x=d.data()||{},pid=clean(x.polizaId,256),cid=clean(x.clienteId,256);if(pid&&!policies.has(pid))vehiclePolicyMissing++;if(cid){const c=clients.get(cid);if(!c)vehicleClientMissing++;else if(c.fusionado===true||clean(c.mergedIntoClientId,256))vehicleClientTombstone++;}}
  const canonicalClients=cs.docs.filter(d=>{const x=d.data()||{};return x.fusionado!==true&&!clean(x.mergedIntoClientId,256);}).length;
  return{policyClientMissing,policyClientTombstone,vehiclePolicyMissing,vehicleClientMissing,vehicleClientTombstone,canonicalClients};
}

fs.mkdirSync(OUT,{recursive:true});
const evidence={schema:'GRAVICENTRA_I6_4_APPLY_READBACK_INTEGRITY_FUNCTIONAL_V1',gate:'I6.4',module:'POLIZAS_RIESGOS_VEHICULOS',status:'FAIL',sourceBundleSha256:SOURCE_SHA,diff:{policyUpdates:486,policyInserts:41,vehicleUpdates:352,vehicleInserts:31,totalMutations:910,deletes:0,hardHolds:2},apply:{operationalMutations:0,batchesCommitted:0,deletes:0},readback:{},integrity:{},functional:{},rollback:{executed:false},containsPII:false,containsSecrets:false,errors:[]};
const cp=JSON.parse(fs.readFileSync(CONTROL,'utf8')),src=JSON.parse(fs.readFileSync(SOURCE,'utf8')),receipt=JSON.parse(fs.readFileSync(RECEIPT,'utf8'));
need(cp.gateState?.gates?.I6?.status==='I6_4_DATA_UPDATE_V5_ACTIVE'&&cp.gateState?.gates?.I6?.activeSubgate==='I6.4','I64_GATE_NOT_ACTIVE');
need(cp.nextAction==='I6_4_APPLY_DETERMINISTIC_DELTA','I64_APPLY_NOT_CURRENT_ACTION');
need(src.status==='PINNED_FOR_V5_DELTA'&&src.execution?.cursorState==='DETERMINISTIC_DIFF_READY'&&src.sourceBundle?.sha256===SOURCE_SHA,'I64_SOURCE_OR_CURSOR_MISMATCH');
need(receipt.status==='DETERMINISTIC_DIFF_READY'&&receipt.diff?.totalMutations===910&&receipt.applyContract?.writePath==='orbit360ProductOperationalCommand','I64_DIFF_RECEIPT_INVALID');

const sa=serviceAccount(),mutations=decryptPayload(readEnvelope(),sa.private_key);
need(mutations.length===910,'I64_MUTATION_COUNT');
need(mutations.filter(m=>m.collection==='polizas'&&m.action==='update').length===486,'I64_POLICY_UPDATE_COUNT');
need(mutations.filter(m=>m.collection==='polizas'&&m.action==='insert').length===41,'I64_POLICY_INSERT_COUNT');
need(mutations.filter(m=>m.collection==='vehiculos'&&m.action==='update').length===352,'I64_VEHICLE_UPDATE_COUNT');
need(mutations.filter(m=>m.collection==='vehiculos'&&m.action==='insert').length===31,'I64_VEHICLE_INSERT_COUNT');
need(mutations.every(m=>['polizas','vehiculos'].includes(m.collection)&&['update','insert'].includes(m.action)&&noSecretKeys(m.payload)),'I64_UNSAFE_OPERATIONAL_PAYLOAD');
need(new Set(mutations.map(m=>m.collection+'|'+m.id)).size===910,'I64_DUPLICATE_MUTATION_TARGET');

const app=initializeApp({credential:cert(sa),projectId:PROJECT},'i64-delta'),db=getFirestore(app),auth=getAuth(app);
let browser=null,anyCommitted=false;
const beforeDocs=new Map(),unrelatedBefore={polizas:new Map(),vehiculos:new Map()};
try{
  const [clientsBefore,polBefore,vehBefore,renBefore]=await Promise.all([dataCol(db,'clientes').get(),dataCol(db,'polizas').get(),dataCol(db,'vehiculos').get(),dataCol(db,'renovaciones').get()]);
  need(clientsBefore.size===442&&polBefore.size===1373&&vehBefore.size===1032&&renBefore.size===0,'I64_BASELINE_COUNT_DRIFT');
  need(collectionDigest(clientsBefore)===BASE.clientes&&collectionDigest(polBefore)===BASE.polizas&&collectionDigest(vehBefore)===BASE.vehiculos,'I64_BASELINE_DIGEST_DRIFT');
  const targetSets={polizas:new Set(),vehiculos:new Set()};
  for(const m of mutations)targetSets[m.collection].add(m.id);
  for(const [name,snap] of [['polizas',polBefore],['vehiculos',vehBefore]])for(const d of snap.docs){if(targetSets[name].has(d.id))beforeDocs.set(name+'|'+d.id,d.data()||{});else unrelatedBefore[name].set(d.id,digest(d.data()||{}));}
  need(unrelatedBefore.polizas.size===887,'I64_UNRELATED_POLICY_BASELINE_COUNT');
  need(unrelatedBefore.vehiculos.size===680,'I64_UNRELATED_VEHICLE_BASELINE_COUNT');
  for(const m of mutations){const snap=await dataRef(db,m.collection,m.id).get();if(m.action==='update')need(snap.exists,'I64_UPDATE_TARGET_MISSING:'+m.collection);else need(!snap.exists,'I64_INSERT_TARGET_EXISTS:'+m.collection);}

  const actor=await selectManager(db,auth);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const pageErrors=[],httpErrors=[];
  page.on('pageerror',e=>pageErrors.push(clean(e?.message||e)));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(PROD))httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
  await activate(page,auth,actor);

  const batches=chunks(mutations,80);
  need(batches.length===12,'I64_BATCH_COUNT');
  for(let i=0;i<batches.length;i++){
    const batch=batches[i];
    const requestId='i64_'+SOURCE_SHA.slice(0,10)+'_'+clean(process.env.GITHUB_RUN_ID||'run',20)+'_'+String(i+1)+'_'+sha(JSON.stringify(batch.map(m=>[m.collection,m.action,m.id]))).slice(0,10);
    const opResult=await page.evaluate(async input=>{const p=Orbit.productRuntimeBrowserProvidersP0;const r=await p.callFunction('orbit360ProductOperationalCommand',input,'us-central1');return r&&r.data?r.data:r;},{tenantId:TENANT,activeRole:actor.role,requestId,mutations:batch});
    need(opResult?.ok===true&&opResult?.serverOwned===true&&Number(opResult?.mutationCount)===batch.length,'I64_OPERATIONAL_APPLY_REJECTED_BATCH_'+String(i+1));
    anyCommitted=true;evidence.apply.batchesCommitted=i+1;evidence.apply.operationalMutations+=batch.length;
  }
  need(evidence.apply.operationalMutations===910,'I64_APPLY_COUNT_MISMATCH');

  const [clientsAfter,polAfter,vehAfter,renAfter]=await Promise.all([dataCol(db,'clientes').get(),dataCol(db,'polizas').get(),dataCol(db,'vehiculos').get(),dataCol(db,'renovaciones').get()]);
  need(clientsAfter.size===442&&polAfter.size===1414&&vehAfter.size===1063&&renAfter.size===0,'I64_POSTWRITE_COUNT_MISMATCH');
  need(collectionDigest(clientsAfter)===BASE.clientes,'I64_CLIENT_COLLECTION_CHANGED');
  for(const m of mutations){const snap=await dataRef(db,m.collection,m.id).get();need(snap.exists,'I64_POSTWRITE_TARGET_MISSING:'+m.collection);need(subsetEqual(snap.data()||{},m.payload),'I64_POSTWRITE_PAYLOAD_MISMATCH:'+m.collection);need(noSecretKeys(snap.data()||{}),'I64_POSTWRITE_SECRET_LEAK:'+m.collection);}
  for(const name of ['polizas','vehiculos'])for(const [id,h] of unrelatedBefore[name]){const snap=await dataRef(db,name,id).get();need(snap.exists&&digest(snap.data()||{})===h,'I64_UNRELATED_DOC_CHANGED:'+name);}
  const rel=await relationAudit(db);
  need(rel.policyClientMissing===0&&rel.policyClientTombstone===0&&rel.vehiclePolicyMissing===0&&rel.vehicleClientMissing===0&&rel.vehicleClientTombstone===0&&rel.canonicalClients===439,'I64_RELATIONSHIP_INTEGRITY_FAIL');
  evidence.readback={status:'PASS',polizas:1414,vehiculos:1063,clientesPhysical:442,clientesCanonicalActive:439,renovaciones:0,mutatedRowsMatched:910,unrelatedPoliciesVerified:887,unrelatedVehiclesVerified:680,deletes:0};
  evidence.integrity={status:'PASS',...rel,clientCollectionUnchanged:true,noPolicyDelete:true,noVehicleDelete:true};

  await page.reload({waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:12000});
  await page.evaluate(async()=>Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate());
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:15000});
  await page.evaluate(()=>{location.hash='#/polizas';});
  await page.waitForFunction(()=>Orbit?.route?.key==='polizas',null,{timeout:15000});
  const insertPolicy=mutations.find(m=>m.collection==='polizas'&&m.action==='insert'),insertVehicle=mutations.find(m=>m.collection==='vehiculos'&&m.action==='insert');
  need(insertPolicy&&insertVehicle,'I64_FUNCTIONAL_INSERT_SAMPLE_MISSING');
  const ui=await page.evaluate(({pid,vid})=>({route:Orbit.route?.key||'',polizas:(Orbit.store?.all?.('polizas')||[]).length,vehiculos:(Orbit.store?.all?.('vehiculos')||[]).length,policySample:!!Orbit.store?.get?.('polizas',pid),vehicleSample:!!Orbit.store?.get?.('vehiculos',vid)}),{pid:insertPolicy.id,vid:insertVehicle.id});
  need(ui.route==='polizas'&&ui.polizas===1414&&ui.vehiculos===1063&&ui.policySample&&ui.vehicleSample,'I64_FUNCTIONAL_RUNTIME_DATA');
  need(pageErrors.length===0,'I64_PAGE_ERRORS');
  need(httpErrors.filter(x=>x.status===404).length===0,'I64_HTTP_404');
  evidence.functional={status:'PASS',polizasRouteLoads:true,runtimePolicyCount:ui.polizas,runtimeVehicleCount:ui.vehiculos,insertedPolicyHydrated:true,insertedVehicleHydrated:true,pageErrors:0,http404:0,actorRole:actor.role};
  evidence.status='PASS';
}catch(error){
  evidence.errors.push(clean(error?.message||error,300));
  if(anyCommitted){
    evidence.rollback.executed=true;
    try{
      let batch=db.batch(),ops=0;
      const flush=async()=>{if(ops){await batch.commit();batch=db.batch();ops=0;}};
      for(const m of mutations){const ref=dataRef(db,m.collection,m.id);if(m.action==='insert')batch.delete(ref);else batch.set(ref,beforeDocs.get(m.collection+'|'+m.id),{merge:false});ops++;if(ops>=400)await flush();}
      await flush();
      const [ca,pa,va,ra]=await Promise.all([dataCol(db,'clientes').get(),dataCol(db,'polizas').get(),dataCol(db,'vehiculos').get(),dataCol(db,'renovaciones').get()]);
      const ok=ca.size===442&&pa.size===1373&&va.size===1032&&ra.size===0&&collectionDigest(ca)===BASE.clientes&&collectionDigest(pa)===BASE.polizas&&collectionDigest(va)===BASE.vehiculos;
      evidence.rollback.status=ok?'PASS':'FAIL';
    }catch(rb){evidence.rollback.status='FAIL';evidence.errors.push('ROLLBACK:'+clean(rb?.message||rb,220));}
  }
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'i64-apply-readback-integrity-functional.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('I64_STATUS='+evidence.status);
  console.log('I64_OPERATIONAL_MUTATIONS='+evidence.apply.operationalMutations);
  console.log('I64_READBACK='+(evidence.readback.status||'NOT_PASS'));
  console.log('I64_INTEGRITY='+(evidence.integrity.status||'NOT_PASS'));
  console.log('I64_FUNCTIONAL='+(evidence.functional.status||'NOT_PASS'));
  console.log('I64_ROLLBACK='+(evidence.rollback.executed?(evidence.rollback.status||'UNKNOWN'):'NOT_NEEDED'));
}