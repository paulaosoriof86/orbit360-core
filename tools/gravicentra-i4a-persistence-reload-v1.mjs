import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const PREVIEW=String(process.env.PREVIEW_URL||'').replace(/\/$/,''),SOURCE=String(process.env.SOURCE_SHA||''),BUILD=String(process.env.BUILD_ID||'');
const OUT=process.env.I4A_PERSISTENCE_EVIDENCE_DIR||process.env.RUNNER_TEMP||process.cwd();
const TARGET_ROLE='Dirección';
const clean=v=>String(v==null?'':v).trim();
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const hash=v=>crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex').slice(0,20);
need(/^[0-9a-f]{40}$/.test(SOURCE),'I4A_SOURCE_SHA_INVALID');
need(BUILD.includes(SOURCE.slice(0,12)),'I4A_BUILD_SOURCE_MISMATCH');
need(/^https:\/\/.+\.web\.app$/.test(PREVIEW),'I4A_PREVIEW_URL_INVALID');

function role(v){const k=clean(v).toLowerCase().replace(/\s+/g,' ');return ({'dirección':'Dirección','direccion':'Dirección','director':'Dirección','superadmin':'SuperAdmin','super admin':'SuperAdmin','admin':'AdminTenant','administrador':'AdminTenant','admin tenant':'AdminTenant','admintenant':'AdminTenant','operativo':'Operativo','operaciones':'Operativo','asesor':'Asesor'})[k]||clean(v);}
function roles(m){const x=Array.isArray(m?.roles)?m.roles:Array.isArray(m?.rolesAsignados)?m.rolesAsignados:(m?.role||m?.rol?[m.role||m.rol]:[]);return [...new Set(x.map(role).filter(Boolean))];}
function active(m,rs){return role(m?.activeRole||m?.rolActivo||m?.defaultRole||m?.rolDefault||rs[0]);}
function sa(){for(const raw of [process.env.SA_DEFAULT,process.env.SA_ORBIT360_LAB,process.env.SA_ORBIT_360_LAB].filter(Boolean)){try{const x=JSON.parse(raw);if(x?.type==='service_account'&&x.project_id===PROJECT&&x.client_email&&x.private_key)return x;}catch{}}throw new Error('I4A_SERVICE_ACCOUNT_UNAVAILABLE');}
function telemetry(page){const t={console:[],page:[],request:[],http:[]};page.on('console',m=>{if(m.type()==='error')t.console.push(m.text().slice(0,220));});page.on('pageerror',e=>t.page.push(String(e?.message||e).slice(0,220)));page.on('requestfailed',q=>{try{if(new URL(q.url()).origin===new URL(PREVIEW).origin)t.request.push(q.url());}catch{}});page.on('response',q=>{try{if(new URL(q.url()).origin===new URL(PREVIEW).origin&&q.status()>=400)t.http.push(q.status());}catch{}});return t;}
function telSummary(t){return{consoleErrorCount:t.console.length,pageErrorCount:t.page.length,sameOriginRequestFailureCount:t.request.length,sameOriginHttpErrorCount:t.http.length};}

async function waitApp(page,routeKey){
  await page.waitForFunction((r)=>{const a=Orbit?.productAppP0?.status?.()||{};return a.started===true&&a.routerStarted===true&&a.tenantContextReady===true&&a.operationalWriteReady===true&&!document.body.classList.contains('pre-auth')&&(!r||Orbit?.route?.key===r);},routeKey||'',{timeout:23000});
}
async function acceptLegal(page){const gate=page.locator('[data-legal-gate].open');if(await gate.count()){await gate.waitFor({state:'visible',timeout:3000});await gate.locator('#lg-chk').check();await gate.locator('#lg-ok').click();await gate.waitFor({state:'detached',timeout:4000});}}
async function initial(page,token){await page.goto(PREVIEW,{waitUntil:'domcontentloaded',timeout:20000});await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:7000});await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.activate();},token);await waitApp(page,'inicio');await acceptLegal(page);const assigned=await page.evaluate(()=>Orbit?.session?.allowedRoles?.()||[]);need(assigned.includes(TARGET_ROLE),'TARGET_ROLE_NOT_ASSIGNED');const current=await page.evaluate(()=>Orbit?.session?.rol?.()||'');if(current!==TARGET_ROLE){need(await page.evaluate(r=>Orbit.session.set(r),TARGET_ROLE),'TARGET_ROLE_SWITCH_REJECTED');await page.waitForTimeout(200);}need(await page.evaluate(()=>Orbit?.session?.rol?.()||'')===TARGET_ROLE,'TARGET_ROLE_SWITCH_NOT_EFFECTIVE');}

