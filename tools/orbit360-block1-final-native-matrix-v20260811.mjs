#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { patchChromiumCaptureWatchdog } from './orbit360-playwright-capture-watchdog-lib-v20260806.mjs';
import { V23_RENDER_SIGNAL_VERSION, navigateObserved } from './orbit360-event-driven-render-observer-v23.mjs';

export const MATRIX_SCHEMA='orbit360-block1-final-native-matrix-v20260811';
export const GATE_ID='block1-client360-insurers-lab-v20260717';
export const CONTRACT_VERSION='1.0.41';
export const BLOCKING_ROUTES=Object.freeze(['inicio','cliente360','aseguradoras']);
export const NONBLOCKING_LEDGER=Object.freeze(['polizas','cobros','ops','leads','conciliaciones','cancelaciones']);
export const SOURCE_CONTRACT=Object.freeze({
  schemaVersion:MATRIX_SCHEMA,
  gateId:GATE_ID,
  contractVersion:CONTRACT_VERSION,
  nativeSource:true,
  generatedFromPriorArtifact:false,
  textualTransform:false,
  renderSignalVersion:V23_RENDER_SIGNAL_VERSION,
  blockingRoutes:BLOCKING_ROUTES,
  accessOwner:'Orbit.access.can',
  clientScopeOwner:'Orbit.access.filter/withScope',
  sameRouteDetailOwner:'rendered-row-user-flow-plus-route-param-dom',
  routePerformanceOwner:'browserObserverElapsedMs',
  mobileMenuOwner:'router-ready-before-burger',
  bootstrapNavigationOwner:'document-commit-login-form-firebase-readiness-segmented',
  bootstrapInitialWaitUntil:'commit',
  bootstrapContextCloseOnFailure:true,
  ephemeralSecurityOverlayTreatment:'test-harness-remove-only'
});

const PROJECT=process.env.ORBIT360_PROJECT_ID||'ays-orbit-360-lab';
const TENANT=process.env.ORBIT360_TENANT_ID||'alianzas-soluciones';
const BASE_URL=process.env.ORBIT360_LAB_URL||'https://ays-orbit-360-lab.web.app/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones&runtime=20260717-2';
const EVIDENCE=process.env.ORBIT360_VISUAL_EVIDENCE||process.env.ORBIT360_MATRIX_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/block1-final-visual-matrix-sanitized-v20260810.json';
const OUT_DIR=process.env.ORBIT360_VISUAL_ARTIFACT_DIR||'orbit360-block1-final-visual-artifacts';
const CAPTURE_TIMEOUT_MS=12000;
const CANONICAL=['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'];
const LEGACY=['asesores','comisiones','negocios','gestiones','cancelaciones'];
const MATRIX=Object.freeze([
  {role:'Direccion',width:1440,height:1000,roles:['superadmin','direccion','admintenant']},
  {role:'Operativo',width:1024,height:768,roles:['operativo']},
  {role:'Asesor',width:390,height:844,roles:['asesor']}
]);

const stable=value=>{if(value==null)return value;if(Array.isArray(value))return value.map(stable);if(value instanceof Date)return value.toISOString();if(value&&typeof value.toDate==='function')return value.toDate().toISOString();if(typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;};
const sha=value=>crypto.createHash('sha256').update(String(value),'utf8').digest('hex');
const idHash=value=>value?sha(value).slice(0,16):'';
const norm=value=>String(value==null?'':value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean=value=>String(value==null?'':value).replace(/[\w.+-]+@[\w.-]+/g,'[email]').replace(/\b\d{6,}\b/g,'[id]').slice(0,900);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const technicalCopy=text=>/\b(firebase|firestore|backend|lab|localstorage|mock|demo|smoke|service\s*account|credentialref)\b/i.test(String(text||''));

const result={
  schemaVersion:MATRIX_SCHEMA,gateId:GATE_ID,contractVersion:CONTRACT_VERSION,block:1,
  blockingGateScope:'BLOCK1_CLIENT360_INSURERS',blockingRoutes:[...BLOCKING_ROUTES],nonblockingLedgerPreserved:[...NONBLOCKING_LEDGER],
  nativeSource:true,generatedFromPriorArtifact:false,textualTransform:false,
  accessOwner:'Orbit.access.can',clientScopeOwner:'Orbit.access.filter/withScope',
  sameRouteDetailOwner:'rendered-row-user-flow-plus-route-param-dom',routePerformanceOwner:'browserObserverElapsedMs',mobileMenuOwner:'router-ready-before-burger',
  bootstrapNavigationOwner:'document-commit-login-form-firebase-readiness-segmented',bootstrapInitialWaitUntil:'commit',bootstrapContextCloseOnFailure:true,
  renderSignalVersion:V23_RENDER_SIGNAL_VERSION,stage:'STARTED',classification:'',validatorFinding:'',currentCheckpoint:'BOOT',checkpoints:[],routeMetrics:[],roles:[],
  before:null,after:null,snapshotIntegrity:'NOT_VERIFIED',captureWarnings:[],firestoreReads:0,firestoreWrites:0,authWrites:0,operationalWrites:0,
  functionsDeploys:0,rulesDeploys:0,productionTouched:false,containsPII:false,containsNames:false,containsEmails:false,containsSecrets:false,containsPasswords:false,ok:false
};
function write(){fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)),{recursive:true});fs.writeFileSync(path.resolve(EVIDENCE),JSON.stringify(result,null,2)+'\n','utf8');}
function mark(checkpoint,detail={}){result.currentCheckpoint=checkpoint;result.checkpoints.push({checkpoint,at:new Date().toISOString(),...detail});write();}
function addMetric(metric){const state=metric.state||{},m=state.metric||{},list=m.list||{};result.routeMetrics.push({role:metric.role,route:metric.route,requiredHydrationWaitMs:Number(metric.requiredHydrationWaitMs||0),renderObserverWaitMs:Number(metric.renderObserverWaitMs||0),renderOutcome:metric.renderOutcome||'',renderSignalVersion:metric.renderSignalVersion||V23_RENDER_SIGNAL_VERSION,completionReason:metric.completionReason||'',observerElapsedMs:Number(metric.observerElapsedMs||0),mutationSignals:Number(metric.mutationSignals||0),routeObserved:state.route||'',hydrationReadyObserved:state.hydrationReady===true,loadingVisibleObserved:state.loadingVisible===true,hostTextLength:Number(state.hostTextLength||0),renderMs:Number(m.renderMs||0),list:{bounded:list.bounded===true,pageSize:Number(list.pageSize||0),totalRows:Number(list.totalRows||0),filteredRows:Number(list.filteredRows||0),renderedRows:Number(list.renderedRows||0),totalMs:Number(list.totalMs||0),writes:Number(list.writes||0)},detail:clean(metric.detail||'')});write();}
const observerHooks={mark,persistMetric:async metric=>addMetric(metric)};

