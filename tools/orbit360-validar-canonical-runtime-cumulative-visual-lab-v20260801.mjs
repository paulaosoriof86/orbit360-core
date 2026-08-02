#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {authenticateWithOwner,acceptLegalOnce} from './orbit360-gate-bootstrap-auth-legal-normalized-v20260729.mjs';
import {TECHNICAL_COPY_PATTERN} from './orbit360-visible-technical-copy-predicate-v20260729.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/canonical-runtime-cumulative-visual-lab-v20260801.json');
const SHOTS=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/visual-sanitized-v20260801');
const BASE_URL=String(process.env.ORBIT360_BASE_URL||'').trim();
const EMAIL=String(process.env.ORBIT360_LAB_LOGIN_EMAIL||'orbit.lab@demo.com').trim();
const KEY=String(process.env.ORBIT360_LAB_LOGIN_PASSWORD||'').trim();
const DIGEST='19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b';
const EXPECTED={clientes:430,aseguradoras:30,polizas:1373,vehiculos:1032,recibosEsperados:1294,carteraPrimas:673,cobros:5,asesores:7};
const RAW={clientes:430,aseguradoras:30,polizas:1375,vehiculos:1033,recibosEsperados:1294,carteraPrimas:673,cobros:7};
const SEEDS={clientes:0,aseguradoras:0,polizas:2,vehiculos:1,recibosEsperados:0,carteraPrimas:0,cobros:2};
const REQUIRES={clientes:16,aseguradoras:12,polizas:1373,vehiculos:60,recibosEsperados:307,carteraPrimas:263,cobros:0};
const API=['all','get','where','find','insert','update','remove','on','_emit','pref','setPref','init','reseed','raw'];

