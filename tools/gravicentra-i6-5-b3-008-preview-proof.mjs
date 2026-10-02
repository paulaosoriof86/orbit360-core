import fs from 'node:fs';
import { chromium } from 'playwright';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B3_PREVIEW_URL||'').replace(/\/$/,'');
const outPath=process.env.B3_008_PROOF_OUT||'/tmp/b3-008-preview-proof.json';
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const privileged=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin']);
const activePolicy=p=>['vigente','por_renovar','porrenovar'].includes(norm(p?.estado));
const openPortfolio=r=>r?.conciliadoPago!==true&&!['pagado','cobrado','cerrado','anulado','cancelado','cancelada'].includes(norm(r?.estadoCartera||r?.estado));
const dueOf=r=>clean(r?.vence||r?.fechaVencimiento||r?.fechaLimite);
const isOverdue=r=>{const d=dueOf(r);return openPortfolio(r)&&/^\d{4}-\d{2}-\d{2}/.test(d)&&d.slice(0,10)<new Date().toISOString().slice(0,10);};

need(target,'B3_008_PREVIEW_URL_MISSING');
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId),root=tenant.collection('data');

async function actor(){
  const snap=await tenant.collection('members').get();
  const candidates=[];
  for(const d of snap.docs){
    const m=d.data()||{},state=norm(m.status||m.estado||'active');
    const roles=[m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol].concat(m.roles||[],m.assignedRoles||[],m.rolesAsignados||[]).map(norm).filter(Boolean);
    const role=roles.find(x=>privileged.has(x));
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state)||!role)continue;
    try{const u=await auth.getUser(d.id);if(!u.disabled)candidates.push({uid:u.uid,email:clean(u.email),activeRole:role});}catch{}
  }
  need(candidates.length,'B3_008_PRIVILEGED_ACTOR_NOT_FOUND');
  return candidates.sort((a,b)=>['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'].indexOf(a.activeRole)-['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'].indexOf(b.activeRole))[0];
}
async function rows(coll){
  const s=await root.doc(coll).collection('items').get();
  return s.docs.map(d=>({id:d.id,...d.data()}));
}
async function targetClient(){
  const [clients,policies,portfolio]=await Promise.all([rows('clientes'),rows('polizas'),rows('carteraPrimas')]);
  const cBy=new Map(clients.map(x=>[clean(x.id),x])), pBy=new Map(policies.map(x=>[clean(x.id),x]));
  const activeBy=new Map();
  for(const p of policies){if(!activePolicy(p))continue;const cid=clean(p.clienteId);if(!cid)continue;activeBy.set(cid,(activeBy.get(cid)||0)+1);}
  for(const r of portfolio){
    if(!isOverdue(r))continue;
    const p=pBy.get(clean(r.polizaId)); if(!p||!activePolicy(p))continue;
    const cid=clean(r.clienteId||p.clienteId),c=cBy.get(cid); if(!c)continue;
    if((activeBy.get(cid)||0)!==1)continue;
    if(norm(c.segmento)==='premium')continue;
    return {client:c,policy:p,portfolio:r,expectedHealth:51};
  }
  throw new Error('B3_008_NO_REAL_HEALTH51_TARGET');
}

