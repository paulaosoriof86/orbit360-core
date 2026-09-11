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
const DATA_PATH=name=>`tenants/${TENANT}/data/${name}/items`;
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
    const ops=(Orbit?.ciclo?.opsBoard?.()||[]).flatMap(c=>c.items||[]);
    const leads=(Orbit?.ciclo?.leadsBoard?.()||[]).flatMap(c=>c.items||[]);
    const app=Orbit?.productAppP0?.status?.()||{};
    return {
      route:Orbit?.route?.key||'',
      app:{started:app.started===true,routerStarted:app.routerStarted===true,tenantContextReady:app.tenantContextReady===true,operationalWriteReady:app.operationalWriteReady===true},
      serverConfirmedCollections:Array.isArray(st.serverConfirmedCollections)?st.serverConfirmedCollections:[],
      deferredCollections:Array.isArray(st.deferredCollections)?st.deferredCollections:[],
      requiredMissing:Array.isArray(st.requiredMissing)?st.requiredMissing:[],
      requiredFailed:Array.isArray(st.requiredFailed)?st.requiredFailed:[],
      counts:{clientes:count('clientes'),polizas:count('polizas'),cobros:count('cobros'),aseguradoras:count('aseguradoras'),vehiculos:count('vehiculos'),recibosEsperados:count('recibosEsperados'),carteraPrimas:count('carteraPrimas'),negocios:count('negocios'),gestiones:count('gestiones')},
      boardCounts:{opsNegocios:ops.filter(x=>x?.kind==='negocio').length,opsGestiones:ops.filter(x=>x?.kind==='gestion').length,leadsNegocios:leads.filter(x=>x?.kind==='negocio').length}
    };
  }).catch(()=>({diagnosticsUnavailable:true}));
}

async function waitEvidence(page,stage,authority){
  try{
    await page.waitForFunction(({s,a})=>{
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
      const gestiones=Orbit?.store?.all?.('gestiones')||[];
      const negocios=Orbit?.store?.all?.('negocios')||[];
      if(s==='baseline')return confirmed.has('vehiculos')&&confirmed.has('recibosEsperados')&&confirmed.has('carteraPrimas')&&vehicles.length>0&&!!golden&&receipts.length>0&&cartera.length>0&&cobros.length>0;
      if(s==='cliente360')return confirmed.has('vehiculos')&&vehicles.length>0;
      if(s==='ops')return confirmed.has('gestiones')&&(a.gestionesCount===0?gestiones.length===0:gestiones.length>0);
      if(s==='leads')return a.negociosCount===0?negocios.length===0:(confirmed.has('negocios')&&negocios.length>0);
      if(s==='polizas')return !!golden;
      if(s==='cobros')return confirmed.has('recibosEsperados')&&confirmed.has('carteraPrimas')&&receipts.length>0&&cartera.length>0&&cobros.length>0;
      return false;
    },{s:stage,a:authority},{timeout:23000});
  }catch{
    const d=await evidenceDiagnostics(page);
    throw new Error(`PERSISTENCE_STAGE_TIMEOUT:${stage}:${JSON.stringify({authority,diagnostics:d})}`);
  }
}

async function gotoRoute(page,hashValue,key){await page.evaluate(h=>{location.hash=h;},hashValue);await page.waitForFunction(k=>Orbit?.route?.key===k&&!!document.querySelector('#host .page'),key,{timeout:12000});}
async function reloadOnRoute(page,key,stage,authority){const started=Date.now();await page.reload({waitUntil:'domcontentloaded',timeout:20000});await page.waitForFunction(()=>!!Orbit?.productAppP0&&!!Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:7000});await waitApp(page,key);await waitEvidence(page,stage,authority);return Date.now()-started;}

