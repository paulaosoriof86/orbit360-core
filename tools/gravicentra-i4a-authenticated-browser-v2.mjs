import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab', TENANT='alianzas-soluciones';
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||''), BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4A_AUTH_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const TARGETS=['Dirección','SuperAdmin','AdminTenant','Operativo','Asesor'];
const PRIV=new Set(['Dirección','SuperAdmin','AdminTenant','Operativo']);
const clean=v=>String(v==null?'':v).trim();
function need(ok,code){if(!ok)throw new Error(code);}
function role(v){const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','director':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);}
function roles(m){const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(role).filter(Boolean))];}
function activeRole(m,rs){return role(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);}
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I4A_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');}
async function beat(page){const vals=[];for(let i=0;i<3;i++){const t=Date.now();await page.evaluate(()=>new Promise(r=>setTimeout(r,20)));vals.push(Date.now()-t);}return {samplesMs:vals,maxMs:Math.max(...vals)};}
async function gotoRoute(page,hash,predicate,timeout=10000){const t=Date.now();await page.evaluate(h=>{location.hash=h;},hash);await page.waitForFunction(predicate,null,{timeout});return Date.now()-t;}
async function activate(page,token){const t=Date.now();const x=await page.evaluate(async tok=>{const p=Orbit?.productRuntimeBrowserProvidersP0;const c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);return await Orbit.productAppP0.activate();},token);need(x?.started===true,'PRODUCT_APP_DID_NOT_START');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});return Date.now()-t;}
async function setRole(page,target){const before=await page.evaluate(()=>({active:Orbit?.session?.rol?.()||'',assigned:Orbit?.session?.allowedRoles?.()||[]}));if(before.active===target)return {mode:'persisted-active',before:before.active,after:before.active};need(before.assigned.includes(target),'ROLE_NOT_ASSIGNED:'+target);const switched=await page.evaluate(r=>Orbit.session.set(r),target);need(switched===true,'ROLE_SWITCH_REJECTED:'+target);await page.waitForTimeout(100);const after=await page.evaluate(()=>Orbit?.session?.rol?.()||'');need(after===target,'ROLE_SWITCH_NOT_EFFECTIVE:'+target);return {mode:'assigned-switch',before:before.active,after};}

async function basic(page){
  const counts=await page.evaluate(()=>({clientes:Orbit.store.all('clientes').length,polizas:Orbit.store.all('polizas').length,aseguradoras:Orbit.store.all('aseguradoras').length}));
  need(counts.clientes>0,'CLIENTES_EMPTY');need(counts.polizas>0,'POLIZAS_EMPTY');need(counts.aseguradoras>0,'ASEGURADORAS_EMPTY');
  const cMs=await gotoRoute(page,'#/cliente360',()=>Orbit?.route?.key==='cliente360'&&!!document.querySelector('#host .c360-pagination')&&!!document.querySelector('#host table.tbl tbody'));
  await page.waitForTimeout(80);
  const c=await page.evaluate(()=>{
    const batch=Orbit.clientProjection?.withReadBatch?.(['clientes'],x=>x)||{clientes:[]};
    return {rawTotal:Orbit.store.all('clientes').length,projectionTotal:Array.isArray(batch.clientes)?batch.clientes.length:0,visibleRows:document.querySelectorAll('#host table.tbl tbody tr.clickable').length,paginationText:(document.querySelector('#host .c360-pagination')?.textContent||'').replace(/\s+/g,' ').trim()};
  });
  need(c.visibleRows>0,'CLIENTE360_ROWS_NOT_MATERIALIZED');
  need(c.projectionTotal===c.rawTotal&&c.projectionTotal>0,'CLIENTE360_PROJECTION_TOTAL_MISMATCH');
  need(c.paginationText.includes('de '+c.projectionTotal),'CLIENTE360_PAGINATION_TOTAL_MISMATCH');
  const cBeat=await beat(page);need(cBeat.maxMs<1000,'CLIENTE360_EVENT_LOOP_BLOCKED');

  const pMs=await gotoRoute(page,'#/polizas',()=>Orbit?.route?.key==='polizas'&&!!document.querySelector('#host .page')&&!!(document.querySelector('#host table')||document.querySelector('#host .card')));
  await page.waitForTimeout(80);
  const pText=await page.evaluate(()=>document.querySelector('#host')?.textContent||'');need(pText.trim().length>20,'POLIZAS_RENDER_EMPTY');
  const pBeat=await beat(page);need(pBeat.maxMs<1000,'POLIZAS_EVENT_LOOP_BLOCKED');
  return {counts,cliente360:{routeMs:cMs,...c,heartbeat:cBeat},polizas:{routeMs:pMs,heartbeat:pBeat}};
}

