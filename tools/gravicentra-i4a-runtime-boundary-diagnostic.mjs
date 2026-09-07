import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const REGION='us-central1';
const FUNCTION='orbit360ProductInsurerCredentialCommand';
const SERVICE=FUNCTION.toLowerCase();
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||'');
const BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4A_BOUNDARY_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const PRIVILEGED=['Dirección','SuperAdmin','AdminTenant','Operativo'];
const clean=v=>String(v==null?'':v).trim();
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const role=v=>{const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','director':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);};
const roles=m=>{const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(role).filter(Boolean))];};
const activeRole=(m,rs)=>role(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I4A_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');}
function redact(v){return String(v==null?'':v).replace(/cred_[a-f0-9]{32}/gi,'cred_[REDACTED]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[EMAIL_REDACTED]').replace(/[A-Za-z0-9_-]{80,}/g,'[LONG_VALUE_REDACTED]').slice(0,500);}
async function activate(page,token){const x=await page.evaluate(async tok=>{const p=Orbit?.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);return await Orbit.productAppP0.activate();},token);need(x?.started===true,'PRODUCT_APP_DID_NOT_START');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});}
async function setRole(page,target){const before=await page.evaluate(()=>({active:Orbit?.session?.rol?.()||'',assigned:Orbit?.session?.allowedRoles?.()||[]}));if(before.active===target)return;need(before.assigned.includes(target),'ROLE_NOT_ASSIGNED:'+target);need(await page.evaluate(r=>Orbit.session.set(r),target),'ROLE_SWITCH_REJECTED:'+target);await page.waitForTimeout(200);need(await page.evaluate(()=>Orbit?.session?.rol?.()||'')===target,'ROLE_SWITCH_NOT_EFFECTIVE:'+target);}
async function go(page,hash,key){await page.evaluate(h=>{location.hash=h;},hash);await page.waitForFunction(k=>Orbit?.route?.key===k,key,{timeout:12000});await page.waitForTimeout(500);}

async function policyBoundary(page){
  await go(page,'#/polizas','polizas');
  return await page.evaluate(async()=>{
    const re=/entorno de validaci[oó]n/i;
    const label=p=>[p?.id,p?.numero,p?.nombre,p?.descripcion,p?.referencia].map(x=>String(x||'').trim()).filter(Boolean).join(' | ');
    const storeSnapshot=()=>{
      let raw=[],all=[];
      try{raw=Orbit?.store?.raw?.()?.polizas||[];}catch{}
      try{all=Orbit?.store?.all?.('polizas')||[];}catch{}
      const pack=rows=>({count:Array.isArray(rows)?rows.length:0,syntheticCount:(Array.isArray(rows)?rows:[]).map(label).filter(x=>re.test(x)).length,syntheticSample:(Array.isArray(rows)?rows:[]).map(label).filter(x=>re.test(x)).slice(0,4)});
      return {raw:pack(raw),operational:pack(all)};
    };
    const domSnapshot=stage=>{
      const rows=[...document.querySelectorAll('#host tbody tr')];
      const hits=rows.map((tr,index)=>({tr,index,text:tr.textContent||''})).filter(x=>re.test(x.text)).map(x=>({index:x.index,cellCount:x.tr.cells?.length||0,phraseCellIndexes:[...(x.tr.cells||[])].map((td,i)=>re.test(td.textContent||'')?i:-1).filter(i=>i>=0),hasPolicyDetailHandler:!!x.tr.getAttribute('onclick'),rowText:String(x.text).replace(/\s+/g,' ').trim().slice(0,360)}));
      return {stage,rowCount:rows.length,syntheticRowCount:hits.length,syntheticRows:hits,firstRows:rows.slice(0,4).map(tr=>String(tr.textContent||'').replace(/\s+/g,' ').trim().slice(0,220)),store:storeSnapshot()};
    };
    const mod=Orbit?.modules?.polizas||{};
    const fn=f=>typeof f==='function'?Function.prototype.toString.call(f):'';
    const chain={
      current:fn(mod.render),
      priorPolicyReceipts:fn(mod?.__policyReceiptsV1199?.render),
      baseScopeOriginal:fn(mod?.__scopeV1198?.original),
      accessWithScope:fn(Orbit?.access?.withScope),
      accessScopedStore:fn(Orbit?.access?.scopedStore),
      moduleKeys:Object.keys(mod)
    };
    const before=domSnapshot('before-stable-rerender');
    let rerenderError='';
    try{
      const host=document.getElementById('host');
      const out=mod.render?.(host);
      if(out&&typeof out.then==='function')await out;
    }catch(e){rerenderError=String(e?.message||e).slice(0,240);}
    const immediate=domSnapshot('immediate-after-stable-rerender');
    await new Promise(r=>setTimeout(r,80));
    const after80=domSnapshot('after-80ms');
    await new Promise(r=>setTimeout(r,520));
    const after600=domSnapshot('after-600ms');
    return {
      route:Orbit?.route?.key||'',
      currentUserRole:Orbit?.session?.rol?.()||'',
      before,immediate,after80,after600,rerenderError,
      renderChain:{
        currentSourceLength:chain.current.length,
        currentSource:chain.current.slice(0,1000),
        priorPolicyReceiptsSourceLength:chain.priorPolicyReceipts.length,
        priorPolicyReceiptsSource:chain.priorPolicyReceipts.slice(0,1200),
        baseScopeOriginalSourceLength:chain.baseScopeOriginal.length,
        baseScopeOriginalReadsStoreAllPolizas:chain.baseScopeOriginal.includes("S().all('polizas')")||chain.baseScopeOriginal.includes("all('polizas')"),
        accessWithScopeSource:chain.accessWithScope.slice(0,1200),
        accessScopedStoreSource:chain.accessScopedStore.slice(0,1800),
        moduleKeys:chain.moduleKeys
      },
      scripts:[...document.scripts].map(s=>s.src||'').filter(src=>/poliz|policy-receipts|crm-v1198|access-scope/i.test(src)).map(src=>src.replace(location.origin,'')).slice(0,80)
    };
  });
}