function snapshotScript(){
  const scoped=(moduleKey,collection)=>Orbit?.access?.scopedStore?.(moduleKey)?.all?.(collection)||[];
  const clients=scoped('cliente360','clientes');
  const clientIds=new Set(clients.map(x=>x.id));
  const vehicles=(Orbit?.store?.all?.('vehiculos')||[]).filter(v=>clientIds.has(v.clienteId)&&v.polizaId&&Orbit.store.get('polizas',v.polizaId));
  const vehicle=vehicles[0]||null;
  const policyByVehicle=vehicle?Orbit.store.get('polizas',vehicle.polizaId):null;
  const golden=(Orbit?.store?.all?.('polizas')||[]).find(p=>String(p.numero||'')==='AUTO39012')||null;
  const opsItems=(Orbit?.ciclo?.opsBoard?.()||[]).flatMap(c=>c.items||[]);
  const leadsItems=(Orbit?.ciclo?.leadsBoard?.()||[]).flatMap(c=>c.items||[]);
  const visibleGestion=opsItems.find(x=>x?.kind==='gestion')?.rec||null;
  const rawGestion=(Orbit?.store?.all?.('gestiones')||[])[0]||null;
  const visibleNegocio=leadsItems.find(x=>x?.kind==='negocio')?.rec||null;
  const rawNegocio=(Orbit?.store?.all?.('negocios')||[])[0]||null;
  const receipts=Orbit?.store?.all?.('recibosEsperados')||[];
  const cartera=Orbit?.store?.all?.('carteraPrimas')||[];
  const cobros=Orbit?.store?.all?.('cobros')||[];
  return {
    activeRole:Orbit?.session?.rol?.()||'',
    clientId:vehicle?.clienteId||clients[0]?.id||'',
    vehicle:vehicle?{id:vehicle.id,clienteId:vehicle.clienteId,polizaId:vehicle.polizaId}:null,
    policyByVehicle:policyByVehicle?{id:policyByVehicle.id,clienteId:policyByVehicle.clienteId,numero:policyByVehicle.numero||''}:null,
    golden:golden?{id:golden.id,numero:golden.numero||'',prima:Number(golden.prima??golden.primaNeta??0),primaTotal:Number(golden.primaTotal??0)}:null,
    gestion:(visibleGestion||rawGestion)?{id:(visibleGestion||rawGestion).id,estado:(visibleGestion||rawGestion).estado||'',lista:(visibleGestion||rawGestion).lista||'',visible:!!visibleGestion}:null,
    negocio:(visibleNegocio||rawNegocio)?{id:(visibleNegocio||rawNegocio).id,etapa:(visibleNegocio||rawNegocio).etapa||'',asesorId:(visibleNegocio||rawNegocio).asesorId||'',visible:!!visibleNegocio}:null,
    opsNegocioCount:opsItems.filter(x=>x?.kind==='negocio').length,
    opsGestionCount:opsItems.filter(x=>x?.kind==='gestion').length,
    leadsNegocioCount:leadsItems.filter(x=>x?.kind==='negocio').length,
    receipt:receipts[0]?{id:receipts[0].id,clienteId:receipts[0].clienteId||'',polizaId:receipts[0].polizaId||''}:null,
    cartera:cartera[0]?{id:cartera[0].id,clienteId:cartera[0].clienteId||'',polizaId:cartera[0].polizaId||''}:null,
    cobro:cobros[0]?{id:cobros[0].id,clienteId:cobros[0].clienteId||'',polizaId:cobros[0].polizaId||''}:null,
    counts:{clientes:(Orbit.store.all('clientes')||[]).length,polizas:(Orbit.store.all('polizas')||[]).length,vehiculos:(Orbit.store.all('vehiculos')||[]).length,recibosEsperados:receipts.length,carteraPrimas:cartera.length,cobros:cobros.length,negocios:(Orbit.store.all('negocios')||[]).length,gestiones:(Orbit.store.all('gestiones')||[]).length}
  };
}
function sanitize(s){return{activeRole:s.activeRole,clientIdHash:s.clientId?hash(s.clientId):'',vehicle:s.vehicle?{idHash:hash(s.vehicle.id),clienteIdHash:hash(s.vehicle.clienteId),polizaIdHash:hash(s.vehicle.polizaId)}:null,policyByVehicle:s.policyByVehicle?{idHash:hash(s.policyByVehicle.id),clienteIdHash:hash(s.policyByVehicle.clienteId),numero:s.policyByVehicle.numero}:null,golden:s.golden?{idHash:hash(s.golden.id),numero:s.golden.numero,prima:s.golden.prima,primaTotal:s.golden.primaTotal}:null,gestion:s.gestion?{idHash:hash(s.gestion.id),estado:s.gestion.estado,lista:s.gestion.lista,visible:s.gestion.visible}:null,negocio:s.negocio?{idHash:hash(s.negocio.id),etapa:s.negocio.etapa,asesorIdHash:hash(s.negocio.asesorId),visible:s.negocio.visible}:null,opsNegocioCount:s.opsNegocioCount,opsGestionCount:s.opsGestionCount,leadsNegocioCount:s.leadsNegocioCount,receipt:s.receipt?{idHash:hash(s.receipt.id),clienteIdHash:hash(s.receipt.clienteId),polizaIdHash:hash(s.receipt.polizaId)}:null,cartera:s.cartera?{idHash:hash(s.cartera.id),clienteIdHash:hash(s.cartera.clienteId),polizaIdHash:hash(s.cartera.polizaId)}:null,cobro:s.cobro?{idHash:hash(s.cobro.id),clienteIdHash:hash(s.cobro.clienteId),polizaIdHash:hash(s.cobro.polizaId)}:null,counts:s.counts};}
function sameRecord(a,b,key){need(a?.[key]&&b?.[key],`PERSISTENCE_${key.toUpperCase()}_MISSING`);need(JSON.stringify(sanitize({[key]:a[key]})[key])===JSON.stringify(sanitize({[key]:b[key]})[key]),`PERSISTENCE_${key.toUpperCase()}_DRIFT`);}

