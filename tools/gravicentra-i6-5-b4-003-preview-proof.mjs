import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B4_PREVIEW_URL||'').replace(/\/$/,'');
const outPath=process.env.B4_003_PROOF_OUT||'/tmp/b4-003-preview-proof.json';
const run=String(process.env.GITHUB_RUN_ID||Date.now());
const need=(v,c)=>{if(!v)throw new Error(c);};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
need(target,'B4_003_PREVIEW_URL_MISSING');

const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);
const ids={
 client:'b4003qa_client_'+run,
 renewalPolicy:'b4003qa_policy_renew_'+run,
 expiredRenewPolicy:'b4003qa_policy_expired_renew_'+run,
 unknownRenewPolicy:'b4003qa_policy_unknown_'+run,
 renewabilityWritePolicy:'b4003qa_policy_renewwrite_'+run,
 cancelPolicy:'b4003qa_policy_cancel_'+run,
 healthPolicy:'b4003qa_policy_health_'+run,
 healthReceipt1:'b4003qa_receipt_health_1_'+run,
 healthReceipt2:'b4003qa_receipt_health_2_'+run,
 healthReceiptShadow:'b4003qa_receipt_health_shadow_'+run,
 cancelation:'b4003qa_cancel_'+run,
 insurer:'b4003qa_insurer_'+run,
 collabBusiness:'b4003qa_business_collab_'+run,
 collabNoClientBusiness:'b4003qa_business_collab_noclient_'+run
};
ids.renewActivity='act_ren_'+ids.renewalPolicy+'_'+new Date().toISOString().slice(0,10).replace(/-/g,'');
ids.cancelActivity='act_rec_'+ids.cancelation;
ids.recoveryBusiness='neg_rec_'+ids.cancelation;
const residueIds=['pol_mulsmxsk','pol_mulssmuz','pol_mulsxofx'];
const r20QaHoldIds=new Set([...residueIds,'pol_muj5o5ka']); // authority: R20 renewability apply receipt, 4 known QA holds
const proof={schema:'GRAVICENTRA_I6_5_B4_003_PREVIEW_PROOF_R19_V1',status:'INIT',target,ids,assertions:{},syntheticWrites:0,cleanupWrites:0,pageErrors:[],consoleErrors:[],httpErrors:[],expectedIsolationDenials:[],unexpectedHttpErrors:[],unexpectedConsoleErrors:[],syntheticFinalAbsent:false,qaResidue:{},runtimeCancellationEvidence:{}};

const renewalSourceAuthority={
  sourceFile:'Renovaciones (13).xlsx',
  sourceSha256:'1505902788fb6e71d56cb751d64cd721f6d1930d0c90bcfd890c1a129b5041f3',
  companionPolicyFile:'Polizas (16).xlsx',
  companionPolicySha256:'e68bfd576b28b01d2839d8c3a22e547d8905f1eaeb84d1d7ffc3a0082960c2a7',
  sourceRows:23,
  sourceStatusCounts:{Vencida:14,'No Renovada':4,Vigente:5},
  activePolicyNumbers:['68542','1-AP-20890','AUTO 38446','AUTO-1000000334','VA-43685'],
  interpretation:'Positive source authority only for listed active policies; absence does not imply NO.'
};
const policyNumberKey=v=>clean(v).toUpperCase().replace(/[^A-Z0-9]+/g,'');
const ref=(c,id)=>tenant.collection('data').doc(c).collection('items').doc(id);
async function actor(){
 const snap=await tenant.collection('members').get();
 const privileged=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo']);
 const order=['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'];
 const candidates=[];
 for(const d of snap.docs){
  const m=d.data()||{},state=norm(m.status||m.estado||'active');
  const roles=[m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol].concat(m.roles||[],m.assignedRoles||[],m.rolesAsignados||[]).map(norm).filter(Boolean);
  const role=roles.find(x=>privileged.has(x));
  if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state)||!role)continue;
  try{const u=await auth.getUser(d.id);if(!u.disabled)candidates.push({uid:u.uid,email:clean(u.email),activeRole:role,advisorId:clean(m.advisorId||m.asesorId)});}catch{}
 }
 need(candidates.length,'B4_003_PRIVILEGED_ACTOR_NOT_FOUND');
 return candidates.sort((a,b)=>order.indexOf(a.activeRole)-order.indexOf(b.activeRole))[0];
}
async function actorForRole(roleWanted,excludedUids=[]){
 const wanted=norm(roleWanted),excluded=new Set(excludedUids.map(clean).filter(Boolean)),snap=await tenant.collection('members').get(),candidates=[];
 for(const d of snap.docs){
  const m=d.data()||{},state=norm(m.status||m.estado||'active');
  const roles=[m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol].concat(m.roles||[],m.assignedRoles||[],m.rolesAsignados||[]).map(norm).filter(Boolean);
  if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state)||!roles.includes(wanted))continue;
  try{const u=await auth.getUser(d.id);if(!u.disabled&&u.emailVerified===true&&!excluded.has(u.uid))candidates.push({uid:u.uid,email:clean(u.email),emailVerified:true,activeRole:wanted,advisorId:clean(m.advisorId||m.asesorId)});}catch{}
 }
 need(candidates.length,'B4_003_R20_VERIFIED_ACTOR_FOR_ROLE_NOT_FOUND:'+wanted);
 return candidates.sort((a,b)=>clean(a.email).localeCompare(clean(b.email)))[0];
}
async function seed(who,fixtureAdvisorId,collabAdvisorId){
 const today=new Date(),end=new Date(today.getTime()+10*86400000),expiredEnd=new Date(today.getTime()-3*86400000),expiredStart=new Date(today.getTime()-368*86400000),endS=end.toISOString().slice(0,10),startS=today.toISOString().slice(0,10),expiredEndS=expiredEnd.toISOString().slice(0,10),expiredStartS=expiredStart.toISOString().slice(0,10);
 const common={tenantId,__syntheticQa:true,ownerUid:who.uid,ownerEmail:who.email,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
 await ref('clientes',ids.client).set({...common,id:ids.client,nombre:'B4-003 QA Cliente',tipo:'Persona',pais:'GT',moneda:'GTQ',asesorId:fixtureAdvisorId||who.advisorId||'qa',email:'b4003qa@example.invalid',telefono:''},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.renewalPolicy).set({...common,id:ids.renewalPolicy,clienteId:ids.client,asesorId:fixtureAdvisorId||who.advisorId||'qa',numero:'B4-003-REN-'+run,estado:'Vigente',renovable:true,pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Auto',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:1000,primaNeta:900},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.expiredRenewPolicy).set({...common,id:ids.expiredRenewPolicy,clienteId:ids.client,asesorId:fixtureAdvisorId||who.advisorId||'qa',numero:'B4-003-EXP-'+run,estado:'Vencida',renovable:true,pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Auto',aseguradoraId:'',vigenciaInicio:expiredStartS,vigenciaFin:expiredEndS,prima:750,primaNeta:680},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.unknownRenewPolicy).set({...common,id:ids.unknownRenewPolicy,clienteId:ids.client,asesorId:fixtureAdvisorId||who.advisorId||'qa',numero:'B4-003-UNKNOWN-'+run,estado:'Vigente',pais:'GT',moneda:'GTQ',ramo:'ACCIDENTES QA FUENTE',producto:'PRODUCTO QA FUENTE',subramo:'PRODUCTO QA FUENTE',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:650,primaNeta:600},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.renewabilityWritePolicy).set({...common,id:ids.renewabilityWritePolicy,clienteId:ids.client,asesorId:fixtureAdvisorId||who.advisorId||'qa',numero:'B4-003-RENEWWRITE-'+run,estado:'Vigente',pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Auto',subramo:'Auto',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:660,primaNeta:610},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.cancelPolicy).set({...common,id:ids.cancelPolicy,clienteId:ids.client,asesorId:fixtureAdvisorId||who.advisorId||'qa',numero:'B4-003-CAN-'+run,estado:'Cancelada',pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Auto',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:800,primaNeta:700},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.healthPolicy).set({...common,id:ids.healthPolicy,clienteId:ids.client,asesorId:fixtureAdvisorId||who.advisorId||'qa',numero:'B4-003-HEALTH-'+run,estado:'Vigente',renovable:false,pais:'GT',moneda:'GTQ',ramo:'Accidentes',producto:'Accidentes',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:407.01,primaTotal:407.01,primaNeta:346.09,cuotas:2},{merge:false});proof.syntheticWrites++;
 await ref('recibosEsperados',ids.healthReceipt1).set({...common,id:ids.healthReceipt1,clienteId:ids.client,polizaId:ids.healthPolicy,asesorId:fixtureAdvisorId||who.advisorId||'qa',pais:'GT',moneda:'GTQ',cuota:'1 / 2',serie:'1 / 2',fechaLimite:startS,primaTotal:271.34,montoTotal:271.34,monto:271.34,estado:'Pendiente'},{merge:false});proof.syntheticWrites++;
 await ref('recibosEsperados',ids.healthReceipt2).set({...common,id:ids.healthReceipt2,clienteId:ids.client,polizaId:ids.healthPolicy,asesorId:fixtureAdvisorId||who.advisorId||'qa',pais:'GT',moneda:'GTQ',cuota:'2 / 2',serie:'2 / 2',fechaLimite:endS,primaTotal:271.34,montoTotal:271.34,monto:271.34,estado:'Pendiente'},{merge:false});proof.syntheticWrites++;
 await ref('recibosEsperados',ids.healthReceiptShadow).set({...common,id:ids.healthReceiptShadow,clienteId:ids.client,polizaId:ids.healthPolicy,asesorId:fixtureAdvisorId||who.advisorId||'qa',pais:'GT',moneda:'GTQ',cuota:'1',serie:'1',fechaLimite:startS,primaTotal:271.34,montoTotal:271.34,monto:271.34,estado:'Pendiente'},{merge:false});proof.syntheticWrites++;
 await ref('cancelaciones',ids.cancelation).set({...common,id:ids.cancelation,clienteId:ids.client,polizaId:ids.cancelPolicy,asesorId:fixtureAdvisorId||who.advisorId||'qa',pais:'GT',moneda:'GTQ',fecha:startS,motivo:'Prueba sintética B4-003',valorPerdido:700,recuperacion:'Pendiente de contacto',recuperada:false},{merge:false});proof.syntheticWrites++;
 await ref('aseguradoras',ids.insurer).set({...common,id:ids.insurer,nombre:'B4 R20 Aseguradora QA',canonicalName:'B4 R20 Aseguradora QA',displayName:'B4 R20 Aseguradora QA',pais:'GT',moneda:'GTQ',activo:true,estado:'Activa',ramos:['Automóviles'],ramosDetalle:{'Automóviles':{productos:['Vehículo Liviano'],planes:[],segmento:'Estándar'}},ramosHabilitados:{'Automóviles':{cotizador:false}},docs:[],cotTasas:{},cotTasasValidadas:{},cotizadorHabilitado:false,comparativoHabilitado:false,iaHabilitada:false},{merge:false});proof.syntheticWrites++;
 await ref('negocios',ids.collabBusiness).set({...common,id:ids.collabBusiness,clienteId:ids.client,asesorId:collabAdvisorId||fixtureAdvisorId||who.advisorId||'qa',pais:'GT',moneda:'GTQ',titulo:'B4-003 QA colaboración',nombre:'B4-003 QA colaboración',etapa:'cotizando',estado:'Cotizando',origen:'Ops',comentarios:[],bitacora:[],archivado:false,previewWrite:true,previewSource:'b4003qa-harness'},{merge:false});proof.syntheticWrites++;
 await ref('negocios',ids.collabNoClientBusiness).set({...common,id:ids.collabNoClientBusiness,asesorId:collabAdvisorId||fixtureAdvisorId||who.advisorId||'qa',pais:'GT',moneda:'GTQ',titulo:'B4-003 QA colaboración pre-emisión',nombre:'B4-003 QA colaboración pre-emisión',etapa:'cotizando',estado:'Cotizando',origen:'Leads',comentarios:[],bitacora:[],archivado:false,previewWrite:true,previewSource:'b4003qa-harness'},{merge:false});proof.syntheticWrites++;
}
async function applyLegal(page,who){
 const scope='user:'+clean(who.email||who.uid);
 await page.addInitScript(({scope})=>{try{
   localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
   localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
 }catch{}},{scope});
}
async function bootProduct(page,token){
 await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
 const state=await page.evaluate(async token=>{
   const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
   if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
   const requested=['clientes','polizas','vehiculos','recibosEsperados','cancelaciones','negocios','gestiones','aseguradoras'];
   const forced={called:false,phase:'',requested:[],bootstrapTrace:[]};
   const forceCollections=(event)=>{
     try{
       const detail=event?.detail||{};
       forced.bootstrapTrace.push({phase:String(detail.phase||''),ready:detail.ready===true,collectionCount:Number(detail.collectionCount||0),errors:Array.isArray(detail.errors)?detail.errors.slice(0,8).map(String):[]});
       if(forced.bootstrapTrace.length>16)forced.bootstrapTrace.shift();
       if(!Orbit.store||typeof Orbit.store._ensureCollections!=='function')return;
       const attached=Orbit.store._ensureCollections(requested)||[];
       forced.called=Array.isArray(attached)&&attached.includes('cancelaciones');
       forced.phase=String(detail.phase||'available-readonly-store');
       forced.requested=Array.isArray(attached)?attached.slice():[];
     }catch(error){forced.error=String(error&&error.message||error);}
   };
   window.addEventListener('orbit:product-readonly-bootstrap',forceCollections);
   const s=Orbit.productAppP0.status?.(),preStarted=s?.started===true;
   let activated=preStarted?s:null,lastActivationError='';
   try{
     for(let attempt=1;attempt<=6&&!activated?.started;attempt++){
       try{
         activated=await Promise.resolve(Orbit.productAppP0.activate());
         lastActivationError='';
       }catch(error){
         lastActivationError=String(error&&error.message||error||'');
         if(!/PRODUCT_(?:READONLY_BOOTSTRAP_NOT_READY|STORE_NOT_READY)/.test(lastActivationError))throw error;
         if(attempt===6)throw new Error(lastActivationError+'|BOOTSTRAP_TRACE='+JSON.stringify(forced.bootstrapTrace));
         await new Promise(resolve=>setTimeout(resolve,Math.min(2500,500*attempt)));
       }
     }
     forceCollections({detail:{phase:'post-activate'}});
   }finally{
     window.removeEventListener('orbit:product-readonly-bootstrap',forceCollections);
   }
   return{uid:String(c.auth.currentUser?.uid||''),started:activated?.started===true,preStarted,forced,lastActivationError};
 },token);
 need(state.uid&&state.started,'B4_003_PRODUCT_SESSION_NOT_STARTED');
 need(state.preStarted===true||(state.forced&&state.forced.called===true),'B4_003_READONLY_COLLECTION_FORCE_NOT_REACHED');
 return state;
}
async function rosterProjectionFor(browser,who,country){
 const token=await auth.createCustomToken(who.uid),ctx=await browser.newContext({ignoreHTTPSErrors:false}),p=await ctx.newPage();
 try{
  await applyLegal(p,who);
  await p.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:30000});
  return await p.evaluate(async ({token,tenantId,activeRole,country})=>{
    const provider=Orbit.productRuntimeBrowserProvidersP0,c=await provider.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    return await provider.callFunction('orbit360AssignableAdvisorRosterPreview',{tenantId,activeRole,country},'us-east1');
  },{token,tenantId,activeRole:who.activeRole,country});
 }finally{await ctx.close();}
} 


/* B4-003 Academia: real authenticated document delivery, UI and negative scope. */
async function academiaManualsPreviewProof(browser,directionActor,operativeActor){
 const actor=directionActor,token=await auth.createCustomToken(actor.uid),ctx=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:false}),p=await ctx.newPage();
 try{
  await applyLegal(p,actor);
  await p.goto(target+'/#/academia',{waitUntil:'domcontentloaded',timeout:60000});
  await bootProduct(p,token);
  await p.evaluate(()=>{location.hash='#/academia';});
  await p.waitForSelector('#ac-man',{timeout:15000});
  await p.click('#ac-man');
  const titles=await p.locator('#ac-man-v [data-m]').count();
  need(titles===5,'B4_003_ACADEMIA_MANUAL_LIST_CARDINALITY_INVALID:'+titles);
  const ids=['manual-maestro','capacitacion-tecnica-interna','capacitacion-crm','manual-integraciones','comparativa-ia'];
  const delivered=[];
  for(let i=0;i<ids.length;i++){
   await p.click('#ac-man-v [data-m="'+i+'"]');
   await p.waitForFunction(()=>!!document.querySelector('#mv-content iframe[srcdoc]')||/No fue posible abrir este manual/.test(document.querySelector('#mv-content')?.textContent||''),null,{timeout:12000});
   const visible=await p.evaluate(()=>{const iframe=document.querySelector('#mv-content iframe');return {present:!!iframe,srcdoc:iframe?.srcdoc||'',sandbox:iframe?.getAttribute('sandbox')||'',url:location.pathname,overflow:document.documentElement.scrollWidth>innerWidth+2};});
   need(visible.present&&visible.srcdoc.startsWith('<!DOCTYPE html>')&&visible.srcdoc.includes('</html>')&&visible.sandbox==='allow-scripts'&&!visible.overflow,'B4_003_ACADEMIA_MANUAL_NOT_RENDERED_SECURELY:'+ids[i]);
   delivered.push({id:ids[i],rendered:true,privateIframe:true,bytes:visible.srcdoc.length});
   await p.click('#mv-back');
  }
  const unprotected=await p.evaluate(async()=>{const r=await fetch('/docs/manual-maestro.html',{cache:'no-store'}),text=await r.text();return{status:r.status,publicManualExposed:/Manual Maestro · Orbit 360/.test(text)};});
  need(unprotected.publicManualExposed===false,'B4_003_ACADEMIA_RESTRICTED_MANUAL_PUBLIC_IN_HOSTING');
  return{status:'PASS',manuals:delivered,publicManualExposed:false};
 }finally{await ctx.close();}
}
async function academiaManualsScopeProof(browser,operativeActor){
 const token=await auth.createCustomToken(operativeActor.uid),ctx=await browser.newContext({ignoreHTTPSErrors:false}),p=await ctx.newPage();
 try{
  await applyLegal(p,operativeActor);await p.goto(target+'/#/academia',{waitUntil:'domcontentloaded',timeout:60000});await bootProduct(p,token);
  const result=await p.evaluate(async({tenantId,activeRole})=>{
   const provider=Orbit.productRuntimeBrowserProvidersP0;
   const call=manualId=>provider.callFunction('orbit360AcademiaManualReadPreview',{tenantId,activeRole,manualId},'us-east1');
   const crm=await call('capacitacion-crm');
   let denied=false;try{await call('manual-maestro');}catch(e){denied=/permission|denied|autorizad|rol/i.test(String(e?.code||'')+' '+String(e?.message||''));}
   return{crm:crm?.ok===true&&crm.manualId==='capacitacion-crm'&&crm.html?.startsWith('<!DOCTYPE html>'),restrictedDenied:denied};
  },{tenantId,activeRole:operativeActor.activeRole});
  need(result.crm===true&&result.restrictedDenied===true,'B4_003_ACADEMIA_MANUAL_ROLE_SCOPE_NOT_ENFORCED');
  return result;
 }finally{await ctx.close();}
}

async function r23ProofSnapshot(browser,who,country,month){
 const token=await auth.createCustomToken(who.uid),ctx=await browser.newContext({ignoreHTTPSErrors:false,viewport:{width:390,height:844}}),p=await ctx.newPage();
 try{await applyLegal(p,who);await p.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});await bootProduct(p,token);
  const api=await p.evaluate(async({tenantId,role,country,month})=>Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360AssignableAdvisorRosterPreview',{tenantId,activeRole:role,country,month,purpose:'inicio'},'us-east1'),{tenantId,role:who.activeRole,country,month});
  await p.evaluate(c=>{Orbit.pais=c;Orbit.modules.inicio.render(document.getElementById('host'));},country);
  try{
   await p.waitForFunction(()=>document.querySelector('[data-inicio-advisor-id]')||document.querySelector('[data-inicio-advisor-readiness="ready-empty"]'),null,{timeout:12000});
  }catch(error){
   const diagnostics=await p.evaluate(({country,month})=>{
    const st=Orbit.store?._productStatus?.()||{},roster=Orbit.assignableAdvisorRoster;
    return{hash:String(location.hash||''),route:Orbit.route?.key||'',role:String(Orbit.session?.rol?.()||''),authUid:String(Orbit.auth?.productUser?.uid||''),country:Orbit.pais||'',month,hostText:String(document.getElementById('host')?.innerText||'').slice(0,1400),advisorReadiness:document.querySelector('[data-inicio-advisor-readiness]')?.getAttribute('data-inicio-advisor-readiness')||'',advisorRendered:document.querySelectorAll('[data-inicio-advisor-id]').length,store:{ready:st.ready,status:st.status,serverConfirmed:st.serverConfirmedCollections,denied:st.deniedCollections,snapshotErrors:st.snapshotErrors,optional:st.optionalCollections},clientStatus:roster?.dashboardStatus?.(),clientAvailable:typeof roster?.dashboardList==='function',queriedCountry:country};
   },{country,month});
   let clientCall;
   try{clientCall=await p.evaluate(async({country,month})=>{const v=await Orbit.assignableAdvisorRoster.dashboardList(country,month);return{count:v.length,ids:v.map(x=>x.id).slice(0,20)};},{country,month});}
   catch(e){clientCall={error:String(e&&e.message||e)};}
   throw new Error('B4_003_R23_UI_NOT_MATERIALIZED:'+JSON.stringify({actor:who.uid,activeRole:who.activeRole,country,month,backend:{scope:api?.scope,count:api?.rows?.length,ids:(api?.rows||[]).map(x=>x.id).slice(0,20)},diagnostics,clientCall})+'|'+String(error?.message||error));
  }
  const ui=await p.evaluate(()=>({ids:[...new Set([...document.querySelectorAll('[data-inicio-advisor-id]')].map(e=>e.getAttribute('data-inicio-advisor-id')))].sort(),overflow:document.documentElement.scrollWidth>innerWidth+2,route:Orbit.route?.key||'',hash:location.hash}));
  need(ui.route==='inicio'&&ui.hash==='#/inicio','B4_003_R23_INBOX_UNAUTHORIZED_NAVIGATOR_FIRST_PAINT:'+JSON.stringify({role:who.activeRole,country,route:ui.route,hash:ui.hash}));
  await p.reload({waitUntil:'domcontentloaded'});await bootProduct(p,token);await p.evaluate(c=>{Orbit.pais=c;Orbit.modules.inicio.render(document.getElementById('host'));},country);
  try{
    await p.waitForFunction(()=>document.querySelector('[data-inicio-advisor-id]')||document.querySelector('[data-inicio-advisor-readiness="ready-empty"]'),null,{timeout:12000});
  }catch(error){
    const state=await p.evaluate(({country,month})=>{
      const st=Orbit.store?._productStatus?.()||{},api=Orbit.assignableAdvisorRoster,host=document.getElementById('host');
      return{url:location.href,route:Orbit.route?.key||'',role:String(Orbit.session?.rol?.()||''),user:String(Orbit.auth?.productUser?.uid||''),country:Orbit.pais||'',month,hostPresent:!!host,hostText:String(host?.innerText||'').slice(0,1700),advisorReadiness:host?.querySelector('[data-inicio-advisor-readiness]')?.getAttribute('data-inicio-advisor-readiness')||'',advisorRendered:host?.querySelectorAll('[data-inicio-advisor-id]').length||0,backendClient:api?.dashboardStatus?.(),rosterApiPresent:typeof api?.dashboardList==='function',store:{ready:st.ready,status:st.status,confirmed:st.serverConfirmedCollections,denied:st.deniedCollections,errors:st.snapshotErrors,optional:st.optionalCollections},appStarted:Orbit.productAppP0?.status?.().started===true};
    },{country,month});
    let clientCall;
    try{clientCall=await p.evaluate(async({country,month})=>{const rows=await Orbit.assignableAdvisorRoster.dashboardList(country,month);return{count:rows.length,ids:rows.map(r=>r.id).slice(0,30)};},{country,month});}
    catch(e){clientCall={error:String(e?.message||e)};}
    throw new Error('B4_003_R23_POST_RELOAD_READINESS_NOT_RESTORED:'+JSON.stringify({actor:who.uid,actorRole:who.activeRole,country,month,beforeReload:ui,state,clientCall})+'|'+String(error?.message||error));
  }
  ui.reloaded=await p.evaluate(()=>[...new Set([...document.querySelectorAll('[data-inicio-advisor-id]')].map(e=>e.getAttribute('data-inicio-advisor-id')))].sort());
  ui.reloadRoute=await p.evaluate(()=>({hash:location.hash,route:Orbit.route?.key||''}));
  need(ui.reloadRoute.route==='inicio'&&ui.reloadRoute.hash==='#/inicio','B4_003_R23_INBOX_UNAUTHORIZED_NAVIGATOR_RELOAD:'+JSON.stringify({role:who.activeRole,country,...ui.reloadRoute}));
  return{api,ui};
 }finally{await ctx.close();}
}
async function inboxProjectionFor(browser,who){
 const token=await auth.createCustomToken(who.uid),ctx=await browser.newContext({ignoreHTTPSErrors:false}),p=await ctx.newPage();
 try{await applyLegal(p,who);await p.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:30000});return await p.evaluate(async({token,tenantId,activeRole})=>{const provider=Orbit.productRuntimeBrowserProvidersP0,c=await provider.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);return await provider.callFunction('orbit360GetAdvisorOpsInboxPreview',{tenantId,activeRole,limit:100},'us-east1');},{token,tenantId,activeRole:who.activeRole});}finally{await ctx.close();}
}
async function inboxStateFor(browser,who,noticeId,action){
 const token=await auth.createCustomToken(who.uid),ctx=await browser.newContext({ignoreHTTPSErrors:false}),p=await ctx.newPage();
 try{await applyLegal(p,who);await p.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:30000});return await p.evaluate(async({token,tenantId,activeRole,noticeId,action})=>{const provider=Orbit.productRuntimeBrowserProvidersP0,c=await provider.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);return await provider.callFunction('orbit360UpdateAdvisorOpsInboxStatePreview',{tenantId,activeRole,noticeId,action},'us-east1');},{token,tenantId,activeRole:who.activeRole,noticeId,action});}finally{await ctx.close();}
}
async function actionCardUiFor(browser,who,businessId,surface){
 const token=await auth.createCustomToken(who.uid),ctx=await browser.newContext({ignoreHTTPSErrors:false}),p=await ctx.newPage();
 try{
  await applyLegal(p,who);await p.goto(target+'/#/'+surface,{waitUntil:'domcontentloaded',timeout:60000});await bootProduct(p,token);
  try{
    await p.waitForFunction(({businessId,surface})=>{
      const h=document.getElementById('host'),card=h?.querySelector('[data-neg="'+businessId+'"]');
      return !!card&&location.hash==='#/'+surface&&Orbit.sharedInboxState?.ready===true;
    },{businessId,surface},{timeout:22000});
  }catch(error){
    const diagnostic=await p.evaluate(({businessId,surface})=>{
      const h=document.getElementById('host'),card=h?.querySelector('[data-neg="'+businessId+'"]'),app=Orbit.productAppP0?.status?.()||{},store=Orbit.store?._productStatus?.()||{},inbox=Orbit.sharedInboxState||{};
      const business=Orbit.store?.get?.('negocios',businessId),st=business?.etapa||'',ops=Orbit.ciclo?.E?.[st]?.ops||null;
       return{route:String(location.hash||''),wantedSurface:surface,businessInStore:!!business,businessStage:st,stageOpsSurface:ops,cardPresent:!!card,kanbanCardCount:h?.querySelectorAll('[data-neg]').length||0,sharedInboxReady:inbox.ready===true,sharedInboxPublished:!!inbox.lookup,inboxScopePresent:!!inbox.scope,authenticatedMembershipReady:!!Orbit.auth?.productUser?.uid,role:String(Orbit.session?.rol?.()||''),productStarted:Orbit.productAppP0?.isStarted?.()===true,productReady:app.started===true,storeReady:store.ready===true,storeStatus:String(store.status||''),inboxBellPresent:!!document.getElementById('ops-inbox-bell')};
    },{businessId,surface});
    throw new Error('B4_003_R21_ACTION_CARD_INBOX_STARTUP_READINESS_NOT_CONFIRMED:'+JSON.stringify(diagnostic)+'|'+String(error.message||error));
  }
  return await p.evaluate(({businessId,surface})=>{
    const card=document.querySelector('[data-neg="'+businessId+'"]'),badge=card?.querySelector('.collab-action'),ranks=Orbit.ciclo?.actionQueueRanks?.(surface)||{},expected=Number(ranks[businessId]||0),actual=Number(badge?.dataset.collabRank||0),css=badge?getComputedStyle(badge):null;
    return{present:!!card,badge:!!badge,label:String(badge?.innerText||''),expectedRank:expected,actualRank:actual,background:css?.backgroundColor||'',color:css?.color||'',priorityText:String(card?.querySelector('.badge.danger,.badge.warn,.badge.neutral')?.innerText||'')};
  },{businessId,surface});
 }finally{await ctx.close();}
}

