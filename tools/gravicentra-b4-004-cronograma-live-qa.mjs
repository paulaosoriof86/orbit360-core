import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B4_LIVE_URL||'https://ays-orbit-360-lab.web.app').replace(/\/$/,'');
const outPath=process.env.B4_004_CRONOGRAMA_OUT||'/tmp/b4-004-cronograma-live.json';
const run=String(process.env.GITHUB_RUN_ID||'')+'_'+String(process.env.GITHUB_RUN_ATTEMPT||'1');
const need=(v,c)=>{if(!v)throw Error('CRONO_QA_'+c);};
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
const digest=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(stable(v))).digest('hex');
need(/^[0-9]+_[0-9]+$/.test(run),'RUN_ID');
need(target==='https://ays-orbit-360-lab.web.app','LIVE_ORIGIN');

const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);
const ref=(c,id)=>tenant.collection('data').doc(c).collection('items').doc(id);
const plan={collection:'tareas',id:'b4004qa_cronograma_'+run,title:'B4-004 Cronograma LIVE '+run,date:new Date().toISOString().slice(0,10)};
const proof={schema:'GRAVICENTRA_B4_004_CRONOGRAMA_FOCAL_LIVE_QA_V1',status:'INIT',runId:run,target,plan,assertions:{},errors:[],pageErrorCount:0,consoleErrorCount:0,httpErrorCount:0,syntheticWrites:0,cleanupWrites:0,syntheticFinalAbsent:false,authAccountsCreated:0,membershipWrites:0,productSourceChanged:false,backendChanged:false};

