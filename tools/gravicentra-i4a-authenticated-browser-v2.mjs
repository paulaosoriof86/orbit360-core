import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab', TENANT='alianzas-soluciones', TARGET_POLICY='AUTO39012';
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||''), BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4A_AUTH_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const TARGETS=['Dirección','SuperAdmin','AdminTenant','Operativo','Asesor'];
const PRIV=new Set(['Dirección','SuperAdmin','AdminTenant','Operativo']);
const PROBES=['cliente360','polizas','cobros','aseguradoras'];
const clean=v=>String(v==null?'':v).trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
function need(ok,code){if(!ok)throw new Error(code);}
function role(v){const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','director':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);}
function roles(m){const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(role).filter(Boolean))];}
function activeRole(m,rs){return role(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);}
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I4A_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');}
function deadline(promise,ms,code){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(code)),ms);})]).finally(()=>clearTimeout(timer));}
async function beat(page){const vals=[];for(let i=0;i<3;i++){const t=Date.now();await page.evaluate(()=>new Promise(r=>setTimeout(r,20)));vals.push(Date.now()-t);}return {samplesMs:vals,maxMs:Math.max(...vals)};}
async function gotoRoute(page,hash,predicate,timeout=10000,arg=null){const t=Date.now();await page.evaluate(h=>{location.hash=h;},hash);await page.waitForFunction(predicate,arg,{timeout});return Date.now()-t;}
async function activate(page,token){const t=Date.now();const x=await page.evaluate(async tok=>{const p=Orbit?.productRuntimeBrowserProvidersP0;const c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);return await Orbit.productAppP0.activate();},token);need(x?.started===true,'PRODUCT_APP_DID_NOT_START');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});return Date.now()-t;}
async function setRole(page,target){const before=await page.evaluate(()=>({active:Orbit?.session?.rol?.()||'',assigned:Orbit?.session?.allowedRoles?.()||[]}));if(before.active===target)return {mode:'persisted-active',before:before.active,after:before.active};need(before.assigned.includes(target),'ROLE_NOT_ASSIGNED:'+target);const switched=await page.evaluate(r=>Orbit.session.set(r),target);need(switched===true,'ROLE_SWITCH_REJECTED:'+target);await page.waitForTimeout(180);const after=await page.evaluate(()=>Orbit?.session?.rol?.()||'');need(after===target,'ROLE_SWITCH_NOT_EFFECTIVE:'+target);return {mode:'assigned-switch',before:before.active,after};}
function telemetry(page){const t={console:[],page:[],req:[],http:[]};page.on('console',m=>{if(m.type()==='error')t.console.push(m.text().slice(0,240));});page.on('pageerror',e=>t.page.push(String(e?.message||e).slice(0,240)));page.on('requestfailed',q=>{try{if(new URL(q.url()).origin===new URL(PREVIEW).origin)t.req.push(q.url());}catch{}});page.on('response',q=>{try{if(new URL(q.url()).origin===new URL(PREVIEW).origin&&q.status()>=400)t.http.push(q.status());}catch{}});return t;}
function checkTelemetry(t){need(t.page.length===0,'I4A_AUTH_PAGE_ERRORS');need(t.req.length===0,'I4A_AUTH_SAME_ORIGIN_REQUEST_FAILURES');need(t.http.length===0,'I4A_AUTH_SAME_ORIGIN_HTTP_ERRORS');return {consoleErrorCount:t.console.length,pageErrorCount:t.page.length,sameOriginRequestFailureCount:t.req.length,sameOriginHttpErrorCount:t.http.length};}