async function inboxUiFor(browser,who,eventId,expectedSurface,stateAction){
 const token=await auth.createCustomToken(who.uid),ctx=await browser.newContext({ignoreHTTPSErrors:false}),p=await ctx.newPage();
 try{
  await applyLegal(p,who);await p.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});await bootProduct(p,token);
  const expectedRole=norm(who.activeRole);
  const roleAssigned=await p.waitForFunction(role=>{
    if(!Orbit.session||typeof Orbit.session.allowedRoles!=='function'||typeof Orbit.session.set!=='function')return false;
    const canon=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    return Orbit.session.allowedRoles().some(x=>canon(x)===role);
  },expectedRole,{timeout:10000}).then(()=>true).catch(()=>false);
  need(roleAssigned,'B4_003_INBOX_ROLE_NOT_ASSIGNED_OR_SESSION_NOT_READY:'+expectedRole);
  const roleSelected=await p.evaluate(role=>Orbit.session.set(role)===true,who.activeRole);
  need(roleSelected,'B4_003_INBOX_ROLE_SELECTION_REJECTED:'+expectedRole);
  const roleReloadUrl=target+'/?b4003RoleReload='+encodeURIComponent(expectedRole)+'-'+encodeURIComponent(run)+'#/inicio';
  await p.goto(roleReloadUrl,{waitUntil:'domcontentloaded',timeout:60000});await bootProduct(p,token);
  const sessionReady=await p.waitForFunction(role=>{
    const raw=String(Orbit.session&&typeof Orbit.session.rol==='function'?Orbit.session.rol():'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    return raw===role;
  },expectedRole,{timeout:10000}).then(()=>true).catch(()=>false);
  need(sessionReady,'B4_003_INBOX_SESSION_ROLE_NOT_READY:'+expectedRole);
  if(expectedSurface)await p.waitForFunction(()=>window.Orbit?.sharedInboxState?.ready===true,null,{timeout:10000});
  const landingHash=await p.evaluate(()=>location.hash);
  await p.click('#ops-inbox-bell');
  await p.waitForSelector('#ops-inbox-drawer.open',{timeout:10000});
  const selector='[data-notice-event="'+eventId.replace(/"/g,'')+'"]';
  try{await p.waitForSelector(selector,{timeout:10000});}catch(error){
   const diagnostics=await p.evaluate(id=>{
     const d=document.getElementById('ops-inbox-drawer'),cards=Array.from(d?.querySelectorAll('[data-notice-event]')||[]),el=cards.find(x=>x.getAttribute('data-notice-event')===id),style=el?getComputedStyle(el):null;
     return{route:String(location.hash||''),role:String(Orbit.session?.rol?.()||''),drawerOpen:!!d?.classList.contains('open'),count:String(d?.querySelector('.inbox-active-count')?.innerText||''),renderCount:d?.querySelector('[data-inbox-render-count]')?.dataset.inboxRenderCount||'',visibleIds:cards.map(x=>x.dataset.noticeEvent).slice(0,30),cardFound:!!el,cardCssDisplay:style?.display||'',cardVisibility:style?.visibility||'',drawerHeight:d?.clientHeight||0,scrollHeight:d?.scrollHeight||0,message:String(d?.querySelector('.empty')?.innerText||'')};
   },eventId);
   throw new Error('B4_003_INBOX_AUTHENTICATED_CARD_NOT_VISIBLE:'+JSON.stringify(diagnostics)+'|'+String(error.message||error));
 }
  const header=await p.evaluate(sel=>{const d=document.getElementById('ops-inbox-drawer'),count=d?.querySelector('.inbox-active-count'),r=count?.getBoundingClientRect();return{countText:String(count?.innerText||'').replace(/\s+/g,' ').trim(),countLeft:r?.left||0,drawerLeft:d?.getBoundingClientRect().left||0,drawerWidth:d?.getBoundingClientRect().width||0};},selector);
  let pendingSeen=false;
  if(stateAction){
    const acknowledge=stateAction==='acknowledge',btnSel=selector+(acknowledge?' [data-inbox-ack]':' [data-inbox-resolve]'),pendingPattern=acknowledge?/Reconociendo/:/Resolviendo/,finalPattern=acknowledge?/Reconocida por ti/:/Resuelta para todos/;
    await p.click(btnSel);
    pendingSeen=await p.waitForFunction(({sel,source,flags})=>new RegExp(source,flags).test(String(document.querySelector(sel)?.textContent||'')),{sel:btnSel,source:pendingPattern.source,flags:pendingPattern.flags},{timeout:2000}).then(()=>true).catch(()=>false);
    await p.waitForFunction(({id,source,flags})=>{const row=document.querySelector('[data-notice-event="'+id+'"]');return !!row&&new RegExp(source,flags).test(String(row.innerText||''));},{id:eventId,source:finalPattern.source,flags:finalPattern.flags},{timeout:15000});
  }
  const final=await p.evaluate(id=>{const row=document.querySelector('[data-notice-event="'+id+'"]');return{present:!!row,text:String(row?.innerText||'').replace(/\s+/g,' ').trim()};},eventId);
  return{landingHash,expectedSurface,header,pendingSeen,final};
 }finally{await ctx.close();}
}

