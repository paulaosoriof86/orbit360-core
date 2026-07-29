#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {waitForProductBootstrap,authenticateWithOwner,acceptLegalOnce,installBootstrapDiagnostics} from './orbit360-gate-bootstrap-auth-legal-v20260717.mjs';
import {readGateEnvironment} from './orbit360-gate-environment-v20260717.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-runtime-smoke-508-browser-summary.json');
const RC_HASH='b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091';
const EXPECTED_COUNTRIES={GT:398,CO:16,REQUIERE_VALIDACION:0};
const EXPECTED_TYPES={Persona:391,Empresa:23};
const REQUIRED_ROLES=['Dirección','Operativo','Asesor'];
const UNAUTHORIZED_ROLE='Finanzas';
const EXPECTED_POLICY_VERSION='20260729.2';
const EXPECTED_RUNTIME='20260717-2';
const {baseUrl,email,accessValue:key,runtime}=readGateEnvironment();

const report={
  schemaVersion:'orbit360-m5-runtime-smoke-browser-v3',
  gateId:'block5-release-candidate-visualization-v20260728',
  contractVersion:'5.0.8',
  generatedAt:new Date().toISOString(),
  releaseCandidateHash:RC_HASH,
  projectId:'ays-orbit-360-lab',
  runtimeVersion:runtime,
  stage:'bootstrap',
  checks:{},
  roleViews:{},
  writeGuard:{networkWriteCandidates:[],transientStaticCalls:[],blockedOperationalCalls:[]},
  firestoreRead:true,
  firestoreWrites:0,
  operationalWrites:0,
  hostingDeploy:false,
  functionsDeploy:false,
  rulesDeploy:false,
  production:false,
  mergeMain:false,
  policies:false,
  visualReview:false,
  containsPII:false,
  containsSecrets:false
};

const clean=value=>String(value==null?'':value)
  .replace(/https?:\/\/[^/\s]+/g,'')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]')
  .replace(/[A-Za-z0-9_-]{48,}/g,'[redacted]')
  .replace(/\s+/g,' ')
  .trim()
  .slice(0,420);
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
const stage=value=>{report.stage=value;console.log(`ORBIT360_M5_508_RUNTIME_STAGE:${value}`);};
const requireState=(value,code,detail='')=>{if(!value)throw new Error(`${code}${detail?':'+detail:''}`);};
async function bounded(name,fn,ms=20000){stage(name);let timer;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`PIPELINE_STEP_TIMEOUT:${name}`)),ms);})]);}finally{clearTimeout(timer);}}
function pathOnly(value){try{return new URL(String(value||'')).pathname.slice(0,180);}catch{return '';}}

async function awaitPreviewRedirect(page){
  await bounded('preview_redirect_ready',async()=>{
    const end=Date.now()+25000;
    while(Date.now()<end){
      const url=new URL(page.url());
      if(/\/index\.html$/.test(url.pathname)&&url.searchParams.get('orbitBackend')==='firestore-lab'&&url.searchParams.get('tenant')==='alianzas-soluciones'&&url.searchParams.get('runtime')===runtime)return;
      await page.waitForTimeout(100);
    }
    requireState(false,'CANONICAL_INDEX_NOT_REACHED',pathOnly(page.url()));
  },28000);
  report.checks.previewRedirectReady=true;
}

async function validateStaticWritePolicy(page){
  await bounded('academia_static_write_policy_ready',()=>page.waitForFunction(expected=>window.Orbit&&Orbit.store&&Orbit.store.__academiaStaticWritePolicyVersion===expected&&typeof Orbit.store._writePolicy==='function',EXPECTED_POLICY_VERSION,{timeout:15000,polling:50}),17000);
  const state=await page.evaluate(()=>({
    version:String(Orbit.store.__academiaStaticWritePolicyVersion||''),
    installed:Boolean(Orbit.academiaStaticContentWritePolicy&&Orbit.academiaStaticContentWritePolicy.installed),
    status:Orbit.store._transientStaticStatus?Orbit.store._transientStaticStatus():null
  }));
  requireState(state.version===EXPECTED_POLICY_VERSION&&state.installed,'ACADEMIA_STATIC_WRITE_POLICY_NOT_READY',state.version);
  report.academiaStaticWritePolicy=state;
  report.checks.academiaStaticWritePolicy=true;
}

