import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const PROD='https://ays-orbit-360-lab.web.app';
const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const SOURCE='artifacts/orbit360-recovery/release-control/I6_2_DIRECTORIO_SOURCE_INTAKE_20260917.json';
const PART_ROOT='.github/i6-ephemeral/i62-apply-envelope.part';
const OUT=process.env.I62_EVIDENCE_DIR||path.join(process.env.RUNNER_TEMP||process.cwd(),'i62-evidence');
const EXPECTED_SOURCE='f2e57fa72ff1b94b110b5037038c6c47fbc727c513f9eebd2348d7f4f2244083';
const SECRET_NAME='orbit360-insurer-credentials-'+TENANT;
const ADMIN_MANAGE=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin']);
const SECRET_KEY=/^(?:password|pass|pwd|contrasena|contraseña|clave|secret|token|accessToken|refreshToken|privateKey|clientSecret|credentialValue|credential_value)$/i;
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:Buffer.from(String(v??''),'utf8')).digest('hex');
const stable=v=>{if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(typeof v.toDate==='function'){try{return{$timestamp:v.toDate().toISOString()};}catch{}}if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;};
const digest=v=>sha(JSON.stringify(stable(v)));
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const dataRef=(db,id)=>db.collection('tenants').doc(TENANT).collection('data').doc('aseguradoras').collection('items').doc(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('I62_SERVICE_ACCOUNT_NOT_AVAILABLE');
}
function readEnvelope(){
  let raw='';
  for(let i=1;i<=8;i++)raw+=fs.readFileSync(PART_ROOT+String(i).padStart(2,'0'),'utf8');
  const e=JSON.parse(raw);
  need(e.schema==='GRAVICENTRA_I6_2_APPLY_ENVELOPE_GZIP_V1','I62_ENVELOPE_SCHEMA');
  return e;
}
function decryptPayload(envelope,privateKey){
  const key=crypto.privateDecrypt({key:privateKey,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(envelope.wrappedKey,'base64'));
  const dec=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
  dec.setAuthTag(Buffer.from(envelope.tag,'base64'));
  const gz=Buffer.concat([dec.update(Buffer.from(envelope.ciphertext,'base64')),dec.final()]);
  need(sha(gz)===envelope.plaintextGzipSha256,'I62_ENVELOPE_GZIP_HASH_MISMATCH');
  const plain=zlib.gunzipSync(gz);
  return JSON.parse(plain.toString('utf8'));
}
function rolesOf(m){
  return [...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.role||[],m?.rol||[],m?.rolDefault||[]).map(clean).filter(Boolean))];
}
async function selectManager(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get();
  const pref=['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'];
  for(const p of pref){
    for(const d of snap.docs){
      const m=d.data()||{},uid=clean(m.uid||d.id,180),rs=rolesOf(m),role=rs.find(r=>norm(r)===p);
      const state=norm(m.status||m.estado||'active');
      if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;
      try{const u=await auth.getUser(uid);if(!u.disabled&&u.emailVerified===true)return{uid,role};}catch{}
    }
  }
  throw new Error('I62_NO_PRIVILEGED_MANAGER_ACTOR');
}
async function activate(page,auth,actor){
  const token=await auth.createCustomToken(actor.uid,{gravicentraI62Delta:true});
  await page.goto(PROD,{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:12000});
  const s=await page.evaluate(async tok=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);
    return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();
  },token);
  need(s?.started===true,'I62_PRODUCT_APP_DID_NOT_START');
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:15000});
  const gate=page.locator('[data-legal-gate].open');
  if(await gate.count()){
    const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');
    if(await chk.count())await chk.check();
    if(await ok.count())await ok.click();
    await gate.waitFor({state:'detached',timeout:5000}).catch(()=>{});
  }
  const sess=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));
  if(sess.active!==actor.role){
    need(sess.assigned.includes(actor.role),'I62_MANAGER_ROLE_NOT_ASSIGNED');
    need(await page.evaluate(r=>Orbit.session.set(r),actor.role),'I62_MANAGER_ROLE_SWITCH_REJECTED');
    await page.waitForFunction(r=>Orbit.session?.rol?.()===r,actor.role,{timeout:6000});
  }
}
async function readVault(sm){
  const [v]=await sm.accessSecretVersion({name:`projects/${PROJECT}/secrets/${SECRET_NAME}/versions/latest`});
  const raw=v?.payload?.data?Buffer.from(v.payload.data).toString('utf8'):'';
  return raw?JSON.parse(raw):{tenantId:TENANT,records:{}};
}
async function restoreVault(sm,vault){
  await sm.addSecretVersion({parent:`projects/${PROJECT}/secrets/${SECRET_NAME}`,payload:{data:Buffer.from(JSON.stringify(vault),'utf8')}});
}
function noSecretKeys(v,p=''){
  if(!v||typeof v!=='object')return true;
  for(const [k,x] of Object.entries(v)){
    if(SECRET_KEY.test(k)&&x!==null&&x!==undefined&&clean(x))return false;
    if(x&&typeof x==='object'&&!noSecretKeys(x,p+'.'+k))return false;
  }
  return true;
}
function subsetEqual(actual,expected){
  if(expected===null||typeof expected!=='object')return JSON.stringify(stable(actual))===JSON.stringify(stable(expected));
  if(Array.isArray(expected))return JSON.stringify(stable(actual))===JSON.stringify(stable(expected));
  if(!actual||typeof actual!=='object')return false;
  return Object.keys(expected).every(k=>subsetEqual(actual[k],expected[k]));
}

