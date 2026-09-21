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
const mark=(name,data={})=>console.log('B1_R10_MILESTONE='+name+' '+JSON.stringify(data));
const safe=v=>{try{return JSON.parse(JSON.stringify(v));}catch{return null;}};
const timeout=(p,label,ms)=>new Promise((resolve,reject)=>{
  const t=setTimeout(()=>reject(new Error(label)),ms);
  Promise.resolve(p).then(v=>{clearTimeout(t);resolve(v);},e=>{clearTimeout(t);reject(e);});
});

function serviceAccount(){
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
async function findActor(db,auth){
  mark('SERVER_MEMBER_SCAN_START');
  const s=await timeout(db.collection('tenants').doc(TENANT).collection('members').get(),'B1_R10_MEMBER_SCAN_TIMEOUT',20000);
  const candidates=[];
  for(const d of s.docs){
    const m=d.data()||{},rr=roles(m),rn=rr.map(roleNorm).sort();
    const active=!(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(roleNorm(m.status||m.estado||'active')));
    if(!active||rn.length!==2||rn[0]!=='asesor'||rn[1]!=='operativo')continue;
    const uid=clean(m.uid||d.id,180),advisorId=clean(m.advisorId||m.asesorId,180);if(!uid||!advisorId)continue;
    try{
      const u=await timeout(auth.getUser(uid),'B1_R10_AUTH_GET_USER_TIMEOUT',10000);
      if(!u.disabled)candidates.push({uid,advisorId,m,verified:u.emailVerified===true});
    }catch{}
  }
  mark('SERVER_MEMBER_SCAN_END',{candidateCount:candidates.length});
  need(candidates.length===1,'B1_R10_STRUCTURAL_ACTOR_CARDINALITY:'+candidates.length);
  return candidates[0];
}
async function activate(page,auth,uid){
  mark('BROWSER_ACTIVATE_START');
  const token=await timeout(auth.createCustomToken(uid,{b1R10ReadOnly:true}),'B1_R10_TOKEN_TIMEOUT',10000);
  await timeout(page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:20000}),'B1_R10_RUNTIME_WAIT_TIMEOUT',22000);
  const st=await timeout(page.evaluate(async t=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    return Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();
  },token),'B1_R10_ACTIVATE_EVAL_TIMEOUT',35000);
  need(st?.started,'B1_R10_APP_START_FAILED');
  await timeout(page.waitForFunction(()=>window.Orbit?.store?._productStatus?.().ready===true,null,{timeout:30000}),'B1_R10_STORE_READY_TIMEOUT',32000);
  mark('BROWSER_ACTIVATE_END',{started:true});
}
async function setRole(page,role){
  mark('ROLE_SWITCH_START',{role});
  const ok=await timeout(page.evaluate(r=>Orbit.session?.set?.(r),role),'B1_R10_ROLE_SET_EVAL_TIMEOUT',8000);
  need(ok===true,'B1_R10_ROLE_SET_FAILED:'+role);
  await timeout(page.waitForFunction(r=>Orbit.session?.rol?.()===r,role,{timeout:8000}),'B1_R10_ROLE_WAIT_TIMEOUT',9000);
  await page.waitForTimeout(250);
  mark('ROLE_SWITCH_END',{role});
}
async function cdpEval(cdp,label,expression,ms=8000){
  mark('CDP_START',{label,ms});
  const t0=Date.now();
  try{
    const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,timeout:ms});
    if(r.exceptionDetails)throw new Error('CDP_EXCEPTION:'+clean(r.exceptionDetails.text||r.exceptionDetails.exception?.description,1200));
    const out={ok:true,wallMs:Date.now()-t0,value:r.result?.value};
    mark('CDP_END',{label,ok:true,wallMs:out.wallMs});
    return out;
  }catch(e){
    const out={ok:false,wallMs:Date.now()-t0,error:clean(e?.message||e,1600)};
    mark('CDP_END',{label,ok:false,wallMs:out.wallMs,error:out.error});
    return out;
  }
}
const evidence={status:'RUNNING',target:TARGET,server:{},browser:{},routes:{},errors:[],writes:0};
let app,browser,context,page;
try{
  mark('START',{project:PROJECT,tenant:TENANT,target:TARGET});
  need(PROJECT&&TENANT&&TARGET,'B1_R10_ENV');
  app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'b1-r10-'+Date.now());
  const db=getFirestore(app),auth=getAuth(app),actor=await findActor(db,auth);
  evidence.server.actor={uidHash:hash(actor.uid),advisorIdHash:hash(actor.advisorId),roles:roles(actor.m),activeRole:clean(actor.m.activeRole||actor.m.rolActivo||actor.m.defaultRole||actor.m.rolDefault),countries:uniq(actor.m.countries||actor.m.paises),emailVerified:actor.verified};
  mark('ACTOR_READY',{roles:evidence.server.actor.roles,activeRole:evidence.server.actor.activeRole,countries:evidence.server.actor.countries});

  const advisorSnap=await timeout(db.collection('tenants').doc(TENANT).collection('data').doc('asesores').collection('items').doc(actor.advisorId).get(),'B1_R10_ADVISOR_READ_TIMEOUT',15000);
  const m=actor.m||{},a=advisorSnap.exists?(advisorSnap.data()||{}):{};
  evidence.server.membership={dataScopes:safe(m.dataScopes||m.scopes||m.scopeDatos||{}),modulesExtra:uniq(m.modulesExtra||m.modulosExtra),modulesRestricted:uniq(m.modulesRestricted||m.modulosRestringidos),teamId:clean(m.teamId||m.equipoId)};
  evidence.server.advisor={dataScopes:safe(a.dataScopes||a.scopes||a.scopeDatos||a.scope||a.dataScope||{}),roleVisibleAdvisorIds:safe(a.roleVisibleAdvisorIds||{}),teamId:clean(a.teamId||a.equipoId),countries:uniq(a.countries||a.paises||a.paisesAutorizados)};
  mark('SERVER_SCOPE_READY',{membership:evidence.server.membership,advisor:evidence.server.advisor});

  browser=await timeout(chromium.launch({headless:true}),'B1_R10_BROWSER_LAUNCH_TIMEOUT',20000);
  context=await browser.newContext({viewport:{width:1440,height:960}});
  page=await context.newPage();
  const consoleRows=[],pageErrors=[];
  page.on('console',m=>{const t=clean(m.text(),1200);if(/B1R10|cliente360|polizas|error|warning/i.test(t))consoleRows.push({type:m.type(),text:t,at:Date.now()});});
  page.on('pageerror',e=>pageErrors.push(clean(e?.message||e,1600)));
  mark('PAGE_GOTO_START');
  await timeout(page.goto(TARGET+'/?b1r10='+Date.now()+'#/inicio',{waitUntil:'domcontentloaded',timeout:30000}),'B1_R10_PAGE_GOTO_TIMEOUT',32000);
  mark('PAGE_GOTO_END',{hash:await page.evaluate(()=>location.hash)});
  await activate(page,auth,actor.uid);
  const cdp=await context.newCDPSession(page);

  const bootstrap=await timeout(page.evaluate(()=>({
    role:String(Orbit.session?.rol?.()||''),
    advisorId:String(Orbit.session?.asesorId?.()||''),
    accessConfig:Orbit.access?.accessConfig?.()||{},
    tenantAccess:Orbit.tenant?.get?.()?.domainConfig?.access||{},
    productUser:Orbit.auth?.productUser?{roles:Orbit.auth.productUser.roles,activeRole:Orbit.auth.productUser.activeRole,advisorId:Orbit.auth.productUser.advisorId,dataScopes:Orbit.auth.productUser.dataScopes,countries:Orbit.auth.productUser.countries}:null,
    actorAdvisor:(()=>{const x=Orbit.access?.actorAdvisor?.()||{};return{id:x.id,dataScopes:x.dataScopes,scopes:x.scopes,scope:x.scope,scopeDatos:x.scopeDatos,dataScope:x.dataScope,teamId:x.teamId||x.equipoId,roleVisibleAdvisorIds:x.roleVisibleAdvisorIds,countries:x.countries||x.paises||x.paisesAutorizados};})(),
    queryPlans:Orbit.store?._productStatus?.().queryPlans||{}
  })),'B1_R10_BOOTSTRAP_SNAPSHOT_TIMEOUT',10000);
  bootstrap.advisorId=hash(bootstrap.advisorId);
  if(bootstrap.productUser?.advisorId)bootstrap.productUser.advisorId=hash(bootstrap.productUser.advisorId);
  if(bootstrap.actorAdvisor?.id)bootstrap.actorAdvisor.id=hash(bootstrap.actorAdvisor.id);
  evidence.browser.bootstrap=bootstrap;
  mark('BOOTSTRAP_READY',{
    role:bootstrap.role,
    roleScopes:bootstrap.accessConfig?.roleScopes||bootstrap.tenantAccess?.roleScopes||{},
    memberScopes:evidence.server.membership.dataScopes,
    advisorScopes:evidence.server.advisor.dataScopes,
    queryPlanScopes:Object.fromEntries(Object.entries(bootstrap.queryPlans||{}).map(([k,v])=>[k,{scope:v?.scope,module:v?.module,constraints:v?.constraints}]))
  });

  for(const role of ['Operativo','Asesor']){
    await setRole(page,role);
    const simple=await cdpEval(cdp,'simple-'+role,`(()=>{const t=fn=>{const s=performance.now(),v=fn();return{ms:+(performance.now()-s).toFixed(2),n:Array.isArray(v)?v.length:null};};const sC=Orbit.access.scopedStore('cliente360'),sP=Orbit.access.scopedStore('polizas'),sI=Orbit.access.scopedStore('inicio');return{sessionRole:Orbit.session.rol(),scope:{inicio:Orbit.access.dataScope('inicio'),cliente360:Orbit.access.dataScope('cliente360'),polizas:Orbit.access.dataScope('polizas'),cobros:Orbit.access.dataScope('cobros')},base:{clientes:t(()=>Orbit.store.all('clientes')),polizas:t(()=>Orbit.store.all('polizas')),asesores:t(()=>Orbit.store.all('asesores'))},scoped:{cliente360:{clientes:t(()=>sC.all('clientes')),polizas:t(()=>sC.all('polizas')),asesores:t(()=>sC.all('asesores'))},polizas:{clientes:t(()=>sP.all('clientes')),polizas:t(()=>sP.all('polizas'))},inicio:{clientes:t(()=>sI.all('clientes')),polizas:t(()=>sI.all('polizas')),asesores:t(()=>sI.all('asesores'))}},queryPlans:Orbit.store._productStatus().queryPlans};})()`,8000);
    evidence.browser[role]={simple};
    if(!simple.ok)continue;

    for(const col of ['cobros','recibosEsperados','carteraPrimas','vehiculos']){
      const rel=await cdpEval(cdp,role+'-'+col,`(()=>{const s=performance.now(),v=Orbit.store.all(${JSON.stringify(col)});return{ms:+(performance.now()-s).toFixed(2),n:v.length};})()`,6000);
      evidence.browser[role][col]=rel;
    }
    const batch=await cdpEval(cdp,'batch-'+role,`(()=>{const s=performance.now(),v=Orbit.clientProjection.withReadBatch(['clientes','polizas','cobros'],x=>({clientes:x.clientes.length,polizas:x.polizas.length,cobros:x.cobros.length}));return{ms:+(performance.now()-s).toFixed(2),counts:v};})()`,8000);
    evidence.browser[role].batch=batch;
  }

  await setRole(page,'Operativo');
  await timeout(page.evaluate(()=>{
    window.__B1R10=[];
    const mark=(x,d)=>{window.__B1R10.push({x,d:d||null,t:performance.now()});console.log('B1R10:'+x,JSON.stringify(d||{}));};
    const ow=Orbit.access.withScope;Orbit.access.withScope=function(k,fn){mark('withScope:start',{k});const t=performance.now();try{return ow.call(this,k,fn);}finally{mark('withScope:end',{k,ms:performance.now()-t});}};
    const or=Orbit.modules.cliente360.render;Orbit.modules.cliente360.render=function(h){mark('cliente360:render:start');const t=performance.now();try{return or.call(this,h);}finally{mark('cliente360:render:end',{ms:performance.now()-t,diag:window.OrbitRuntimeDiagnostics?.cliente360||null});}};
    const ob=Orbit.clientProjection.withReadBatch;Orbit.clientProjection.withReadBatch=function(c,p){mark('readBatch:start',{c});const t=performance.now();try{return ob.call(this,c,p);}finally{mark('readBatch:end',{ms:performance.now()-t});}};
  }),'B1_R10_INSTRUMENT_TIMEOUT',8000);

  mark('ROUTE_CLIENTE360_START');
  const tC=Date.now();
  await timeout(page.evaluate(()=>{location.hash='#/cliente360';}),'B1_R10_SET_CLIENT_HASH_TIMEOUT',5000);
  try{await timeout(page.waitForFunction(()=>Orbit.route?.key==='cliente360'&&document.querySelector('#f-q'),null,{timeout:10000}),'B1_R10_CLIENT_ROUTE_TIMEOUT',11000);evidence.routes.cliente360={ok:true,wallMs:Date.now()-tC};}
  catch(e){evidence.routes.cliente360={ok:false,wallMs:Date.now()-tC,error:clean(e?.message||e,1200)};}
  evidence.routes.cliente360.after=await cdpEval(cdp,'client-route-after',`(()=>({hash:location.hash,route:Orbit.route?.key||'',hostText:(document.getElementById('host')?.innerText||'').slice(0,500),marks:window.__B1R10||[],runtime:window.OrbitRuntimeDiagnostics?.cliente360||null}))()`,5000);
  mark('ROUTE_CLIENTE360_END',{ok:evidence.routes.cliente360.ok,wallMs:evidence.routes.cliente360.wallMs});

  mark('ROUTE_POLIZAS_START');
  const tP=Date.now(),setPol=await cdpEval(cdp,'set-polizas',`(()=>{location.hash='#/polizas';return true;})()`,3000);
  let polRoute={set:setPol};
  if(setPol.ok){try{await timeout(page.waitForFunction(()=>Orbit.route?.key==='polizas'&&document.querySelector('#host .tbl'),null,{timeout:10000}),'B1_R10_POLIZAS_ROUTE_TIMEOUT',11000);polRoute.ok=true;polRoute.wallMs=Date.now()-tP;}catch(e){polRoute.ok=false;polRoute.wallMs=Date.now()-tP;polRoute.error=clean(e?.message||e,1200);}}
  else{polRoute.ok=false;polRoute.wallMs=Date.now()-tP;}
  polRoute.after=await cdpEval(cdp,'polizas-route-after',`(()=>({hash:location.hash,route:Orbit.route?.key||'',hostText:(document.getElementById('host')?.innerText||'').slice(0,500),marks:window.__B1R10||[]}))()`,5000);
  evidence.routes.polizas=polRoute;
  mark('ROUTE_POLIZAS_END',{ok:polRoute.ok,wallMs:polRoute.wallMs});

  evidence.browser.console=consoleRows.slice(-120);
  evidence.browser.pageErrors=pageErrors;
  evidence.status='PASS';
}catch(error){
  evidence.status='FAIL';
  evidence.errors.push(clean(error?.stack||error?.message||error,6000));
  mark('FAIL',{error:clean(error?.message||error,1800)});
}finally{
  try{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');mark('EVIDENCE_WRITTEN',{status:evidence.status});}catch(e){console.error('B1_R10_EVIDENCE_WRITE_FAIL',e);}
  try{if(context)await timeout(context.close(),'B1_R10_CONTEXT_CLOSE_TIMEOUT',5000);}catch{}
  try{if(browser)await timeout(browser.close(),'B1_R10_BROWSER_CLOSE_TIMEOUT',5000);}catch{}
  try{if(app)await timeout(deleteApp(app),'B1_R10_APP_DELETE_TIMEOUT',5000);}catch{}
}
console.log('B1_R10_READONLY_DIAGNOSTIC='+evidence.status);
console.log('B1_R10_WRITES=0');
console.log('B1_R10_SUMMARY='+JSON.stringify({server:evidence.server,bootstrap:evidence.browser.bootstrap,operativo:evidence.browser.Operativo,asesor:evidence.browser.Asesor,routes:evidence.routes,pageErrors:evidence.browser.pageErrors,errors:evidence.errors}));
if(evidence.status!=='PASS')process.exitCode=1;