async function probeCliente360(page){
  const routeMs=await gotoRoute(page,'#/cliente360',()=>Orbit?.route?.key==='cliente360'&&!!document.querySelector('#host .c360-pagination')&&!!document.querySelector('#host table.tbl tbody'),12000);
  await page.waitForTimeout(180);
  const state=await page.evaluate(()=>{
    const scoped=Orbit.access?.scopedStore?.('cliente360');
    const scopedTotal=scoped?.all?.('clientes')?.length||0;
    const scopedProjectionTotal=Orbit.access?.withScope?.('cliente360',()=>{const b=Orbit.clientProjection?.withReadBatch?.(['clientes','polizas','cobros'],x=>x)||{clientes:[]};return Array.isArray(b.clientes)?b.clientes.length:0;})||0;
    const d=OrbitRuntimeDiagnostics?.cliente360?.list||{};
    return {
      activeRole:Orbit.session?.rol?.()||'',scope:Orbit.access?.dataScope?.('cliente360')||'',
      rawTotal:Orbit.store.all('clientes').length,scopedTotal,scopedProjectionTotal,
      diagnostics:{pageSize:d.pageSize??null,page:d.page??null,pageCount:d.pageCount??null,totalRows:d.totalRows??null,filteredRows:d.filteredRows??null,renderedRows:d.renderedRows??null,renderSeq:d.renderSeq??null,totalMs:d.totalMs??null,batchRead:d.batchRead===true},
      visibleRows:document.querySelectorAll('#host table.tbl tbody tr.clickable').length,
      paginationText:(document.querySelector('#host .c360-pagination')?.textContent||'').replace(/\s+/g,' ').trim()
    };
  });
  need(state.rawTotal>0,'CLIENTES_EMPTY');
  need(state.scopedTotal>0,'CLIENTE360_SCOPE_EMPTY');
  need(state.scopedProjectionTotal===state.scopedTotal,'CLIENTE360_SCOPED_PROJECTION_MISMATCH');
  need(state.diagnostics.pageSize===40,'CLIENTE360_APPROVED_PAGE_SIZE_NOT_EFFECTIVE');
  need(state.diagnostics.totalRows===state.scopedTotal,'CLIENTE360_RENDER_INPUT_SCOPE_MISMATCH');
  need(state.diagnostics.renderedRows===Math.min(40,state.scopedTotal),'CLIENTE360_RENDER_DIAGNOSTIC_ROW_MISMATCH');
  need(state.visibleRows===state.diagnostics.renderedRows,'CLIENTE360_POST_RENDER_DOM_DIVERGENCE');
  need(state.paginationText.includes('de '+state.scopedTotal),'CLIENTE360_PAGINATION_SCOPE_MISMATCH');
  const heartbeat=await beat(page);need(heartbeat.maxMs<1000,'CLIENTE360_EVENT_LOOP_BLOCKED');
  return {routeMs,...state,heartbeat};
}

