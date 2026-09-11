import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,'');
const SOURCE=String(process.env.SOURCE_SHA||'');
const BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4B_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const clean=v=>String(v==null?'':v).trim();
const need=(ok,code)=>{if(!ok)throw new Error(code)};

need(/^[0-9a-f]{40}$/.test(SOURCE),'I4B_DIAG_SOURCE_INVALID');
need(/^gi-i3-[0-9a-f]{12}-[0-9a-f]{12}$/.test(BUILD)&&BUILD.includes(SOURCE.slice(0,12)),'I4B_DIAG_BUILD_INVALID');
need(/^https:\/\/[A-Za-z0-9._-]+\.web\.app$/.test(PREVIEW),'I4B_DIAG_PREVIEW_INVALID');

function normRole(v){
  const k=clean(v).toLowerCase().replace(/\s+/g,' ');
  return ({'dirección':'Dirección','direccion':'Dirección','director':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','super_admin':'SuperAdmin','super-admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admin_tenant':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);
}
function rolesOf(m){const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(normRole).filter(Boolean))];}
function serviceAccount(){
  for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){
    try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('I4B_DIAG_SERVICE_ACCOUNT_UNAVAILABLE');
}

const app=initializeApp({credential:cert(serviceAccount()),projectId:PROJECT},'gravicentra-i4b-rel-diag-v1');
const auth=getAuth(app),db=getFirestore(app);
let browser;
try{
  const memberSnap=await db.collection('tenants').doc(TENANT).collection('members').get();
  const listed=await auth.listUsers(1000), users=new Map(listed.users.map(u=>[u.uid,u]));
  const candidates=[];
  for(const doc of memberSnap.docs){
    const m=doc.data()||{},uid=clean(m.uid||doc.id),u=users.get(uid);
    if(!u||u.disabled||u.emailVerified!==true||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;
    const rs=rolesOf(m);if(rs.includes('Dirección')||rs.includes('SuperAdmin')||rs.includes('AdminTenant')||rs.includes('Operativo'))candidates.push({uid,roles:rs});
  }
  need(candidates.length>0,'I4B_DIAG_PRIVILEGED_MEMBER_UNAVAILABLE');
  const member=candidates.find(x=>x.roles.includes('Dirección'))||candidates[0];
  const token=await auth.createCustomToken(member.uid,{gravicentraI4BReadOnly:true});
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:6000});
  const started=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0;const c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.activate();},token);
  need(started?.started===true,'I4B_DIAG_PRODUCT_APP_NOT_STARTED');
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:12000});
  const gate=page.locator('[data-legal-gate].open');
  try{
    await gate.waitFor({state:'visible',timeout:2500});
    const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');
    if(await chk.count()===1&&await ok.count()===1){await chk.check();await ok.click();await gate.waitFor({state:'detached',timeout:4000});}
  }catch{}
  await page.waitForFunction(()=>{
    try{return (Orbit.store.all('clientes')||[]).length>0&&(Orbit.store.all('polizas')||[]).length>0&&(Orbit.store.all('vehiculos')||[]).length>0;}catch{return false;}
  },null,{timeout:14000});
  const diagnostic=await page.evaluate(()=>{
    const all=n=>{try{return Orbit.store.all(n)||[]}catch{return[]}};
    const clientes=all('clientes'),polizas=all('polizas'),vehiculos=all('vehiculos');
    const cids=new Set(clientes.map(x=>String(x.id))),pids=new Set(polizas.map(x=>String(x.id)));
    const safePolicy=p=>({
      id:String(p?.id||''),clienteId:String(p?.clienteId||''),
      numero:String(p?.numeroPoliza||p?.numero||p?.poliza||''),estado:String(p?.estado||''),
      validationMarker:Object.values(p||{}).some(v=>typeof v==='string'&&/entorno\s+de\s+validaci[oó]n/i.test(v))
    });
    const orphanPolicies=polizas.filter(p=>p?.clienteId&&!cids.has(String(p.clienteId))).map(safePolicy);
    const orphanPolicyIds=new Set(orphanPolicies.map(p=>p.id));
    const orphanVehicleClients=vehiculos.filter(v=>v?.clienteId&&!cids.has(String(v.clienteId))).map(v=>({
      id:String(v?.id||''),clienteId:String(v?.clienteId||''),polizaId:String(v?.polizaId||''),linkedToOrphanPolicy:orphanPolicyIds.has(String(v?.polizaId||'')),
      validationMarker:Object.values(v||{}).some(x=>typeof x==='string'&&/entorno\s+de\s+validaci[oó]n/i.test(x))
    }));
    const orphanVehiclePolicies=vehiculos.filter(v=>v?.polizaId&&!pids.has(String(v.polizaId))).map(v=>({id:String(v?.id||''),clienteId:String(v?.clienteId||''),polizaId:String(v?.polizaId||'')}));
    return {
      totals:{clientes:clientes.length,polizas:polizas.length,vehiculos:vehiculos.length},
      orphanPolicyClientCount:orphanPolicies.length,
      orphanVehicleClientCount:orphanVehicleClients.length,
      orphanVehiclePolicyCount:orphanVehiclePolicies.length,
      orphanPolicies,orphanVehicleClients,orphanVehiclePolicies,
      productJoinContract:{clientePoliza:'cliente.id -> poliza.clienteId',clienteVehiculo:'cliente.id -> vehiculo.clienteId',polizaVehiculo:'poliza.id -> vehiculo.polizaId'}
    };
  });
  const out={schemaVersion:'gravicentra-i4b-relationship-diagnostic-v1',gate:'I4B',status:'DIAGNOSTIC_ONLY',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,productionTouched:false,dataTouched:false,writesExecuted:0,userIdentitiesRecorded:false,secretValuesRecorded:false,...diagnostic};
  fs.mkdirSync(OUT,{recursive:true});
  fs.writeFileSync(path.join(OUT,'i4b-relationship-diagnostic.json'),JSON.stringify(out,null,2)+'\n');
  console.log('I4B_RELATIONSHIP_DIAGNOSTIC=PASS');
  console.log('I4B_DIAG_ORPHAN_POLICY_CLIENT='+out.orphanPolicyClientCount);
  console.log('I4B_DIAG_ORPHAN_VEHICLE_CLIENT='+out.orphanVehicleClientCount);
  console.log('I4B_DIAG_ORPHAN_VEHICLE_POLICY='+out.orphanVehiclePolicyCount);
  await context.close();
} finally {
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
}
