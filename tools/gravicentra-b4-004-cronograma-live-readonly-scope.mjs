import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {resolve}=require('../functions/b4-003-scoped-access-boundary.js');
const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B4_LIVE_URL||'https://ays-orbit-360-lab.web.app').replace(/\/$/,'');
const outPath=process.env.B4_004_CRONOGRAMA_READONLY_OUT||'/tmp/b4-004-cronograma-readonly-scope.json';
const run=String(process.env.GITHUB_RUN_ID||'')+'_'+String(process.env.GITHUB_RUN_ATTEMPT||'1');
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const digest=v=>createHash('sha256').update(String(v==null?'':v)).digest('hex');
const need=(v,c)=>{if(!v)throw Error('CRONO_READONLY_'+c);};
need(/^\d+_\d+$/.test(run),'RUN_ID');
need(target==='https://ays-orbit-360-lab.web.app','LIVE_ORIGIN');

const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);
const proof={
 schema:'GRAVICENTRA_B4_004_CRONOGRAMA_LIVE_READONLY_SCOPE_DIAGNOSTIC_V1',
 diagnosticStatus:'INIT',runId:run,target,
 release:{},actors:{},task:{},accessConfig:{},observations:{},
 scopedRequests:[],consoleSignals:[],pageErrors:[],requestFailures:[],
 assertions:{},errors:[],performance:{},writeAttemptCount:0,
 authAccountsCreated:0,membershipWrites:0,dataWrites:0,
 productSourceChanged:false,backendChanged:false
};