function rolesOf(m){return [...new Set([m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol].concat(m.roles||[],m.assignedRoles||[],m.rolesAsignados||[]).map(norm).filter(Boolean))];}
function countriesOf(m){return [...new Set([].concat(m.countries||[],m.paises||[],m.paisesAutorizados||[],m.paisDefault||[],m.pais||[]).map(x=>clean(x).toUpperCase()).filter(x=>x==='GT'||x==='CO'))];}
function activeMember(m){if(!m||m.active===false||m.activo===false||m.inactivo===true)return false;const states=[m.status,m.estado].map(norm).filter(Boolean);return !states.length||states.every(x=>x==='active'||x==='activo');}
function scopeOf(m,role){
 const map=x=>{x=norm(x);if(['own','propios','propio','mios'].includes(x))return'own';if(['team','equipo'].includes(x))return'team';if(['all','todos','global'].includes(x))return'all';if(['none','ninguno','sin_acceso','sinacceso'].includes(x))return'none';return'';};
 const ds=m.dataScopes&&typeof m.dataScopes==='object'?m.dataScopes:{},mods=ds.modules&&typeof ds.modules==='object'?ds.modules:{};
 const key=Object.keys(mods).find(k=>['ops','gestiones'].includes(norm(k)));
 const explicit=map(key?mods[key]:(ds.default||m.scopeDatos||m.dataScope));if(explicit)return explicit;
 const r=norm(role);if(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo','finanzas','finance'].includes(r))return'all';if(['marketing','asistente'].includes(r))return'team';if(r.includes('asesor')||r==='comercial')return'own';return'none';
}
async function actorInventory(){
 const snap=await tenant.collection('members').get(),out=[];
 for(const d of snap.docs){
  const m=d.data()||{};if(!activeMember(m)||clean(m.tenantId)!==tenantId)continue;
  let u;try{u=await auth.getUser(d.id);}catch{continue;}if(u.disabled||u.emailVerified!==true)continue;
  const roles=rolesOf(m),countries=countriesOf(m),advisorId=clean(m.advisorId||m.asesorId);
  for(const role of roles)out.push({uid:u.uid,email:clean(u.email),activeRole:role,countries,advisorId,scope:scopeOf(m,role)});
 }
 return out;
}
export function pickActors(rows){
 const supported=['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo','asesor','comercial'];
 for(const country of ['GT','CO']){
  const creators=rows.filter(x=>x.countries.includes(country)&&x.advisorId&&x.scope==='all'&&['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'].includes(x.activeRole));
  for(const creator of creators){
   const peers=rows.filter(x=>x.uid!==creator.uid&&x.countries.includes(country)&&supported.includes(x.activeRole)&&(
    x.scope==='all'||(x.scope==='own'&&x.advisorId&&x.advisorId!==creator.advisorId)
   ));
   for(const peer of peers){
    const otherCountry=country==='GT'?'CO':'GT';
    const countryActor=peer.countries.includes(otherCountry)?peer:rows.find(x=>x.uid!==creator.uid&&x.countries.includes(otherCountry)&&supported.includes(x.activeRole)&&x.scope!=='none');
    if(countryActor)return{creator,peer,countryActor,country,otherCountry,peerShouldSee:peer.scope==='all'};
   }
  }
 }
 throw Error('CRONO_QA_DISTINCT_UID_SCOPE_PAIR_UNAVAILABLE');
}
async function applyLegal(page,actor){
 const scope='user:'+clean(actor.email||actor.uid);
 await page.addInitScript(({scope})=>{try{localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));}catch{}},{scope});
}
async function boot(page,actor,country){
 const token=await auth.createCustomToken(actor.uid);
 await applyLegal(page,actor);
 await page.goto(target+'/#/cronograma',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
 const state=await page.evaluate(async token=>{
  const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
  let s=Orbit.productAppP0.status?.(),last='';
  for(let i=0;i<6&&!s?.started;i++){try{s=await Promise.resolve(Orbit.productAppP0.activate());last='';}catch(e){last=String(e&&e.message||e);if(!/PRODUCT_(?:READONLY_BOOTSTRAP_NOT_READY|STORE_NOT_READY)/.test(last))throw e;await new Promise(r=>setTimeout(r,500*(i+1)));}}
  return{uid:String(c.auth.currentUser?.uid||''),started:s?.started===true,last};
 },token);
 need(state.uid===actor.uid&&state.started,'PRODUCT_BOOT');
 need(await page.evaluate(role=>Orbit.session.set(role)===true,actor.activeRole),'ROLE_SELECTION');
 const sel=page.locator('#pais-sel');need(await sel.count(),'COUNTRY_SELECTOR');await sel.selectOption(country);await page.waitForFunction(c=>Orbit.pais===c,country,{timeout:20000});
 await page.evaluate(()=>{if(!Orbit.store||typeof Orbit.store._ensureCollections!=='function')throw Error('STORE_COLLECTION_BINDING');Orbit.store._ensureCollections(['tareas','gestiones','clientes','polizas','recibosEsperados','carteraPrimas']);});
 await page.waitForTimeout(1000);await page.evaluate(()=>{location.hash='#/cronograma';});
 await page.locator('[data-cronograma-ready="1"]').waitFor({state:'visible',timeout:30000});
 return page;
}
export function installCronogramaQaAdapter(config){
 const S=globalThis.Orbit&&Orbit.store;if(!S||S.__productOperationalWriteP0!==true||globalThis.__giCronoQa)throw Error('CRONO_QA_ADAPTER_CONTEXT');
 const copy=v=>JSON.parse(JSON.stringify(v)),origInsert=S.insertDurable.bind(S),origUpdate=S.updateDurable.bind(S),records=[];let inserted=false,updated=false;
 S.insertDurable=async function(collection,row){
  if(collection!=='tareas'||inserted||!row||!/^tk[0-9]+$/.test(String(row.id||''))||row.done!==false)throw Error('CRONO_QA_INSERT_NOT_DECLARED');
  const before=copy(row);row.id=config.id;row.__syntheticQa=true;inserted=true;const result=await origInsert(collection,row);records.push({action:'insert',before,after:copy(row)});return result;
 };
 S.updateDurable=async function(collection,id,patch){
  if(collection!=='tareas'||id!==config.id||updated||!patch||Object.keys(patch).length!==1||typeof patch.done!=='boolean')throw Error('CRONO_QA_UPDATE_NOT_DECLARED');
  updated=true;const before=copy(patch),result=await origUpdate(collection,id,patch);records.push({action:'update',before,after:copy(patch)});return result;
 };
 globalThis.__giCronoQa={snapshot:()=>copy({inserted,updated,records}),restore:()=>{S.insertDurable=origInsert;S.updateDurable=origUpdate;delete globalThis.__giCronoQa;}};
 return{installed:true};
}
async function waitTask(test){
 for(let i=0;i<60;i++){const s=await ref('tareas',plan.id).get();if(s.exists&&test(s.data()||{}))return s.data();await new Promise(r=>setTimeout(r,400));}
 throw Error('CRONO_QA_TASK_READBACK_TIMEOUT');
}
function recordBrowser(page,label){
 page.on('pageerror',e=>{proof.pageErrorCount++;proof.errors.push({code:'PAGE_ERROR',label,messageSha256:digest(String(e&&e.message||e))});});
 page.on('console',m=>{if(m.type()==='error'){proof.consoleErrorCount++;proof.errors.push({code:'CONSOLE_ERROR',label,messageSha256:digest(m.text())});}});
 page.on('response',r=>{if(r.status()>=400){proof.httpErrorCount++;proof.errors.push({code:'HTTP_ERROR',label,status:r.status(),urlSha256:digest(r.url())});}});
}
async function readVisibility(browser,actor,country,label){
 const ctx=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:false,serviceWorkers:'block'}),page=await ctx.newPage();recordBrowser(page,label);
 try{
  await boot(page,actor,country);await page.locator('[data-v="dia"]').click();await page.waitForTimeout(500);
  const state=await page.evaluate(({id,title})=>({storePresent:!!Orbit.store.get('tareas',id),textPresent:(document.body.textContent||'').includes(title),pais:Orbit.pais,role:Orbit.session.rol()}),plan);
  return state;
 }finally{await ctx.close();}
}
async function execute(){
 let browser,ctx,page,actors,calls=[],adapterSnapshot=null;
 try{
  const build=await (await fetch(target+'/__recovery__/build.json',{cache:'no-store'})).json();
  need(build.sourceSha===process.env.SOURCE_SHA&&build.buildId===process.env.BUILD_ID,'LIVE_BUILD');
  proof.release={sourceSha:build.sourceSha,buildId:build.buildId,liveVersionName:process.env.LIVE_VERSION};proof.assertions.exactLiveBuild=true;
  const inventory=await actorInventory();proof.actorInventory=inventory.map(x=>({uidSha256:digest(x.uid),role:x.activeRole,countries:x.countries,scope:x.scope,hasAdvisorId:!!x.advisorId}));actors=pickActors(inventory);proof.actors={creator:{uidSha256:digest(actors.creator.uid),role:actors.creator.activeRole,countries:actors.creator.countries,scope:actors.creator.scope,country:actors.country},peer:{uidSha256:digest(actors.peer.uid),role:actors.peer.activeRole,countries:actors.peer.countries,scope:actors.peer.scope,expectedVisible:actors.peerShouldSee},countryActor:{uidSha256:digest(actors.countryActor.uid),role:actors.countryActor.activeRole,countries:actors.countryActor.countries,scope:actors.countryActor.scope,country:actors.otherCountry}};
  browser=await chromium.launch({headless:true});ctx=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:false,serviceWorkers:'block'});page=await ctx.newPage();recordBrowser(page,'direction');
  await ctx.route(/orbit360ProductOperationalCommand$/,async route=>{
   const req=route.request();if(req.method()==='OPTIONS'){await route.continue();return;}
   try{
    const input=req.postDataJSON()?.data,m=input?.mutations?.[0];
    need(input?.tenantId===tenantId&&norm(input.activeRole)===norm(actors.creator.activeRole)&&Array.isArray(input.mutations)&&input.mutations.length===1,'WRITE_ENVELOPE');
    need(m&&m.collection==='tareas'&&m.id===plan.id&&['insert','update'].includes(m.action)&&m.payload?.id===plan.id&&m.payload.__syntheticQa===true&&m.payload.pais===actors.country&&m.payload.asesorId===actors.creator.advisorId,'WRITE_TARGET');
    if(m.action==='insert')need(m.payload.done===false&&m.payload.t===plan.title&&m.payload.fecha===plan.date,'INSERT_PAYLOAD');else need(m.payload.done===true,'UPDATE_PAYLOAD');
    need(calls.length<2,'WRITE_COUNT');calls.push({input,response:null});await route.continue();
   }catch(e){proof.errors.push({code:String(e&&e.message||e)});await route.abort('blockedbyclient');}
  });
  page.on('response',r=>{try{const u=new URL(r.url());if(u.pathname.endsWith('/orbit360ProductOperationalCommand')&&r.request().method()==='POST')calls.filter(x=>!x.response).slice(0,1).forEach(call=>Promise.resolve(r.json()).then(body=>{call.response=body.result||body.data;}).catch(()=>{}));}catch{}});
  await boot(page,actors.creator,actors.country);await page.evaluate(p=>installCronogramaQaAdapter(p),plan);
  await page.evaluate(({date,title})=>{Orbit.ui.prompt=async()=>date+' '+title;},{date:plan.date,title:plan.title});
  await page.locator('#cr-new').click();
  const created=await waitTask(x=>x.id===plan.id&&x.done===false);need(created.__syntheticQa===true&&created.ownerUid===actors.creator.uid&&created.pais===actors.country&&created.asesorId===actors.creator.advisorId&&created.t===plan.title,'CREATE_READBACK');proof.syntheticWrites++;proof.assertions.createServerReadback=true;
  adapterSnapshot=await page.evaluate(()=>__giCronoQa.snapshot());await page.reload({waitUntil:'domcontentloaded',timeout:60000});await boot(page,actors.creator,actors.country);await page.locator('[data-v="dia"]').click();await page.waitForTimeout(500);
  need(await page.evaluate(({id,title})=>!!Orbit.store.get('tareas',id)&&(document.body.textContent||'').includes(title),plan),'FIRST_RELOAD');proof.assertions.firstReload=true;
  await page.evaluate(p=>installCronogramaQaAdapter(p),plan);const chip=page.locator('.cr-ev').filter({hasText:plan.title}).first();await chip.click();
  const done=await waitTask(x=>x.done===true);need(done.id===plan.id&&done.ownerUid===actors.creator.uid,'COMPLETE_READBACK');proof.syntheticWrites++;proof.assertions.completeServerReadback=true;
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await boot(page,actors.creator,actors.country);await page.locator('[data-v="dia"]').click();await page.waitForTimeout(500);
  need(await page.evaluate(({id,title})=>{const t=Orbit.store.get('tareas',id);return !!t&&t.done===true&&(document.body.textContent||'').includes(title)&&(document.body.textContent||'').includes('✅');},plan),'SECOND_RELOAD');proof.assertions.completedReload=true;
  const peerView=await readVisibility(browser,actors.peer,actors.country,'peer-second-uid');need(peerView.storePresent===actors.peerShouldSee&&peerView.textPresent===actors.peerShouldSee,'DISTINCT_UID_SCOPE');proof.assertions.distinctUidScopeVerified=true;
  const countryView=await readVisibility(browser,actors.countryActor,actors.otherCountry,'other-country');need(countryView.storePresent===false&&countryView.textPresent===false,'COUNTRY_PARTITION');proof.assertions.crossCountryPartitionVerified=true;
  proof.scopeObservations={peerView,countryView,peerExpectedVisible:actors.peerShouldSee};
 }catch(e){proof.errors.push({code:String(e&&e.message||e).slice(0,160)});}
 finally{
  try{if(page&&!page.isClosed()&&globalThis){adapterSnapshot=adapterSnapshot||await page.evaluate(()=>globalThis.__giCronoQa?.snapshot()||null);}}catch{}
  try{
   const taskSnap=await ref('tareas',plan.id).get(),exact=[];
   if(taskSnap.exists){const row=taskSnap.data()||{};need(row.__syntheticQa===true&&row.id===plan.id&&row.ownerUid===actors?.creator?.uid,'CLEANUP_TASK_PROVENANCE');exact.push({ref:taskSnap.ref,kind:'task'});}
   for(const call of calls){
    for(let i=0;i<40&&!call.response;i++)await new Promise(r=>setTimeout(r,250));
    need(call.response?.ok===true&&call.response.serverOwned===true&&call.response.canonicalReadback===true&&call.response.requestId&&call.response.eventId,'CLEANUP_COMMAND_RESPONSE');
    const rr=tenant.collection('operationalRequests').doc(call.response.requestId),er=tenant.collection('operationalEvents').doc(call.response.eventId),[rs,es]=await Promise.all([rr.get(),er.get()]);
    need(rs.exists&&es.exists&&rs.data().status==='committed'&&es.data().actorUid===actors.creator.uid&&es.data().tenantId===tenantId&&Number(es.data().mutationCount)===1,'CLEANUP_RECEIPT_PROVENANCE');
    exact.push({ref:rr,kind:'request'},{ref:er,kind:'event'});
   }
   const uniq=new Map(exact.map(x=>[x.ref.path,x]));
   if(uniq.size){await db.runTransaction(async tx=>{const refs=[];for(const x of uniq.values()){const s=await tx.get(x.ref);need(s.exists,'CLEANUP_TARGET_MISSING');refs.push(x.ref);}for(const r of refs)tx.delete(r);});proof.cleanupWrites=uniq.size;}
   need(!(await ref('tareas',plan.id).get()).exists,'FINAL_TASK_ABSENCE');proof.syntheticFinalAbsent=true;
   if(page&&!page.isClosed()){await page.reload({waitUntil:'domcontentloaded',timeout:60000});await boot(page,actors.creator,actors.country);await page.locator('[data-v="dia"]').click();await page.waitForTimeout(500);need(await page.evaluate(({id,title})=>!Orbit.store.get('tareas',id)&&!(document.body.textContent||'').includes(title),plan),'FINAL_UI_ABSENCE');proof.assertions.cleanupFinalUiAbsence=true;}
  }catch(e){proof.errors.push({code:String(e&&e.message||e).slice(0,160)});}
  try{if(ctx)await ctx.close();if(browser)await browser.close();}catch{}
  proof.commandReceipts=calls.map(c=>({requestId:c.response?.requestId||null,eventId:c.response?.eventId||null,ok:c.response?.ok===true,canonicalReadback:c.response?.canonicalReadback===true}));
  const required=['exactLiveBuild','createServerReadback','firstReload','completeServerReadback','completedReload','distinctUidScopeVerified','crossCountryPartitionVerified','cleanupFinalUiAbsence'];
  if(proof.errors.length===0&&required.every(k=>proof.assertions[k]===true)&&proof.syntheticFinalAbsent===true&&proof.syntheticWrites===2&&proof.pageErrorCount===0&&proof.consoleErrorCount===0&&proof.httpErrorCount===0)proof.status='PASS';
  else proof.status='FAIL';
  fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
 }
 need(proof.status==='PASS','FOCAL_PROOF_FAILED');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])execute().catch(e=>{console.error(e&&e.stack||e);process.exit(1);});