async function cloudBoundary(sa){
  const out={function:null,runService:null,error:''};
  try{
    const auth=new GoogleAuth({credentials:sa,scopes:['https://www.googleapis.com/auth/cloud-platform']});
    const client=await auth.getClient(),headers=await client.getRequestHeaders();
    const metaUrl=`https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/functions/${FUNCTION}`;
    const r=await fetch(metaUrl,{method:'GET',headers});
    const j=await r.json().catch(()=>({}));
    out.function={
      httpStatus:r.status,
      name:String(j?.name||''),
      state:String(j?.state||''),
      environment:String(j?.environment||''),
      entryPoint:String(j?.buildConfig?.entryPoint||''),
      runtime:String(j?.buildConfig?.runtime||''),
      serviceAccountConfigured:!!j?.serviceConfig?.serviceAccountEmail,
      uriConfigured:!!j?.serviceConfig?.uri,
      updateTime:String(j?.updateTime||''),
      error:redact(j?.error?.message||j?.message||'')
    };
    const runUrl=`https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${SERVICE}`;
    const rr=await fetch(runUrl,{method:'GET',headers});
    const rj=await rr.json().catch(()=>({}));
    out.runService={
      httpStatus:rr.status,
      name:String(rj?.name||''),
      latestReadyRevision:String(rj?.latestReadyRevision||''),
      latestCreatedRevision:String(rj?.latestCreatedRevision||''),
      generation:String(rj?.generation||''),
      observedGeneration:String(rj?.observedGeneration||''),
      createTime:String(rj?.createTime||''),
      updateTime:String(rj?.updateTime||''),
      uriConfigured:!!rj?.uri,
      terminalConditionState:String((rj?.terminalCondition||{}).state||''),
      error:redact(rj?.error?.message||rj?.message||'')
    };
  }catch(e){out.error=redact(e?.message||e);}
  return out;
}

