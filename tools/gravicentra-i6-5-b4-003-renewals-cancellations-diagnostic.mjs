import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B4_PREVIEW_URL||'').replace(/\/$/,'');
const outPath=process.env.B4_003_DIAGNOSTIC_OUT||'/tmp/b4-003-renewals-cancellations-diagnostic.json';
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
need(target,'B4_003_PREVIEW_URL_MISSING');

const sourcePaths={
  baseRenewals:'orbit360-platform/modules/renovaciones.js',
  renewalBridge:'orbit360-platform/modules/renewals-v1200-operational-bridge.js',
  permissionGuard:'orbit360-platform/modules/renewals-v1200-permission-guard.js',
  issuedFilter:'orbit360-platform/modules/renewals-v1201-issued-filter.js',
  cancellations:'orbit360-platform/modules/cancelaciones.js',
  operationalStore:'orbit360-platform/data/store-firestore-product-operational-p0.js',
  issuance:'orbit360-platform/core/issuance-workflow-v1201.js',
  index:'orbit360-platform/index.html'
};
const src=Object.fromEntries(Object.entries(sourcePaths).map(([k,p])=>[k,fs.readFileSync(p,'utf8')]));

const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);
async function rows(name){const s=await tenant.collection('data').doc(name).collection('items').get();return s.docs.map(d=>({id:d.id,...d.data()}));}
const [polizas,gestiones,cancelaciones,recibos,cartera]=await Promise.all([
  rows('polizas'),rows('gestiones'),rows('cancelaciones'),rows('recibosEsperados'),rows('carteraPrimas')
]);

const terminalManagement=new Set(['resuelta','completada','cerrada','cancelada','anulada']);
const renewalManagements=gestiones.filter(g=>['renewal_proposals','renewal_accepted'].includes(clean(g.workflowType)));
const activeRenewalManagements=renewalManagements.filter(g=>!g.archivado&&!terminalManagement.has(norm(g.estado)));
const grouped={};
for(const g of activeRenewalManagements){
  const key=clean(g.sourcePolicyId||g.polizaId)+'|'+clean(g.workflowType);
  (grouped[key]||(grouped[key]=[])).push(g.id);
}
const duplicateActiveRenewalManagements=Object.entries(grouped).filter(([,ids])=>ids.length>1).map(([key,ids])=>({key,ids}));

const renewable=polizas.filter(p=>['vigente','por_renovar','porrenovar'].includes(norm(p.estado)));
const linkedRenewed=polizas.filter(p=>clean(p.renovadaPor)||norm(p.renovacionEstado)==='renovada');
const renewalChildren=polizas.filter(p=>clean(p.renuevaDe));
const invalidRenewalChildren=renewalChildren.filter(p=>!polizas.some(src=>src.id===p.renuevaDe)).map(p=>({id:p.id,renuevaDe:p.renuevaDe,numero:p.numero||''}));
const inactivePolicyIds=new Set(polizas.filter(p=>!['vigente','por_renovar','porrenovar'].includes(norm(p.estado))).map(p=>p.id));
const activeReceiptForInactive=recibos.filter(r=>inactivePolicyIds.has(clean(r.polizaId))&&r.superseded!==true&&r.calendarActive!==false&&!['anulado','anulada','superseded','reemplazado'].includes(norm(r.estado))).map(r=>({id:r.id,polizaId:r.polizaId,estado:r.estado||'',cuota:r.cuota||''}));
const activePortfolioForInactive=cartera.filter(r=>inactivePolicyIds.has(clean(r.polizaId))&&r.superseded!==true&&r.calendarActive!==false&&!['anulado','anulada','superseded','reemplazado','pagado','conciliado'].includes(norm(r.estado))).map(r=>({id:r.id,polizaId:r.polizaId,estado:r.estado||''}));

