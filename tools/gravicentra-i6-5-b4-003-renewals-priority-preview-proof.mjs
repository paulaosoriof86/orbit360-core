import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, applicationDefault, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B4_PREVIEW_URL||'').replace(/\/$/,'');
const outPath=process.env.B4_RENEWALS_PROOF_OUT||'/tmp/b4-003-renewals-priority-preview-proof.json';
const TODAY='2026-10-07',CUTOFF='2026-07-31',RECENT_START='2026-08-01';
const RULE_ID='PAULA_EXPIRED_CUTOFF_20261007';
const REASON='VIGENCIA_FIN_HASTA_2026_07_31_SIN_RENOVACION_NI_CANCELACION';
const EXPECTED_POLICY_COUNT=1419,EXPECTED_TERMINAL_COUNT=583,EXPECTED_RECENT_COUNT=24;
const EXPECTED_RECENT_DIGEST='3512b167cdde30b51f67acc3c77135f2a94df5f133fd2d3b45cde8540938e67a';
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const need=(v,c)=>{if(!v)throw new Error(c);};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const validDate=v=>/^20\d{2}-\d{2}-\d{2}$/.test(clean(v));
need(target,'B4_003_RENEWALS_PREVIEW_URL_MISSING');

const proof={
  schema:'GRAVICENTRA_I6_5_B4_003_RENEWALS_PRIORITY_EXACT_PREVIEW_PROOF_V1',
  recordedAt:new Date().toISOString(),status:'INIT',target,scope:'RENEWALS_ONLY',
  roles:['direccion','operativo'],countries:['TODOS','GT','CO'],
  viewports:[{name:'DESKTOP',width:1440,height:1000},{name:'390x844',width:390,height:844},{name:'320x568',width:320,height:568}],
  backend:{},sessions:[],assertions:{},pageErrors:[],consoleErrors:[],httpErrors:[],
  writes:{realBusiness:0,syntheticQa:0,cleanup:0},livePromotion:false,reimport:false
};
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);
const col=n=>tenant.collection('data').doc(n).collection('items');

const renewability=p=>{
  if(!own(p,'renovable')||p.renovable==null||clean(p.renovable)==='')return'UNKNOWN';
  const v=norm(p.renovable);
  if(p.renovable===true||['true','si','renovable'].includes(v))return'YES';
  if(p.renovable===false||['false','no','norenovable'].includes(v))return'NO';
  return'UNKNOWN';
};
const renewalOutcome=p=>{
  if(clean(p?.renovadaPor))return'RENEWED';
  const x=norm(p?.renovacionEstado);
  if(x==='renovada')return'RENEWED';
  if(['norenovada','rechazada','cerrada'].includes(x))return'NO_RENEWED';
  if(x==='cancelada')return'CANCELLED';
  const e=norm(p?.estado);if(['cancelada','anulada'].includes(e))return'CANCELLED';
  return'OPEN';
};

