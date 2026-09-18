import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab', TENANT='alianzas-soluciones', PROD='https://ays-orbit-360-lab.web.app';
const ENVELOPE='.github/i6-ephemeral/i63-clientes-apply-envelope.encrypted.json';
const OUT=process.env.I63_CASE_EVIDENCE_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i63-client-name-case.json');
const EXPECTED_PAYLOAD_SHA='85af65dec822dad6a4c40be5d89202ae5c9f44d302e4e9ea0b4d850f01cc9af7';
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const need=(x,c)=>{if(!x)throw new Error(c);};
function serviceAccount(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I63_CASE_SERVICE_ACCOUNT');}
function decryptPayload(sa){
  const e=JSON.parse(fs.readFileSync(ENVELOPE,'utf8'));
  need(e.schema==='GRAVICENTRA_I6_3_APPLY_ENVELOPE_GZIP_V1','I63_CASE_ENVELOPE_SCHEMA');
  const key=crypto.privateDecrypt({key:sa.private_key,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(e.wrappedKey,'base64'));
  const dec=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));dec.setAuthTag(Buffer.from(e.tag,'base64'));
  const plain=zlib.gunzipSync(Buffer.concat([dec.update(Buffer.from(e.ciphertext,'base64')),dec.final()]));
  const h=crypto.createHash('sha256').update(plain).digest('hex');need(h===EXPECTED_PAYLOAD_SHA,'I63_CASE_PAYLOAD_HASH');
  return JSON.parse(plain.toString('utf8'));
}
function rolesOf(m){return [...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.rolesDisponibles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[]).map(clean).filter(Boolean))];}
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
async function selectManager(db,auth){const snap=await db.collection('tenants').doc(TENANT).collection('members').get();for(const p of ['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'])for(const d of snap.docs){const m=d.data()||{},uid=clean(m.uid||d.id,180),role=rolesOf(m).find(r=>norm(r)===p),state=norm(m.status||m.estado||'active');if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;try{const u=await auth.getUser(uid);if(!u.disabled)return{uid,role};}catch{}}throw new Error('I63_CASE_NO_MANAGER');}
async function activate(page,auth,actor){const token=await auth.createCustomToken(actor.uid,{gravicentraI63Case:true});await page.goto(PROD,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:15000});const s=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();},token);need(s?.started===true,'I63_CASE_APP_START');const sess=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));if(sess.active!==actor.role){need(sess.assigned.includes(actor.role),'I63_CASE_ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),actor.role),'I63_CASE_ROLE_SWITCH');await page.waitForFunction(r=>Orbit.session?.rol?.()===r,actor.role,{timeout:6000});}}
const sa=serviceAccount(), payload=decryptPayload(sa);
const inserts=(payload.mutations||[]).filter(m=>m.action==='insert');
need(inserts.length===12,'I63_CASE_INSERT_COUNT');
const app=initializeApp({credential:cert(sa),projectId:PROJECT},'i63-case'), db=getFirestore(app), auth=getAuth(app);
let browser=null, committed=false, originals=[];
const ev={schema:'GRAVICENTRA_I6_3_CLIENT_NAME_CASE_V1',status:'FAIL',targets:12,writes:0,alreadyUppercase:0,readback:false,backendCount:null,rollback:{executed:false},containsPII:false,containsSecrets:false,errors:[]};
try{
  const col=db.collection('tenants').doc(TENANT).collection('data').doc('clientes').collection('items');
  const snap=await col.get();need(snap.size===442,'I63_CASE_BACKEND_COUNT_BEFORE');
  const mutations=[];
  for(const m of inserts){
    const d=await col.doc(m.id).get();need(d.exists,'I63_CASE_TARGET_MISSING');
    const row=d.data()||{}, current=clean(row.nombre,300);need(current,'I63_CASE_NAME_EMPTY');
    const expectedSource=clean(m.payload?.nombre,300);
    need(!expectedSource||norm(current)===norm(expectedSource),'I63_CASE_NAME_IDENTITY_DRIFT');
    const upper=current.toLocaleUpperCase('es');
    originals.push({id:m.id,nombre:current});
    if(current===upper){ev.alreadyUppercase++;continue;}
    mutations.push({collection:'clientes',action:'update',id:m.id,payload:{nombre:upper}});
  }
  if(mutations.length){
    const actor=await selectManager(db,auth);
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    await activate(page,auth,actor);
    const requestId='i63_case_'+clean(process.env.GITHUB_RUN_ID||'run',24)+'_'+crypto.createHash('sha256').update(mutations.map(x=>x.id).join('|')).digest('hex').slice(0,12);
    const result=await page.evaluate(async input=>{const p=Orbit.productRuntimeBrowserProvidersP0;const r=await p.callFunction('orbit360ProductOperationalCommand',input,'us-central1');return r&&r.data?r.data:r;},{tenantId:TENANT,activeRole:actor.role,requestId,mutations});
    need(result?.ok===true&&result?.serverOwned===true&&Number(result?.mutationCount)===mutations.length,'I63_CASE_OPERATIONAL_WRITE_REJECTED');
    committed=true;ev.writes=mutations.length;
  }
  const after=await col.get();need(after.size===442,'I63_CASE_BACKEND_COUNT_AFTER');
  for(const m of inserts){const d=await col.doc(m.id).get();need(d.exists,'I63_CASE_POST_TARGET_MISSING');const n=clean((d.data()||{}).nombre,300);need(n&&n===n.toLocaleUpperCase('es'),'I63_CASE_POST_NOT_UPPERCASE');}
  ev.backendCount=after.size;ev.readback=true;ev.status='PASS';
}catch(e){
  ev.errors.push(clean(e?.message||e,220));
  if(committed){
    ev.rollback.executed=true;
    try{
      if(!browser)browser=await chromium.launch({headless:true});
      const actor=await selectManager(db,auth),page=await browser.newPage({viewport:{width:1280,height:800}});await activate(page,auth,actor);
      const requestId='i63_case_rb_'+clean(process.env.GITHUB_RUN_ID||'run',24);
      const mutations=originals.map(x=>({collection:'clientes',action:'update',id:x.id,payload:{nombre:x.nombre}}));
      const r=await page.evaluate(async input=>{const p=Orbit.productRuntimeBrowserProvidersP0;const x=await p.callFunction('orbit360ProductOperationalCommand',input,'us-central1');return x&&x.data?x.data:x;},{tenantId:TENANT,activeRole:actor.role,requestId,mutations});
      ev.rollback.status=r?.ok===true?'PASS':'FAIL';
    }catch(rb){ev.rollback.status='FAIL';ev.errors.push('ROLLBACK:'+clean(rb?.message||rb,180));}
  }
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(OUT,JSON.stringify(ev,null,2)+'\n');
  console.log('I63_NAME_CASE='+ev.status);
  console.log('I63_NAME_CASE_WRITES='+ev.writes);
  console.log('I63_NAME_CASE_ALREADY_UPPER='+ev.alreadyUppercase);
  console.log('I63_NAME_CASE_BACKEND='+String(ev.backendCount||0));
  if(ev.errors.length)console.error('I63_NAME_CASE_ERROR='+ev.errors.join('|'));
}