const sourceAssertions={
  renewalCanonicalBusinessRulePresent:
    src.renewalBridge.includes("workflowType:'renewal_proposals'")&&
    src.renewalBridge.includes("workflowType:'renewal_accepted'")&&
    src.renewalBridge.includes("managementCreateModal")&&
    src.renewalBridge.includes("if(canDirectQuote())"),
  renewalBridgeRenderEnhanceSynchronous:/mod\.render=function\(host\)\{const out=originalRender\(host\);enhance\(host\);return out;\}/.test(src.renewalBridge),
  permissionGuardDelayedMutation:/setTimeout\(\(\)\s*=>/.test(src.permissionGuard),
  issuedFilterDelayedMutation:/setTimeout\(\(\)\s*=>\s*enhance\(host\),\s*20\)/.test(src.issuedFilter),
  issuedFilterIsAdditionalRenderOwner:/mod\.render\s*=\s*function\s*\(host\)/.test(src.issuedFilter),
  baseLegacyProposalOwnerStillPhysicallyPresent:/function\s+solicitarPropuestas\s*\(/.test(src.baseRenewals)&&/Orbit\.ciclo\.crearGestion\s*\(/.test(src.baseRenewals),
  cancellationUsesNonAwaitedOptimisticWrites:
    /S\(\)\.update\('cancelaciones'/.test(src.cancellations)&&
    /S\(\)\.insert\('negocios'/.test(src.cancellations)&&
    /S\(\)\.update\('negocios'/.test(src.cancellations),
  cancellationUsesCanonicalDurableWrites:
    /await\s+S\(\)\.updateDurable\('cancelaciones'/.test(src.cancellations)||
    /await\s+S\(\)\.insertDurable\('negocios'/.test(src.cancellations),
  storeOrdinaryWriteIsOptimisticAndDoesNotAwait:
    /function update\([\s\S]*?callDurable\('update',[\s\S]*?\.catch\(function\(\)\{\}\);[\s\S]*?return clone\(row\);/.test(src.operationalStore)&&
    /function insert\([\s\S]*?callDurable\('insert',[\s\S]*?\.catch\(function\(\)\{\}\);[\s\S]*?return clone\(row\);/.test(src.operationalStore),
  storeDurableApisAvailable:/function insertDurable\(/.test(src.operationalStore)&&/function updateDurable\(/.test(src.operationalStore),
  issuanceUsesDurableCanonicalWrites:
    /await\s+S\(\)\.updateDurable\('gestiones'/.test(src.issuance)&&
    /await\s+S\(\)\.updateDurable\('polizas'/.test(src.issuance)&&
    /createDirectRenewal/.test(src.issuance),
  indexLoadsRenewalOwnerChain:
    src.index.includes('modules/renovaciones.js')&&
    src.index.includes('modules/renewals-v1200-operational-bridge.js')&&
    src.index.includes('modules/renewals-v1200-permission-guard.js')&&
    src.index.includes('modules/renewals-v1201-issued-filter.js')
};

async function actor(){
  const snap=await tenant.collection('members').get();
  const preferred=['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo','asesor'];
  const candidates=[];
  for(const d of snap.docs){
    const m=d.data()||{},state=norm(m.status||m.estado||'active');
    const roles=[m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol].concat(m.roles||[],m.assignedRoles||[],m.rolesAsignados||[]).map(norm).filter(Boolean);
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;
    const role=preferred.find(r=>roles.includes(r));
    if(!role)continue;
    try{const u=await auth.getUser(d.id);if(!u.disabled)candidates.push({uid:u.uid,email:clean(u.email),activeRole:role});}catch{}
  }
  need(candidates.length,'B4_003_ACTOR_NOT_FOUND');
  return candidates.sort((a,b)=>preferred.indexOf(a.activeRole)-preferred.indexOf(b.activeRole))[0];
}
async function applyLegal(page,who){
  const scope='user:'+clean(who.email||who.uid);
  await page.addInitScript(({scope})=>{try{
    localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
    localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
  }catch{}},{scope});
}
let browser,context,page;
const runtime={status:'INIT',pageErrors:[],consoleErrors:[],renewalRender:null,cancellations:null};
try{
  const who=await actor(),token=await auth.createCustomToken(who.uid);
  runtime.actor=who;
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  context=await browser.newContext({ignoreHTTPSErrors:false,viewport:{width:1440,height:1000}});
  page=await context.newPage();
  page.on('pageerror',e=>runtime.pageErrors.push(clean(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')runtime.consoleErrors.push(clean(m.text()));});
  await applyLegal(page,who);
  await page.goto(target+'/#/renovaciones',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.modules?.renovaciones,null,{timeout:30000});
  await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    const s=Orbit.productAppP0?.status?.();
    if(!s?.started)await Promise.resolve(Orbit.productAppP0.activate());
  },token);
  await page.waitForFunction(()=>!!window.Orbit?.store?.all&&Array.isArray(Orbit.store.all('polizas')),null,{timeout:30000});

  runtime.renewalRender=await page.evaluate(async()=>{
    const host=document.createElement('div');
    host.id='b4003-readonly-renewal-probe';
    host.style.cssText='position:fixed;left:-20000px;top:0;width:1400px;height:900px;overflow:auto';
    document.body.appendChild(host);
    const mutations=[];
    const obs=new MutationObserver(ms=>mutations.push(...ms.map(m=>({type:m.type,target:(m.target&&m.target.nodeName)||'',at:performance.now()}))));
    obs.observe(host,{subtree:true,childList:true,characterData:true,attributes:true});
    const t0=performance.now();
    Orbit.modules.renovaciones.render(host);
    const syncHtml=host.innerHTML;
    const syncText=(host.innerText||'').replace(/\s+/g,' ').trim();
    const t1=performance.now();
    await new Promise(r=>setTimeout(r,80));
    const delayedHtml=host.innerHTML;
    const delayedText=(host.innerText||'').replace(/\s+/g,' ').trim();
    obs.disconnect();
    host.remove();
    return{
      syncDurationMs:Math.round((t1-t0)*10)/10,
      delayedDomChanged:syncHtml!==delayedHtml,
      delayedTextChanged:syncText!==delayedText,
      mutationCount:mutations.length,
      textBefore:syncText.slice(0,1200),
      textAfter:delayedText.slice(0,1200),
      hasOperationalBridge:!!Orbit.modules.renovaciones.__renewalsV1200,
      hasPermissionGuard:!!Orbit.modules.renovaciones.__renewalsPermissionV1200,
      hasIssuedFilter:!!Orbit.modules.renovaciones.__issuedFilterV1201,
      canDirectQuote:typeof Orbit.modules.renovaciones.canDirectQuote==='function'?Orbit.modules.renovaciones.canDirectQuote():null
    };
  });

  await page.goto(target+'/#/cancelaciones',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.Orbit?.modules?.cancelaciones&&!!window.Orbit?.store?.all,null,{timeout:30000});
  runtime.cancellations=await page.evaluate(()=>({
    rows:(Orbit.store.all('cancelaciones')||[]).length,
    writeStatus:Orbit.store._operationalWriteStatus?.()||{},
    durableAvailable:typeof Orbit.store.updateDurable==='function'&&typeof Orbit.store.insertDurable==='function',
    modulePresent:!!Orbit.modules.cancelaciones,
    pageText:(document.querySelector('#host')?.innerText||'').replace(/\s+/g,' ').trim().slice(0,1500)
  }));
  runtime.status='PASS_READONLY';
} finally {
  if(page)await page.close().catch(()=>{});
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
}

const findings=[];
if(sourceAssertions.issuedFilterDelayedMutation||sourceAssertions.permissionGuardDelayedMutation||runtime.renewalRender?.delayedDomChanged){
  findings.push({
    code:'RENEWALS_MULTI_PASS_RENDER_REINTRODUCED',
    severity:'BLOCKING',
    cause:'Post-render wrappers mutate the renewal surface with setTimeout after the canonical operational bridge already rendered synchronously.',
    evidence:{
      permissionGuardDelayedMutation:sourceAssertions.permissionGuardDelayedMutation,
      issuedFilterDelayedMutation:sourceAssertions.issuedFilterDelayedMutation,
      delayedDomChanged:runtime.renewalRender?.delayedDomChanged===true,
      delayedTextChanged:runtime.renewalRender?.delayedTextChanged===true
    },
    requiredFix:'Consolidate permission filtering and renewed-policy filtering into the synchronous renewal render/enhance path; no timer-based second render authority.'
  });
}
if(sourceAssertions.cancellationUsesNonAwaitedOptimisticWrites&&sourceAssertions.storeOrdinaryWriteIsOptimisticAndDoesNotAwait&&!sourceAssertions.cancellationUsesCanonicalDurableWrites){
  findings.push({
    code:'CANCELACIONES_OPTIMISTIC_MULTI_WRITE_WITHOUT_DURABLE_READBACK',
    severity:'BLOCKING',
    cause:'Cancelaciones closes the modal and reports success after synchronous Orbit.store update/insert calls whose server commits run in the background and whose failures are swallowed by the non-durable facade.',
    evidence:{
      cancellationUsesNonAwaitedOptimisticWrites:true,
      ordinaryStoreWriteOptimistic:true,
      durableApisAvailable:sourceAssertions.storeDurableApisAvailable,
      cancellationUsesCanonicalDurableWrites:false
    },
    requiredFix:'Use awaited updateDurable/insertDurable (and crearGestionDurable where applicable), sequence dependent recovery writes after confirmed server readback, and only then close/show success.'
  });
}
if(sourceAssertions.baseLegacyProposalOwnerStillPhysicallyPresent&&sourceAssertions.renewalCanonicalBusinessRulePresent){
  findings.push({
    code:'RENEWALS_LEGACY_OWNER_REMAINS_SHADOWED',
    severity:'CARRY_FORWARD_CLEANUP_REQUIRED',
    cause:'The base renewal module still contains the superseded proposal-generation/write owner while the operational bridge overrides the public methods later in the entrypoint.',
    evidence:{baseLegacyOwnerPresent:true,operationalOverridePresent:true,indexLoadsOwnerChain:true},
    requiredFix:'Remove or neutralize superseded executable business-write paths so one canonical renewal owner remains physically, not only by load-order shadowing.'
  });
}

const receipt={
  schema:'GRAVICENTRA_I6_5_B4_003_RENEWALS_CANCELATIONS_READONLY_DIAGNOSTIC_V1',
  recordedAt:new Date().toISOString(),
  status:'READONLY_DIAGNOSTIC_COMPLETE',
  findingId:'B4-003',
  mode:'READ_ONLY_NO_PRODUCT_OR_DATA_WRITES',
  repository:'paulaosoriof86/orbit360-core',
  branch:'recovery/fase-a-clean-20260831',
  sourceSha:process.env.GITHUB_SHA||'',
  previewUrl:target,
  sourceHashes:Object.fromEntries(Object.entries(sourcePaths).map(([k,p])=>[k,sha(fs.readFileSync(p))])),
  sourceAssertions,
  runtime:{
    polizas:polizas.length,
    renewablePolicies:renewable.length,
    linkedRenewedPolicies:linkedRenewed.length,
    renewalChildren:renewalChildren.length,
    invalidRenewalChildCount:invalidRenewalChildren.length,
    invalidRenewalChildren:invalidRenewalChildren.slice(0,50),
    renewalManagements:renewalManagements.length,
    activeRenewalManagements:activeRenewalManagements.length,
    duplicateActiveRenewalManagementCount:duplicateActiveRenewalManagements.length,
    duplicateActiveRenewalManagements:duplicateActiveRenewalManagements.slice(0,50),
    cancelaciones:cancelaciones.length,
    currentReceiptRowsForInactivePolicies:activeReceiptForInactive.length,
    currentReceiptRowSampleForInactivePolicies:activeReceiptForInactive.slice(0,30),
    activePortfolioRowsForInactivePolicies:activePortfolioForInactive.length,
    activePortfolioRowSampleForInactivePolicies:activePortfolioForInactive.slice(0,30),
    browser:runtime
  },
  findings,
  classification:findings.some(f=>f.severity==='BLOCKING')?'PRODUCT_CAUSAL_FIX_REQUIRED':'NO_PRODUCT_DEFECT_DEMONSTRATED',
  boundaries:{operationalBusinessWrites:0,syntheticQaWrites:0,configWrites:0,dataMutation:false,reimport:false,livePromotion:false},
  nextAction:findings.some(f=>f.severity==='BLOCKING')?'B4_003_NARROW_SOURCE_FIX_AUTHORIZATION':'B4_004_DIAGNOSTIC'
};
fs.writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,classification:receipt.classification,sourceAssertions,runtime:receipt.runtime,findings:receipt.findings,boundaries:receipt.boundaries,nextAction:receipt.nextAction},null,2));