async function probePolizas(page,canonicalPolicy){
  const routeMs=await gotoRoute(page,'#/polizas',()=>Orbit?.route?.key==='polizas'&&!!document.querySelector('#host .page')&&!!document.querySelector('#host table'),12000);
  await page.waitForTimeout(120);
  const chain=await page.evaluate(target=>{
    const raw=(Orbit.store.raw?.().polizas||[]).find(p=>String(p?.numero||'').trim()===target)||null;
    const runtime=(Orbit.store.all('polizas')||[]).find(p=>String(p?.numero||'').trim()===target)||null;
    const scopedRows=Orbit.access?.scopedStore?.('polizas')?.all?.('polizas')||[];
    const scoped=scopedRows.find(p=>String(p?.numero||'').trim()===target)||null;
    const pack=p=>p?{id:p.id,numero:p.numero,prima:p.prima,primaNeta:p.primaNeta,primaTotal:p.primaTotal,moneda:p.moneda}:null;
    const search=document.getElementById('fq');
    if(search){search.value=target;search.dispatchEvent(new Event('input',{bubbles:true}));search.dispatchEvent(new Event('change',{bubbles:true}));}
    return {raw:pack(raw),runtime:pack(runtime),scoped:pack(scoped),scope:Orbit.access?.dataScope?.('polizas')||''};
  },TARGET_POLICY);
  await page.waitForTimeout(220);
  const dom=await page.evaluate(target=>{const rows=[...document.querySelectorAll('#host table.tbl tbody tr')];const hit=rows.find(r=>(r.textContent||'').includes(target));return {found:!!hit,text:hit?(hit.textContent||'').replace(/\s+/g,' ').trim():'',premiumCell:hit?(hit.querySelector('td.num')?.textContent||'').trim():''};},TARGET_POLICY);
  need(chain.raw,'POLIZAS_TARGET_RAW_NOT_FOUND');need(chain.runtime,'POLIZAS_TARGET_RUNTIME_NOT_FOUND');
  need(num(chain.raw.primaTotal)!=null&&num(canonicalPolicy?.primaTotal)!=null&&Math.abs(num(chain.raw.primaTotal)-num(canonicalPolicy.primaTotal))<0.005,'POLIZAS_RAW_PREMIUM_DIVERGENCE_FROM_CANONICAL');
  need(num(chain.runtime.primaTotal)!=null&&Math.abs(num(chain.runtime.primaTotal)-num(chain.raw.primaTotal))<0.005,'POLIZAS_OPERATIONAL_STORE_PREMIUM_DIVERGENCE_FROM_RAW');
  need(num(chain.runtime.primaNeta)!=null&&num(canonicalPolicy?.primaNeta)!=null&&Math.abs(num(chain.runtime.primaNeta)-num(canonicalPolicy.primaNeta))<0.005,'POLIZAS_RUNTIME_NET_PREMIUM_DIVERGENCE_FROM_CANONICAL');
  const expected=await page.evaluate(x=>Orbit.ui.money(Number(x.value),x.cur||'GTQ'),{value:canonicalPolicy.primaTotal,cur:canonicalPolicy.moneda});
  if(chain.scoped){need(dom.found,'POLIZAS_TARGET_ROW_NOT_MATERIALIZED');need(dom.premiumCell===expected,'POLIZAS_DOM_PREMIUM_DIVERGENCE_FROM_RUNTIME');}
  else need(!dom.found,'POLIZAS_OUT_OF_SCOPE_TARGET_LEAKED_TO_DOM');
  const heartbeat=await beat(page);need(heartbeat.maxMs<1000,'POLIZAS_EVENT_LOOP_BLOCKED');
  return {routeMs,canonical:canonicalPolicy,...chain,dom,expectedPremiumText:expected,heartbeat};
}

async function probeCobros(page){
  const routeMs=await gotoRoute(page,'#/cobros',()=>Orbit?.route?.key==='cobros'&&!!document.querySelector('#host .page'),12000);
  await page.waitForTimeout(160);
  const state=await page.evaluate(()=>{
    const scoped=Orbit.access?.scopedStore?.('cobros');
    const q=Orbit.access?.withScope?.('cobros',()=>Orbit.q?.carteraGlobal?.())||null;
    return {
      scope:Orbit.access?.dataScope?.('cobros')||'',
      base:{cobros:Orbit.store.all('cobros').length,recibosEsperados:Orbit.store.all('recibosEsperados').length,carteraPrimas:Orbit.store.all('carteraPrimas').length},
      scoped:{cobros:scoped?.all?.('cobros')?.length||0,recibosEsperados:scoped?.all?.('recibosEsperados')?.length||0,carteraPrimas:scoped?.all?.('carteraPrimas')?.length||0},
      carteraGlobal:q,
      visibleRows:document.querySelectorAll('#host table.tbl tbody tr').length,
      text:(document.querySelector('#host')?.textContent||'').replace(/\s+/g,' ').trim().slice(0,700)
    };
  });
  need(state.base.carteraPrimas>0,'CARTERA_PRIMAS_EMPTY');
  need(state.base.recibosEsperados>0,'RECIBOS_ESPERADOS_EMPTY');
  need(state.carteraGlobal&&typeof state.carteraGlobal==='object','COBROS_CARTERA_GLOBAL_UNAVAILABLE');
  need(!(state.base.carteraPrimas>state.base.cobros&&state.visibleRows<=Math.max(1,state.scoped.cobros)),'COBROS_READ_MODEL_EXCLUDES_CARTERA_PRIMAS');
  const heartbeat=await beat(page);need(heartbeat.maxMs<1000,'COBROS_EVENT_LOOP_BLOCKED');
  return {routeMs,...state,heartbeat};
}

