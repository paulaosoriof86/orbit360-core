import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||''),BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4A_HYDRATION_PLAN_DIR||process.env.RUNNER_TEMP||process.cwd();
const clean=v=>String(v==null?'':v).trim();
const role=v=>{const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admintenant':'AdminTenant','admin tenant':'AdminTenant','operativo':'Operativo','asesor':'Asesor'})[k]||clean(v);};
const roles=m=>[...new Set([].concat(m?.roles||m?.rolesAsignados||m?.role||m?.rol||[]).map(role).filter(Boolean))];
const active=m=>role(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||roles(m)[0]);
function sa(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('SERVICE_ACCOUNT_UNAVAILABLE');}
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'gi-i4a-hydration-plan');const auth=getAuth(app),db=getFirestore(app);
const evidence={schemaVersion:'gravicentra-i4a-hydration-plan-readonly-v1',gate:'I4A',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,productionTouched:false,dataTouched:false,writesExecuted:0,selectedRole:'',membershipScope:{},browser:{},decision:'',errors:[]};
let browser,context;
try{
  const memberships=await db.collection('tenants').doc(TENANT).collection('members').get(),users=await auth.listUsers(1000),userMap=new Map(users.users.map(u=>[u.uid,u])),pool=[];
  for(const d of memberships.docs){const m=d.data()||{},uid=clean(m.uid||d.id),u=userMap.get(uid);if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;const rs=roles(m);pool.push({uid,m,roles:rs,active:active(m)});}
  let sel=null,target='';for(const r of ['Dirección','SuperAdmin','AdminTenant','Operativo']){sel=pool.find(x=>x.active===r&&x.roles.includes(r))||pool.find(x=>x.roles.includes(r));if(sel){target=r;break;}}
  if(!sel)throw new Error('NO_PRIVILEGED_MEMBERSHIP');
  evidence.selectedRole=target;
  evidence.membershipScope={activeRole:target,roles:sel.roles,defaultScope:clean(sel.m?.dataScopes?.default||sel.m?.scopes?.default||sel.m?.defaultScope||sel.m?.dataScope||sel.m?.scope||''),moduleScopeCobros:clean(sel.m?.dataScopes?.modules?.cobros||sel.m?.scopes?.modules?.cobros||sel.m?.moduleScopes?.cobros||''),countries:[].concat(sel.m?.countries||sel.m?.paises||[]).map(clean).filter(Boolean),advisorIdPresent:!!clean(sel.m?.advisorId||sel.m?.asesorId),teamIdPresent:!!clean(sel.m?.teamId||sel.m?.equipoId)};
  const token=await auth.createCustomToken(sel.uid,{gravicentraI4AHydrationReadonly:true});
  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();page.setDefaultTimeout(12000);
  await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:7000});
  await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);await Orbit.productAppP0.activate();},token);
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true,null,{timeout:12000});
  const current=await page.evaluate(()=>Orbit?.session?.rol?.()||'');
  if(current!==target){const assigned=await page.evaluate(()=>Orbit?.session?.allowedRoles?.()||[]);if(!assigned.includes(target))throw new Error('TARGET_ROLE_NOT_ASSIGNED');await page.evaluate(r=>Orbit.session.set(r),target);await page.waitForTimeout(350);}
  await page.waitForTimeout(1200);
  evidence.browser=await page.evaluate(()=>{const s=Orbit.store?._productStatus?Orbit.store._productStatus():(Orbit.store?.raw?.()?.__backend||{});return {counts:{recibosEsperados:(Orbit.store?.all?.('recibosEsperados')||[]).length,carteraPrimas:(Orbit.store?.all?.('carteraPrimas')||[]).length,cobros:(Orbit.store?.all?.('cobros')||[]).length,polizas:(Orbit.store?.all?.('polizas')||[]).length},status:s.status||'',optionalFailed:s.optionalFailed||[],optionalMissing:s.optionalMissing||[],snapshotErrors:s.snapshotErrors||{},queryPlans:{recibosEsperados:s.queryPlans?.recibosEsperados||null,carteraPrimas:s.queryPlans?.carteraPrimas||null,cobros:s.queryPlans?.cobros||null},serverConfirmedCollections:s.serverConfirmedCollections||[],attachedCollections:s.attachedCollections||[]};});
  const rec=evidence.browser.queryPlans.recibosEsperados,car=evidence.browser.queryPlans.carteraPrimas;
  evidence.checks={receiptsPlanCaptured:!!rec,portfolioPlanCaptured:!!car,receiptsHasTenantConstraint:!!rec?.constraints?.some(x=>x.field==='tenantId'),portfolioHasTenantConstraint:!!car?.constraints?.some(x=>x.field==='tenantId'),receiptsZero:evidence.browser.counts.recibosEsperados===0,portfolioZero:evidence.browser.counts.carteraPrimas===0};
  if(!Object.values(evidence.checks).every(Boolean))throw new Error('HYDRATION_PLAN_CHECK_FAILED');
  evidence.decision='HYDRATION_QUERY_PLAN_CAPTURED';
}catch(e){evidence.errors.push(String(e?.message||e).slice(0,800));process.exitCode=1;}
finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'hydration-plan-readonly.json'),JSON.stringify(evidence,null,2)+'\n');console.log('HYDRATION_PLAN_DECISION='+evidence.decision);console.log('HYDRATION_PLAN_BROWSER='+JSON.stringify(evidence.browser));console.log('HYDRATION_PLAN_WRITES=0');}
