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

need(target,'B3_008_PREVIEW_URL_MISSING');
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);

async function actor(){
  const snap=await tenant.collection('members').get();
  const order=['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'];
  const candidates=[];
  for(const d of snap.docs){
    const m=d.data()||{},state=norm(m.status||m.estado||'active');
    const roles=[m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol].concat(m.roles||[],m.assignedRoles||[],m.rolesAsignados||[]).map(norm).filter(Boolean);
    const role=roles.find(x=>privileged.has(x));
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state)||!role)continue;
    try{const u=await auth.getUser(d.id);if(!u.disabled)candidates.push({uid:u.uid,email:clean(u.email),activeRole:role});}catch{}
  }
  need(candidates.length,'B3_008_PRIVILEGED_ACTOR_NOT_FOUND');
  return candidates.sort((a,b)=>order.indexOf(a.activeRole)-order.indexOf(b.activeRole))[0];
}

async function applyLegal(page,who){
  const scope='user:'+clean(who.email||who.uid);
  await page.addInitScript(({scope})=>{try{
    localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
    localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
  }catch{}},{scope});
}
async function boot(page,token){
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0);
  const x=await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    const activated=await Promise.resolve(Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate());
    return{uid:String(c.auth.currentUser?.uid||''),started:activated?.started===true};
  },token);
  need(x.uid&&x.started,'B3_008_PRODUCT_SESSION_NOT_STARTED');
}
async function findCanonicalHealth51(browser,who,token,proof){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  await applyLegal(page,who);
  await page.goto(target+'/#/inicio',{waitUntil:'domcontentloaded'});
  await boot(page,token);
  await page.waitForFunction(()=>['clientes','polizas','carteraPrimas'].every(k=>[].concat(Orbit.store?._productStatus?.()?.serverConfirmedCollections||[]).includes(k)),null,{timeout:30000});
  const targetRow=await page.evaluate(()=>{
    const simpleNorm=v=>String(v==null?'':v).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    const clients=Orbit.store?.all?.('clientes')||[];
    const dist={};
    for(const c of clients){
      try{
        const r=Orbit.q.clienteResumen(c.id);
        const h=Number(r?.salud);dist[h]=(dist[h]||0)+1;
        if(h===51&&Number(r?.vencido)>0&&Number(r?.nVigentes)===1&&simpleNorm(c?.segmento)!=='premium'){
          return{clientId:String(c.id),clientName:String(c.nombre||''),health:h,vencido:Number(r.vencido),nVigentes:Number(r.nVigentes),nPolizas:Number(r.nPolizas),segmento:String(c.segmento||''),distribution:dist};
        }
      }catch{}
    }
    return{clientId:'',distribution:dist};
  });
  proof.discovery=targetRow;
  await context.close();
  need(targetRow.clientId,'B3_008_NO_CANONICAL_HEALTH51_TARGET:'+JSON.stringify(targetRow.distribution));
  return targetRow;
}