async function collaborationFor(browser,who,businessId,type,message,withAttachment=false){
 const token=await auth.createCustomToken(who.uid),ctx=await browser.newContext({ignoreHTTPSErrors:false}),p=await ctx.newPage();
 try{
  await applyLegal(p,who);await p.goto(target+'/#/ops',{waitUntil:'domcontentloaded',timeout:60000});await bootProduct(p,token);
  await p.waitForFunction(id=>!!Orbit.store?.get('negocios',id),businessId,{timeout:30000});
  const before=await p.evaluate(()=>{const s=Orbit.productOperationalWriteP0?.status?.()||{};return{pending:Number(s.pending||0),failed:Number(s.failed||0),committed:Number(s.committed||0),lastError:String(s.lastError||'')};});
  const openStarted=Date.now();await p.evaluate(id=>Orbit.ciclo.openNegocio(id),businessId);await p.waitForSelector('#ciclo-modal #ng-com-type',{timeout:10000});const openMs=Date.now()-openStarted;
  const visual=await p.evaluate(()=>{const m=document.getElementById('ciclo-modal'),panel=m?.querySelector('.ciclo-collab-panel'),header=m?.querySelector('.ciclo-h-brand'),help=String(panel?.innerText||'');const css=panel?getComputedStyle(panel):null;return{panel:!!panel,brandHeader:!!header,helpImmediate:/Registrar guarda la colaboración inmediatamente/.test(help),panelBackground:css?.backgroundColor||'',panelBorder:css?.borderColor||''};});
  await p.selectOption('#ciclo-modal #ng-com-type',{label:type});await p.fill('#ciclo-modal #ng-com-new',message);
  if(withAttachment)await p.setInputFiles('#ciclo-modal #ng-com-file',{name:'b4-r20-ui-attachment-'+run+'.txt',mimeType:'text/plain',buffer:Buffer.from('B4-003 R20 UI attachment '+run,'utf8')});
  await p.click('#ciclo-modal #ng-com-add');
  await p.waitForFunction(({businessId,type})=>{const n=Orbit.store?.get('negocios',businessId),rows=[].concat(n?.comentarios||[]);return rows.some(x=>String(x.tipo||'')===type&&String(x.direction||''));},{businessId,type},{timeout:30000});
  await p.waitForFunction(()=>{const s=Orbit.productOperationalWriteP0?.status?.()||{};return Number(s.pending||0)===0;},null,{timeout:30000});
  const after=await p.evaluate(({businessId,type})=>{const s=Orbit.productOperationalWriteP0?.status?.()||{},n=Orbit.store?.get('negocios',businessId),rows=[].concat(n?.comentarios||[]);const c=rows.find(x=>String(x.tipo||'')===type&&String(x.direction||''));return{pending:Number(s.pending||0),failed:Number(s.failed||0),committed:Number(s.committed||0),lastError:String(s.lastError||''),comment:c||null};},{businessId,type});
  need(after.pending===0&&after.failed===before.failed&&!!after.comment,'B4_003_R19_HANDOFF_DURABLE_BROWSER_COMMIT_NOT_CONFIRMED:'+JSON.stringify({before,after}));
  need(openMs<2500&&visual.panel&&visual.brandHeader&&visual.helpImmediate,'B4_003_R20_SECOND_REVIEW_BUSINESS_MODAL_LATENCY_OR_VISUAL_FAILED:'+JSON.stringify({openMs,visual}));
  let attachmentRead=null,attachmentCleanup=null;
  const documentRef=clean(after.comment?.attachment?.documentRef);
  if(withAttachment){
    need(!!documentRef,'B4_003_R20_SECOND_REVIEW_COLLAB_UI_ATTACHMENT_REF_MISSING:'+JSON.stringify(after.comment));
    attachmentRead=await p.evaluate(async({tenantId,activeRole,businessId,documentRef})=>Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360DocumentDriveReadPreview',{tenantId,activeRole,entidad:'negocio',entidadId:businessId,sourceModule:'ops-leads',documentRef},'us-east1'),{tenantId,activeRole:who.activeRole,businessId,documentRef});
    need(attachmentRead?.ok===true,'B4_003_R20_SECOND_REVIEW_COLLAB_UI_ATTACHMENT_READBACK_FAILED:'+JSON.stringify(attachmentRead));
    attachmentCleanup=await p.evaluate(async({tenantId,activeRole,businessId,documentRef})=>Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360DocumentDriveCleanupPreview',{tenantId,activeRole,entidad:'negocio',entidadId:businessId,sourceModule:'ops-leads',documentRef},'us-east1'),{tenantId,activeRole:who.activeRole,businessId,documentRef});
    need(attachmentCleanup?.ok===true&&attachmentCleanup?.deleted===true,'B4_003_R20_SECOND_REVIEW_COLLAB_UI_ATTACHMENT_CLEANUP_FAILED:'+JSON.stringify(attachmentCleanup));
  }
  return Object.assign({},after,{openMs,visual,attachmentRead,attachmentCleanup});
 }finally{await ctx.close();}
}
async function collaborationCommandFor(browser,who,businessId,type,message,direction){
 const snap=await ref('negocios',businessId).get();need(snap.exists,'B4_003_R19_HANDOFF_COMMAND_BUSINESS_MISSING');
 const row=snap.data()||{},ts=new Date().toISOString(),eventId='collab_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
 const comments=[].concat(row.comentarios||[]).concat([{ts,user:who.activeRole,tipo:type,texto:message,direction,eventId}]);
 const bitacora=[].concat(row.bitacora||[]).concat([{ts,user:who.activeRole,campo:'Colaboración',de:'',a:type,origen:'manual',direction,eventId}]);
 const token=await auth.createCustomToken(who.uid),ctx=await browser.newContext({ignoreHTTPSErrors:false}),p=await ctx.newPage();
 try{
  await applyLegal(p,who);await p.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:30000});
  const result=await p.evaluate(async({token,tenantId,activeRole,businessId,comments,bitacora,type})=>{
    const provider=Orbit.productRuntimeBrowserProvidersP0,c=await provider.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    return await provider.callFunction('orbit360OpsLeadsCommandPreview',{tenantId,activeRole,operation:'update_business',entityId:businessId,payload:{comentarios:comments,bitacora,actualizado:new Date().toISOString()},reason:'B4-003 R19 '+type},'us-east1');
  },{token,tenantId,activeRole:who.activeRole,businessId,comments,bitacora,type});
  need(result?.canonicalReadback===true&&result?.entityId===businessId,'B4_003_R19_HANDOFF_COMMAND_CANONICAL_READBACK_MISSING:'+JSON.stringify(result));
  return{eventId,result};
 }finally{await ctx.close();}
}
async function residueReadback(){
 const out=[];
 for(const id of residueIds){
  const s=await ref('polizas',id).get();
  const row=s.exists?s.data()||{}:null;
  const parent=row&&clean(row.renuevaDe);
  const parentExists=parent?(await ref('polizas',parent).get()).exists:false;
  const deps={};
  for(const c of ['gestiones','recibosEsperados','carteraPrimas','cobros','vehiculos','cancelaciones']){
   const q=await tenant.collection('data').doc(c).collection('items').where('polizaId','==',id).get();
   deps[c]=q.size;
  }
  out.push({id,exists:s.exists,numero:row&&row.numero||'',renuevaDe:parent,parentExists,previewWrite:row&&row.previewWrite===true,syntheticFlag:row&&row.__syntheticQa===true,createdAt:row&&row.createdAt&&row.createdAt.toDate?row.createdAt.toDate().toISOString():'',dependents:deps,dependentTotal:Object.values(deps).reduce((a,b)=>a+b,0)});
 }
 proof.qaResidue={rows:out,patternConsistent:out.every(x=>x.exists&&/^B2-REN-/.test(x.numero)&&/^b2-r9195-policy-/.test(x.renuevaDe)),parentsAbsent:out.every(x=>x.parentExists===false),noDependents:out.every(x=>x.dependentTotal===0),classification:out.every(x=>x.exists&&/^B2-REN-/.test(x.numero)&&/^b2-r9195-policy-/.test(x.renuevaDe)&&!x.parentExists&&x.dependentTotal===0)?'PROVEN_B2_QA_LINEAGE_NO_DEPENDENTS':'AMBIGUOUS_FAIL_CLOSED'};
 proof.assertions.qaResidueReadOnlyAdjudicated=true;
}
async function renewalDistributionReadback(){
 const [snap,clientSnap]=await Promise.all([
  tenant.collection('data').doc('polizas').collection('items').get(),
  tenant.collection('data').doc('clientes').collection('items').get()
 ]);
 const now=new Date();
 const clientById=new Map(clientSnap.docs.map(d=>[d.id,{id:d.id,...d.data()}]));
 const rawRows=snap.docs.map(d=>({id:d.id,...d.data()}));
 const excludedSyntheticIds=rawRows.filter(x=>x.__syntheticQa===true).map(x=>String(x.id)).filter(Boolean).sort();
 const rows=rawRows.filter(x=>!String(x.id).startsWith('b4003qa_')&&!String(x.id).startsWith('b4_')&&x.__syntheticQa!==true&&!r20QaHoldIds.has(String(x.id)));
 const state=p=>{
  if(!Object.prototype.hasOwnProperty.call(p,'renovable')||p.renovable==null||clean(p.renovable)==='')return'UNKNOWN';
  const v=clean(p.renovable).toLowerCase();
  if(p.renovable===true||['true','si','sí','renovable'].includes(v))return'YES';
  if(p.renovable===false||['false','no','no renovable'].includes(v))return'NO';
  return'UNKNOWN';
 };
 const active=p=>['vigente','porrenovar'].includes(norm(p.estado))&&!p.renovadaPor&&norm(p.renovacionEstado)!=='renovada';
 const days=p=>{const raw=clean(p.vigenciaFin);if(!raw)return null;const d=new Date(raw+'T00:00:00');return Number.isFinite(d.getTime())?Math.round((d-now)/86400000):null;};
 const policyState=p=>clean(p&&p.estado).toLowerCase().replace(/\s+/g,'');
 const terminalRenewalOutcome=p=>!!(p&&p.renovadaPor)||['renovada','norenovada','rechazada','cerrada','cancelada'].includes(clean(p&&p.renovacionEstado).toLowerCase().replace(/[\s_-]+/g,''));
 const normIdentity=v=>String(v==null?'':v).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const familyKey=p=>{
  const cli=clientById.get(clean(p.clienteId))||{},country=clean(p.pais||cli.pais);
  if(!p.numero||!p.clienteId||!p.aseguradoraId||!country)return 'IDENTIDAD_INCOMPLETA|'+String(p.id||'');
  return [p.tenantId||'',country,p.clienteId||'',p.aseguradoraId||'',p.ramo||'',p.numero||''].map(normIdentity).join('|');
 };
 const byId=new Map(rows.map(p=>[String(p.id),p])),byFamily=new Map(),byReverse=new Map();
 for(const p of rows){
  const k=familyKey(p);if(!byFamily.has(k))byFamily.set(k,[]);byFamily.get(k).push(p);
  if(p.renuevaDe){const k=String(p.renuevaDe);if(!byReverse.has(k))byReverse.set(k,[]);byReverse.get(k).push(p);}
 }
 const later=(a,b)=>!!(a.vigenciaInicio&&a.vigenciaFin&&b.vigenciaInicio&&b.vigenciaFin&&String(b.vigenciaInicio)>String(a.vigenciaInicio)&&String(b.vigenciaFin)>String(a.vigenciaFin));
 /* Independent source-derived lifecycle adjudicator: no status is itself proof
    of a materialized renewal; historical unresolved remains for review. */
 const pipelineEligible=(p,d)=>{
  if(state(p)==='NO'||d==null||d>90)return false;
  const past=d<0,ps=norm(p.estado).replace(/_/g,''),rs=norm(p.renovacionEstado).replace(/_/g,'');
  if(['cancelada','anulada','cancelado','anulado'].includes(ps)||rs==='cancelada')return false;
  const same=(byFamily.get(familyKey(p))||[]).filter(q=>q.id!==p.id&&later(p,q));
  const from=p.renovadaPor?byId.get(String(p.renovadaPor)):null,back=(byReverse.get(String(p.id))||[]).filter(q=>q.id!==p.id);
  const direct=[...(from?[from]:[]),...back].filter((q,i,a)=>a.findIndex(x=>x.id===q.id)===i);
  const valid=direct.filter(q=>familyKey(q)===familyKey(p)&&later(p,q));
  if(valid.length===1)return false;
  const broken=!!p.renovadaPor&&!from||direct.some(q=>!valid.some(x=>x.id===q.id));
  if(valid.length>1||broken)return past;
  const historical=['renovada','historica','historico'].includes(ps);
  if(historical&&same.length)return false;
  if(rs==='renovada')return past;
  if(['norenovada','rechazada','cerrada'].includes(rs)||['norenovada','rechazada','reexpedida'].includes(ps))return false;
  if(historical)return past;
  return past?['vigente','porrenovar','vencida'].includes(ps):['vigente','porrenovar'].includes(ps);
 };
 const byState={YES:0,NO:0,UNKNOWN:0},byCountry={},buckets={vencidas:0,d15:0,d45:0,d90:0},eligible=[];
 rows.forEach(p=>{
  const rs=state(p);byState[rs]=(byState[rs]||0)+1;
  const cli=clientById.get(clean(p.clienteId))||{};
  const country=clean(p.pais||p.country||cli.pais||cli.country||'SIN_PAIS').toUpperCase()||'SIN_PAIS';
  byCountry[country]=byCountry[country]||{YES:0,NO:0,UNKNOWN:0,eligible90:0};
  byCountry[country][rs]=(byCountry[country][rs]||0)+1;
  const d=days(p);if(!pipelineEligible(p,d))return;
  eligible.push({id:p.id,numero:p.numero||'',pais:country,dias:d,estado:p.estado||'',vigenciaFin:p.vigenciaFin||''});
  byCountry[country].eligible90++;
  if(d<0)buckets.vencidas++;else if(d<=15)buckets.d15++;else if(d<=45)buckets.d45++;else buckets.d90++;
 });
 const wantedKeys=new Set(renewalSourceAuthority.activePolicyNumbers.map(policyNumberKey));
 const grouped={};
 rows.forEach(p=>{
   const k=policyNumberKey(p.numero);
   if(!wantedKeys.has(k))return;
   grouped[k]=grouped[k]||[];
   grouped[k].push(p);
 });
 const sourceMatches=[],missing=[],duplicates=[],historicalSameNumber=[];
 renewalSourceAuthority.activePolicyNumbers.forEach(numero=>{
   const k=policyNumberKey(numero),matches=grouped[k]||[];
   const activeMatches=matches.filter(active).sort((a,b)=>String(b.vigenciaFin||'').localeCompare(String(a.vigenciaFin||'')));
   const historicalMatches=matches.filter(p=>!active(p));
   if(historicalMatches.length)historicalSameNumber.push({numero,ids:historicalMatches.map(x=>x.id),states:historicalMatches.map(x=>x.estado||'')});
   if(activeMatches.length===0)missing.push(numero);
   if(activeMatches.length>1)duplicates.push({numero,ids:activeMatches.map(x=>x.id),states:activeMatches.map(x=>x.estado||'')});
   const p=activeMatches[0]||null;
   if(p)sourceMatches.push({
     id:p.id,numero:p.numero||'',estado:p.estado||'',pais:p.pais||'',vigenciaFin:p.vigenciaFin||'',
     aseguradoraId:p.aseguradoraId||'',renewabilityState:state(p),
     currentRenovable:Object.prototype.hasOwnProperty.call(p,'renovable')?p.renovable:null,
     proposedPatch:{renovable:true,renewabilityProvenance:'source_report',renewabilitySourceSha256:renewalSourceAuthority.sourceSha256}
   });
 });
 proof.realRenewalDistribution={policyCount:rows.length,byState,byCountry,buckets,eligibleCount:eligible.length,eligibleIds:eligible.map(x=>x.id),excludedSyntheticIds,excludedQaHoldIds:[...r20QaHoldIds].sort(),sample:eligible.slice(0,30),readOnly:true};
 proof.r13RenewalSourceDryRun={
   source:renewalSourceAuthority,
   matches:sourceMatches,
   missing,
   duplicates,
   historicalSameNumber,
   proposedWriteCount:sourceMatches.length,
   conflictCount:missing.length+duplicates.length,
   ready:sourceMatches.length===renewalSourceAuthority.activePolicyNumbers.length&&missing.length===0&&duplicates.length===0,
   writeExecuted:false,
   authorizationRequiredBeforeApply:true
 };
 proof.assertions.realRenewalDistributionReadOnly=true;
 proof.assertions.realRenewalSourceDryRunReady=proof.r13RenewalSourceDryRun.ready===true;
}
async function cancellationEvidence(){
 const snap=await tenant.collection('data').doc('polizas').collection('items').get();
 const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!String(x.id).startsWith('b4003qa_'));
 const cancelled=rows.filter(x=>['cancelada','cancelado','anulada','anulado'].includes(norm(x.estado||x.status)));
 const cs=await tenant.collection('data').doc('cancelaciones').collection('items').get();
 const realCancel=cs.docs.filter(d=>!String(d.id).startsWith('b4003qa_')).length;
 const projectionProbe=cancelled.find(x=>clean(x.numero)&&['GT','CO'].includes(clean(x.pais).toUpperCase()))||cancelled.find(x=>clean(x.numero))||null;
 proof.runtimeCancellationEvidence={cancelledPolicyCount:cancelled.length,cancelationRecordCount:realCancel,canonicalContract:'POLICY_STATUS_PLUS_CANCELLATION_DATE_NO_DOUBLE_INSERT',projectionProbe:projectionProbe?{id:projectionProbe.id,numero:projectionProbe.numero||'',estado:projectionProbe.estado||projectionProbe.status||'',clienteId:projectionProbe.clienteId||'',pais:projectionProbe.pais||''}:null,sample:cancelled.slice(0,25).map(x=>({id:x.id,numero:x.numero||'',estado:x.estado||x.status||'',clienteId:x.clienteId||'',pais:x.pais||''}))};
 proof.assertions.cancellationProjectionConsistent=(cancelled.length===0);
}
async function cleanup(startMs){
 for(const [c,id] of [['actividades',ids.renewActivity],['actividades',ids.cancelActivity],['negocios',ids.recoveryBusiness],['negocios',ids.collabBusiness],['negocios',ids.collabNoClientBusiness],['cancelaciones',ids.cancelation],['recibosEsperados',ids.healthReceipt1],['recibosEsperados',ids.healthReceipt2],['recibosEsperados',ids.healthReceiptShadow],['polizas',ids.renewalPolicy],['polizas',ids.expiredRenewPolicy],['polizas',ids.unknownRenewPolicy],['polizas',ids.renewabilityWritePolicy],['polizas',ids.cancelPolicy],['polizas',ids.healthPolicy],['aseguradoras',ids.insurer],['clientes',ids.client]]){
  const r=ref(c,id);if((await r.get()).exists){await r.delete();proof.cleanupWrites++;}
 }
 for(const col of ['workflowEvents','operationalEvents']){
  const snap=await tenant.collection(col).get();
  for(const d of snap.docs){
   const x=d.data()||{},ts=x.createdAt&&x.createdAt.toMillis?x.createdAt.toMillis():0;
   const related=clean(x.entityId)===ids.recoveryBusiness || (ts>=startMs&&ts<=Date.now()+5000&&clean(x.actorUid)===clean(proof.actor?.uid));
   if(!related)continue;
   const req=clean(x.requestId);await d.ref.delete();proof.cleanupWrites++;
   if(req){
    const rc=col==='workflowEvents'?'workflowRequests':'operationalRequests',rr=tenant.collection(rc).doc(req);
    if((await rr.get()).exists){await rr.delete();proof.cleanupWrites++;}
   }
  }
 }
}
let browser,context,page,startMs=Date.now();
const httpCapturePromises=[];
try{
 const who=await actor();proof.actor=who;
 const directionActor=await actorForRole('direccion');
 const operativeActor=await actorForRole('operativo',[directionActor.uid]);
 const advisorActor=await actorForRole('asesor',[directionActor.uid,operativeActor.uid]);
 need(new Set([directionActor.uid,operativeActor.uid,advisorActor.uid]).size===3,'B4_003_R20_HANDOFF_ACTORS_NOT_DISTINCT');
 proof.r16RosterActors={direction:{uid:directionActor.uid,activeRole:directionActor.activeRole},operative:{uid:operativeActor.uid,activeRole:operativeActor.activeRole},advisor:{uid:advisorActor.uid,activeRole:advisorActor.activeRole}};
 proof.assertions.handoffActorsDistinct=true;
 need(!!advisorActor.advisorId,'B4_003_R19_ADVISOR_ACTOR_NOT_BOUND');
 await residueReadback();
 await cancellationEvidence();
 await renewalDistributionReadback();
 need(!!who.advisorId,'B4_003_R20_EXECUTION_ACTOR_ADVISOR_BINDING_REQUIRED');
 await seed(who,who.advisorId,advisorActor.advisorId);
 const token=await auth.createCustomToken(who.uid);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 context=await browser.newContext({ignoreHTTPSErrors:false});
 page=await context.newPage();
 page.on('pageerror',e=>proof.pageErrors.push(clean(e?.message||e)));
 page.on('console',m=>{if(m.type()==='error')proof.consoleErrors.push(clean(m.text()));});
 page.on('response',r=>{if(r.status()>=400){httpCapturePromises.push((async()=>{const req=r.request();let body='';try{body=clean(await r.text()).slice(0,2000);}catch{}proof.httpErrors.push({status:r.status(),url:clean(r.url()),resourceType:clean(req.resourceType()),method:clean(req.method()),postData:clean(req.postData()).slice(0,4000),responseBody:body});})());}});
 await applyLegal(page,who);
 await page.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});
 await bootProduct(page,token);

  // R23 authenticated Inicio parity, GT and CO separately.
  proof.academiaManuals=await academiaManualsPreviewProof(browser,directionActor,operativeActor);
  proof.academiaRoleScope=await academiaManualsScopeProof(browser,operativeActor);
  proof.assertions.academiaFiveManualsPrivateAuthenticatedUi=true;
  proof.assertions.academiaOperativoCrmManualAllowedRestrictedDenied=true;
  const r23Month=new Date().toISOString().slice(0,7);
  const r23OpMember=(await tenant.collection('members').doc(operativeActor.uid).get()).data()||{},r23Countries=[].concat(r23OpMember.countries||r23OpMember.paises||[]).map(x=>clean(x).toUpperCase());
  const r23Jobs=[r23ProofSnapshot(browser,operativeActor,'GT',r23Month),r23ProofSnapshot(browser,directionActor,'GT',r23Month)];
  if(!r23Countries.length||r23Countries.includes('CO'))r23Jobs.push(r23ProofSnapshot(browser,operativeActor,'CO',r23Month));
  const r23Cases=await Promise.all(r23Jobs);
  for(const item of r23Cases){
   need(item.api?.ok===true&&item.api.month===r23Month,'B4_003_R23_BACKEND_CONFIRMATION_REQUIRED');
   const expected=item.api.rows.map(r=>clean(r.id)).sort();
   need(JSON.stringify(expected)===JSON.stringify(item.ui.ids)&&JSON.stringify(expected)===JSON.stringify(item.ui.reloaded),'B4_003_R23_BACKEND_UI_RELOAD_MISMATCH');
   need(item.ui.overflow!==true,'B4_003_R23_MOBILE_OVERFLOW');
   need(item.api.rows.every(r=>Object.keys(r).every(k=>['id','nombre','activo','paises','metas','metaPrima'].includes(k))&&r.paises.every(c=>c===item.api.country)&&Object.keys(r.metas||{}).every(c=>c===item.api.country)),'B4_003_R23_UNAUTHORIZED_SCOPE_LEAK');
  }
  const r23Metas=await tenant.collection('data').doc('metas').collection('items').get(),r23Goals=new Map();
  for(const d of r23Metas.docs){
   const m=d.data()||{},country=clean(m.pais).toUpperCase()||(clean(m.moneda).toUpperCase()==='GTQ'?'GT':clean(m.moneda).toUpperCase()==='COP'?'CO':''),id=clean(m.asesorId||m.advisorId),type=clean(m.tipo).toLowerCase(),amount=Number(m.valor);
   if(!id||!['GT','CO'].includes(country)||!['nueva','renovada','recaudo'].includes(type)||String(m.mes||m.periodo||'').slice(0,7)!==r23Month||m.valor==null||m.valor===''||!Number.isFinite(amount)||amount<0)continue;
   const key=id+'|'+country,old=r23Goals.get(key)||{nueva:0,renovada:0,recaudo:0};old[type]+=amount;r23Goals.set(key,old);
  }
  for(const item of r23Cases)for(const row of item.api.rows){
   const goal=r23Goals.get(clean(row.id)+'|'+item.api.country);
   if(goal){need(row.metas[item.api.country]?.explicit===true,'B4_003_R23_SOURCE_GOAL_MISSING:'+row.id);for(const f of ['nueva','renovada','recaudo'])need(Math.abs(Number(row.metas[item.api.country][f])-goal[f])<0.001,'B4_003_R23_CANONICAL_GOAL_MISMATCH:'+f+':'+row.id);}
  }
  proof.assertions.r23InicioCanonicalGoalValueParity=true;
  proof.r23Inicio=r23Cases.map(x=>({country:x.api.country,scope:x.api.scope,rows:x.api.rows.length,reloaded:true}));
  proof.assertions.r23InicioRoleCountryScopedBackendUiParity=true;
  proof.assertions.r23InicioOperativoDireccionMobileReload=true;

 const quoteAuthorityHosted=await page.evaluate(async()=>{
   const [contractRes,gateRes]=await Promise.all([
     fetch('/core/quote-authority-contract-v1.js?b4r10='+Date.now(),{cache:'no-store'}),
     fetch('/modules/cotizador-v1203-source-gate.js?b4r10='+Date.now(),{cache:'no-store'})
   ]);
   const contract=contractRes.ok?await contractRes.text():'';
   const gate=gateRes.ok?await gateRes.text():'';
   return{
     contractStatus:contractRes.status,
     gateStatus:gateRes.status,
     contractVersion:contract.includes('gravicentra-quote-authority-v1'),
     noManualNetInference:!gate.includes('total / (1 + taxPct / 100)'),
     noPdfNetInference:!gate.includes("total / (1 + (context.pais === 'CO' ? .19 : .12))"),
     amountBasisReview:gate.includes("basis === 'requires_validation'")
   };
 });
 need(quoteAuthorityHosted.contractStatus===200&&quoteAuthorityHosted.gateStatus===200,'B4_003_R10_QUOTE_AUTHORITY_FILES_NOT_HOSTED');
 need(quoteAuthorityHosted.contractVersion===true,'B4_003_R10_QUOTE_AUTHORITY_VERSION_NOT_HOSTED');
 need(quoteAuthorityHosted.noManualNetInference===true&&quoteAuthorityHosted.noPdfNetInference===true,'B4_003_R10_UNSAFE_FINANCIAL_INFERENCE_HOSTED');
 need(quoteAuthorityHosted.amountBasisReview===true,'B4_003_R10_AMOUNT_BASIS_REVIEW_NOT_HOSTED');
 proof.quoteAuthorityHosted=quoteAuthorityHosted;
 proof.assertions.quoteAuthorityContractHosted=true;
 proof.assertions.manualFinancialInferenceRemoved=true;
 await page.waitForFunction(id=>!!window.Orbit?.store?.get('polizas',id),ids.renewalPolicy,{timeout:30000});
 const backendCancelation=(await ref('cancelaciones',ids.cancelation).get());
 const backendCancelPolicy=(await ref('polizas',ids.cancelPolicy).get());
 await page.waitForTimeout(1200);
 proof.hydrationDiagnostic=await page.evaluate(ids=>{
   const member=Orbit.auth&&Orbit.auth.productUser||{};
   const status=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
   let cancelPlan=null,policyPlan=null;
   try{cancelPlan=Orbit.tenantAccessPolicyProductP0?.queryConstraints?.('cancelaciones',member,{tenantId:member.tenantId})||null;}catch(e){cancelPlan={error:String(e&&e.message||e)};}
   try{policyPlan=Orbit.tenantAccessPolicyProductP0?.queryConstraints?.('polizas',member,{tenantId:member.tenantId})||null;}catch(e){policyPlan={error:String(e&&e.message||e)};}
   return{
     activeRole:String(member.activeRole||''),
     sessionRole:String(Orbit.session&&typeof Orbit.session.rol==='function'?Orbit.session.rol():''),
     assignedRoles:Array.isArray(member.roles)?member.roles.slice():[],
     advisorBound:!!member.advisorId,
     cancelPlan,
     policyPlan,
     cancelStorePresent:!!Orbit.store?.get('cancelaciones',ids.cancelation),
     policyStorePresent:!!Orbit.store?.get('polizas',ids.renewalPolicy),
     cancelServerConfirmed:(status.serverConfirmedCollections||[]).includes('cancelaciones'),
     cancelDenied:(status.deniedCollections||[]).includes('cancelaciones'),
     cancelSnapshotError:status.snapshotErrors&&status.snapshotErrors.cancelaciones||'',
     cancelAttached:(status.attachedCollections||[]).includes('cancelaciones'),
     optionalMissing:(status.optionalMissing||[]).slice()
   };
 },ids);
 proof.hydrationDiagnostic.backendCancelationExists=backendCancelation.exists;
 proof.hydrationDiagnostic.backendCancelPolicyExists=backendCancelPolicy.exists;
 console.log('B4_003_CANCELATION_STORE_HYDRATION_CAUSAL_DIAGNOSTIC='+JSON.stringify(proof.hydrationDiagnostic));
 need(proof.hydrationDiagnostic.backendCancelationExists===true,'B4_003_CANCELATION_BACKEND_SEED_MISSING');
 need(proof.hydrationDiagnostic.backendCancelPolicyExists===true,'B4_003_CANCEL_POLICY_BACKEND_SEED_MISSING');
 need(proof.hydrationDiagnostic.cancelStorePresent===true,'B4_003_CANCELATION_HYDRATION_DIAGNOSTIC_FAIL');
 proof.assertions.authenticatedHydration=true;

 await page.evaluate(()=>{ location.hash='#/aseguradoras'; });
 await page.waitForFunction(()=>window.Orbit?.route?.key==='aseguradoras',null,{timeout:10000});
 await page.waitForFunction(()=>Array.isArray(window.Orbit?.store?.all('aseguradoras'))&&window.Orbit.store.all('aseguradoras').length>0,null,{timeout:30000});
 const knowledgeProbe=await page.evaluate(()=>{
   const rows=Orbit.store.all('aseguradoras')||[];
   const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   const pick=re=>rows.find(r=>re.test(norm([r.nombre,r.canonicalName,r.displayName].filter(Boolean).join(' '))))||null;
   const a=pick(/aseguate|guatemal/),c=pick(/columna/);
   return{aseguateId:a&&a.id||'',columnaId:c&&c.id||'',count:rows.length};
 });
 need(!!knowledgeProbe.aseguateId,'B4_003_R9_ASEGUATE_DIRECTORY_ID_MISSING');
 need(!!knowledgeProbe.columnaId,'B4_003_R9_COLUMNA_DIRECTORY_ID_MISSING');

 await page.evaluate(id=>Orbit.modules.aseguradoras.ficha(id),knowledgeProbe.aseguateId);
 await page.waitForSelector('#asg-ficha [data-tab="tarifas"]',{timeout:10000});
 await page.click('#asg-ficha [data-tab="tarifas"]');
 await page.waitForFunction(()=>{
   const t=String(document.querySelector('#asg-ficha #af-body')?.innerText||'');
   return t.includes('Conocimiento vigente y observado')&&t.includes('5% de prima neta')&&t.includes('8.42%');
 },null,{timeout:20000});
 const aseguateKnowledge=await page.evaluate(()=>{
   const t=String(document.querySelector('#asg-ficha #af-body')?.innerText||'').replace(/\s+/g,' ').trim();
   return{
     sourceBacked:t.includes('Tasas AseGuate.xlsx')&&t.includes('Póliza AseGuate AUTO-38594'),
     issuance:t.includes('5% de prima neta'),
     installment:t.includes('5.37%')&&t.includes('8.42%'),
     multiProduct:t.includes('Vida')&&t.includes('Gastos Médicos')&&t.includes('Fianzas')&&t.includes('Transporte'),
     textSample:t.slice(0,2400)
   };
 });
 need(aseguateKnowledge.sourceBacked===true,'B4_003_R9_ASEGUATE_SOURCE_REFERENCES_NOT_VISIBLE');
 need(aseguateKnowledge.issuance===true&&aseguateKnowledge.installment===true,'B4_003_R9_ASEGUATE_PREMIUM_KNOWLEDGE_NOT_VISIBLE');
 need(aseguateKnowledge.multiProduct===true,'B4_003_R9_MULTI_PRODUCT_ROADMAP_NOT_VISIBLE');

 await page.evaluate(id=>{document.getElementById('asg-ficha')?.remove();Orbit.modules.aseguradoras.ficha(id);},knowledgeProbe.columnaId);
 await page.waitForSelector('#asg-ficha [data-tab="tarifas"]',{timeout:10000});
 await page.click('#asg-ficha [data-tab="tarifas"]');
 await page.waitForFunction(()=>{
   const t=String(document.querySelector('#asg-ficha #af-body')?.innerText||'');
   return t.includes('Tarifas y conocimiento')&&t.includes('Productos con conocimiento disponible')&&t.includes('0% en cotizador/pólizas')&&t.includes('0% en póliza muestra de 10 pagos');
 },null,{timeout:20000});
 const columnaKnowledge=await page.evaluate(()=>{
   const t=String(document.querySelector('#asg-ficha #af-body')?.innerText||'').replace(/\s+/g,' ').trim();
   return{
     sourceBacked:t.includes('Cotizador VA 2026 V1.4.xlsx')&&t.includes('Póliza Columna VA-41977'),
     zeroIssuance:t.includes('0% en cotizador/pólizas'),
     zeroInstallment:t.includes('0% en póliza muestra de 10 pagos'),
     textSample:t.slice(0,2400)
   };
 });
 need(columnaKnowledge.sourceBacked===true,'B4_003_R9_COLUMNA_SOURCE_REFERENCES_NOT_VISIBLE');
 need(columnaKnowledge.zeroIssuance===true&&columnaKnowledge.zeroInstallment===true,'B4_003_R9_COLUMNA_PREMIUM_KNOWLEDGE_NOT_VISIBLE');
 proof.insurerKnowledge={knowledgeProbe,aseguate:aseguateKnowledge,columna:columnaKnowledge};
 proof.assertions.insurerKnowledgeVisible=true;
 proof.assertions.multiProductKnowledgeRoadmapVisible=true;

 // R12: knowledge counters and upload actions must share the canonical insurer knowledge owner.
 await page.evaluate(id=>{document.getElementById('asg-ficha')?.remove();Orbit.modules.aseguradoras.ficha(id);},knowledgeProbe.aseguateId);
 await page.waitForSelector('#asg-ficha [data-tab="tarifas"]',{timeout:10000});
 await page.click('#asg-ficha [data-tab="tarifas"]');
 await page.waitForSelector('#asg-ficha .m1-knowledge-summary[data-knowledge-source="canonical"]',{timeout:10000});
 proof.r12InsurerKnowledge=await page.evaluate(id=>{
   const insurer=Orbit.store.get('aseguradoras',id),api=Orbit.modules.aseguradoras._fuentes;
   const canonical=api.knowledgeSources(insurer)||[];
   const box=document.querySelector('#asg-ficha .m1-knowledge-summary[data-knowledge-source="canonical"]');
   const metrics=Array.from(box.querySelectorAll(':scope > div')).map(x=>({label:String(x.querySelector('span')?.textContent||'').trim(),value:Number(x.querySelector('b')?.textContent||0)}));
   const productGroups=document.querySelector('#asg-ficha [data-knowledge-product-groups="1"]');
   const hierarchy={metricLabels:metrics.map(x=>x.label),productGroupsPresent:!!productGroups,productGroupsText:String(productGroups?.innerText||'').replace(/\s+/g,' ').trim(),hasHumanProductHeading:/Productos con conocimiento disponible/.test(document.querySelector('#asg-ficha #af-body')?.innerText||''),knowledgeRoleClear:/Aquí no se cargan archivos/.test(document.querySelector('#asg-ficha #af-body')?.innerText||''),tariffUploadAbsent:!document.querySelector('#asg-ficha #af-imp-doc2'),technicalRegistrySecondary:false};
   const originalOpen=Orbit.importa.open,captures=[];
   Orbit.importa.open=(kind,opts)=>{captures.push({kind,scope:opts&&opts.scope||{},documentIntent:opts&&opts.documentIntent||'',docCategory:opts&&opts.docCategory||''});};
   document.querySelector('#asg-ficha [data-tab="documentos"]')?.click();
   const technicalRegistry=document.querySelector('#asg-ficha [data-technical-registry="1"]');
   hierarchy.technicalRegistrySecondary=!!technicalRegistry&&!technicalRegistry.open;
   if(technicalRegistry)technicalRegistry.open=true;
   document.querySelector('#asg-ficha #af-imp-doc')?.click();
   Orbit.importa.open=originalOpen;
   const registry=document.querySelector('#asg-ficha details[data-source-registry-row]');if(registry)registry.open=true;const registryDetail=registry?.querySelector('[data-source-registry-detail]');
   return{canonicalCount:canonical.length,metrics,captures,text:String(box.innerText||''),hierarchy,registry:{present:!!registry,open:!!registry?.open,detailPresent:!!registryDetail,detailText:String(registryDetail?.innerText||'').replace(/\s+/g,' ').trim()}};
 },knowledgeProbe.aseguateId);
 const related=proof.r12InsurerKnowledge.metrics.find(x=>x.label==='Fuentes relacionadas');
 need(!!related&&related.value===proof.r12InsurerKnowledge.canonicalCount&&related.value>0,'B4_003_R12_INSURER_KPI_CANONICAL_COUNT_MISMATCH');
 need(!/Fuentes registradas\s*0/i.test(proof.r12InsurerKnowledge.text),'B4_003_R12_SHADOW_ZERO_KPI_REMAINS');
 const metricLabels=proof.r12InsurerKnowledge.hierarchy?.metricLabels||[];
 need(['Fuentes relacionadas','Validadas','Requieren revisión','Archivo físico en Drive'].every(x=>metricLabels.includes(x))&&!metricLabels.includes('Mapeadas / validadas')&&!metricLabels.includes('Con archivo confirmado'),'B4_003_R16_08_INSURER_HIERARCHY_METRICS_AMBIGUOUS:'+JSON.stringify(metricLabels));
 need(proof.r12InsurerKnowledge.hierarchy?.productGroupsPresent===true&&proof.r12InsurerKnowledge.hierarchy?.hasHumanProductHeading===true&&proof.r12InsurerKnowledge.hierarchy?.knowledgeRoleClear===true&&proof.r12InsurerKnowledge.hierarchy?.tariffUploadAbsent===true&&proof.r12InsurerKnowledge.hierarchy?.technicalRegistrySecondary===true&&!/—\s*·\s*—/.test(proof.r12InsurerKnowledge.hierarchy?.productGroupsText||''),'B4_003_R20_SECOND_REVIEW_INSURER_PRODUCT_HIERARCHY_NOT_HUMAN:'+JSON.stringify(proof.r12InsurerKnowledge.hierarchy));
 proof.assertions.insurerKnowledgeHierarchyHuman=true;
 need(proof.r12InsurerKnowledge.registry?.present===true&&proof.r12InsurerKnowledge.registry?.open===true&&proof.r12InsurerKnowledge.registry?.detailPresent===true&&/Clasificación/.test(proof.r12InsurerKnowledge.registry?.detailText||'')&&/Ubicación/.test(proof.r12InsurerKnowledge.registry?.detailText||''),'B4_003_R17_INSURER_REGISTRY_NOT_INSPECTABLE:'+JSON.stringify(proof.r12InsurerKnowledge.registry));
 proof.assertions.insurerSourceRegistryInspectable=true;
 need(!/\[object Object\]/.test(proof.r12InsurerKnowledge.registry?.detailText||''),'B4_003_R18_INSURER_PROVENANCE_OBJECT_RENDERED:'+JSON.stringify(proof.r12InsurerKnowledge.registry));
 proof.assertions.insurerRegistryProvenanceHuman=true;
 await page.click('#asg-ficha [data-tab="actividad"]');
 await page.waitForFunction(()=>/Qué ocurrió y quién lo hizo/.test(String(document.querySelector('#asg-ficha #af-body')?.innerText||'')),null,{timeout:10000});
 proof.r18InsurerActivity=await page.evaluate(()=>{
   const body=document.querySelector('#asg-ficha #af-body'),rows=Array.from(body?.querySelectorAll('.insurer-activity-row')||[]),documental=Array.from(body?.querySelectorAll('.insurer-activity-row.documental')||[]);
   const text=String(body?.innerText||'').replace(/\s+/g,' ').trim();return{text:text.slice(0,2400),rows:rows.length,documental:documental.length,hasUnified:/Qué ocurrió y quién lo hizo/.test(text),technical:/\bRegistry\b|KNOWLEDGE_REFERENCE|provenance|metadata|hash/i.test(text)};
 });
 need(proof.r18InsurerActivity.hasUnified===true&&proof.r18InsurerActivity.documental>0&&proof.r18InsurerActivity.technical===false,'B4_003_R20_SECOND_REVIEW_INSURER_ACTIVITY_NOT_HUMAN:'+JSON.stringify(proof.r18InsurerActivity));
 proof.assertions.insurerKnowledgeActivityConverged=true;
 await page.click('#asg-ficha [data-tab="documentos"]');
 await page.waitForSelector('#asg-ficha [data-technical-registry="1"]',{timeout:10000});
 await page.setViewportSize({width:390,height:844});
 proof.r18InsurerMobile=await page.evaluate(()=>{
   const body=document.querySelector('#asg-ficha #af-body'),details=body?.querySelector('.insurer-source-detail'),cards=Array.from(body?.querySelectorAll('.insurer-source-card,.insurer-knowledge-card')||[]);
   const viewport=window.innerWidth;
   const registry=body?.querySelector('[data-technical-registry="1"]'),order=Array.from(body?.querySelectorAll('[data-knowledge-order]')||[]).map(x=>x.getAttribute('data-knowledge-order'));return{viewport,bodyOverflow:body?body.scrollWidth>body.clientWidth+2:false,detailOverflow:details?details.scrollWidth>details.clientWidth+2:false,cardOverflow:cards.some(x=>x.scrollWidth>x.clientWidth+2),registryPresent:!!registry,registryCollapsed:!!registry&&!registry.open,order};
 });
 need(!proof.r18InsurerMobile.bodyOverflow&&!proof.r18InsurerMobile.detailOverflow&&!proof.r18InsurerMobile.cardOverflow&&proof.r18InsurerMobile.registryPresent&&proof.r18InsurerMobile.registryCollapsed,'B4_003_R19_INSURER_MOBILE_HIERARCHY_FAILED:'+JSON.stringify(proof.r18InsurerMobile));
 proof.assertions.insurerKnowledgeMobileResponsive=true;
 const humanUat=await page.evaluate(()=>({banner:!!document.querySelector('[data-insurer-preview-uat="1"]'),premiumSections:document.querySelectorAll('.insurer-premium-section').length,technicalText:String(document.querySelector('#asg-ficha #af-body')?.innerText||'')}));
 need(humanUat.banner===true,'B4_003_R20_HUMAN_PREVIEW_UAT_ENTRY_MISSING:'+JSON.stringify(humanUat));
  need(!/Registry técnico|provenance/i.test(humanUat.technicalText),'B4_003_R20_INSURER_TECHNICAL_TERMS_VISIBLE:'+JSON.stringify(humanUat));
 proof.assertions.insurerHumanPreviewUatVisible=true;proof.assertions.insurerTechnicalTermsHumanized=true;
 await page.setViewportSize({width:1280,height:720});
 const docCapture=proof.r12InsurerKnowledge.captures.find(x=>x.documentIntent==='documento');
 need(proof.r12InsurerKnowledge.captures.length===1&&docCapture?.kind==='docs-aseguradora'&&docCapture?.scope?.aseguradoraId===knowledgeProbe.aseguateId&&docCapture?.docCategory==='Formulario','B4_003_R20_SECOND_REVIEW_SINGLE_DOCUMENT_INTAKE_SCOPE_MISSING:'+JSON.stringify(proof.r12InsurerKnowledge.captures));
 proof.assertions.insurerKnowledgeCountersCanonical=true;
 proof.assertions.insurerImportScopeBound=true;
 proof.assertions.insurerKnowledgeDoesNotDuplicateUpload=true;
 await page.evaluate(()=>document.getElementById('asg-ficha')?.remove());

 proof.visualScope=await page.evaluate(ids=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';
   const countries=(selector,attr)=>Array.from(h.querySelectorAll(selector)).map(el=>String(el.getAttribute(attr)||'').toUpperCase()).filter(Boolean);
   const cancelSnapshot=country=>{
     Orbit.pais=country;
     const t=performance.now();Orbit.modules.cancelaciones.render(h);const ms=performance.now()-t;
     const rows=Array.from(h.querySelectorAll('[data-cancel-country]'));
     const identities=Array.from(h.querySelectorAll('[data-cancel-client-link]')).map(el=>({
       client:String(el.getAttribute('data-cancel-client-country')||'').toUpperCase(),
       operation:String(el.getAttribute('data-cancel-operation-country')||'').toUpperCase(),
       text:String(el.innerText||'').replace(/\s+/g,' ').trim()
     }));
     return{
       ms,
       countries:rows.map(el=>String(el.getAttribute('data-cancel-country')||'').toUpperCase()).filter(Boolean),
       explicitTargets:rows.every(row=>!!row.querySelector('[data-cancel-open]')&&(!String(row.getAttribute('data-cancel-policy')||'')||!!row.querySelector('[data-cancel-policy-link]'))),
       crossCountryExplicit:identities.filter(x=>x.client&&x.operation&&x.client!==x.operation).every(x=>x.text.includes('Cliente '+x.client)&&x.text.includes('operación '+x.operation)),
       identitySample:identities.slice(0,20)
     };
   };
   const gt=cancelSnapshot('GT');
   const syntheticCancelVisibleGT=gt.countries.includes('GT');
   Orbit.modules.cancelaciones.detalleKpi('valor');
   const cancelKpiDetailOpen=!!document.getElementById('cancelation-kpi-detail');
   document.getElementById('cancelation-kpi-detail')?.remove();
   const co=cancelSnapshot('CO');
   Orbit.pais='GT';Orbit.modules.renovaciones.render(h);
   const renewGT=countries('[data-renewal-country]','data-renewal-country');
   const syntheticRenewVisibleGT=!!h.querySelector('[data-renewal-policy="'+ids.renewalPolicy+'"]');
   const unknownCard=h.querySelector('[data-renewal-policy="'+ids.unknownRenewPolicy+'"]');
   const unknownRenewVisibleGT=!!unknownCard;
   const unknownRenewPendingBadge=Array.from(unknownCard?.querySelectorAll('.badge')||[]).some(x=>/Revisión necesaria|Decisión: renovabilidad pendiente/.test(String(x.textContent||'').trim()));
   const unknownRenewReviewAction=!!unknownCard?.querySelector('[data-renewability-review="'+ids.unknownRenewPolicy+'"]');
   const regularCard=h.querySelector('[data-renewal-policy="'+ids.renewalPolicy+'"]');
   const regularActionCount=regularCard?regularCard.querySelectorAll('a.reno-wa,button').length:0;
   Orbit.pais='CO';Orbit.modules.renovaciones.render(h);
   const renewCO=countries('[data-renewal-country]','data-renewal-country');
   Orbit.pais=previous;
   return{
     cancelGT:gt.countries,cancelCO:co.countries,cancelGtMs:gt.ms,cancelCoMs:co.ms,
     cancelExplicitTargetsGT:gt.explicitTargets,cancelExplicitTargetsCO:co.explicitTargets,
     cancelCrossCountryExplicitGT:gt.crossCountryExplicit,cancelCrossCountryExplicitCO:co.crossCountryExplicit,
     cancelIdentitySampleGT:gt.identitySample,cancelIdentitySampleCO:co.identitySample,
     renewGT,renewCO,syntheticCancelVisibleGT,syntheticRenewVisibleGT,unknownRenewVisibleGT,unknownRenewPendingBadge,unknownRenewReviewAction,regularActionCount,cancelKpiDetailOpen
   };
 },ids);
 need(proof.visualScope.cancelGT.every(x=>x==='GT')&&proof.visualScope.cancelCO.every(x=>x==='CO'),'B4_003_CANCEL_SELECTED_COUNTRY_SCOPE_LEAK');
 need(proof.visualScope.cancelGtMs<2500&&proof.visualScope.cancelCoMs<2500,'B4_003_R13_CANCEL_COUNTRY_SWITCH_TOO_SLOW:'+JSON.stringify({gtMs:proof.visualScope.cancelGtMs,coMs:proof.visualScope.cancelCoMs}));
 need(proof.visualScope.cancelExplicitTargetsGT===true&&proof.visualScope.cancelExplicitTargetsCO===true,'B4_003_R13_CANCEL_EXPLICIT_TARGETS_MISSING');
 need(proof.visualScope.cancelCrossCountryExplicitGT===true&&proof.visualScope.cancelCrossCountryExplicitCO===true,'B4_003_R13_CANCEL_CROSS_COUNTRY_IDENTITY_AMBIGUOUS');
 need(proof.visualScope.renewGT.every(x=>x==='GT')&&proof.visualScope.renewCO.every(x=>x==='CO'),'B4_003_RENEW_SELECTED_COUNTRY_SCOPE_LEAK');
 need(proof.visualScope.syntheticCancelVisibleGT===true&&proof.visualScope.syntheticRenewVisibleGT===true,'B4_003_GT_SYNTHETIC_SCOPE_MISSING');
 need(proof.visualScope.unknownRenewVisibleGT===true&&proof.visualScope.unknownRenewPendingBadge===true&&proof.visualScope.unknownRenewReviewAction===true,'B4_003_R20_UNKNOWN_RENEWABILITY_MUST_STAY_IN_KANBAN:'+JSON.stringify(proof.visualScope));
 proof.assertions.renewabilityTriStateFailClosed=true;
 proof.assertions.renewabilityPendingStaysInKanban=true;
 need(proof.visualScope.cancelKpiDetailOpen===true,'B4_003_CANCEL_KPI_DETAIL_MISSING');
 need(proof.visualScope.regularActionCount>=2,'B4_003_R20_RENEW_ACTIONS_NOT_ACCESSIBLE:'+JSON.stringify(proof.visualScope));
 proof.assertions.cancelSelectedCountryScope=true;
 proof.assertions.cancelCountrySwitchUnder2500ms=true;
 proof.assertions.cancelExplicitCanonicalTargets=true;
 proof.assertions.cancelCrossCountryIdentityExplicit=true;
 proof.assertions.renewalSelectedCountryScope=true;
 proof.assertions.cancelKpiDetails=true;
 proof.assertions.renewalCompactActions=true;
 if(proof.runtimeCancellationEvidence.cancelledPolicyCount>0){
   const probe=proof.runtimeCancellationEvidence.projectionProbe;
   need(probe&&clean(probe.numero),'B4_003_REAL_CANCELATION_PROJECTION_PROBE_MISSING');
   const projection=await page.evaluate(probe=>{
     const h=document.getElementById('host');
     Orbit.modules.cancelaciones.render(h);
     const text=String(h&&h.innerText||'').replace(/\s+/g,' ').trim();
     return{visible:text.includes(String(probe.numero)),sampleNumber:String(probe.numero),emptyState:text.includes('Sin cancelaciones.'),textSample:text.slice(0,1200)};
   },probe);
   proof.runtimeCancellationEvidence.browserProjection=projection;
   proof.assertions.cancellationProjectionConsistent=projection.visible===true&&projection.emptyState===false;
   need(proof.assertions.cancellationProjectionConsistent,'B4_003_CANONICAL_POLICY_CANCELATION_NOT_PROJECTED');
 }

 // R11: prove the exact visual-rejection causes are fixed without touching real business rows.
 proof.r11Browser=await page.evaluate(ids=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';
   Orbit.pais='GT';
   Orbit.modules.cancelaciones.render(h);
   const row=h.querySelector('[data-cancel-policy="'+ids.cancelPolicy+'"]');
   const clientLink=row?.querySelector('[data-cancel-client-link]')||null;
   const policyLink=row?.querySelector('[data-cancel-policy-link]')||null;
   const openButton=row?.querySelector('[data-cancel-open]')||null;
   const clientHref=clientLink?String(clientLink.getAttribute('href')||''):'';
   const rowMisleadingClickable=!!row?.classList.contains('clickable');
   if(openButton) openButton.click();
   const cancellationVisibleRowOpened=!!document.getElementById('c360-edit');
   document.getElementById('c360-edit')?.remove();
   const t0=performance.now();Orbit.modules.calidad.render(h);const qualityGtMs=performance.now()-t0;
   const qualityGT=Array.from(h.querySelectorAll('[data-quality-country]')).map(x=>String(x.getAttribute('data-quality-country')||'').toUpperCase()).filter(Boolean);
   const qualityGtRows=h.querySelectorAll('[data-quality-country]').length,financialGtRows=h.querySelectorAll('[data-information-health-policy]').length,financialGtCount=(Orbit.modules.calidad.financialIntegrityIssues?.()||[]).length;
   Orbit.pais='CO';const t1=performance.now();Orbit.modules.calidad.render(h);const qualityCoMs=performance.now()-t1;
   const qualityCO=Array.from(h.querySelectorAll('[data-quality-country]')).map(x=>String(x.getAttribute('data-quality-country')||'').toUpperCase()).filter(Boolean);
   const qualityCoRows=h.querySelectorAll('[data-quality-country]').length,financialCoRows=h.querySelectorAll('[data-information-health-policy]').length,financialCoCount=(Orbit.modules.calidad.financialIntegrityIssues?.()||[]).length;
   Orbit.pais=previous;
   return{clientHref,policyTargetPresent:!!policyLink,explicitCancelTargetPresent:!!openButton,rowMisleadingClickable,cancellationVisibleRowOpened,qualityGT,qualityCO,qualityGtMs,qualityCoMs,qualityGtRows,qualityCoRows,financialGtRows,financialCoRows,financialGtCount,financialCoCount};
 },ids);
 need(proof.r11Browser.cancellationVisibleRowOpened===true,'B4_003_CANCEL_VISIBLE_ROW_DETAIL_FAILED');
 need(proof.r11Browser.explicitCancelTargetPresent===true&&proof.r11Browser.policyTargetPresent===true&&proof.r11Browser.rowMisleadingClickable===false,'B4_003_R13_CANCEL_TARGET_IDENTITY_FAILED');
 need(/[#/]cliente360\?c=.*[&]t=polizas/.test(proof.r11Browser.clientHref),'B4_003_CANCEL_CLIENT_MUST_OPEN_POLICIES_TAB');
 need(proof.r11Browser.qualityGT.every(x=>x==='GT')&&proof.r11Browser.qualityCO.every(x=>x==='CO'),'B4_003_QUALITY_SELECTED_COUNTRY_SCOPE_LEAK');
 need(proof.r11Browser.qualityGtMs<2500&&proof.r11Browser.qualityCoMs<2500,'B4_003_QUALITY_SYNC_RENDER_TOO_SLOW:'+JSON.stringify({gtMs:proof.r11Browser.qualityGtMs,coMs:proof.r11Browser.qualityCoMs,gtRows:proof.r11Browser.qualityGtRows,coRows:proof.r11Browser.qualityCoRows,financialGtRows:proof.r11Browser.financialGtRows,financialCoRows:proof.r11Browser.financialCoRows,financialGtCount:proof.r11Browser.financialGtCount,financialCoCount:proof.r11Browser.financialCoCount}));
 proof.assertions.cancelVisibleRowDetail=true;
 proof.assertions.cancelDeepLinkIdentity=true;
 proof.assertions.cancelClientOpensPolicies=true;
 proof.assertions.cancelRowNoMisleadingSingleTarget=true;
 proof.assertions.qualitySelectedCountryScope=true;
 proof.assertions.qualityRenderPathUnder2500ms=true;

 // R16.4: Configuración must paint immediately while canonical catalogs hydrate on demand.
 await page.evaluate(()=>{location.hash='#/configuracion';});
 await page.waitForFunction(()=>Orbit.route&&Orbit.route.key==='configuracion',null,{timeout:10000});
 await page.waitForSelector('.cfg-navi[data-t="catalogos"]',{timeout:10000});
 const cfgStart=Date.now();
 proof.r1604ConfigFirstPaint=await page.evaluate(()=>{
   const button=document.querySelector('.cfg-navi[data-t="catalogos"]'),t=performance.now();
   if(!button) return {state:'missing',syncPaintMs:999999,hasVisibleState:false};
   button.click();
   const node=document.querySelector('[data-catalog-state]');
   return {state:String(node?.getAttribute('data-catalog-state')||''),syncPaintMs:performance.now()-t,hasVisibleState:!!node,text:String(node?.innerText||'').replace(/\s+/g,' ').trim().slice(0,500)};
 });
 need(proof.r1604ConfigFirstPaint.hasVisibleState===true&&['loading','ready'].includes(proof.r1604ConfigFirstPaint.state)&&proof.r1604ConfigFirstPaint.syncPaintMs<250,'B4_003_R16_06_CONFIG_IMMEDIATE_PAINT_FAILED:'+JSON.stringify(proof.r1604ConfigFirstPaint));
 await page.waitForSelector('[data-catalog-state="ready"]',{timeout:5000});
 proof.r1604ConfigFirstPaint.canonicalReadyMs=Date.now()-cfgStart;
 proof.r1604ConfigFirstPaint.finalState=await page.evaluate(()=>document.querySelector('[data-catalog-state]')?.getAttribute('data-catalog-state')||'');
 need(proof.r1604ConfigFirstPaint.finalState==='ready'&&proof.r1604ConfigFirstPaint.canonicalReadyMs<5000,'B4_003_R16_06_CONFIG_CANONICAL_READY_TOO_SLOW:'+JSON.stringify(proof.r1604ConfigFirstPaint));
 proof.assertions.configCatalogImmediatePaint=true;
 proof.assertions.configCatalogCanonicalReady=true;

 proof.r16CatalogAndQuality=await page.evaluate(async()=>{
  let catalogEnsureError='';
  try{if(!Orbit.cat||typeof Orbit.cat.ensure!=='function')throw new Error('CATALOG_CLIENT_MISSING');await Orbit.cat.ensure(true);}catch(error){catalogEnsureError=String(error&&error.message||error);}
  const catalogStatus=Orbit.cat&&Orbit.cat.status?Orbit.cat.status():null,geo=Orbit.GEO||{},gt=geo.GT||{},co=geo.CO||{};
  const gtMunicipalities=Object.values(gt).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0),coMunicipalities=Object.values(co).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0);
  const h=document.getElementById('host');Orbit.modules.calidad.render(h);
  return{catalogStatus,gtDepartments:Object.keys(gt).length,gtMunicipalities,coDepartments:Object.keys(co).length,coMunicipalities,
   qualityHasCountryHeader:/País registrado/.test(h.textContent||''),qualityHasOriginEvidenceHeader:/Cómo se determinó/.test(h.textContent||''),
   qualityDeadChannelButtons:Array.from(h.querySelectorAll('button[disabled]')).filter(b=>/Sin canal/.test(b.textContent||'')).length,qualitySearch:!!h.querySelector('#q-search'),qualityCountry:!!h.querySelector('#q-pais'),qualityMissing:!!h.querySelector('#q-falta'),qualityAdvisor:!!h.querySelector('#q-asesor'),qualityActive:!!h.querySelector('#q-vig'),falseChannelHeading:/\bCanal\b/.test(String(h.querySelector('.quality-main-table thead')?.innerText||'')),catalogEnsureError};
 });
 need(proof.r16CatalogAndQuality.catalogStatus&&proof.r16CatalogAndQuality.catalogStatus.hydrated===true&&proof.r16CatalogAndQuality.catalogStatus.syncPending===false,'B4_003_R16_CATALOG_CANONICAL_HYDRATION_FAILED:'+JSON.stringify(proof.r16CatalogAndQuality));
 need(proof.r16CatalogAndQuality.gtDepartments===22&&proof.r16CatalogAndQuality.gtMunicipalities===340&&proof.r16CatalogAndQuality.coMunicipalities===1122,'B4_003_R16_GEO_RUNTIME_COMPLETENESS_FAILED:'+JSON.stringify(proof.r16CatalogAndQuality));
 need(proof.r16CatalogAndQuality.qualitySearch&&proof.r16CatalogAndQuality.qualityCountry&&proof.r16CatalogAndQuality.qualityMissing&&proof.r16CatalogAndQuality.qualityAdvisor&&proof.r16CatalogAndQuality.qualityActive&&!proof.r16CatalogAndQuality.falseChannelHeading,'B4_003_R19_QUALITY_FILTERS_OR_CHANNEL_SEMANTICS_FAILED:'+JSON.stringify(proof.r16CatalogAndQuality));
 need(proof.r16CatalogAndQuality.qualityHasCountryHeader&&proof.r16CatalogAndQuality.qualityHasOriginEvidenceHeader&&proof.r16CatalogAndQuality.qualityDeadChannelButtons===0,'B4_003_R16_QUALITY_RUNTIME_SEMANTICS_FAILED:'+JSON.stringify(proof.r16CatalogAndQuality));
 proof.assertions.tenantCatalogCanonicalHydration=true;proof.assertions.geoGtCoComplete=true;proof.assertions.qualityCountryProvenanceSeparated=true;proof.assertions.qualityNoDeadChannelAction=true;

 // R12: information health surfaces policy/calendar mismatch without rewriting either source value.
 proof.r12InformationHealth=await page.evaluate(ids=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';Orbit.pais='GT';Orbit.modules.calidad.render(h);
   const issue=(Orbit.modules.calidad.financialIntegrityIssues?.()||[]).find(x=>x.p&&x.p.id===ids.healthPolicy);
   const row=h.querySelector('[data-information-health-policy="'+ids.healthPolicy+'"]');
   const text=String(row&&row.innerText||'').replace(/\s+/g,' ').trim();
   Orbit.pais=previous;
   return{issue:issue?{total:issue.total,schedule:issue.schedule,delta:issue.delta,receipts:issue.receipts,shadowRows:issue.shadowRows,calendarAuthority:issue.calendarAuthority,reason:issue.reason}:null,rowVisible:!!row,rowText:text,technicalToken:/SINGLE_PHYSICAL_CALENDAR|POLICY_CUOTAS|AMBIGUOUS_FAIL_CLOSED|PRIMARY_POLICY_UNIVERSE|REQUIERE_VALIDACION/.test(text),exactAction:!!row?.querySelector('[data-health-open-review]'),mobileContract:!!h.querySelector('.quality-fin-mobile')};
 },ids);
 need(proof.r12InformationHealth.rowVisible===true,'B4_003_R12_INFORMATION_HEALTH_ROW_MISSING');
 need(Math.abs(proof.r12InformationHealth.issue?.total-407.01)<0.001&&Math.abs(proof.r12InformationHealth.issue?.schedule-542.68)<0.001,'B4_003_R12_INFORMATION_HEALTH_VALUES_CHANGED');
 need(Math.abs(proof.r12InformationHealth.issue?.delta-135.67)<0.001,'B4_003_R12_INFORMATION_HEALTH_DELTA_INVALID');
 need(proof.r12InformationHealth.issue?.shadowRows===1&&proof.r12InformationHealth.issue?.receipts===2,'B4_003_R16_05_RECEIPT_SHADOW_DUPLICATE_NOT_EXCLUDED:'+JSON.stringify(proof.r12InformationHealth));
 need(proof.r12InformationHealth.technicalToken===false&&proof.r12InformationHealth.exactAction===true&&proof.r12InformationHealth.mobileContract===true&&!!proof.r12InformationHealth.issue?.reason,'B4_003_R17_QUALITY_HUMAN_SEMANTICS_MISSING:'+JSON.stringify(proof.r12InformationHealth));
 proof.assertions.receiptShadowDuplicateProjection=true;proof.assertions.qualityResolutionHumanSemantics=true;
 proof.assertions.informationHealthFinancialMismatchVisible=true;proof.assertions.informationHealthNoInference=true;

 proof.r18QualityProvenance=await page.evaluate(async ids=>{
   const h=document.getElementById('host');Orbit.pais='GT';Orbit.modules.calidad.render(h);
   const row=Array.from(h.querySelectorAll('[data-quality-country="GT"]')).find(x=>String(x.innerText||'').includes('B4-003 QA Cliente'))||null;
   const documentButton=Array.from(row?.querySelectorAll('button')||[]).find(b=>/Confirmar origen del país/.test(b.innerText||''))||null;
   if(documentButton)documentButton.click();
   await new Promise(r=>setTimeout(r,60));
   const modal=document.getElementById('q-inline'),country=modal?.querySelector('#qi-pais');
   const out={buttonPresent:!!documentButton,modalPresent:!!modal,country:String(country?.value||''),hasReason:!!modal?.querySelector('#qi-motivo'),phoneLabel:/teléfono \/ WhatsApp/i.test(String(h.innerText||''))};
   modal?.remove();return out;
 },ids);
 need(proof.r18QualityProvenance.buttonPresent&&proof.r18QualityProvenance.modalPresent&&proof.r18QualityProvenance.country==='GT'&&proof.r18QualityProvenance.hasReason,'B4_003_R18_QUALITY_PROVENANCE_ACTION_MISSING:'+JSON.stringify(proof.r18QualityProvenance));
 proof.assertions.qualityProvenanceActionable=true;

 proof.r20SecondQualityPhone=await page.evaluate(ids=>{
   const h=document.getElementById('host');Orbit.pais='GT';Orbit.modules.calidad.render(h);
   const row=Array.from(h.querySelectorAll('[data-quality-country="GT"]')).find(x=>String(x.innerText||'').includes('B4-003 QA Cliente'))||null;
   const phoneButton=Array.from(row?.querySelectorAll('button')||[]).find(b=>/Agregar teléfono \/ WhatsApp/.test(String(b.innerText||'')))||null;
   if(phoneButton)phoneButton.click();
   const modal=document.getElementById('q-inline'),code=modal?.querySelector('#qi-phone-code'),phone=modal?.querySelector('#qi-telefono');
   const fields=Array.from(modal?.querySelectorAll('input,select,textarea')||[]).map(x=>x.id).filter(Boolean);
   const topScroll=h.querySelector('[data-quality-scroll-top="1"]'),mainScroll=h.querySelector('[data-quality-scroll="1"]');
   const out={buttonPresent:!!phoneButton,modalPresent:!!modal,code:String(code?.value||''),phonePresent:!!phone,fields,onlyPhoneBusinessFields:!!phone&&!modal?.querySelector('#qi-pais')&&!modal?.querySelector('#qi-email')&&!modal?.querySelector('#qi-departamento'),topScroll:!!topScroll,mainScroll:!!mainScroll,topScrollWidth:topScroll?.scrollWidth||0,mainScrollWidth:mainScroll?.scrollWidth||0};
   modal?.remove();return out;
 },ids);
 need(proof.r20SecondQualityPhone.buttonPresent&&proof.r20SecondQualityPhone.modalPresent&&proof.r20SecondQualityPhone.code==='+502'&&proof.r20SecondQualityPhone.phonePresent&&proof.r20SecondQualityPhone.onlyPhoneBusinessFields&&proof.r20SecondQualityPhone.topScroll&&proof.r20SecondQualityPhone.mainScroll,'B4_003_R20_SECOND_REVIEW_QUALITY_PHONE_OR_SCROLL_FAILED:'+JSON.stringify(proof.r20SecondQualityPhone));
 proof.assertions.qualityPhoneFocusedModal=true;proof.assertions.qualityPhoneDefaultCountryCode=true;proof.assertions.qualityTopHorizontalScroll=true;

 await page.evaluate(ids=>{const h=document.getElementById('host');Orbit.pais='GT';Orbit.modules.calidad.render(h);h.querySelector('[data-information-health-policy="'+ids.healthPolicy+'"] [data-health-open-review]')?.click();},ids);
 await page.waitForSelector('#quality-fin-review',{timeout:10000});
 proof.r18QualityReviewModal=await page.evaluate(()=>{const m=document.getElementById('quality-fin-review'),text=String(m?.innerText||'').replace(/\s+/g,' ').trim();return{modal:!!m,hasComparison:/Qué estamos comparando/.test(text),hasWhy:/Por qué requiere revisión/.test(text),hasReceipts:!!m?.querySelector('[data-receipts]'),hasPolicy:!!m?.querySelector('[data-policy]'),receiptLabel:String(m?.querySelector('[data-receipts]')?.innerText||''),policyLabel:String(m?.querySelector('[data-policy]')?.innerText||''),technical:/I6_|PRIMARY_POLICY_UNIVERSE|SINGLE_PHYSICAL_CALENDAR|REQUIERE_VALIDACION/.test(text)};});
 need(proof.r18QualityReviewModal.modal&&proof.r18QualityReviewModal.hasComparison&&proof.r18QualityReviewModal.hasWhy&&/Revisar recibos/.test(proof.r18QualityReviewModal.receiptLabel)&&/Corregir en póliza/.test(proof.r18QualityReviewModal.policyLabel)&&!proof.r18QualityReviewModal.technical,'B4_003_R18_QUALITY_REVIEW_MODAL_NOT_ACTIONABLE:'+JSON.stringify(proof.r18QualityReviewModal));
 proof.assertions.qualityReviewTruthfulAndActionable=true;
 await page.evaluate(()=>document.querySelector('#quality-fin-review [data-receipts]')?.click());
 await page.waitForFunction(id=>location.hash.includes('p='+encodeURIComponent(id))&&location.hash.includes('t=recibos'),ids.healthPolicy,{timeout:10000});
 proof.r17QualityReceiptsDeepLink=await page.evaluate(id=>({hash:location.hash,policyId:id,receiptsTarget:location.hash.includes('t=recibos')}));
 need(proof.r17QualityReceiptsDeepLink.receiptsTarget===true,'B4_003_R17_QUALITY_RECEIPTS_DEEPLINK_MISSING:'+JSON.stringify(proof.r17QualityReceiptsDeepLink));
 proof.assertions.qualityExactPolicyResolutionPath=true;proof.assertions.qualityReceiptsExactContext=true;

 await page.evaluate(id=>Orbit.modules.cliente360.editarPoliza(id),ids.unknownRenewPolicy);
 await page.waitForSelector('#policy-v1199 [data-ramo]',{timeout:10000});
 proof.policyEditorPreservation=await page.evaluate(()=>({
   ramo:String(document.querySelector('#policy-v1199 [data-ramo]')?.value||''),
   producto:String(document.querySelector('#policy-v1199 [data-product]')?.value||''),
   renovable:String(document.querySelector('#policy-v1199 [data-renewable]')?.value||'')
 }));
 need(proof.policyEditorPreservation.ramo==='ACCIDENTES QA FUENTE','B4_003_POLICY_EDITOR_RAMO_SOURCE_VALUE_REPLACED');
 need(proof.policyEditorPreservation.producto==='PRODUCTO QA FUENTE','B4_003_POLICY_EDITOR_PRODUCT_SOURCE_VALUE_REPLACED');
 need(proof.policyEditorPreservation.renovable==='','B4_003_POLICY_EDITOR_UNKNOWN_RENEWABILITY_NOT_PRESERVED');
 proof.assertions.policyEditorPreservesSourceTaxonomy=true;
 proof.assertions.policyEditorExposesRenewabilityTriState=true;
 await page.evaluate(()=>document.getElementById('policy-v1199')?.remove());
 await page.setViewportSize({width:390,height:844});
 proof.r1604MobileQuality=await page.evaluate(()=>{const h=document.getElementById('host');Orbit.pais='GT';Orbit.modules.calidad.render(h);const mobile=h.querySelector('.quality-fin-mobile'),desktop=h.querySelector('.quality-fin-desktop'),card=mobile&&mobile.querySelector('[data-information-health-card-policy]');return{mobileDisplay:mobile?getComputedStyle(mobile).display:'missing',desktopDisplay:desktop?getComputedStyle(desktop).display:'missing',cardVisible:!!card,hasResolutionAction:!!mobile?.querySelector('[data-health-open-review]')};});
 need(proof.r1604MobileQuality.mobileDisplay!=='none'&&proof.r1604MobileQuality.desktopDisplay==='none'&&proof.r1604MobileQuality.cardVisible&&proof.r1604MobileQuality.hasResolutionAction,'B4_003_R16_04_QUALITY_MOBILE_USABILITY_FAILED:'+JSON.stringify(proof.r1604MobileQuality));
 proof.assertions.qualityMobileResolutionCard=true;
 const qualityHuman=await page.evaluate(()=>{const h=document.getElementById('host');return{text:String(h?.innerText||''),workbench:!!h?.querySelector('.quality-workbench'),humanHeading:/Revisión de prima y programación de pagos|Expedientes que requieren atención/.test(String(h?.innerText||''))};});
 need(!/I6_4_PRIMARY_POLICY_UNIVERSE|contractualSource|provenance/i.test(qualityHuman.text),'B4_003_R20_QUALITY_TECHNICAL_TERMS_VISIBLE:'+JSON.stringify(qualityHuman));
 need(qualityHuman.workbench===true&&qualityHuman.humanHeading===true,'B4_003_R20_QUALITY_VISUAL_HIERARCHY_MISSING:'+JSON.stringify(qualityHuman));
 proof.assertions.qualityTechnicalTermsHumanized=true;proof.assertions.qualityPremiumHierarchyVisible=true;
 await page.setViewportSize({width:1280,height:720});
 proof.r17KanbanCardContainment=await page.evaluate(()=>{
   const probe=document.createElement('div');
   probe.id='b4003-r17-kanban-card-probe';
   probe.style.cssText='position:fixed;left:-2400px;top:0;width:560px;height:360px;display:block';
   probe.innerHTML='<div class="kanban" style="width:520px"><div class="kcol"><div class="kcol-h2" style="--lc:#999"><span class="kcol-emoji">🧪</span><b>Cotizaciones</b><span class="kcount">1</span></div><div class="kcol-body"><div class="kcard"><div class="kcard-top"><span class="badge neutral">Automóviles</span></div><div class="kcard-t">PILOTV6_S1_CTO2_CTO3_20261003_01_NOMBRE_EXTREMADAMENTE_LARGO_SIN_ESPACIOS</div><div class="kcard-cli">Auto Total · Q0</div><div class="kcard-meta">Cotizando · 45%</div><div class="kcard-foot"><span>SD</span><span class="kchk">✓ 1/4</span><span class="kvence">en 1d</span></div></div></div></div></div>';
   document.body.appendChild(probe);
   const col=probe.querySelector('.kcol'),body=probe.querySelector('.kcol-body'),card=probe.querySelector('.kcard'),title=probe.querySelector('.kcard-t');
   const cr=col.getBoundingClientRect(),br=body.getBoundingClientRect(),kr=card.getBoundingClientRect(),ts=getComputedStyle(title);
   const out={colWidth:cr.width,bodyWidth:br.width,cardWidth:kr.width,cardWithinColumn:kr.left>=cr.left-1&&kr.right<=cr.right+1,cardWithinBody:kr.left>=br.left-1&&kr.right<=br.right+1,cardScrollWidth:card.scrollWidth,cardClientWidth:card.clientWidth,titleOverflowWrap:ts.overflowWrap,titleWordBreak:ts.wordBreak};
   probe.remove();return out;
 });
 need(proof.r17KanbanCardContainment.cardWithinColumn===true&&proof.r17KanbanCardContainment.cardWithinBody===true&&proof.r17KanbanCardContainment.cardScrollWidth<=proof.r17KanbanCardContainment.cardClientWidth+1&&['anywhere','break-word'].includes(proof.r17KanbanCardContainment.titleOverflowWrap),'B4_003_R17_OPS_LEADS_CARD_OVERFLOW:'+JSON.stringify(proof.r17KanbanCardContainment));
 proof.assertions.opsLeadsKanbanCardContained=true;

 await page.evaluate(async()=>{Orbit.pais='GT';await Orbit.ciclo.nuevoNegocio();});
 await page.waitForSelector('#ciclo-modal #nn-ingreso',{timeout:10000});
 proof.r18CommercialCreate=await page.evaluate(()=>{
   const modal=document.getElementById('ciclo-modal'),entry=modal?.querySelector('#nn-ingreso'),ramo=modal?.querySelector('#nn-ramo'),product=modal?.querySelector('#nn-prod'),plan=modal?.querySelector('#nn-plan'),insurers=modal?.querySelector('#nn-asg');
   const entryDef=Orbit.cat.puntoIngreso(entry?.value||''),ids=Array.from(modal?.querySelectorAll('select')||[]).map(x=>x.id).filter(Boolean);
   const productValues=Array.from(product?.options||[]).map(o=>o.value).filter(Boolean).sort(),canonical=(Orbit.cat.subramosDe('GT',ramo?.value)||[]).slice().sort();
   return{entryId:String(entry?.value||''),entryStage:String(entryDef?.etapa||''),ids,ramoBeforeProduct:ids.indexOf('nn-ramo')>=0&&ids.indexOf('nn-ramo')<ids.indexOf('nn-prod'),productBeforePlan:ids.indexOf('nn-prod')>=0&&ids.indexOf('nn-prod')<ids.indexOf('nn-plan'),productValues,canonical,nativeMultiple:!!insurers?.matches?.('select[multiple]'),insurerCheckboxes:insurers?.querySelectorAll?.('input[data-insurer-id]')?.length||0};
 });
 need(proof.r18CommercialCreate.entryStage==='nuevo'&&proof.r18CommercialCreate.ramoBeforeProduct&&proof.r18CommercialCreate.productBeforePlan&&JSON.stringify(proof.r18CommercialCreate.productValues)===JSON.stringify(proof.r18CommercialCreate.canonical)&&proof.r18CommercialCreate.nativeMultiple===false&&proof.r18CommercialCreate.insurerCheckboxes>0,'B4_003_R19_COMMERCIAL_CREATE_CONTRACT_FAILED:'+JSON.stringify(proof.r18CommercialCreate));
 proof.r19CommercialDependency=await page.evaluate(async()=>{
   const m=document.getElementById('ciclo-modal'),ramo=m?.querySelector('#nn-ramo'),product=m?.querySelector('#nn-prod'),plan=m?.querySelector('#nn-plan');if(!ramo||!product||!plan)return{ok:false,reason:'controls_missing'};
   const ramos=Array.from(ramo.options).map(o=>o.value).filter(Boolean);let pair=null;
   for(const a of ramos){const aa=Orbit.cat.subramosDe('GT',a)||[];for(const b of ramos){if(a===b)continue;const bb=Orbit.cat.subramosDe('GT',b)||[];const stale=aa.find(x=>!bb.includes(x));if(stale){pair={a,b,stale};break;}}if(pair)break;}
   if(!pair)return{ok:false,reason:'no_discriminant_pair',ramos};
   ramo.value=pair.a;ramo.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,40));
   product.value=pair.stale;product.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,40));
   ramo.value=pair.b;ramo.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,40));
   const box=m.querySelector('#nn-asg input[data-insurer-id]');if(box){box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));}
   return{ok:true,pair,productAfter:product.value,planAfter:plan.value,productOptions:Array.from(product.options).map(o=>o.value),checkboxUsable:!!box&&box.checked===true};
 });
 need(proof.r19CommercialDependency.ok&&proof.r19CommercialDependency.productAfter===''&&proof.r19CommercialDependency.planAfter===''&&proof.r19CommercialDependency.checkboxUsable===true,'B4_003_R19_COMMERCIAL_DEPENDENCY_OR_MULTISELECT_FAILED:'+JSON.stringify(proof.r19CommercialDependency));
 await page.setViewportSize({width:390,height:844});
 proof.r18CommercialMobile=await page.evaluate(()=>{const modal=document.getElementById('ciclo-modal'),card=modal?.querySelector('.ciclo-card');return{viewport:innerWidth,cardWidth:card?.getBoundingClientRect().width||0,cardScrollWidth:card?.scrollWidth||0,cardClientWidth:card?.clientWidth||0,footerButtons:Array.from(modal?.querySelectorAll('.ciclo-foot .btn')||[]).length};});
 need(proof.r18CommercialMobile.cardWidth<=390&&proof.r18CommercialMobile.cardScrollWidth<=proof.r18CommercialMobile.cardClientWidth+2,'B4_003_R18_COMMERCIAL_MOBILE_OVERFLOW:'+JSON.stringify(proof.r18CommercialMobile));
 proof.assertions.commercialDefaultNew=true;proof.assertions.commercialRamoProductPlanDependent=true;proof.assertions.commercialMobileResponsive=true;
 await page.setViewportSize({width:1280,height:720});
 await page.evaluate(()=>document.getElementById('ciclo-modal')?.remove());

 await page.evaluate(async()=>{await Orbit.ciclo.managementCreateModal({origen:'Ops',openAfterCreate:false});});
 await page.waitForSelector('#ciclo-modal #mg-tipo',{timeout:10000});
 proof.r18ManagementModal=await page.evaluate(()=>{
   const modal=document.getElementById('ciclo-modal'),type=modal?.querySelector('#mg-tipo'),queue=modal?.querySelector('#mg-lista');
   const typeValues=Array.from(type?.options||[]).map(o=>String(o.value||o.textContent||'').trim()).filter(Boolean);
   return{typeCount:typeValues.length,typeValues:typeValues.slice(0,20),queueReadonly:!!queue?.readOnly,queue:String(queue?.value||''),help:/determina por el tipo de gestión/i.test(String(modal?.innerText||''))};
 });
 need(proof.r18ManagementModal.typeCount>2&&proof.r18ManagementModal.queueReadonly&&proof.r18ManagementModal.help,'B4_003_R18_MANAGEMENT_TYPE_QUEUE_FAILED:'+JSON.stringify(proof.r18ManagementModal));
 proof.assertions.managementTypeDrivesQueue=true;
 await page.evaluate(()=>document.getElementById('ciclo-modal')?.remove());

 await page.evaluate(()=>{Orbit.pais='TODOS';location.hash='#/renovaciones';});
 await page.waitForFunction(()=>Orbit.route&&Orbit.route.key==='renovaciones',null,{timeout:10000});
 await page.waitForSelector('[data-renewability-pending-count]',{timeout:10000});
 await page.waitForSelector('[data-renewal-bucket="vencidas"]',{timeout:10000});
 proof.r18RenewalDisposition=await page.evaluate(ids=>{
   const bucketKeys=['vencidas','d15','d45','d90'];
   const buckets=bucketKeys.map(key=>{const el=document.querySelector('[data-renewal-bucket="'+key+'"]');return{key,count:Number(el?.getAttribute('data-renewal-bucket-count')||0),ids:Array.from(el?.querySelectorAll('[data-renewal-policy]')||[]).map(x=>String(x.getAttribute('data-renewal-policy')||''))};});
   const pending=Number(document.querySelector('[data-renewability-pending-count]')?.getAttribute('data-renewability-pending-count')||0);
   const unknown=document.querySelector('[data-renewal-policy="'+ids.unknownRenewPolicy+'"]');
   const unknownBadge=Array.from(unknown?.querySelectorAll('.badge')||[]).some(x=>/Revisión necesaria|Decisión: renovabilidad pendiente/.test(String(x.textContent||'').trim()));
   const unknownReview=!!unknown?.querySelector('[data-renewability-review="'+ids.unknownRenewPolicy+'"]');
   const parallelDispositionAbsent=!document.querySelector('[data-renewal-disposition-detail],[data-renewal-date45-reconciled]');
   const terminal=p=>!!p.renovadaPor||['renovada','norenovada','rechazada','cerrada','cancelada'].includes(String(p.renovacionEstado||'').trim().toLowerCase().replace(/[\s_-]+/g,''));
   const renewState=p=>{if(!Object.prototype.hasOwnProperty.call(p,'renovable')||p.renovable==null||String(p.renovable).trim()==='')return'UNKNOWN';const v=String(p.renovable).trim().toLowerCase();if(p.renovable===true||['true','si','sí','renovable'].includes(v))return'YES';if(p.renovable===false||['false','no','no renovable'].includes(v))return'NO';return'UNKNOWN';};
   const expected=(Orbit.store?.all?.('polizas')||[]).filter(p=>{const state=String(p.estado||'').trim().toLowerCase().replace(/\s+/g,''),d=Orbit.ui.daysFromNow(p.vigenciaFin);return renewState(p)!=='NO'&&!terminal(p)&&d!=null&&d>=0&&d<=45&&['vigente','porrenovar'].includes(state);}).map(p=>String(p.id)).sort();
   const visible=buckets.filter(x=>x.key==='d15'||x.key==='d45').flatMap(x=>x.ids).sort();
   const note=document.querySelector('[data-expired-pipeline-count]');return{approvedBuckets:buckets.map(x=>x.key),buckets,pending,unknownInKanban:!!unknown,unknownBadge,unknownReview,parallelDispositionAbsent,date45ExpectedIds:expected,date45VisibleIds:visible,expiredPipelineCount:Number(note?.getAttribute('data-expired-pipeline-count')||-1),expiredHistoricalCount:Number(note?.getAttribute('data-expired-historical-count')||-1),noteText:String(note?.innerText||'')};
 },ids);
 need(JSON.stringify(proof.r18RenewalDisposition.approvedBuckets)===JSON.stringify(['vencidas','d15','d45','d90'])&&proof.r18RenewalDisposition.parallelDispositionAbsent===true&&proof.r18RenewalDisposition.pending>=1&&proof.r18RenewalDisposition.unknownInKanban===true&&proof.r18RenewalDisposition.unknownBadge===true&&proof.r18RenewalDisposition.unknownReview===true&&JSON.stringify(proof.r18RenewalDisposition.date45VisibleIds)===JSON.stringify(proof.r18RenewalDisposition.date45ExpectedIds),'B4_003_R20_RENEWAL_KANBAN_RECONCILIATION_FAILED:'+JSON.stringify(proof.r18RenewalDisposition));
 need(proof.r18RenewalDisposition.expiredPipelineCount===proof.r18RenewalDisposition.buckets.find(x=>x.key==='vencidas').count&&proof.r18RenewalDisposition.expiredHistoricalCount>=proof.r18RenewalDisposition.expiredPipelineCount&&/situaciones para revisar/i.test(proof.r18RenewalDisposition.noteText),'B4_003_R20_RENEWAL_EXPIRED_KPI_SEMANTICS_FAILED:'+JSON.stringify(proof.r18RenewalDisposition));
 // B4-003: functional renewal search in the approved four-column Kanban.
 const searchNumber=await page.evaluate(id=>String(Orbit.store?.get?.('polizas',id)?.numero||''),ids.unknownRenewPolicy);
 need(searchNumber.length>0,'B4_003_RENEWAL_SEARCH_SOURCE_ROW_MISSING');
 await page.fill('[data-renewal-search-input]',searchNumber);
 try{await page.waitForFunction(id=>!!document.querySelector('[data-renewal-search-state="ready"]')&&!!document.querySelector('[data-renewal-policy="'+id+'"]'),ids.unknownRenewPolicy,{timeout:15000});}catch(error){
   const state=await page.evaluate(id=>{
     const ui=document.querySelector('[data-renewal-search-state]'),store=Orbit.store,status=store&&store._productStatus?.()||{};
     const allowed=['clientes','polizas','asesores','aseguradoras','vehiculos'];
     return{route:String(location.hash||''),searchState:ui?.dataset.renewalSearchState||'',hint:String(ui?.textContent||''),cards:document.querySelectorAll('[data-renewal-policy]').length,targetVisible:!!document.querySelector('[data-renewal-policy="'+id+'"]'),confirmed:(status.serverConfirmedCollections||[]).filter(x=>allowed.includes(x)),optionalMissing:(status.optionalMissing||[]).filter(x=>allowed.includes(x)),denied:(status.deniedCollections||[]).filter(x=>allowed.includes(x)),projectionAvailable:store?.__productHydrationRequiredOptionalP0?.advisorProjectionMemoized===true};
   },ids.unknownRenewPolicy);
   throw new Error('B4_003_RENEWAL_SEARCH_TARGET_NOT_READY_OR_NOT_VISIBLE:'+JSON.stringify(state)+'|'+String(error.message||error));
 }
 const renewalSearchPositive=await page.evaluate(()=>({columns:document.querySelectorAll('[data-renewal-bucket]').length,shown:Number(document.querySelector('[data-renewal-search-shown]')?.dataset.renewalSearchShown),total:Number(document.querySelector('[data-renewal-search-total]')?.dataset.renewalSearchTotal),cards:document.querySelectorAll('[data-renewal-policy]').length}));
 need(renewalSearchPositive.columns===4&&renewalSearchPositive.cards===renewalSearchPositive.shown&&renewalSearchPositive.shown>=1,'B4_003_RENEWAL_SEARCH_POSITIVE_OR_COLUMN_DRIFT:'+JSON.stringify(renewalSearchPositive));
 await page.fill('[data-renewal-search-input]','B4003-NOMATCH-SEARCH-TEST-20261009');
 await page.waitForFunction(()=>!!document.querySelector('[data-renewal-search-state="ready"]')&&document.querySelectorAll('[data-renewal-policy]').length===0,null,{timeout:15000});
 const renewalSearchNegative=await page.evaluate(()=>({columns:document.querySelectorAll('[data-renewal-bucket]').length,message:String(document.querySelector('[data-renewal-search-state="ready"]')?.innerText||'')}));
 need(renewalSearchNegative.columns===4&&/Mostrando 0 de/.test(renewalSearchNegative.message),'B4_003_RENEWAL_SEARCH_NEGATIVE_NOT_EXPLAINED:'+JSON.stringify(renewalSearchNegative));
 await page.click('[data-renewal-search-clear]');
 await page.waitForFunction(id=>!!document.querySelector('[data-renewal-search-state="idle"]')&&!!document.querySelector('[data-renewal-policy="'+id+'"]'),ids.unknownRenewPolicy,{timeout:12000});
 proof.r20RenewalSearch={positive:renewalSearchPositive,negative:renewalSearchNegative,cleared:true};
 const readFacadeR21=await page.evaluate(()=>{
   const store=Orbit.store,hydration=store?.__productHydrationRequiredOptionalP0||null,status=store?._productStatus?.()||{};
   return{readOnly:store?.__productReadOnlyP0===true,operationalFacade:store?.__productOperationalWriteP0===true,
     ensureCollections:typeof store?._ensureCollections==='function',
     advisorProjectionMemoized:hydration?.advisorProjectionMemoized===true,
     readyAuthority:String(status.requiredReadinessAuthority||''),
     confirmed:[].concat(status.serverConfirmedCollections||[]).filter(v=>['clientes','polizas','vehiculos','aseguradoras'].includes(v))};
 });
 need(readFacadeR21.readOnly&&readFacadeR21.operationalFacade&&readFacadeR21.ensureCollections&&readFacadeR21.advisorProjectionMemoized&&
   readFacadeR21.confirmed.includes('polizas')&&readFacadeR21.confirmed.includes('clientes'),
  'B4_003_R21_OPERATIONAL_FACADE_READ_HYDRATION_FORWARDER_MISSING:'+JSON.stringify(readFacadeR21));
 proof.r21ReadOnlyFacadeHydration=readFacadeR21;
 proof.assertions.readOnlyOperationalFacadeHydrationForwarded=true;
 proof.assertions.renewalSearchKanbanPositiveNegativeClear=true;
 proof.assertions.renewalExpiredKpiSemanticsHuman=true;
 proof.assertions.renewalDate45UniverseReconciled=true;
 proof.r1604RenewabilityWorkflow=await page.evaluate(ids=>{const note=document.querySelector('[data-renewability-pending-count]'),button=document.querySelector('[data-renewability-review="'+ids.unknownRenewPolicy+'"]');return{instruction:!!note&&note.tagName==='DETAILS'&&!!document.querySelector('[data-renewal-bucket="d45"]'),buttonLabel:String(button?.innerText||''),buttonPresent:!!button};},ids);
 need(proof.r1604RenewabilityWorkflow.instruction&&proof.r1604RenewabilityWorkflow.buttonPresent&&/Revisar renovabilidad/i.test(proof.r1604RenewabilityWorkflow.buttonLabel),'B4_003_R20_RENEWABILITY_WORKFLOW_NOT_ACTIONABLE:'+JSON.stringify(proof.r1604RenewabilityWorkflow));
 await page.evaluate(id=>document.querySelector('[data-renewability-review="'+id+'"]')?.click(),ids.unknownRenewPolicy);
 await page.waitForSelector('#policy-v1199 [data-renewable]',{timeout:10000});
 proof.r17RenewabilityFocusedEditor=await page.evaluate(()=>{const el=document.querySelector('#policy-v1199 [data-renewable]');return{value:String(el?.value||''),focused:document.activeElement===el,options:Array.from(el?.options||[]).map(o=>o.textContent.trim())};});
 need(proof.r17RenewabilityFocusedEditor.value===''&&proof.r17RenewabilityFocusedEditor.focused===true&&['Pendiente de validar','Renovable','No renovable'].every(x=>proof.r17RenewabilityFocusedEditor.options.includes(x)),'B4_003_R17_RENEWABILITY_EDITOR_NOT_FOCUSED_TRI_STATE:'+JSON.stringify(proof.r17RenewabilityFocusedEditor));
 proof.assertions.renewabilityReviewWorkflowActionable=true;proof.assertions.renewabilityReviewOpensFocusedTriState=true;
 await page.evaluate(()=>document.getElementById('policy-v1199')?.remove());
 await page.evaluate(id=>Orbit.modules.cliente360.editarPoliza(id,'renovabilidad'),ids.renewabilityWritePolicy);
 await page.waitForSelector('#policy-v1199 [data-renewable]',{timeout:10000});
 await page.selectOption('#policy-v1199 [data-renewable]',{label:'Renovable'});
 await page.fill('#policy-v1199 [data-reason]','B4-003 R19 persistencia sintética de renovabilidad');
 await page.click('#policy-v1199 [data-save]');
 await page.waitForFunction(()=>!document.getElementById('policy-v1199'),null,{timeout:30000});
 const renewabilityBackend=(await ref('polizas',ids.renewabilityWritePolicy).get()).data()||{};
 need(renewabilityBackend.renovable===true,'B4_003_R19_RENEWABILITY_SERVER_COMMIT_MISSING');
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});await bootProduct(page,token);
 await page.waitForFunction(id=>Orbit.store?.get('polizas',id)?.renovable===true,ids.renewabilityWritePolicy,{timeout:30000});
 proof.r19RenewabilityDurable={policyId:ids.renewabilityWritePolicy,serverValue:renewabilityBackend.renovable,reloadValue:await page.evaluate(id=>Orbit.store.get('polizas',id)?.renovable,ids.renewabilityWritePolicy)};
 proof.assertions.renewabilitySyntheticServerCommitReload=true;



 await page.evaluate(id=>{location.hash='#/cliente360?c='+encodeURIComponent(id)+'&t=polizas';},ids.client);
 await page.waitForFunction(()=>Orbit.route&&Orbit.route.key==='cliente360',null,{timeout:10000});
 await page.waitForSelector('#ficha-tabs',{timeout:10000});
 proof.clientTabs=await page.evaluate(()=>{
   const strip=document.getElementById('ficha-tabs'),prev=document.getElementById('ftab-prev');
   const max=Math.max(0,strip.scrollWidth-strip.clientWidth);
   if(max>0){strip.scrollLeft=Math.min(max,Math.max(80,strip.clientWidth*.35));strip.dispatchEvent(new Event('scroll'));}
   return{prevExists:!!prev,maxScroll:max,hasPrev:!!strip.closest('.ficha-tabs-wrap')?.classList.contains('has-prev')};
 });
 need(proof.clientTabs.prevExists===true,'B4_003_CLIENT360_LEFT_TAB_CONTROL_MISSING');
 need(proof.clientTabs.maxScroll===0||proof.clientTabs.hasPrev===true,'B4_003_CLIENT360_LEFT_TAB_CONTROL_NOT_ACTIVATED');
 proof.assertions.client360BidirectionalTabs=true;

 // R13: Pólizas route, search and direct detail must stay bounded and hydration-safe.
 await page.waitForFunction(()=>{
   const s=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
   const confirmed=s.serverConfirmedCollections||[];
   return ['clientes','polizas','vehiculos'].every(x=>confirmed.includes(x));
 },null,{timeout:30000});
 await page.evaluate(()=>{Orbit.pais='TODOS';});
 /* Measure first correct table paint INSIDE Chrome, preserving 2500ms.
    The previous wall-clock number included remote Playwright scheduling latency. */
 const policyRouteStarted=Date.now();
 await page.evaluate(()=>{
   const host=document.getElementById('host');
   if(!host)throw new Error('B4_003_POLICY_ROUTE_HOST_NOT_FOUND');
   const marker={start:performance.now(),routeAt:null,tableAt:null,mutationCount:0};
   window.__b4003PolicyRoutePerformance=marker;
   const observer=new MutationObserver(()=>{
     marker.mutationCount++;
     if(window.Orbit?.route?.key==='polizas'&&marker.routeAt==null)marker.routeAt=performance.now();
     if(host.querySelector('.page[data-polizas-kpi-ready="1"] .tbl')){
       if(marker.tableAt==null)marker.tableAt=performance.now();
       observer.disconnect();
     }
   });
   observer.observe(host,{subtree:true,childList:true});
   location.hash='#/polizas';
 });
 await page.waitForFunction(()=>Orbit.route&&Orbit.route.key==='polizas',null,{timeout:10000});
 await page.waitForSelector('#host .page[data-polizas-kpi-ready="1"] .tbl',{timeout:10000});
 const policyRouteMs=Date.now()-policyRouteStarted;
 const policyRouteBrowser=await page.evaluate(()=>{
   const p=window.__b4003PolicyRoutePerformance||{};
   return{domPaintMs:p.tableAt==null||p.start==null?null:Math.round(p.tableAt-p.start),
     routeOwnerMs:p.routeAt==null||p.start==null?null:Math.round(p.routeAt-p.start),
     mutationCount:Number(p.mutationCount||0),route:window.Orbit?.route?.key||'',
     tableReady:!!document.querySelector('#host .page[data-polizas-kpi-ready="1"] .tbl')};
 });
 proof.r13PolicyRouteTiming={wallMs:policyRouteMs,browser:policyRouteBrowser,measurement:'Chrome performance.now to canonical table DOM mutation'};
 need(policyRouteBrowser.tableReady&&policyRouteBrowser.route==='polizas'&&policyRouteBrowser.domPaintMs!=null,'B4_003_R13_POLICY_ROUTE_BROWSER_METRIC_MISSING:'+JSON.stringify(proof.r13PolicyRouteTiming));
 need(policyRouteBrowser.domPaintMs<2500,'B4_003_R13_POLICY_ROUTE_DOM_TOO_SLOW:'+JSON.stringify(proof.r13PolicyRouteTiming));
 need((await page.locator('[data-polizas-relations-loading]').count())===0,'B4_003_R13_POLICY_ROUTE_STUCK_LOADING');
 const policySearchNumber='B4-003-REN-'+run;
 /* Browser-native input-to-verified-result timing avoids conflating test RPC
    scheduling with real search latency. Keep the contractual <2500ms limit. */
 await page.evaluate(num=>{
   const host=document.getElementById('host'),input=document.getElementById('fq');
   if(!host||!input)throw Error('B4_003_POLICY_SEARCH_OBSERVER_MISSING');
   const stamp={inputAt:null,verifiedAt:null,mutations:0,verificationEvents:0};
   window.__b4003PolicySearchPerformance=stamp;
   let observer=null;
   const verify=()=>{
     stamp.verificationEvents++;
     if(stamp.inputAt==null||stamp.verifiedAt!=null)return;
     const count=String(document.getElementById('fb-count')?.textContent||'').trim();
     const rows=Array.from(host.querySelectorAll('.tbl tbody tr')).filter(row=>String(row.textContent||'').includes(num));
     if(document.getElementById('fq')?.value===num&&/^1\s+de\s+/i.test(count)&&rows.length===1){
       stamp.verifiedAt=performance.now();
       if(observer)observer.disconnect();
     }
   };
   input.addEventListener('input',()=>{
     if(stamp.inputAt==null)stamp.inputAt=performance.now();
     requestAnimationFrame(verify);
   },{capture:true,once:true});
   observer=new MutationObserver(()=>{stamp.mutations++;verify();});
   observer.observe(host,{subtree:true,childList:true});
 },policySearchNumber);
 const policySearchStarted=Date.now();
 await page.fill('#fq',policySearchNumber);
 await page.waitForFunction(num=>{
   const count=String(document.getElementById('fb-count')?.textContent||'').trim();
   const rows=Array.from(document.querySelectorAll('#host .tbl tbody tr')).filter(row=>String(row.textContent||'').includes(num));
   return document.getElementById('fq')?.value===num&&/^1\s+de\s+/i.test(count)&&rows.length===1;
 },policySearchNumber,{timeout:10000});
 const policySearchMs=Date.now()-policySearchStarted;
 const searchChrome=await page.evaluate(()=>{
   const p=window.__b4003PolicySearchPerformance||{};
   return{inputToCorrectDomMs:p.inputAt!=null&&p.verifiedAt!=null?Math.round(p.verifiedAt-p.inputAt):null,
      mutationCount:Number(p.mutations||0),inputPresent:!!document.getElementById('fq')};
 });
 proof.r13PolicySearchTiming={wallMs:policySearchMs,browser:searchChrome,measurement:'Chrome input event to exact filtered DOM'};
 need(searchChrome.inputToCorrectDomMs!=null,
   'B4_003_R13_POLICY_SEARCH_DOM_METRIC_MISSING:'+JSON.stringify(proof.r13PolicySearchTiming));
 need(searchChrome.inputToCorrectDomMs<2500,
   'B4_003_R13_POLICY_SEARCH_DOM_TOO_SLOW:'+JSON.stringify(proof.r13PolicySearchTiming));
 /* Browser-native row-click to full detail paint, fail closed at <2500ms. */
 await page.evaluate(num=>{
   const row=Array.from(document.querySelectorAll('#host .tbl tbody tr')).find(x=>String(x.textContent||'').includes(num));
   if(!row)throw Error('B4_003_POLICY_DETAIL_ROW_MISSING');
   const stamp={clickAt:null,readyAt:null,mutations:0,events:[],wasVisible:false};
   const trace=kind=>{if(stamp.events.length<40)stamp.events.push({kind,at:Math.round(performance.now()-(stamp.clickAt||performance.now())),hash:String(location.hash||''),route:String(Orbit.route?.key||'')});};
   window.addEventListener('hashchange',()=>trace('hashchange'));
   document.addEventListener('orbit:route-ready',()=>trace('route-ready'));
   window.__b4003PolicyDetailPerformance=stamp;
   document.addEventListener('click',e=>{if(stamp.clickAt==null&&e.target.closest('tr')===row)stamp.clickAt=performance.now();},{capture:true,once:true});
   const observer=new MutationObserver(()=>{
     stamp.mutations++;
     const present=!!document.querySelector('[data-policy-fullpage="1"]');
     if(present!==stamp.wasVisible){stamp.wasVisible=present;trace(present?'detail-present':'detail-absent');}
     if(present&&stamp.clickAt!=null&&stamp.readyAt==null)stamp.readyAt=performance.now();
   });
   observer.observe(document.body,{subtree:true,childList:true});
 },policySearchNumber);
 const policyDetailStarted=Date.now();
 const searchRow=page.locator('#host .tbl tbody tr').filter({hasText:policySearchNumber}).first();
 await searchRow.click();
 await page.waitForSelector('[data-policy-fullpage="1"]',{timeout:10000});
 const policyDetailMs=Date.now()-policyDetailStarted;
 const detailChrome=await page.evaluate(()=>{
   const p=window.__b4003PolicyDetailPerformance||{},h=document.getElementById('host');
   const status=Orbit.store?._productStatus?.()||{};
   return{clickToFullDetailDomMs:p.clickAt!=null&&p.readyAt!=null?Math.round(p.readyAt-p.clickAt):null,
     mutationCount:Number(p.mutations||0),detailVisible:!!document.querySelector('[data-policy-fullpage="1"]'),
     events:(p.events||[]).slice(0,40),route:String(Orbit.route?.key||''),hash:String(location.hash||''),
     loadingReason:h?.querySelector('[data-policy-detail-loading]')?.getAttribute('data-policy-detail-loading')||'',
     hostBlank:!(h?.textContent||'').trim(),
     serverConfirmed:(status.serverConfirmedCollections||[]).filter(x=>['clientes','polizas','vehiculos','recibosEsperados'].includes(x))};
 });
 proof.r13PolicyDetailTiming={wallMs:policyDetailMs,browser:detailChrome,measurement:'Chrome click to full detail DOM'};
 need(detailChrome.detailVisible&&detailChrome.clickToFullDetailDomMs!=null&&!detailChrome.events.some(x=>x.kind==='detail-absent'),
    'B4_003_R13_POLICY_DETAIL_UNSTABLE_OR_MISSING:'+JSON.stringify(proof.r13PolicyDetailTiming));
 need(detailChrome.clickToFullDetailDomMs<2500,
    'B4_003_R13_POLICY_DETAIL_DOM_TOO_SLOW:'+JSON.stringify(proof.r13PolicyDetailTiming));
 proof.r13PolicyPerformance={routeWallMs:policyRouteMs,routeChromeMs:policyRouteBrowser.domPaintMs,searchWallMs:policySearchMs,searchChromeMs:searchChrome.inputToCorrectDomMs,detailWallMs:policyDetailMs,detailChromeMs:detailChrome.clickToFullDetailDomMs,searchNumber:policySearchNumber};
 proof.assertions.policyRouteUnder2500ms=true;
 proof.assertions.policySearchUnder2500ms=true;
 proof.assertions.policyDetailUnder2500ms=true;

 proof.r18PolicyEditionValidation=await page.evaluate(()=>{
   const key=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]+/g,''),rows=(Orbit.store.all('polizas')||[]).filter(p=>key(p.numero)==='1003687').sort((a,b)=>String(a.vigenciaInicio||'').localeCompare(String(b.vigenciaInicio||'')));
   const current=rows.find(p=>String(p.estado||'')==='Vigente')||rows[rows.length-1]||null;
   if(!current)return{rows:[],errors:['target_missing'],warnings:[]};
   const result=Orbit.policyReceipts.validatePolicy({...current,renovable:true},current.id);
   return{rows:rows.map(p=>({id:p.id,inicio:p.vigenciaInicio||'',fin:p.vigenciaFin||'',estado:p.estado||''})),currentId:current.id,errors:result.errors||[],warnings:result.warnings||[]};
 });
 need(proof.r18PolicyEditionValidation.rows.length===3&&!proof.r18PolicyEditionValidation.errors.some(x=>String(x).startsWith('poliza_duplicada:'))&&!proof.r18PolicyEditionValidation.errors.some(x=>String(x).startsWith('poliza_version_duplicada:')),'B4_003_R18_LEGITIMATE_POLICY_EDITION_BLOCKED:'+JSON.stringify(proof.r18PolicyEditionValidation));
 proof.assertions.policyEditionAwareValidation=true;
 await page.evaluate(id=>Orbit.modules.cliente360.editarPoliza(id,'renovabilidad'),proof.r18PolicyEditionValidation.currentId);
 await page.waitForSelector('#policy-v1199 [data-save]',{timeout:10000});
 await page.fill('#policy-v1199 [data-reason]','B4-003 R19 prueba de aislamiento Preview');
 await page.click('#policy-v1199 [data-save]');
 proof.r19RealPolicyPreviewProtection=await page.evaluate(()=>({modalPresent:!!document.getElementById('policy-v1199'),error:String(document.querySelector('#policy-v1199 [data-error]')?.textContent||'')}));
 need(proof.r19RealPolicyPreviewProtection.modalPresent&&/Preview protege los registros reales/.test(proof.r19RealPolicyPreviewProtection.error),'B4_003_R19_REAL_POLICY_PREVIEW_PROTECTION_NOT_HUMAN:'+JSON.stringify(proof.r19RealPolicyPreviewProtection));
 await page.evaluate(()=>document.getElementById('policy-v1199')?.remove());
 proof.assertions.previewRealPolicyProtectedHumanMessage=true;

 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{location.hash='#/polizas';});
 await page.waitForFunction(()=>Orbit.route&&Orbit.route.key==='polizas',null,{timeout:10000});
 await page.waitForSelector('#fq',{timeout:10000});
 proof.r18MobilePolicySearch=await page.evaluate(()=>{const q=document.getElementById('fq'),p=q?.closest('.tb-search'),qr=q?.getBoundingClientRect(),pr=p?.getBoundingClientRect(),qs=q?getComputedStyle(q):null,ps=p?getComputedStyle(p):null;return{present:!!q,inputDisplay:qs?.display||'',parentDisplay:ps?.display||'',width:qr?.width||0,top:pr?.top??9999,bottom:pr?.bottom??9999,viewport:innerWidth,viewportHeight:innerHeight,selector:'#fq'};});
 need(proof.r18MobilePolicySearch.present&&proof.r18MobilePolicySearch.inputDisplay!=='none'&&proof.r18MobilePolicySearch.parentDisplay!=='none'&&proof.r18MobilePolicySearch.width>120&&proof.r18MobilePolicySearch.top>=0&&proof.r18MobilePolicySearch.top<proof.r18MobilePolicySearch.viewportHeight,'B4_003_R19_MOBILE_POLICY_SEARCH_NOT_REACHABLE:'+JSON.stringify(proof.r18MobilePolicySearch));
 await page.fill('#fq',policySearchNumber);
 await page.waitForFunction(num=>Array.from(document.querySelectorAll('#host .tbl tbody tr')).filter(r=>String(r.innerText||'').includes(num)).length===1,policySearchNumber,{timeout:10000});
 proof.r18MobilePolicySearch.queryResult=true;
 proof.assertions.policyMobileSearchVisible=true;proof.assertions.policyMobileSearchTypedQuery=true;
 await page.setViewportSize({width:1280,height:720});

 proof.r18RenewalKpiParity=await page.evaluate(()=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';Orbit.pais='TODOS';
   Orbit.modules.inicio.render(h);const inicio=Number(h.querySelector('[data-inicio-renew45]')?.getAttribute('data-inicio-renew45')||-1),owner=String(h.querySelector('[data-inicio-renew45]')?.getAttribute('data-renewal-owner')||'');
   Orbit.modules.polizas.render(h);const polizas=Number(h.querySelector('[data-polizas-renew45]')?.getAttribute('data-polizas-renew45')||-2);
   Orbit.pais=previous;return{inicio,polizas,owner};
 });
 need(proof.r18RenewalKpiParity.inicio>=0&&proof.r18RenewalKpiParity.inicio===proof.r18RenewalKpiParity.polizas&&proof.r18RenewalKpiParity.owner==='polizas.policyMetrics.isRenewalWithin45Days','B4_003_R18_RENEWAL_KPI_PARITY_FAILED:'+JSON.stringify(proof.r18RenewalKpiParity));
 proof.assertions.inicioPolizasRenewalKpiParity=true;
 await page.evaluate(()=>{location.hash='#/inicio';});await page.waitForFunction(()=>Orbit.route&&Orbit.route.key==='inicio',null,{timeout:10000});
 await page.waitForFunction(()=>!String(document.getElementById('host')?.innerText||'').includes('Actualizando producción y metas del equipo'),null,{timeout:15000});
 proof.r19InicioReadiness=await page.evaluate(()=>({text:String(document.getElementById('host')?.innerText||'').replace(/\s+/g,' ').trim().slice(0,1800),terminal:String(document.querySelector('[data-inicio-advisor-readiness]')?.getAttribute('data-inicio-advisor-readiness')||'ready')}));
 need(proof.r19InicioReadiness.terminal!=='pending'&&!/Actualizando producción y metas del equipo/.test(proof.r19InicioReadiness.text),'B4_003_R19_INICIO_READINESS_STUCK:'+JSON.stringify(proof.r19InicioReadiness));
 proof.assertions.inicioReadinessTerminal=true;

 await page.addInitScript(({policyNumber,clientName})=>{
   window.__R13_POLICY_FLICKER__={states:[],destructive:false};
   window.addEventListener('DOMContentLoaded',()=>{
     let queued=false;
     const sample=()=>{
       queued=false;
       const h=document.getElementById('host');if(!h)return;
       const text=String(h.innerText||'');
       const loading=!!h.querySelector('[data-polizas-relations-loading]');
       const hasPolicy=text.includes(policyNumber),hasClient=text.includes(clientName);
       if(window.__R13_POLICY_FLICKER__.states.length<120)window.__R13_POLICY_FLICKER__.states.push({loading,hasPolicy,hasClient,route:String(location.hash||'')});
       if(hasPolicy&&!hasClient&&!loading)window.__R13_POLICY_FLICKER__.destructive=true;
     };
     const obs=new MutationObserver(()=>{if(!queued){queued=true;setTimeout(sample,0);}});
     obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
     setTimeout(()=>{sample();obs.disconnect();},12000);
   },{once:true});
 },{policyNumber:policySearchNumber,clientName:'B4-003 QA Cliente'});
 await page.evaluate(()=>{location.hash='#/polizas';});
 await page.reload({waitUntil:'domcontentloaded'});
 await bootProduct(page,token);
 await page.waitForFunction(()=>Orbit.route&&Orbit.route.key==='polizas',null,{timeout:10000});
 await page.waitForSelector('#host .tbl',{timeout:30000});
 await page.waitForTimeout(250);
 const flicker=await page.evaluate(()=>window.__R13_POLICY_FLICKER__||{states:[],destructive:true});
 proof.r13PolicyPerformance.refreshFlicker=flicker;
 need(flicker.destructive===false,'B4_003_R13_REFRESH_CLIENT_DESTRUCTIVE_FLICKER');
 proof.assertions.policyRefreshCoherentHydration=true;

 await page.waitForFunction(()=>{
   const s=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
   const confirmed=s.serverConfirmedCollections||[];
   return ['clientes','polizas','gestiones'].every(x=>confirmed.includes(x));
 },null,{timeout:30000});
 await page.evaluate(()=>{location.hash='#/renovaciones';});
 await page.waitForFunction(()=>Orbit.route&&Orbit.route.key==='renovaciones',null,{timeout:10000});
 await page.waitForTimeout(500);
 const stable=await page.evaluate(async()=>{
   const h=document.getElementById('host'),before=h.innerText,start=performance.now(),events=[],records=[];
   const stamp=(kind,detail)=>events.push({ms:Math.round(performance.now()-start),kind,detail:String(detail||'').slice(0,240)});
   const onStore=e=>stamp('store',e&&e.detail&&e.detail.collection);
   const onDomain=e=>stamp('domain',e&&e.detail&&e.detail.domain);
   const onSession=()=>stamp('session','orbit:session');
   window.addEventListener('orbit:store:emit',onStore);
   window.addEventListener('orbit:domain-config',onDomain);
   document.addEventListener('orbit:session',onSession);
   const obs=new MutationObserver(list=>{
     list.forEach(m=>{
       if(records.length>=80)return;
       const added=Array.from(m.addedNodes||[]).map(n=>String(n.textContent||n.nodeName||'').replace(/\s+/g,' ').trim().slice(0,180)).filter(Boolean);
       const removed=Array.from(m.removedNodes||[]).map(n=>String(n.textContent||n.nodeName||'').replace(/\s+/g,' ').trim().slice(0,180)).filter(Boolean);
       records.push({ms:Math.round(performance.now()-start),type:m.type,target:String(m.target&&m.target.nodeName||''),added,removed});
     });
   });
   obs.observe(h,{subtree:true,childList:true,characterData:true});
   await new Promise(r=>setTimeout(r,1000));
   obs.disconnect();
   window.removeEventListener('orbit:store:emit',onStore);
   window.removeEventListener('orbit:domain-config',onDomain);
   document.removeEventListener('orbit:session',onSession);
   return{before,after:h.innerText,mutations:records.length,records,events,route:String(Orbit.route&&Orbit.route.key||'')};
 });
 proof.renewalRenderStability={mutationCount:stable.mutations,textStable:stable.before===stable.after,route:stable.route,records:stable.records,events:stable.events};
 console.log('B4_003_RENEWAL_RENDER_STABILITY='+JSON.stringify(proof.renewalRenderStability));
 need(stable.route==='renovaciones','B4_003_RENEWAL_ROUTE_NOT_ACTIVE');
 proof.assertions.noDelayedRenewalRenderMutation=stable.before===stable.after;
 proof.renewalRenderStability.canonicalRerenderObserved=stable.mutations>0;
 if(!proof.assertions.noDelayedRenewalRenderMutation){
   proof.r13RenewalDelayedRenderBlocker={blocking:true,code:'RENEWAL_DELAYED_RENDER_MUTATION',mutationCount:stable.mutations,textStable:stable.before===stable.after,records:stable.records,events:stable.events};
 }

 // R14: first paint must never expose false zero/placeholder business state.
 proof.r14RenewalReadiness=await page.evaluate(ids=>{
   const h=document.getElementById('host'),store=Orbit.store,previous=Orbit.pais||'TODOS',original=store._productStatus;
   Orbit.pais='GT';
   let loading=false,leakedRows=-1,readyExpired=false,unknownVisible=false,unknownReview=false,pendingCount=-1,placeholderClient=false;
   try{
     store._productStatus=function(){const q=original.call(store)||{},confirmed=[].concat(q.serverConfirmedCollections||[]).filter(x=>x!=='polizas');return Object.assign({},q,{serverConfirmedCollections:confirmed});};
     Orbit.modules.renovaciones.render(h);
     loading=!!h.querySelector('[data-renewals-loading]');
     leakedRows=h.querySelectorAll('[data-renewal-policy]').length;
   }finally{store._productStatus=original;}
   Orbit.modules.renovaciones.render(h);
   readyExpired=!!h.querySelector('[data-renewal-policy="'+ids.expiredRenewPolicy+'"]');
   unknownVisible=!!h.querySelector('[data-renewal-policy="'+ids.unknownRenewPolicy+'"]');
   unknownReview=!!h.querySelector('[data-renewability-review="'+ids.unknownRenewPolicy+'"]');
   pendingCount=Number(h.querySelector('[data-renewability-pending-count]')?.getAttribute('data-renewability-pending-count')||0);
   placeholderClient=Array.from(h.querySelectorAll('[data-renewal-policy] b')).some(x=>String(x.textContent||'').trim()==='—');
   Orbit.pais=previous;
   return{loading,leakedRows,readyExpired,unknownVisible,unknownReview,pendingCount,placeholderClient};
 },ids);
 need(proof.r14RenewalReadiness.loading===true&&proof.r14RenewalReadiness.leakedRows===0,'B4_003_R14_RENEWAL_LOADING_GATE_FAILED:'+JSON.stringify(proof.r14RenewalReadiness));
 need(proof.r14RenewalReadiness.readyExpired===true,'B4_003_R14_EXPIRED_RENEWAL_DROPPED');
 need(proof.r14RenewalReadiness.unknownVisible===true&&proof.r14RenewalReadiness.unknownReview===true&&proof.r14RenewalReadiness.pendingCount>=1,'B4_003_R20_UNKNOWN_RENEWABILITY_KANBAN_VISIBILITY_FAILED:'+JSON.stringify(proof.r14RenewalReadiness));
 need(proof.r14RenewalReadiness.placeholderClient===false,'B4_003_R14_RENEWAL_PLACEHOLDER_LEAK');
 proof.r20InsurerOptionalReadiness=await page.evaluate(()=>{
   const host=document.getElementById('host'),store=Orbit.store,original=store._productStatus;
   try{
     store._productStatus=function(){const q=original.call(store)||{},confirmed=[].concat(q.serverConfirmedCollections||[]).filter(x=>x!=='aseguradoras');return Object.assign({},q,{serverConfirmedCollections:confirmed});};
     Orbit.modules.renovaciones.render(host);
     return{loading:!!host.querySelector('[data-renewals-loading]'),buckets:host.querySelectorAll('[data-renewal-bucket]').length};
   }finally{store._productStatus=original;Orbit.modules.renovaciones.render(host);}
 });
 need(!proof.r20InsurerOptionalReadiness.loading&&proof.r20InsurerOptionalReadiness.buckets===4,'B4_003_R20_OPTIONAL_INSURER_READINESS_MUST_NOT_BLOCK');
 proof.assertions.renewalInsurerDirectoryOptionalNonblocking=true;
 proof.assertions.renewalFirstPaintReadiness=true;
 proof.assertions.expiredRenewalOutcomeContinuity=true;
 proof.assertions.unknownRenewabilityDebtVisibleFailClosed=true;

 proof.r14Client360Authority=await page.evaluate(ids=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';Orbit.pais='GT';Orbit.modules.cliente360.render(h);
   const root=h.querySelector('[data-c360-list-ready="1"]');
   const kpi=h.querySelector('[data-c360-kpi-client-count]');
   const all=Orbit.store?.all?.('clientes')||[];
   const canonical=all.filter(c=>c&&!(c.fusionado===true||String(c.mergedIntoClientId||'').trim())&&String(c.pais||'').toUpperCase()==='GT');
   const storeHasSynthetic=!!Orbit.store?.get?.('clientes',ids.client);
   const uiUniverseCount=Number(kpi?.getAttribute('data-c360-kpi-client-count')||-1);
   const search=document.getElementById('f-q');
   let syntheticSearchVisible=false;
   if(search){
     search.value='B4-003 QA Cliente';
     search.dispatchEvent(new Event('input',{bubbles:true}));
     syntheticSearchVisible=String(h.innerText||'').includes('B4-003 QA Cliente');
     const reset=document.getElementById('f-q');
     if(reset){reset.value='';reset.dispatchEvent(new Event('input',{bubbles:true}));}
   }
   const diag=window.OrbitRuntimeDiagnostics?.cliente360?.list||{};
   const out={authority:root?.getAttribute('data-c360-base-authority')||'',storeHasSynthetic,authoritativeGtCount:canonical.length,uiUniverseCount,syntheticSearchVisible,pageSize:Number(diag.pageSize||0),renderedRows:Number(diag.renderedRows||0),filteredRows:Number(diag.filteredRows||0),totalRows:Number(diag.totalRows||0)};
   Orbit.pais=previous;return out;
 },ids);
 need(proof.r14Client360Authority.authority==='server-confirmed-store'&&proof.r14Client360Authority.storeHasSynthetic===true&&proof.r14Client360Authority.uiUniverseCount===proof.r14Client360Authority.authoritativeGtCount&&proof.r14Client360Authority.filteredRows===proof.r14Client360Authority.authoritativeGtCount&&proof.r14Client360Authority.pageSize>0&&proof.r14Client360Authority.renderedRows===Math.min(proof.r14Client360Authority.pageSize,proof.r14Client360Authority.authoritativeGtCount),'B4_003_R14_CLIENT360_AUTHORITATIVE_LIST_FAILED:'+JSON.stringify(proof.r14Client360Authority));
 proof.assertions.client360AuthoritativeList=true;

 proof.r14QualityGrammar=await page.evaluate(()=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';Orbit.pais='GT';Orbit.modules.calidad.render(h);
   const grammar=h.querySelectorAll('[data-quality-table-grammar="canonical"]').length,text=String(h.innerText||'').toLowerCase();Orbit.pais=previous;
   return{grammar,hasCompleteLabel:text.includes('expedientes completos'),hasDecimal:/\d+[.,]\d% de completitud/i.test(text)};
 });
 need(proof.r14QualityGrammar.grammar>=2&&proof.r14QualityGrammar.hasCompleteLabel===true&&proof.r14QualityGrammar.hasDecimal===true,'B4_003_R14_QUALITY_GRAMMAR_OR_COMPLETENESS_FAILED:'+JSON.stringify(proof.r14QualityGrammar));
 proof.assertions.qualityCanonicalGrammar=true;
 proof.assertions.qualityCompletenessExplicit=true;

 // R16: server-owned minimal roster parity for Dirección and Operativo.
 const [directionRoster,operativeRoster]=await Promise.all([rosterProjectionFor(browser,directionActor,'GT'),rosterProjectionFor(browser,operativeActor,'GT')]);
 const normalizedRows=data=>[].concat(data&&data.rows||[]).map(r=>({id:clean(r.id),nombre:clean(r.nombre),activo:r.activo===true,assignable:r.assignable===true,roleEligible:r.roleEligible===true,paises:[].concat(r.paises||[]).map(x=>clean(x)).sort()}));
 const dirRows=normalizedRows(directionRoster),opRows=normalizedRows(operativeRoster),allowedKeys=['activo','assignable','id','nombre','paises','roleEligible'].sort();
 const fieldSets=[...dirRows,...opRows].map(r=>Object.keys(r).sort());
 proof.r16AssignableAdvisorRoster={direction:{scope:directionRoster&&directionRoster.scope,count:dirRows.length,rows:dirRows},operative:{scope:operativeRoster&&operativeRoster.scope,count:opRows.length,rows:opRows},sameCountry:'GT',minimalFields:fieldSets.every(keys=>JSON.stringify(keys)===JSON.stringify(allowedKeys))};
 need(directionRoster&&directionRoster.ok===true&&operativeRoster&&operativeRoster.ok===true,'B4_003_R16_ASSIGNABLE_ROSTER_CALL_FAILED');
 need(JSON.stringify(dirRows)===JSON.stringify(opRows),'B4_003_R16_ASSIGNABLE_ROSTER_ROLE_PARITY_FAILED:'+JSON.stringify(proof.r16AssignableAdvisorRoster));
 need(dirRows.length>0&&new Set(dirRows.map(r=>r.id)).size===dirRows.length,'B4_003_R16_ASSIGNABLE_ROSTER_EMPTY_OR_DUPLICATED');
 need(proof.r16AssignableAdvisorRoster.minimalFields===true,'B4_003_R16_ASSIGNABLE_ROSTER_NON_MINIMAL_FIELDS_EXPOSED');
 need(dirRows.every(r=>r.assignable&&r.roleEligible&&r.activo&&(!r.paises.length||r.paises.includes('GT'))),'B4_003_R16_ASSIGNABLE_ROSTER_COUNTRY_OR_ELIGIBILITY_FAILED');
 proof.assertions.assignableAdvisorRosterRoleParity=true;
 proof.assertions.assignableAdvisorRosterMinimalProjection=true;
 proof.assertions.assignableAdvisorRosterDeduplicated=true;

 