async function selectAssignedRole(page,role){
  const result=await page.evaluate(target=>{
    const allowed=Orbit.session.allowedRoles();
    const select=document.getElementById('rol-sel');
    if(!allowed.includes(target))return{ok:false,code:'ROLE_NOT_ASSIGNED',allowedCount:allowed.length};
    if(select){
      const option=Array.from(select.options||[]).find(item=>String(item.value||'')===target)||Array.from(select.options||[]).find(item=>String(item.textContent||'').trim()===target);
      if(option){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true,via:'selector',value:option.value};}
    }
    return{ok:Orbit.session.set(target)===true,via:'owner',value:target};
  },role);
  requireState(result&&result.ok,result&&result.code||'ROLE_SELECTION_FAILED',role);
  await page.waitForFunction(target=>window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,role,{timeout:15000,polling:100});
  await page.waitForTimeout(500);
}

async function validateAccessBoundary(page){
  const state=await page.evaluate(async()=>{
    const user=Orbit.auth&&Orbit.auth.productUser||null;
    const allowed=Orbit.session.allowedRoles();
    const before=Orbit.session.rol();
    let blockedReason='';
    const handler=event=>{blockedReason=String(event&&event.detail&&event.detail.reason||'');};
    document.addEventListener('orbit:session:blocked',handler,{once:true});
    const blocked=Orbit.session.set('Finanzas');
    await new Promise(resolve=>setTimeout(resolve,50));
    const after=Orbit.session.rol();
    const productAdvisor=String(user&&user.advisorId||'');
    const sessionAdvisor=String(Orbit.session.asesorId&&Orbit.session.asesorId()||'');
    return{
      sessionVersion:String(Orbit.session.VERSION||''),
      taxonomyVersion:String(Orbit.productRoleTaxonomyP0&&Orbit.productRoleTaxonomyP0.VERSION||''),
      membershipBound:Orbit.session.membershipBound(),
      requiresMembership:Orbit.session.requiresMembership(),
      allowedRoles:allowed.slice().sort(),
      activeRole:before,
      assignedRoleCount:allowed.length,
      writeAuthorized:Orbit.session.writeAuthorized===true,
      membershipWrites:Orbit.session.membershipWrites===true,
      unauthorizedRoleAllowed:Orbit.session.roleAllowed('Finanzas'),
      unauthorizedSetResult:blocked,
      blockedReason,
      roleAfterUnauthorizedProbe:after,
      roleUnchanged:before===after,
      advisorProjectionConsistent:productAdvisor===sessionAdvisor,
      advisorPresent:Boolean(sessionAdvisor)
    };
  });
  requireState(state.sessionVersion==='20260728.2','ACCESS_OWNER_VERSION_MISMATCH',state.sessionVersion);
  requireState(state.taxonomyVersion==='p0-m2-20260723','ROLE_TAXONOMY_VERSION_MISMATCH',state.taxonomyVersion);
  requireState(state.membershipBound&&state.requiresMembership,'MEMBERSHIP_BOUNDARY_NOT_ACTIVE');
  REQUIRED_ROLES.forEach(role=>requireState(state.allowedRoles.includes(role),'ASSIGNED_ROLE_MISSING',role));
  requireState(state.unauthorizedRoleAllowed===false&&state.unauthorizedSetResult===false&&state.blockedReason==='role_not_assigned'&&state.roleUnchanged,'UNAUTHORIZED_ROLE_NOT_BLOCKED');
  requireState(state.advisorProjectionConsistent&&state.advisorPresent,'ADVISOR_NOT_MEMBERSHIP_DERIVED');
  requireState(state.writeAuthorized===false&&state.membershipWrites===false,'ACCESS_OWNER_WRITE_CAPABILITY_INVALID');
  report.accessBoundary=state;
  report.checks.accessBoundary=true;
}