async function openInsurer(page,id){await gotoRoute(page,'#/aseguradoras?ficha='+encodeURIComponent(id),x=>Orbit?.route?.key==='aseguradoras'&&String(Orbit?.route?.params?.ficha||'')===String(x)&&!!document.querySelector('#asg-ficha'),12000,id);await page.waitForTimeout(120);}
async function clickTab(page,tab,container){await page.evaluate(t=>{const el=document.querySelector('#asg-ficha [data-tab="'+t+'"]');if(!el)throw new Error('ASEGURADORAS_TAB_MISSING:'+t);el.click();},tab);await page.waitForFunction(sel=>!!document.querySelector(sel),container,{timeout:8000});await page.waitForTimeout(160);}
async function probeAseguradoras(page,r){
  const routeMs=await gotoRoute(page,'#/aseguradoras',()=>Orbit?.route?.key==='aseguradoras'&&!!document.querySelector('#host .page'),12000);
  const cand=await page.evaluate(()=>{const rows=Orbit.store.all('aseguradoras')||[];const portals=rows.find(x=>x&&Array.isArray(x.portales)&&x.portales.length>0)||null;const banks=rows.find(x=>x&&Array.isArray(x.cuentas)&&x.cuentas.length>0)||null;const credential=rows.find(x=>x&&Array.isArray(x.portales)&&x.portales.some(p=>p&&p.credentialRef))||rows.find(x=>x&&Array.isArray(x.portales)&&x.portales.some(p=>p&&(p.password||p.pass||p.contrasena||p.clave)))||null;const portalSummary=x=>x?{id:x.id,count:x.portales.length}:null;const bankSummary=x=>x?{id:x.id,count:x.cuentas.length,numberBearing:x.cuentas.filter(a=>a&&(a.numero||a.numeroCuenta||a.accountNumber)).length}:null;const credSummary=x=>x?{id:x.id,inline:x.portales.filter(p=>p&&(p.password||p.pass||p.contrasena||p.clave)).length,refs:x.portales.filter(p=>p&&p.credentialRef).length,userBearing:x.portales.filter(p=>p&&(p.usuario||p.user||p.login||p.emailUsuario||p.correoUsuario)).length}:null;return {portals:portalSummary(portals),banks:bankSummary(banks),credentials:credSummary(credential)};});
  need(cand.portals?.id,'ASEGURADORAS_PORTAL_RECORD_UNAVAILABLE');need(cand.banks?.id,'ASEGURADORAS_BANK_RECORD_UNAVAILABLE');
  await openInsurer(page,cand.portals.id);await clickTab(page,'plataformas','#af-portales');
  const portals=await page.evaluate(()=>({ownerVersion:Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.version||'',compositionRevision:Orbit?.clientInsurerOperationalDirectoryOwnerV20260722?.compositionRevision||'',barrierRevision:Orbit?.__clientInsurerVisualStabilityBarrierV20260721?.directoryVisibilityRevision||'',rows:document.querySelectorAll('#af-portales [data-portal]').length,cards:document.querySelectorAll('#af-portales .od-operational-portal-card[data-portal]').length,credentialBoxes:document.querySelectorAll('#af-portales .od-credential-box').length,stable:Orbit?.__clientInsurerVisualStabilityState?.expectedReady===true}));
  need(portals.ownerVersion==='20260829.1','ASEGURADORAS_CANONICAL_OWNER_VERSION_MISMATCH');need(portals.compositionRevision==='20260902.1-predecessor-row-reclaim','ASEGURADORAS_OWNER_COMPOSITION_REVISION_MISMATCH');need(portals.barrierRevision==='20260902.1-latest-operational-owner-precedence','ASEGURADORAS_BARRIER_REVISION_MISMATCH');need(portals.rows===cand.portals.count&&portals.cards===cand.portals.count,'ASEGURADORAS_PORTAL_CARD_COUNT_MISMATCH');need(portals.credentialBoxes===cand.portals.count,'ASEGURADORAS_CREDENTIAL_BOX_COUNT_MISMATCH');need(portals.stable,'ASEGURADORAS_PORTAL_VIEW_NOT_STABLE');
  let credentials={datasetAvailable:!!cand.credentials};
  if(cand.credentials){
    await openInsurer(page,cand.credentials.id);await clickTab(page,'plataformas','#af-portales');
    credentials=await page.evaluate(meta=>{let secure={};try{secure=Orbit?.secureResources?.selfTest?.()||{};}catch{}return {datasetAvailable:true,inlineCount:meta.inline,refCount:meta.refs,userBearing:meta.userBearing,cards:document.querySelectorAll('#af-portales .od-operational-portal-card').length,userVisible:[...document.querySelectorAll('#af-portales [data-od-credential-user]')].filter(x=>{const t=(x.textContent||'').trim();return t&&!/sin usuario/i.test(t);}).length,reveals:document.querySelectorAll('#af-portales [data-od-credential-reveal]').length,unavailable:[...document.querySelectorAll('#af-portales .od-credential-box')].filter(x=>/contraseña no disponible|pendiente de conexión segura/i.test(x.textContent||'')).length,credentialProviderRegistered:secure.credentialProvider===true,secureStatus:secure};},cand.credentials);
    if(PRIV.has(r)){
      if(cand.credentials.userBearing>0)need(credentials.userVisible>0,'ASEGURADORAS_PRIVILEGED_USERNAME_NOT_VISIBLE');
      if(cand.credentials.refs>0){need(credentials.credentialProviderRegistered,'ASEGURADORAS_CREDENTIAL_REF_PROVIDER_NOT_REGISTERED');need(credentials.reveals>0,'ASEGURADORAS_PRIVILEGED_REF_REVEAL_NOT_AVAILABLE');need(credentials.unavailable===0,'ASEGURADORAS_PRIVILEGED_REF_MARKED_UNAVAILABLE');}
      if(cand.credentials.inline>0)need(credentials.reveals>0,'ASEGURADORAS_PRIVILEGED_INLINE_REVEAL_NOT_AVAILABLE');
    }else if(r==='Asesor')need(credentials.reveals===0,'ASEGURADORAS_ADVISOR_CREDENTIAL_REVEAL_EXPOSED');
  }
  await openInsurer(page,cand.banks.id);await clickTab(page,'bancos','#af-cuentas');
  const banks=await page.evaluate(()=>({rows:document.querySelectorAll('#af-cuentas [data-cta]').length,cards:document.querySelectorAll('#af-cuentas .od-operational-bank-card[data-cta]').length,numberVisible:[...document.querySelectorAll('#af-cuentas [data-od-bank-number]')].filter(x=>{const t=(x.textContent||'').trim();return t&&!/pendiente/i.test(t);}).length,stable:Orbit?.__clientInsurerVisualStabilityState?.expectedReady===true}));
  need(banks.rows===cand.banks.count&&banks.cards===cand.banks.count,'ASEGURADORAS_BANK_CARD_COUNT_MISMATCH');if(PRIV.has(r)&&cand.banks.numberBearing>0)need(banks.numberVisible>0,'ASEGURADORAS_PRIVILEGED_BANK_NUMBER_NOT_VISIBLE');need(banks.stable,'ASEGURADORAS_BANK_VIEW_NOT_STABLE');
  return {routeMs,candidates:cand,portals,credentials,banks};
}

