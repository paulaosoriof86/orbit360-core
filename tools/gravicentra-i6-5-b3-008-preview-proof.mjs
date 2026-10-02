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
const eq=(a,b)=>Math.abs(Number(a)-Number(b))<0.005;
const mapsEqual=(a,b)=>{
  const keys=[...new Set(Object.keys(a||{}).concat(Object.keys(b||{})))];
  return keys.every(k=>eq(a&&a[k]||0,b&&b[k]||0));
};
need(target,'B3_008_PREVIEW_URL_MISSING');

const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);

async function actor(){
  const snap=await tenant.collection('members').get(),order=['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'],candidates=[];
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
async function setCountry(page,country){
  await page.evaluate(country=>{
    window.Orbit.pais=country;
    try{localStorage.setItem('orbit360_pais',country);}catch{}
    try{document.dispatchEvent(new CustomEvent('orbit:pais',{detail:{pais:country}}));}catch{}
  },country);
}
async function route(page,key){
  return page.evaluate(key=>{
    const target='#/'+key;
    if(location.hash!==target) location.hash=target;
    else if(Orbit.router&&Orbit.router.go) Orbit.router.go(key);
    return {requested:target,actual:String(location.hash||'')};
  },key);
}
async function ensure(page,names){
  await page.evaluate(names=>{try{Orbit.store?._ensureCollections?.(names);}catch{}},names);
}
async function waitConfirmed(page,names,timeout=15000){
  await page.waitForFunction(names=>{const c=[].concat(Orbit.store?._productStatus?.()?.serverConfirmedCollections||[]);return names.every(x=>c.includes(x));},names,{timeout});
}
async function independent(page){
  return page.evaluate(()=>{
    const rows=name=>Orbit.store?.all?.(name)||[],country=String(Orbit.pais||'TODOS').toUpperCase(),now=Orbit.ui?.now?Orbit.ui.now():new Date();
    const month=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    const clients=rows('clientes'),policies=rows('polizas'),receipts=rows('recibosEsperados'),portfolio=rows('carteraPrimas'),cobros=rows('cobros');
    const cm=new Map(clients.filter(x=>x&&x.id!=null).map(x=>[String(x.id),x])),pm=new Map(policies.filter(x=>x&&x.id!=null).map(x=>[String(x.id),x]));
    const cc=v=>String(v||'').trim().toUpperCase();
    const policyCountry=p=>cc(p&&p.pais)||cc(cm.get(String(p&&p.clienteId||''))?.pais);
    const rowCountry=r=>{const p=pm.get(String(r&&r.polizaId||'')),cid=String(r&&r.clienteId||p?.clienteId||'');return cc(p?.pais)||cc(r&&r.pais)||cc(cm.get(cid)?.pais);};
    const inCountry=c=>country==='TODOS'||c===country;
    const money=(out,cur,v)=>{cur=cc(cur)||'SIN_MONEDA';out[cur]=(out[cur]||0)+(Number(v)||0);};
    const prod={};policies.filter(p=>inCountry(policyCountry(p))&&String(p.vigenciaInicio||'').slice(0,7)===month).forEach(p=>money(prod,p.moneda||p.divisa||cm.get(String(p.clienteId||''))?.moneda,p.primaNeta!=null?p.primaNeta:p.prima));
    const paid=c=>{const s=String(c&&c.estado||'').toLowerCase();return s==='pagado'||s==='conciliado'||c&&c.conciliado===true;};
    const source=r=>String([r?.evidenceType,r?.sourceType,r?.paymentOrigin,r?.paymentOriginKind,r?.fuenteAutoridad,r?.origenAutoridad,r?.fuenteConciliacion,r?.authority].filter(Boolean).join('|')).toLowerCase();
    const origin=r=>/advisor[_ -]?reported|asesor[_ -]?reportado|advisor[_ -]?payment/.test(source(r))?'ADVISOR_REPORTED':/client[_ -]?reported|client[_ -]?portal|cliente[_ -]?portal/.test(source(r))?'CLIENT_PORTAL':/cobros[_ -]?realizados|direct[_ -]?payment[_ -]?reported[_ -]?crm|(^|[| _-])(siga|crm)([| _-]|$)/.test(source(r))?'CRM_DIRECT':'UNKNOWN';
    const applied=r=>{const s=String(r?.estado||'').toLowerCase(),ps=String(r?.paymentState||'').toUpperCase(),op=String(r?.estadoOperativo||'').toLowerCase().replace(/\s+/g,'_');return s==='pagado'||ps.startsWith('PAID_')||['pagado','pago_inferido','pago_reportado_aplicado','pago_reportado_asesor_aplicado'].includes(op)||!!(r&&(r.cobroId||r.paidDate||r.fechaPago));};
    const confirmed=cobros.filter(paid),linked=new Set(confirmed.map(c=>String(c.reciboId||c.receiptId||'')).filter(Boolean)),cids=new Set(confirmed.map(c=>String(c.id||'')).filter(Boolean));
    const projected=receipts.filter(r=>{if(!r)return false;const id=String(r.id||''),cid=String(r.cobroId||'');if(id&&linked.has(id))return false;if(cid&&cids.has(cid))return false;return applied(r)||origin(r)==='CRM_DIRECT';}).map(r=>{const p=pm.get(String(r.polizaId||''))||{};return{id:'receipt-payment:'+String(r.id||''),receiptId:r.id,clienteId:r.clienteId||p.clienteId||'',polizaId:r.polizaId||'',pais:r.pais||p.pais||'',monto:r.primaTotal!=null?r.primaTotal:(r.montoTotal!=null?r.montoTotal:r.monto),moneda:r.moneda||p.moneda||'',fechaPago:r.fechaPago||r.paidDate||r.inferredEffectiveDate||'',conciliado:r.conciliado===true||String(r.applicationState||'').toUpperCase()==='APPLIED_DIRECT',origin:origin(r),__projected:true};});
    const realized=confirmed.concat(projected).filter(r=>inCountry(rowCountry(r)));
    const realizedAll={},monthlyPaid={};realized.forEach(r=>{money(realizedAll,r.moneda||pm.get(String(r.polizaId||''))?.moneda,r.monto);if(String(r.fechaPago||r.paidDate||r.inferredEffectiveDate||'').slice(0,7)===month)money(monthlyPaid,r.moneda||pm.get(String(r.polizaId||''))?.moneda,r.monto);});
    const open=r=>{const s=String(r?.estadoCartera||r?.estado||'').toLowerCase();return r?.conciliadoPago!==true&&!['pagado','cobrado','cerrado','anulado','cancelado','cancelada'].includes(s);};
    const due=r=>r?.vence||r?.fechaVencimiento||r?.fechaLimite||'';
    const overdue=r=>{if(!open(r))return false;const d=due(r);if(!d)return false;const dt=new Date(String(d).slice(0,10)+'T00:00:00');const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());return dt<today;};
    const pend={},venc={};portfolio.forEach(r=>{const p=pm.get(String(r&&r.polizaId||''));if(!p||!inCountry(rowCountry(r))||!open(r))return;const cli=cm.get(String(r&&r.clienteId||p.clienteId||''));money(overdue(r)?venc:pend,r.moneda||p.moneda||cli?.moneda,r.monto!=null?r.monto:r.saldo);});
    const direct=projected.filter(r=>r.origin==='CRM_DIRECT'&&inCountry(rowCountry(r)));
    const scopedPolicies=policies.filter(p=>inCountry(policyCountry(p))),active=scopedPolicies.filter(p=>['Vigente','Por renovar'].includes(p.estado));
    return{country,month,production:prod,realizedAll,monthlyPaid,pending:pend,overdue:venc,directCount:direct.length,directAmount:direct.reduce((s,r)=>s+(Number(r.monto)||0),0),clientCount:clients.filter(c=>inCountry(cc(c.pais))).length,policyCount:scopedPolicies.length,activePolicyCount:active.length};
  });
}
function attrMap(encoded){try{return JSON.parse(decodeURIComponent(encoded||''));}catch{return{};}}