function rolesOf(m){return [...new Set([m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol].concat(m.roles||[],m.assignedRoles||[],m.rolesAsignados||[]).map(norm).filter(Boolean))];}
function countriesOf(m){return [...new Set([].concat(m.countries||[],m.paises||[],m.paisesAutorizados||[],m.paisDefault||[],m.pais||[]).map(x=>clean(x).toUpperCase()).filter(x=>x==='GT'||x==='CO'))];}
function activeMember(m){
 if(!m||m.active===false||m.activo===false||m.inactivo===true)return false;
 const states=[m.status,m.estado].map(norm).filter(Boolean);
 return !states.length||states.every(x=>x==='active'||x==='activo');
}
async function actorInventory(){
 const snap=await tenant.collection('members').get(),out=[];
 for(const d of snap.docs){
  const m=d.data()||{};if(!activeMember(m)||clean(m.tenantId)!==tenantId)continue;
  let u;try{u=await auth.getUser(d.id);}catch{continue;}
  if(u.disabled||u.emailVerified!==true)continue;
  for(const role of rolesOf(m))for(const country of countriesOf(m)){
   let ctx=null,denied='';
   try{ctx=resolve({auth:{uid:u.uid,token:{}},member:m,config:proof._accessConfig,tenantId,activeRole:role,collection:'tareas',country});}
   catch(e){denied=clean(e&&e.code||e&&e.message||e);}
   out.push({uid:u.uid,email:clean(u.email),role,country,member:m,scope:ctx&&ctx.scope||'none',advisorId:ctx&&ctx.advisorId||clean(m.advisorId||m.asesorId),denied});
  }
 }
 return out;
}
async function existingTasks(){
 const snap=await tenant.collection('data').doc('tareas').collection('items').orderBy('__name__').limit(1000).get();
 return snap.docs.map(d=>({id:d.id,row:d.data()||{}})).filter(x=>x.row.__syntheticQa!==true&&!/^b400[0-9a-z._:-]*qa/i.test(x.id));
}
function pickCase(actors,tasks){
 for(const country of ['GT','CO']){
  const countryTasks=tasks.filter(x=>clean(x.row.pais||x.row.country).toUpperCase()===country);
  const preferred=countryTasks.find(x=>!clean(x.row.polizaId||x.row.policyId||x.row.clienteId||x.row.clientId))||countryTasks[0]||null;
  const all=actors.filter(x=>x.country===country&&x.scope==='all');
  for(const creator of all)for(const peer of all){
   if(peer.uid===creator.uid)continue;
   const otherCountry=country==='GT'?'CO':'GT';
   const countryActor=actors.find(x=>x.uid===peer.uid&&x.country===otherCountry&&x.scope==='all')||
     actors.find(x=>x.uid!==creator.uid&&x.country===otherCountry&&x.scope==='all');
   if(countryActor)return{country,otherCountry,creator,peer,countryActor,task:preferred};
  }
 }
 return null;
}
async function applyLegal(page,actor){
 const scope='user:'+clean(actor.email||actor.uid);
 await page.addInitScript(({scope})=>{try{
  localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
  localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
 }catch{}},{scope});
}
function requestMeta(req){
 let body={};try{body=req.postDataJSON()||{};}catch{}
 const d=body&&body.data&&typeof body.data==='object'?body.data:{};
 return{
  collection:clean(d.collection||'polizas'),
  activeRole:norm(d.activeRole),
  country:clean(d.country).toUpperCase(),
  mode:clean(d.mode||'get'),
  pageSize:Number.isFinite(Number(d.pageSize))?Number(d.pageSize):null
 };
}
function attachTracking(page,label){
 const pending=[];
 page.on('pageerror',e=>proof.pageErrors.push({label,messageSha256:digest(String(e&&e.message||e))}));
 page.on('console',m=>{if(m.type()==='error')proof.consoleSignals.push({label,messageSha256:digest(m.text()),kind:/cors/i.test(m.text())?'CORS':/failed to load resource|net::/i.test(m.text())?'NETWORK_RESOURCE':'OTHER'});});
 page.on('requestfailed',r=>{try{const u=new URL(r.url());proof.requestFailures.push({label,host:u.hostname,path:u.pathname,failure:clean(r.failure()&&r.failure().errorText).slice(0,80)});}catch{}});
 page.on('response',r=>{
  let u;try{u=new URL(r.url());}catch{return;}
  if(!u.pathname.endsWith('/orbit360ScopedPolicyRead'))return;
  const meta=requestMeta(r.request()),status=r.status();
  const work=(async()=>{
   let reason='';
   if(status>=400){try{
    const body=await r.json();const raw=clean(body&&body.error&&(body.error.message||body.error.status)||'');
    if(/^[A-Z0-9_]{2,64}$/.test(raw))reason=raw;
   }catch{}}
   proof.scopedRequests.push(Object.assign({label,status,host:u.hostname,path:u.pathname,reason},meta));
  })();
  pending.push(work);
 });
 return{pending,async flush(){await Promise.allSettled(pending.splice(0));}};
}
async function routeTo(page,key){
 await page.evaluate(key=>{if(window.Orbit&&Orbit.router&&typeof Orbit.router.go==='function')Orbit.router.go(key);else location.hash='#/'+key;},key);
}
async function measureUsableRoute(page,key,timeout=12000){
 const started=Date.now();await routeTo(page,key);const deadline=started+timeout;let last=null;
 while(Date.now()<deadline){
  last=await page.evaluate(key=>{
   const host=document.getElementById('host'),routeKey=String(window.Orbit&&Orbit.route&&Orbit.route.key||'');
   const denied=!!document.querySelector('.modstate');
   const marker=key==='cronograma'?!!document.querySelector('[data-cronograma-ready="1"]'):false;
   return{usable:routeKey===key&&!denied&&marker,routeKey,denied,marker,hostPresent:!!host};
  },key);
  if(last&&last.usable)return{ms:Date.now()-started,state:last};
  await page.waitForTimeout(100);
 }
 return{ms:Date.now()-started,state:last,timeout:true};
}
async function boot(browser,actor,country,label){
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:false,serviceWorkers:'block'});
 await ctx.route(/orbit360ProductOperationalCommand$/,async route=>{
  if(route.request().method()==='OPTIONS'){await route.continue();return;}
  proof.writeAttemptCount++;await route.abort('blockedbyclient');
 });
 const page=await ctx.newPage(),tracker=attachTracking(page,label),token=await auth.createCustomToken(actor.uid);
 await applyLegal(page,actor);
 await page.goto(target+'/#/cronograma',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
 const state=await page.evaluate(async token=>{
  const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
  if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
  let s=Orbit.productAppP0.status?.(),last='';
  for(let i=0;i<6&&!s?.started;i++){
   try{s=await Promise.resolve(Orbit.productAppP0.activate());last='';}
   catch(e){last=String(e&&e.message||e);if(!/PRODUCT_(?:READONLY_BOOTSTRAP_NOT_READY|STORE_NOT_READY)/.test(last))throw e;await new Promise(r=>setTimeout(r,500*(i+1)));}
  }
  return{uid:String(c.auth.currentUser?.uid||''),started:s?.started===true,last};
 },token);
 need(state.uid===actor.uid&&state.started,'PRODUCT_BOOT_'+label);
 need(await page.evaluate(role=>Orbit.session.set(role)===true,actor.role),'ROLE_SELECTION_'+label);
 const sel=page.locator('#pais-sel');need(await sel.count(),'COUNTRY_SELECTOR_'+label);await sel.selectOption(country);
 await page.waitForFunction(c=>Orbit.pais===c,country,{timeout:20000});
 await page.evaluate(()=>{if(!Orbit.store||typeof Orbit.store._ensureCollections!=='function')throw Error('STORE_COLLECTION_BINDING');Orbit.store._ensureCollections(['clientes','polizas','recibosEsperados','carteraPrimas','cobros','gestiones','tareas']);});
 try{await page.waitForFunction(()=>{const s=Orbit.store?._productStatus?.()||{};return (s.serverConfirmedCollections||[]).includes('tareas')||(s.deniedCollections||[]).includes('tareas')||!!(s.snapshotErrors||{}).tareas;},null,{timeout:16000});}catch{}
 await routeTo(page,'cronograma');await page.locator('[data-cronograma-ready="1"]').waitFor({state:'visible',timeout:30000});
 await page.waitForTimeout(800);await tracker.flush();
 const product=await page.evaluate(()=>{const s=Orbit.store?._productStatus?.()||{};return{
  taskConfirmed:(s.serverConfirmedCollections||[]).includes('tareas'),
  taskDenied:(s.deniedCollections||[]).includes('tareas'),
  taskError:cleanCode((s.snapshotErrors||{}).tareas||''),
  taskCount:(Orbit.store?.all?.('tareas')||[]).length,
  routeKey:String(Orbit.route&&Orbit.route.key||'')
 };function cleanCode(v){return String(v||'').slice(0,120);}});
 return{ctx,page,tracker,product};
}
async function observe(browser,actor,country,label,taskId){
 const b=await boot(browser,actor,country,label);
 const visible=await b.page.evaluate(id=>!!Orbit.store?.get?.('tareas',id),taskId);
 await b.tracker.flush();
 return{...b,visible};
}