async function backendReadback(){
  const [ps,cs]=await Promise.all([col('polizas').get(),col('cancelaciones').get()]);
  const rows=ps.docs.map(d=>({id:d.id,p:d.data()||{}})),cancellations=new Set();
  for(const d of cs.docs){const p=d.data()||{},id=clean(p.polizaId||p.policyId);if(id)cancellations.add(id);}
  const terminal=rows.filter(({p})=>p.renewalDispositionRuleId===RULE_ID),recentRaw=[];
  need(ps.size===EXPECTED_POLICY_COUNT,'B4_003_RENEWALS_POLICY_COUNT_DRIFT:'+ps.size);
  need(terminal.length===EXPECTED_TERMINAL_COUNT,'B4_003_RENEWALS_B02_TERMINAL_COUNT:'+terminal.length);
  need(terminal.every(({p})=>clean(p.renovacionEstado)==='No renovada'&&clean(p.renewalDispositionReason)===REASON&&validDate(p.vigenciaFin||p.fechaFin||p.endDate)&&clean(p.vigenciaFin||p.fechaFin||p.endDate)<=CUTOFF),'B4_003_RENEWALS_B02_TERMINAL_READBACK');
  const oldOpen=[],recent=[];
  for(const {id,p} of rows){
    const end=clean(p.vigenciaFin||p.fechaFin||p.endDate);
    if(!validDate(end)||end>=TODAY)continue;
    let outcome=renewalOutcome(p);if(cancellations.has(id))outcome='CANCELLED';
    if(outcome!=='OPEN'||renewability(p)==='NO')continue;
    const item={idHash:hash(id).slice(0,16),numeroHash:hash(clean(p.numero)).slice(0,12),vigenciaFin:end,pais:clean(p.pais),estado:clean(p.estado),renewability:renewability(p)};
    if(end<=CUTOFF)oldOpen.push({...item,currentRenewalOutcome:clean(p.renovacionEstado)});
    else if(end>=RECENT_START&&end<TODAY){recent.push({...item,expectedBucket:'Vencidas'});recentRaw.push({id,p});}
  }
  need(oldOpen.length===0,'B4_003_RENEWALS_OLD_OPEN_REMAIN:'+oldOpen.length);
  need(recent.length===EXPECTED_RECENT_COUNT,'B4_003_RENEWALS_RECENT_COUNT:'+recent.length);
  need(hash(recent)===EXPECTED_RECENT_DIGEST,'B4_003_RENEWALS_RECENT_DIGEST:'+hash(recent));
  const counts=(items,pick)=>items.reduce((a,x)=>{const k=clean(pick(x))||'VACIO';a[k]=(a[k]||0)+1;return a;},{});
  proof.backend={policyCount:ps.size,b02TerminalCount:terminal.length,b02TerminalIdDigest:hash(terminal.map(x=>x.id).sort()),oldOpenCount:0,recentCount:recent.length,recentDigest:hash(recent),recentStateCounts:counts(recentRaw,x=>x.p.estado),recentCountryCounts:counts(recentRaw,x=>x.p.pais),recentRenewabilityCounts:counts(recentRaw,x=>renewability(x.p)),terminalIds:terminal.map(x=>x.id),recentIds:recentRaw.map(x=>x.id)};
  proof.assertions.b02Exact583Terminal=true;
  proof.assertions.b02OldOpenZero=true;
  proof.assertions.b02Recent24Untouched=true;
}