async function evidenceDiagnostics(page){
  return page.evaluate(()=>{
    const st=Orbit?.store?._productStatus?.()||{};
    const count=c=>(Orbit?.store?.all?.(c)||[]).length;
    const ops=(Orbit?.ciclo?.opsBoard?.()||[]).flatMap(c=>c.items||[]).filter(x=>x?.kind==='negocio').length;
    const leads=(Orbit?.ciclo?.leadsBoard?.()||[]).flatMap(c=>c.items||[]).filter(x=>x?.kind==='negocio').length;
    const app=Orbit?.productAppP0?.status?.()||{};
    return {
      route:Orbit?.route?.key||'',
      app:{started:app.started===true,routerStarted:app.routerStarted===true,tenantContextReady:app.tenantContextReady===true,operationalWriteReady:app.operationalWriteReady===true},
      serverConfirmedCollections:Array.isArray(st.serverConfirmedCollections)?st.serverConfirmedCollections:[],
      deferredCollections:Array.isArray(st.deferredCollections)?st.deferredCollections:[],
      requiredMissing:Array.isArray(st.requiredMissing)?st.requiredMissing:[],
      requiredFailed:Array.isArray(st.requiredFailed)?st.requiredFailed:[],
      counts:{clientes:count('clientes'),polizas:count('polizas'),cobros:count('cobros'),aseguradoras:count('aseguradoras'),vehiculos:count('vehiculos'),recibosEsperados:count('recibosEsperados'),carteraPrimas:count('carteraPrimas'),negocios:count('negocios')},
      boardCounts:{opsNegocios:ops,leadsNegocios:leads}
    };
  }).catch(()=>({diagnosticsUnavailable:true}));
}

async function waitEvidence(page,stage){
  try{
    await page.waitForFunction((s)=>{
      const st=Orbit?.store?._productStatus?.()||{},confirmed=new Set(Array.isArray(st.serverConfirmedCollections)?st.serverConfirmedCollections:[]);
      const required=['clientes','polizas','cobros','aseguradoras'];
      if(!required.every(x=>confirmed.has(x)))return false;
      const scoped=(moduleKey,collection)=>Orbit?.access?.scopedStore?.(moduleKey)?.all?.(collection)||[];
      const clients=scoped('cliente360','clientes'),clientIds=new Set(clients.map(x=>x.id));
      const vehicles=(Orbit?.store?.all?.('vehiculos')||[]).filter(v=>clientIds.has(v.clienteId)&&v.polizaId&&Orbit.store.get('polizas',v.polizaId));
      const golden=(Orbit?.store?.all?.('polizas')||[]).find(p=>String(p.numero||'')==='AUTO39012')||null;
      const receipts=Orbit?.store?.all?.('recibosEsperados')||[];
      const cartera=Orbit?.store?.all?.('carteraPrimas')||[];
      const cobros=Orbit?.store?.all?.('cobros')||[];
      const opsBoard=Orbit?.ciclo?.opsBoard?.()||[];
      const leadsBoard=Orbit?.ciclo?.leadsBoard?.()||[];
      const opsBusiness=opsBoard.flatMap(c=>c.items||[]).find(x=>x?.kind==='negocio')?.rec||null;
      const sharedBusiness=opsBusiness&&leadsBoard.flatMap(c=>c.items||[]).some(x=>x?.rec?.id===opsBusiness.id)?opsBusiness:null;
      if(s==='baseline')return confirmed.has('vehiculos')&&confirmed.has('recibosEsperados')&&confirmed.has('carteraPrimas')&&vehicles.length>0&&!!golden&&receipts.length>0&&cartera.length>0&&cobros.length>0;
      if(s==='cliente360')return confirmed.has('vehiculos')&&vehicles.length>0;
      if(s==='ops'||s==='leads')return !!sharedBusiness;
      if(s==='polizas')return !!golden;
      if(s==='cobros')return confirmed.has('recibosEsperados')&&confirmed.has('carteraPrimas')&&receipts.length>0&&cartera.length>0&&cobros.length>0;
      return false;
    },stage,{timeout:23000});
  }catch{
    const d=await evidenceDiagnostics(page);
    throw new Error(`PERSISTENCE_STAGE_TIMEOUT:${stage}:${JSON.stringify(d)}`);
  }
}

