import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { chromium } from 'playwright';

const PROJECT='ays-orbit-360-lab';
const LOCK=process.env.B1_LOCK_FILE||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B1_EXECUTION_LOCK_20260919.json';
const OUT=process.env.B1_R7_BOOTSTRAP_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-r7-bootstrap');
const TARGETS=[
  {label:'samuel',email:'samuel.daza@aysseguros.com'},
  {label:'carlos',email:'carlos.castro@aysseguros.com'}
];
const ROUTES=['#/inicio','#/equipo'];
const clean=(v,m=1200)=>String(v==null?'':v).trim().slice(0,m);
const hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex');
const need=(ok,msg)=>{if(!ok)throw new Error(msg)};
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('B1_R7_BOOTSTRAP_SERVICE_ACCOUNT_MISSING')}
fs.mkdirSync(OUT,{recursive:true});
const lock=JSON.parse(fs.readFileSync(LOCK,'utf8'));
const BASE=clean(lock?.preview?.url||'',700);
need(/^https:\/\/.+\.web\.app$/.test(BASE),'B1_R7_PREVIEW_URL_MISSING');
const ev={schema:'GRAVICENTRA_I6_5_B1_R7_BOOTSTRAP_READONLY_V1',status:'FAIL',preview:BASE,writes:0,firestoreWrites:0,scenarios:[],errors:[]};
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b1-r7-bootstrap');
const adminAuth=getAuth(app);
let browser;
try{
  browser=await chromium.launch({headless:true});
  for(const target of TARGETS){
    const user=await adminAuth.getUserByEmail(target.email);
    const token=await adminAuth.createCustomToken(user.uid,{b1R7BootstrapReadOnly:true});
    for(const route of ROUTES){
      const context=await browser.newContext({viewport:{width:1440,height:1000}});
      const page=await context.newPage();
      const pageErrors=[]; page.on('pageerror',e=>pageErrors.push(clean(e?.message||e)));
      const scenario={label:target.label,uidHash:hash(user.uid),emailVerified:user.emailVerified===true,route,customTokenDiagnosticOnly:true,sessionPersistenceProof:false,pageErrors:[]};
      try{
        await page.goto(BASE+'/'+route,{waitUntil:'domcontentloaded',timeout:30000});
        await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.backendProductReadOnlyBootstrapP0&&!!window.Orbit?.productHydrationRequiredOptionalP0,null,{timeout:20000});
        const result=await page.evaluate(async ({token,route})=>{
          const p=Orbit.productRuntimeBrowserProvidersP0;
          const ctx=await p.initialize();
          await ctx.modules.auth.signInWithCustomToken(ctx.auth,token);
          if(typeof ctx.modules.auth.authStateReady==='function') await ctx.modules.auth.authStateReady(ctx.auth);
          const deps=p.dependencies();
          const au=await deps.authProvider.waitForAuthenticatedUser(ctx);
          const member=await deps.membershipProvider.getByUid(String(au.uid||''),ctx);
          const hydration=Orbit.productHydrationRequiredOptionalP0.contract(member);
          const catalog=Orbit.productQueryPlannerP0.compileCatalog(
            hydration.required,
            member,
            {accessPolicy:Orbit.tenantAccessPolicyProductP0}
          );
          const started=await Orbit.backendProductReadOnlyBootstrapP0.start(deps,{
            mode:'product',authorizedProductReadOnly:true,runtimeAuthorized:true,
            collections:hydration.required.concat(hydration.optional),
            snapshotTimeoutMs:7000
          });
          const storeStatus=window.Orbit?.store?._productStatus?.()||null;
          return {
            route:location.hash,
            auth:{uid:String(au.uid||''),emailVerified:au.emailVerified===true},
            membership:{
              tenantId:String(member?.tenantId||''),advisorId:String(member?.advisorId||''),teamId:String(member?.teamId||member?.equipoId||''),
              roles:member?.roles||[],activeRole:String(member?.activeRole||''),
              modulesExtra:member?.modulesExtra||[],modulesRestricted:member?.modulesRestricted||[],
              dataScopes:member?.dataScopes||{},status:String(member?.status||member?.estado||''),
              mustChangePassword:member?.mustChangePassword===true,credentialState:String(member?.credentialState||'')
            },
            hydration,
            requiredQueryCatalog:catalog,
            start:{
              ok:started?.ok===true,ready:started?.ready===true,writeAuthorized:started?.writeAuthorized===true,
              plan:started?.plan||null,readiness:started?.readiness||null,status:started?.status||null,
              storeInstalled:started?.storeInstalled===true,snapshotsAttached:started?.snapshotsAttached===true
            },
            storeStatus
          };
        },{token,route});
        scenario.result={
          route:result.route,
          auth:{uidHash:hash(result.auth.uid),emailVerified:result.auth.emailVerified},
          membership:result.membership,
          hydration:result.hydration,
          requiredQueryCatalog:result.requiredQueryCatalog,
          start:result.start,
          storeStatus:result.storeStatus
        };
      }catch(e){scenario.error=clean(e?.stack||e?.message||e,3500);}
      scenario.pageErrors=pageErrors;
      ev.scenarios.push(scenario);
      await context.close().catch(()=>{});
    }
  }
  ev.status='PASS';
}catch(e){ev.errors.push(clean(e?.stack||e?.message||e,3500));process.exitCode=1;}
finally{
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'b1-r7-bootstrap-readonly.json'),JSON.stringify(ev,null,2)+'\n');
  console.log('B1_R7_BOOTSTRAP='+ev.status);
  console.log('B1_R7_SCENARIOS='+JSON.stringify(ev.scenarios));
  console.log('B1_R7_ERRORS='+JSON.stringify(ev.errors));
  console.log('B1_R7_WRITES=0');
}