const admin=initializeApp({credential:cert(sa()),projectId:PROJECT},'gravicentra-i4a-persistence-reload-v1'),auth=getAuth(admin),db=getFirestore(admin);
const ev={schemaVersion:'gravicentra-i4a-persistence-reload-v1',gate:'I4A',proofId:'PERSISTENCE_RELOAD_READMODELS',status:'FAIL',sourceSha:SOURCE,buildId:BUILD,previewUrl:PREVIEW,role:TARGET_ROLE,productionTouched:false,dataTouched:false,writesExecuted:0,writeMutationPerformed:false,userIdentitiesRecorded:false,tokensRecorded:false,secretsRecorded:false,authority:{},checks:{},errors:[]};
fs.mkdirSync(OUT,{recursive:true});let browser,ctx;
try{
  const [negociosSnap,gestionesSnap]=await Promise.all([db.collection(DATA_PATH('negocios')).get(),db.collection(DATA_PATH('gestiones')).get()]);
  const authority={negociosCount:negociosSnap.size,gestionesCount:gestionesSnap.size};
  ev.authority={source:'firebase-admin-direct-server-read',paths:{negocios:'tenants/{tenant}/data/negocios/items',gestiones:'tenants/{tenant}/data/gestiones/items'},...authority};

  const members=await db.collection('tenants').doc(TENANT).collection('members').get(),listed=await auth.listUsers(1000),users=new Map(listed.users.map(u=>[u.uid,u]));let selected=null;
  for(const d of members.docs){const m=d.data()||{},uid=clean(m.uid||d.id),u=users.get(uid),rs=roles(m);if(!u||u.disabled||!u.emailVerified||!['active','activo'].includes(clean(m.status||m.estado).toLowerCase()))continue;if(rs.includes(TARGET_ROLE)){selected={uid,active:active(m,rs),roles:rs};if(selected.active===TARGET_ROLE)break;}}
  need(selected,'I4A_DIRECTION_MEMBER_UNAVAILABLE');
  const token=await auth.createCustomToken(selected.uid,{gravicentraI4AReadOnly:true});browser=await chromium.launch({headless:true});ctx=await browser.newContext({viewport:{width:1440,height:1000}});const page=await ctx.newPage(),tel=telemetry(page);page.setDefaultTimeout(15000);
  await initial(page,token);await waitEvidence(page,'baseline',authority);const base=await page.evaluate(snapshotScript);need(base.activeRole===TARGET_ROLE,'BASE_ROLE_INVALID');need(base.vehicle&&base.policyByVehicle&&base.vehicle.clienteId===base.policyByVehicle.clienteId&&base.vehicle.polizaId===base.policyByVehicle.id,'BASE_VEHICLE_RELATION_INVALID');need(base.golden&&base.golden.numero==='AUTO39012'&&base.golden.prima===1800&&Math.abs(base.golden.primaTotal-2678.53)<0.001,'BASE_GOLDEN_POLICY_INVALID');need(base.receipt&&base.cartera&&base.cobro,'BASE_FINANCIAL_READMODEL_MISSING');

  await gotoRoute(page,'#/cliente360?c='+encodeURIComponent(base.clientId)+'&t=vehiculos','cliente360');await waitEvidence(page,'cliente360',authority);const msClient=await reloadOnRoute(page,'cliente360','cliente360',authority);const c1=await page.evaluate(snapshotScript);need(c1.activeRole===TARGET_ROLE,'CLIENTE360_ROLE_DRIFT_AFTER_RELOAD');sameRecord(base,c1,'vehicle');sameRecord(base,c1,'policyByVehicle');need(await page.locator('#host .ftab[data-tab="vehiculos"].active').count()===1,'CLIENTE360_VEHICLE_TAB_NOT_RESTORED');need(await page.getByRole('button',{name:/^Ver póliza$/i}).count()>0,'CLIENTE360_VEHICLE_ACTION_NOT_RESTORED');ev.checks.cliente360Vehiculos={pass:true,reloadMs:msClient,before:sanitize(base).vehicle,after:sanitize(c1).vehicle};

  await gotoRoute(page,'#/ops','ops');await waitEvidence(page,'ops',authority);const opsBase=await page.evaluate(snapshotScript);need(opsBase.activeRole===TARGET_ROLE,'OPS_ROLE_INVALID');
  if(authority.gestionesCount>0){need(opsBase.gestion,'OPS_AUTHORITATIVE_GESTION_NOT_LOADED');const selectedGestion=opsBase.gestion;if(selectedGestion.visible)need(await page.locator(`[data-ges="${selectedGestion.id}"]`).count()>0,'OPS_GESTION_NOT_RENDERED_BEFORE_RELOAD');const msOps=await reloadOnRoute(page,'ops','ops',authority);const o1=await page.evaluate(snapshotScript);need(o1.activeRole===TARGET_ROLE,'OPS_ROLE_DRIFT_AFTER_RELOAD');need(o1.gestion&&o1.gestion.id===selectedGestion.id,'PERSISTENCE_GESTION_ID_DRIFT');need(o1.gestion.estado===selectedGestion.estado&&o1.gestion.lista===selectedGestion.lista,'PERSISTENCE_GESTION_STATE_DRIFT');if(selectedGestion.visible)need(await page.locator(`[data-ges="${selectedGestion.id}"]`).count()>0,'OPS_GESTION_NOT_RENDERED_AFTER_RELOAD');ev.checks.ops={pass:true,reloadMs:msOps,authorityGestionesCount:authority.gestionesCount,gestion:{idHash:hash(selectedGestion.id),estado:selectedGestion.estado,lista:selectedGestion.lista,visible:selectedGestion.visible},samePersistedRecord:true};}
  else{need(opsBase.counts.gestiones===0,'OPS_CLIENT_GESTIONES_NOT_EMPTY');const msOps=await reloadOnRoute(page,'ops','ops',authority);const o1=await page.evaluate(snapshotScript);need(o1.counts.gestiones===0,'OPS_EMPTY_GESTIONES_DRIFT');ev.checks.ops={pass:true,reloadMs:msOps,authorityGestionesCount:0,authoritativeEmpty:true};}

  await gotoRoute(page,'#/leads','leads');await waitEvidence(page,'leads',authority);const leadsBase=await page.evaluate(snapshotScript);
  if(authority.negociosCount===0){need(leadsBase.counts.negocios===0&&leadsBase.leadsNegocioCount===0&&leadsBase.opsNegocioCount===0,'LEADS_AUTHORITATIVE_EMPTY_PROJECTION_MISMATCH_BEFORE_RELOAD');need(await page.locator('#host [data-neg]').count()===0,'LEADS_EMPTY_UI_HAS_NEGOCIO_BEFORE_RELOAD');need(await page.locator('#host .kempty').count()>0,'LEADS_EMPTY_UI_NOT_RENDERED_BEFORE_RELOAD');const msLeads=await reloadOnRoute(page,'leads','leads',authority);const l1=await page.evaluate(snapshotScript);need(l1.counts.negocios===0&&l1.leadsNegocioCount===0&&l1.opsNegocioCount===0,'LEADS_AUTHORITATIVE_EMPTY_PROJECTION_MISMATCH_AFTER_RELOAD');need(await page.locator('#host [data-neg]').count()===0,'LEADS_EMPTY_UI_HAS_NEGOCIO_AFTER_RELOAD');need(await page.locator('#host .kempty').count()>0,'LEADS_EMPTY_UI_NOT_RENDERED_AFTER_RELOAD');ev.checks.leads={pass:true,reloadMs:msLeads,authorityNegociosCount:0,authoritativeEmpty:true,opsProjectionCount:0,leadsProjectionCount:0,synchronizedWithOps:true};}
  else{need(leadsBase.negocio,'LEADS_AUTHORITATIVE_NEGOCIO_NOT_LOADED');const selectedNegocio=leadsBase.negocio;if(selectedNegocio.visible)need(await page.locator(`[data-neg="${selectedNegocio.id}"]`).count()>0,'LEADS_NEGOCIO_NOT_RENDERED_BEFORE_RELOAD');const msLeads=await reloadOnRoute(page,'leads','leads',authority);const l1=await page.evaluate(snapshotScript);need(l1.negocio&&l1.negocio.id===selectedNegocio.id,'PERSISTENCE_NEGOCIO_ID_DRIFT');need(l1.negocio.etapa===selectedNegocio.etapa&&l1.negocio.asesorId===selectedNegocio.asesorId,'PERSISTENCE_NEGOCIO_STATE_DRIFT');if(selectedNegocio.visible)need(await page.locator(`[data-neg="${selectedNegocio.id}"]`).count()>0,'LEADS_NEGOCIO_NOT_RENDERED_AFTER_RELOAD');ev.checks.leads={pass:true,reloadMs:msLeads,authorityNegociosCount:authority.negociosCount,negocio:{idHash:hash(selectedNegocio.id),etapa:selectedNegocio.etapa,asesorIdHash:hash(selectedNegocio.asesorId),visible:selectedNegocio.visible},samePersistedRecord:true,synchronizedWithOps:true};}

  await gotoRoute(page,'#/polizas','polizas');await waitEvidence(page,'polizas',authority);const msPol=await reloadOnRoute(page,'polizas','polizas',authority);const p1=await page.evaluate(snapshotScript);need(p1.activeRole===TARGET_ROLE,'POLIZAS_ROLE_DRIFT_AFTER_RELOAD');sameRecord(base,p1,'golden');need(p1.golden.numero==='AUTO39012'&&p1.golden.prima===1800&&Math.abs(p1.golden.primaTotal-2678.53)<0.001,'POLIZAS_GOLDEN_DRIFT_AFTER_RELOAD');ev.checks.polizas={pass:true,reloadMs:msPol,golden:sanitize(p1).golden};

  await gotoRoute(page,'#/cobros','cobros');await waitEvidence(page,'cobros',authority);const msCob=await reloadOnRoute(page,'cobros','cobros',authority);const f1=await page.evaluate(snapshotScript);need(f1.activeRole===TARGET_ROLE,'COBROS_ROLE_DRIFT_AFTER_RELOAD');sameRecord(base,f1,'receipt');sameRecord(base,f1,'cartera');sameRecord(base,f1,'cobro');need(f1.counts.recibosEsperados>0&&f1.counts.carteraPrimas>0&&f1.counts.cobros>0,'FINANCIAL_COUNTS_INVALID_AFTER_RELOAD');ev.checks.financialReadModels={pass:true,reloadMs:msCob,receipt:sanitize(f1).receipt,cartera:sanitize(f1).cartera,cobro:sanitize(f1).cobro,counts:f1.counts,semanticSeparation:true};

  const ts=telSummary(tel);need(ts.consoleErrorCount===0&&ts.pageErrorCount===0&&ts.sameOriginRequestFailureCount===0&&ts.sameOriginHttpErrorCount===0,'PERSISTENCE_BROWSER_TELEMETRY_ERRORS:'+JSON.stringify(ts));ev.telemetry=ts;ev.status='PASS';
}catch(e){ev.errors.push(String(e?.message||e));process.exitCode=1;}finally{if(ctx)await ctx.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});await deleteApp(admin).catch(()=>{});fs.writeFileSync(path.join(OUT,'i4a-persistence-reload.json'),JSON.stringify(ev,null,2)+'\n');console.log('I4A_PERSISTENCE_RELOAD_STATUS='+ev.status);console.log('I4A_PERSISTENCE_RELOAD_WRITES=0');console.log('I4A_PERSISTENCE_RELOAD_ERRORS='+ev.errors.join(' | '));}
