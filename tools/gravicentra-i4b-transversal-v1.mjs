import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||'');
const BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4B_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const ROLES=['Dirección','SuperAdmin','AdminTenant','Operativo','Asesor'];
const PRIV=new Set(['Dirección','SuperAdmin','AdminTenant','Operativo']);
const VIEWPORTS=[
  {id:'desktop',width:1440,height:1000},
  {id:'tablet',width:1024,height:768},
  {id:'mobile',width:390,height:844}
];
const ROUTES=[
  {capability:'INICIO_PRIMARY_RUNTIME',key:'inicio',hash:'#/inicio'},
  {capability:'CLIENTE360_PRIMARY_RUNTIME',key:'cliente360',hash:'#/cliente360'},
  {capability:'ASEGURADORAS_PRIMARY_RUNTIME',key:'aseguradoras',hash:'#/aseguradoras'},
  {capability:'OPS_PRIMARY_RUNTIME',key:'ops',hash:'#/ops'},
  {capability:'LEADS_PRIMARY_RUNTIME',key:'leads',hash:'#/leads'},
  {capability:'POLIZAS_PRIMARY_RUNTIME',key:'polizas',hash:'#/polizas'},
  {capability:'COBROS_PRIMARY_RUNTIME',key:'cobros',hash:'#/cobros'}
];
const clean=v=>String(v==null?'':v).trim();
const need=(ok,code)=>{if(!ok)throw new Error(code)};
need(/^[0-9a-f]{40}$/.test(SOURCE),'I4B_SOURCE_SHA_MISSING_OR_INVALID');
need(/^gi-i3-[0-9a-f]{12}-[0-9a-f]{12}$/.test(BUILD)&&BUILD.includes(SOURCE.slice(0,12)),'I4B_BUILD_ID_MISSING_OR_SOURCE_MISMATCH');
need(/^https:\/\/[A-Za-z0-9._-]+\.web\.app$/.test(PREVIEW),'I4B_PREVIEW_URL_MISSING_OR_INVALID');