const report={schemaVersion:'orbit360-canonical-runtime-cumulative-visual-lab-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',contractVersion:'7.11.0',generatedAt:new Date().toISOString(),stage:'init',canonicalSnapshotDigest:DIGEST,checks:{},dataset:{},store:{},roles:{},routes:{},screenshots:[],browserDiagnostics:{pageErrors:[],consoleErrors:[],failedRequests:[]},writeGuard:{installed:false,calls:[]},firestoreRead:true,firestoreWrites:0,operationalWrites:0,reimportExecuted:false,hostingDeploy:false,previewDeploy:false,functionsDeploy:false,rulesDeploy:false,production:false,main:false,merge:false,containsPII:false,containsDocumentIds:false,containsValues:false,containsSecrets:false,ok:false};
function clean(v){return String(v==null?'':v).replace(/https?:\/\/[^/\s]+/g,'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{40,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,360);}
function save(){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.mkdirSync(SHOTS,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n','utf8');}
function stage(name){report.stage=name;console.log('ORBIT360_CANONICAL_RUNTIME_STAGE:'+name);}
function requireState(value,code,detail=''){if(!value)throw new Error(code+(detail?':'+clean(detail):''));}
async function bounded(name,fn,ms=30000){stage(name);let timer;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('PIPELINE_STEP_TIMEOUT:'+name)),ms);})]);}finally{clearTimeout(timer);}}
function validationCategory(row){
  if(!row||typeof row!=='object')return'UNKNOWN';
  const bool=value=>{if(value===true||value===false)return value;const v=String(value==null?'':value).trim().toLowerCase();if(['true','si','sí','yes','1'].includes(v))return true;if(['false','no','0'].includes(v))return false;return null;};
  const nonEmpty=value=>value!==null&&value!==undefined&&value!==''&&(!Array.isArray(value)||value.length>0)&&(typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>0);
  const requires=bool(row.requiereValidacion),status=String(row.validationStatus||row.estadoValidacion||'').toLowerCase();
  const quality=[row.motivosCalidad,row.motivoCalidad,row.alertasCalidad,row.motivosPendientes,row.calidad_datos].some(nonEmpty);
  if(requires===true||quality||/(requiere|hold|pendiente|review|validacion)/.test(status))return'REQUIRES_VALIDATION';
  if(requires===false||/(validado|aprobado|pass|ok|complete)/.test(status))return'VALIDATED_OR_CLEAR';
  return'UNKNOWN';
}
async function selectRole(page,role){
  const result=await page.evaluate(target=>{
    const allowed=Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];
    if(!allowed.includes(target))return{ok:false,allowed};
    const select=document.getElementById('rol-sel');
    if(select){const option=Array.from(select.options||[]).find(item=>String(item.value||'')===target||String(item.textContent||'').trim()===target);if(option){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true,via:'selector'};}}
    return{ok:Orbit.session&&Orbit.session.set?Orbit.session.set(target)===true:false,via:'owner'};
  },role);
  requireState(result&&result.ok,'ROLE_SELECTION_FAILED',role);
  await page.waitForFunction(target=>window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,role,{timeout:15000,polling:100});
  await page.waitForTimeout(500);
}
async function route(page,hash,waitSelector){
  await page.evaluate(value=>{location.hash=value;},hash);
  await page.waitForFunction(value=>location.hash.startsWith(value),hash.split('?')[0],{timeout:15000,polling:100});
  if(waitSelector)await page.locator(waitSelector).first().waitFor({state:'visible',timeout:30000});
  await page.waitForTimeout(700);
}
async function visibleHealth(page,label){
  const state=await page.evaluate(pattern=>{
    const bodyText=String(document.body&&document.body.innerText||'');
    const root=document.documentElement;
    const heading=Array.from(document.querySelectorAll('#host h1,#host h2,#host [role="heading"]')).find(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;});
    const hr=heading&&heading.getBoundingClientRect();
    return{technicalCopy:new RegExp(pattern,'i').test(bodyText),horizontalOverflow:root.scrollWidth>innerWidth+4,headingVisible:Boolean(heading),headingWithinViewport:Boolean(hr&&hr.left>=-2&&hr.right<=innerWidth+2),bodyLength:bodyText.length};
  },TECHNICAL_COPY_PATTERN);
  requireState(!state.technicalCopy,'TECHNICAL_COPY_VISIBLE',label);
  requireState(!state.horizontalOverflow,'HORIZONTAL_OVERFLOW',label);
  requireState(state.headingVisible&&state.headingWithinViewport,'HEADING_NOT_RESPONSIVE',label);
  return state;
}
async function shot(page,name,masks=[]){
  const file=path.join(SHOTS,name+'.png');
  const locators=masks.map(selector=>page.locator(selector));
  await page.screenshot({path:file,fullPage:true,mask:locators,maskColor:'#D8D8D8'});
  report.screenshots.push({name:name+'.png',sanitized:true,maskedSelectors:masks});
}
async function inspectClientDetail(page,role,label){
  const row=page.locator('#host table.tbl tbody tr.clickable').first();
  if(await row.count()===0)return{available:false};
  await row.click();
  await page.locator('.fichahdr').waitFor({state:'visible',timeout:20000});
  const tabs=await page.locator('.ftab').evaluateAll(nodes=>nodes.map(node=>String(node.textContent||'').replace(/\s+/g,' ').trim()));
  requireState(tabs.some(x=>/Pólizas/i.test(x))&&tabs.some(x=>/Vehículos/i.test(x))&&tabs.some(x=>/Cobros/i.test(x))&&tabs.some(x=>/Recibos/i.test(x)),'CLIENT_DETAIL_TABS_INCOMPLETE',label);
  const receipts=page.locator('.ftab[data-tab="recibos"]');
  await receipts.click();
  await page.locator('#c360-body').waitFor({state:'visible',timeout:20000});
  await page.waitForTimeout(800);
  const receiptState=await page.evaluate(()=>({projection:Boolean(Orbit.receiptsPortfolioProjectionV920),receiptRows:(document.querySelectorAll('#c360-body tbody tr')||[]).length,hasPortfolioSummary:/Por vencer|Exigible|Histórica exigible/.test(String(document.querySelector('#c360-body')?.innerText||'')),hasHonestCopy:/Cartera conciliada.*no equivale a un pago/i.test(String(document.querySelector('#c360-body')?.innerText||''))}));
  requireState(receiptState.projection&&receiptState.hasPortfolioSummary&&receiptState.hasHonestCopy,'RECEIPTS_PORTFOLIO_PROJECTION_INVALID',label);
  await shot(page,label+'-detalle-recibos',['.fichahdr','#c360-body tbody']);
  const cobros=page.locator('.ftab[data-tab="cobros"]');
  await cobros.click();await page.waitForTimeout(700);
  const cobrosState=await page.evaluate(()=>({hasNote:Boolean(document.querySelector('[data-rp-native-cobros-note]')),honest:/Cartera conciliada representa saldo pendiente confirmado, no pago/i.test(String(document.querySelector('#c360-body')?.innerText||''))}));
  requireState(cobrosState.hasNote&&cobrosState.honest,'COBROS_HONEST_SEPARATION_INVALID',label);
  return{available:true,tabs,receiptState,cobrosState};
}