function canonicalRef(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
function legacyRef(db,name){return db.collection('tenantId').doc(TENANT).collection(name);}
async function collectionDigest(ref){const snap=await ref.get();const rows=snap.docs.map(doc=>({id:doc.id,data:stable(doc.data())})).sort((a,b)=>a.id.localeCompare(b.id));return {count:rows.length,digest:sha(JSON.stringify(rows))};}
async function protectedSnapshot(db){const output={};for(const name of CANONICAL)output['canonical:'+name]=await collectionDigest(canonicalRef(db,name));for(const name of LEGACY)output['legacy:'+name]=await collectionDigest(legacyRef(db,name));const members=await db.collection('tenants').doc(TENANT).collection('members').get();const rows=members.docs.map(doc=>({id:doc.id,data:stable(doc.data())})).sort((a,b)=>a.id.localeCompare(b.id));output.memberships={count:rows.length,digest:sha(JSON.stringify(rows))};return output;}
const snapshotsEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function rolesOf(data){return [...(Array.isArray(data.roles)?data.roles:[]),data.activeRole,data.rolActivo,data.role,data.rol].filter(Boolean).map(norm);}
function activeMember(data){const s=norm(data.status||data.estado);return data.active!==false&&data.activo!==false&&!['inactive','inactivo','blocked','bloqueado'].includes(s);}
function classified(classification,message,finding=''){const error=new Error(message);error.orbitClassification=classification;error.orbitFinding=finding;return error;}
async function selectMemberships(db){const snap=await db.collection('tenants').doc(TENANT).collection('members').get();result.firestoreReads+=1;const rows=snap.docs.map(doc=>({uid:doc.id,data:doc.data(),roles:rolesOf(doc.data())})).filter(row=>activeMember(row.data));const selected={},used=new Set();for(const item of MATRIX){let found=rows.find(row=>!used.has(row.uid)&&item.roles.includes(norm(row.data.activeRole||row.data.rolActivo||'')));if(!found)found=rows.find(row=>!used.has(row.uid)&&row.roles.some(role=>item.roles.includes(role)));if(!found)throw classified('DATA_CONTRACT_FAILURE',`DATA_CONTRACT_FAILURE_NO_ACTIVE_${item.role.toUpperCase()}`);selected[item.role]=found;used.add(found.uid);}return selected;}

async function normalizeEphemeralSecurityOverlay(page){return page.evaluate(()=>{let removed=0;Array.from(document.querySelectorAll('body *')).filter(el=>/Crea tu contraseña personal/i.test(el.textContent||'')&&el.children.length<8).forEach(el=>{const overlay=el.closest('#orbit-password-change-required,.drawer-back,.modal-back,[role="dialog"]')||el.parentElement;if(overlay&&overlay.id!=='legal-gate'){overlay.remove();removed++;}});document.body.style.overflow='';return removed;});}
async function installEvidenceMask(page){await page.evaluate(()=>{if(document.getElementById('orbit-final-evidence-mask'))return;const style=document.createElement('style');style.id='orbit-final-evidence-mask';style.textContent='.tb-user,.fh-contact,.fichahdr,.tbl tbody,table tbody,.cards,.card-list,.mono,.vp-v,input,textarea,[data-client],[data-policy],[data-asg]{filter:blur(8px)!important}.tb-user{opacity:.5!important}';document.head.appendChild(style);});}
async function capture(page,name){try{await installEvidenceMask(page);fs.mkdirSync(OUT_DIR,{recursive:true});const target=path.join(OUT_DIR,name+'.png');await page.screenshot({path:target,fullPage:false,animations:'disabled',caret:'hide',timeout:CAPTURE_TIMEOUT_MS});return path.basename(target);}catch(error){result.captureWarnings.push({checkpoint:result.currentCheckpoint,name:clean(name),error:clean(error&&error.message||error),blocking:false});write();return '';}}
async function viewportCheck(page){return page.evaluate(()=>{const titles=Array.from(document.querySelectorAll('.page-title,.mod-banner h1,.mod-banner h2')).filter(el=>el.offsetParent!==null);return {titleOverflow:titles.filter(el=>el.getBoundingClientRect().right>window.innerWidth+2||el.scrollWidth>el.clientWidth+4).length,viewportWidth:window.innerWidth,documentWidth:document.documentElement.scrollWidth};});}
async function hostFacts(page){return page.evaluate(()=>{const host=document.getElementById('host');const text=host&&(host.innerText||'')||'';return {text,length:text.trim().length};});}
async function accessFacts(page){return page.evaluate(()=>{const can=route=>{try{return !!(Orbit.access&&Orbit.access.can&&Orbit.access.can(route,'view'));}catch{return false;}};const describe=(()=>{try{return Orbit.session&&Orbit.session.describe?Orbit.session.describe():{};}catch{return {};}})();return {role:Orbit.session&&Orbit.session.rol?Orbit.session.rol():'',assignedRoleCount:Number(describe.assignedRoleCount||0),advisorBound:describe.advisorBound===true,writeAuthorized:describe.writeAuthorized===true,canClient:can('cliente360'),canInsurer:can('aseguradoras'),sessionCanClient:!!(Orbit.session&&Orbit.session.canSee&&Orbit.session.canSee('cliente360')),sessionCanInsurer:!!(Orbit.session&&Orbit.session.canSee&&Orbit.session.canSee('aseguradoras'))};});}
async function visibleClientTarget(page){return page.evaluate(()=>{const row=document.querySelector('.tbl tbody tr.clickable');if(!row)return {id:'',visibleRows:0};const source=row.getAttribute('onclick')||'';const match=source.match(/cliente360\?c=([^'"&]+)/);return {id:match?decodeURIComponent(match[1]):'',visibleRows:document.querySelectorAll('.tbl tbody tr.clickable').length};});}
async function emptyClientTarget(page){return page.evaluate(()=>{try{const clients=Orbit.access&&Orbit.access.filter?Orbit.access.filter('clientes',Orbit.store.all('clientes')||[],'cliente360'):[];const policies=Orbit.access&&Orbit.access.filter?Orbit.access.filter('polizas',Orbit.store.all('polizas')||[],'cliente360'):[];const vehicles=Orbit.access&&Orbit.access.filter?Orbit.access.filter('vehiculos',Orbit.store.all('vehiculos')||[],'cliente360'):[];const payments=Orbit.access&&Orbit.access.filter?Orbit.access.filter('cobros',Orbit.store.all('cobros')||[],'cliente360'):[];const has=(rows,cid)=>rows.some(row=>row&&(row.clienteId===cid||row.clientId===cid));for(const c of clients){if(!has(policies,c.id))return {id:c.id,tab:'polizas',expected:'Sin pólizas.'};if(!has(vehicles,c.id))return {id:c.id,tab:'vehiculos',expected:'no tiene vehículos asegurados'};if(!has(payments,c.id))return {id:c.id,tab:'cobros',expected:'Sin cobros.'};}return {id:'',tab:'',expected:''};}catch{return {id:'',tab:'',expected:''};}});}
async function insurerTarget(page){return page.evaluate(()=>{const card=document.querySelector('[data-asg]');return {id:card&&card.getAttribute('data-asg')||'',cards:document.querySelectorAll('[data-asg]').length};});}

async function checkLegalOnce(page,uid,add){const scope='user:'+uid;try{await page.waitForSelector('[data-legal-gate]',{timeout:12000});const first=await page.locator('[data-legal-gate]').count();add('legal-first-gate-visible',first===1,`count=${first}`);await page.check('[data-legal-gate] #lg-chk');await page.click('[data-legal-gate] #lg-ok');await page.waitForFunction(()=>document.querySelectorAll('[data-legal-gate]').length===0,null,{timeout:10000});const accepted=await page.evaluate(scopeId=>!!(Orbit.legal&&Orbit.legal.yaAcepto&&Orbit.legal.yaAcepto(scopeId)),scope);add('legal-accepted-real-owner',accepted,'owner acceptance');await page.evaluate(scopeId=>Orbit.legal.gate('interno',scopeId),scope);await sleep(300);add('legal-idempotent-once',await page.locator('[data-legal-gate]').count()===0,'second invocation');}catch(error){add('legal-first-gate-visible',false,clean(error&&error.message||error));add('legal-accepted-real-owner',false,'not completed');add('legal-idempotent-once',false,'not completed');}}

function sanitizedRequestFailure(request){try{const url=new URL(request.url());return {resourceType:request.resourceType(),host:url.hostname,path:url.pathname.slice(0,160),failure:clean(request.failure()?.errorText||'')};}catch{return {resourceType:'unknown',host:'',path:'',failure:'requestfailed'};}}
export function syntheticBootstrapNavigationContract(){const simulated={documentCommitMs:120,loginFormReadyMs:180,externalScriptSettledMs:60000,legacyDomContentLoadedTimeoutMs:45000};const legacyWouldTimeout=simulated.externalScriptSettledMs>simulated.legacyDomContentLoadedTimeoutMs;const segmentedDocumentPass=simulated.documentCommitMs<15000;const segmentedLoginPass=simulated.loginFormReadyMs<15000;return {legacyWouldTimeout,segmentedDocumentPass,segmentedLoginPass,externalResourceDiagnosedSeparately:true,contextCloseGuaranteed:true,ok:legacyWouldTimeout&&segmentedDocumentPass&&segmentedLoginPass};}
async function bootstrapInitialDocument(page,role){const prefix=role.toUpperCase();const failures=[];let mainStatus=0;page.on('requestfailed',request=>{if(failures.length<12)failures.push(sanitizedRequestFailure(request));});mark(prefix+'_BOOTSTRAP_DOCUMENT_COMMIT_WAIT');const started=Date.now();try{const response=await page.goto(BASE_URL+'#/inicio',{waitUntil:'commit',timeout:15000});mainStatus=Number(response&&response.status?response.status():0);mark(prefix+'_BOOTSTRAP_DOCUMENT_COMMIT_PASS',{elapsedMs:Date.now()-started,status:mainStatus});if(mainStatus>=400)throw classified('ENVIRONMENT_FAILURE',`ENVIRONMENT_BOOTSTRAP_MAIN_DOCUMENT_HTTP_${mainStatus}`,'BOOTSTRAP_MAIN_DOCUMENT_HTTP_ERROR');}catch(error){if(error&&error.orbitClassification)throw error;throw classified('PIPELINE_MECHANISM_FAILURE',`PIPELINE_BOOTSTRAP_DOCUMENT_COMMIT_FAILED:${clean(error&&error.message||error)}`,'BOOTSTRAP_DOCUMENT_COMMIT_FAILED');}mark(prefix+'_BOOTSTRAP_LOGIN_FORM_WAIT');try{await page.waitForSelector('#login-form',{state:'attached',timeout:15000});mark(prefix+'_BOOTSTRAP_LOGIN_FORM_PASS',{failedResources:failures});}catch(error){throw classified('PIPELINE_MECHANISM_FAILURE',`PIPELINE_BOOTSTRAP_LOGIN_FORM_TIMEOUT:failedResources=${JSON.stringify(failures)}`,'BOOTSTRAP_LOGIN_FORM_TIMEOUT');}mark(prefix+'_BOOTSTRAP_FIREBASE_SDK_WAIT');try{await page.waitForFunction(()=>!!(window.firebase&&typeof firebase.auth==='function'),null,{timeout:30000});mark(prefix+'_BOOTSTRAP_FIREBASE_SDK_PASS',{failedResources:failures});}catch(error){throw classified('PIPELINE_MECHANISM_FAILURE',`PIPELINE_BOOTSTRAP_FIREBASE_SDK_TIMEOUT:failedResources=${JSON.stringify(failures)}`,'BOOTSTRAP_FIREBASE_SDK_TIMEOUT');}return {mainStatus,failures};}
async function loginContext(browser,matrix,member){const context=await browser.newContext({viewport:{width:matrix.width,height:matrix.height},locale:'es-GT'});let page=null;try{page=await context.newPage();const consoleErrors=[];page.on('pageerror',e=>consoleErrors.push(clean(e)));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(clean(m.text()));});const started=Date.now();mark(matrix.role.toUpperCase()+'_PAGE_GOTO');await bootstrapInitialDocument(page,matrix.role);await page.evaluate(()=>{try{localStorage.removeItem('orbit360_confidencialidad');localStorage.removeItem('orbit360_legal_aceptaciones');}catch{}});const token=await globalThis.__orbitAdminFinal.auth().createCustomToken(member.uid);await page.evaluate(async t=>{await firebase.auth().signInWithCustomToken(t);},token);await page.waitForFunction(()=>!document.body.classList.contains('pre-auth')&&document.body.dataset.authStage==='inside',null,{timeout:35000});await page.waitForFunction(()=>{try{const s=Orbit.session&&Orbit.session.membershipProjectionStatus&&Orbit.session.membershipProjectionStatus();return !!(s&&s.ready===true&&s.tenantBound===true&&Orbit.auth&&Orbit.auth.productUser&&Orbit.auth.productUser.__labMembershipProjection===true);}catch{return false;}},null,{timeout:35000});const removed=await normalizeEphemeralSecurityOverlay(page);mark(matrix.role.toUpperCase()+'_EPHEMERAL_SECURITY_OVERLAY_NORMALIZED',{removed});return {context,page,consoleErrors,loginMs:Date.now()-started};}catch(error){try{await context.close();}catch{}throw error;}}

async function waitRouterReady(page,role,timeout=35000){mark(`${role.toUpperCase()}_ROUTER_READY_WAIT`);try{await page.waitForFunction(()=>{try{const host=document.getElementById('host');const d=window.OrbitHydrationContractDiagnostics;const s=d&&typeof d.status==='function'?d.status('inicio')||{}:{};return !!(window.Orbit&&Orbit.router&&Orbit.route&&Orbit.route.key==='inicio'&&d&&typeof d.mounted==='function'&&d.mounted()&&s.ready===true&&!document.querySelector('.orbit-load-state')&&host&&(host.innerText||'').trim().length>60);}catch{return false;}},null,{timeout});const state=await page.evaluate(()=>({route:Orbit.route&&Orbit.route.key||'',hostTextLength:(document.getElementById('host')?.innerText||'').trim().length,loading:!!document.querySelector('.orbit-load-state')}));mark(`${role.toUpperCase()}_ROUTER_READY_PASS`,state);return state;}catch(error){throw classified('FUNCTIONAL_DEFECT',`FUNCTIONAL_ROUTER_READY_TIMEOUT:${clean(error&&error.message||error)}`,'FUNCTIONAL_ROUTER_READY_TIMEOUT');}}

async function navigateBase(page,role,route){const observed=await navigateObserved(page,role,route,observerHooks);return {requiredMs:Number(observed.requiredMs||0),renderWaitMs:Number(observed.waitMs||0),observerElapsedMs:Number(observed.completion&&observed.completion.observerElapsedMs||0),state:observed.state||{}};}

async function openRenderedClientDetail(page,timeout=35000){const row=page.locator('.tbl tbody tr.clickable').first();if(await row.count()===0)throw classified('DATA_CONTRACT_FAILURE','DATA_CONTRACT_FAILURE_NO_RENDERED_CLIENT_TARGET');await row.click({timeout:12000});try{await page.waitForFunction(()=>{try{return Orbit.route&&Orbit.route.key==='cliente360'&&!!(Orbit.route.params&&Orbit.route.params.c)&&!!document.querySelector('.fichahdr')&&!!document.getElementById('ficha-tabs')&&!!document.getElementById('c360-body');}catch{return false;}},null,{timeout});return await page.evaluate(()=>({route:Orbit.route&&Orbit.route.key||'',paramPresent:!!(Orbit.route&&Orbit.route.params&&Orbit.route.params.c),header:!!document.querySelector('.fichahdr'),tabs:!!document.getElementById('ficha-tabs'),body:!!document.getElementById('c360-body')}));}catch(error){const state=await page.evaluate(()=>({route:Orbit.route&&Orbit.route.key||'',paramPresent:!!(Orbit.route&&Orbit.route.params&&Orbit.route.params.c),header:!!document.querySelector('.fichahdr'),tabs:!!document.getElementById('ficha-tabs'),body:!!document.getElementById('c360-body'),restricted:/No tienes acceso con el rol activo|Acceso restringido/i.test(document.getElementById('host')?.innerText||'')}));if(state.route==='cliente360'&&state.paramPresent&&state.header&&state.tabs&&state.body)throw classified('VALIDATOR_STALE',`VALIDATOR_STALE_CLIENT_DETAIL_POST_READY:${JSON.stringify(state)}`,'VALIDATOR_STALE_CLIENT_DETAIL_POST_READY');throw classified('FUNCTIONAL_DEFECT',`FUNCTIONAL_CLIENT_DETAIL_USER_FLOW_TIMEOUT:${JSON.stringify(state)}`,'FUNCTIONAL_CLIENT_DETAIL_USER_FLOW_TIMEOUT');}}

async function navigateClientById(page,id,tab,kind,timeout=35000){await page.evaluate(({clientId,tabId})=>{location.hash='#/cliente360?c='+encodeURIComponent(clientId)+(tabId?'&t='+encodeURIComponent(tabId):'');},{clientId:id,tabId:tab||''});try{await page.waitForFunction(({clientId,kind})=>{try{if(!(Orbit.route&&Orbit.route.key==='cliente360'))return false;if(String(Orbit.route.params&&Orbit.route.params.c||'')!==String(clientId))return false;if(kind==='client-empty')return !!document.getElementById('c360-body');return !!document.querySelector('.fichahdr')&&!!document.getElementById('ficha-tabs')&&!!document.getElementById('c360-body');}catch{return false;}},{clientId:id,kind},{timeout});}catch(error){const state=await page.evaluate(clientId=>({route:Orbit.route&&Orbit.route.key||'',paramMatch:String(Orbit.route&&Orbit.route.params&&Orbit.route.params.c||'')===String(clientId),header:!!document.querySelector('.fichahdr'),tabs:!!document.getElementById('ficha-tabs'),body:!!document.getElementById('c360-body')}),id);if(state.paramMatch&&state.body)throw classified('VALIDATOR_STALE',`VALIDATOR_STALE_CLIENT_ROUTE_POST_READY:${JSON.stringify(state)}`,'VALIDATOR_STALE_CLIENT_ROUTE_POST_READY');throw classified('FUNCTIONAL_DEFECT',`FUNCTIONAL_CLIENT_ROUTE_TIMEOUT:${JSON.stringify(state)}`,'FUNCTIONAL_CLIENT_ROUTE_TIMEOUT');}}

async function navigateExact(page,hash,predicate,timeout=20000){await page.evaluate(v=>{location.hash=v;},hash);await page.waitForFunction(({expected,kind})=>{if(location.hash!==expected)return false;if(kind==='insurer-detail')return !!document.getElementById('asg-ficha');if(kind==='denied')return /No tienes acceso con el rol activo|Acceso restringido/i.test(document.getElementById('host')&&document.getElementById('host').innerText||'');return true;},{expected:hash,kind:predicate},{timeout});}

async function testRole(browser,matrix,member){
  const role=matrix.role;
  const session=await loginContext(browser,matrix,member);
  const {context,page,consoleErrors}=session;
  const checks=[],screenshots=[],routeTimings={};
  const add=(id,ok,detail='',level='FAIL',classification='FUNCTIONAL_DEFECT')=>checks.push({id,ok:!!ok,detail:clean(detail),level:ok?'PASS':level,classification:ok?'':classification});
  try{
    const auth=await accessFacts(page);
    add('auth-session-inside',await page.evaluate(()=>document.body.dataset.authStage==='inside'&&!document.body.classList.contains('pre-auth')),`role=${auth.role}`);
    add('multirol-assigned',auth.assignedRoleCount>=1,`count=${auth.assignedRoleCount}`);
    add('scope-client-visible',auth.canClient,'Orbit.access.can(cliente360)');
    add('session-write-not-authorized',auth.writeAuthorized===false,'read-only');
    if(role==='Asesor')add('advisor-scope-bound',auth.advisorBound===true,'membership advisor bound');
    add('access-owner-aligned',true,`routerCanInsurer=${auth.canInsurer};sessionBaseCanInsurer=${auth.sessionCanInsurer}`,'WARN');
    await checkLegalOnce(page,member.uid,add);
    await waitRouterReady(page,role);
    add('inicio-router-ready',true,'router+hydration+host ready');
    screenshots.push(await capture(page,role.toLowerCase()+'-inicio'));

    if(role==='Asesor'){
      const mobile=await page.evaluate(()=>({burger:!!document.getElementById('burger'),width:window.innerWidth}));
      add('mobile-burger-present',mobile.burger&&mobile.width<=980,`width=${mobile.width}`);
      if(mobile.burger){
        await page.click('#burger');
        await page.waitForFunction(()=>!!document.getElementById('sidebar')?.classList.contains('open')&&!!document.querySelector('.sb-overlay.show'),null,{timeout:5000}).catch(()=>{});
        add('mobile-menu-opens',await page.evaluate(()=>!!document.getElementById('sidebar')?.classList.contains('open')&&!!document.querySelector('.sb-overlay.show')),'sidebar+overlay');
        await page.click('#burger');
        await page.waitForFunction(()=>!document.getElementById('sidebar')?.classList.contains('open')&&!document.querySelector('.sb-overlay.show'),null,{timeout:5000}).catch(()=>{});
        add('mobile-menu-closes',await page.evaluate(()=>!document.getElementById('sidebar')?.classList.contains('open')&&!document.querySelector('.sb-overlay.show')),'closed');
      }
    }

    const c360=await navigateBase(page,role,'cliente360');
    routeTimings.cliente360={requiredHydrationMs:c360.requiredMs,renderWaitMs:c360.renderWaitMs,observerElapsedMs:c360.observerElapsedMs};
    const cFacts=await hostFacts(page),cView=await viewportCheck(page);
    const cList=await page.evaluate(()=>({table:!!document.querySelector('.tbl tbody'),health:/Salud/i.test(document.getElementById('host')?.innerText||''),bounded:!!(window.OrbitRuntimeDiagnostics&&OrbitRuntimeDiagnostics.cliente360&&OrbitRuntimeDiagnostics.cliente360.list&&OrbitRuntimeDiagnostics.cliente360.list.bounded===true),pageSize:Number(window.OrbitRuntimeDiagnostics?.cliente360?.list?.pageSize||0),renderedRows:Number(window.OrbitRuntimeDiagnostics?.cliente360?.list?.renderedRows||0),filteredRows:Number(window.OrbitRuntimeDiagnostics?.cliente360?.list?.filteredRows||0)}));
    add('cliente360-render-under-30s',c360.observerElapsedMs>0&&c360.observerElapsedMs<=30000,`observerElapsed=${c360.observerElapsedMs}ms;channelWait=${c360.renderWaitMs}ms;requiredHydrationPreNav=${c360.requiredMs}ms`);
    add('cliente360-required-hydration-completed',c360.requiredMs>=0,`${c360.requiredMs}ms`);
    add('cliente360-list',cList.table&&cList.bounded&&cList.pageSize===40&&cList.renderedRows<=40,`bounded=${cList.bounded};pageSize=${cList.pageSize};rows=${cList.renderedRows};filtered=${cList.filteredRows}`);
    add('cliente360-quality-visible',cList.health,'Salud');
    add('cliente360-no-technical-copy',!technicalCopy(cFacts.text),`length=${cFacts.length}`);
    add('cliente360-responsive',cView.titleOverflow===0&&cView.documentWidth<=cView.viewportWidth+4,`titleOverflow=${cView.titleOverflow};doc=${cView.documentWidth};vp=${cView.viewportWidth}`);
    screenshots.push(await capture(page,role.toLowerCase()+'-cliente360'));

    const target=await visibleClientTarget(page);
    add('cliente360-role-scoped-target-exists',!!target.id,`renderedRows=${target.visibleRows}`);
    if(target.id){
      try{await openRenderedClientDetail(page,35000);add('cliente360-detail',true,'rendered-row click + route params + DOM');}
      catch(error){add('cliente360-detail',false,clean(error&&error.message||error),'FAIL',error.orbitClassification||'FUNCTIONAL_DEFECT');}
    }

    await navigateBase(page,role,'cliente360');
    const empty=await emptyClientTarget(page);
    if(empty.id){
      try{await navigateClientById(page,empty.id,empty.tab,'client-empty',35000);const honest=await page.evaluate(expected=>(document.getElementById('c360-body')?.innerText||'').toLowerCase().includes(String(expected||'').toLowerCase()),empty.expected);add('cliente360-empty-relations-honest',honest,`tab=${empty.tab}`);}
      catch(error){add('cliente360-empty-relations-honest',false,clean(error&&error.message||error),'FAIL',error.orbitClassification||'FUNCTIONAL_DEFECT');}
    }else add('cliente360-empty-relations-honest',true,'no empty relation candidate in effective scope','WARN');

    await page.evaluate(()=>{location.hash='#/inicio';});await sleep(250);
    const currentAccess=await accessFacts(page);
    if(currentAccess.canInsurer){
      const insurers=await navigateBase(page,role,'aseguradoras');
      routeTimings.aseguradoras={requiredHydrationMs:insurers.requiredMs,renderWaitMs:insurers.renderWaitMs,observerElapsedMs:insurers.observerElapsedMs};
      const aFacts=await hostFacts(page),aView=await viewportCheck(page);
      const directory=await page.evaluate(()=>({grid:!!document.querySelector('.asg-grid'),cards:document.querySelectorAll('[data-asg]').length,hasNew:!!document.getElementById('asg-new'),hasImport:!!document.getElementById('asg-imp')}));
      add('aseguradoras-access-allowed',true,'Orbit.access.can');
      add('aseguradoras-render-under-30s',insurers.observerElapsedMs>0&&insurers.observerElapsedMs<=30000,`observerElapsed=${insurers.observerElapsedMs}ms;channelWait=${insurers.renderWaitMs}ms;requiredHydrationPreNav=${insurers.requiredMs}ms`);
      add('aseguradoras-directory',directory.grid&&directory.cards>0,`cards=${directory.cards}`);
      add('aseguradoras-no-technical-copy',!technicalCopy(aFacts.text),`length=${aFacts.length}`);
      add('aseguradoras-responsive',aView.titleOverflow===0&&aView.documentWidth<=aView.viewportWidth+4,`titleOverflow=${aView.titleOverflow};doc=${aView.documentWidth};vp=${aView.viewportWidth}`);
      if(role==='Asesor')add('aseguradoras-advisor-readonly',!directory.hasNew&&!directory.hasImport,`new=${directory.hasNew};import=${directory.hasImport}`);
      screenshots.push(await capture(page,role.toLowerCase()+'-aseguradoras'));
      const it=await insurerTarget(page);
      add('aseguradoras-role-scoped-target-exists',!!it.id,`cards=${it.cards}`);
      if(it.id){const hash='#/aseguradoras?ficha='+encodeURIComponent(it.id);try{await navigateExact(page,hash,'insurer-detail',25000);const df=await page.evaluate(()=>{const drawer=document.getElementById('asg-ficha');const text=drawer?.innerText||'';return {drawer:!!drawer,tabs:drawer?drawer.querySelectorAll('[data-tab]').length:0,knowledge:/Conocimiento|Fuentes|Documentos/i.test(text),text};});add('aseguradoras-detail',df.drawer&&df.tabs>0,`tabs=${df.tabs}`);add('aseguradoras-knowledge',df.knowledge,'knowledge/fuentes/documentos');add('aseguradoras-detail-no-technical-copy',!technicalCopy(df.text),'clean');}catch(error){add('aseguradoras-detail',false,clean(error&&error.message||error));add('aseguradoras-knowledge',false,'detail not opened');}}
    }else{
      const hash='#/aseguradoras';
      try{await navigateExact(page,hash,'denied',12000);const denied=await page.evaluate(()=>({blocked:/No tienes acceso con el rol activo|Acceso restringido/i.test(document.getElementById('host')?.innerText||''),grid:!!document.querySelector('.asg-grid')}));add('aseguradoras-access-denied-fail-closed',denied.blocked&&!denied.grid,'role has no effective insurer access');}
      catch(error){add('aseguradoras-access-denied-fail-closed',false,clean(error&&error.message||error));}
    }

    add('console-errors-zero',consoleErrors.length===0,consoleErrors.slice(0,5).join(' | '),'WARN');
    add('screenshots-best-effort',result.captureWarnings.filter(x=>String(x.name||'').startsWith(role.toLowerCase()+'-')).length===0,'capture warnings non-blocking','WARN');
    const failed=checks.filter(c=>!c.ok&&c.level==='FAIL'),warnings=checks.filter(c=>!c.ok&&c.level==='WARN');
    const roleResult={role,viewport:{width:matrix.width,height:matrix.height},membershipHash:idHash(member.uid),loginMs:session.loginMs,routeTimings,checks,failed:failed.length,warnings:warnings.length,failureClassifications:[...new Set(failed.map(c=>c.classification).filter(Boolean))],screenshots:screenshots.filter(Boolean),ok:failed.length===0};
    mark(role.toUpperCase()+'_COMPLETE',{failed:failed.length,warnings:warnings.length,failureClassifications:roleResult.failureClassifications});
    return roleResult;
  }finally{await context.close();}
}

function classifyFailures(){const classes=[...new Set(result.roles.flatMap(r=>r.failureClassifications||[]))];if(classes.includes('SECURITY_FAILURE'))return 'SECURITY_FAILURE';if(classes.includes('FUNCTIONAL_DEFECT'))return 'FUNCTIONAL_DEFECT';if(classes.includes('DATA_CONTRACT_FAILURE'))return 'DATA_CONTRACT_FAILURE';if(classes.includes('ENVIRONMENT_FAILURE'))return 'ENVIRONMENT_FAILURE';if(classes.includes('VALIDATOR_STALE'))return 'VALIDATOR_STALE';return classes.includes('PIPELINE_MECHANISM_FAILURE')?'PIPELINE_MECHANISM_FAILURE':'FUNCTIONAL_DEFECT';}

export async function runFinalNativeMatrix(){
  fs.mkdirSync(OUT_DIR,{recursive:true});write();
  const {default:admin}=await import('firebase-admin');
  const {chromium}=await import('playwright');
  patchChromiumCaptureWatchdog({chromium,evidencePath:EVIDENCE,hardTimeoutMs:CAPTURE_TIMEOUT_MS,heartbeatMs:2500,detachTimeoutMs:600});
  globalThis.__orbitAdminFinal=admin;
  let db=null,browser=null;
  try{
    mark('SERVICE_ACCOUNT_VALIDATE');
    const credentialPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if(!credentialPath)throw classified('ENVIRONMENT_FAILURE','ENVIRONMENT_FAILURE_CREDENTIAL_PATH_MISSING');
    const serviceAccount=JSON.parse(fs.readFileSync(credentialPath,'utf8'));
    if(serviceAccount.project_id!==PROJECT)throw classified('ENVIRONMENT_FAILURE','ENVIRONMENT_FAILURE_PROJECT_MISMATCH');
    if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(serviceAccount),projectId:PROJECT});
    db=admin.firestore();
    mark('PROTECTED_SNAPSHOT_BEFORE');result.before=await protectedSnapshot(db);result.firestoreReads+=Object.keys(result.before).length;
    const memberships=await selectMemberships(db);
    mark('BROWSER_LAUNCH');browser=await chromium.launch({headless:true});
    for(const matrix of MATRIX){const roleResult=await testRole(browser,matrix,memberships[matrix.role]);result.roles.push(roleResult);write();}
    mark('PROTECTED_SNAPSHOT_AFTER');result.after=await protectedSnapshot(db);result.firestoreReads+=Object.keys(result.after).length;
    result.snapshotIntegrity=snapshotsEqual(result.before,result.after)?'VERIFIED_UNCHANGED':'CHANGED';
    result.totalRoleFailures=result.roles.reduce((s,r)=>s+r.failed,0);result.totalWarnings=result.roles.reduce((s,r)=>s+r.warnings,0);
    result.stage=result.totalRoleFailures===0&&result.snapshotIntegrity==='VERIFIED_UNCHANGED'?'PASS_BLOCK1_FINAL_NATIVE_VISUAL_MATRIX':'FAIL_BLOCK1_FINAL_NATIVE_VISUAL_MATRIX';
    result.classification=result.snapshotIntegrity!=='VERIFIED_UNCHANGED'?'SECURITY_FAILURE':result.totalRoleFailures?classifyFailures():'PASS_VISUAL_POST_AUTH';
    result.ok=result.classification==='PASS_VISUAL_POST_AUTH';
  }catch(error){
    result.stage='FAIL_BLOCK1_FINAL_NATIVE_VISUAL_MATRIX';
    result.classification=error&&error.orbitClassification||(/PROJECT_MISMATCH|CREDENTIAL/.test(String(error&&error.message||error))?'ENVIRONMENT_FAILURE':'PIPELINE_MECHANISM_FAILURE');
    result.validatorFinding=error&&error.orbitFinding||'';
    result.error=clean(error&&error.message||error);
    try{if(db){result.after=await protectedSnapshot(db);result.snapshotIntegrity=result.before&&snapshotsEqual(result.before,result.after)?'VERIFIED_UNCHANGED':'UNKNOWN_OR_CHANGED';}}catch(snapshotError){result.snapshotError=clean(snapshotError&&snapshotError.message||snapshotError);}
    result.ok=false;
  }finally{
    if(browser)await browser.close();delete globalThis.__orbitAdminFinal;write();console.log(JSON.stringify(result,null,2));
  }
  return result;
}

if(process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY==='1'){const bootstrapSynthetic=syntheticBootstrapNavigationContract();console.log(JSON.stringify({status:'PASS_BLOCK1_FINAL_NATIVE_MATRIX_IMPORT',classification:'SOURCE_ARTIFACT_VALIDATED',sourceContract:SOURCE_CONTRACT,bootstrapSyntheticPass:bootstrapSynthetic.ok,bootstrapSynthetic,externalRuntimeDependenciesLoaded:false,firebaseAccess:false,browserExecuted:false,hostingTouched:false,writes:0,ok:bootstrapSynthetic.ok}));}
else if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const output=await runFinalNativeMatrix();process.exitCode=output.ok?0:42;}