const who=await actor();
const token=await auth.createCustomToken(who.uid,{b3008ReadOnlyQa:true});
const proof={schema:'GRAVICENTRA_I6_5_B3_008_PREVIEW_PROOF_V2',status:'RUNNING',projectId,tenantId,previewUrl:target,actor:{activeRole:who.activeRole},assertions:{},discovery:null,target:null,desktop:{},reload:{},mobile:{},pageErrors:[],consoleErrors:[],operationalBusinessWrites:0,reimport:false,livePromoted:false};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const selected=await findCanonicalHealth51(browser,who,token,proof);
  const cid=clean(selected.clientId);
  proof.target={clientId:cid,clientName:selected.clientName,expectedHealth:51};

  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>proof.pageErrors.push(clean(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')proof.consoleErrors.push(clean(m.text()));});
  await applyLegal(page,who);
  await page.goto(target+'/#/cliente360?c='+encodeURIComponent(cid),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.Orbit?.modules?.cliente360&&!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0);
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
    window.__b3008Mo=new MutationObserver(capture);
    window.__b3008Mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true});
    capture();
  });
  await boot(page,token);
  await page.waitForFunction(id=>!!Orbit.store?.get?.('clientes',id),cid);
  await page.waitForFunction(()=>[].concat(Orbit.store?._productStatus?.()?.serverConfirmedCollections||[]).includes('carteraPrimas'));
  await page.waitForFunction(()=>document.querySelector('[data-c360-health="1"][data-readiness="ready"][data-value]'));
  const desktop=await page.evaluate(id=>{
    const el=document.querySelector('[data-c360-health="1"]');
    const summary=Orbit.q.clienteResumen(id);
    return{domHealth:Number(el?.getAttribute('data-value')),summaryHealth:Number(summary?.salud),vencido:Number(summary?.vencido),nVigentes:Number(summary?.nVigentes),observations:[].concat(window.__b3008HealthObs||[]),confirmed:[].concat(Orbit.store?._productStatus?.()?.serverConfirmedCollections||[])};
  },cid);
  proof.desktop=desktop;
  need(desktop.domHealth===51&&desktop.summaryHealth===51&&desktop.vencido>0&&desktop.nVigentes===1,'B3_008_FINAL_HEALTH_NOT_CANONICAL_51:'+JSON.stringify(desktop));
  need(desktop.observations.every(x=>!x.value||(x.readiness==='ready'&&x.carteraConfirmed===true)),'B3_008_PREMATURE_DEFINITIVE_HEALTH');
  proof.assertions.noPrematureDefinitiveHealth=true;
  proof.assertions.finalHealth51=true;

  await page.waitForTimeout(1200);
  const stable=await page.evaluate(()=>Number(document.querySelector('[data-c360-health="1"]')?.getAttribute('data-value')));
  need(stable===51,'B3_008_SECOND_WRITER_OVERWRITE:'+stable);
  proof.assertions.noSecondWriter=true;

  await page.evaluate(()=>Orbit.router.go('inicio'));
  await page.waitForFunction(()=>Orbit.route?.key==='inicio');
  await page.waitForFunction(()=>['cartera-pendiente','cartera-vencida','cobros-confirmados'].every(k=>document.querySelector('[data-inicio-metric="'+k+'"][data-readiness="ready"]')),null,{timeout:30000});
  const inicio=await page.evaluate(()=>{
    const cart=Orbit.q.carteraGlobal();
    const val=k=>Number(document.querySelector('[data-inicio-metric="'+k+'"] .k-val')?.getAttribute('data-value'));
    return{expected:{confirmed:cart.alDia,pending:cart.pend,overdue:cart.venc},dom:{confirmed:val('cobros-confirmados'),pending:val('cartera-pendiente'),overdue:val('cartera-vencida')},pendingRows:Orbit.q.carteraPendienteRows().length,overdueRows:Orbit.q.carteraVencidaRows().length};
  });
  const eq=(a,b)=>Math.abs(Number(a)-Number(b))<0.000001;
  need(eq(inicio.expected.confirmed,inicio.dom.confirmed)&&eq(inicio.expected.pending,inicio.dom.pending)&&eq(inicio.expected.overdue,inicio.dom.overdue),'B3_008_INICIO_CARD_CANONICAL_VALUE_MISMATCH:'+JSON.stringify(inicio));
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
  await page.waitForFunction(()=>document.querySelector('[data-c360-health="1"][data-readiness="ready"][data-value]'),null,{timeout:30000});
  const reloadHealth=Number(await page.locator('[data-c360-health="1"]').getAttribute('data-value'));
  need(reloadHealth===51,'B3_008_RELOAD_HEALTH_DRIFT:'+reloadHealth);
  proof.reload={health:reloadHealth,pass:true};proof.assertions.reloadCoherent=true;

  await page.setViewportSize({width:390,height:844});
  await page.goto(target+'/#/cliente360?c='+encodeURIComponent(cid),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-c360-health="1"][data-readiness="ready"][data-value]'),null,{timeout:30000});
  const mobile=await page.evaluate(()=>{const el=document.querySelector('[data-c360-health="1"]');return{health:Number(el?.getAttribute('data-value')),readiness:el?.getAttribute('data-readiness'),scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};});
  need(mobile.health===51&&mobile.readiness==='ready','B3_008_MOBILE_HEALTH_SEMANTIC_DRIFT:'+JSON.stringify(mobile));
  need(mobile.scrollWidth<=mobile.clientWidth+4,'B3_008_MOBILE_PAGE_OVERFLOW:'+mobile.scrollWidth+':'+mobile.clientWidth);
  proof.mobile=mobile;proof.assertions.mobileDesktopSameSemantics=true;

  need(proof.pageErrors.length===0,'B3_008_PAGE_ERRORS:'+proof.pageErrors.join('|'));
  proof.status='PASS';
  await context.close();
}catch(e){
  proof.status='FAIL';proof.error=clean(e?.stack||e);
  throw e;
}finally{
  try{if(browser)await browser.close();}catch{}
  fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
}