fs.mkdirSync(OUT,{recursive:true});
const evidence={schema:'GRAVICENTRA_I6_2_APPLY_READBACK_FUNCTIONAL_V1',gate:'I6.2',status:'FAIL',sourceSha256:EXPECTED_SOURCE,diff:{},apply:{operationalMutations:0,credentialUpdates:0,deletes:0},readback:{},functional:{},rollback:{executed:false},containsSecrets:false,errors:[]};
const cp=JSON.parse(fs.readFileSync(CONTROL,'utf8')),src=JSON.parse(fs.readFileSync(SOURCE,'utf8'));
need(cp.status==='PRODUCTION_ACCEPTED','I62_BASELINE_NOT_ACCEPTED');
need(cp.gateState?.gates?.I6?.status==='I6_2_DATA_UPDATE_V5_ACTIVE'&&cp.gateState?.gates?.I6?.activeSubgate==='I6.2','I62_GATE_NOT_ACTIVE');
need(cp.i6Execution?.authorized===true&&cp.i6Execution?.dataUpdateMode==='EVERGREEN_V5_DELTA_FIRST','I62_V5_EXECUTION_NOT_AUTHORIZED');
need(cp.i6Execution?.perBlockApplyRequiresExplicitAuthorization===false,'I62_V5_APPLY_POLICY_NOT_ACTIVE');
need(src.status==='PINNED_FOR_V5_DELTA'&&src.source?.sha256===EXPECTED_SOURCE,'I62_SOURCE_MISMATCH');

const sa=serviceAccount(),payload=decryptPayload(readEnvelope(),sa.private_key);
need(payload.schema==='GRAVICENTRA_I6_2_DETERMINISTIC_DELTA_PAYLOAD_V1','I62_PAYLOAD_SCHEMA');
need(payload.sourceSha256===EXPECTED_SOURCE,'I62_PAYLOAD_SOURCE_MISMATCH');
need(Array.isArray(payload.mutations)&&payload.mutations.length===14,'I62_MUTATION_COUNT');
need(Array.isArray(payload.credentialItems)&&payload.credentialItems.length===3,'I62_CREDENTIAL_COUNT');
need(payload.mutations.every(m=>m.collection==='aseguradoras'&&['update','insert'].includes(m.action)&&noSecretKeys(m.payload)),'I62_UNSAFE_OPERATIONAL_PAYLOAD');
evidence.diff={sourceInsurers:payload.summary?.sourceInsurers||14,updates:payload.summary?.updates||13,inserts:payload.summary?.inserts||1,deletes:0,credentialChanges:payload.credentialItems.length,contactsSource:payload.summary?.contactsSource||0,portalsSource:payload.summary?.portalsSource||0,accountsSource:payload.summary?.accountsSource||0,portalsBeforeRelevant:payload.summary?.portalsBeforeRelevant||0,portalsAfterRelevant:payload.summary?.portalsAfterRelevant||0,accountsBeforeRelevant:payload.summary?.accountsBeforeRelevant||0,accountsAfterRelevant:payload.summary?.accountsAfterRelevant||0};

