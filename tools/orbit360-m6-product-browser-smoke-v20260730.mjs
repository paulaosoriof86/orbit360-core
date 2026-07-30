#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {TECHNICAL_COPY_PATTERN,VISIBLE_TECHNICAL_COPY_PREDICATE_VERSION} from './orbit360-visible-technical-copy-predicate-v20260729.mjs';
const ROOT=process.cwd(),OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m6-product-browser-smoke-summary.json');
const url=String(process.env.ORBIT360_PRODUCT_URL||'').trim();
const email=String(process.env.ORBIT360_PRODUCT_SMOKE_EMAIL||'').trim();
const password=String(process.env.ORBIT360_PRODUCT_SMOKE_PASSWORD||'');
const REQUIRED_ROLES=['Dirección','Operativo','Asesor'];
const REQUIRED_COLLECTIONS=['clientes','aseguradoras'];
const report={schemaVersion:'orbit360-m6-product-browser-smoke-v5',gateId:'block6-go-live-product-v20260730',contractVersion:'6.1.12',validatorRevision:'20260730.5',generatedAt:new Date().toISOString(),stage:'init',checks:{},roleViews:{},networkWriteCandidates:[],visibleTechnicalCopyPredicateVersion:VISIBLE_TECHNICAL_COPY_PREDICATE_VERSION,firestoreRead:true,firestoreWrites:0,operationalWrites:0,functionsDeploy:false,storageDeferredFailClosed:true,production:true,containsPII:false,containsSecrets:false};
const clean=v=>String(v==null?'':v).replace(/https?:\/\/[^/\s]+/g,'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[A-Za-z0-9_-]{40,}/g,'[redacted]').replace(/\s+/g,' ').trim().slice(0,360);
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
const need=(ok,code,detail='')=>{if(!ok)throw new Error(code+(detail?':'+detail:''));};
async function selectRole(page,role){const result=await page.evaluate(target=>{const allowed=Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];if(!allowed.includes(target))return{ok:false,allowed};const sel=document.getElementById('rol-sel');if(sel){const option=Array.from(sel.options||[]).find(o=>String(o.value||'')===target||String(o.textContent||'').trim()===target);if(option){sel.value=option.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true};}}return{ok:Boolean(Orbit.session&&Orbit.session.set&&Orbit.session.set(target))};},role);need(result&&result.ok,'ROLE_SELECTION_FAILED',role);await page.waitForFunction(target=>window.Orbit&&Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,role,{timeout:15000});await page.waitForTimeout(400);}
async function acceptLegal(page){const gate=page.locator('[data-legal-gate]');if(await gate.count()){const box=page.locator('#lg-chk');if(await box.count()){await box.check();await page.locator('#lg-ok').click();await gate.waitFor({state:'detached',timeout:10000}).catch(()=>{});}}}
async function checkClient360(page,label){await page.evaluate(()=>{location.hash='#/cliente360';});await page.waitForTimeout(600);await page.locator('#host table.tbl').first().waitFor({state:'visible',timeout:20000});const state=await page.evaluate(()=>({total:(Orbit.store.all('clientes')||[]).length,visibleRows:document.querySelectorAll('#host table.tbl tbody tr').length,role:Orbit.session.rol(),technical:new RegExp(window.__ORBIT_M6_TECH_PATTERN__||'firebase|firestore|backend|localStorage|mock|demo|smoke','i').test(document.body.innerText)}));need(state.total===414&&state.visibleRows>0,'CLIENT360_INVALID',label);need(!state.technical,'TECHNICAL_COPY_VISIBLE',label);return state;}
async function verifiedSemanticCardClick(page){
  const proof=await page.evaluate(async()=>{
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    let previous=null,stable=0,node=null;
    const started=Date.now();
    while(Date.now()-started<6000){
      const cards=Array.from(document.querySelectorAll('.asg-grid [data-asg]'));
      const current=cards[0]||null;
      if(cards.length!==26||!current||!current.isConnected){previous=null;stable=0;node=current;await sleep(120);continue;}
      const r=current.getBoundingClientRect();
      const box=[r.x,r.y,r.width,r.height];
      const sameNode=node===current;
      const sameBox=previous&&box.every((v,i)=>Math.abs(v-previous[i])<0.25);
      stable=sameNode&&sameBox?stable+1:0;node=current;previous=box;
      if(stable>=4)break;
      await sleep(120);
    }
    const cards=Array.from(document.querySelectorAll('.asg-grid [data-asg]'));
    const el=cards[0]||null;
    if(cards.length!==26||!el||!el.isConnected||stable<4)return{ok:false,cardCount:cards.length,geometryStable:false,centerHit:false,clickDispatched:false};
    const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,top=document.elementFromPoint(x,y);
    const centerHit=!!top&&(top===el||el.contains(top));
    if(!centerHit)return{ok:false,cardCount:cards.length,geometryStable:true,centerHit:false,clickDispatched:false};
    el.click();
    return{ok:true,cardCount:cards.length,geometryStable:true,centerHit:true,clickDispatched:true};
  });
  need(proof&&proof.ok&&proof.cardCount===26&&proof.geometryStable&&proof.centerHit&&proof.clickDispatched,'INSURER_CARD_SEMANTIC_CLICK_PRECONDITION_FAILED',JSON.stringify(proof||{}));
  return proof;
}
async function checkInsurers(page,label,role){await page.evaluate(()=>{location.hash='#/aseguradoras';});await page.waitForTimeout(500);const cards=page.locator('.asg-grid [data-asg]');await cards.first().waitFor({state:'visible',timeout:20000});const count=await cards.count();need(count===26,'INSURER_COUNT_INVALID',`${label}:${count}`);const interaction=await verifiedSemanticCardClick(page);await page.locator('#asg-ficha').waitFor({state:'visible',timeout:10000});const edit=await page.locator('#af-editar').count();if(role==='Asesor')need(edit===0,'ADVISOR_INSURER_EDIT_VISIBLE');return{count,editVisible:edit>0,interaction};}
let browser,page;
try{
  need(/^https:\/\//.test(url),'PRODUCT_URL_REQUIRED');need(email.includes('@'),'SMOKE_EMAIL_REQUIRED');need(password.length>=12,'SMOKE_PASSWORD_REQUIRED');
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.addInitScript(pattern=>{window.__ORBIT_M6_TECH_PATTERN__=pattern;window.__ORBIT_M6_BOOTSTRAP_STATE__=null;window.addEventListener('orbit:product-readonly-bootstrap',function(ev){var d=ev&&ev.detail||{};window.__ORBIT_M6_BOOTSTRAP_STATE__={phase:String(d.phase||''),ready:d.ready===true,readOnly:d.readOnly===true,writeAuthorized:d.writeAuthorized===true,tenantBound:Boolean(String(d.tenantId||'')),assignedRoleCount:Number(d.assignedRoleCount||0),countryCount:Number(d.countryCount||0),collectionCount:Number(d.collectionCount||0),errors:Array.isArray(d.errors)?d.errors.map(function(x){return String(x).slice(0,120);}).slice(0,8):[]};});},TECHNICAL_COPY_PATTERN);
  page.on('request',req=>{const method=req.method().toUpperCase(),u=req.url();if(['GET','HEAD','OPTIONS'].includes(method))return;if(/identitytoolkit|securetoken/i.test(u))return;if(/firestore.*(?:commit|batchWrite|write)|google\.firestore\.v1\.Firestore\/(?:Commit|BatchWrite|Write)/i.test(u)&&report.networkWriteCandidates.length<12)report.networkWriteCandidates.push({method,path:new URL(u).pathname.slice(0,180)});});
  report.stage='navigate';await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  report.stage='login';await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(()=>window.Orbit&&Orbit.productAppP0&&Orbit.productAppP0.isStarted&&Orbit.productAppP0.isStarted()===true,undefined,{timeout:60000,polling:100});
  await acceptLegal(page);
  report.stage='runtime_contract';const runtime=await page.evaluate(required=>{const s=Orbit.store&&Orbit.store._productStatus?Orbit.store._productStatus():{};const user=Orbit.auth&&Orbit.auth.productUser||{};const allowed=Orbit.session&&Orbit.session.allowedRoles?Orbit.session.allowedRoles():[];const header=document.querySelector('#tb-user .who b');const attached=Array.isArray(s.attachedCollections)?s.attachedCollections.slice():[];const denied=Array.isArray(s.deniedCollections)?s.deniedCollections.slice():[];const done=attached.concat(denied);const plans=s.queryPlans||{};const alias=Orbit.tenantAccessPolicyProductP0&&Orbit.tenantAccessPolicyProductP0.QUERY_FIELD_ALIASES||{};const planFields={};required.forEach(name=>{planFields[name]=Array.isArray(plans[name]&&plans[name].constraints)?plans[name].constraints.map(x=>String(x&&x.field||'')):[];});return{ready:s.ready===true,status:String(s.status||''),noFallback:s.noFallback===true,writeEnabled:s.writeEnabled===true,productReadOnly:user.productReadOnly===true,tenantBound:Boolean(user.tenantId),advisorBound:Boolean(String(user.advisorId||'').trim()),allowedRoles:allowed.slice(),headerText:String(header&&header.textContent||'').trim(),clients:(Orbit.store.all('clientes')||[]).length,insurers:(Orbit.store.all('aseguradoras')||[]).length,attachedCollections:attached,deniedCollections:denied,allActiveCollectionsReady:required.every(name=>done.includes(name)),physicalCountryFieldAlias:String(alias.country||''),queryPlanFields:planFields,queryPlansUsePhysicalCountry:required.every(name=>planFields[name].includes('pais')&&!planFields[name].includes('country'))};},REQUIRED_COLLECTIONS);
  report.runtime=runtime;
  need(runtime.ready&&runtime.status==='ready-read-only'&&runtime.noFallback&&!runtime.writeEnabled&&runtime.productReadOnly&&runtime.tenantBound&&runtime.advisorBound,'PRODUCT_RUNTIME_NOT_READY');
  need(runtime.allActiveCollectionsReady,'ACTIVE_COLLECTION_SNAPSHOTS_INCOMPLETE',JSON.stringify(runtime.attachedCollections));
  need(runtime.physicalCountryFieldAlias==='pais'&&runtime.queryPlansUsePhysicalCountry,'PRODUCT_QUERY_ALIAS_INVALID',runtime.physicalCountryFieldAlias);
  need(runtime.clients===414&&runtime.insurers===26,'PRODUCT_BASELINE_INVALID',JSON.stringify({c:runtime.clients,i:runtime.insurers}));
  REQUIRED_ROLES.forEach(r=>need(runtime.allowedRoles.includes(r),'ASSIGNED_ROLE_MISSING',r));
  need(runtime.headerText&&runtime.headerText!=='Andrea Beltrán','AUTHENTICATED_HEADER_IDENTITY_NOT_PAINTED');report.checks.runtime=true;report.checks.queryAlias=true;report.checks.allActiveCollections=true;
  report.stage='write_guard';const write=await page.evaluate(()=>{try{Orbit.store.insert('clientes',{id:'m6-forbidden'});return{blocked:false};}catch(e){return{blocked:true,code:String(e&&e.code||'')}}});need(write.blocked&&/WRITE_BLOCKED_PRODUCT_READ_ONLY_P0/.test(write.code),'LOCAL_WRITE_GUARD_FAILED',write.code);report.localWriteGuard=write;report.checks.writeGuard=true;
  const views=[['desktopDirection','Dirección',{width:1440,height:1000}],['tabletOperativo','Operativo',{width:900,height:1100}],['mobileAsesor','Asesor',{width:390,height:844}]];
  for(const [label,role,viewport] of views){report.stage=label;await page.setViewportSize(viewport);await selectRole(page,role);const client360=await checkClient360(page,label);const insurers=await checkInsurers(page,label,role);report.roleViews[label]={role,client360,insurers};}
  report.stage='final';need(report.networkWriteCandidates.length===0,'NETWORK_WRITE_CANDIDATE_DETECTED',String(report.networkWriteCandidates.length));report.checks.roles=true;report.checks.insurerSemanticClick=true;report.ok=true;report.status='M6_PRODUCT_BROWSER_SMOKE_PASS';
}catch(error){report.ok=false;report.status='M6_PRODUCT_BROWSER_SMOKE_FAIL';report.error=clean(error&&error.message||error);report.failureStage=report.stage;if(page&&['login','runtime_contract'].includes(report.stage)){try{report.runtimeDiagnostics=await page.evaluate(()=>{const s=window.Orbit&&Orbit.store&&Orbit.store._productStatus?Orbit.store._productStatus():{},b=window.__ORBIT_M6_BOOTSTRAP_STATE__||null;return{orbitPresent:Boolean(window.Orbit),productAppPresent:Boolean(window.Orbit&&Orbit.productAppP0),productStarted:Boolean(window.Orbit&&Orbit.productAppP0&&Orbit.productAppP0.isStarted&&Orbit.productAppP0.isStarted()),productStatus:String(s&&s.status||''),storeReady:Boolean(s&&s.ready===true),noFallback:Boolean(s&&s.noFallback===true),writeEnabled:Boolean(s&&s.writeEnabled===true),attachedCollectionCount:Array.isArray(s.attachedCollections)?s.attachedCollections.length:0,snapshotErrorCollections:Object.keys(s.snapshotErrors||{}).slice(0,8),bootstrap:b};});}catch{}}process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