async function gotoRoute(page,hash,key){await page.evaluate(h=>{location.hash=h;},hash);await page.waitForFunction(k=>Orbit?.route?.key===k&&!!document.querySelector('#host .page'),key,{timeout:12000});}
async function reloadOnRoute(page,key,stage){const started=Date.now();await page.reload({waitUntil:'domcontentloaded',timeout:20000});await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:7000});await waitApp(page,key);await waitEvidence(page,stage);return Date.now()-started;}

function snapshotScript(){
  const scoped=(moduleKey,collection)=>Orbit?.access?.scopedStore?.(moduleKey)?.all?.(collection)||[];
  const clients=scoped('cliente360','clientes');
  const clientIds=new Set(clients.map(x=>x.id));
  const vehicles=(Orbit?.store?.all?.('vehiculos')||[]).filter(v=>clientIds.has(v.clienteId)&&v.polizaId&&Orbit.store.get('polizas',v.polizaId));
  const vehicle=vehicles[0]||null;
  const policyByVehicle=vehicle?Orbit.store.get('polizas',vehicle.polizaId):null;
  const golden=(Orbit?.store?.all?.('polizas')||[]).find(p=>String(p.numero||'')==='AUTO39012')||null;
  const opsBoard=Orbit?.ciclo?.opsBoard?.()||[];
  const opsBusiness=opsBoard.flatMap(c=>c.items||[]).find(x=>x.kind==='negocio')?.rec||null;
  const sharedBusiness=opsBusiness&&((Orbit?.ciclo?.leadsBoard?.()||[]).flatMap(c=>c.items||[]).some(x=>x?.rec?.id===opsBusiness.id))?opsBusiness:null;
  const receipts=Orbit?.store?.all?.('recibosEsperados')||[];
  const cartera=Orbit?.store?.all?.('carteraPrimas')||[];
  const cobros=Orbit?.store?.all?.('cobros')||[];
  return {
    activeRole:Orbit?.session?.rol?.()||'',
    clientId:vehicle?.clienteId||clients[0]?.id||'',
    vehicle:vehicle?{id:vehicle.id,clienteId:vehicle.clienteId,polizaId:vehicle.polizaId}:null,
    policyByVehicle:policyByVehicle?{id:policyByVehicle.id,clienteId:policyByVehicle.clienteId,numero:policyByVehicle.numero||''}:null,
    golden:golden?{id:golden.id,numero:golden.numero||'',prima:Number(golden.prima??golden.primaNeta??0),primaTotal:Number(golden.primaTotal??0)}:null,
    sharedBusiness:sharedBusiness?{id:sharedBusiness.id,etapa:sharedBusiness.etapa||'',asesorId:sharedBusiness.asesorId||''}:null,
    receipt:receipts[0]?{id:receipts[0].id,clienteId:receipts[0].clienteId||'',polizaId:receipts[0].polizaId||''}:null,
    cartera:cartera[0]?{id:cartera[0].id,clienteId:cartera[0].clienteId||'',polizaId:cartera[0].polizaId||''}:null,
    cobro:cobros[0]?{id:cobros[0].id,clienteId:cobros[0].clienteId||'',polizaId:cobros[0].polizaId||''}:null,
    counts:{clientes:(Orbit.store.all('clientes')||[]).length,polizas:(Orbit.store.all('polizas')||[]).length,vehiculos:(Orbit.store.all('vehiculos')||[]).length,recibosEsperados:receipts.length,carteraPrimas:cartera.length,cobros:cobros.length,negocios:(Orbit.store.all('negocios')||[]).length}
  };
}
function sanitize(s){return{activeRole:s.activeRole,clientIdHash:s.clientId?hash(s.clientId):'',vehicle:s.vehicle?{idHash:hash(s.vehicle.id),clienteIdHash:hash(s.vehicle.clienteId),polizaIdHash:hash(s.vehicle.polizaId)}:null,policyByVehicle:s.policyByVehicle?{idHash:hash(s.policyByVehicle.id),clienteIdHash:hash(s.policyByVehicle.clienteId),numero:s.policyByVehicle.numero}:null,golden:s.golden?{idHash:hash(s.golden.id),numero:s.golden.numero,prima:s.golden.prima,primaTotal:s.golden.primaTotal}:null,sharedBusiness:s.sharedBusiness?{idHash:hash(s.sharedBusiness.id),etapa:s.sharedBusiness.etapa,asesorIdHash:hash(s.sharedBusiness.asesorId)}:null,receipt:s.receipt?{idHash:hash(s.receipt.id),clienteIdHash:hash(s.receipt.clienteId),polizaIdHash:hash(s.receipt.polizaId)}:null,cartera:s.cartera?{idHash:hash(s.cartera.id),clienteIdHash:hash(s.cartera.clienteId),polizaIdHash:hash(s.cartera.polizaId)}:null,cobro:s.cobro?{idHash:hash(s.cobro.id),clienteIdHash:hash(s.cobro.clienteId),polizaIdHash:hash(s.cobro.polizaId)}:null,counts:s.counts};}
function sameRecord(a,b,key){need(a?.[key]&&b?.[key],`PERSISTENCE_${key.toUpperCase()}_MISSING`);need(JSON.stringify(sanitize({[key]:a[key]})[key])===JSON.stringify(sanitize({[key]:b[key]})[key]),`PERSISTENCE_${key.toUpperCase()}_DRIFT`);}