const sa=serviceAccount();
const app=initializeApp({credential:cert(sa),projectId:PROJECT},'gravicentra-i4a-runtime-boundary-v3');
const auth=getAuth(app),db=getFirestore(app);
const evidence={schemaVersion:'gravicentra-i4a-runtime-boundary-v3',gate:'I4A',status:'BOUNDARY_DIAGNOSTIC_FAIL',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,productionTouched:false,dataTouched:false,writesExecuted:0,userIdentitiesRecorded:false,tokensRecorded:false,secretsRecorded:false,privilegedRole:'',policy:null,cloud:null,classification:null,errors:[]};
let browser,context;
try{
  need(PREVIEW&&SOURCE&&BUILD,'I4A_BOUNDARY_ENV_INCOMPLETE');
  const memberships=await db.collection('tenants').doc(TENANT).collection('members').get(),listed=await auth.listUsers(1000),users=new Map(listed.users.map(u=>[u.uid,u])),pool=[];
  for(const doc of memberships.docs){const m=doc.data()||{},uid=clean(m.uid||doc.id),u=users.get(uid);if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;const rs=roles(m);pool.push({uid,roles:rs,active:activeRole(m,rs)});}
  let selected=null,targetRole='';
  for(const r of PRIVILEGED){const exact=pool.find(x=>x.active===r&&x.roles.includes(r)),fallback=exact||pool.find(x=>x.roles.includes(r));if(fallback){selected=fallback;targetRole=r;break;}}
  need(selected&&targetRole,'I4A_NO_PRIVILEGED_ACTIVE_MEMBERSHIP');
  evidence.privilegedRole=targetRole;
  const token=await auth.createCustomToken(selected.uid,{gravicentraI4ARuntimeBoundaryReadOnly:true});
  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(12000);
  await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:6000});await activate(page,token);await setRole(page,targetRole);
  evidence.policy=await policyBoundary(page);
  evidence.cloud=await cloudBoundary(sa);
  const p=evidence.policy,c=evidence.cloud;
  const beforeSynthetic=p?.before?.syntheticRowCount||0,stableSynthetic=p?.after600?.syntheticRowCount||0;
  evidence.classification={
    policyInitialPhraseIsTableRow:beforeSynthetic>0,
    policyStoreContainsPhraseBefore:(p?.before?.store?.raw?.syntheticCount||0)>0||(p?.before?.store?.operational?.syntheticCount||0)>0,
    policyStableRerenderContainsPhrase:stableSynthetic>0,
    policyStaleDomClearedByStableRerender:beforeSynthetic>0&&stableSynthetic===0&&((p?.after600?.store?.raw?.syntheticCount||0)===0)&&((p?.after600?.store?.operational?.syntheticCount||0)===0),
    functionMetadataAvailable:c?.function?.httpStatus===200,
    functionState:c?.function?.state||'',
    functionEntryPoint:c?.function?.entryPoint||'',
    runServiceMetadataAvailable:c?.runService?.httpStatus===200,
    runLatestReadyRevision:c?.runService?.latestReadyRevision||''
  };
  evidence.status='BOUNDARY_DIAGNOSTIC_COMPLETE';
}catch(e){evidence.errors.push(redact(e?.message||e));process.exitCode=1;}
finally{
  if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});
  fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'i4a-runtime-boundary.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('I4A_BOUNDARY_STATUS='+evidence.status);
  console.log('I4A_BOUNDARY_POLICY_BEFORE_ROWS='+(evidence.policy?.before?.syntheticRowCount??'NA'));
  console.log('I4A_BOUNDARY_POLICY_AFTER_STABLE_RERENDER='+(evidence.policy?.after600?.syntheticRowCount??'NA'));
  console.log('I4A_BOUNDARY_POLICY_STALE_DOM='+(evidence.classification?.policyStaleDomClearedByStableRerender===true?'YES':'NO'));
  console.log('I4A_BOUNDARY_FUNCTION_METADATA='+(evidence.classification?.functionMetadataAvailable===true?'PASS':'FAIL'));
  console.log('I4A_BOUNDARY_FUNCTION_STATE='+(evidence.classification?.functionState||'UNKNOWN'));
  console.log('I4A_BOUNDARY_FUNCTION_ENTRYPOINT='+(evidence.classification?.functionEntryPoint||'UNKNOWN'));
  console.log('I4A_BOUNDARY_RUN_REVISION='+(evidence.classification?.runLatestReadyRevision||'UNKNOWN'));
  console.log('I4A_BOUNDARY_WRITES=0');
}