let browser;
const watchdog=setTimeout(()=>{report.error='GATE_TIMEOUT:'+report.stage;save();process.exit(124);},900000);
try{
  requireState(/^https?:\/\//.test(BASE_URL),'BASE_URL_INVALID');
  requireState(KEY.length>=12,'LAB_PASSWORD_MISSING');
  fs.mkdirSync(SHOTS,{recursive:true});
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);
  page.on('pageerror',error=>{if(report.browserDiagnostics.pageErrors.length<12)report.browserDiagnostics.pageErrors.push(clean(error&&error.message||error));});
  page.on('console',message=>{if(message.type()==='error'&&report.browserDiagnostics.consoleErrors.length<20)report.browserDiagnostics.consoleErrors.push(clean(message.text()));});
  page.on('requestfailed',request=>{if(report.browserDiagnostics.failedRequests.length<20)report.browserDiagnostics.failedRequests.push({path:(()=>{try{return new URL(request.url()).pathname;}catch{return'';}})(),error:clean(request.failure()&&request.failure().errorText)});});

  await bounded('open_local_checkout',()=>page.goto(BASE_URL,{waitUntil:'domcontentloaded'}),70000);
  await authenticateWithOwner(page,{email:EMAIL,key:KEY,runtime:'20260717-2',bounded,requireState,report});
  const legalVisible=await page.locator('[data-legal-gate]:visible').count();
  if(legalVisible)await acceptLegalOnce(page,{bounded,requireState,report});
  else{report.legalGateMode='already_accepted_in_context';report.checks.legalOneClick=true;}

  await bounded('canonical_store_hydrated',()=>page.waitForFunction(expected=>{
    const S=window.Orbit&&Orbit.store;if(!S||S.__canonicalReadModelV79!==true||S.__singleReadOwner!==true)return false;
    return Object.entries(expected).every(([name,count])=>(S.all(name)||[]).length===count);
  },EXPECTED,{timeout:150000,polling:250}),160000);

  const state=await page.evaluate(({expected,raw,seeds,requires,api,digest})=>{
    const S=Orbit.store,status=S._labStatus?S._labStatus():{};
    const category=row=>{
      const bool=value=>{if(value===true||value===false)return value;const v=String(value==null?'':value).trim().toLowerCase();if(['true','si','sí','yes','1'].includes(v))return true;if(['false','no','0'].includes(v))return false;return null;};
      const nonEmpty=value=>value!==null&&value!==undefined&&value!==''&&(!Array.isArray(value)||value.length>0)&&(typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>0);
      const req=bool(row&&row.requiereValidacion),st=String(row&&(row.validationStatus||row.estadoValidacion)||'').toLowerCase(),quality=[row&&row.motivosCalidad,row&&row.motivoCalidad,row&&row.alertasCalidad,row&&row.motivosPendientes,row&&row.calidad_datos].some(nonEmpty);
      if(req===true||quality||/(requiere|hold|pendiente|review|validacion)/.test(st))return'REQUIRES_VALIDATION';if(req===false||/(validado|aprobado|pass|ok|complete)/.test(st))return'VALIDATED_OR_CLEAR';return'UNKNOWN';
    };
    const operational={},validation={},paths={},authorities={};
    Object.keys(expected).forEach(name=>{operational[name]=(S.all(name)||[]).length;validation[name]=(S.all(name)||[]).filter(row=>category(row)==='REQUIRES_VALIDATION').length;paths[name]=S._collectionPath?S._collectionPath(name):'';authorities[name]=S._collectionAuthority?S._collectionAuthority(name):'';});
    return{operational,validation,rawCounts:status.rawCounts||{},operationalCounts:status.operationalCounts||{},excludedSeedCounts:status.excludedSeedCounts||{},paths,authorities,apiMissing:api.filter(name=>typeof S[name]!=='function'),singleReadOwner:S.__singleReadOwner===true,canonicalReadModel:S.__canonicalReadModelV79===true,digest:String(status.canonicalSnapshotDigest||OrbitBackend&&OrbitBackend.canonicalSnapshotDigest||''),snapshotAttached:Boolean(status.snapshotAttached),snapshotErrors:status.snapshotErrors||{},bridge:Orbit.receiptsPortfolioProjectionV920&&Orbit.receiptsPortfolioProjectionV920.status?Orbit.receiptsPortfolioProjectionV920.status():null,allowedRoles:Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[]};
  },{expected:EXPECTED,raw:RAW,seeds:SEEDS,requires:REQUIRES,api:API,digest:DIGEST});
  report.store=state;
  Object.entries(EXPECTED).forEach(([name,count])=>requireState(state.operational[name]===count,'OPERATIONAL_COUNT_INVALID',name+':'+state.operational[name]));
  Object.entries(RAW).forEach(([name,count])=>requireState(state.rawCounts[name]===count,'RAW_COUNT_INVALID',name+':'+state.rawCounts[name]));
  Object.entries(SEEDS).forEach(([name,count])=>requireState(state.excludedSeedCounts[name]===count,'SEED_EXCLUSION_INVALID',name+':'+state.excludedSeedCounts[name]));
  Object.entries(REQUIRES).forEach(([name,count])=>requireState(state.validation[name]===count,'REQUIRES_VALIDATION_INVALID',name+':'+state.validation[name]));
  requireState(state.apiMissing.length===0,'STORE_API_MISSING',JSON.stringify(state.apiMissing));
  requireState(state.singleReadOwner&&state.canonicalReadModel&&state.digest===DIGEST,'STORE_OWNER_OR_DIGEST_INVALID');
  ['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'].forEach(name=>requireState(new RegExp('^tenants/[^/]+/data/'+name+'/items$').test(state.paths[name])&&state.authorities[name]==='canonical-v79','CANONICAL_PATH_INVALID',name+':'+state.paths[name]));
  requireState(state.bridge&&state.bridge.storeOwner==='Orbit.store'&&state.bridge.directFirestoreListeners===0&&state.bridge.parallelCache===false,'BRIDGE_OWNER_INVALID');
  ['Dirección','Operativo','Asesor'].forEach(role=>requireState(state.allowedRoles.includes(role),'ROLE_MISSING',role));
  report.dataset={operational:state.operational,raw:state.rawCounts,seedsExcluded:state.excludedSeedCounts,requiresValidation:state.validation};
  report.checks.storeContract=true;report.checks.dataset=true;report.checks.seedExclusion=true;report.checks.validationPreserved=true;report.checks.bridgeOwner=true;

  await page.evaluate(()=>{
    const calls=[];const S=Orbit.store;
    ['insert','update','remove','setPref'].forEach(name=>{const original=S[name];S[name]=function(){calls.push({name,at:new Date().toISOString()});throw new Error('RUNTIME_WRITE_GUARD:'+name);};S[name].__guardedOriginal=original;});
    window.__orbitRuntimeWriteGuard={calls};
  });
  report.writeGuard.installed=true;

  const plans=[
    {role:'Dirección',label:'direccion-desktop',viewport:{width:1440,height:1000}},
    {role:'Operativo',label:'operativo-tablet',viewport:{width:900,height:1100}},
    {role:'Asesor',label:'asesor-mobile',viewport:{width:390,height:844}}
  ];
  for(const plan of plans){
    await page.setViewportSize(plan.viewport);await selectRole(page,plan.role);
    report.roles[plan.role]={viewport:plan.viewport};
    await route(page,'#/cliente360','#host table.tbl');
    const clientHealth=await visibleHealth(page,plan.label+'-clientes');
    const clientState=await page.evaluate(()=>({visibleRows:document.querySelectorAll('#host table.tbl tbody tr.clickable').length,storeRows:(Orbit.store.all('clientes')||[]).length,scope:Orbit.access&&Orbit.access.dataScope?Orbit.access.dataScope('cliente360'):'unknown'}));
    requireState(clientState.visibleRows>0&&clientState.storeRows===430,'CLIENT_VIEW_INVALID',plan.label);
    await shot(page,plan.label+'-clientes',['#host table.tbl tbody']);
    const detail=await inspectClientDetail(page,plan.role,plan.label);

    await route(page,'#/aseguradoras','.asg-grid [data-asg]');
    const insurerHealth=await visibleHealth(page,plan.label+'-aseguradoras');
    const insurerState=await page.evaluate(()=>({cards:document.querySelectorAll('.asg-grid [data-asg]').length,storeRows:(Orbit.store.all('aseguradoras')||[]).length,qualityRows:(Orbit.store.all('aseguradoras')||[]).filter(row=>row.requiereValidacion===true||/requiere|hold|pendiente|validacion/i.test(String(row.validationStatus||row.estadoValidacion||''))).length}));
    requireState(insurerState.cards>0&&insurerState.cards<=insurerState.storeRows&&insurerState.storeRows===30,'INSURER_VIEW_INVALID',plan.label);
    await shot(page,plan.label+'-aseguradoras',['.asg-grid [data-asg]']);

    await route(page,'#/polizas','#host table.tbl');
    const policyHealth=await visibleHealth(page,plan.label+'-polizas');
    const policyState=await page.evaluate(()=>({visibleRows:document.querySelectorAll('#host table.tbl tbody tr').length,storeRows:(Orbit.store.all('polizas')||[]).length,vehicleRows:(Orbit.store.all('vehiculos')||[]).length,receiptRows:(Orbit.store.all('recibosEsperados')||[]).length,portfolioRows:(Orbit.store.all('carteraPrimas')||[]).length,collectionRows:(Orbit.store.all('cobros')||[]).length}));
    requireState(policyState.visibleRows>0&&policyState.storeRows===1373&&policyState.vehicleRows===1032&&policyState.receiptRows===1294&&policyState.portfolioRows===673&&policyState.collectionRows===5,'POLICY_RELATED_VIEW_INVALID',plan.label);
    await shot(page,plan.label+'-polizas',['#host table.tbl tbody']);

    if(plan.role==='Asesor'){
      await page.locator('#burger').click();await page.waitForTimeout(400);
      const menu=await page.locator('#sidebar .nav-link:visible').evaluateAll(nodes=>nodes.map(node=>String(node.textContent||'').replace(/\s+/g,' ').trim()));
      requireState(menu.some(x=>/Cliente/i.test(x))&&menu.some(x=>/Aseguradoras/i.test(x))&&menu.some(x=>/Pólizas/i.test(x)),'MOBILE_MENU_INCOMPLETE');
      report.roles[plan.role].mobileMenuItems=menu.length;
      await shot(page,plan.label+'-menu',[]);
    }
    report.roles[plan.role].client={health:clientHealth,state:clientState,detail};
    report.roles[plan.role].insurers={health:insurerHealth,state:insurerState};
    report.roles[plan.role].policies={health:policyHealth,state:policyState};
  }

  const final=await page.evaluate(()=>({writeCalls:(window.__orbitRuntimeWriteGuard&&window.__orbitRuntimeWriteGuard.calls)||[],storeStatus:Orbit.store&&Orbit.store._labStatus?Orbit.store._labStatus():null,bridge:Orbit.receiptsPortfolioProjectionV920&&Orbit.receiptsPortfolioProjectionV920.status?Orbit.receiptsPortfolioProjectionV920.status():null}));
  report.writeGuard.calls=final.writeCalls;
  requireState(final.writeCalls.length===0,'BROWSER_WRITE_ATTEMPT',JSON.stringify(final.writeCalls));
  requireState(report.browserDiagnostics.pageErrors.length===0,'BROWSER_PAGE_ERRORS',JSON.stringify(report.browserDiagnostics.pageErrors));
  report.checks.roles=true;report.checks.responsive=true;report.checks.routes=true;report.checks.noTechnicalCopy=true;report.checks.writeGuard=true;report.checks.sanitizedScreenshots=report.screenshots.length>=10;
  requireState(report.screenshots.length>=10,'SCREENSHOT_COVERAGE_INCOMPLETE',String(report.screenshots.length));
  report.visualReviewExecuted=true;report.status='CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_PASS';report.classification='GO_LAB_CANONICAL_RUNTIME_CUMULATIVE_VISUAL';report.ok=true;
}catch(error){report.status='CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_FAIL';report.classification=String(error&&error.message||error).split(':')[0]||'FUNCTIONAL_DEFECT';report.error=clean(error&&error.message||error);report.ok=false;}
finally{clearTimeout(watchdog);if(browser)await browser.close().catch(()=>{});save();}
process.exit(report.ok?0:41);