function normRole(v){
  const k=clean(v).toLowerCase().replace(/\s+/g,' ');
  return ({'dirección':'Dirección','direccion':'Dirección','director':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);
}
function rolesOf(m){const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(normRole).filter(Boolean))];}
function activeRole(m,rs){return normRole(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);}
function serviceAccount(){
  for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){
    try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('I4B_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');
}
function telemetry(page){
  const t={console:[],page:[],req:[],http:[]};
  page.on('console',m=>{if(m.type()==='error')t.console.push(m.text().slice(0,320));});
  page.on('pageerror',e=>t.page.push(String(e?.message||e).slice(0,320)));
  page.on('requestfailed',q=>{try{if(new URL(q.url()).origin===new URL(PREVIEW).origin)t.req.push(q.url());}catch{}});
  page.on('response',q=>{try{if(new URL(q.url()).origin===new URL(PREVIEW).origin&&q.status()>=400)t.http.push({status:q.status(),url:q.url()});}catch{}});
  return t;
}
async function activate(page,token){
  const started=await page.evaluate(async tok=>{const p=Orbit?.productRuntimeBrowserProvidersP0;const c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);return await Orbit.productAppP0.activate();},token);
  need(started?.started===true,'I4B_PRODUCT_APP_DID_NOT_START');
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});
}
async function legalGate(page){
  const gate=page.locator('[data-legal-gate].open');
  try{await gate.waitFor({state:'visible',timeout:2500});}catch{return {present:false,accepted:false,backendWrite:false};}
  const chk=gate.locator('#lg-chk'), ok=gate.locator('#lg-ok');
  need(await chk.count()===1,'I4B_LEGAL_CHECKBOX_MISSING');
  need(await ok.count()===1,'I4B_LEGAL_ACCEPT_MISSING');
  await chk.check();need(await ok.isEnabled(),'I4B_LEGAL_ACCEPT_DISABLED');await ok.click();
  await gate.waitFor({state:'detached',timeout:4000});
  return {present:true,accepted:true,backendWrite:false};
}
async function setRole(page,target){
  const before=await page.evaluate(()=>({active:Orbit?.session?.rol?.()||'',assigned:Orbit?.session?.allowedRoles?.()||[]}));
  if(before.active===target)return {mode:'persisted-active',before:before.active,after:before.active};
  need(before.assigned.includes(target),'I4B_ROLE_NOT_ASSIGNED:'+target);
  need(await page.evaluate(r=>Orbit.session.set(r),target),'I4B_ROLE_SWITCH_REJECTED:'+target);
  await page.waitForTimeout(180);
  const after=await page.evaluate(()=>Orbit?.session?.rol?.()||'');
  need(after===target,'I4B_ROLE_SWITCH_NOT_EFFECTIVE:'+target);
  return {mode:'assigned-switch',before:before.active,after};
}
async function gotoRoute(page,spec){
  const start=Date.now();
  await page.evaluate(h=>{location.hash=h;},spec.hash);
  await page.waitForFunction(k=>Orbit?.route?.key===k&&!!document.querySelector('#host'),spec.key,{timeout:12000});
  await page.waitForTimeout(180);
  const state=await page.evaluate(()=>{
    const host=document.querySelector('#host');
    const root=document.documentElement;
    const body=document.body;
    const text=(host?.textContent||'').replace(/\s+/g,' ').trim();
    return {
      routeKey:Orbit?.route?.key||'',
      hostTextLength:text.length,
      hostHasPage:!!host?.querySelector('.page'),
      innerWidth:window.innerWidth,
      htmlScrollWidth:root?.scrollWidth||0,
      bodyScrollWidth:body?.scrollWidth||0,
      horizontalOverflowPx:Math.max(0,(root?.scrollWidth||0)-window.innerWidth,(body?.scrollWidth||0)-window.innerWidth)
    };
  });
  need(state.routeKey===spec.key,'I4B_ROUTE_KEY_MISMATCH:'+spec.key);
  need(state.hostTextLength>10,'I4B_ROUTE_EMPTY:'+spec.key);
  need(state.horizontalOverflowPx<=24,'I4B_VIEWPORT_HORIZONTAL_OVERFLOW:'+spec.key+':'+state.horizontalOverflowPx);
  return {routeMs:Date.now()-start,...state};
}
async function waitReadModels(page){
  await page.waitForFunction(()=>{
    const s=Orbit?.store?._productStatus?.()||{};const c=Array.isArray(s.serverConfirmedCollections)?s.serverConfirmedCollections:[];
    return ['recibosEsperados','carteraPrimas','negocios'].every(x=>c.includes(x));
  },null,{timeout:14000});
  return page.evaluate(()=>{const s=Orbit?.store?._productStatus?.()||{};return {serverConfirmedCollections:[...(s.serverConfirmedCollections||[])],recibosEsperados:(Orbit.store.all('recibosEsperados')||[]).length,carteraPrimas:(Orbit.store.all('carteraPrimas')||[]).length,negocios:(Orbit.store.all('negocios')||[]).length};});
}
async function relationshipProbe(page){
  return page.evaluate(()=>{
    const all=n=>{try{return Orbit.store.all(n)||[]}catch{return[]}};
    const clientes=all('clientes'),polizas=all('polizas'),vehiculos=all('vehiculos'),negocios=all('negocios');
    const cids=new Set(clientes.map(x=>String(x.id))), pids=new Set(polizas.map(x=>String(x.id)));
    const explicitPolicyClient=polizas.filter(x=>x?.clienteId);
    const explicitVehicleClient=vehiculos.filter(x=>x?.clienteId);
    const explicitVehiclePolicy=vehiculos.filter(x=>x?.polizaId);
    const orphanPolicyClient=explicitPolicyClient.filter(x=>!cids.has(String(x.clienteId))).length;
    const orphanVehicleClient=explicitVehicleClient.filter(x=>!cids.has(String(x.clienteId))).length;
    const orphanVehiclePolicy=explicitVehiclePolicy.filter(x=>!pids.has(String(x.polizaId))).length;
    const leads=(Orbit.ciclo?.leadsBoard?.()||[]).flatMap(c=>(c.items||[]).filter(i=>i?.kind==='negocio').map(i=>String(i.rec?.id||''))).filter(Boolean);
    const ops=(Orbit.ciclo?.opsBoard?.()||[]).flatMap(c=>(c.items||[]).filter(i=>i?.kind==='negocio').map(i=>String(i.rec?.id||''))).filter(Boolean);
    const leadSet=new Set(leads),opsMissingInLeads=ops.filter(id=>!leadSet.has(id));
    const scoped={};
    for(const module of ['cliente360','polizas','cobros','ops','leads']){
      try{const s=Orbit.access?.scopedStore?.(module);scoped[module]={clientes:s?.all?.('clientes')?.length??null,polizas:s?.all?.('polizas')?.length??null,negocios:s?.all?.('negocios')?.length??null,cobros:s?.all?.('cobros')?.length??null};}catch{scoped[module]={error:true};}
    }
    return {
      totals:{clientes:clientes.length,polizas:polizas.length,vehiculos:vehiculos.length,negocios:negocios.length,recibosEsperados:all('recibosEsperados').length,carteraPrimas:all('carteraPrimas').length,cobros:all('cobros').length},
      joins:{explicitPolicyClient:explicitPolicyClient.length,orphanPolicyClient,explicitVehicleClient:explicitVehicleClient.length,orphanVehicleClient,explicitVehiclePolicy:explicitVehiclePolicy.length,orphanVehiclePolicy},
      opsLeads:{leadBusinessCount:leads.length,opsBusinessCount:ops.length,opsMissingInLeads},scoped
    };
  });
}
async function insurerRoleProbe(page,target){
  await page.evaluate(()=>{location.hash='#/aseguradoras';});
  await page.waitForFunction(()=>Orbit?.route?.key==='aseguradoras'&&!!document.querySelector('#host .page'),null,{timeout:12000});
  const candidate=await page.evaluate(()=>{const rows=Orbit.store.all('aseguradoras')||[];const x=rows.find(a=>a&&Array.isArray(a.portales)&&a.portales.some(p=>p&&(p.credentialRef||p.password||p.pass||p.contrasena||p.clave)))||null;return x?{id:x.id,refCount:x.portales.filter(p=>p&&p.credentialRef).length,inlineCount:x.portales.filter(p=>p&&(p.password||p.pass||p.contrasena||p.clave)).length}:null;});
  need(candidate?.id,'I4B_ASEGURADORAS_CREDENTIAL_DATASET_UNAVAILABLE');
  await page.evaluate(id=>{location.hash='#/aseguradoras?ficha='+encodeURIComponent(id);},candidate.id);
  await page.waitForFunction(id=>Orbit?.route?.key==='aseguradoras'&&String(Orbit?.route?.params?.ficha||'')===String(id)&&!!document.querySelector('#asg-ficha'),candidate.id,{timeout:12000});
  await page.evaluate(()=>{const el=document.querySelector('#asg-ficha [data-tab="plataformas"]');if(!el)throw new Error('I4B_ASEGURADORAS_PLATFORM_TAB_MISSING');el.click();});
  await page.waitForFunction(()=>!!document.querySelector('#af-portales'),null,{timeout:8000});await page.waitForTimeout(120);
  const state=await page.evaluate(()=>({
    userVisible:[...document.querySelectorAll('#af-portales [data-od-credential-user]')].filter(x=>(x.textContent||'').trim()&&!/sin usuario/i.test(x.textContent||'')).length,
    reveals:document.querySelectorAll('#af-portales [data-od-credential-reveal]').length,
    copies:document.querySelectorAll('#af-portales [data-od-credential-copy]').length,
    unavailable:[...document.querySelectorAll('#af-portales .od-credential-box')].filter(x=>/contraseña no disponible|pendiente de conexión segura/i.test(x.textContent||'')).length,
    cards:document.querySelectorAll('#af-portales .od-operational-portal-card').length
  }));
  if(PRIV.has(target)){
    need(state.cards>0,'I4B_ASEGURADORAS_PRIVILEGED_DIRECTORY_EMPTY:'+target);
    if(candidate.refCount>0){need(state.reveals>0,'I4B_ASEGURADORAS_PRIVILEGED_REVEAL_MISSING:'+target);need(state.copies>0,'I4B_ASEGURADORAS_PRIVILEGED_COPY_MISSING:'+target);need(state.unavailable===0,'I4B_ASEGURADORAS_PRIVILEGED_MARKED_UNAVAILABLE:'+target);}
  }else{
    need(state.reveals===0,'I4B_ASEGURADORAS_ADVISOR_REVEAL_EXPOSED');
    need(state.copies===0,'I4B_ASEGURADORAS_ADVISOR_COPY_EXPOSED');
  }
  return {candidate,...state,secretRevealed:false,clipboardRead:false};
}

