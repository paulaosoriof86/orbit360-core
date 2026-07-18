import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { waitForRealTenantData, validateClient360 } from './orbit360-runtime-check-client360-v20260716.mjs';
import { waitForProductBootstrap, authenticateWithOwner, acceptLegalOnce } from './orbit360-gate-bootstrap-auth-legal-v20260717.mjs';
import { readGateEnvironment } from './orbit360-gate-environment-v20260717.mjs';

const { baseUrl, email, accessValue:key, runtime }=readGateEnvironment();
const dirs=['orbit360-platform/runtime-gate-crm-v20260716','orbit360-platform/runtime-gate-aseguradoras-v20260716'];
const mapped=/Aseguradora Guatemalteca|AseGuate|Seguros BAM|Aseguradora Rural|Banrural|Bantrab|Seguros Columna|Seguros Universales/i;
const report={schemaVersion:'orbit360-runtime-gate-joint-v20-owner-handoff-external-evidence',gateId:'block1-client360-insurers-lab-v20260717',contractVersion:'1.0.20',runtimeVersion:runtime,generatedAt:new Date().toISOString(),containsPII:false,containsSecrets:false,stage:'bootstrap',checks:{}};
if(!/^https:\/\//.test(baseUrl))throw new Error('BLOQUEO_PREVIEW_URL');
if(key.length<12)throw new Error('BLOQUEO_ACCESO_LAB');
if(!/^\d{8}-\d+$/.test(runtime))throw new Error('BLOQUEO_RUNTIME_VERSION');
dirs.forEach(d=>mkdirSync(d,{recursive:true}));
const save=()=>{const p=JSON.stringify(report,null,2)+'\n';dirs.forEach(d=>writeFileSync(`${d}/resultado-sanitizado.json`,p));};
const stage=s=>{report.stage=s;console.log(`ORBIT360_GATE_STAGE:${s}`);};
const requireState=(v,c,d='')=>{if(!v)throw new Error(c+(d?`:${d}`:''));};
async function bounded(name,fn,ms=15000){stage(name);let t;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,r)=>{t=setTimeout(()=>r(new Error(`PIPELINE_STEP_TIMEOUT:${name}`)),ms);})]);}finally{clearTimeout(t);}}
function diagnosticText(value){return String(value||'').replace(/https?:\/\/[^/\s]+/g,'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{48,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,320);}
function diagnosticPath(value){try{return new URL(String(value||'')).pathname.slice(0,180);}catch(error){return '';}}
let browser;
const WATCHDOG_BUDGET_MS=900000;
const OBSERVER_CAPTURE_TIMEOUT_MS=5000;
report.watchdogBudgetMs=WATCHDOG_BUDGET_MS;
report.observerCaptureTimeoutMs=OBSERVER_CAPTURE_TIMEOUT_MS;
const watchdog=setTimeout(()=>{
  report.ok=false;
  report.watchdogExceeded=true;
  report.watchdogStage=report.stage;
  if(!report.error)report.error=`GATE_TIMEOUT:${report.stage}`;
  save();
  process.exit(124);
},WATCHDOG_BUDGET_MS);

async function awaitPreviewRedirect(page){
  await bounded('preview_redirect_ready',async()=>{
    const redirectCutoff=Date.now()+15000;
    let current=new URL(page.url());
    while(Date.now()<redirectCutoff){
      current=new URL(page.url());
      if(/\/index\.html$/.test(current.pathname)&&current.searchParams.get('orbitBackend')==='firestore-lab'&&current.searchParams.get('tenant')==='alianzas-soluciones'&&current.searchParams.get('runtime')===runtime)return;
      await page.waitForTimeout(100);
    }
    requireState(false,'CANONICAL_INDEX_NOT_REACHED',current.pathname);
  },18000);
  report.checks.previewRedirectReady=true;
}
async function selectRole(page,label){
  const select=page.locator('#rol-sel');await select.waitFor({state:'attached',timeout:15000});
  const options=await select.locator('option').evaluateAll(nodes=>nodes.map(node=>({value:node.value,text:String(node.textContent||'').trim()})));
  const match=options.find(item=>item.text.toLowerCase().includes(label.toLowerCase()));
  requireState(match,'ROLE_OPTION_NOT_FOUND',label);await select.selectOption(match.value);await page.waitForTimeout(700);
}
async function validateInsurers(page,label,advisor=false){
  await page.evaluate(()=>{location.hash='#/aseguradoras';});
  const cards=page.locator('.asg-grid [data-asg]');await cards.first().waitFor({state:'visible',timeout:20000});
  const count=await cards.count();requireState(count===26,'INSURER_CARD_COUNT_INVALID',`${label}:${count}`);
  requireState(/\bGT\b/.test(String(await cards.first().innerText())),'GT_NOT_FIRST',label);
  requireState(await page.locator('#asg-order').count()===1,'INSURER_ORDER_CONTROL_MISSING',label);
  const card=cards.filter({hasText:mapped}).first();requireState(await card.count()>0,'MAPPED_INSURER_CARD_NOT_FOUND',label);await card.click();
  await page.locator('#asg-ficha').waitFor({state:'visible',timeout:15000});
  requireState(await page.locator('#af-guardar').count()===0,'INSURER_SAVE_VISIBLE_IN_READ_MODE',label);
  if(advisor)requireState(await page.locator('#af-editar').count()===0,'ADVISOR_INSURER_EDIT_VISIBLE');
  const owner=await page.evaluate(()=>{const m=window.Orbit&&Orbit.modules&&Orbit.modules.aseguradoras;return Boolean(m&&m.__ownerKnowledgeV20260717&&m.__tenantOrderV20260717&&m.__consumerGatesSeparatedV20260717);});
  requireState(owner,'INSURER_OWNER_CONTRACT_NOT_ACTIVE',label);
  await page.locator('[data-tab="tarifas"]').click();
  await page.waitForFunction(()=>/Mapeado|Persistido|Validado|Conocimiento/i.test(String((document.querySelector('#af-body')||{}).textContent||'')),null,{timeout:15000});
  report[`${label}InsurerCards`]=count;report[`${label}KnowledgeVisible`]=true;
}
async function validateMobileMenu(page){
  await page.locator('#burger').click();await page.waitForTimeout(350);
  const labels=await page.locator('#sidebar .nav-link:visible').evaluateAll(nodes=>nodes.map(node=>String(node.textContent||'').replace(/\s+/g,' ').trim()));
  requireState(labels.length>1,'MOBILE_MENU_ONLY_HOME',String(labels.length));
  requireState(labels.some(label=>/Cliente/i.test(label)),'MOBILE_MENU_CLIENTES_MISSING');
  requireState(labels.some(label=>/Aseguradoras/i.test(label)),'MOBILE_MENU_INSURERS_MISSING');
  report.mobileMenuVisibleModules=labels.length;report.checks.mobileMenuComplete=true;
}

browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(45000);
report.navigationTimeline=[];
page.on('framenavigated',frame=>{
  if(frame!==page.mainFrame()||report.navigationTimeline.length>=12)return;
  report.navigationTimeline.push({path:diagnosticPath(frame.url()),atMs:Date.now()});
});
await page.addInitScript(() => {
  const startedAt = Date.now();
  const state = window.__orbitGateContractObserver = {
    startedAt,
    markerEverSeen:false,
    ownerEverSeen:false,
    ownerGetEverSeen:false,
    temporaryOwnerEverSeen:false,
    events:[]
  };
  let previous='';
  const sample=()=>{
    const marker=document.querySelector('script[data-orbit-client-projection-runtime-v20260716]');
    const snapshot={
      elapsedMs:Date.now()-startedAt,
      readyState:document.readyState,
      markerPresent:Boolean(marker),
      markerConnected:Boolean(marker&&marker.isConnected),
      ownerPresent:Boolean(window.Orbit&&Orbit.clientProjection),
      ownerGetPresent:Boolean(window.Orbit&&Orbit.clientProjection&&typeof Orbit.clientProjection.get==='function'),
      temporaryOwnerPresent:Boolean(window.Orbit&&Orbit.clientCanonicalViewProjectionV20260716),
      routePresent:Boolean(window.Orbit&&Orbit.route&&Orbit.route.key),
      orbitKeyCount:window.Orbit?Object.keys(Orbit).length:0
    };
    state.markerEverSeen=state.markerEverSeen||snapshot.markerPresent;
    state.ownerEverSeen=state.ownerEverSeen||snapshot.ownerPresent;
    state.ownerGetEverSeen=state.ownerGetEverSeen||snapshot.ownerGetPresent;
    state.temporaryOwnerEverSeen=state.temporaryOwnerEverSeen||snapshot.temporaryOwnerPresent;
    const signature=JSON.stringify([snapshot.readyState,snapshot.markerPresent,snapshot.markerConnected,snapshot.ownerPresent,snapshot.ownerGetPresent,snapshot.temporaryOwnerPresent,snapshot.routePresent,snapshot.orbitKeyCount]);
    if(signature!==previous&&state.events.length<30){state.events.push(snapshot);previous=signature;}
  };
  sample();
  const timer=setInterval(sample,50);
  window.addEventListener('beforeunload',()=>{sample();clearInterval(timer);},{once:true});
});
const cdp=await page.context().newCDPSession(page);
report.browserParseDiagnostics={failedScripts:[],exceptions:[],parsedScripts:[]};
await cdp.send('Runtime.enable');
await cdp.send('Debugger.enable');
cdp.on('Debugger.scriptParsed',event=>{
  const path=diagnosticPath(event&&event.url);
  if(!/data\/store\.js|core\/router\.js|core\/auth\.js|client-canonical-view-projection|tenant-insurer-config|tenant-runtime-config-index|session-multirol-visibility/.test(path))return;
  if(report.browserParseDiagnostics.parsedScripts.length>=16)return;
  report.browserParseDiagnostics.parsedScripts.push({path,line:Number(event&&event.startLine||0)+1,length:Number(event&&event.length||0)});
});
cdp.on('Debugger.scriptFailedToParse',event=>{
  if(report.browserParseDiagnostics.failedScripts.length>=12)return;
  report.browserParseDiagnostics.failedScripts.push({
    path:diagnosticPath(event&&event.url),
    line:Number(event&&event.startLine||0)+1,
    column:Number(event&&event.startColumn||0)+1,
    error:diagnosticText(event&&event.errorMessage),
    length:Number(event&&event.length||0)
  });
});
cdp.on('Runtime.exceptionThrown',event=>{
  if(report.browserParseDiagnostics.exceptions.length>=12)return;
  const details=event&&event.exceptionDetails||{};
  const frame=details.stackTrace&&details.stackTrace.callFrames&&details.stackTrace.callFrames[0]||{};
  report.browserParseDiagnostics.exceptions.push({
    path:diagnosticPath(details.url||frame.url),
    line:Number(details.lineNumber??frame.lineNumber??0)+1,
    column:Number(details.columnNumber??frame.columnNumber??0)+1,
    error:diagnosticText(details.exception&&details.exception.description||details.text)
  });
});
try{
  stage('open_lab_preview');await page.goto(`${baseUrl}/ays-lab-preview.html`,{waitUntil:'domcontentloaded',timeout:60000});
  await awaitPreviewRedirect(page);
  await waitForProductBootstrap(page,{runtime,bounded,requireState,report});
  await authenticateWithOwner(page,{email,key,runtime,bounded,requireState,report});
  await acceptLegalOnce(page,{bounded,requireState,report});
  stage('real_tenant_data');report.storeCounts=await waitForRealTenantData(page,26);
  await selectRole(page,'Dirección');stage('desktop_direction_client360');await validateClient360(page,report,'desktopDirection');stage('desktop_direction_aseguradoras');await validateInsurers(page,'desktopDirection');report.checks.desktopDirection=true;
  await page.setViewportSize({width:820,height:1180});await selectRole(page,'Operativo');stage('tablet_operativo_client360');await validateClient360(page,report,'tabletOperativo');stage('tablet_operativo_aseguradoras');await validateInsurers(page,'tabletOperativo');report.checks.tabletOperativo=true;
  await page.setViewportSize({width:390,height:844});await selectRole(page,'Asesor');stage('mobile_asesor_menu');await validateMobileMenu(page);stage('mobile_asesor_client360');await validateClient360(page,report,'mobileAsesor');stage('mobile_asesor_aseguradoras');await validateInsurers(page,'mobileAsesor',true);report.checks.mobileAsesor=true;
  Object.assign(report.checks,{realClientCount:report.storeCounts.clientes===414,realInsurerCount:report.storeCounts.aseguradoras===26,realAdvisorCount:report.storeCounts.asesores===7,allTenTabs:true,gtFirst:true,insurerReadMode:true,insurerKnowledgeVisible:true});
  report.ok=Object.values(report.checks).every(Boolean);stage('completed');
}catch(error){
  report.ok=false;
  report.failureStage=report.stage;
  report.error=String(error&&(error.stack||error.message||error)).replace(/\s+/g,' ').trim();
  save();
}finally{
  try{
    const finalDiagnostic=await Promise.race([
      page.evaluate(()=>({
        observer:window.__orbitGateContractObserver||null,
        routerRuntimeContracts:window.Orbit&&Orbit.router&&Orbit.router.runtimeContractState?Orbit.router.runtimeContractState:{}
      })),
      new Promise(resolve=>setTimeout(()=>resolve({observer:{unavailable:true,code:'OBSERVER_CAPTURE_TIMEOUT'},routerRuntimeContracts:{}}),OBSERVER_CAPTURE_TIMEOUT_MS))
    ]);
    report.runtimeContractObserver=finalDiagnostic.observer;
    report.routerRuntimeContracts=finalDiagnostic.routerRuntimeContracts;
  }catch(error){
    report.runtimeContractObserver={unavailable:true,code:diagnosticText(error&&error.name||'OBSERVER_CAPTURE_FAILED')};
    report.routerRuntimeContracts={};
  }
  save();
  stage('closing_browser');
  await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,10000))]);
  clearTimeout(watchdog);
}
console.log(`ORBIT360_RUNTIME_GATE_JOINT:${JSON.stringify({ok:report.ok,stage:report.stage,failureStage:report.failureStage||'',runtimeVersion:report.runtimeVersion,counts:report.storeCounts||{},checks:report.checks,error:report.error||''})}`);
process.exit(report.ok?0:1);
