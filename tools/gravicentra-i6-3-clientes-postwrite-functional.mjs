import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab', TENANT='alianzas-soluciones';
const TARGET=String(process.env.TARGET_URL||'').replace(/\/$/,'');
const STAGE=process.env.I63_PROOF_STAGE||'unknown';
const EXPECTED_SOURCE=process.env.EXPECTED_SOURCE_SHA||'';
const EXPECTED_BUILD=process.env.EXPECTED_BUILD_ID||'';
const OUT=process.env.I63_PROOF_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i63-postwrite-'+STAGE+'.json');
const CONTROL_HASHES=new Set([
  '5a64d137c5c019d8f719a519001f6ab1d7bba3bc8d4b8b0e4963644593cd8623',
  'a05e135f1b2d5b112bbe72e4176a7b3199b3269f22c219468affca126951a38b',
  '8d05e77ca897732cf909dbda5c362eb7a04563c496d7bbd1865835f603b50f46',
  '8de6af4f61782df5947657998c7300c74396578e1376d131ec15e6a3acb8ccb5',
  '3ee955e3cb4979d72fbc7030aa6dd6170c4c9c3c070e18671d658d5322d77aad'
]);
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');
const need=(x,c)=>{if(!x)throw new Error(c);};

function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('I63_PROOF_SERVICE_ACCOUNT');
}
function rolesOf(m){return [...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.rolesDisponibles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[]).map(v=>clean(v)).filter(Boolean))];}
async function selectManager(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get();
  for(const p of ['direccion','superadmin','super_admin','admintenant','admin_tenant','admin']){
    for(const d of snap.docs){
      const m=d.data()||{},uid=clean(m.uid||d.id,180),role=rolesOf(m).find(r=>norm(r)===p),state=norm(m.status||m.estado||'active');
      if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;
      try{const u=await auth.getUser(uid);if(!u.disabled&&u.emailVerified===true)return{uid,role};}catch{}
    }
  }
  throw new Error('I63_PROOF_NO_MANAGER');
}
async function activate(page,auth,actor){
  const token=await auth.createCustomToken(actor.uid,{gravicentraI63PostWrite:true});
  await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:15000});
  const st=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();},token);
  need(st?.started===true,'I63_PROOF_APP_START');
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:18000});
  const gate=page.locator('[data-legal-gate].open');
  if(await gate.count()){const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');if(await chk.count())await chk.check();if(await ok.count())await ok.click();await gate.waitFor({state:'detached',timeout:5000}).catch(()=>{});}
  const sess=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));
  if(sess.active!==actor.role){need(sess.assigned.includes(actor.role),'I63_PROOF_ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),actor.role),'I63_PROOF_ROLE_SWITCH');await page.waitForFunction(r=>Orbit.session?.rol?.()===r,actor.role,{timeout:6000});}
}

const sa=serviceAccount(), app=initializeApp({credential:cert(sa),projectId:PROJECT},'i63-proof-'+STAGE), db=getFirestore(app), auth=getAuth(app);
let browser;
const ev={schema:'GRAVICENTRA_I6_3_POSTWRITE_FUNCTIONAL_V2',stage:STAGE,status:'FAIL',backend:{},ui:{},kpi:{},filters:{},relations:{},errors:[],containsPII:false,containsSecrets:false,writes:0};
try{
  need(/^https:\/\//.test(TARGET),'I63_PROOF_TARGET');
  const snap=await db.collection('tenants').doc(TENANT).collection('data').doc('clientes').collection('items').get();
  need(snap.size===442,'I63_PROOF_BACKEND_COUNT');
  const controlIds=[]; let unresolvedBackend=0;
  for(const d of snap.docs){
    const x=d.data()||{};
    if(CONTROL_HASHES.has(sha(norm(x.nombre||x.name||''))))controlIds.push(d.id);
    if(norm(x.pais||x.country||'')==='requiere_validacion')unresolvedBackend++;
  }
  need(controlIds.length===5,'I63_PROOF_CONTROL_SAMPLE_BACKEND');
  need(unresolvedBackend>=6,'I63_PROOF_UNRESOLVED_BACKEND');
  ev.backend={documentCount:442,controlSamplesPresent:5,unresolvedCountryCount:unresolvedBackend};

  const actor=await selectManager(db,auth);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const pageErrors=[],http404=[];
  page.on('pageerror',e=>pageErrors.push(clean(e?.stack||e?.message||e,1200)));
  page.on('response',r=>{if(r.status()===404&&r.url().startsWith(TARGET))http404.push(new URL(r.url()).pathname);});
  await activate(page,auth,actor);

  const marker=await page.evaluate(()=>({source:window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__?.sourceSha||'',build:window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__?.buildId||''}));
  need(marker.source===EXPECTED_SOURCE&&marker.build===EXPECTED_BUILD,'I63_PROOF_RELEASE_MARKER');

  await page.evaluate(()=>{location.hash='#/cliente360';});
  await page.waitForFunction(()=>Orbit?.route?.key==='cliente360'&&window.OrbitRuntimeDiagnostics?.cliente360?.list?.renderSeq>0,null,{timeout:22000});
  await page.waitForFunction(()=>{const k=[...document.querySelectorAll('.kpi-row .kpi')][2];return /prima neta vigente/i.test(k?.querySelector('.k-label')?.textContent||'');},null,{timeout:6000});

  const ui=await page.evaluate(ids=>{
    const all=Orbit.store.all('clientes')||[];
    const diag=window.OrbitRuntimeDiagnostics?.cliente360?.list||{};
    const k=[...document.querySelectorAll('.kpi-row .kpi')][2];
    const label=(k?.querySelector('.k-label')?.textContent||'').trim();
    const value=(k?.querySelector('.k-val')?.textContent||'').replace(/\s+/g,' ').trim();
    const foot=(k?.querySelector('.k-foot')?.textContent||'').trim();
    const scope=Orbit.access?.dataScope?.('cliente360')||'';
    const plan=Orbit.store?._productStatus?.()?.queryPlans?.clientes||{};
    const clients=Orbit.access?.filter?Orbit.access.filter('clientes',all,'cliente360'):all;
    const clientById=new Map(clients.map(c=>[c.id,c]));
    const policies=(Orbit.access?.filter?Orbit.access.filter('polizas',Orbit.store.all('polizas')||[],'cliente360'):(Orbit.store.all('polizas')||[])).filter(p=>clientById.has(p.clienteId)&&(p.estado==='Vigente'||p.estado==='Por renovar'));
    const map={};
    for(const p of policies){
      const cli=clientById.get(p.clienteId)||{},n=Number(p.primaNeta!=null?p.primaNeta:p.prima);
      if(!Number.isFinite(n))continue;
      const cur=String(p.moneda||p.divisa||cli.moneda||'SIN_MONEDA').trim()||'SIN_MONEDA';
      map[cur]=(map[cur]||0)+n;
    }
    const amounts=Object.fromEntries(Object.entries(map).map(([cur,n])=>[cur,Math.round(n)]));
    const amountsMatch=Object.entries(amounts).every(([cur,n])=>value.includes(cur)&&value.includes(Number(n).toLocaleString('es-GT',{maximumFractionDigits:0})));
    return {
      rawCount:all.length,totalRows:diag.totalRows,renderedRows:diag.renderedRows,scope,
      planHasValidation:JSON.stringify(plan).includes('REQUIERE_VALIDACION'),
      controlsHydrated:ids.filter(id=>!!Orbit.store.get('clientes',id)).length,
      unresolvedVisible:all.filter(c=>String(c.pais||c.country||'').toUpperCase()==='REQUIERE_VALIDACION').length,
      label,foot,amounts,amountsMatch,
      nameTextTransform:(()=>{const el=document.querySelector('.c360-client-name');return el?getComputedStyle(el).textTransform:'';})()
    };
  },controlIds);
  need(ui.rawCount===442&&ui.totalRows===442,'I63_PROOF_UI_COUNT_MISMATCH');
  need(ui.controlsHydrated===5,'I63_PROOF_CONTROL_SAMPLE_UI');
  need(ui.unresolvedVisible>=6,'I63_PROOF_UNRESOLVED_UI');
  need(ui.scope==='all','I63_PROOF_MANAGER_SCOPE_NOT_ALL');
  need(ui.planHasValidation===true,'I63_PROOF_QUERY_PLAN_DROPS_VALIDATION');
  need(/^Prima neta vigente$/i.test(ui.label)&&/separada por moneda/i.test(ui.foot)&&ui.amountsMatch,'I63_PROOF_KPI_CANONICAL');
  need(ui.nameTextTransform==='uppercase','I63_PROOF_CLIENT_NAME_CASE_NOT_UPPERCASE');
  ev.ui={runtimeVisibleClientCount:ui.rawCount,diagnosticTotalRows:ui.totalRows,renderedRows:ui.renderedRows,controlSamplesHydrated:ui.controlsHydrated,unresolvedCountryVisible:ui.unresolvedVisible,queryPlanIncludesValidation:true,actorRole:actor.role,scope:ui.scope,clientNameDisplay:'UPPERCASE'};
  ev.kpi={status:'PASS',label:'Prima neta vigente',separatedByCurrency:true,amounts:ui.amounts};

  let searched=0;
  for(const id of controlIds){
    await page.evaluate(()=>{location.hash='#/cliente360';});
    await page.waitForSelector('#f-q');
    const ok=await page.evaluate(id=>{const c=Orbit.store.get('clientes',id),q=document.getElementById('f-q');if(!c||!q)return false;q.value=c.nombre||'';q.dispatchEvent(new Event('input',{bubbles:true}));return true;},id);
    need(ok,'I63_PROOF_SEARCH_INPUT');
    await page.waitForTimeout(120);
    const found=await page.evaluate(id=>[...document.querySelectorAll('tbody tr.clickable')].some(tr=>(tr.getAttribute('onclick')||'').includes('?c='+id)),id);
    need(found,'I63_PROOF_CONTROL_SEARCH_NOT_VISIBLE');
    const canonical=await page.evaluate(()=>{const k=[...document.querySelectorAll('.kpi-row .kpi')][2];return /prima neta vigente/i.test(k?.querySelector('.k-label')?.textContent||'')&&/separada por moneda/i.test(k?.querySelector('.k-foot')?.textContent||'');});
    need(canonical,'I63_PROOF_KPI_REGRESSED_AFTER_SEARCH');
    searched++;
  }
  ev.filters.searchControlSamples=searched;

  await page.evaluate(()=>{location.hash='#/cliente360';});
  await page.waitForSelector('#f-tipo');
  const fc=await page.evaluate(()=>{
    const out={type:false,country:false,advisor:false};
    const fire=(el,val)=>{el.value=val;el.dispatchEvent(new Event('change',{bubbles:true}));};
    const tipo=document.getElementById('f-tipo'); if(tipo&&[...tipo.options].some(o=>o.value==='Persona')){fire(tipo,'Persona');out.type=true;}
    const pais=document.getElementById('f-pais'); if(pais&&[...pais.options].some(o=>o.value==='GT')){fire(pais,'GT');out.country=true;}
    const ase=document.getElementById('f-ase'); if(ase){const o=[...ase.options].find(x=>x.value);if(o){fire(ase,o.value);out.advisor=true;}}
    return out;
  });
  need(fc.type&&fc.country&&fc.advisor,'I63_PROOF_FILTER_CONTROLS');
  ev.filters={...ev.filters,...fc};

  const contactAlias=await page.evaluate(()=>{
    const raw=(Orbit.store.all('clientes')||[]).find(c=>c&&String(c.whatsapp||'').trim()&&!String(c.telefono||'').trim()&&String(c.email||c.correo||'').trim());
    if(!raw)return{ok:false};
    const projected=Orbit.clientProjection?.project?Orbit.clientProjection.project(raw):raw;
    return{ok:String(projected.telefono||'').trim()===String(raw.whatsapp||'').trim()&&String(projected.email||'').trim()===String(raw.email||raw.correo||'').trim(),id:raw.id};
  });
  need(contactAlias.ok&&contactAlias.id,'I63_PROOF_CONTACT_ALIAS_PROJECTION');
  await page.evaluate(cid=>{location.hash='#/cliente360?c='+encodeURIComponent(cid);},contactAlias.id);
  await page.waitForFunction(cid=>Orbit?.route?.key==='cliente360'&&location.hash.includes(encodeURIComponent(cid)),contactAlias.id,{timeout:12000});
  const contactVisible=await page.evaluate(cid=>{
    const raw=Orbit.store.get('clientes',cid)||{};
    const phone=String(raw.whatsapp||'').replace(/\D/g,'');
    const email=String(raw.email||raw.correo||'').trim().toLowerCase();
    const text=(document.querySelector('.fh-contact')?.textContent||'').replace(/\s+/g,' ').toLowerCase().replace(/\D/g,' ');
    const html=(document.querySelector('.fh-contact')?.textContent||'').toLowerCase();
    return{phone:phone&&html.replace(/\D/g,'').includes(phone),email:email&&html.includes(email)};
  },contactAlias.id);
  need(contactVisible.phone&&contactVisible.email,'I63_PROOF_CONTACT_ALIAS_NOT_VISIBLE');
  ev.ui.contactAliasProjection='PASS';

  const rel=await page.evaluate(()=>{const p=(Orbit.store.all('polizas')||[]).find(x=>x&&x.clienteId&&Orbit.store.get('clientes',x.clienteId));return p?{ok:true,cid:p.clienteId}:{ok:false};});
  need(rel.ok,'I63_PROOF_RELATION_SAMPLE');
  await page.evaluate(cid=>{location.hash='#/cliente360?c='+encodeURIComponent(cid)+'&t=polizas';},rel.cid);
  await page.waitForFunction(cid=>Orbit?.route?.key==='cliente360'&&!!Orbit.store?.get?.('clientes',cid),rel.cid,{timeout:12000});
  ev.relations={clientPolicyRelation:true};

  if(pageErrors.length) console.error('I63_PAGE_ERRORS='+JSON.stringify(pageErrors.slice(0,10)));
  if(http404.length) console.error('I63_HTTP404='+JSON.stringify(http404.slice(0,10)));
  need(pageErrors.length===0,'I63_PROOF_PAGE_ERRORS');
  need(http404.length===0,'I63_PROOF_HTTP404');
  ev.ui.pageErrors=0;ev.ui.http404=0;ev.status='PASS';
}catch(e){ev.errors.push(clean(e?.message||e,220));console.error('I63_PROOF_ERROR='+clean(e?.message||e,220));process.exitCode=1;}
finally{
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(OUT,JSON.stringify(ev,null,2)+'\n');
  console.log('I63_POSTWRITE_PROOF='+ev.status);
  console.log('I63_POSTWRITE_STAGE='+STAGE);
  console.log('I63_BACKEND_COUNT='+(ev.backend.documentCount||0));
  console.log('I63_UI_COUNT='+(ev.ui.runtimeVisibleClientCount||0));
  console.log('I63_CONTROL_SAMPLES='+(ev.ui.controlSamplesHydrated||0));
  console.log('I63_KPI='+(ev.kpi.status||'NOT_PASS'));
}