const admin=initializeApp({credential:cert(sa()),projectId:PROJECT},'gravicentra-i4a-persistence-reload-v1'),auth=getAuth(admin),db=getFirestore(admin);
const ev={schemaVersion:'gravicentra-i4a-persistence-reload-v1',gate:'I4A',proofId:'PERSISTENCE_RELOAD_READMODELS',status:'FAIL',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,role:TARGET_ROLE,productionTouched:false,dataTouched:false,writesExecuted:0,writeMutationPerformed:false,userIdentitiesRecorded:false,tokensRecorded:false,secretsRecorded:false,checks:{},errors:[]};
fs.mkdirSync(OUT,{recursive:true});let browser,ctx;
try{
  const members=await db.collection('tenants').doc(TENANT).collection('members').get(),listed=await auth.listUsers(1000),users=new Map(listed.users.map(u=>[u.uid,u]));let selected=null;
  for(const d of members.docs){const m=d.data()||{},uid=clean(m.uid||d.id),u=users.get(uid),rs=roles(m);if(!u||u.disabled||!u.emailVerified||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;if(rs.includes(TARGET_ROLE)){selected={uid,active:active(m,rs),roles:rs};if(selected.active===TARGET_ROLE)break;}}
  need(selected,'I4A_DIRECTION_MEMBER_UNAVAILABLE');
  const token=await auth.createCustomToken(selected.uid,{gravicentraI4AReadOnly:true});browser=await chromium.launch({headless:true});ctx=await browser.newContext({viewport:{width:1440,height:1000}});const page=await ctx.newPage(),tel=telemetry(page);page.setDefaultTimeout(15000);
  await initial(page,token);await waitEvidence(page,'baseline');const base=await page.evaluate(snapshotScript);need(base.activeRole===TARGET_ROLE,'BASE_ROLE_INVALID');need(base.vehicle&&base.policyByVehicle&&base.vehicle.clienteId===base.policyByVehicle.clienteId&&base.vehicle.polizaId===base.policyByVehicle.id,'BASE_VEHICLE_RELATION_INVALID');need(base.golden&&base.golden.numero==='AUTO39012'&&base.golden.prima===1800&&Math.abs(base.golden.primaTotal-2678.53)<0.001,'BASE_GOLDEN_POLICY_INVALID');need(base.receipt&&base.cartera&&base.cobro,'BASE_FINANCIAL_READMODEL_MISSING');

  await gotoRoute(page,'#/cliente360?c='+encodeURIComponent(base.clientId)+'&t=vehiculos','cliente360');await waitEvidence(page,'cliente360');const msClient=await reloadOnRoute(page,'cliente360','cliente360');const c1=await page.evaluate(snapshotScript);need(c1.activeRole===TARGET_ROLE,'CLIENTE360_ROLE_DRIFT_AFTER_RELOAD');sameRecord(base,c1,'vehicle');sameRecord(base,c1,'policyByVehicle');need(await page.locator('#host .ftab[data-tab="vehiculos"].active').count()===1,'CLIENTE360_VEHICLE_TAB_NOT_RESTORED');need(await page.getByRole('button',{name:/^Ver póliza$/i}).count()>0,'CLIENTE360_VEHICLE_ACTION_NOT_RESTORED');ev.checks.cliente360Vehiculos={pass:true,reloadMs:msClient,before:sanitize(base).vehicle,after:sanitize(c1).vehicle};

  await gotoRoute(page,'#/ops','ops');await waitEvidence(page,'ops');const opsBase=await page.evaluate(snapshotScript);need(opsBase.activeRole===TARGET_ROLE,'OPS_ROLE_INVALID');need(opsBase.sharedBusiness,'BASE_OPS_LEADS_SHARED_BUSINESS_MISSING');base.sharedBusiness=opsBase.sharedBusiness;need(await page.locator(`[data-neg="${base.sharedBusiness.id}"]`).count()>0,'OPS_SHARED_BUSINESS_NOT_RENDERED_BEFORE_RELOAD');const msOps=await reloadOnRoute(page,'ops','ops');const o1=await page.evaluate(snapshotScript);need(o1.activeRole===TARGET_ROLE,'OPS_ROLE_DRIFT_AFTER_RELOAD');sameRecord(base,o1,'sharedBusiness');need(await page.locator(`[data-neg="${base.sharedBusiness.id}"]`).count()>0,'OPS_SHARED_BUSINESS_NOT_RENDERED_AFTER_RELOAD');ev.checks.ops={pass:true,reloadMs:msOps,businessIdHash:hash(base.sharedBusiness.id),samePersistedRecord:true};

  await gotoRoute(page,'#/leads','leads');await waitEvidence(page,'leads');need(await page.locator(`[data-neg="${base.sharedBusiness.id}"]`).count()>0,'LEADS_SHARED_BUSINESS_NOT_RENDERED_BEFORE_RELOAD');const leadsBase=await page.evaluate(snapshotScript);sameRecord(base,leadsBase,'sharedBusiness');const msLeads=await reloadOnRoute(page,'leads','leads');const l1=await page.evaluate(snapshotScript);need(l1.activeRole===TARGET_ROLE,'LEADS_ROLE_DRIFT_AFTER_RELOAD');sameRecord(base,l1,'sharedBusiness');need(await page.locator(`[data-neg="${base.sharedBusiness.id}"]`).count()>0,'LEADS_SHARED_BUSINESS_NOT_RENDERED_AFTER_RELOAD');ev.checks.leads={pass:true,reloadMs:msLeads,businessIdHash:hash(base.sharedBusiness.id),samePersistedRecord:true,synchronizedWithOps:true};

  await gotoRoute(page,'#/polizas','polizas');await waitEvidence(page,'polizas');const msPol=await reloadOnRoute(page,'polizas','polizas');const p1=await page.evaluate(snapshotScript);need(p1.activeRole===TARGET_ROLE,'POLIZAS_ROLE_DRIFT_AFTER_RELOAD');sameRecord(base,p1,'golden');need(p1.golden.numero==='AUTO39012'&&p1.golden.prima===1800&&Math.abs(p1.golden.primaTotal-2678.53)<0.001,'POLIZAS_GOLDEN_DRIFT_AFTER_RELOAD');ev.checks.polizas={pass:true,reloadMs:msPol,golden:sanitize(p1).golden};

  await gotoRoute(page,'#/cobros','cobros');await waitEvidence(page,'cobros');const msCob=await reloadOnRoute(page,'cobros','cobros');const f1=await page.evaluate(snapshotScript);need(f1.activeRole===TARGET_ROLE,'COBROS_ROLE_DRIFT_AFTER_RELOAD');sameRecord(base,f1,'receipt');sameRecord(base,f1,'cartera');sameRecord(base,f1,'cobro');need(f1.counts.recibosEsperados>0&&f1.counts.carteraPrimas>0&&f1.counts.cobros>0,'FINANCIAL_COUNTS_INVALID_AFTER_RELOAD');ev.checks.financialReadModels={pass:true,reloadMs:msCob,receipt:sanitize(f1).receipt,cartera:sanitize(f1).cartera,cobro:sanitize(f1).cobro,counts:f1.counts,semanticSeparation:true};

  const ts=telSummary(tel);need(ts.consoleErrorCount===0&&ts.pageErrorCount===0&&ts.sameOriginRequestFailureCount===0&&ts.sameOriginHttpErrorCount===0,'PERSISTENCE_BROWSER_TELEMETRY_ERRORS:'+JSON.stringify(ts));ev.telemetry=ts;ev.status='PASS';
}catch(e){ev.errors.push(String(e?.message||e));process.exitCode=1;}finally{if(ctx)await ctx.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});await deleteApp(admin).catch(()=>{});fs.writeFileSync(path.join(OUT,'i4a-persistence-reload.json'),JSON.stringify(ev,null,2)+'\n');console.log('I4A_PERSISTENCE_RELOAD_STATUS='+ev.status);console.log('I4A_PERSISTENCE_RELOAD_WRITES=0');console.log('I4A_PERSISTENCE_RELOAD_ERRORS='+ev.errors.join(' | '));}
