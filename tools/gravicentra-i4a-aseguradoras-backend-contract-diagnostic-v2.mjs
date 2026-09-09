import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab', TENANT='alianzas-soluciones', TARGET='Dirección';
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||''), BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4A_ASEGURADORAS_DIAG_DIR||process.env.RUNNER_TEMP||process.cwd();
const clean=v=>String(v==null?'':v).trim();
function need(ok,code){if(!ok)throw new Error(code);}
function role(v){const k=clean(v).toLowerCase();return ({'dirección':'Dirección',direccion:'Dirección',superadmin:'SuperAdmin','super admin':'SuperAdmin',super_admin:'SuperAdmin',admin:'AdminTenant',administrador:'AdminTenant',admintenant:'AdminTenant','admin tenant':'AdminTenant',admin_tenant:'AdminTenant',operativo:'Operativo',operaciones:'Operativo',asesor:'Asesor'})[k]||clean(v);}
function roles(m){return [...new Set((Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[])).map(role).filter(Boolean))];}
function activeRole(m,rs){return role(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||m?.roleDefault||rs[0]);}
function serviceAccount(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('I4A_EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');}
async function activate(page,token){const x=await page.evaluate(async tok=>{const p=Orbit?.productRuntimeBrowserProvidersP0;const c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);return await Orbit.productAppP0.activate();},token);need(x?.started===true,'PRODUCT_APP_DID_NOT_START');await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});}
async function setRole(page,target){const before=await page.evaluate(()=>({active:Orbit?.session?.rol?.()||'',assigned:Orbit?.session?.allowedRoles?.()||[]}));if(before.active===target)return 'persisted-active';need(before.assigned.includes(target),'ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),target)===true,'ROLE_SWITCH_REJECTED');await page.waitForTimeout(180);need(await page.evaluate(()=>Orbit?.session?.rol?.()||'')===target,'ROLE_SWITCH_NOT_EFFECTIVE');return 'assigned-switch';}

need(/^[0-9a-f]{40}$/.test(SOURCE),'I4A_SOURCE_SHA_MISSING_OR_INVALID');
need(/^gi-i3-[0-9a-f]{12}-[0-9a-f]{12}$/.test(BUILD)&&BUILD.includes(SOURCE.slice(0,12)),'I4A_BUILD_ID_MISSING_OR_SOURCE_MISMATCH');
need(/^https:\/\/[A-Za-z0-9._-]+\.web\.app$/.test(PREVIEW),'I4A_PREVIEW_URL_MISSING_OR_INVALID');
const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i4a-aseguradoras-backend-diag-v2');
const auth=getAuth(app),db=getFirestore(app);
const evidence={schemaVersion:'gravicentra-i4a-aseguradoras-backend-contract-diagnostic-v2',gate:'I4A',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,status:'FAIL',productionTouched:false,dataTouched:false,writesExecuted:0,secretsRecorded:false,userIdentitiesRecorded:false,rawCredentialRefsRecorded:false,result:null};
let browser;
try{
  const members=await db.collection('tenants').doc(TENANT).collection('members').get();
  const listed=await auth.listUsers(1000), users=new Map(listed.users.map(u=>[u.uid,u]));
  const pool=[];
  for(const doc of members.docs){const m=doc.data()||{},uid=clean(m.uid||doc.id),u=users.get(uid);if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;const rs=roles(m);if(rs.includes(TARGET))pool.push({uid,roles:rs,active:activeRole(m,rs)});}
  const selected=pool.find(x=>x.active===TARGET)||pool[0];need(selected,'DIRECCION_VERIFIED_MEMBER_UNAVAILABLE');
  browser=await chromium.launch({headless:true});const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const page=await ctx.newPage();page.setDefaultTimeout(12000);
  const token=await auth.createCustomToken(selected.uid,{gravicentraI4AReadOnly:true});await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:5000});await activate(page,token);const selectionMode=await setRole(page,TARGET);
  const result=await page.evaluate(async()=>{
    const rows=Orbit?.store?.all?.('aseguradoras')||[];let insurer=null,index=-1,ref='';
    for(const x of rows){const ps=Array.isArray(x?.portales)?x.portales:[];const i=ps.findIndex(p=>p&&p.credentialRef);if(i>=0){insurer=x;index=i;ref=String(ps[i].credentialRef||'').trim();break;}}
    if(!insurer||index<0||!ref)throw new Error('ASEGURADORAS_CREDENTIAL_REF_DATASET_UNAVAILABLE');
    const runtime=Orbit?.productRuntimeBrowserProvidersP0;const active=Orbit?.session?.rol?.()||'';let local={};try{local=Orbit?.secureResources?.credentialStatus?.(ref,{module:'aseguradoras',insurerId:insurer.id,portalIndex:index})||{};}catch{}
    async function direct(operation){try{const r=await runtime.callFunction('orbit360ProductInsurerCredentialCommandPreview',{operation,tenantId:'alianzas-soluciones',activeRole:active,credentialRef:ref,insurerId:String(insurer.id||'')},'us-east1');const d=r&&r.data?r.data:(r||{});return {resolved:true,ok:d?.ok===true,status:String(d?.status||''),available:d?.available===true,hasValue:typeof d?.value==='string'&&d.value.length>0,containsSecrets:d?.containsSecrets===true,errorCode:'',errorMessage:''};}catch(e){return {resolved:false,ok:false,status:'',available:false,hasValue:false,containsSecrets:false,errorCode:String(e?.code||''),errorMessage:String(e?.message||'').slice(0,240)};}}
    const backendStatus=await direct('status');const backendReveal=await direct('reveal');let wrapper={};try{const w=await Orbit.secureResources.revealCredential(ref,{module:'aseguradoras',insurerId:String(insurer.id||''),portalIndex:index});wrapper={ok:w?.ok===true,status:String(w?.status||''),hasValue:typeof w?.value==='string'&&w.value.length>0,message:String(w?.message||'').slice(0,160)};}catch(e){wrapper={ok:false,status:'exception',hasValue:false,message:String(e?.message||'').slice(0,160)};}
    return {portalIndex:index,validRef:/^cred_[a-f0-9]{32}$/.test(ref),localStatus:String(local.status||''),localAvailable:local.available===true,provider:(()=>{try{const p=Orbit?.productInsurerCredentialProviderP0?.status?.()||{};return {registered:p.providerRegistered===true,preview:p.preview===true,callable:String(p.callable||''),region:String(p.region||'')};}catch{return {};}})(),backendStatus,backendReveal,wrapper};
  });
  evidence.result={selectionMode,...result};
  evidence.status='PASS_DIAGNOSTIC_CAPTURED';
  await ctx.close();
}catch(e){evidence.error=String(e?.message||e);}
finally{if(browser)await browser.close().catch(()=>{});await deleteApp(app).catch(()=>{});fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'aseguradoras-backend-contract-diagnostic-v2.json'),JSON.stringify(evidence,null,2)+'\n');console.log('ASEGURADORAS_BACKEND_CONTRACT_DIAGNOSTIC='+evidence.status);console.log('ASEGURADORAS_RAW_REFS_RECORDED=false');console.log('ASEGURADORAS_SECRETS_RECORDED=false');if(evidence.status!=='PASS_DIAGNOSTIC_CAPTURED')process.exitCode=1;}