async function actorForRole(roleWanted){
  const wanted=norm(roleWanted),snap=await tenant.collection('members').get(),candidates=[];
  for(const d of snap.docs){
    const m=d.data()||{},state=norm(m.status||m.estado||'active');
    const roles=[m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol].concat(m.roles||[],m.assignedRoles||[],m.rolesAsignados||[]).map(norm).filter(Boolean);
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state)||!roles.includes(wanted))continue;
    try{const u=await auth.getUser(d.id);if(!u.disabled&&u.emailVerified===true)candidates.push({uid:u.uid,email:clean(u.email),activeRole:wanted});}catch{}
  }
  need(candidates.length,'B4_003_RENEWALS_VERIFIED_ACTOR_NOT_FOUND:'+wanted);
  return candidates.sort((a,b)=>a.email.localeCompare(b.email))[0];
}
async function applyLegal(page,who){
  const scope='user:'+clean(who.email||who.uid);
  await page.addInitScript(({scope})=>{try{
    localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
    localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
  }catch{}},{scope});
}
async function bootProduct(page,token){
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
  const state=await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    const requested=['clientes','polizas','aseguradoras'],trace=[];
    const force=()=>{try{
      const attached=Orbit.store&&typeof Orbit.store._ensureCollections==='function'?Orbit.store._ensureCollections(requested)||[]:[];
      trace.push({attached:[].concat(attached)});
    }catch(error){trace.push({error:String(error&&error.message||error)});}};
    force();
    let activated=Orbit.productAppP0.status?.(),lastError='';
    for(let attempt=1;attempt<=6&&!activated?.started;attempt++){
      try{activated=await Promise.resolve(Orbit.productAppP0.activate());lastError='';}
      catch(error){lastError=String(error&&error.message||error);if(!/PRODUCT_(?:READONLY_BOOTSTRAP_NOT_READY|STORE_NOT_READY)/.test(lastError)||attempt===6)throw error;await new Promise(r=>setTimeout(r,Math.min(2500,500*attempt)));}
    }
    force();
    return{uid:String(c.auth.currentUser?.uid||''),started:activated?.started===true,trace,lastError};
  },token);
  need(state.uid&&state.started,'B4_003_RENEWALS_PRODUCT_SESSION_NOT_STARTED');
  return state;
}
async function selectRole(page,role){
  await page.waitForFunction(role=>{
    const n=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    return !!Orbit.session&&typeof Orbit.session.allowedRoles==='function'&&Orbit.session.allowedRoles().some(x=>n(x)===role);
  },role,{timeout:10000});
  const selected=await page.evaluate(role=>Orbit.session.set(role)===true,role);
  need(selected,'B4_003_RENEWALS_ROLE_SELECTION_REJECTED:'+role);
  await page.waitForFunction(role=>String(Orbit.session.rol()||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'')===role,role,{timeout:10000});
}
async function renderCountry(page,country,phase,viewport){
  const started=Date.now();
  await page.evaluate(country=>{Orbit.pais=country;location.hash='#/renovaciones';const h=document.getElementById('host');if(h&&Orbit.modules?.renovaciones)Orbit.modules.renovaciones.render(h);},country);
  await page.waitForFunction(()=>location.hash==='#/renovaciones',null,{timeout:10000});
  await page.waitForFunction(()=>{
    const h=document.getElementById('host');if(!h)return false;
    const terminal=h.querySelector('[data-renewals-loading="timed_out"],[data-renewals-loading="unavailable"]');
    if(terminal)return true;
    return !h.querySelector('[data-renewals-loading]')&&h.querySelectorAll('[data-renewal-bucket]').length===4;
  },null,{timeout:15000});
  const initialTerminal=await page.evaluate(()=>document.querySelector('[data-renewals-loading]')?.getAttribute('data-renewals-loading')||'');
  let recovery=null;
  if(initialTerminal){
    recovery=await page.evaluate(async()=>{
      const requested=['clientes','polizas','aseguradoras'],started=Date.now(),samples=[];
      while(Date.now()-started<30000){
        try{if(Orbit.store&&typeof Orbit.store._ensureCollections==='function')Orbit.store._ensureCollections(requested);}catch{}
        const s=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
        const confirmed=[].concat(s.serverConfirmedCollections||[]),denied=[].concat(s.deniedCollections||[]),errors=s.snapshotErrors||{};
        samples.push({ms:Date.now()-started,confirmed:confirmed.filter(x=>requested.includes(x)),denied:denied.filter(x=>requested.includes(x)),errors:Object.keys(errors).filter(x=>requested.includes(x))});
        if(requested.every(x=>confirmed.includes(x)))return{ready:true,ms:Date.now()-started,samples:samples.slice(-6)};
        if(requested.some(x=>denied.includes(x)||errors[x]))return{ready:false,terminal:'unavailable',ms:Date.now()-started,samples:samples.slice(-6)};
        await new Promise(resolve=>setTimeout(resolve,750));
      }
      return{ready:false,terminal:'timed_out',ms:Date.now()-started,samples:samples.slice(-6)};
    });
    need(recovery.ready===true,'B4_003_RENEWALS_RETRY_SERVER_CONFIRMATION_'+String(recovery.terminal||'unknown')+':'+JSON.stringify(recovery.samples));
    await page.click('[data-renewals-retry]');
    await page.waitForFunction(()=>!document.querySelector('[data-renewals-loading]')&&document.querySelectorAll('[data-renewal-bucket]').length===4,null,{timeout:15000});
  }
  const state=await page.evaluate(({country,terminalIds,recentIds})=>{
    const n=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const cc=v=>String(v==null?'':v).trim().toUpperCase(),store=Orbit.store,h=document.getElementById('host');
    const client=id=>id?store.get('clientes',id):null;
    const policyCountry=p=>cc(p?.pais||client(p?.clienteId)?.pais);
    const selected=p=>country==='TODOS'||policyCountry(p)===country;
    const rstate=p=>{if(!Object.prototype.hasOwnProperty.call(p||{},'renovable')||p.renovable==null||String(p.renovable).trim()==='')return'UNKNOWN';const v=n(p.renovable);if(p.renovable===true||['true','si','renovable'].includes(v))return'YES';if(p.renovable===false||['false','no','norenovable'].includes(v))return'NO';return'UNKNOWN';};
    const terminal=p=>!!p?.renovadaPor||['renovada','norenovada','rechazada','cerrada','cancelada'].includes(n(p?.renovacionEstado));
    const eligible=p=>{if(!p||rstate(p)==='NO'||!selected(p)||terminal(p))return false;const d=Orbit.ui.daysFromNow(p.vigenciaFin),s=n(p.estado);if(d==null||d>90)return false;return d<0?['vigente','porrenovar','vencida'].includes(s):['vigente','porrenovar'].includes(s);};
    const expected=(store.all('polizas')||[]).filter(eligible).map(p=>p.id).sort();
    const cards=[...h.querySelectorAll('[data-renewal-policy]')],visible=cards.map(x=>x.getAttribute('data-renewal-policy')).sort();
    const buckets=[...h.querySelectorAll('[data-renewal-bucket]')].map(x=>({key:x.dataset.renewalBucket,count:Number(x.dataset.renewalBucketCount||0),visible:x.querySelectorAll('[data-renewal-policy]').length}));
    const recentAccessible=recentIds.filter(id=>{const p=store.get('polizas',id);return !!p&&selected(p);}).sort();
    const recentVisible=recentAccessible.filter(id=>{const el=h.querySelector('[data-renewal-policy="'+CSS.escape(id)+'"]');return !!el&&el.closest('[data-renewal-bucket]')?.dataset.renewalBucket==='vencidas';});
    const terminalVisible=terminalIds.filter(id=>!!h.querySelector('[data-renewal-policy="'+CSS.escape(id)+'"]'));
    const labelOk=cards.every(card=>{const t=[...card.querySelectorAll('.badge')].map(x=>String(x.textContent||'').trim());return t.some(x=>x.startsWith('Póliza:'))&&t.some(x=>x.startsWith('Renovación:'));});
    const board=h.querySelector('.renewal-board'),boardRect=board?.getBoundingClientRect();
    const cardsFit=cards.every(card=>{const r=card.getBoundingClientRect();return !boardRect||r.left>=boardRect.left-2&&r.right<=boardRect.right+2;});
    const actionsFit=cards.every(card=>[...card.querySelectorAll('.renewal-card-actions > *')].every(el=>{const r=el.getBoundingClientRect(),cr=card.getBoundingClientRect();return r.left>=cr.left-2&&r.right<=cr.right+2&&r.width>0;}));
    return{
      loadingState:h.querySelector('[data-renewals-loading]')?.getAttribute('data-renewals-loading')||'ready',
      bucketKeys:buckets.map(x=>x.key),bucketCounts:buckets,expectedCount:expected.length,visibleCount:visible.length,
      exactCanonicalIds:JSON.stringify(expected)===JSON.stringify(visible),
      recentAccessibleCount:recentAccessible.length,recentVisibleCount:recentVisible.length,
      recentExact:recentAccessible.length===recentVisible.length,
      terminalVisibleCount:terminalVisible.length,labelOk,cardsFit,actionsFit,
      boardFits:!!board&&board.scrollWidth<=board.clientWidth+2,
      hostText:String(h.innerText||'').slice(0,500)
    };
  },{country,terminalIds:proof.backend.terminalIds,recentIds:proof.backend.recentIds});
  state.phase=phase;state.country=country;state.viewport=viewport;state.readyMs=Date.now()-started;state.initialTerminal=initialTerminal||null;state.recovery=recovery;
  need(state.loadingState==='ready','B4_003_RENEWALS_ROUTE_TERMINAL_'+state.loadingState);
  need(JSON.stringify(state.bucketKeys)===JSON.stringify(['vencidas','d15','d45','d90']),'B4_003_RENEWALS_BUCKET_KEYS');
  need(state.exactCanonicalIds&&state.bucketCounts.every(x=>x.count===x.visible)&&state.bucketCounts.reduce((s,x)=>s+x.count,0)===state.visibleCount,'B4_003_RENEWALS_CANONICAL_RECONCILIATION');
  need(state.recentExact&&state.terminalVisibleCount===0,'B4_003_RENEWALS_B02_UI_RECONCILIATION');
  need(country!=='TODOS'||(state.recentAccessibleCount===EXPECTED_RECENT_COUNT&&state.recentVisibleCount===EXPECTED_RECENT_COUNT),'B4_003_RENEWALS_RECENT_24_NOT_ALL_IN_VENCIDAS:'+state.recentAccessibleCount+':'+state.recentVisibleCount);
  need(state.labelOk,'B4_003_RENEWALS_POLICY_RENEWAL_LABELS');
  need(state.boardFits&&state.cardsFit&&state.actionsFit,'B4_003_RENEWALS_RESPONSIVE_LAYOUT');
  return state;
}
async function firstPaintGuard(page){
  const r=await page.evaluate(()=>{
    const h=document.getElementById('host'),store=Orbit.store,original=store._productStatus;
    let state='',leaked=-1;
    try{
      store._productStatus=function(){const q=original.call(store)||{},confirmed=[].concat(q.serverConfirmedCollections||[]).filter(x=>x!=='aseguradoras');return Object.assign({},q,{serverConfirmedCollections:confirmed});};
      Orbit.modules.renovaciones.render(h);
      state=h.querySelector('[data-renewals-loading]')?.getAttribute('data-renewals-loading')||'';
      leaked=h.querySelectorAll('[data-renewal-policy]').length;
    }finally{store._productStatus=original;Orbit.modules.renovaciones.render(h);}
    return{state,leaked};
  });
  need(r.state==='pending'&&r.leaked===0,'B4_003_RENEWALS_FIRST_PAINT_GUARD');
  return r;
}