async function openInsurer(page,id){
  await gotoRoute(page,'#/aseguradoras?ficha='+encodeURIComponent(id),x=>Orbit?.route?.key==='aseguradoras'&&String(Orbit?.route?.params?.ficha||'')===String(x)&&!!document.querySelector('#asg-ficha'),12000);
  await page.waitForTimeout(120);
}
async function clickTab(page,tab,container){
  await page.evaluate(t=>{const el=document.querySelector('#asg-ficha [data-tab="'+t+'"]');if(!el)throw new Error('ASEGURADORAS_TAB_MISSING:'+t);el.click();},tab);
  await page.waitForFunction(sel=>!!document.querySelector(sel),container,{timeout:8000});
  await page.waitForTimeout(160);
}
async function insurer(page,r){
  await gotoRoute(page,'#/aseguradoras',()=>Orbit?.route?.key==='aseguradoras'&&!!document.querySelector('#host .page'));
  const cand=await page.evaluate(()=>{
    const rows=Orbit.store.all('aseguradoras')||[];
    const portals=rows.find(x=>x&&Array.isArray(x.portales)&&x.portales.length>0)||null;
    const banks=rows.find(x=>x&&Array.isArray(x.cuentas)&&x.cuentas.length>0)||null;
    const credential=rows.find(x=>x&&Array.isArray(x.portales)&&x.portales.some(p=>p&&(p.password||p.pass||p.contrasena||p.clave)))||rows.find(x=>x&&Array.isArray(x.portales)&&x.portales.some(p=>p&&p.credentialRef))||null;
    const portalSummary=x=>x?{id:x.id,count:x.portales.length}:null;
    const bankSummary=x=>x?{id:x.id,count:x.cuentas.length,numberBearing:x.cuentas.filter(a=>a&&(a.numero||a.numeroCuenta||a.accountNumber)).length}:null;
    const credSummary=x=>x?{id:x.id,inline:x.portales.filter(p=>p&&(p.password||p.pass||p.contrasena||p.clave)).length,refs:x.portales.filter(p=>p&&p.credentialRef).length,userBearing:x.portales.filter(p=>p&&(p.usuario||p.user||p.login||p.emailUsuario||p.correoUsuario)).length}:null;
    return {portals:portalSummary(portals),banks:bankSummary(banks),credentials:credSummary(credential)};
  });
  need(cand.portals?.id,'ASEGURADORAS_PORTAL_RECORD_UNAVAILABLE');
  need(cand.banks?.id,'ASEGURADORAS_BANK_RECORD_UNAVAILABLE');

  await openInsurer(page,cand.portals.id);await clickTab(page,'plataformas','#af-portales');
  const portals=await page.evaluate(()=>({ownerVersion:Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.version||'',compositionRevision:Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.compositionRevision||'',barrierRevision:Orbit?.__clientInsurerVisualStabilityBarrierV20260721?.directoryVisibilityRevision||'',rows:document.querySelectorAll('#af-portales [data-portal]').length,cards:document.querySelectorAll('#af-portales .od-operational-portal-card[data-portal]').length,credentialBoxes:document.querySelectorAll('#af-portales .od-credential-box').length,users:[...document.querySelectorAll('#af-portales [data-od-credential-user]')].filter(x=>(x.textContent||'').trim()).length,reveals:document.querySelectorAll('#af-portales [data-od-credential-reveal]').length,stable:Orbit?.__clientInsurerVisualStabilityState?.expectedReady===true}));
  need(portals.ownerVersion==='20260829.1','ASEGURADORAS_CANONICAL_OWNER_VERSION_MISMATCH');
  need(portals.compositionRevision==='20260902.1-predecessor-row-reclaim','ASEGURADORAS_OWNER_COMPOSITION_REVISION_MISMATCH');
  need(portals.barrierRevision==='20260902.1-latest-operational-owner-precedence','ASEGURADORAS_BARRIER_REVISION_MISMATCH');
  need(portals.rows===cand.portals.count&&portals.cards===cand.portals.count,'ASEGURADORAS_PORTAL_CARD_COUNT_MISMATCH');
  need(portals.credentialBoxes===cand.portals.count,'ASEGURADORAS_CREDENTIAL_BOX_COUNT_MISMATCH');
  need(portals.stable,'ASEGURADORAS_PORTAL_VIEW_NOT_STABLE');

  let credentials={datasetAvailable:!!cand.credentials};
  if(cand.credentials){
    await openInsurer(page,cand.credentials.id);await clickTab(page,'plataformas','#af-portales');
    credentials=await page.evaluate(meta=>({datasetAvailable:true,inlineCount:meta.inline,refCount:meta.refs,userBearing:meta.userBearing,cards:document.querySelectorAll('#af-portales .od-operational-portal-card').length,userVisible:[...document.querySelectorAll('#af-portales [data-od-credential-user]')].filter(x=>{const t=(x.textContent||'').trim();return t&&!/sin usuario/i.test(t);}).length,reveals:document.querySelectorAll('#af-portales [data-od-credential-reveal]').length}),cand.credentials);
    if(PRIV.has(r)){
      if(cand.credentials.userBearing>0)need(credentials.userVisible>0,'ASEGURADORAS_PRIVILEGED_USERNAME_NOT_VISIBLE');
      if(cand.credentials.inline>0)need(credentials.reveals>0,'ASEGURADORAS_PRIVILEGED_INLINE_REVEAL_NOT_AVAILABLE');
    }else if(r==='Asesor') need(credentials.reveals===0,'ASEGURADORAS_ADVISOR_CREDENTIAL_REVEAL_EXPOSED');
  }

  await openInsurer(page,cand.banks.id);await clickTab(page,'bancos','#af-cuentas');
  const banks=await page.evaluate(()=>({rows:document.querySelectorAll('#af-cuentas [data-cta]').length,cards:document.querySelectorAll('#af-cuentas .od-operational-bank-card[data-cta]').length,numberVisible:[...document.querySelectorAll('#af-cuentas [data-od-bank-number]')].filter(x=>{const t=(x.textContent||'').trim();return t&&!/pendiente/i.test(t);}).length,stable:Orbit?.__clientInsurerVisualStabilityState?.expectedReady===true}));
  need(banks.rows===cand.banks.count&&banks.cards===cand.banks.count,'ASEGURADORAS_BANK_CARD_COUNT_MISMATCH');
  if(PRIV.has(r)&&cand.banks.numberBearing>0)need(banks.numberVisible>0,'ASEGURADORAS_PRIVILEGED_BANK_NUMBER_NOT_VISIBLE');
  need(banks.stable,'ASEGURADORAS_BANK_VIEW_NOT_STABLE');
  return {candidates:cand,portals,credentials,banks};
}

