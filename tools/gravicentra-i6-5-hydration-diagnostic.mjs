import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const TARGET=String(process.env.TARGET_URL||'https://ays-orbit-360-lab.web.app').replace(/\/$/,'');
const OUT=process.env.I65_HYDRATION_DIR||path.join(process.env.RUNNER_TEMP||process.cwd(),'i65-hydration');
const clean=(v,m=240)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I65_HYDRATION_SERVICE_ACCOUNT');}
function rolesOf(m){return[...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.rolesDisponibles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[]).map(v=>clean(v)).filter(Boolean))];}
function safeMembership(m){return{roles:rolesOf(m),activeRole:clean(m?.activeRole||m?.rolActivo||''),defaultRole:clean(m?.defaultRole||m?.rolDefault||''),countries:[...new Set([].concat(m?.countries||[],m?.paises||[]).map(clean).filter(Boolean))],dataScopes:m?.dataScopes&&typeof m.dataScopes==='object'?m.dataScopes:{},modulesExtra:[...new Set([].concat(m?.modulesExtra||m?.modulosExtra||[]).map(clean).filter(Boolean))],modulesRestricted:[...new Set([].concat(m?.modulesRestricted||m?.modulosRestringidos||[]).map(clean).filter(Boolean))],status:clean(m?.status||m?.estado||'')};}
async function actor(db,auth){const snap=await db.collection('tenants').doc(TENANT).collection('members').get();for(const p of ['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'])for(const d of snap.docs){const m=d.data()||{},uid=clean(m.uid||d.id,180),role=rolesOf(m).find(r=>norm(r)===p),state=norm(m.status||m.estado||'active');if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;try{const u=await auth.getUser(uid);if(!u.disabled&&u.emailVerified===true)return{uid,chosenManagerRole:role,membership:safeMembership(m)};}catch{}}throw new Error('I65_HYDRATION_NO_MANAGER');}
function col(db,name){return db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');}
fs.mkdirSync(OUT,{recursive:true});
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'i65-hydration-diag'),auth=getAuth(app),db=getFirestore(app);
let browser;
const ev={schema:'GRAVICENTRA_I6_5_HYDRATION_DIAGNOSTIC_V1',status:'FAIL',writes:0,operationalWrites:0,containsPII:false,containsSecrets:false,target:TARGET,actor:{},direct:{},runtime:{},diagnosis:[],errors:[]};
try{
  const [r,p]=await Promise.all([col(db,'recibosEsperados').get(),col(db,'carteraPrimas').get()]);
  ev.direct={recibosEsperados:r.size,carteraPrimas:p.size};
  need(r.size===1294&&p.size===673,'I65_HYDRATION_DIRECT_SENTINEL_DRIFT:'+r.size+':'+p.size);
  const a=await actor(db,auth);ev.actor={chosenManagerRole:a.chosenManagerRole,membership:a.membership};
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errs=[];
  page.on('pageerror',e=>errs.push(clean(e?.message||e)));
  const token=await auth.createCustomToken(a.uid,{gravicentraI65Hydration:true});
  await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:15000});
  await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);if(Orbit.productAppP0.status?.().started!==true)await Orbit.productAppP0.activate();},token);
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true,null,{timeout:20000});
  await page.waitForTimeout(900);
  ev.runtime=await page.evaluate(()=>{
    const S=Orbit.store,ps=S._productStatus?S._productStatus():{},pu=Orbit.auth?.productUser||{};
    const one=n=>({all:(S.all(n)||[]).length,whereTrue:(S.where(n,()=>true)||[]).length,attached:(ps.attachedCollections||[]).includes(n),serverConfirmed:(ps.serverConfirmedCollections||[]).includes(n),denied:(ps.deniedCollections||[]).includes(n),error:(ps.snapshotErrors||{})[n]||'',queryPlan:(ps.queryPlans||{})[n]||null});
    return{productUser:{roles:pu.roles||[],activeRole:pu.activeRole||'',defaultRole:pu.defaultRole||'',countries:pu.countries||[],dataScopes:pu.dataScopes||{}},session:{active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]},receipts:one('recibosEsperados'),portfolio:one('carteraPrimas'),policies:{all:(S.all('polizas')||[]).length,whereTrue:(S.where('polizas',()=>true)||[]).length},owner:Orbit.receiptsPortfolioProjectionV920?.status?.()||null};
  });
  const rr=ev.runtime.receipts,pp=ev.runtime.portfolio;
  if(rr.denied||pp.denied)ev.diagnosis.push('QUERY_PLAN_DENIED_BY_BOOTSTRAP_ACTIVE_ROLE_OR_SCOPE');
  if(rr.serverConfirmed&&rr.whereTrue===ev.direct.recibosEsperados&&rr.all<rr.whereTrue)ev.diagnosis.push('RECEIPTS_LOGICAL_RELATION_SCOPE_FILTER_REDUCES_HYDRATED_ROWS');
  if(pp.serverConfirmed&&pp.whereTrue===ev.direct.carteraPrimas&&pp.all<pp.whereTrue)ev.diagnosis.push('PORTFOLIO_LOGICAL_RELATION_SCOPE_FILTER_REDUCES_HYDRATED_ROWS');
  if(rr.whereTrue!==rr.all||pp.whereTrue!==pp.all)ev.diagnosis.push('STORE_API_SCOPE_INCONSISTENCY_ALL_VS_WHERE');
  if(clean(ev.runtime.productUser.activeRole)!==clean(a.chosenManagerRole)&&rolesOf({roles:ev.runtime.productUser.roles}).includes(a.chosenManagerRole))ev.diagnosis.push('BOOTSTRAP_ACTIVE_ROLE_DIFFERS_SELECTED_MANAGER_ROLE');
  if((rr.whereTrue===0||pp.whereTrue===0)&&!rr.denied&&!pp.denied)ev.diagnosis.push('SNAPSHOT_OR_QUERY_HYDRATION_ZERO_DESPITE_DIRECT_DATA');
  if(!ev.diagnosis.length&&rr.all===ev.direct.recibosEsperados&&pp.all===ev.direct.carteraPrimas)ev.diagnosis.push('HYDRATION_COUNTS_MATCH_DIRECT_DATA');
  need(errs.length===0,'I65_HYDRATION_PAGE_ERRORS:'+JSON.stringify(errs.slice(0,3)));
  ev.status='PASS';
}catch(e){ev.errors.push(clean(e?.message||e));process.exitCode=1;}
finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.writeFileSync(path.join(OUT,'i65-hydration-diagnostic.json'),JSON.stringify(ev,null,2)+'\n');console.log('I65_HYDRATION_DIAGNOSTIC='+ev.status);console.log('I65_HYDRATION_DIAGNOSIS='+ev.diagnosis.join('|'));console.log('I65_HYDRATION_WRITES=0');}
