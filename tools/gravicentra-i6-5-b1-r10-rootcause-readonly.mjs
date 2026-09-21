import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const PROJECT=String(process.env.PROJECT_ID||'').trim();
const TENANT=String(process.env.TENANT_HINT||'').trim();
const TARGET=String(process.env.TARGET_URL||'').replace(/\/$/,'');
const OUT=process.env.B1_R10_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-r10-rootcause-readonly.json');
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=(v,n=500)=>String(v==null?'':v).trim().slice(0,n);
const uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,180)).filter(Boolean))];
const hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex');
const roleNorm=v=>clean(v,80).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function sa(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}
  }
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS){
    const x=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8'));
    if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;
  }
  throw new Error('B1_R10_SERVICE_ACCOUNT');
}
function roles(m){return uniq([...(m?.roles||[]),...(m?.rolesAsignados||[]),m?.role,m?.rol]).filter(Boolean);}
function safe(v){try{return JSON.parse(JSON.stringify(v));}catch{return null;}}
async function findActor(db,auth){
  const s=await db.collection('tenants').doc(TENANT).collection('members').get(),c=[];
  for(const d of s.docs){
    const m=d.data()||{},rr=roles(m),rn=rr.map(roleNorm).sort();
    const active=!(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(roleNorm(m.status||m.estado||'active')));
    if(!active||rn.length!==2||rn[0]!=='asesor'||rn[1]!=='operativo')continue;
    const uid=clean(m.uid||d.id,180),advisorId=clean(m.advisorId||m.asesorId,180);if(!uid||!advisorId)continue;
    try{const u=await auth.getUser(uid);if(!u.disabled)c.push({uid,advisorId,m,verified:u.emailVerified===true});}catch{}
  }
  need(c.length===1,'B1_R10_STRUCTURAL_ACTOR_CARDINALITY:'+c.length);
  return c[0];
}
async function activate(page,auth,uid){
  const token=await auth.createCustomToken(uid,{b1R10ReadOnly:true});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:20000});
  const st=await page.evaluate(async t=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    return Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();
  },token);
  need(st?.started,'B1_R10_APP_START_FAILED');
  await page.waitForFunction(()=>window.Orbit?.store?._productStatus?.().ready===true,null,{timeout:30000});
}
async function setRole(page,role){
  const ok=await page.evaluate(r=>Orbit.session?.set?.(r),role);
  need(ok===true,'B1_R10_ROLE_SET_FAILED:'+role);
  await page.waitForFunction(r=>Orbit.session?.rol?.()===r,role,{timeout:8000});
  await page.waitForTimeout(350);
}
async function cdpEval(cdp,expression,timeout=12000){
  const t0=Date.now();
  try{
    const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,timeout});
    if(r.exceptionDetails)throw new Error('CDP_EXCEPTION:'+clean(r.exceptionDetails.text||r.exceptionDetails.exception?.description,1200));
    return {ok:true,wallMs:Date.now()-t0,value:r.result?.value};
  }catch(e){return{ok:false,wallMs:Date.now()-t0,error:clean(e?.message||e,1600)};}
}
const evidence={status:'RUNNING',target:TARGET,server:{},browser:{},routes:{},errors:[],writes:0};
let app,browser,context,page;
try{
  need(PROJECT&&TENANT&&TARGET,'B1_R10_ENV');
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b1-r10-'+Date.now());
  const db=getFirestore(app),auth=getAuth(app),actor=await findActor(db,auth);
  const advisorSnap=await db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items').doc(actor.advisorId).get();
  const m=actor.m||{},a=advisorSnap.exists?(advisorSnap.data()||{}):{};
  evidence.server.actor={uidHash:hash(actor.uid),advisorIdHash:hash(actor.advisorId),roles:roles(m),activeRole:clean(m.activeRole||m.rolActivo||m.defaultRole||m.rolDefault),countries:uniq(m.countries||m.paises),emailVerified:actor.verified};
  evidence.server.membership={dataScopes:safe(m.dataScopes||m.scopes||m.scopeDatos||{}),modulesExtra:uniq(m.modulesExtra||m.modulosExtra),modulesRestricted:uniq(m.modulesRestricted||m.modulosRestringidos),teamId:clean(m.teamId||m.equipoId)};
  evidence.server.advisor={dataScopes:safe(a.dataScopes||a.scopes||a.scopeDatos||a.scope||a.dataScope||{}),roleVisibleAdvisorIds:safe(a.roleVisibleAdvisorIds||{}),teamId:clean(a.teamId||a.equipoId),countries:uniq(a.countries||a.paises||a.paisesAutorizados)};

  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport:{width:1440,height:960}});
  page=await context.newPage();
  const consoleRows=[],pageErrors=[];
  page.on('console',m=>{const t=clean(m.text(),1200);if(/B1R10|cliente360|polizas|error|warning/i.test(t))consoleRows.push({type:m.type(),text:t,at:Date.now()});});
  page.on('pageerror',e=>pageErrors.push(clean(e?.message||e,1600)));
  await page.goto(TARGET+'/?b1r10='+Date.now()+'#/inicio',{waitUntil:'domcontentloaded',timeout:30000});
  await activate(page,auth,actor.uid);
  const cdp=await context.newCDPSession(page);

  const config=await page.evaluate(()=>({
    role:String(Orbit.session?.rol?.()||''),
    advisorId:String(Orbit.session?.asesorId?.()||''),
    accessConfig:Orbit.access?.accessConfig?.()||{},
    tenant:Orbit.tenant?.get?.()||{},
    productUser:Orbit.auth?.productUser?{roles:Orbit.auth.productUser.roles,activeRole:Orbit.auth.productUser.activeRole,advisorId:Orbit.auth.productUser.advisorId,dataScopes:Orbit.auth.productUser.dataScopes,countries:Orbit.auth.productUser.countries}:null,
    actorAdvisor:(()=>{const x=Orbit.access?.actorAdvisor?.()||{};return{id:x.id,dataScopes:x.dataScopes,scopes:x.scopes,scope:x.scope,scopeDatos:x.scopeDatos,dataScope:x.dataScope,teamId:x.teamId||x.equipoId,roleVisibleAdvisorIds:x.roleVisibleAdvisorIds,countries:x.countries||x.paises||x.paisesAutorizados};})(),
    queryPlans:Orbit.store?._productStatus?.().queryPlans||{}
  }));
  config.advisorId=hash(config.advisorId);
  if(config.productUser?.advisorId)config.productUser.advisorId=hash(config.productUser.advisorId);
  if(config.actorAdvisor?.id)config.actorAdvisor.id=hash(config.actorAdvisor.id);
  evidence.browser.bootstrap=config;

  const expr=role=>`(()=>{const cols=['clientes','polizas','cobros','recibosEsperados','carteraPrimas','vehiculos','asesores'];const timed=fn=>{const t=performance.now(),v=fn();return{ms:+(performance.now()-t).toFixed(2),n:Array.isArray(v)?v.length:null};};const base={},ci={},pi={},ii={};for(const c of cols){base[c]=timed(()=>Orbit.store.all(c));ci[c]=timed(()=>Orbit.access.scopedStore('cliente360').all(c));pi[c]=timed(()=>Orbit.access.scopedStore('polizas').all(c));ii[c]=timed(()=>Orbit.access.scopedStore('inicio').all(c));}const bt=timed(()=>Orbit.clientProjection.withReadBatch(['clientes','polizas','cobros'],s=>[s.clientes.length,s.polizas.length,s.cobros.length]));return{role:${JSON.stringify(role)},sessionRole:Orbit.session.rol(),scope:{inicio:Orbit.access.dataScope('inicio'),cliente360:Orbit.access.dataScope('cliente360'),polizas:Orbit.access.dataScope('polizas'),cobros:Orbit.access.dataScope('cobros')},base,scopedCliente360:ci,scopedPolizas:pi,scopedInicio:ii,batch:bt,queryPlans:Orbit.store._productStatus().queryPlans};})()`;
  for(const role of ['Operativo','Asesor']){
    await setRole(page,role);
    const s=await cdpEval(cdp,expr(role),15000);
    evidence.browser[role]=s;
    need(s.ok,'B1_R10_SNAPSHOT_TIMEOUT_'+role+':'+s.error);
  }

  await setRole(page,'Operativo');
  await page.evaluate(()=>{
    window.__B1R10=[];
    const mark=(x,d)=>{window.__B1R10.push({x,d:d||null,t:performance.now()});console.log('B1R10:'+x,JSON.stringify(d||{}));};
    const ow=Orbit.access.withScope;Orbit.access.withScope=function(k,fn){mark('withScope:start',{k});const t=performance.now();try{return ow.call(this,k,fn);}finally{mark('withScope:end',{k,ms:performance.now()-t});}};
    const or=Orbit.modules.cliente360.render;Orbit.modules.cliente360.render=function(h){mark('cliente360:render:start');const t=performance.now();try{return or.call(this,h);}finally{mark('cliente360:render:end',{ms:performance.now()-t,diag:window.OrbitRuntimeDiagnostics?.cliente360||null});}};
    const ob=Orbit.clientProjection.withReadBatch;Orbit.clientProjection.withReadBatch=function(c,p){mark('readBatch:start',{c});const t=performance.now();try{return ob.call(this,c,p);}finally{mark('readBatch:end',{ms:performance.now()-t});}};
  });
  const tC=Date.now();
  await page.evaluate(()=>{location.hash='#/cliente360';});
  let clientRoute;
  try{await page.waitForFunction(()=>Orbit.route?.key==='cliente360'&&document.querySelector('#f-q'),null,{timeout:12000});clientRoute={ok:true,wallMs:Date.now()-tC};}
  catch(e){clientRoute={ok:false,wallMs:Date.now()-tC,error:clean(e?.message||e,1200)};}
  evidence.routes.cliente360={...clientRoute,after:await cdpEval(cdp,`(()=>({hash:location.hash,route:Orbit.route?.key||'',hostText:(document.getElementById('host')?.innerText||'').slice(0,500),marks:window.__B1R10||[],runtime:window.OrbitRuntimeDiagnostics?.cliente360||null}))()`,5000)};

  const tP=Date.now(),setPol=await cdpEval(cdp,`(()=>{location.hash='#/polizas';return true;})()`,3000);let polRoute={set:setPol};
  if(setPol.ok){try{await page.waitForFunction(()=>Orbit.route?.key==='polizas'&&document.querySelector('#host .tbl'),null,{timeout:12000});polRoute.ok=true;polRoute.wallMs=Date.now()-tP;}catch(e){polRoute.ok=false;polRoute.wallMs=Date.now()-tP;polRoute.error=clean(e?.message||e,1200);}}
  else{polRoute.ok=false;polRoute.wallMs=Date.now()-tP;}
  polRoute.after=await cdpEval(cdp,`(()=>({hash:location.hash,route:Orbit.route?.key||'',hostText:(document.getElementById('host')?.innerText||'').slice(0,500),marks:window.__B1R10||[]}))()`,5000);
  evidence.routes.polizas=polRoute;evidence.browser.console=consoleRows.slice(-120);evidence.browser.pageErrors=pageErrors;evidence.status='PASS';
}catch(error){evidence.status='FAIL';evidence.errors.push(clean(error?.stack||error?.message||error,6000));throw error;}
finally{
  try{if(context)await context.close();}catch{}
  try{if(browser)await browser.close();}catch{}
  try{if(app)await deleteApp(app);}catch{}
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
}
console.log('B1_R10_READONLY_DIAGNOSTIC='+evidence.status);
console.log('B1_R10_WRITES=0');
console.log('B1_R10_SUMMARY='+JSON.stringify({server:evidence.server,bootstrap:evidence.browser.bootstrap,operativo:evidence.browser.Operativo,asesor:evidence.browser.Asesor,routes:evidence.routes,pageErrors:evidence.browser.pageErrors}));