const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i4a-readonly-v4'),auth=getAuth(app),db=getFirestore(app);
const snap=await db.collection('tenants').doc(TENANT).collection('members').get(), listed=await auth.listUsers(1000), users=new Map(listed.users.map(u=>[u.uid,u]));
const pool=[];for(const doc of snap.docs){const m=doc.data()||{},uid=clean(m.uid||doc.id),u=users.get(uid);if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;const rs=roles(m);pool.push({uid,roles:rs,active:activeRole(m,rs)});}
const selected=new Map();for(const target of TARGETS){const exact=pool.find(x=>x.active===target&&x.roles.includes(target));const fallback=exact||pool.find(x=>x.roles.includes(target));if(fallback)selected.set(target,{...fallback,selectionMode:exact?'persisted-active':'assigned-role'});}
fs.mkdirSync(OUT,{recursive:true});const ev={schemaVersion:'gravicentra-i4a-authenticated-browser-v4',gate:'I4A',status:'AUTH_BROWSER_FAIL',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,productionTouched:false,dataTouched:false,writesExecuted:0,userIdentitiesRecorded:false,tokensRecorded:false,coverage:{requestedRoles:TARGETS,availableRoles:[...selected.keys()],persistedActiveRoles:[...selected].filter(([,x])=>x.selectionMode==='persisted-active').map(([r])=>r)},roles:{},errors:[]};
let browser;try{need(selected.size>0,'I4A_NO_ACTIVE_VERIFIED_MEMBERSHIPS');browser=await chromium.launch({headless:true});for(const [target,s] of selected){const rec={pass:false,selectionMode:s.selectionMode,stage:'token'};ev.roles[target]=rec;let context;try{const token=await auth.createCustomToken(s.uid,{gravicentraI4AReadOnly:true});rec.stage='load';context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const telemetry={console:[],page:[],req:[],http:[]};page.on('console',m=>{if(m.type()==='error')telemetry.console.push(m.text().slice(0,240));});page.on('pageerror',e=>telemetry.page.push(String(e?.message||e).slice(0,240)));page.on('requestfailed',q=>{try{if(new URL(q.url()).origin===new URL(PREVIEW).origin)telemetry.req.push(q.url());}catch{}});page.on('response',q=>{try{if(new URL(q.url()).origin===new URL(PREVIEW).origin&&q.status()>=400)telemetry.http.push(q.status());}catch{}});const t=Date.now();await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});rec.domContentLoadedMs=Date.now()-t;await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:5000});rec.stage='activate';rec.activationMs=await activate(page,token);rec.stage='role';rec.role=await setRole(page,target);rec.stage='basic';rec.basic=await basic(page);rec.stage='aseguradoras';rec.insurer=await insurer(page,target);rec.stage='telemetry';need(telemetry.page.length===0,'I4A_AUTH_PAGE_ERRORS');need(telemetry.req.length===0,'I4A_AUTH_SAME_ORIGIN_REQUEST_FAILURES');need(telemetry.http.length===0,'I4A_AUTH_SAME_ORIGIN_HTTP_ERRORS');rec.telemetry={consoleErrorCount:telemetry.console.length,pageErrorCount:telemetry.page.length,sameOriginRequestFailureCount:telemetry.req.length,sameOriginHttpErrorCount:telemetry.http.length};rec.stage='complete';rec.pass=true;}catch(e){rec.error=String(e?.message||e);ev.errors.push(target+':'+rec.stage+':'+rec.error);}finally{if(context)await context.close().catch(()=>{});}}
  ev.status=TARGETS.every(r=>ev.roles[r]?.pass===true)?'AUTH_BROWSER_PASS':'AUTH_BROWSER_FAIL';if(ev.status!=='AUTH_BROWSER_PASS')process.exitCode=1;
}catch(e){ev.errors.push(String(e?.message||e));process.exitCode=1;}finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(path.join(OUT,'i4a-authenticated-browser.json'),JSON.stringify(ev,null,2)+'\n');console.log('I4A_AUTH_BROWSER_STATUS='+ev.status);console.log('I4A_AUTH_ROLE_PASS='+Object.entries(ev.roles).filter(([,x])=>x.pass).map(([r])=>r).join(','));console.log('I4A_AUTH_ROLE_FAIL='+Object.entries(ev.roles).filter(([,x])=>!x.pass).map(([r,x])=>r+'@'+x.stage).join(','));}