let browser;
try{
  await backendReadback();
  browser=await chromium.launch({headless:true});
  for(const role of proof.roles){
    const who=await actorForRole(role),token=await auth.createCustomToken(who.uid);
    const ctx=await browser.newContext({ignoreHTTPSErrors:false,viewport:{width:1440,height:1000}});
    const page=await ctx.newPage(),pageErrors=[],consoleErrors=[],httpErrors=[];
    page.on('pageerror',e=>pageErrors.push(clean(e?.message||e)));
    page.on('console',m=>{if(m.type()==='error'&&!/AbortError|ERR_ABORTED|favicon/i.test(m.text()))consoleErrors.push(clean(m.text()));});
    page.on('response',r=>{if(r.status()>=500)httpErrors.push({status:r.status(),url:r.url().replace(/[?#].*$/,'')});});
    await applyLegal(page,who);
    await page.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});
    await bootProduct(page,token);await selectRole(page,role);
    const session={role,actorUidHash:hash(who.uid).slice(0,16),cold:[],warm:[],mobile:[],firstPaint:null};
    session.firstPaint=await firstPaintGuard(page);
    for(const country of proof.countries)session.cold.push(await renderCountry(page,country,'cold','DESKTOP'));
    await page.evaluate(()=>{location.hash='#/inicio';});
    await page.waitForTimeout(250);
    for(const country of proof.countries)session.warm.push(await renderCountry(page,country,'warm','DESKTOP'));
    for(const viewport of proof.viewports.filter(x=>x.name!=='DESKTOP')){
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      for(const country of proof.countries)session.mobile.push(await renderCountry(page,country,'warm',viewport.name));
    }
    proof.pageErrors.push(...pageErrors.map(error=>({role,error})));
    proof.consoleErrors.push(...consoleErrors.map(error=>({role,error})));
    proof.httpErrors.push(...httpErrors.map(error=>({role,...error})));
    proof.sessions.push(session);
    await ctx.close();
  }
  need(proof.pageErrors.length===0,'B4_003_RENEWALS_PAGE_ERRORS');
  need(proof.consoleErrors.length===0,'B4_003_RENEWALS_CONSOLE_ERRORS');
  need(proof.httpErrors.length===0,'B4_003_RENEWALS_HTTP_5XX');
  proof.assertions.authenticatedDirectionAndOperativo=true;
  proof.assertions.coldAndWarmBounded=true;
  proof.assertions.countriesTodosGtCo=true;
  proof.assertions.desktop390And320=true;
  proof.assertions.firstPaintNoPartialLeak=true;
  proof.assertions.policyAndRenewalLabelsSeparate=true;
  proof.assertions.kpiBucketsCanonical=true;
  proof.assertions.noRelevantBrowserErrors=true;
  delete proof.backend.terminalIds;delete proof.backend.recentIds;
  proof.status='PASS';
}catch(error){
  proof.status='FAIL';proof.error=String(error&&error.stack||error);
  throw error;
}finally{
  try{if(browser)await browser.close();}catch{}
  try{await deleteApp(app);}catch{}
  fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
}
console.log(JSON.stringify(proof,null,2));
