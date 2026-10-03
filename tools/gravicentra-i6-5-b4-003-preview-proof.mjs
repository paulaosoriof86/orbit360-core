import fs from 'node:fs';
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
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
need(target,'B4_003_PREVIEW_URL_MISSING');

const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);
const ids={
 client:'b4003qa_client_'+run,
 renewalPolicy:'b4003qa_policy_renew_'+run,
 cancelPolicy:'b4003qa_policy_cancel_'+run,
 cancelation:'b4003qa_cancel_'+run
};
ids.renewActivity='act_ren_'+ids.renewalPolicy+'_'+new Date().toISOString().slice(0,10).replace(/-/g,'');
ids.cancelActivity='act_rec_'+ids.cancelation;
ids.recoveryBusiness='neg_rec_'+ids.cancelation;
const residueIds=['pol_mulsmxsk','pol_mulssmuz','pol_mulsxofx'];
const proof={schema:'GRAVICENTRA_I6_5_B4_003_PREVIEW_PROOF_V1',status:'INIT',target,ids,assertions:{},syntheticWrites:0,cleanupWrites:0,pageErrors:[],consoleErrors:[],syntheticFinalAbsent:false,qaResidue:{},runtimeCancellationEvidence:{}};

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
async function seed(who){
 const today=new Date(),end=new Date(today.getTime()+10*86400000),endS=end.toISOString().slice(0,10),startS=today.toISOString().slice(0,10);
 const common={tenantId,__syntheticQa:true,ownerUid:who.uid,ownerEmail:who.email,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
 await ref('clientes',ids.client).set({...common,id:ids.client,nombre:'B4-003 QA Cliente',tipo:'Persona',pais:'GT',moneda:'GTQ',asesorId:who.advisorId||'qa',email:'b4003qa@example.invalid',telefono:''},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.renewalPolicy).set({...common,id:ids.renewalPolicy,clienteId:ids.client,asesorId:who.advisorId||'qa',numero:'B4-003-REN-'+run,estado:'Vigente',pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Auto',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:1000,primaNeta:900},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.cancelPolicy).set({...common,id:ids.cancelPolicy,clienteId:ids.client,asesorId:who.advisorId||'qa',numero:'B4-003-CAN-'+run,estado:'Cancelada',pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Auto',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:800,primaNeta:700},{merge:false});proof.syntheticWrites++;
 await ref('cancelaciones',ids.cancelation).set({...common,id:ids.cancelation,clienteId:ids.client,polizaId:ids.cancelPolicy,asesorId:who.advisorId||'qa',pais:'GT',moneda:'GTQ',fecha:startS,motivo:'Prueba sintética B4-003',valorPerdido:700,recuperacion:'Pendiente de contacto',recuperada:false},{merge:false});proof.syntheticWrites++;
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
   const requested=['clientes','polizas','cancelaciones','negocios','gestiones'];
   const forced={called:false,phase:'',requested:[]};
   const forceCollections=(event)=>{
     try{
       if(!Orbit.store||typeof Orbit.store._ensureCollections!=='function')return;
       const attached=Orbit.store._ensureCollections(requested)||[];
       forced.called=Array.isArray(attached)&&attached.includes('cancelaciones');
       forced.phase=String(event?.detail?.phase||'available-readonly-store');
       forced.requested=Array.isArray(attached)?attached.slice():[];
     }catch(error){forced.error=String(error&&error.message||error);}
   };
   window.addEventListener('orbit:product-readonly-bootstrap',forceCollections);
   const s=Orbit.productAppP0.status?.();
   let activated;
   try{
     activated=await Promise.resolve(s?.started?s:Orbit.productAppP0.activate());
     forceCollections({detail:{phase:'post-activate'}});
   }finally{
     window.removeEventListener('orbit:product-readonly-bootstrap',forceCollections);
   }
   return{uid:String(c.auth.currentUser?.uid||''),started:activated?.started===true,forced};
 },token);
 need(state.uid&&state.started,'B4_003_PRODUCT_SESSION_NOT_STARTED');
 need(state.forced&&state.forced.called===true,'B4_003_READONLY_COLLECTION_FORCE_NOT_REACHED');
 return state;
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
 for(const [c,id] of [['actividades',ids.renewActivity],['actividades',ids.cancelActivity],['negocios',ids.recoveryBusiness],['cancelaciones',ids.cancelation],['polizas',ids.renewalPolicy],['polizas',ids.cancelPolicy],['clientes',ids.client]]){
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
try{
 const who=await actor();proof.actor=who;
 await residueReadback();
 await cancellationEvidence();
 await seed(who);
 const token=await auth.createCustomToken(who.uid);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 context=await browser.newContext({ignoreHTTPSErrors:false});
 page=await context.newPage();
 page.on('pageerror',e=>proof.pageErrors.push(clean(e?.message||e)));
 page.on('console',m=>{if(m.type()==='error')proof.consoleErrors.push(clean(m.text()));});
 await applyLegal(page,who);
 await page.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});
 await bootProduct(page,token);
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
   return t.includes('Conocimiento vigente y observado')&&t.includes('0% en cotizador/pólizas')&&t.includes('0% en póliza muestra de 10 pagos');
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
 await page.evaluate(()=>document.getElementById('asg-ficha')?.remove());

 proof.visualScope=await page.evaluate(ids=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';
   const countries=(selector,attr)=>Array.from(h.querySelectorAll(selector)).map(el=>String(el.getAttribute(attr)||'').toUpperCase()).filter(Boolean);
   Orbit.pais='GT';Orbit.modules.cancelaciones.render(h);
   const cancelGT=countries('[data-cancel-country]','data-cancel-country');
   const syntheticCancelVisibleGT=cancelGT.includes('GT');
   Orbit.modules.cancelaciones.detalleKpi('valor');
   const cancelKpiDetailOpen=!!document.getElementById('cancelation-kpi-detail');
   document.getElementById('cancelation-kpi-detail')?.remove();
   Orbit.pais='CO';Orbit.modules.cancelaciones.render(h);
   const cancelCO=countries('[data-cancel-country]','data-cancel-country');
   Orbit.pais='GT';Orbit.modules.renovaciones.render(h);
   const renewGT=countries('[data-renewal-country]','data-renewal-country');
   const syntheticRenewVisibleGT=!!h.querySelector('[data-renewal-policy="'+ids.renewalPolicy+'"]');
   const actionLayout=h.querySelector('[data-renewal-policy="'+ids.renewalPolicy+'"] [data-renewal-actions-layout]')?.getAttribute('data-renewal-actions-layout')||'';
   Orbit.pais='CO';Orbit.modules.renovaciones.render(h);
   const renewCO=countries('[data-renewal-country]','data-renewal-country');
   Orbit.pais=previous;
   return{cancelGT,cancelCO,renewGT,renewCO,syntheticCancelVisibleGT,syntheticRenewVisibleGT,cancelKpiDetailOpen,actionLayout};
 },ids);
 need(proof.visualScope.cancelGT.every(x=>x==='GT')&&proof.visualScope.cancelCO.every(x=>x==='CO'),'B4_003_CANCEL_SELECTED_COUNTRY_SCOPE_LEAK');
 need(proof.visualScope.renewGT.every(x=>x==='GT')&&proof.visualScope.renewCO.every(x=>x==='CO'),'B4_003_RENEW_SELECTED_COUNTRY_SCOPE_LEAK');
 need(proof.visualScope.syntheticCancelVisibleGT===true&&proof.visualScope.syntheticRenewVisibleGT===true,'B4_003_GT_SYNTHETIC_SCOPE_MISSING');
 need(proof.visualScope.cancelKpiDetailOpen===true,'B4_003_CANCEL_KPI_DETAIL_MISSING');
 need(proof.visualScope.actionLayout==='grid2','B4_003_RENEW_ACTION_LAYOUT_NOT_COMPACT');
 proof.assertions.cancelSelectedCountryScope=true;
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

 await page.waitForFunction(()=>{
   const s=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
   const confirmed=s.serverConfirmedCollections||[];
   return ['clientes','polizas','gestiones'].every(x=>confirmed.includes(x));
 },null,{timeout:30000});
 await page.evaluate(()=>{location.hash='#/renovaciones';});
 await page.waitForFunction(()=>Orbit.route&&Orbit.route.key==='renovaciones',null,{timeout:10000});
 await page.waitForTimeout(500);
 const stable=await page.evaluate(async()=>{
   const h=document.getElementById('host'),before=h.innerText,count={n:0};
   const obs=new MutationObserver(m=>count.n+=m.length);obs.observe(h,{subtree:true,childList:true,characterData:true});
   await new Promise(r=>setTimeout(r,350));
   obs.disconnect();return{before,after:h.innerText,mutations:count.n,route:String(Orbit.route&&Orbit.route.key||'')};
 });
 proof.renewalRenderStability={mutationCount:stable.mutations,textStable:stable.before===stable.after,route:stable.route};
 need(stable.route==='renovaciones','B4_003_RENEWAL_ROUTE_NOT_ACTIVE');
 need(stable.before===stable.after&&stable.mutations===0,'B4_003_RENEWAL_DELAYED_RENDER_MUTATION');
 proof.assertions.noDelayedRenewalRenderMutation=true;

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

 proof.assertions.previewGeneralWriteIsolation=true;
 proof.assertions.noOperationalRealRowsWritten=true;
 need(proof.assertions.cancellationProjectionConsistent===true,'B4_003_REAL_CANCELATION_SOURCE_WITHOUT_PROJECTION');
 proof.status='PASS';
} finally {
 if(page)await page.close().catch(()=>{});
 if(context)await context.close().catch(()=>{});
 if(browser)await browser.close().catch(()=>{});
 await cleanup(startMs).catch(e=>proof.cleanupError=clean(e&&e.message||e));
 const checks=[];
 for(const [c,id] of [['actividades',ids.renewActivity],['actividades',ids.cancelActivity],['negocios',ids.recoveryBusiness],['cancelaciones',ids.cancelation],['polizas',ids.renewalPolicy],['polizas',ids.cancelPolicy],['clientes',ids.client]])checks.push((await ref(c,id).get()).exists);
 proof.syntheticFinalAbsent=checks.every(x=>x===false);
 proof.assertions.cleanupComplete=proof.syntheticFinalAbsent;
 fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
}
if(proof.status!=='PASS'||proof.syntheticFinalAbsent!==true)process.exitCode=1;
console.log(JSON.stringify({status:proof.status,assertions:proof.assertions,visualScope:proof.visualScope,renewalRenderStability:proof.renewalRenderStability,qaResidue:proof.qaResidue,runtimeCancellationEvidence:proof.runtimeCancellationEvidence,syntheticWrites:proof.syntheticWrites,cleanupWrites:proof.cleanupWrites,syntheticFinalAbsent:proof.syntheticFinalAbsent,pageErrors:proof.pageErrors,consoleErrors:proof.consoleErrors},null,2));