async function main(){
 let browser=null,opened=[];
 try{
  const build=await (await fetch(target+'/__recovery__/build.json',{cache:'no-store'})).json();
  need(build.sourceSha===process.env.SOURCE_SHA&&build.buildId===process.env.BUILD_ID,'LIVE_BUILD');
  proof.release={sourceSha:build.sourceSha,buildId:build.buildId,liveVersionName:process.env.LIVE_VERSION,artifactId:Number(process.env.ARTIFACT_ID)};
  proof.assertions.exactLiveBuild=true;
  const accessSnap=await tenant.collection('config').doc('access').get();proof._accessConfig=accessSnap.exists?(accessSnap.data()||{}):{};
  proof.accessConfig={
   present:accessSnap.exists,
   roleScopes:{
    operativo:clean(proof._accessConfig.roleScopes&&proof._accessConfig.roleScopes.operativo),
    superadmin:clean(proof._accessConfig.roleScopes&&proof._accessConfig.roleScopes.superadmin),
    direccion:clean(proof._accessConfig.roleScopes&&proof._accessConfig.roleScopes.direccion)
   },
   opsRolePermissionsPresent:!!(proof._accessConfig.rolePermissions&&Object.keys(proof._accessConfig.rolePermissions).some(k=>['operativo','superadmin','direccion'].includes(norm(k))))
  };
  const [actors,tasks]=await Promise.all([actorInventory(),existingTasks()]);
  const selected=pickCase(actors,tasks);
  proof.actorInventory=actors.map(x=>({uidSha256:digest(x.uid),role:x.role,country:x.country,scope:x.scope,denied:x.denied||'',hasAdvisorId:!!x.advisorId}));
  proof.taskInventory={count:tasks.length,byCountry:{GT:tasks.filter(x=>clean(x.row.pais||x.row.country).toUpperCase()==='GT').length,CO:tasks.filter(x=>clean(x.row.pais||x.row.country).toUpperCase()==='CO').length}};
  need(selected,'NO_DISTINCT_ALL_SCOPE_ACTORS');
  const {creator,peer,countryActor,country,otherCountry,task}=selected;
  proof.actors={
   creator:{uidSha256:digest(creator.uid),role:creator.role,country,scope:creator.scope},
   peer:{uidSha256:digest(peer.uid),role:peer.role,country,scope:peer.scope},
   countryActor:{uidSha256:digest(countryActor.uid),role:countryActor.role,country:otherCountry,scope:countryActor.scope}
  };
  proof.task=task?{idSha256:digest(task.id),country,hasAdvisorId:!!clean(task.row.asesorId||task.row.advisorId||task.row.ownerAdvisorId),standalone:!clean(task.row.polizaId||task.row.policyId||task.row.clienteId||task.row.clientId)}:{status:'NO_EXISTING_TASK_READONLY_VISIBILITY_UNPROVABLE'};
  proof.assertions.distinctUid=creator.uid!==peer.uid;
  browser=await chromium.launch({headless:true});

  const creatorObs=await observe(browser,creator,country,'creator-same-country',task?.id||null);opened.push(creatorObs.ctx);
  proof.observations.creator={visible:creatorObs.visible,product:creatorObs.product};
  proof.assertions.creatorTaskVisible=task?creatorObs.visible===true:null;

  await routeTo(creatorObs.page,'inicio');await creatorObs.page.waitForTimeout(250);
  const perf=await measureUsableRoute(creatorObs.page,'cronograma',12000);proof.performance.cronogramaMs=perf.ms;proof.performance.state=perf.state;
  proof.assertions.cronogramaPerformance=perf.timeout!==true&&perf.ms<=6000;

  const peerObs=await observe(browser,peer,country,'peer-same-country',task?.id||null);opened.push(peerObs.ctx);
  proof.observations.peer={visible:peerObs.visible,product:peerObs.product};
  proof.assertions.peerTaskVisible=task?peerObs.visible===true:null;

  const countryObs=await observe(browser,countryActor,otherCountry,'peer-other-country',task?.id||null);opened.push(countryObs.ctx);
  proof.observations.country={visible:countryObs.visible,product:countryObs.product};
  proof.assertions.crossCountryTaskAbsent=task?countryObs.visible===false:null;

  for(const item of opened){try{await item.close();}catch{}}
  opened=[];
  proof.assertions.writeAttemptZero=proof.writeAttemptCount===0;
  proof.assertions.noMutations=proof.authAccountsCreated===0&&proof.membershipWrites===0&&proof.dataWrites===0;
  proof.diagnosticStatus=task?'EXECUTED':'EXECUTED_WITH_HOLD';if(!task)proof.errors.push({code:'NO_EXISTING_TASK_VISIBILITY_NOT_CERTIFIED'});
 }catch(e){
  proof.errors.push({code:clean(e&&e.message||e).slice(0,200)});
  proof.diagnosticStatus='EXECUTED_WITH_HOLD';
 }finally{
  for(const item of opened){try{await item.close();}catch{}}
  try{if(browser)await browser.close();}catch{}
  delete proof._accessConfig;
  proof.scoped403=proof.scopedRequests.filter(x=>x.status===403);
  proof.assertions.writeAttemptZero=proof.writeAttemptCount===0;
  proof.assertions.noMutations=proof.authAccountsCreated===0&&proof.membershipWrites===0&&proof.dataWrites===0;
  fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
 }
 need(proof.assertions.exactLiveBuild===true,'EXACT_RELEASE');
 need(proof.assertions.writeAttemptZero===true,'WRITE_ATTEMPT');
 need(proof.assertions.noMutations===true,'MUTATION_BOUNDARY');
}
main().catch(e=>{console.error(e&&e.stack||e);process.exit(1);});