const app=initializeApp({credential:cert(sa),projectId:PROJECT},'i62-delta');
const db=getFirestore(app),auth=getAuth(app),sm=new SecretManagerServiceClient({credentials:{client_email:sa.client_email,private_key:sa.private_key},projectId:PROJECT});
let browser,operationalCommitted=false,credentialCommitted=false;
const beforeDocs=new Map(),unrelatedBefore=new Map();
const beforeVault=await readVault(sm);
try{
  const allBefore=await db.collection('tenants').doc(TENANT).collection('data').doc('aseguradoras').collection('items').get();
  need(allBefore.size===Number(payload.summary?.liveDocumentsTotal||30),'I62_LIVE_DOCUMENT_COUNT_DRIFT');
  const mutationIds=new Set(payload.mutations.map(m=>m.id));
  for(const d of allBefore.docs){
    const row=d.data()||{};
    if(mutationIds.has(d.id))beforeDocs.set(d.id,row); else unrelatedBefore.set(d.id,digest(row));
  }
  for(const m of payload.mutations){
    const snap=await dataRef(db,m.id).get();
    if(m.action==='update'){need(snap.exists,'I62_UPDATE_TARGET_MISSING:'+m.id);need(digest(snap.data()||{})===m.expectedBeforeSha256,'I62_PREWRITE_DRIFT:'+m.id);}
    else need(!snap.exists,'I62_INSERT_TARGET_EXISTS:'+m.id);
  }
  for(const item of payload.credentialItems){
    const before=beforeVault.records?.[item.credentialRef];
    need(before&&before.insurerId===item.insurerId&&before.portalId===item.portalId,'I62_CREDENTIAL_TARGET_DRIFT:'+item.insurerId);
    need(sha(clean(before.password,512))===item.expectedOldPasswordSha256,'I62_CREDENTIAL_OLD_HASH_DRIFT:'+item.insurerId);
    need(sha(clean(item.password,512))===item.expectedNewPasswordSha256,'I62_CREDENTIAL_NEW_HASH_MISMATCH:'+item.insurerId);
  }

  const actor=await selectManager(db,auth);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  const pageErrors=[],httpErrors=[];
  page.on('pageerror',e=>pageErrors.push(clean(e?.message||e)));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(PROD))httpErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
  await activate(page,auth,actor);

  const requestId='i62_'+EXPECTED_SOURCE.slice(0,12)+'_'+sha(JSON.stringify(payload.mutations.map(m=>[m.action,m.id,m.expectedBeforeSha256]))).slice(0,16);
  const opResult=await page.evaluate(async input=>{
    const p=Orbit.productRuntimeBrowserProvidersP0;
    const r=await p.callFunction('orbit360ProductOperationalCommand',input,'us-central1');
    return r&&r.data?r.data:r;
  },{tenantId:TENANT,activeRole:actor.role,requestId,mutations:payload.mutations.map(({expectedBeforeSha256,...m})=>m)});
  need(opResult?.ok===true&&opResult?.serverOwned===true&&Number(opResult?.mutationCount)===payload.mutations.length,'I62_OPERATIONAL_APPLY_REJECTED');
  operationalCommitted=true;
  evidence.apply.operationalMutations=payload.mutations.length;

  const credResult=await page.evaluate(async input=>{
    const p=Orbit.productRuntimeBrowserProvidersP0;
    const r=await p.callFunction('orbit360ProductInsurerCredentialCommand',input,'us-central1');
    return r&&r.data?r.data:r;
  },{operation:'import',tenantId:TENANT,activeRole:actor.role,sourceHash:EXPECTED_SOURCE,items:payload.credentialItems.map(x=>({insurerId:x.insurerId,portalId:x.portalId,resourceId:x.portalId,credentialRef:x.credentialRef,username:x.username,password:x.password}))});
  need(credResult?.ok===true&&Number(credResult?.imported)===payload.credentialItems.length&&credResult?.containsSecrets===false,'I62_CREDENTIAL_APPLY_REJECTED');
  credentialCommitted=true;
  evidence.apply.credentialUpdates=payload.credentialItems.length;

  const allAfter=await db.collection('tenants').doc(TENANT).collection('data').doc('aseguradoras').collection('items').get();
  need(allAfter.size===31,'I62_POSTWRITE_DOCUMENT_COUNT');
  for(const m of payload.mutations){
    const snap=await dataRef(db,m.id).get();need(snap.exists,'I62_POSTWRITE_MISSING:'+m.id);
    need(subsetEqual(snap.data()||{},m.payload),'I62_POSTWRITE_PAYLOAD_MISMATCH:'+m.id);
    need(noSecretKeys(snap.data()||{}),'I62_POSTWRITE_SECRET_LEAK:'+m.id);
  }
  for(const [id,h] of unrelatedBefore){
    const snap=await dataRef(db,id).get();need(snap.exists&&digest(snap.data()||{})===h,'I62_UNRELATED_DOC_CHANGED:'+id);
  }
  const postVault=await readVault(sm);
  for(const item of payload.credentialItems){
    const row=postVault.records?.[item.credentialRef];
    need(row&&row.insurerId===item.insurerId&&row.portalId===item.portalId,'I62_CREDENTIAL_READBACK_TARGET:'+item.insurerId);
    need(sha(clean(row.password,512))===item.expectedNewPasswordSha256,'I62_CREDENTIAL_READBACK_HASH:'+item.insurerId);
    need(!item.username||clean(row.username,320)===clean(item.username,320),'I62_CREDENTIAL_USERNAME_READBACK:'+item.insurerId);
  }
  evidence.readback={status:'PASS',documentCount:allAfter.size,operationalRowsMatched:payload.mutations.length,credentialRowsMatched:payload.credentialItems.length,unrelatedRowsUnchanged:unrelatedBefore.size,secretMaterialInOperationalDocs:false,newInsurerPresent:(await dataRef(db,'gt-seguros-ole').get()).exists};

  await page.evaluate(()=>{location.hash='#/aseguradoras';});
  await page.waitForFunction(()=>Orbit?.route?.key==='aseguradoras'&&!!document.querySelector('.asg-grid'),null,{timeout:15000});
  await page.waitForFunction(()=>!!Orbit.store?.get?.('aseguradoras','gt-seguros-ole'),null,{timeout:15000});
  const visible=await page.evaluate(()=>({
    ole:!!Orbit.store.get('aseguradoras','gt-seguros-ole'),
    ruralCode:String(Orbit.store.get('aseguradoras','gt-aseguradora-rural')?.codigoIntermediario||Orbit.store.get('aseguradoras','gt-aseguradora-rural')?.codigo||''),
    route:Orbit.route?.key||''
  }));
  need(visible.ole&&visible.ruralCode==='161'&&visible.route==='aseguradoras','I62_FUNCTIONAL_DIRECTORY_DATA');
  const changed=payload.credentialItems[0];
  await page.evaluate(id=>{location.hash='#/aseguradoras?ficha='+encodeURIComponent(id);},changed.insurerId);
  await page.waitForFunction(id=>Orbit?.route?.key==='aseguradoras'&&!!Orbit.store?.get?.('aseguradoras',id)&&!!document.querySelector('#asg-ficha'),changed.insurerId,{timeout:15000});
  const credFunctional=await page.evaluate(async x=>{
    const row=Orbit.store.get('aseguradoras',x.insurerId)||{};
    const portal=(row.portales||[]).find(p=>String(p.credentialRef||'')===x.credentialRef);
    if(!portal)return{portal:false};
    const enc=new TextEncoder();
    const hex=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(v||''))))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const reveal=await Orbit.secureResources.revealCredential(x.credentialRef,{module:'aseguradoras',insurerId:x.insurerId});
    const copy=await Orbit.secureResources.copyCredential(x.credentialRef,{module:'aseguradoras',insurerId:x.insurerId});
    const user=String(portal.usuario||portal.user||portal.login||portal.emailUsuario||portal.correoUsuario||'');
    return{portal:true,userOk:user===String(x.username||''),revealOk:!!reveal?.ok,revealHash:reveal?.ok?await hex(reveal.value):'',copyOk:!!copy?.ok,copyHash:copy?.ok?await hex(copy.value):'',bankVisible:(row.cuentas||[]).some(a=>!!String(a.numero||a.numeroCuenta||a.accountNumber||'').trim())};
  },{insurerId:changed.insurerId,credentialRef:changed.credentialRef,username:changed.username});
  need(credFunctional.portal&&credFunctional.userOk&&credFunctional.revealOk&&credFunctional.copyOk,'I62_FUNCTIONAL_CREDENTIAL_ACCESS');
  need(credFunctional.revealHash===changed.expectedNewPasswordSha256&&credFunctional.copyHash===changed.expectedNewPasswordSha256,'I62_FUNCTIONAL_CREDENTIAL_VALUE_HASH');
  need(credFunctional.bankVisible,'I62_FUNCTIONAL_BANK_VISIBLE');
  need(pageErrors.length===0,'I62_PAGE_ERRORS');
  need(httpErrors.filter(x=>x.status===404).length===0,'I62_HTTP_404');
  await page.evaluate(()=>{location.hash='#/aseguradoras';});
  await page.waitForFunction(()=>Orbit?.route?.key==='aseguradoras'&&!!document.querySelector('.asg-grid'),null,{timeout:10000});
  await page.screenshot({path:path.join(OUT,'aseguradoras-live-directory.png'),fullPage:true});
  evidence.functional={status:'PASS',directoryLoads:true,newInsurerVisible:true,ruralCodeUpdated:true,usernameVisibleAndMatched:true,passwordRevealMatchedByHash:true,passwordCopyMatchedByHash:true,bankAccountVisible:true,pageErrors:0,http404:0,actorRole:actor.role};

  evidence.status='PASS';
}catch(error){
  evidence.errors.push(clean(error?.message||error,240));
  if(operationalCommitted||credentialCommitted){
    evidence.rollback.executed=true;
    try{
      const batch=db.batch();
      for(const m of payload.mutations){
        const ref=dataRef(db,m.id);
        if(m.action==='insert')batch.delete(ref);else batch.set(ref,beforeDocs.get(m.id),{merge:false});
      }
      await batch.commit();
      if(credentialCommitted)await restoreVault(sm,beforeVault);
      let ok=true;
      for(const m of payload.mutations){
        const snap=await dataRef(db,m.id).get();
        if(m.action==='insert'){if(snap.exists)ok=false;}else if(!snap.exists||digest(snap.data()||{})!==m.expectedBeforeSha256)ok=false;
      }
      evidence.rollback.status=ok?'PASS':'FAIL';
    }catch(rb){evidence.rollback.status='FAIL';evidence.errors.push('ROLLBACK:'+clean(rb?.message||rb,180));}
  }
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'i62-apply-readback-functional.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('I62_STATUS='+evidence.status);
  console.log('I62_OPERATIONAL_MUTATIONS='+evidence.apply.operationalMutations);
  console.log('I62_CREDENTIAL_UPDATES='+evidence.apply.credentialUpdates);
  console.log('I62_READBACK='+(evidence.readback.status||'NOT_PASS'));
  console.log('I62_FUNCTIONAL='+(evidence.functional.status||'NOT_PASS'));
  console.log('I62_ROLLBACK='+(evidence.rollback.executed?(evidence.rollback.status||'UNKNOWN'):'NOT_NEEDED'));
}