const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i4a-readonly-v6'),auth=getAuth(app),db=getFirestore(app);
const data=name=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
const policySnap=await data('polizas').where('numero','==',TARGET_POLICY).get();
const canonicalPolicy=policySnap.empty?null:(()=>{const d=policySnap.docs[0];const p=d.data()||{};return {id:d.id,numero:p.numero,prima:p.prima,primaNeta:p.primaNeta,primaTotal:p.primaTotal,moneda:p.moneda};})();
need(canonicalPolicy,'POLIZAS_CANONICAL_TARGET_NOT_FOUND');
const snap=await db.collection('tenants').doc(TENANT).collection('members').get(),listed=await auth.listUsers(1000),users=new Map(listed.users.map(u=>[u.uid,u]));
const pool=[];for(const doc of snap.docs){const m=doc.data()||{},uid=clean(m.uid||doc.id),u=users.get(uid);if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;const rs=roles(m);pool.push({uid,roles:rs,active:activeRole(m,rs)});}
const selected=new Map();for(const target of TARGETS){const exact=pool.find(x=>x.active===target&&x.roles.includes(target));const fallback=exact||pool.find(x=>x.roles.includes(target));if(fallback)selected.set(target,{...fallback,selectionMode:exact?'persisted-active':'assigned-role'});}
fs.mkdirSync(OUT,{recursive:true});
const ev={schemaVersion:'gravicentra-i4a-authenticated-browser-v6-transverse',gate:'I4A',status:'AUTH_BROWSER_FAIL',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,targetPolicy:TARGET_POLICY,canonicalPolicy,productionTouched:false,dataTouched:false,writesExecuted:0,userIdentitiesRecorded:false,tokensRecorded:false,secretsRecorded:false,probeIsolation:'independent-context-per-module',coverage:{requestedRoles:TARGETS,requestedProbes:PROBES,availableRoles:[...selected.keys()],persistedActiveRoles:[...selected].filter(([,x])=>x.selectionMode==='persisted-active').map(([r])=>r)},roles:{},errors:[]};
let browser;
async function runCase(target,s,name,probe){
  const rec={pass:false,stage:'token'};let context;
  try{
    const token=await auth.createCustomToken(s.uid,{gravicentraI4AReadOnly:true});
    rec.stage='load';context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(12000);const tel=telemetry(page);
    const t=Date.now();await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});rec.domContentLoadedMs=Date.now()-t;
    await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:5000});rec.stage='activate';rec.activationMs=await activate(page,token);
    rec.stage='role';rec.role=await setRole(page,target);rec.stage=name;
    rec.evidence=await deadline(probe(page),22000,'I4A_'+name.toUpperCase()+'_PROBE_TIMEOUT');
    rec.stage='telemetry';rec.telemetry=checkTelemetry(tel);rec.stage='complete';rec.pass=true;
  }catch(e){rec.error=String(e?.message||e);ev.errors.push(target+':'+name+':'+rec.stage+':'+rec.error);}finally{if(context)await Promise.race([context.close().catch(()=>{}),new Promise(r=>setTimeout(r,3000))]);}
  return rec;
}
try{
  need(selected.size>0,'I4A_NO_ACTIVE_VERIFIED_MEMBERSHIPS');browser=await chromium.launch({headless:true});
  for(const target of TARGETS){
    const s=selected.get(target);const rr={pass:false,selectionMode:s?.selectionMode||'unavailable',probes:{}};ev.roles[target]=rr;
    if(!s){rr.error='ROLE_NOT_AVAILABLE';ev.errors.push(target+':ROLE_NOT_AVAILABLE');continue;}
    rr.probes.cliente360=await runCase(target,s,'cliente360',page=>probeCliente360(page));
    rr.probes.polizas=await runCase(target,s,'polizas',page=>probePolizas(page,canonicalPolicy));
    rr.probes.cobros=await runCase(target,s,'cobros',page=>probeCobros(page));
    rr.probes.aseguradoras=await runCase(target,s,'aseguradoras',page=>probeAseguradoras(page,target));
    rr.pass=PROBES.every(name=>rr.probes[name]?.pass===true);
  }
  ev.status=TARGETS.every(r=>ev.roles[r]?.pass===true)?'AUTH_BROWSER_PASS':'AUTH_BROWSER_FAIL';if(ev.status!=='AUTH_BROWSER_PASS')process.exitCode=1;
}catch(e){ev.errors.push(String(e?.message||e));process.exitCode=1;}finally{
  if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(path.join(OUT,'i4a-authenticated-browser.json'),JSON.stringify(ev,null,2)+'\n');
  console.log('I4A_AUTH_BROWSER_STATUS='+ev.status);
  console.log('I4A_AUTH_ROLE_PASS='+Object.entries(ev.roles).filter(([,x])=>x.pass).map(([r])=>r).join(','));
  console.log('I4A_AUTH_ROLE_FAIL='+Object.entries(ev.roles).filter(([,x])=>!x.pass).map(([r])=>r).join(','));
  console.log('I4A_AUTH_PROBE_FAIL='+Object.entries(ev.roles).flatMap(([r,x])=>Object.entries(x.probes||{}).filter(([,p])=>!p.pass).map(([m,p])=>r+'@'+m+':'+(p.error||p.stage))).join(','));
}