const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i4b-readonly-v1');
const auth=getAuth(app),db=getFirestore(app);
const memberSnap=await db.collection('tenants').doc(TENANT).collection('members').get();
const listed=await auth.listUsers(1000), users=new Map(listed.users.map(u=>[u.uid,u]));
const pool=[];
for(const doc of memberSnap.docs){
  const m=doc.data()||{},uid=clean(m.uid||doc.id),u=users.get(uid);if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;
  const rs=rolesOf(m);pool.push({uid,roles:rs,active:activeRole(m,rs)});
}
const selected=new Map();
for(const target of ROLES){const exact=pool.find(x=>x.active===target&&x.roles.includes(target));const fallback=exact||pool.find(x=>x.roles.includes(target));if(fallback)selected.set(target,{...fallback,selectionMode:exact?'persisted-active':'assigned-role'});}

fs.mkdirSync(OUT,{recursive:true});
const ev={
  schemaVersion:'gravicentra-i4b-transversal-matrix-v1',gate:'I4B',status:'I4B_MATRIX_FAIL',
  sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,
  roles:ROLES,viewports:VIEWPORTS,routes:ROUTES.map(x=>x.key),
  expectedContextCount:ROLES.length*VIEWPORTS.length,contextsPass:0,contextsFail:0,
  productionTouched:false,dataTouched:false,writesExecuted:0,productSourceMutationAuthorized:false,
  secretValuesRecorded:false,userIdentitiesRecorded:false,tokensRecorded:false,
  preservedI4A:true,cases:[],errors:[]
};
let browser;
try{
  need(selected.size===ROLES.length,'I4B_REQUIRED_ROLE_MEMBERSHIP_MISSING:'+ROLES.filter(r=>!selected.has(r)).join(','));
  browser=await chromium.launch({headless:true});
  for(const target of ROLES){
    const member=selected.get(target);
    for(const vp of VIEWPORTS){
      const rec={role:target,viewport:vp.id,width:vp.width,height:vp.height,selectionMode:member.selectionMode,pass:false,stage:'token',routes:{}};
      let context;
      try{
        const token=await auth.createCustomToken(member.uid,{gravicentraI4BReadOnly:true});
        rec.stage='browser';
        context=await browser.newContext({viewport:{width:vp.width,height:vp.height}});
        const page=await context.newPage();page.setDefaultTimeout(12000);const tel=telemetry(page);
        rec.stage='load';const t=Date.now();await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});rec.domContentLoadedMs=Date.now()-t;
        await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:6000});
        rec.stage='activate';await activate(page,token);
        rec.stage='legal';rec.legalGate=await legalGate(page);
        rec.stage='role';rec.roleState=await setRole(page,target);
        rec.stage='routes';for(const spec of ROUTES)rec.routes[spec.key]=await gotoRoute(page,spec);
        rec.stage='read-models';rec.readModels=await waitReadModels(page);
        need(rec.readModels.recibosEsperados>0,'I4B_RECIBOS_ESPERADOS_EMPTY');
        need(rec.readModels.carteraPrimas>0,'I4B_CARTERA_PRIMAS_EMPTY');
        rec.stage='relationships';rec.relationships=await relationshipProbe(page);
        const j=rec.relationships.joins;
        need(rec.relationships.totals.vehiculos>0,'I4B_VEHICULOS_READ_MODEL_EMPTY');
        need(j.explicitPolicyClient>0&&j.orphanPolicyClient===0,'I4B_CLIENTE_POLIZA_JOIN_INVALID');
        need(j.explicitVehicleClient>0&&j.orphanVehicleClient===0,'I4B_CLIENTE_VEHICULO_JOIN_INVALID');
        need(j.explicitVehiclePolicy>0&&j.orphanVehiclePolicy===0,'I4B_POLIZA_VEHICULO_JOIN_INVALID');
        need(rec.relationships.totals.negocios>0,'I4B_NEGOCIOS_EMPTY');
        need(rec.relationships.opsLeads.opsBusinessCount>0,'I4B_OPS_NEGOCIO_PROJECTION_EMPTY');
        need(rec.relationships.opsLeads.opsMissingInLeads.length===0,'I4B_OPS_LEADS_CANONICAL_PROJECTION_DIVERGENCE');
        rec.stage='aseguradoras-role';rec.aseguradoras=await insurerRoleProbe(page,target);
        rec.stage='telemetry';
        rec.telemetry={consoleErrorCount:tel.console.length,pageErrorCount:tel.page.length,sameOriginRequestFailureCount:tel.req.length,sameOriginHttpErrorCount:tel.http.length};
        need(tel.page.length===0,'I4B_PAGE_ERRORS');need(tel.req.length===0,'I4B_SAME_ORIGIN_REQUEST_FAILURES');need(tel.http.length===0,'I4B_SAME_ORIGIN_HTTP_ERRORS');need(tel.console.length===0,'I4B_CONSOLE_ERRORS');
        rec.stage='complete';rec.pass=true;ev.contextsPass++;
      }catch(error){rec.error=String(error?.message||error);ev.errors.push(`${target}@${vp.id}:${rec.stage}:${rec.error}`);ev.contextsFail++;}
      finally{if(context)await Promise.race([context.close().catch(()=>{}),new Promise(r=>setTimeout(r,3000))]);ev.cases.push(rec);}
    }
  }
  const expected=ROLES.length*VIEWPORTS.length;
  need(ev.contextsPass===expected&&ev.contextsFail===0,'I4B_MATRIX_CONTEXT_FAILURES');
  ev.status='I4B_MATRIX_PASS';
}catch(error){ev.errors.push(String(error?.message||error));process.exitCode=1;}
finally{
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'i4b-transversal-matrix.json'),JSON.stringify(ev,null,2)+'\n');
  console.log('I4B_MATRIX_STATUS='+ev.status);
  console.log('I4B_CONTEXTS_PASS='+ev.contextsPass+'/'+ev.expectedContextCount);
  console.log('I4B_CONTEXTS_FAIL='+ev.contextsFail);
  console.log('I4B_ERRORS='+ev.errors.join(' | '));
}