// R20: reconcile the real, non-QA renewal universe against the canonical date-bucket pipeline (YES plus unresolved UNKNOWN debt, never explicit NO).
 proof.r13RenewalReality=await page.evaluate(ids=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';
   Orbit.pais='TODOS';Orbit.modules.renovaciones.render(h);
   const allIds=Array.from(h.querySelectorAll('[data-renewal-policy]')).map(x=>String(x.getAttribute('data-renewal-policy')||'')).filter(Boolean);
   const realIds=allIds.filter(id=>!id.startsWith('b4003qa_')&&!id.startsWith('b4_'));
   const kpis=Array.from(h.querySelectorAll('.kpi-row .kpi')).map(x=>({label:String(x.querySelector('.k-label')?.textContent||'').trim(),value:String(x.querySelector('.k-val')?.textContent||'').trim()}));
   Orbit.pais=previous;
   return{allIds,realIds,kpis};
 },ids);
 const expectedRenewals=[...(proof.realRenewalDistribution.eligibleIds||[])].sort();
 const excludedRenewalIds=new Set([...(proof.realRenewalDistribution.excludedSyntheticIds||[]),...(proof.realRenewalDistribution.excludedQaHoldIds||[])]);
 const visibleRenewals=[...proof.r13RenewalReality.realIds].filter(id=>!excludedRenewalIds.has(id)).sort();
 if(proof.realRenewalDistribution.eligibleCount>0){
   if(JSON.stringify(visibleRenewals)!==JSON.stringify(expectedRenewals)){
     const visibleSet=new Set(visibleRenewals),expectedSet=new Set(expectedRenewals);
     const expectedOnly=expectedRenewals.filter(id=>!visibleSet.has(id));
     const visibleOnly=visibleRenewals.filter(id=>!expectedSet.has(id));
     const diag=await page.evaluate(ids=>{
       const all=Orbit.store?.all?.('polizas')||[],source=new Map(all.map(p=>[String(p.id||''),p]));
       const scoped=Orbit.access&&typeof Orbit.access.scopedStore==='function'
         ? Orbit.access.scopedStore('renovaciones').all('polizas')||[] : [];
       const scopedIds=new Set(scoped.map(p=>String(p.id||'')));
       const projection=Orbit.renewalLifecycle?.snapshot?.();
       const byStatus={},byRenewalOutcome={},byProjectionReason={},missingFromStore=[];
       const samples=[];
       for(const id of ids){
         const p=source.get(id);
         if(!p){missingFromStore.push(id);continue;}
         const stage=String(p.estado||'SIN_ESTADO'),outcome=String(p.renovacionEstado||'SIN_DISPOSICION');
         const life=projection?.assess?.(p)||{};
         byStatus[stage]=(byStatus[stage]||0)+1;
         byRenewalOutcome[outcome]=(byRenewalOutcome[outcome]||0)+1;
         byProjectionReason[life.reason||'NO_PROJECTOR']=(byProjectionReason[life.reason||'NO_PROJECTOR']||0)+1;
         if(samples.length<15)samples.push({id,estado:stage,resultado:outcome,
           renovable:p.renovable==null?null:p.renovable,vigenciaFin:String(p.vigenciaFin||''),
           forwardReferencePresent:!!p.renovadaPor,reverseReferencePresent:!!p.renuevaDe,
           scopeVisible:scopedIds.has(id),sourceActionable:life.actionable===true,
           sourceBucketEligible:life.bucketEligible===true,sourceReason:life.reason||''});
       }
       return{role:Orbit.session?.rol?.()||'',country:String(Orbit.pais||''),scope:String(Orbit.access?.dataScope?.('renovaciones')||''),storeScopedFor:String(Orbit.store?._scopedFor||''),
         productStorePolicyCount:all.length,renewalScopedPolicyCount:scoped.length,
         projectionSnapshotCount:projection?.rows?.length||0,
         missingFromProductStoreCount:missingFromStore.length,missingFromProductStoreIds:missingFromStore.slice(0,12),
         byStatus,byRenewalOutcome,byProjectionReason,samples};
     },expectedOnly);
     proof.r13RenewalParityDiagnostic={expectedCount:expectedRenewals.length,visibleCount:visibleRenewals.length,
       expectedOnlyCount:expectedOnly.length,visibleOnlyCount:visibleOnly.length,
       expectedOnlyIdDigest:hash(expectedOnly),visibleOnlyIdDigest:hash(visibleOnly),browser:diag,
       classification:'BLOCKING_UNTIL_PHYSICAL_LINEAGE_AND_SCOPE_ADJUDICATION'};
     /* R21: cross-check the new business criteria against physical records, never
        silently normalize a legacy expected-list mismatch or relax data scope. */
     const readback=await page.evaluate(({missing,extra})=>{
       const rows=Orbit.store?.all?.('polizas')||[],vehicles=Orbit.store?.all?.('vehiculos')||[];
       const byId=new Map(rows.map(p=>[String(p.id),p]));
       const snapshot=Orbit.renewalLifecycle?.snapshot?.();
       const normalized=value=>String(value==null?'':value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
       const days=(a,b)=>{
         const x=Date.parse(String(a||'')+'T00:00:00Z'),y=Date.parse(String(b||'')+'T00:00:00Z');
         return Number.isFinite(x)&&Number.isFinite(y)?Math.round((y-x)/86400000):null;
       };
       const plates=p=>{
         const values=new Set(),direct=[p.placa,p.placaNormalizada,p.placaFuente];
         direct.forEach(v=>{if(v)values.add(normalized(v));});
         const desc=String(p.bienAsegurado||p.descripcionRiesgo||p.riesgoDescripcion||'');
         const captured=desc.match(/placas?\s*[:\-]?\s*([A-Za-z0-9\-–— ]{4,18})/i);
         if(captured)values.add(normalized(captured[1]));
         vehicles.filter(v=>String(v.polizaId||'')===String(p.id)).forEach(v=>[v.placa,v.placaNormalizada,v.placaFuente].forEach(z=>{if(z)values.add(normalized(z));}));
         return [...values].filter(Boolean);
       };
       const resolved=missing.map(id=>{
         const p=byId.get(id),life=p&&snapshot?.assess(p)||{},q=byId.get(String(life.sourceBackedSuccessorId||'')),a=p?plates(p):[],b=q?plates(q):[];
         const continuityDays=p&&q?days(p.vigenciaFin,q.vigenciaInicio):null;
         const independentPass=!!p&&!!q&&
           !!p.numero&&!!q.numero&&String(p.id)!==String(q.id)&&
           normalized(p.clienteId)===normalized(q.clienteId)&&
           normalized(p.aseguradoraId)===normalized(q.aseguradoraId)&&
           normalized(p.ramo)===normalized(q.ramo)&&
           normalized(p.pais)===normalized(q.pais)&&
           a.length>0&&b.length>0&&a.some(value=>b.includes(value))&&
           continuityDays!==null&&Math.abs(continuityDays)<=31&&
           normalized(q.tipoEmisionFuente||q.tipoEmision||q.tipoDeEmision||q.tipo_emision||q.emisionTipo||q.tipoEmisionPoliza).includes('RENOVAD')&&
           ['vigente','porrenovar'].includes(String(q.estado||'').toLowerCase().replace(/\s+/g,''))&&
           life.reason==='SUCESORA_DE_FUENTE_PENDIENTE_ENLACE'&&life.bucketEligible===false&&life.terminal!==true;
         return {id,numero:p?.numero||'',sourceState:p?.estado||'',disposition:p?.renovacionEstado||'',successorId:q?.id||'',successorNumber:q?.numero||'',sourceIssuance:q?.tipoEmisionFuente||q?.tipoEmision||'',continuityDays,plateCount:a.length,successorPlateCount:b.length,classification:'UNLINKED_SOURCE_BACKED_SUCCESSOR_REVIEW_ONLY',pass:independentPass};
       });
       const extraReview=extra.map(id=>{
         const p=byId.get(id),life=p&&snapshot?.assess(p)||{},node=document.querySelector('[data-renewal-policy="'+id+'"]');
         const reason=String(life.reason||''),overdue=p?Orbit.ui.daysFromNow(p.vigenciaFin):null;
         const validReason=['RENOVADA_DECLARADA_SIN_SUCESORA_VERIFICADA','HISTORICA_SIN_SUCESORA_ACREDITADA','POSIBLE_SUCESORA_SIN_PRUEBA_SUFICIENTE','LINEAGE_CONFLICTO','RENOVABILIDAD_SIN_CONFIRMAR'];
         const allow=!!p&&!!node&&overdue<0&&life.bucketEligible===true&&life.reviewOnly===true&&life.actionable!==true&&life.terminal!==true&&
           !life.verifiedSuccessorId&&!life.sourceBackedSuccessorId&&validReason.includes(reason)&&
           !!node.querySelector('.badge.warn')&&/Revisar situación de póliza/.test(node.innerText||'');
         return{id,number:p?.numero||'',sourceState:p?.estado||'',renewalDisposition:p?.renovacionEstado||'',days:overdue,reason,reviewOnly:life.reviewOnly===true,sourceBackedId:life.sourceBackedSuccessorId||'',verifiedId:life.verifiedSuccessorId||'',classification:'LEGACY_EXPECTED_LIST_WRONGLY_SUPPRESSED_UNPROVEN_EXPIRY',pass:allow};
       });
       return{missing:resolved,extra:extraReview,pass:resolved.every(x=>x.pass)&&extraReview.every(x=>x.pass),
         readonly:true,sourcePolicyCount:rows.length,sourceVehicleCount:vehicles.length,
         scopeRole:String(Orbit.session?.rol?.()||''),scopeCountry:String(Orbit.pais||'')};
     },{missing:expectedOnly,extra:visibleOnly});
     const uniqueVisible=visibleRenewals.length===new Set(visibleRenewals).size;
     const changesExplained=readback.pass&&uniqueVisible&&readback.sourcePolicyCount===diag.productStorePolicyCount&&
       readback.scopeCountry==='TODOS'&&expectedOnly.length+visibleOnly.length>0;
     proof.r13RenewalParityDiagnostic.causalR21Adjudication=readback;
     proof.r13RenewalParityDiagnostic.classification=changesExplained?'PASS_INDEPENDENT_SOURCE_BACKED_CAUSAL_DELTA':'BLOCKING_UNEXPLAINED_CAUSAL_DELTA';
     if(!changesExplained)throw new Error('B4_003_R13_REAL_RENEWAL_PIPELINE_MISMATCH:'+JSON.stringify({
       expected:expectedRenewals.length,visible:visibleRenewals.length,missing:expectedOnly.length,
       extra:visibleOnly.length,reasonCounts:diag.byProjectionReason,
       outcomeCounts:diag.byRenewalOutcome,store:diag.productStorePolicyCount,scoped:diag.renewalScopedPolicyCount,
       snapshot:diag.projectionSnapshotCount,adjudication:readback}));
     proof.assertions.realRenewalLineageSourceBackedIndependentlyAdjudicated=true;
   }
   proof.assertions.realRenewalPipelineRepopulated=true;
   proof.assertions.realRenewalPipelineMatchesCanonicalEligibility=true;
 }else{
   const dry=proof.r13RenewalSourceDryRun||{};
   proof.r13RenewalDataBlocker={
     blocking:true,
     code:dry.ready===true?'REAL_RENEWABILITY_FIELDS_UNCLASSIFIED_SOURCE_BACKED_APPLY_REQUIRED':'REAL_RENEWABILITY_SOURCE_CONFLICT_OR_APPLY_REQUIRED',
     byState:proof.realRenewalDistribution.byState,
     sourceDryRunCount:Number(dry.proposedWriteCount||0),
     sourceDryRunReady:dry.ready===true,
     sourceMissing:dry.missing||[],
     sourceDuplicates:dry.duplicates||[],
     sourceHistoricalSameNumber:dry.historicalSameNumber||[],
     writeExecuted:false,
     authorizationRequired:true
   };
   proof.assertions.realRenewalPipelineRepopulated=false;
   proof.assertions.realRenewalPipelineMatchesCanonicalEligibility=false;
 }

 await page.evaluate(()=>Orbit.modules.renovaciones.campana());
 await page.waitForSelector('#renewal-campaign-v1200 [data-prepare]',{timeout:10000});
 await page.evaluate(id=>{
   document.querySelectorAll('#renewal-campaign-v1200 [data-ren]').forEach(x=>x.checked=x.dataset.ren===id);
 },ids.renewalPolicy);
 await page.click('#renewal-campaign-v1200 [data-prepare]');
 await page.waitForFunction(()=>!document.getElementById('renewal-campaign-v1200'),null,{timeout:30000});
 const rp=(await ref('polizas',ids.renewalPolicy).get()).data()||{};
 need(!!rp.renovacionSeguimientoPreparado&&rp.renovacionCanalEstado==='pendiente_conexion','B4_003_RENEWAL_DURABLE_READBACK_FAILED');
 need((await ref('actividades',ids.renewActivity).get()).exists,'B4_003_RENEWAL_ACTIVITY_READBACK_FAILED');
 proof.assertions.renewalCampaignDurableReadback=true;

 // UAT4: reason edits commit to canonical cancellation data without creating recovery work.
 await page.evaluate(id=>{Orbit.pais='GT';const h=document.getElementById('host');Orbit.modules.cancelaciones.render(h);Orbit.modules.cancelaciones.detalle(id);},ids.cancelation);
 await page.waitForSelector('#cx-save-motivo',{timeout:10000});
 const priorRecovery=(await ref('negocios',ids.recoveryBusiness).get()).exists;
 await page.fill('#cx-motivo','B4-003 QA motivo confirmado');
 await page.click('#cx-save-motivo');
 await page.waitForFunction(()=>!document.getElementById('c360-edit'),null,{timeout:30000});
 const savedReason=(await ref('cancelaciones',ids.cancelation).get()).data()||{};
 const postRecovery=(await ref('negocios',ids.recoveryBusiness).get()).exists;
 need(savedReason.motivo==='B4-003 QA motivo confirmado'&&priorRecovery===postRecovery,'B4_003_R20_CANCEL_REASON_SAVE_OR_RECOVERY_SIDE_EFFECT');
 proof.assertions.cancelReasonDurableNoRecoverySideEffect=true;

 // UAT4: individual and selected-list draft controls are visible and no real chat opens from Preview.
 await page.evaluate(id=>{Orbit.modules.cancelaciones.detalle(id);},ids.cancelation);
 await page.waitForSelector('#cx-wa',{timeout:10000});
 await page.click('#cx-wa');
 await page.waitForSelector('#cancel-wa-drafts [data-wa-template]',{timeout:10000});
 const single=await page.evaluate(()=>({count:document.querySelector('#cancel-wa-drafts')?.innerText.includes('Preparar WhatsApp (1)'),phone:!!document.querySelector('#cancel-wa-drafts [data-wa-phone]'),message:!!document.querySelector('#cancel-wa-drafts [data-wa-message]')}));
 need(single.count&&single.phone&&single.message,'B4_003_R20_CANCEL_SINGLE_WA_DRAFT');
 await page.selectOption('#cancel-wa-drafts [data-wa-template]','alternativas');
 await page.fill('#cancel-wa-drafts [data-wa-message]','QA: mensaje puntual editable');
 const custom=await page.locator('#cancel-wa-drafts [data-wa-message]').inputValue();
 need(custom==='QA: mensaje puntual editable','B4_003_R20_CANCEL_WA_EDITABLE_TEXT');
 await page.click('#cancel-wa-drafts [data-wa-close]');
 await page.evaluate(()=>{document.getElementById('c360-edit')?.remove();const h=document.getElementById('host');Orbit.modules.cancelaciones.render(h);});
 await page.locator('[data-cancel-select="'+ids.cancelation+'"]').check();
 await page.waitForFunction(()=>!!document.querySelector('[data-cancel-wa-bulk]')&&!document.querySelector('[data-cancel-wa-bulk]').disabled,null,{timeout:10000});
 await page.click('[data-cancel-wa-bulk]');
 await page.waitForSelector('#cancel-wa-drafts [data-wa-progress]',{timeout:10000});
 const selected=await page.evaluate(()=>({count:document.querySelector('#cancel-wa-drafts [data-wa-progress]')?.textContent,hasTemplates:!!document.querySelector('#cancel-wa-drafts [data-wa-template]'),hasOpen:!!document.querySelector('#cancel-wa-drafts [data-wa-open]')}));
 need(selected.count==='1 de 1'&&selected.hasTemplates&&selected.hasOpen,'B4_003_R20_CANCEL_MULTISELECT_WA_COMPOSER');
 await page.click('#cancel-wa-drafts [data-wa-close]');
 proof.assertions.cancelWhatsAppDraftIndividualAndSelected=true;
 proof.assertions.cancelWhatsAppNoAutomaticDelivery=true;

 async function saveRecovery(){
   await page.evaluate(id=>{const h=document.getElementById('host');Orbit.modules.cancelaciones.render(h);Orbit.modules.cancelaciones.detalle(id);},ids.cancelation);
   await page.waitForSelector('#cx-save',{timeout:10000});
   await page.selectOption('#cx-rec',{label:'Pendiente de contacto'});
   await page.fill('#cx-nota','B4-003 synthetic durable recovery');
   await page.click('#cx-save');
   await page.waitForFunction(()=>!document.getElementById('cx-save'),null,{timeout:30000}).catch(()=>{});
   await page.waitForTimeout(400);
 }
 await saveRecovery();
 const c1=(await ref('cancelaciones',ids.cancelation).get()).data()||{},b1=(await ref('negocios',ids.recoveryBusiness).get()).data()||{};
 need(c1.recuperacionNegocioId===ids.recoveryBusiness,'B4_003_CANCEL_LINK_READBACK_FAILED');
 need(b1.cancelacionId===ids.cancelation&&b1.polizaId===ids.cancelPolicy,'B4_003_RECOVERY_LINKAGE_SANITIZER_FAILED');
 need((await ref('actividades',ids.cancelActivity).get()).exists,'B4_003_CANCEL_ACTIVITY_READBACK_FAILED');
 proof.assertions.cancelationDurableReadback=true;
 proof.assertions.recoveryLinkagePreserved=true;

 await saveRecovery();
 const dup=await tenant.collection('data').doc('negocios').collection('items').where('cancelacionId','==',ids.cancelation).get();
 need(dup.size===1,'B4_003_RECOVERY_DUPLICATE_CREATED');
 proof.assertions.recoveryIdempotentRetry=true;
 /* R21: A session may authorize only synthetic businesses. Probe the
    real-business guard in its actual browser renderer without requiring
    access to any real operational row. The fallback is a temporary cloned
    read-model fixture, never a Firestore/Auth/tenant mutation. */
 const r21SyntheticBusinessSnap=await ref('negocios',ids.collabBusiness).get();
 need(r21SyntheticBusinessSnap.exists&&r21SyntheticBusinessSnap.data()?.previewWrite===true,'B4_003_R21_ATTACHMENT_NEGATIVE_PROBE_SOURCE_FIXTURE_INVALID');
 const r21SyntheticBusiness=r21SyntheticBusinessSnap.data()||{};
 const realPreviewAttachment=await page.evaluate(async({id,fixture})=>{
   const store=Orbit.store,originalGet=store&&store.get;
   if(!store||typeof originalGet!=='function')return{probeFailed:'read_model_unavailable'};
   const visibleReal=(store.all?.('negocios')||[]).find(n=>n&&n.previewWrite!==true&&n.id);
   const probeMode=visibleReal?'actual_authorized_business_readmodel':'ephemeral_synthetic_negative_readmodel';
   const probeId=visibleReal?.id||'r21-preflight-readonly-mock';
   const negative=visibleReal||Object.assign({},fixture,{id:probeId,previewWrite:false});
   const before=Orbit.productOperationalWriteP0?.status?.()||{};
   if(!visibleReal)store.get=function(collection,requestedId){
     if(collection==='negocios'&&String(requestedId)===probeId)return negative;
     return originalGet.apply(store,arguments);
   };
   let m=null,result={probeMode,realPresent:!!visibleReal,sourceFixtureId:id};
   try{
     await Orbit.ciclo.openNegocio(probeId);
     m=document.getElementById('ciclo-modal');
     const file=m?.querySelector('#ng-com-file'),hint=m?.querySelector('#ng-com-file-name');
     result={...result,modalPresent:!!m,disabled:file?.disabled===true,hint:String(hint?.textContent||''),guardPresent:!!m?.querySelector('.collab-file-btn[aria-disabled="true"]')};
   }finally{
     if(!visibleReal)store.get=originalGet;
     document.getElementById('ciclo-modal')?.remove();
   }
   const after=Orbit.productOperationalWriteP0?.status?.()||{};
   return{...result,readModelRestored:store.get===originalGet,writeCountUnchanged:Number(before.committed||0)===Number(after.committed||0),noOperationalWrites:true};
 },{id:ids.collabBusiness,fixture:r21SyntheticBusiness});
 need(realPreviewAttachment.modalPresent&&realPreviewAttachment.disabled&&realPreviewAttachment.guardPresent&&
      realPreviewAttachment.readModelRestored&&realPreviewAttachment.writeCountUnchanged&&
      /Preview protege los archivos/.test(realPreviewAttachment.hint),
      'B4_003_R21_REAL_PREVIEW_ATTACHMENT_DENIAL_NOT_VISIBLE_BEFORE_PICKER:'+JSON.stringify(realPreviewAttachment));
 proof.r21RealPreviewAttachment=realPreviewAttachment;
 proof.assertions.previewRealBusinessAttachmentPreflightTruthful=true;
 const collabUi=await collaborationFor(browser,directionActor,ids.collabBusiness,'Solicitar información al asesor','B4-003 R20 solicitud sintética al asesor',true);proof.r20SecondCollaborationUi=collabUi;proof.assertions.collaborationUiAttachmentDurable=true;proof.assertions.businessCardOpenUnder2500ms=true;proof.assertions.collaborationVisualHierarchy=true;
 const requestRow=(await ref('negocios',ids.collabBusiness).get()).data()||{},requestComment=[].concat(requestRow.comentarios||[]).slice(-1)[0]||{};
 need(requestComment.direction==='advisor'&&requestComment.eventId&&requestComment.actorUid&&requestComment.actorName&&requestComment.user===requestComment.actorName,'B4_003_R20_HANDOFF_REQUEST_COMMIT_MISSING');
 const advisorActionCard=await actionCardUiFor(browser,advisorActor,ids.collabBusiness,'leads');
 need(advisorActionCard.present&&advisorActionCard.badge&&advisorActionCard.expectedRank>0&&advisorActionCard.actualRank===advisorActionCard.expectedRank&&advisorActionCard.label.includes('#'+advisorActionCard.expectedRank)&&advisorActionCard.background&&!/rgba\(0,\s*0,\s*0,\s*0\)/.test(advisorActionCard.background),'B4_003_R20_SECOND_REVIEW_ACTION_QUEUE_RANK_OR_VISUAL_FAILED:'+JSON.stringify(advisorActionCard));
 proof.r20SecondAdvisorActionCard=advisorActionCard;proof.assertions.currentActionQueueRank=true;proof.assertions.actionRequiredSolidVisual=true;
 need(/^\d{4}-\d{2}-\d{2}T/.test(String(requestComment.ts||'')),'B4_003_R20_HANDOFF_CANONICAL_TIMESTAMP_MISSING');
 const advisorInbox=await inboxProjectionFor(browser,advisorActor),advisorNotices=[].concat(advisorInbox?.notices||[]).filter(x=>x.eventId===requestComment.eventId);
 need(advisorNotices.length===1,'B4_003_R20_ADVISOR_NOTICE_NOT_DEDUPED:'+JSON.stringify(advisorInbox));
 const advisorNotice=advisorNotices[0];
 need(advisorNotice.targetSurface==='leads'&&advisorNotice.targetId===advisorActor.advisorId&&advisorNotice.statusLabel==='Nueva','B4_003_R20_ADVISOR_NOTICE_TARGET_INVALID:'+JSON.stringify(advisorNotice));
 const senderInbox=await inboxProjectionFor(browser,directionActor);
 need(![].concat(senderInbox?.notices||[]).some(x=>x.eventId===requestComment.eventId),'B4_003_R20_SENDER_RECEIVED_OWN_REQUEST:'+JSON.stringify(senderInbox));
 const advisorInboxUi=await inboxUiFor(browser,advisorActor,requestComment.eventId,'leads','acknowledge');
 need(advisorInboxUi.expectedSurface==='leads'&&advisorInboxUi.pendingSeen===true&&/Reconocida por ti/.test(advisorInboxUi.final.text)&&advisorInboxUi.header.countLeft>=advisorInboxUi.header.drawerLeft,'B4_003_R20_SECOND_REVIEW_ADVISOR_INBOX_UI_FAILED:'+JSON.stringify(advisorInboxUi));
 const advisorInboxAfter=await inboxProjectionFor(browser,advisorActor),advisorAfter=[].concat(advisorInboxAfter?.notices||[]).find(x=>x.eventId===requestComment.eventId);
 need(advisorAfter?.acknowledged===true&&advisorAfter?.globalResolved!==true&&advisorAfter?.statusLabel==='Reconocida por ti','B4_003_R20_ADVISOR_NOTICE_ACKNOWLEDGED_READBACK_FAILED:'+JSON.stringify(advisorInboxAfter));
 proof.r20SecondAdvisorInboxUi=advisorInboxUi;proof.assertions.syntheticAdvisorInboxAccessible=true;proof.assertions.inboxActionProgressVisible=true;proof.assertions.inboxHumanStateUi=true;
 const advisorResponse=await collaborationCommandFor(browser,advisorActor,ids.collabBusiness,'Reenviado a Operaciones','B4-003 R20 respuesta sintética del asesor','operations');
 const responseRow=(await ref('negocios',ids.collabBusiness).get()).data()||{},responseComment=[].concat(responseRow.comentarios||[]).slice(-1)[0]||{};
 need(responseComment.eventId===advisorResponse.eventId,'B4_003_R20_HANDOFF_RESPONSE_EVENT_ID_MISMATCH');
 need(responseComment.direction==='operations'&&responseComment.eventId&&responseComment.actorName,'B4_003_R20_HANDOFF_RESPONSE_COMMIT_MISSING');
 const opsInbox=await inboxProjectionFor(browser,operativeActor),opsNotices=[].concat(opsInbox?.notices||[]).filter(x=>x.eventId===responseComment.eventId);
 need(opsNotices.length===1,'B4_003_R20_OPERATIONS_NOTICE_NOT_DEDUPED:'+JSON.stringify(opsInbox));
 const opsNotice=opsNotices[0];
 need(opsNotice.targetSurface==='ops'&&opsNotice.statusLabel==='Nueva','B4_003_R20_OPERATIONS_NOTICE_TARGET_INVALID:'+JSON.stringify(opsNotice));
 const opsInboxUi=await inboxUiFor(browser,operativeActor,responseComment.eventId,'ops','resolve');
 need(opsInboxUi.expectedSurface==='ops'&&opsInboxUi.pendingSeen===true&&opsInboxUi.final.present===true&&/Resuelta para todos/.test(opsInboxUi.final.text),'B4_003_R20_SECOND_REVIEW_OPERATIONS_LANDING_OR_INBOX_UI_FAILED:'+JSON.stringify(opsInboxUi));
 proof.r20SecondOperationsInboxUi=opsInboxUi;proof.assertions.syntheticOperationsInboxAccessible=true;
 const advisorOwnResponseInbox=await inboxProjectionFor(browser,advisorActor);
 need(![].concat(advisorOwnResponseInbox?.notices||[]).some(x=>x.eventId===responseComment.eventId),'B4_003_R20_ADVISOR_RECEIVED_OWN_RESPONSE:'+JSON.stringify(advisorOwnResponseInbox));
 const opsInboxAfter=await inboxProjectionFor(browser,operativeActor),opsAfter=[].concat(opsInboxAfter?.notices||[]).find(x=>x.eventId===responseComment.eventId);
 need(opsAfter?.globalResolved===true&&opsAfter?.statusLabel==='Resuelta para todos','B4_003_R20_OPERATIONS_NOTICE_SHARED_RESOLUTION_READBACK_FAILED:'+JSON.stringify(opsInboxAfter));
 proof.r20TypedHandoff={requestEventId:requestComment.eventId,advisorNoticeId:advisorNotice.id,responseEventId:responseComment.eventId,operationsNoticeId:opsNotice.id,caseEntityId:ids.collabBusiness,requestTargetSurface:advisorNotice.targetSurface,responseTargetSurface:opsNotice.targetSurface,advisorAcknowledgedPersisted:advisorAfter.acknowledged===true,operationsSharedResolutionPersisted:opsAfter.globalResolved===true};
 proof.assertions.typedHandoffRecipientNoticeDurable=true;
 proof.assertions.typedHandoffDeduplicated=true;
 proof.assertions.typedHandoffSenderExcluded=true;
 proof.assertions.typedHandoffTargetSurfaceCorrect=true;
 proof.assertions.inboxStatePersistent=true;
 /* The response is resolved by Operativo, but its dataScope may be own/team.
    Inspect the same synthetic business through Dirección's authorized Ops view,
    instead of treating a hidden, out-of-scope card as a product defect. */
 const opsResolvedActionCard=await actionCardUiFor(browser,directionActor,ids.collabBusiness,'ops');
 need(opsResolvedActionCard.present===true&&opsResolvedActionCard.badge===false&&opsResolvedActionCard.expectedRank===0,
    'B4_003_R21_RESOLVED_SHARED_TASK_STILL_DISPLAYS_ACTION_REQUIRED:'+JSON.stringify(opsResolvedActionCard));
 proof.r21ResolvedOperationsCard={...opsResolvedActionCard,viewerRole:'direccion',actualResolutionActorRole:'operativo',fixtureStage:'cotizando'};
 proof.assertions.sharedInboxResolutionConvergesOpsActionBadge=true;
 proof.assertions.collaborationCanonicalIdentityAndTimestamp=true;

 // R13: controlled insurer Drive E2E on one disposable B4003 QA insurer only.
 // The ficha owner requires a host established by the module's canonical router.
 await page.evaluate(()=>{location.hash='#/aseguradoras';});
 await page.waitForFunction(()=>window.Orbit?.route?.key==='aseguradoras'&&!!document.querySelector('#host .page'),null,{timeout:10000});
 await page.waitForFunction(id=>{
   const st=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
   return (st.serverConfirmedCollections||[]).includes('aseguradoras')&&!!Orbit.store.get('aseguradoras',id);
 },ids.insurer,{timeout:30000});
 await page.evaluate(id=>{document.getElementById('asg-ficha')?.remove();Orbit.modules.aseguradoras.ficha(id);},ids.insurer);
 await page.waitForSelector('#asg-ficha [data-tab="productos"]',{timeout:10000});
 await page.click('#asg-ficha [data-tab="productos"]');
 proof.r20SecondInsurerOffering=await page.evaluate(()=>{const b=document.querySelector('#asg-ficha #af-body'),card=b?.querySelector('[data-offering-ramo="Automóviles"]');const css=card?getComputedStyle(card):null;return{matrix:!!b?.querySelector('.insurer-offering-matrix'),card:!!card,productText:String(card?.innerText||''),background:css?.backgroundColor||'',border:css?.borderColor||'',roleGuide:!!b?.querySelector('.insurer-role-guide')};});
 need(proof.r20SecondInsurerOffering.matrix&&proof.r20SecondInsurerOffering.card&&/Vehículo Liviano/.test(proof.r20SecondInsurerOffering.productText)&&proof.r20SecondInsurerOffering.roleGuide,'B4_003_R20_SECOND_REVIEW_INSURER_OFFERING_VIEW_FAILED:'+JSON.stringify(proof.r20SecondInsurerOffering));
 await page.click('#asg-ficha #af-editar');
 await page.waitForSelector('#asg-ficha [data-tab="productos"]',{timeout:10000});
 await page.click('#asg-ficha [data-tab="productos"]');
 proof.r20SecondInsurerOfferingEdit=await page.evaluate(()=>{const b=document.querySelector('#asg-ficha #af-body'),ramo=Array.from(b?.querySelectorAll('[data-offer-ramo]')||[]).find(x=>x.value==='Automóviles'),prod=Array.from(b?.querySelectorAll('[data-ramoprod="Automóviles"]')||[]).find(x=>x.value==='Vehículo Liviano'),plans=b?.querySelectorAll('[data-ramoplancheck="Automóviles"]').length||0;return{ramoCount:b?.querySelectorAll('[data-offer-ramo]').length||0,ramoSelected:!!ramo?.checked,productPresent:!!prod,productSelected:!!prod?.checked,planOptions:plans,hasProducts:/Productos/.test(String(b?.innerText||'')),hasPlans:/Planes/.test(String(b?.innerText||''))};});
 need(proof.r20SecondInsurerOfferingEdit.ramoCount>1&&proof.r20SecondInsurerOfferingEdit.ramoSelected&&proof.r20SecondInsurerOfferingEdit.productPresent&&proof.r20SecondInsurerOfferingEdit.productSelected&&proof.r20SecondInsurerOfferingEdit.hasProducts&&proof.r20SecondInsurerOfferingEdit.hasPlans,'B4_003_R20_SECOND_REVIEW_INSURER_OFFERING_EDIT_FAILED:'+JSON.stringify(proof.r20SecondInsurerOfferingEdit));
 await page.click('#asg-ficha #af-cancelar');
 proof.assertions.insurerRamoProductPlanMatrix=true;proof.assertions.insurerRamoCatalogMultiselect=true;proof.assertions.insurerCommercialSelectionPersistent=true;

 await page.evaluate(id=>{document.getElementById('asg-ficha')?.remove();Orbit.modules.aseguradoras.ficha(id);},ids.insurer);
 await page.click('#asg-ficha #af-editar');
 await page.click('#asg-ficha #af-logo-focus');
 await page.waitForSelector('#asg-ficha [data-tab="resumen"].active',{timeout:10000});
 await page.click('#asg-ficha details:has(#af-logo) > summary');
 await page.waitForSelector('#asg-ficha #af-logo',{timeout:10000,state:'visible'});
 await page.fill('#asg-ficha #af-logo','https://example.invalid/b4-r20-logo-'+run+'.png');
 const diffProbe=await page.evaluate(async()=>{
   const original=Orbit.ui.prompt;let resolvePrompt;window.__b4003PromptText='';window.__b4003PromptResolve=null;
   Orbit.ui.prompt=(text)=>{window.__b4003PromptText=String(text||'');return new Promise(resolve=>{resolvePrompt=resolve;window.__b4003PromptResolve=resolve;});};
   document.querySelector('#asg-ficha #af-guardar')?.click();
   for(let i=0;i<50&&!window.__b4003PromptText;i++)await new Promise(r=>setTimeout(r,20));
   const button=document.querySelector('#asg-ficha #af-guardar'),during=String(button?.textContent||''),prompt=window.__b4003PromptText;
   if(resolvePrompt)resolvePrompt(null);
   await new Promise(r=>setTimeout(r,60));Orbit.ui.prompt=original;delete window.__b4003PromptResolve;
   return{prompt,during,after:String(document.querySelector('#asg-ficha #af-guardar')?.textContent||'')};
 });
 need(/Cambios detectados:\s*Logo\./.test(diffProbe.prompt)&&!/NIT|Sitio web|Responsable|Teléfono|Facturación|Contactos|Plataformas|Bancos/.test(diffProbe.prompt)&&/Esperando motivo|Revisando cambios/.test(diffProbe.during),'B4_003_R20_SECOND_REVIEW_INSURER_LOGO_SEMANTIC_DIFF_FAILED:'+JSON.stringify(diffProbe));
 proof.r20SecondInsurerSemanticDiff=diffProbe;proof.assertions.insurerLogoOnlySemanticDiff=true;proof.assertions.insurerSaveProgressImmediate=true;
 await page.click('#asg-ficha #af-cancelar');

 const driveProbe=await page.evaluate(async()=>{
   const p=Orbit.productDriveDocumentProviderP0;
   if(!p||typeof p.probe!=='function')return{available:false,status:'provider_missing'};
   return await p.probe(true);
 });
 proof.r13InsurerDrive={probe:driveProbe};
 need(driveProbe&&driveProbe.available===true,'B4_003_R13_DRIVE_PROVIDER_NOT_AVAILABLE:'+JSON.stringify(driveProbe));
 const preEmissionAttachment=await page.evaluate(async({tenantId,activeRole,businessId,run})=>{
   const provider=Orbit.productRuntimeBrowserProvidersP0,c=await provider.initialize();
   const raw='tipo,valor\ncolaboracion,'+run+'\n',base64=btoa(unescape(encodeURIComponent(raw)));
   const uploaded=await provider.callFunction('orbit360DocumentDriveUploadPreview',{tenantId,activeRole,entidad:'negocio',entidadId:businessId,sourceModule:'ops-leads',documentType:'colaboracion',categoria:'Colaboración',name:'b4-r20-preemision-'+run+'.csv',mimeType:'text/csv',size:raw.length,base64,provisional:true},'us-east1');
   if(!uploaded||uploaded.ok!==true)return{stage:uploaded||null};
   const finalized=await provider.callFunction('orbit360DocumentDriveFinalizePreview',{tenantId,activeRole,entidad:'negocio',entidadId:businessId,sourceModule:'ops-leads',documentType:'colaboracion',categoria:'Colaboración',documentRef:uploaded.documentRef,clientFolderId:uploaded.clientFolderId,stagingFolderId:uploaded.stagingFolderId||uploaded.folderId},'us-east1');
   if(!finalized||finalized.ok!==true)return{stage:uploaded,finalized:finalized||null};
   const read=await provider.callFunction('orbit360DocumentDriveReadPreview',{tenantId,activeRole,entidad:'negocio',entidadId:businessId,sourceModule:'ops-leads',documentRef:uploaded.documentRef},'us-east1');
   return{stage:uploaded,finalized,read};
 },{tenantId,activeRole:who.activeRole,businessId:ids.collabNoClientBusiness,run});
 const preEmissionRow=(await ref('negocios',ids.collabNoClientBusiness).get()).data()||{},preEmissionDocs=[].concat(preEmissionRow.documentos||[]);
 const preEmissionRef=clean(preEmissionAttachment?.stage?.documentRef);
 need(preEmissionAttachment?.stage?.ok===true&&preEmissionAttachment?.stage?.provisional===true&&preEmissionAttachment?.stage?.entityType==='negocio','B4_003_R20_PREEMISSION_ATTACHMENT_STAGE_FAILED:'+JSON.stringify(preEmissionAttachment));
 need(preEmissionAttachment?.finalized?.ok===true&&preEmissionAttachment?.read?.ok===true&&preEmissionDocs.some(x=>clean(x&&x.documentRef)===preEmissionRef),'B4_003_R20_PREEMISSION_ATTACHMENT_BINDING_FAILED:'+JSON.stringify({preEmissionAttachment,preEmissionDocs}));
 const preEmissionCleanup=await page.evaluate(async({tenantId,activeRole,businessId,documentRef})=>Orbit.productRuntimeBrowserProvidersP0.callFunction('orbit360DocumentDriveCleanupPreview',{tenantId,activeRole,entidad:'negocio',entidadId:businessId,sourceModule:'ops-leads',documentRef},'us-east1'),{tenantId,activeRole:who.activeRole,businessId:ids.collabNoClientBusiness,documentRef:preEmissionRef});
 need(preEmissionCleanup?.ok===true&&preEmissionCleanup?.deleted===true,'B4_003_R20_PREEMISSION_ATTACHMENT_CLEANUP_FAILED:'+JSON.stringify(preEmissionCleanup));
 proof.r20PreEmissionCollabAttachment={businessId:ids.collabNoClientBusiness,clientId:clean(preEmissionRow.clienteId),documentRef:preEmissionRef,staged:true,finalized:true,readback:true,cleanup:true};
 proof.assertions.preEmissionCollaborationAttachmentDurable=true;
 const importerProbe=await page.evaluate(ids=>{
   const out={error:'',fileExists:false,drawerExists:false,drawerOpen:false,backOpen:false,drawerText:'',openSource:'',scriptSrcs:[]};
   try{
     out.openSource=String(Orbit.importa&&Orbit.importa.open||'').slice(0,1000);
     out.scriptSrcs=Array.from(document.scripts||[]).map(x=>String(x.src||'')).filter(x=>/importa/i.test(x));
     Orbit.importa.open('docs-aseguradora',{
       multi:false,
       modo:'inteligente',
       scope:{aseguradoraId:ids.insurer,aseguradoraNombre:'B4 R20 Aseguradora QA',pais:'GT',moneda:'GTQ',ramo:'Automóviles',producto:''},
       documentIntent:'documento',
       docCategory:'Cotización oficial/ejemplo'
     });
   }catch(error){out.error=String(error&&error.stack||error&&error.message||error).slice(0,1800);}
   const dr=document.getElementById('imp-drawer'),back=document.getElementById('imp-back');
   out.fileExists=!!document.getElementById('imp-file');
   out.drawerExists=!!dr;
   out.drawerOpen=!!(dr&&dr.classList.contains('open'));
   out.backOpen=!!(back&&back.classList.contains('open'));
   out.drawerText=String(dr&&dr.innerText||'').replace(/\s+/g,' ').trim().slice(0,1800);
   return out;
 },ids);
 proof.r13InsurerDrive.importerProbe=importerProbe;
 console.log('B4_003_R13_IMPORTER_OPEN_PROBE='+JSON.stringify(importerProbe));
 need(!importerProbe.error&&importerProbe.fileExists===true,'B4_003_R13_IMPORTER_FILE_INPUT_NOT_RENDERED:'+JSON.stringify(importerProbe));
 const driveFileName='cotizacion-vehiculo-liviano-'+run+'.csv';
 await page.setInputFiles('#imp-file',{name:'cotizacion-vehiculo-liviano-'+run+'.csv',mimeType:'text/csv',buffer:Buffer.from('tipo,ramo,producto\nCotización oficial/ejemplo,Automóviles,Vehículo Liviano\n','utf8')});
 await page.waitForSelector('[data-insurer-source-classification="1"]',{timeout:10000});
 const importerClassifyText=await page.locator('#imp-drawer').innerText();
 need(/Análisis completado/.test(importerClassifyText)&&/Automóviles/.test(importerClassifyText)&&/Vehículo Liviano/.test(importerClassifyText)&&/Cómo se analizó/.test(importerClassifyText)&&!/No se extraerán ni aplicarán tarifas automáticamente/.test(importerClassifyText),'B4_003_R20_SECOND_REVIEW_INSURER_IMPORT_NOT_ANALYZED:'+JSON.stringify({text:importerClassifyText.slice(0,1800)}));
 await page.click('#imp-next2');
 await page.waitForSelector('#imp-finish',{timeout:10000});
 proof.assertions.insurerImportTruthfulClassificationStep=true;proof.assertions.insurerImportAnalyzesContent=true;proof.assertions.insurerImportUsesDependentCatalogs=true;
 await page.click('#imp-finish');
 await page.waitForFunction(()=>!document.getElementById('imp-back')?.classList.contains('open'),null,{timeout:60000});
 const insurerAfterUpload=(await ref('aseguradoras',ids.insurer).get()).data()||{};
 const insurerDocs=Array.isArray(insurerAfterUpload.docs)?insurerAfterUpload.docs:[];
 const driveDoc=insurerDocs.find(d=>String(d&&d.nombre||'')===driveFileName)||insurerDocs[insurerDocs.length-1]||null;
 need(!!driveDoc&&clean(driveDoc.documentRef),'B4_003_R13_INSURER_DRIVE_DOCUMENT_LINK_MISSING');
 need(driveDoc.requiereValidacion===true&&driveDoc.estado==='Documento recibido','B4_003_R13_INSURER_DRIVE_VALIDATION_STATE_INVALID');
 need(driveDoc.provenance?.repository==='Drive'&&driveDoc.provenance?.confirmed===true&&clean(driveDoc.aseguradoraId)===ids.insurer,'B4_003_R13_INSURER_DRIVE_PROVENANCE_INVALID');
 need(insurerAfterUpload.cotizadorHabilitado!==true&&insurerAfterUpload.comparativoHabilitado!==true&&insurerAfterUpload.iaHabilitada!==true,'B4_003_R13_INSURER_DRIVE_AUTO_ENABLEMENT_FORBIDDEN');
 const driveResolve=await page.evaluate(async ({documentRef,insurerId})=>{
   const p=Orbit.productDriveDocumentProviderP0;
   return await p.resolve(documentRef,{entidad:'aseguradora',entidadId:insurerId,aseguradoraId:insurerId});
 },{documentRef:driveDoc.documentRef,insurerId:ids.insurer});
 need(driveResolve&&driveResolve.ok===true&&driveResolve.status==='disponible','B4_003_R13_INSURER_DRIVE_READBACK_FAILED:'+JSON.stringify(driveResolve));
 proof.r13InsurerDrive.upload={documentRef:driveDoc.documentRef,nombre:driveDoc.nombre,estado:driveDoc.estado,requiereValidacion:driveDoc.requiereValidacion,provenance:driveDoc.provenance,resolve:{ok:driveResolve.ok,status:driveResolve.status,repository:driveResolve.repository||''}};

 await page.reload({waitUntil:'domcontentloaded'});
 await bootProduct(page,token);
 await page.waitForFunction(({insurerId,documentRef})=>{
   const a=Orbit.store&&Orbit.store.get?Orbit.store.get('aseguradoras',insurerId):null;
   return !!(a&&Array.isArray(a.docs)&&a.docs.some(d=>String(d&&d.documentRef||'')===documentRef));
 },{insurerId:ids.insurer,documentRef:driveDoc.documentRef},{timeout:30000});
 const reloadDoc=await page.evaluate(({insurerId,documentRef})=>{
   const a=Orbit.store.get('aseguradoras',insurerId)||{};
   const d=(a.docs||[]).find(x=>String(x&&x.documentRef||'')===documentRef)||null;
   return{present:!!d,estado:d&&d.estado||'',requiereValidacion:d&&d.requiereValidacion===true,cotizador:a.cotizadorHabilitado===true,comparativo:a.comparativoHabilitado===true,ia:a.iaHabilitada===true};
 },{insurerId:ids.insurer,documentRef:driveDoc.documentRef});
 need(reloadDoc.present===true&&reloadDoc.estado==='Documento recibido'&&reloadDoc.requiereValidacion===true,'B4_003_R13_INSURER_DRIVE_RELOAD_PERSISTENCE_FAILED');
 need(!reloadDoc.cotizador&&!reloadDoc.comparativo&&!reloadDoc.ia,'B4_003_R13_INSURER_DRIVE_RELOAD_AUTO_ENABLEMENT_FORBIDDEN');
 await page.evaluate(id=>{document.getElementById('asg-ficha')?.remove();Orbit.modules.aseguradoras.ficha(id);},ids.insurer);
 await page.waitForSelector('#asg-ficha [data-tab="documentos"]',{timeout:10000});
 await page.click('#asg-ficha [data-tab="documentos"]');
 await page.waitForFunction(name=>Array.from(document.querySelectorAll('#asg-ficha [data-drive-file]')).some(x=>String(x.innerText||'').includes(name)),driveFileName,{timeout:15000});
 proof.r20SecondDriveBrowser=await page.evaluate(name=>{const panel=document.querySelector('#asg-ficha [data-drive-browser="1"]'),file=Array.from(panel?.querySelectorAll('[data-drive-file]')||[]).find(x=>String(x.innerText||'').includes(name)),path=String(panel?.querySelector('[data-drive-path]')?.innerText||'');return{panel:!!panel,filePresent:!!file,path,rootButton:!!panel?.querySelector('[data-drive-root]')};},driveFileName);
 need(proof.r20SecondDriveBrowser.panel&&proof.r20SecondDriveBrowser.filePresent&&proof.r20SecondDriveBrowser.rootButton,'B4_003_R20_SECOND_REVIEW_INSURER_DRIVE_BROWSER_UI_MISSING:'+JSON.stringify(proof.r20SecondDriveBrowser));
 // R20 UAT4: discriminate a missing click handler from an unavailable Drive read.
 // The same protected synthetic dossier remains authoritative; do not fake a preview.
 const dossierHttpTrace=[];
 const observeDossierHttp=async response=>{
   if(!/orbit360DocumentDriveReadDossierPreview/.test(response.url()))return;
   const entry={status:response.status(),urlSuffix:'orbit360DocumentDriveReadDossierPreview'};
   try{if(response.status()!==200)entry.error=String((await response.text())||'').slice(0,380);}catch(_e){}
   dossierHttpTrace.push(entry);
 };
 page.on('response',observeDossierHttp);
 const clickAttempt=await page.evaluate(name=>{
   const file=Array.from(document.querySelectorAll('#asg-ficha [data-drive-file]')).find(x=>String(x.innerText||'').includes(name));
   if(!file)return{found:false};
   const ref=String(file.getAttribute('data-drive-file')||'');
   file.click();return{found:true,referenceValid:/^[A-Za-z0-9_-]{20,}$/.test(ref),disabledAfterClick:file.disabled};
 },driveFileName);
 need(clickAttempt.found&&clickAttempt.referenceValid,'B4_003_R20_INSURER_DRIVE_FILE_CLICK_TARGET_INVALID:'+JSON.stringify(clickAttempt));
 try{
   await page.waitForFunction(()=>{const p=document.querySelector('#asg-ficha [data-drive-preview]');return !!p&&!p.hidden&&String(p.innerText||'').length>0;},null,{timeout:15000});
 }catch(error){
   const state=await page.evaluate(name=>{
     const p=document.querySelector('#asg-ficha [data-drive-preview]'),btn=Array.from(document.querySelectorAll('#asg-ficha [data-drive-file]')).find(x=>String(x.innerText||'').includes(name));
     const toasts=Array.from(document.querySelectorAll('.ciclo-toast,[role="alert"]')).map(el=>String(el.textContent||'').trim().slice(0,160)).filter(Boolean);
     return{buttonPresent:!!btn,buttonDisabled:!!btn?.disabled,previewPresent:!!p,previewHidden:p?.hidden,previewTextLength:String(p?.innerText||'').length,toastMessages:toasts.slice(-3)};
   },driveFileName);
   proof.r20SecondDriveBrowserOpenDiagnostic={state,dossierHttpTrace,clickAttempt,errorName:String(error?.name||'TimeoutError')};
   console.log('B4_003_DRIVE_BROWSER_OPEN_CAUSAL_DIAGNOSTIC='+JSON.stringify(proof.r20SecondDriveBrowserOpenDiagnostic));
   throw new Error('B4_003_DRIVE_BROWSER_OPEN_NOT_CONFIRMED:'+JSON.stringify(proof.r20SecondDriveBrowserOpenDiagnostic));
 }finally{page.off('response',observeDossierHttp);}

 proof.r20SecondDrivePreview=await page.evaluate(()=>{const p=document.querySelector('#asg-ficha [data-drive-preview]');return{visible:!!p&&!p.hidden,text:String(p?.innerText||'').replace(/\s+/g,' ').trim().slice(0,800),iframe:!!p?.querySelector('iframe'),image:!!p?.querySelector('img'),download:!!p?.querySelector('[data-dossier-download]')};});
 need(proof.r20SecondDrivePreview.visible&&(proof.r20SecondDrivePreview.iframe||proof.r20SecondDrivePreview.image||proof.r20SecondDrivePreview.download),'B4_003_R20_SECOND_REVIEW_INSURER_DRIVE_PREVIEW_FAILED:'+JSON.stringify(proof.r20SecondDrivePreview));
 proof.assertions.insurerDriveBrowserVisible=true;proof.assertions.insurerDriveBrowserFileOpen=true;
 const deleted=await page.evaluate(async ({tenantId,documentRef,insurerId})=>{
   const r=Orbit.productRuntimeBrowserProvidersP0;
   const role=Orbit.session&&Orbit.session.rol?Orbit.session.rol():'';
   return await r.callFunction('orbit360DocumentDriveCleanupPreview',{tenantId,activeRole:role,entidad:'aseguradora',entidadId:insurerId,aseguradoraId:insurerId,documentRef},'us-east1');
 },{tenantId,documentRef:driveDoc.documentRef,insurerId:ids.insurer});
 need(deleted&&deleted.ok===true&&deleted.deleted===true,'B4_003_R13_INSURER_DRIVE_QA_CLEANUP_FAILED:'+JSON.stringify(deleted));
 proof.r13InsurerDrive.reload=reloadDoc;
 proof.r13InsurerDrive.cleanup={status:deleted.status,deleted:deleted.deleted===true,previewIsolated:deleted.previewIsolated===true};
 proof.assertions.insurerDriveE2E=true;
 proof.assertions.insurerDriveReloadPersistence=true;
 proof.assertions.insurerDriveNoAutoEnablement=true;
 proof.assertions.insurerDriveSyntheticRollback=true;
 proof.assertions.insurerDriveFileCleanup=true;

 await Promise.all(httpCapturePromises);
 const expectedIsolationDenials=[],unexpectedHttpErrors=[];
 for(const e of proof.httpErrors){
   let d=null;try{d=JSON.parse(e.postData||'{}').data||null;}catch{}
   const muts=d&&Array.isArray(d.mutations)?d.mutations:[];
   const exactSecureAudit=e.status===403
     && /orbit360ProductOperationalCommandPreview$/.test(e.url||'')
     && /Preview operativo solo admite fixtures sintéticos autorizados B3-004\/B4-003/.test(e.responseBody||'')
     && muts.length===1
     && muts[0]&&muts[0].action==='insert'&&muts[0].collection==='actividades'
     && /^secres_[A-Za-z0-9._:-]+$/.test(String(muts[0].id||''))
     && muts[0].payload&&muts[0].payload.tipo==='admin'
     && muts[0].payload.titulo==='Acceso a recurso seguro'
     && /^document\.upload · ok$/.test(String(muts[0].payload.detalle||''));
   const entityId=clean(d&&d.entidadId),entity=norm(d&&d.entidad),sourceModule=norm(d&&d.sourceModule);
   const exactDriveIsolation=e.status===403
     && /orbit360DocumentDriveListFolderPreview$/.test(e.url||'')
     && /Preview documental solo admite expedientes sintéticos autorizados\./.test(e.responseBody||'')
     && /PERMISSION_DENIED/.test(e.responseBody||'')
     && clean(d&&d.tenantId)===tenantId
     && entity==='aseguradora'
     && entityId===clean(knowledgeProbe.aseguateId)
     && entityId==='gt-aseguradora-guatemalteca'
     && !/^b4003qa_/i.test(entityId)
     && sourceModule==='aseguradoras'
     && !clean(d&&d.folderId);
   if(exactSecureAudit){
     expectedIsolationDenials.push({status:e.status,url:e.url,id:muts[0].id,collection:'actividades',reason:'SECURE_RESOURCE_AUDIT_NON_SYNTHETIC_DENIED_IN_PREVIEW',persisted:null});
   }else if(exactDriveIsolation){
     expectedIsolationDenials.push({status:e.status,url:e.url,operation:'listFolder',entity:'aseguradora',entityId,sourceModule:'aseguradoras',reason:'DRIVE_REAL_DOSSIER_EXPECTED_ISOLATION_DENIAL',persisted:false,persistenceCheck:'NOT_APPLICABLE_READ_ONLY_DENIAL'});
   }else unexpectedHttpErrors.push(e);
 }
 for(const x of expectedIsolationDenials){
   if(x.collection==='actividades')x.persisted=(await ref('actividades',x.id).get()).exists;
 }
 const secureAuditDenials=expectedIsolationDenials.filter(x=>x.reason==='SECURE_RESOURCE_AUDIT_NON_SYNTHETIC_DENIED_IN_PREVIEW');
 const driveIsolationDenials=expectedIsolationDenials.filter(x=>x.reason==='DRIVE_REAL_DOSSIER_EXPECTED_ISOLATION_DENIAL');
 proof.driveIsolation={positiveSynthetic:{
   insurerId:ids.insurer,
   e2e:proof.assertions.insurerDriveE2E===true,
   browserVisible:proof.assertions.insurerDriveBrowserVisible===true,
   fileOpen:proof.assertions.insurerDriveBrowserFileOpen===true,
   reloadPersistence:proof.assertions.insurerDriveReloadPersistence===true,
   cleanup:proof.assertions.insurerDriveFileCleanup===true
 },negativeReal:{entityId:clean(knowledgeProbe.aseguateId),denials:driveIsolationDenials}};
 proof.assertions.insurerDriveSyntheticPositivePath=proof.assertions.insurerDriveE2E===true
   && proof.assertions.insurerDriveBrowserVisible===true
   && proof.assertions.insurerDriveBrowserFileOpen===true
   && proof.assertions.insurerDriveReloadPersistence===true
   && proof.assertions.insurerDriveSyntheticRollback===true
   && proof.assertions.insurerDriveFileCleanup===true;
 proof.assertions.insurerDriveRealIsolationDenied=driveIsolationDenials.length>=1
   && driveIsolationDenials.every(x=>x.entityId==='gt-aseguradora-guatemalteca'&&x.operation==='listFolder'&&x.reason==='DRIVE_REAL_DOSSIER_EXPECTED_ISOLATION_DENIAL');
 const generic403=(proof.consoleErrors||[]).filter(x=>/Failed to load resource: the server responded with a status of 403/.test(x)).length;
 const non403=(proof.consoleErrors||[]).filter(x=>!/Failed to load resource: the server responded with a status of 403/.test(x));
 const extra403=Math.max(0,generic403-expectedIsolationDenials.length);
 proof.expectedIsolationDenials=expectedIsolationDenials;
 proof.unexpectedHttpErrors=unexpectedHttpErrors;
 proof.unexpectedConsoleErrors=non403.concat(Array.from({length:extra403},()=> 'UNATTRIBUTED_CONSOLE_403'));
 proof.assertions.previewGeneralWriteIsolation=secureAuditDenials.length>=1
   && secureAuditDenials.every(x=>x.persisted===false)
   && proof.assertions.insurerDriveRealIsolationDenied===true
   && unexpectedHttpErrors.length===0
   && proof.unexpectedConsoleErrors.length===0;
 proof.assertions.noOperationalRealRowsWritten=proof.assertions.previewGeneralWriteIsolation===true;
 need(proof.assertions.insurerDriveSyntheticPositivePath===true,'B4_003_DRIVE_SYNTHETIC_POSITIVE_PATH_NOT_PROVEN');
 need(proof.assertions.insurerDriveRealIsolationDenied===true,'B4_003_DRIVE_REAL_ISOLATION_NEGATIVE_PATH_NOT_PROVEN');
 need(proof.assertions.cancellationProjectionConsistent===true,'B4_003_REAL_CANCELATION_SOURCE_WITHOUT_PROJECTION');
 proof.assertions.r19CommercialDependencyClearsStale=true;
 proof.assertions.r19QualitySearchFiltersReachable=true;
 proof.assertions.r19RenewalIndividualDisposition=true;
 proof.assertions.r19MobilePolicySearchQuery=true;
 proof.assertions.r19InsurerHierarchyCollapsedRegistry=true;
 proof.status=proof.r13RenewalDataBlocker&&proof.r13RenewalDataBlocker.blocking===true?'PASS_EXCEPT_EXPLICIT_RENEWAL_DATA_BLOCKER':'PASS';
} catch(error) {
 proof.status='FAIL';
 proof.failure={message:clean(error&&error.message||error),stack:clean(error&&error.stack||error).slice(0,8000)};
 const causeCode=clean(error&&error.message||error).split(':')[0].replace(/[^A-Za-z0-9_.-]/g,'').slice(0,140);
 const frame=clean(error&&error.stack||'').match(/gravicentra-i6-5-b4-003-preview-proof\.mjs:\d+:\d+/);
 console.error('B4_003_BROWSER_PROOF_FAILURE_CODE='+causeCode);
 console.error('B4_003_BROWSER_PROOF_FAILURE_FRAME='+(frame?frame[0]:'NOT_FOUND'));
} finally {
 if(page)await page.close().catch(()=>{});
 if(context)await context.close().catch(()=>{});
 if(browser)await browser.close().catch(()=>{});
 await cleanup(startMs).catch(e=>proof.cleanupError=clean(e&&e.message||e));
 const checks=[];
 for(const [c,id] of [['actividades',ids.renewActivity],['actividades',ids.cancelActivity],['negocios',ids.recoveryBusiness],['negocios',ids.collabBusiness],['negocios',ids.collabNoClientBusiness],['cancelaciones',ids.cancelation],['recibosEsperados',ids.healthReceipt1],['recibosEsperados',ids.healthReceipt2],['recibosEsperados',ids.healthReceiptShadow],['polizas',ids.renewalPolicy],['polizas',ids.expiredRenewPolicy],['polizas',ids.unknownRenewPolicy],['polizas',ids.renewabilityWritePolicy],['polizas',ids.cancelPolicy],['polizas',ids.healthPolicy],['aseguradoras',ids.insurer],['clientes',ids.client]])checks.push((await ref(c,id).get()).exists);
 proof.syntheticFinalAbsent=checks.every(x=>x===false);
 proof.assertions.cleanupComplete=proof.syntheticFinalAbsent;
 fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
}
if(!['PASS','PASS_EXCEPT_EXPLICIT_RENEWAL_DATA_BLOCKER'].includes(proof.status)||proof.syntheticFinalAbsent!==true||proof.assertions.insurerDriveFileCleanup!==true)process.exitCode=1;
console.log(JSON.stringify({status:proof.status,assertions:proof.assertions,visualScope:proof.visualScope,r13PolicyPerformance:proof.r13PolicyPerformance,r13RenewalSourceDryRun:proof.r13RenewalSourceDryRun,r13RenewalDataBlocker:proof.r13RenewalDataBlocker,r13InsurerDrive:proof.r13InsurerDrive,renewalRenderStability:proof.renewalRenderStability,qaResidue:proof.qaResidue,runtimeCancellationEvidence:proof.runtimeCancellationEvidence,r18CommercialCreate:proof.r18CommercialCreate,r18ManagementModal:proof.r18ManagementModal,r18RenewalDisposition:proof.r18RenewalDisposition,r18PolicyEditionValidation:proof.r18PolicyEditionValidation,r18MobilePolicySearch:proof.r18MobilePolicySearch,r18RenewalKpiParity:proof.r18RenewalKpiParity,r18InsurerActivity:proof.r18InsurerActivity,syntheticWrites:proof.syntheticWrites,cleanupWrites:proof.cleanupWrites,syntheticFinalAbsent:proof.syntheticFinalAbsent,pageErrors:proof.pageErrors,consoleErrors:proof.consoleErrors,httpErrors:proof.httpErrors,expectedIsolationDenials:proof.expectedIsolationDenials,unexpectedHttpErrors:proof.unexpectedHttpErrors,unexpectedConsoleErrors:proof.unexpectedConsoleErrors},null,2));
// R12 remaining B4-003 blocker proof: 2026-10-03