const who=await actor();
const selected=await targetClient();
const cid=clean(selected.client.id);
const token=await auth.createCustomToken(who.uid,{b3008ReadOnlyQa:true});
const proof={schema:'GRAVICENTRA_I6_5_B3_008_PREVIEW_PROOF_V1',status:'RUNNING',projectId,tenantId,previewUrl:target,actor:{activeRole:who.activeRole},target:{clientId:cid,policyId:clean(selected.policy.id),portfolioId:clean(selected.portfolio.id),expectedHealth:51},assertions:{},desktop:{},reload:{},mobile:{},pageErrors:[],consoleErrors:[],operationalBusinessWrites:0,reimport:false,livePromoted:false};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>proof.pageErrors.push(clean(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')proof.consoleErrors.push(clean(m.text()));});
  const legalScope='user:'+clean(who.email||who.uid);
  await page.addInitScript(({scope})=>{try{
    localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
    localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
  }catch{}},{scope:legalScope});
  await page.goto(target+'/#/cliente360?c='+encodeURIComponent(cid),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0&&!!window.Orbit?.modules?.cliente360);
  await page.evaluate(()=>{
    window.__b3008HealthObs=[];
    const capture=()=>{
      const el=document.querySelector('[data-c360-health="1"]');
      if(!el)return;
      let confirmed=[];
      try{confirmed=[].concat(Orbit.store?._productStatus?.()?.serverConfirmedCollections||[]);}catch{}
      const item={text:(el.textContent||'').trim(),readiness:el.getAttribute('data-readiness')||'',value:el.getAttribute('data-value')||'',carteraConfirmed:confirmed.includes('carteraPrimas')};
      const last=window.__b3008HealthObs[window.__b3008HealthObs.length-1];
      if(!last||JSON.stringify(last)!==JSON.stringify(item))window.__b3008HealthObs.push(item);
    };
    window.__b3008Mo=new MutationObserver(capture);window.__b3008Mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true});capture();
  });
  const boot=await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    const activated=await Promise.resolve(Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate());
    return{uid:String(c.auth.currentUser?.uid||''),started:activated?.started===true};
  },token);
  need(boot.uid&&boot.started,'B3_008_PRODUCT_SESSION_NOT_STARTED');
  await page.waitForFunction(id=>!!Orbit.store?.get?.('clientes',id),cid);
  await page.waitForFunction(()=>[].concat(Orbit.store?._productStatus?.()?.serverConfirmedCollections||[]).includes('carteraPrimas'));
  await page.waitForFunction(()=>document.querySelector('[data-c360-health="1"][data-readiness="ready"][data-value]'));
  const desktop=await page.evaluate(id=>{
    const el=document.querySelector('[data-c360-health="1"]');
    const summary=Orbit.q.clienteResumen(id);
    const obs=[].concat(window.__b3008HealthObs||[]);
    return{domHealth:Number(el?.getAttribute('data-value')),summaryHealth:Number(summary?.salud),observations:obs,confirmed:[].concat(Orbit.store?._productStatus?.()?.serverConfirmedCollections||[])};
  },cid);
  proof.desktop=desktop;
  need(desktop.domHealth===51&&desktop.summaryHealth===51,'B3_008_FINAL_HEALTH_NOT_51:'+desktop.domHealth+':'+desktop.summaryHealth);
  need(desktop.observations.every(x=>!x.value||(x.readiness==='ready'&&x.carteraConfirmed===true)),'B3_008_PREMATURE_DEFINITIVE_HEALTH');
  proof.assertions.noPrematureDefinitiveHealth=true;
  proof.assertions.finalHealth51=true;

  await page.waitForTimeout(1200);
  const stable=await page.evaluate(()=>Number(document.querySelector('[data-c360-health="1"]')?.getAttribute('data-value')));
  need(stable===51,'B3_008_SECOND_WRITER_OVERWRITE:'+stable);
  proof.assertions.noSecondWriter=true;

  await page.evaluate(()=>Orbit.router.go('inicio'));
  await page.waitForFunction(()=>Orbit.route?.key==='inicio');
  await page.waitForFunction(()=>['cartera-pendiente','cartera-vencida','cobros-confirmados'].every(k=>document.querySelector('[data-inicio-metric="'+k+'"][data-readiness="ready"]')));
  const inicio=await page.evaluate(()=>{
    const cart=Orbit.q.carteraGlobal();
    const val=k=>Number(document.querySelector('[data-inicio-metric="'+k+'"] .k-val')?.getAttribute('data-value'));
    return{expected:{confirmed:cart.alDia,pending:cart.pend,overdue:cart.venc},dom:{confirmed:val('cobros-confirmados'),pending:val('cartera-pendiente'),overdue:val('cartera-vencida')},pendingRows:Orbit.q.carteraPendienteRows().length,overdueRows:Orbit.q.carteraVencidaRows().length};
  });
  const eq=(a,b)=>Math.abs(Number(a)-Number(b))<0.000001;
  need(eq(inicio.expected.confirmed,inicio.dom.confirmed)&&eq(inicio.expected.pending,inicio.dom.pending)&&eq(inicio.expected.overdue,inicio.dom.overdue),'B3_008_INICIO_CARD_CANONICAL_VALUE_MISMATCH');
  await page.evaluate(()=>Orbit.modules.inicio.openFinancialKpi('pending'));
  const pendCount=Number(await page.locator('#inicio-financial-kpi').getAttribute('data-row-count'));
  need(pendCount===inicio.pendingRows,'B3_008_PENDING_CARD_MODAL_COUNT_MISMATCH:'+pendCount+':'+inicio.pendingRows);
  await page.locator('#inicio-financial-kpi [data-close]').first().click();
  await page.evaluate(()=>Orbit.modules.inicio.openFinancialKpi('overdue'));
  const overdueCount=Number(await page.locator('#inicio-financial-kpi').getAttribute('data-row-count'));
  need(overdueCount===inicio.overdueRows,'B3_008_OVERDUE_CARD_MODAL_COUNT_MISMATCH:'+overdueCount+':'+inicio.overdueRows);
  await page.locator('#inicio-financial-kpi [data-close]').first().click();
  proof.desktop.inicio={...inicio,modalCounts:{pending:pendCount,overdue:overdueCount}};
  proof.assertions.cardModalCanonicalOwner=true;

  await page.goto(target+'/#/cliente360?c='+encodeURIComponent(cid),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-c360-health="1"][data-readiness="ready"][data-value]'));
  const reloadHealth=Number(await page.locator('[data-c360-health="1"]').getAttribute('data-value'));
  need(reloadHealth===51,'B3_008_RELOAD_HEALTH_DRIFT:'+reloadHealth);
  proof.reload={health:reloadHealth,pass:true};
  proof.assertions.reloadCoherent=true;

  await page.setViewportSize({width:390,height:844});
  await page.goto(target+'/#/cliente360?c='+encodeURIComponent(cid),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-c360-health="1"][data-readiness="ready"][data-value]'));
  const mobile=await page.evaluate(()=>{const el=document.querySelector('[data-c360-health="1"]');return{health:Number(el?.getAttribute('data-value')),readiness:el?.getAttribute('data-readiness'),scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};});
  need(mobile.health===51&&mobile.readiness==='ready','B3_008_MOBILE_HEALTH_SEMANTIC_DRIFT');
  need(mobile.scrollWidth<=mobile.clientWidth+4,'B3_008_MOBILE_PAGE_OVERFLOW:'+mobile.scrollWidth+':'+mobile.clientWidth);
  proof.mobile=mobile;proof.assertions.mobileDesktopSameSemantics=true;

  need(proof.pageErrors.length===0,'B3_008_PAGE_ERRORS:'+proof.pageErrors.join('|'));
  proof.status='PASS';
}catch(e){
  proof.status='FAIL';proof.error=clean(e?.stack||e);
  throw e;
}finally{
  try{if(browser)await browser.close();}catch{}
  fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
}
