import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { chromium } from 'playwright';

const PROJECT=String(process.env.PROJECT_ID||'').trim(),TENANT=String(process.env.TENANT_HINT||'').trim(),TARGET=String(process.env.TARGET_URL||'').replace(/\/$/,'');
const OUT=process.env.B1_R12_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-r12-role-route-readonly.json');
const clean=(v,n=500)=>String(v==null?'':v).trim().slice(0,n), uniq=a=>[...new Set([].concat(a||[]).map(x=>clean(x,180)).filter(Boolean))];
const rn=v=>clean(v,80).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(), hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex');
const need=(v,c)=>{if(!v)throw new Error(c);}, mark=(n,d={})=>console.log('B1_R12='+n+' '+JSON.stringify(d));
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.private_key)return x;}catch{}}throw Error('B1_R12_SA');}
function roles(m){return uniq([...(m?.roles||[]),...(m?.rolesAsignados||[]),m?.role,m?.rol]);}
async function structuralActor(db,auth){const s=await db.collection('tenants').doc(TENANT).collection('members').get(),a=[];for(const d of s.docs){const m=d.data()||{},r=roles(m).map(rn).sort(),active=!(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(rn(m.status||m.estado||'active')));if(!active||r.length!==2||r[0]!=='asesor'||r[1]!=='operativo')continue;const uid=clean(m.uid||d.id,180),advisorId=clean(m.advisorId||m.asesorId,180);if(!uid||!advisorId)continue;try{const u=await auth.getUser(uid);if(!u.disabled)a.push({uid,advisorId});}catch{}}need(a.length===1,'B1_R12_ACTOR_CARDINALITY:'+a.length);return a[0];}
async function activate(page,auth,uid){const token=await auth.createCustomToken(uid,{b1R12ReadOnly:true});await page.waitForFunction(()=>!!Orbit?.productRuntimeBrowserProvidersP0&&!!Orbit?.productAppP0,null,{timeout:20000});const st=await page.evaluate(async t=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);return Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();},token);need(st?.started,'B1_R12_APP_START');await page.waitForFunction(()=>Orbit.store?._productStatus?.().ready===true,null,{timeout:30000});}
async function setRole(page,role){const ok=await page.evaluate(r=>Orbit.session?.set?.(r),role);need(ok===true,'B1_R12_ROLE_SET_'+role);await page.waitForFunction(r=>Orbit.session?.rol?.()===r,role,{timeout:8000});await page.waitForTimeout(350);}
async function route(page,route,extra){const t=Date.now();await page.evaluate(r=>{location.hash='#/'+r;},route);await page.waitForFunction(({r,e})=>Orbit.route?.key===r&&document.querySelector('#host .page')&&!document.querySelector('#host .modstate')&&(!e||document.querySelector(e)),{r:route,e:extra||''},{timeout:8000});return Date.now()-t;}
async function snapshot(page,moduleKey){return page.evaluate(m=>{const s=Orbit.access.scopedStore(m);return{role:Orbit.session.rol(),scope:Orbit.access.dataScope(m),clientes:s.all('clientes').length,polizas:s.all('polizas').length,cobros:s.all('cobros').length,asesores:s.all('asesores').map(x=>String(x.id||'')),actor:String(Orbit.session.asesorId()||'')};},moduleKey);}
const evidence={status:'RUNNING',writes:0,routes:{},roles:{},errors:[]};let app,browser,context,page;
try{
  need(PROJECT&&TENANT&&TARGET,'B1_R12_ENV');
  app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b1-r12-'+Date.now());const db=getFirestore(app),auth=getAuth(app),actor=await structuralActor(db,auth);
  evidence.actorHash=hash(actor.uid);evidence.advisorHash=hash(actor.advisorId);
  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1440,height:960}});page=await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(clean(e?.message||e,1600)));
  await page.goto(TARGET+'/?b1r12='+Date.now()+'#/inicio',{waitUntil:'domcontentloaded',timeout:30000});await activate(page,auth,actor.uid);
  const plans=await page.evaluate(()=>Orbit.store._productStatus().queryPlans||{});
  const cPlan=plans.clientes||{},gPlan=plans.gestiones||{},pPlan=plans.polizas||{};
  const hasAdvisor=p=>(p.constraints||[]).some(x=>['advisorId','asesorId','__relation_advisor__'].includes(String(x.field||'')));
  evidence.queryPlans={clientes:{scope:cPlan.scope,constraints:cPlan.constraints},gestiones:{scope:gPlan.scope,constraints:gPlan.constraints},polizas:{scope:pPlan.scope,constraints:pPlan.constraints}};
  need(!hasAdvisor(cPlan),'B1_R12_OPERATIVO_CLIENTES_NOT_ALL');
  need(!hasAdvisor(gPlan),'B1_R12_OPERATIVO_GESTIONES_NOT_ALL');
  need(!hasAdvisor(pPlan),'B1_R12_OPERATIVO_POLIZAS_NOT_ALL');
  mark('QUERY_PLAN_PASS',{clientes:cPlan.scope,gestiones:gPlan.scope,polizas:pPlan.scope});

  await setRole(page,'Operativo');
  const op=await snapshot(page,'cliente360'); evidence.roles.operativo=op;
  evidence.routes.cliente360OperativoMs=await route(page,'cliente360','#f-q');
  evidence.routes.polizasOperativoMs=await route(page,'polizas');
  evidence.routes.cobrosOperativoMs=await route(page,'cobros');
  need(evidence.routes.cliente360OperativoMs<8000&&evidence.routes.polizasOperativoMs<8000&&evidence.routes.cobrosOperativoMs<8000,'B1_R12_ROUTE_SLOW');

  await setRole(page,'Asesor');
  const own=await snapshot(page,'cliente360'); evidence.roles.asesor=own;
  need(own.scope==='own','B1_R12_ASESOR_SCOPE_NOT_OWN:'+own.scope);
  need(own.asesores.length===1&&own.asesores[0]===own.actor,'B1_R12_ASESOR_DIRECTORY_LEAK');
  need(own.clientes<=op.clientes&&own.polizas<=op.polizas&&own.cobros<=op.cobros,'B1_R12_ASESOR_COUNTS_NOT_BOUNDED');
  evidence.routes.cliente360AsesorMs=await route(page,'cliente360','#f-q');
  evidence.routes.polizasAsesorMs=await route(page,'polizas');
  evidence.routes.cobrosAsesorMs=await route(page,'cobros');

  await setRole(page,'Operativo');
  const op2=await snapshot(page,'cliente360'); evidence.roles.operativoRestored=op2;
  need(op2.clientes===op.clientes&&op2.polizas===op.polizas&&op2.cobros===op.cobros,'B1_R12_OPERATIVO_NOT_RESTORED');

  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>Orbit.store?._productStatus?.().ready===true,null,{timeout:30000});
  evidence.afterReload=await page.evaluate(()=>({role:Orbit.session.rol(),uid:Orbit.auth?.productUser?.uid||Orbit.auth?.user?.()?.uid||''}));
  need(evidence.afterReload.role==='Operativo','B1_R12_F5_ROLE_LOST:'+evidence.afterReload.role);
  evidence.routes.cliente360AfterReloadMs=await route(page,'cliente360','#f-q');
  evidence.pageErrors=pageErrors;
  need(pageErrors.length===0,'B1_R12_PAGE_ERRORS:'+pageErrors.join('|'));
  evidence.status='PASS';
}catch(e){evidence.status='FAIL';evidence.errors.push(clean(e?.stack||e?.message||e,5000));}
finally{try{fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');}catch{}try{if(context)await context.close();}catch{}try{if(browser)await browser.close();}catch{}try{if(app)await deleteApp(app);}catch{}}
console.log('B1_R12_STATUS='+evidence.status);console.log('B1_R12_WRITES=0');console.log('B1_R12_SUMMARY='+JSON.stringify({queryPlans:evidence.queryPlans,routes:evidence.routes,roles:evidence.roles,afterReload:evidence.afterReload,pageErrors:evidence.pageErrors,errors:evidence.errors}));
if(evidence.status!=='PASS')process.exitCode=1;
