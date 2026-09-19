import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { chromium } from 'playwright';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const LOCK=process.env.B1_LOCK_FILE||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B1_EXECUTION_LOCK_20260919.json';
const OUT=process.env.B1_EQUIPO_RUNTIME_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-equipo-runtime');
const clean=(v,m=600)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const need=(ok,msg)=>{if(!ok)throw new Error(msg)};
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('B1_RUNTIME_SERVICE_ACCOUNT_MISSING')}
function roles(m){return [...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[],m?.activeRole||[]).map(clean).filter(Boolean))]}
async function actor(db,auth){
  const s=await db.collection('tenants').doc(TENANT).collection('members').get(),rows=[];
  for(const d of s.docs){
    const m=d.data()||{},uid=clean(m.uid||d.id),st=norm(m.status||m.estado||'active');
    if(!uid||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;
    try{const u=await auth.getUser(uid);if(u.disabled)continue;const rr=roles(m),manager=rr.some(r=>['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'].includes(norm(r)));if(manager)rows.push({uid,verified:u.emailVerified===true,roles:rr});}catch{}
  }
  rows.sort((a,b)=>(b.verified?1:0)-(a.verified?1:0));need(rows.length,'B1_RUNTIME_NO_MANAGER_ACTOR');return rows[0];
}
fs.mkdirSync(OUT,{recursive:true});
const lock=JSON.parse(fs.readFileSync(LOCK,'utf8'));
const TARGET=clean(lock?.latestSuccessfulRun?.previewUrl||lock?.canonicalPreviewUrl||'',700);
need(/^https:\/\/.+\.web\.app$/.test(TARGET),'B1_RUNTIME_PREVIEW_URL_MISSING');
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b1-equipo-runtime');
const db=getFirestore(app),auth=getAuth(app);
let browser;
const ev={schema:'GRAVICENTRA_I6_5_B1_EQUIPO_RUNTIME_READONLY_V1',status:'FAIL',target:TARGET,writes:0,authWrites:0,firestoreWrites:0,actor:{},store:{},ui:{},errors:[]};
try{
  const a=await actor(db,auth);ev.actor={uid:a.uid,roles:a.roles};
  const token=await auth.createCustomToken(a.uid,{b1ForensicRuntimeReadOnly:true});
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(clean(e?.message||e)));
  await page.goto(TARGET+'/?b1id='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:20000});
  const activated=await page.evaluate(async t=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    return Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();
  },token);
  need(activated?.started,'B1_RUNTIME_APP_NOT_STARTED');
  await page.waitForFunction(()=>{const s=window.Orbit?.store?._productStatus?.();return !!s&&Array.isArray(s.serverConfirmedCollections)&&s.serverConfirmedCollections.includes('asesores')},null,{timeout:20000});
  const runtime=await page.evaluate(()=>{
    const rows=(Orbit.store?.all?.('asesores')||[]).map(r=>({id:String(r.id||''),canonicalDocumentId:String(r.canonicalDocumentId||''),nombre:String(r.nombre||r.name||''),email:String(r.email||r.correo||''),uid:String(r.authUid||r.uid||r.firebaseUid||r.userId||'')}));
    const status=Orbit.store?._productStatus?.()||{};
    const probe=document.createElement('div');probe.id='b1-equipo-probe';probe.style.display='none';document.body.appendChild(probe);
    Orbit.modules.equipo.render(probe);
    const uiRows=[...probe.querySelectorAll('tbody tr.clickable')].map(tr=>({text:String(tr.innerText||'').replace(/\s+/g,' ').trim(),onclick:String(tr.getAttribute('onclick')||'')}));
    probe.remove();
    return{rows,status:{source:String(status.source||''),tenantId:String(status.tenantId||''),serverConfirmedCollections:status.serverConfirmedCollections||[],snapshotSources:status.snapshotSources||{},quarantinedRows:status.quarantinedRows||{}},uiRows};
  });
  ev.store=runtime;
  ev.ui={visibleCount:runtime.uiRows.length,rows:runtime.uiRows,pageErrors};
  ev.status='PASS';
}catch(e){ev.errors.push(clean(e?.stack||e?.message||e,1800));process.exitCode=1}
finally{
  if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'b1-equipo-runtime-readonly.json'),JSON.stringify(ev,null,2)+'\n');
  console.log('B1_EQUIPO_RUNTIME='+ev.status);
  console.log('B1_EQUIPO_STORE='+JSON.stringify(ev.store));
  console.log('B1_EQUIPO_UI='+JSON.stringify(ev.ui));
  console.log('B1_EQUIPO_ERRORS='+JSON.stringify(ev.errors));
  console.log('B1_EQUIPO_WRITES=0');
}