const who=await actor(),token=await auth.createCustomToken(who.uid,{b3008ReadOnlyQa:true});
const proof={schema:'GRAVICENTRA_I6_5_B3_008_R2_REALITY_PERFORMANCE_PROOF_V1',status:'RUNNING',projectId,tenantId,previewUrl:target,actor:{activeRole:who.activeRole},assertions:{},performance:{},countries:{},health:{},b3007:{},pageErrors:[],consoleErrors:[],operationalBusinessWrites:0,reimport:false,livePromoted:false};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>proof.pageErrors.push(clean(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')proof.consoleErrors.push(clean(m.text()));});
  await applyLegal(page,who);
  await page.goto(target+'/#/inicio',{waitUntil:'domcontentloaded'});
  await boot(page,token);
  await setCountry(page,'TODOS');
  await ensure(page,['clientes','polizas','asesores','metas','cobros','recibosEsperados','carteraPrimas']);
  await waitConfirmed(page,['clientes','polizas','cobros','recibosEsperados','carteraPrimas'],15000);
  await route(page,'inicio');
  await page.waitForSelector('[data-inicio-reality-ready="1"]');

  const truthAll=await independent(page);
  const inicioDom=await page.evaluate(()=>{
    const map=s=>{const e=document.querySelector(s);try{return JSON.parse(decodeURIComponent(e?.getAttribute('data-values')||''));}catch{return{};}};
    const prod=document.querySelector('[data-inicio-monthly="production"]'),rec=document.querySelector('[data-inicio-monthly="recaudo"]');
    const missingAdvisor=[...document.querySelectorAll('[data-inicio-advisor-id][data-meta-state="missing"]')].map(e=>({id:e.getAttribute('data-inicio-advisor-id'),pct:e.getAttribute('data-pct'),text:e.textContent||''}));
    return{production:map('[data-inicio-monthly="production"]'),recaudo:map('[data-inicio-monthly="recaudo"]'),confirmed:map('[data-inicio-metric="cobros-confirmados"]'),pending:map('[data-inicio-metric="cartera-pendiente"]'),overdue:map('[data-inicio-metric="cartera-vencida"]'),prodMetaState:prod?.getAttribute('data-meta-state')||'',prodPct:prod?.getAttribute('data-pct')||'',recaudoMetaState:rec?.getAttribute('data-meta-state')||'',recaudoPct:rec?.getAttribute('data-pct')||'',missingAdvisor};
  });
  need(mapsEqual(inicioDom.production,truthAll.production),'B3_008_MONTHLY_PRODUCTION_REALITY_MISMATCH:'+JSON.stringify({dom:inicioDom.production,truth:truthAll.production}));
  need(mapsEqual(inicioDom.recaudo,truthAll.monthlyPaid),'B3_008_MONTHLY_RECAUDO_REALITY_MISMATCH:'+JSON.stringify({dom:inicioDom.recaudo,truth:truthAll.monthlyPaid}));
  need(mapsEqual(inicioDom.confirmed,truthAll.realizedAll),'B3_008_CONFIRMED_REALITY_MISMATCH:'+JSON.stringify({dom:inicioDom.confirmed,truth:truthAll.realizedAll}));
  need(mapsEqual(inicioDom.pending,truthAll.pending)&&mapsEqual(inicioDom.overdue,truthAll.overdue),'B3_008_PORTFOLIO_REALITY_MISMATCH:'+JSON.stringify({domPending:inicioDom.pending,truthPending:truthAll.pending,domOverdue:inicioDom.overdue,truthOverdue:truthAll.overdue}));
  need(!['missing','currency-required'].includes(inicioDom.prodMetaState)||inicioDom.prodPct==='','B3_008_SYNTHETIC_PRODUCTION_PERCENT');
  need(!['missing','currency-required'].includes(inicioDom.recaudoMetaState)||inicioDom.recaudoPct==='','B3_008_SYNTHETIC_RECAUDO_PERCENT');
  need(inicioDom.missingAdvisor.every(x=>x.pct===''&&!/\b0%\b/.test(x.text)),'B3_008_ADVISOR_MISSING_META_FALSE_ZERO');
  proof.assertions.monthlyProductionIndependent=true;
  proof.assertions.financialRealityIndependent=true;
  proof.assertions.noSyntheticMetaPct=true;
  proof.assertions.advisorMissingMetaFailClosed=true;

  let t=Date.now();await route(page,'cliente360');
  try{
    await page.waitForFunction(()=> {
      const host=document.getElementById('host');
      if(!host) return false;
      if(document.querySelector('[data-c360-authoritative-loading="1"]')||document.querySelector('.modstate')) return false;
      const table=document.querySelector('.tbl');
      const rows=table ? table.querySelectorAll('tbody tr') : [];
      return !!table && rows.length>0 && /CLIENTES/i.test(String(host.innerText||'')) && /SALUD/i.test(String(host.innerText||''));
    },null,{timeout:6000});
  }catch(error){
    const diag=await page.evaluate(()=>({
      hash:String(location.hash||''),
      routeKey:String(Orbit.route&&Orbit.route.key||''),
      role:String(Orbit.session&&Orbit.session.rol?Orbit.session.rol():''),
      canView:!!(Orbit.access&&Orbit.access.can&&Orbit.access.can('cliente360','view')),
      projectionReady:!!(Orbit.clientProjection&&typeof Orbit.clientProjection.withReadBatch==='function'),
      productStatus:Orbit.store&&Orbit.store._productStatus?Orbit.store._productStatus():null,
      hostText:String(document.getElementById('host')?.innerText||'').slice(0,1200),
      loading:!!document.querySelector('[data-c360-authoritative-loading="1"]'),
      denied:!!document.querySelector('.modstate')
    }));
    proof.client360Diagnostic=diag;
    throw new Error('B3_008_CLIENT360_NOT_READY:'+JSON.stringify(diag)+':PAGE_ERRORS='+JSON.stringify(proof.pageErrors)+':CONSOLE_ERRORS='+JSON.stringify(proof.consoleErrors.slice(-10)));
  }
  proof.performance.client360ListMs=Date.now()-t;
  need(proof.performance.client360ListMs<=6000,'B3_008_CLIENT360_LIST_TOO_SLOW:'+proof.performance.client360ListMs);
  const syntheticResidue=await page.evaluate(()=>({
    markerPresent:!!document.querySelector('[data-c360-list-ready="1"]'),
    client:!!(Orbit.store&&Orbit.store.get&&Orbit.store.get('clientes','b3004human_client_r12')),
    policy:!!(Orbit.store&&Orbit.store.get&&Orbit.store.get('polizas','b3004human_policy_r12')),
    receipt:!!(Orbit.store&&Orbit.store.get&&Orbit.store.get('recibosEsperados','b3004human_receipt_r12')),
    portfolio:!!(Orbit.store&&Orbit.store.get&&Orbit.store.get('carteraPrimas','b3004human_portfolio_r12')),
    visible:/QA HUMANA B3-004|b3004human_/i.test(String(document.getElementById('host')?.innerText||''))
  }));
  need(!syntheticResidue.client&&!syntheticResidue.policy&&!syntheticResidue.receipt&&!syntheticResidue.portfolio&&!syntheticResidue.visible,'B3_008_B3004_SYNTHETIC_RESIDUE:'+JSON.stringify(syntheticResidue));
  proof.syntheticResidueCheck=syntheticResidue;
  proof.assertions.clientListPerformance=true;
  proof.assertions.b3004SyntheticFixtureAbsent=true;

  t=Date.now();await route(page,'cobros');await page.waitForSelector('[data-cobros-core-ready="1"]',{timeout:6000});proof.performance.cobrosCoreMs=Date.now()-t;
  need(proof.performance.cobrosCoreMs<=6000,'B3_008_COBROS_CORE_TOO_SLOW:'+proof.performance.cobrosCoreMs);
  proof.assertions.cobrosCorePerformance=true;

  await setCountry(page,'CO');await route(page,'inicio');
  await waitConfirmed(page,['clientes','polizas','cobros','recibosEsperados','carteraPrimas'],12000);
  await page.waitForSelector('[data-inicio-reality-ready="1"]');
  const truthCO=await independent(page);
  const coCounts=await page.evaluate(()=>({clients:parseInt(document.querySelector('[data-inicio-count="clientes"]')?.textContent)||0,policies:parseInt(document.querySelector('[data-inicio-count="polizas"]')?.textContent)||0}));
  need(coCounts.clients===truthCO.clientCount&&coCounts.policies===truthCO.policyCount,'B3_008_INICIO_COUNTRY_COUNTS_MISMATCH:'+JSON.stringify({coCounts,truthCO}));
  proof.assertions.countryScope=true;

  await route(page,'cobros');
  await page.waitForSelector('[data-cobros-core-ready="1"]',{timeout:6000});
  await page.waitForFunction(()=>document.querySelector('[data-cobros-financial-readiness="ready"]'),null,{timeout:12000});
  const cobrosCO=await page.evaluate(()=>{const e=document.querySelector('[data-cobros-core-ready="1"]');let truth={};try{truth=JSON.parse(decodeURIComponent(e?.getAttribute('data-cobros-truth')||''));}catch{}return{truth,text:e?.innerText||''};});
  const expectedCO={COP:{alDia:truthCO.realizedAll.COP||0,pend:truthCO.pending.COP||0,venc:truthCO.overdue.COP||0}};
  need(eq(cobrosCO.truth?.COP?.alDia||0,expectedCO.COP.alDia)&&eq(cobrosCO.truth?.COP?.pend||0,expectedCO.COP.pend)&&eq(cobrosCO.truth?.COP?.venc||0,expectedCO.COP.venc),'B3_008_COBROS_CO_TRUTH_MISMATCH:'+JSON.stringify({dom:cobrosCO.truth,expectedCO}));
  if(truthCO.directCount>0&&truthCO.directAmount>0)need((cobrosCO.truth?.COP?.alDia||0)>0,'B3_008_SIGA_DIRECT_VISIBLE_BUT_KPI_ZERO');
  proof.assertions.sigaDirectIncluded=true;

  await route(page,'polizas');await page.waitForSelector('[data-polizas-kpi-ready="1"]');
  const polCO=await page.evaluate(()=>{const e=document.querySelector('[data-polizas-kpi-ready="1"]');return{total:Number(e?.getAttribute('data-polizas-total')),active:Number(e?.getAttribute('data-polizas-active'))};});
  need(polCO.total===truthCO.policyCount&&polCO.active===truthCO.activePolicyCount,'B3_008_POLIZAS_COUNTRY_SCOPE_MISMATCH:'+JSON.stringify({polCO,truthCO}));
  proof.assertions.polizasCountryScope=true;
  proof.countries.CO={truth:truthCO,counts:coCounts,cobros:cobrosCO.truth,polizas:polCO};

  await setCountry(page,'TODOS');await route(page,'cliente360');
  await ensure(page,['clientes','polizas','carteraPrimas']);
  await waitConfirmed(page,['clientes','polizas','carteraPrimas'],12000);
  const healthTarget=await page.evaluate(()=>{
    const clients=(Orbit.store?.all?.('clientes')||[]).filter(c=>c&&c.id&&!c.__syntheticHumanQa&&!/QA HUMANA|b300/i.test(String(c.nombre||c.id||'')));
    const policies=Orbit.store?.all?.('polizas')||[],portfolio=Orbit.store?.all?.('carteraPrimas')||[];
    const now=Orbit.ui?.now?Orbit.ui.now():new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const open=r=>{const st=String(r?.estadoCartera||r?.estado||'').trim().toLowerCase();return r?.conciliadoPago!==true&&!['pagado','cobrado','cerrado','anulado','cancelado','cancelada'].includes(st);};
    const overdue=r=>{if(!open(r))return false;const raw=r?.vence||r?.fechaVencimiento||r?.fechaLimite||'';if(!raw)return false;const d=new Date(String(raw).slice(0,10)+'T00:00:00');return !Number.isNaN(d.getTime())&&d<today;};
    for(const c of clients){
      const pol=policies.filter(p=>p&&String(p.clienteId||'')===String(c.id)),active=pol.filter(p=>p.estado==='Vigente'||p.estado==='Por renovar');
      if(!pol.length)continue;
      const vencido=portfolio.some(x=>x&&String(x.clienteId||'')===String(c.id)&&overdue(x));
      const expected=Math.max(8,Math.min(100,70+Math.min(20,active.length*6)-(vencido?25:0)+(c.segmento==='Premium'?8:0)));
      return{id:String(c.id),name:String(c.nombre||''),expected,nVigentes:active.length,hasOverdue:vencido,premium:c.segmento==='Premium'};
    }
    return{id:'',name:'',expected:null};
  });
  need(healthTarget.id&&Number.isFinite(Number(healthTarget.expected)),'B3_008_NO_REAL_HEALTH_TARGET');
  await page.evaluate(id=>{location.hash='#/cliente360?c='+encodeURIComponent(id);},healthTarget.id);
  await page.waitForFunction(()=>document.querySelector('[data-c360-health="1"][data-readiness="ready"][data-value]'),null,{timeout:12000});
  const h1=Number(await page.locator('[data-c360-health="1"]').getAttribute('data-value'));await page.waitForTimeout(900);const h2=Number(await page.locator('[data-c360-health="1"]').getAttribute('data-value'));
  need(h1===Number(healthTarget.expected)&&h2===Number(healthTarget.expected),'B3_008_HEALTH_INDEPENDENT_MISMATCH:'+JSON.stringify({target:healthTarget,first:h1,stable:h2}));
  proof.health={target:healthTarget,first:h1,stable:h2,independentExpected:Number(healthTarget.expected)};proof.assertions.healthStable=true;proof.assertions.healthIndependentRealClient=true;

  await route(page,'cronograma');await page.waitForTimeout(800);
  const chrono=await page.evaluate(()=>String(document.getElementById('host')?.innerText||''));
  const residue=/QA HUMANA B3|b300[0-9]/i.test(chrono);
  need(!residue,'B3_007_SYNTHETIC_RESIDUE_VISIBLE');
  proof.b3007={syntheticResidueVisible:false,humanVisualStillRequired:true};proof.assertions.b3007SyntheticResidueAbsent=true;

  need(proof.pageErrors.length===0,'B3_008_PAGE_ERRORS:'+proof.pageErrors.join('|'));
  need(proof.consoleErrors.length===0,'B3_008_CONSOLE_ERRORS:'+proof.consoleErrors.join('|'));
  proof.status='PASS';
  await context.close();
}catch(e){proof.status='FAIL';proof.error=clean(e?.stack||e);throw e;}
finally{try{if(browser)await browser.close();}catch{}fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');}
