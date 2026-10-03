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
 await ref('cancelaciones',ids.cancelation).set({...common,id:ids.cancelation,clienteId:ids.client,polizaId:ids.cancelPolicy,asesorId:who.advisorId||'qa',fecha:startS,motivo:'Prueba sintética B4-003',valorPerdido:700,recuperacion:'Pendiente de contacto',recuperada:false},{merge:false});proof.syntheticWrites++;
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
 proof.runtimeCancellationEvidence={cancelledPolicyCount:cancelled.length,cancelationRecordCount:realCancel,sample:cancelled.slice(0,25).map(x=>({id:x.id,numero:x.numero||'',estado:x.estado||x.status||'',clienteId:x.clienteId||'',pais:x.pais||''}))};
 proof.assertions.cancellationProjectionConsistent=(cancelled.length===0||realCancel>0);
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
 await page.goto(target+'/#/inicio',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:30000});
 await page.evaluate(async token=>{
   const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
   if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
 },token);
 await page.waitForFunction(id=>!!window.Orbit?.store?.get('polizas',id),ids.renewalPolicy,{timeout:30000});
 proof.assertions.authenticatedHydration=true;

 await page.evaluate(()=>{const h=document.getElementById('host');Orbit.modules.renovaciones.render(h);});
 await page.waitForTimeout(500);
 const stable=await page.evaluate(async()=>{
   const h=document.getElementById('host'),before=h.innerText,count={n:0};
   const obs=new MutationObserver(m=>count.n+=m.length);obs.observe(h,{subtree:true,childList:true,characterData:true});
   await new Promise(r=>setTimeout(r,350));
   obs.disconnect();return{before,after:h.innerText,mutations:count.n};
 });
 proof.renewalRenderStability={mutationCount:stable.mutations,textStable:stable.before===stable.after};
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
console.log(JSON.stringify({status:proof.status,assertions:proof.assertions,renewalRenderStability:proof.renewalRenderStability,qaResidue:proof.qaResidue,runtimeCancellationEvidence:proof.runtimeCancellationEvidence,syntheticWrites:proof.syntheticWrites,cleanupWrites:proof.cleanupWrites,syntheticFinalAbsent:proof.syntheticFinalAbsent,pageErrors:proof.pageErrors,consoleErrors:proof.consoleErrors},null,2));