async function validateDataset(page){
  const data=await page.evaluate(()=>{
    const rows=Orbit.store.all('clientes')||[];
    const countries={GT:0,CO:0,REQUIERE_VALIDACION:0};
    const types={Persona:0,Empresa:0};
    rows.forEach(row=>{
      const country=String(row.pais||'');if(Object.prototype.hasOwnProperty.call(countries,country))countries[country]+=1;
      const type=String(row.tipo||'');if(Object.prototype.hasOwnProperty.call(types,type))types[type]+=1;
    });
    return{
      clients:rows.length,
      insurers:(Orbit.store.all('aseguradoras')||[]).length,
      advisors:(Orbit.store.all('asesores')||[]).length,
      countries,
      types,
      missingCurrency:rows.filter(row=>!String(row.moneda||'').trim()).length,
      invalidCountryCurrency:rows.filter(row=>(row.pais==='GT'&&row.moneda!=='GTQ')||(row.pais==='CO'&&row.moneda!=='COP')).length
    };
  });
  requireState(data.clients===414,'CLIENT_COUNT_INVALID',String(data.clients));
  requireState(data.insurers===26,'INSURER_COUNT_INVALID',String(data.insurers));
  requireState(data.advisors===7,'ADVISOR_COUNT_INVALID',String(data.advisors));
  requireState(data.countries.GT===EXPECTED_COUNTRIES.GT&&data.countries.CO===EXPECTED_COUNTRIES.CO&&data.countries.REQUIERE_VALIDACION===EXPECTED_COUNTRIES.REQUIERE_VALIDACION,'COUNTRY_COUNTS_INVALID',JSON.stringify(data.countries));
  requireState(data.types.Persona===EXPECTED_TYPES.Persona&&data.types.Empresa===EXPECTED_TYPES.Empresa,'TYPE_COUNTS_INVALID',JSON.stringify(data.types));
  requireState(data.missingCurrency===0&&data.invalidCountryCurrency===0,'COUNTRY_CURRENCY_CONSISTENCY_INVALID');
  report.dataBaseline=data;
  report.checks.dataBaseline=true;
}

async function validateResponsiveTitle(page,label){
  const state=await page.evaluate(()=>{
    const visible=element=>{if(!element)return false;const style=getComputedStyle(element),rect=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0;};
    const title=document.querySelector('.mod-band .mb-tt h2,.fichahdr h2,.m1-asg-hero h2');
    const rect=title&&title.getBoundingClientRect();
    return{
      width:innerWidth,
      titleVisible:visible(title),
      titleWithinViewport:Boolean(rect&&rect.left>=-2&&rect.right<=innerWidth+2),
      titleOverflow:Boolean(title&&title.scrollWidth>title.clientWidth+2),
      roleSelectorVisible:visible(document.getElementById('rol-sel')),
      technicalCopyVisible:/Firebase|Firestore|localStorage|mock|smoke|dry-run|backend|LAB/i.test(document.body.innerText)
    };
  });
  requireState(state.titleVisible&&state.titleWithinViewport&&!state.titleOverflow,'RESPONSIVE_TITLE_INVALID',label);
  requireState(state.roleSelectorVisible,'ROLE_SELECTOR_NOT_VISIBLE',label);
  requireState(!state.technicalCopyVisible,'TECHNICAL_COPY_VISIBLE',label);
  return state;
}

async function validateClient360(page,label,role){
  await page.evaluate(()=>{location.hash='#/cliente360';});
  await page.waitForFunction(()=>location.hash==='#/cliente360'&&document.querySelector('#host'),null,{timeout:15000});
  await page.locator('#host table.tbl').first().waitFor({state:'visible',timeout:20000});
  const state=await page.evaluate(()=>{
    const all=Orbit.store.all('clientes')||[];
    const access=Orbit.access||{};
    const scope=access.dataScope?access.dataScope('cliente360'):'all';
    const actor=access.actorAdvisorId?String(access.actorAdvisorId()||''):'';
    const scoped=access.filter?access.filter('clientes',all,'cliente360'):all;
    return{scope,total:all.length,scoped:scoped.length,actorPresent:Boolean(actor),ownConsistent:scope!=='own'||scoped.every(row=>String(row.asesorId||'')===actor),tableVisible:Boolean(document.querySelector('#host table.tbl')),searchVisible:Boolean(document.getElementById('f-q')||document.querySelector('.tb-search input'))};
  });
  requireState(state.total===414&&state.scoped>0&&state.scoped<=414,'CLIENT_SCOPE_COUNT_INVALID',`${label}:${state.scoped}`);
  requireState(state.ownConsistent,'CLIENT_SCOPE_OWN_INCONSISTENT',label);
  requireState(state.tableVisible&&state.searchVisible,'CLIENT_UI_MISSING',label);
  const responsive=await validateResponsiveTitle(page,label+'Client360');
  report.roleViews[label]={role,client360:state,responsive};
}

async function validateInsurers(page,label,role){
  await page.evaluate(()=>{location.hash='#/aseguradoras';});
  const cards=page.locator('.asg-grid [data-asg]');
  await cards.first().waitFor({state:'visible',timeout:20000});
  const count=await cards.count();
  requireState(count===26,'INSURER_CARD_COUNT_INVALID',`${label}:${count}`);
  await cards.first().click();
  await page.locator('#asg-ficha').waitFor({state:'visible',timeout:15000});
  const state=await page.evaluate(()=>{
    const module=Orbit.modules&&Orbit.modules.aseguradoras;
    return{ownerReady:Boolean(module&&module.__ownerKnowledgeV20260717&&module.__tenantOrderV20260717&&module.__consumerGatesSeparatedV20260717),editVisible:Boolean(document.getElementById('af-editar')),saveVisible:Boolean(document.getElementById('af-guardar')),knowledgeTab:Boolean(document.querySelector('[data-tab="tarifas"]'))};
  });
  requireState(state.ownerReady&&state.knowledgeTab,'INSURER_OWNER_OR_KNOWLEDGE_MISSING',label);
  requireState(!state.saveVisible,'INSURER_SAVE_VISIBLE_IN_READ_MODE',label);
  if(role==='Asesor')requireState(!state.editVisible,'ADVISOR_INSURER_EDIT_VISIBLE');
  const responsive=await validateResponsiveTitle(page,label+'Insurers');
  Object.assign(report.roleViews[label],{insurers:{count,...state},insurerResponsive:responsive});
}

async function validateMobileMenu(page){
  await page.locator('#burger').click();
  await page.waitForTimeout(350);
  const labels=await page.locator('#sidebar .nav-link:visible').evaluateAll(nodes=>nodes.map(node=>String(node.textContent||'').replace(/\s+/g,' ').trim()));
  requireState(labels.length>1&&labels.some(label=>/Cliente/i.test(label))&&labels.some(label=>/Aseguradoras/i.test(label)),'MOBILE_MENU_INCOMPLETE',String(labels.length));
  report.mobileMenuVisibleModules=labels.length;
  report.checks.mobileMenu=true;
}

let browser;
const watchdog=setTimeout(()=>{report.ok=false;report.error=`GATE_TIMEOUT:${report.stage}`;save();process.exit(124);},900000);
try{
  requireState(/^https:\/\//.test(baseUrl),'BLOQUEO_PREVIEW_URL');
  requireState(key.length>=12,'BLOQUEO_ACCESO_LAB');
  requireState(runtime===EXPECTED_RUNTIME,'BLOQUEO_RUNTIME_OWNER_VERSION',runtime);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);
  installBootstrapDiagnostics(page,report);
  page.on('request',request=>{
    const url=request.url();
    if(/google\.firestore\.v1\.Firestore\/(Commit|BatchWrite)|documents:(commit|batchWrite)/i.test(url)&&report.writeGuard.networkWriteCandidates.length<12)report.writeGuard.networkWriteCandidates.push({path:pathOnly(url),method:request.method()});
  });
  await page.addInitScript(expectedPolicyVersion=>{
    const guard=window.__orbitM5WriteGuard={transientStaticCalls:[],blockedOperationalCalls:[],installed:false,policyVersion:'',installErrors:[]};
    const rowId=row=>row&&(row.id||row.uid||row.codigo||row.numero||row.key)||'';
    const wrap=()=>{
      try{
        if(!window.Orbit||!Orbit.store||Orbit.store.__m5RuntimeGuarded||typeof Orbit.store._writePolicy!=='function'||Orbit.store.__academiaStaticWritePolicyVersion!==expectedPolicyVersion)return;
        ['insert','update','remove','setPref'].forEach(name=>{
          const original=Orbit.store[name];if(typeof original!=='function')return;
          Orbit.store[name]=function(){
            const args=Array.from(arguments);
            const collection=name==='setPref'?'__prefs':String(args[0]||'');
            const id=name==='insert'?String(rowId(args[1])||''):String(args[1]||'');
            const payload=name==='insert'?args[1]:(name==='update'?args[2]:(name==='setPref'?args[1]:null));
            const decision=Orbit.store._writePolicy(name,collection,id,payload)||{mode:'durable_operational',reason:'missing_policy_decision'};
            if(decision.mode==='transient_static_content'){
              guard.transientStaticCalls.push({method:name,collection,reason:String(decision.reason||'')});
              return original.apply(this,args);
            }
            guard.blockedOperationalCalls.push({method:name,collection,reason:String(decision.reason||'')});
            throw new Error('M5_RUNTIME_DURABLE_WRITE_BLOCKED:'+name);
          };
        });
        Object.defineProperty(Orbit.store,'__m5RuntimeGuarded',{value:true});
        guard.installed=true;
        guard.policyVersion=expectedPolicyVersion;
      }catch(error){if(guard.installErrors.length<3)guard.installErrors.push(String(error&&error.name||'guard_error'));}
    };
    document.addEventListener('orbit:academia-static-write-policy',wrap,true);
    wrap();
    setInterval(wrap,5);
  },EXPECTED_POLICY_VERSION);

  report.browserParseDiagnostics={failedScripts:[],exceptions:[],parsedScripts:[]};
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Runtime.enable');
  await cdp.send('Debugger.enable');
  cdp.on('Debugger.scriptParsed',event=>{const parsedPath=pathOnly(event&&event.url);if(/data\/store\.js|store-firestore-lab|academia-static-content-write-policy|core\/router\.js|core\/auth\.js|product-role-taxonomy|access-role-session-owner|client-canonical-view-projection/.test(parsedPath)&&report.browserParseDiagnostics.parsedScripts.length<32)report.browserParseDiagnostics.parsedScripts.push(parsedPath);});
  cdp.on('Debugger.scriptFailedToParse',event=>{if(report.browserParseDiagnostics.failedScripts.length<12)report.browserParseDiagnostics.failedScripts.push({path:pathOnly(event&&event.url),error:clean(event&&event.errorMessage)});});
  cdp.on('Runtime.exceptionThrown',event=>{const details=event&&event.exceptionDetails||{},frame=details.stackTrace&&details.stackTrace.callFrames&&details.stackTrace.callFrames[0]||{};if(report.browserParseDiagnostics.exceptions.length<12)report.browserParseDiagnostics.exceptions.push({path:pathOnly(details.url||frame.url),error:clean(details.exception&&details.exception.description||details.text)});});

  stage('open_lab_preview');
  await page.goto(`${baseUrl}/ays-lab-preview.html`,{waitUntil:'domcontentloaded',timeout:60000});
  await awaitPreviewRedirect(page);
  await validateStaticWritePolicy(page);
  await waitForProductBootstrap(page,{runtime,bounded,requireState,report});
  await authenticateWithOwner(page,{email,key,runtime,bounded,requireState,report});
  await acceptLegalOnce(page,{bounded,requireState,report});
  await bounded('real_tenant_data',()=>page.waitForFunction(()=>window.Orbit&&Orbit.store&&Orbit.store.all&&Orbit.store.all('clientes').length===414&&Orbit.store.all('aseguradoras').length===26,null,{timeout:60000,polling:250}),65000);
  await validateAccessBoundary(page);
  await validateDataset(page);

  await page.setViewportSize({width:1440,height:1000});
  await selectAssignedRole(page,'Dirección');
  await validateClient360(page,'desktopDirection','Dirección');
  await validateInsurers(page,'desktopDirection','Dirección');
  report.checks.desktopDirection=true;

  await page.setViewportSize({width:820,height:1180});
  await selectAssignedRole(page,'Operativo');
  await validateClient360(page,'tabletOperativo','Operativo');
  await validateInsurers(page,'tabletOperativo','Operativo');
  report.checks.tabletOperativo=true;

  await page.setViewportSize({width:390,height:844});
  await selectAssignedRole(page,'Asesor');
  await page.evaluate(()=>{location.hash='#/inicio';});
  await page.waitForTimeout(500);
  await validateMobileMenu(page);
  await validateClient360(page,'mobileAsesor','Asesor');
  await validateInsurers(page,'mobileAsesor','Asesor');
  report.checks.mobileAsesor=true;

  const guard=await page.evaluate(()=>window.__orbitM5WriteGuard||{transientStaticCalls:[],blockedOperationalCalls:[],installed:false,installErrors:['missing']});
  report.writeGuard.transientStaticCalls=guard.transientStaticCalls||[];
  report.writeGuard.blockedOperationalCalls=guard.blockedOperationalCalls||[];
  report.writeGuard.storeGuardInstalled=guard.installed===true;
  report.writeGuard.policyVersion=guard.policyVersion||'';
  report.writeGuard.installErrors=guard.installErrors||[];
  requireState(report.writeGuard.storeGuardInstalled&&report.writeGuard.policyVersion===EXPECTED_POLICY_VERSION,'STORE_WRITE_GUARD_NOT_INSTALLED');
  requireState(report.writeGuard.transientStaticCalls.length>0,'TRANSIENT_STATIC_CONTENT_NOT_OBSERVED');
  requireState(report.writeGuard.blockedOperationalCalls.length===0,'DURABLE_STORE_WRITE_CALL_DETECTED',String(report.writeGuard.blockedOperationalCalls.length));
  requireState(report.writeGuard.networkWriteCandidates.length===0,'FIRESTORE_NETWORK_WRITE_DETECTED',String(report.writeGuard.networkWriteCandidates.length));
  requireState(report.browserParseDiagnostics.failedScripts.length===0,'BROWSER_SCRIPT_PARSE_FAILURE');
  requireState(report.browserParseDiagnostics.exceptions.length===0,'BROWSER_RUNTIME_EXCEPTION');
  report.checks.noDurableWrites=true;
  report.checks.transientStaticContent=true;
  report.checks.noParseFailures=true;
  report.ok=Object.values(report.checks).every(Boolean);
  stage('completed');
}catch(error){
  report.ok=false;
  report.failureStage=report.stage;
  report.error=clean(error&&error.stack||error);
}finally{
  try{save();}catch{}
  try{if(browser)await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,10000))]);}catch{}
  clearTimeout(watchdog);
}
console.log(`ORBIT360_M5_508_RUNTIME_SMOKE:${JSON.stringify({ok:report.ok,stage:report.stage,failureStage:report.failureStage||'',checks:report.checks,error:report.error||''})}`);
process.exit(report.ok?0:1);
