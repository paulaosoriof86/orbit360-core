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
 expiredRenewPolicy:'b4003qa_policy_expired_renew_'+run,
 unknownRenewPolicy:'b4003qa_policy_unknown_'+run,
 cancelPolicy:'b4003qa_policy_cancel_'+run,
 healthPolicy:'b4003qa_policy_health_'+run,
 healthReceipt1:'b4003qa_receipt_health_1_'+run,
 healthReceipt2:'b4003qa_receipt_health_2_'+run,
 cancelation:'b4003qa_cancel_'+run,
 insurer:'b4003qa_insurer_'+run
};
ids.renewActivity='act_ren_'+ids.renewalPolicy+'_'+new Date().toISOString().slice(0,10).replace(/-/g,'');
ids.cancelActivity='act_rec_'+ids.cancelation;
ids.recoveryBusiness='neg_rec_'+ids.cancelation;
const residueIds=['pol_mulsmxsk','pol_mulssmuz','pol_mulsxofx'];
const proof={schema:'GRAVICENTRA_I6_5_B4_003_PREVIEW_PROOF_V3',status:'INIT',target,ids,assertions:{},syntheticWrites:0,cleanupWrites:0,pageErrors:[],consoleErrors:[],httpErrors:[],expectedIsolationDenials:[],unexpectedHttpErrors:[],unexpectedConsoleErrors:[],syntheticFinalAbsent:false,qaResidue:{},runtimeCancellationEvidence:{}};

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
async function seed(who){
 const today=new Date(),end=new Date(today.getTime()+10*86400000),expiredEnd=new Date(today.getTime()-3*86400000),expiredStart=new Date(today.getTime()-368*86400000),endS=end.toISOString().slice(0,10),startS=today.toISOString().slice(0,10),expiredEndS=expiredEnd.toISOString().slice(0,10),expiredStartS=expiredStart.toISOString().slice(0,10);
 const common={tenantId,__syntheticQa:true,ownerUid:who.uid,ownerEmail:who.email,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
 await ref('clientes',ids.client).set({...common,id:ids.client,nombre:'B4-003 QA Cliente',tipo:'Persona',pais:'GT',moneda:'GTQ',asesorId:who.advisorId||'qa',email:'b4003qa@example.invalid',telefono:''},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.renewalPolicy).set({...common,id:ids.renewalPolicy,clienteId:ids.client,asesorId:who.advisorId||'qa',numero:'B4-003-REN-'+run,estado:'Vigente',renovable:true,pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Auto',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:1000,primaNeta:900},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.expiredRenewPolicy).set({...common,id:ids.expiredRenewPolicy,clienteId:ids.client,asesorId:who.advisorId||'qa',numero:'B4-003-EXP-'+run,estado:'Vencida',renovable:true,pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Auto',aseguradoraId:'',vigenciaInicio:expiredStartS,vigenciaFin:expiredEndS,prima:750,primaNeta:680},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.unknownRenewPolicy).set({...common,id:ids.unknownRenewPolicy,clienteId:ids.client,asesorId:who.advisorId||'qa',numero:'B4-003-UNKNOWN-'+run,estado:'Vigente',pais:'GT',moneda:'GTQ',ramo:'ACCIDENTES QA FUENTE',producto:'PRODUCTO QA FUENTE',subramo:'PRODUCTO QA FUENTE',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:650,primaNeta:600},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.cancelPolicy).set({...common,id:ids.cancelPolicy,clienteId:ids.client,asesorId:who.advisorId||'qa',numero:'B4-003-CAN-'+run,estado:'Cancelada',pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'Auto',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:800,primaNeta:700},{merge:false});proof.syntheticWrites++;
 await ref('polizas',ids.healthPolicy).set({...common,id:ids.healthPolicy,clienteId:ids.client,asesorId:who.advisorId||'qa',numero:'B4-003-HEALTH-'+run,estado:'Vigente',renovable:false,pais:'GT',moneda:'GTQ',ramo:'Accidentes',producto:'Accidentes',aseguradoraId:'',vigenciaInicio:startS,vigenciaFin:endS,prima:407.01,primaTotal:407.01,primaNeta:346.09,cuotas:2},{merge:false});proof.syntheticWrites++;
 await ref('recibosEsperados',ids.healthReceipt1).set({...common,id:ids.healthReceipt1,clienteId:ids.client,polizaId:ids.healthPolicy,asesorId:who.advisorId||'qa',pais:'GT',moneda:'GTQ',cuota:'1 / 2',serie:'1 / 2',fechaLimite:startS,primaTotal:271.34,montoTotal:271.34,monto:271.34,estado:'Pendiente'},{merge:false});proof.syntheticWrites++;
 await ref('recibosEsperados',ids.healthReceipt2).set({...common,id:ids.healthReceipt2,clienteId:ids.client,polizaId:ids.healthPolicy,asesorId:who.advisorId||'qa',pais:'GT',moneda:'GTQ',cuota:'2 / 2',serie:'2 / 2',fechaLimite:endS,primaTotal:271.34,montoTotal:271.34,monto:271.34,estado:'Pendiente'},{merge:false});proof.syntheticWrites++;
 await ref('cancelaciones',ids.cancelation).set({...common,id:ids.cancelation,clienteId:ids.client,polizaId:ids.cancelPolicy,asesorId:who.advisorId||'qa',pais:'GT',moneda:'GTQ',fecha:startS,motivo:'Prueba sintética B4-003',valorPerdido:700,recuperacion:'Pendiente de contacto',recuperada:false},{merge:false});proof.syntheticWrites++;
 await ref('aseguradoras',ids.insurer).set({...common,id:ids.insurer,nombre:'B4 R13 Aseguradora QA',canonicalName:'B4 R13 Aseguradora QA',displayName:'B4 R13 Aseguradora QA',pais:'GT',moneda:'GTQ',activo:true,estado:'Activa',docs:[],cotizadorHabilitado:false,comparativoHabilitado:false,iaHabilitada:false},{merge:false});proof.syntheticWrites++;
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
async function renewalDistributionReadback(){
 const [snap,clientSnap]=await Promise.all([
  tenant.collection('data').doc('polizas').collection('items').get(),
  tenant.collection('data').doc('clientes').collection('items').get()
 ]);
 const now=new Date();now.setHours(0,0,0,0);
 const clientById=new Map(clientSnap.docs.map(d=>[d.id,{id:d.id,...d.data()}]));
 const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!String(x.id).startsWith('b4003qa_')&&!String(x.id).startsWith('b4_')&&x.__syntheticQa!==true);
 const state=p=>{
  if(!Object.prototype.hasOwnProperty.call(p,'renovable')||p.renovable==null||clean(p.renovable)==='')return'UNKNOWN';
  const v=clean(p.renovable).toLowerCase();
  if(p.renovable===true||['true','si','sí','renovable'].includes(v))return'YES';
  if(p.renovable===false||['false','no','no renovable'].includes(v))return'NO';
  return'UNKNOWN';
 };
 const active=p=>['vigente','porrenovar'].includes(norm(p.estado))&&!p.renovadaPor&&norm(p.renovacionEstado)!=='renovada';
 const days=p=>{const raw=clean(p.vigenciaFin);if(!raw)return null;const d=new Date(raw+'T00:00:00');return Number.isFinite(d.getTime())?Math.ceil((d-now)/86400000):null;};
 const byState={YES:0,NO:0,UNKNOWN:0},byCountry={},buckets={vencidas:0,d15:0,d45:0,d90:0},eligible=[];
 rows.forEach(p=>{
  const rs=state(p);byState[rs]=(byState[rs]||0)+1;
  const cli=clientById.get(clean(p.clienteId))||{};
  const country=clean(p.pais||p.country||cli.pais||cli.country||'SIN_PAIS').toUpperCase()||'SIN_PAIS';
  byCountry[country]=byCountry[country]||{YES:0,NO:0,UNKNOWN:0,eligible90:0};
  byCountry[country][rs]=(byCountry[country][rs]||0)+1;
  if(rs!=='YES'||!active(p))return;
  const d=days(p);if(d==null||d>90)return;
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
 proof.realRenewalDistribution={policyCount:rows.length,byState,byCountry,buckets,eligibleCount:eligible.length,eligibleIds:eligible.map(x=>x.id),sample:eligible.slice(0,30),readOnly:true};
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
 for(const [c,id] of [['actividades',ids.renewActivity],['actividades',ids.cancelActivity],['negocios',ids.recoveryBusiness],['cancelaciones',ids.cancelation],['recibosEsperados',ids.healthReceipt1],['recibosEsperados',ids.healthReceipt2],['polizas',ids.renewalPolicy],['polizas',ids.expiredRenewPolicy],['polizas',ids.unknownRenewPolicy],['polizas',ids.cancelPolicy],['polizas',ids.healthPolicy],['aseguradoras',ids.insurer],['clientes',ids.client]]){
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
 await residueReadback();
 await cancellationEvidence();
 await renewalDistributionReadback();
 await seed(who);
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
   const originalOpen=Orbit.importa.open,captures=[];
   Orbit.importa.open=(kind,opts)=>{captures.push({kind,scope:opts&&opts.scope||{},documentIntent:opts&&opts.documentIntent||'',docCategory:opts&&opts.docCategory||''});};
   document.querySelector('#asg-ficha #af-imp-doc2')?.click();
   document.querySelector('#asg-ficha [data-tab="documentos"]')?.click();
   document.querySelector('#asg-ficha #af-imp-doc')?.click();
   Orbit.importa.open=originalOpen;
   return{canonicalCount:canonical.length,metrics,captures,text:String(box.innerText||'')};
 },knowledgeProbe.aseguateId);
 const related=proof.r12InsurerKnowledge.metrics.find(x=>x.label==='Fuentes relacionadas');
 need(!!related&&related.value===proof.r12InsurerKnowledge.canonicalCount&&related.value>0,'B4_003_R12_INSURER_KPI_CANONICAL_COUNT_MISMATCH');
 need(!/Fuentes registradas\s*0/i.test(proof.r12InsurerKnowledge.text),'B4_003_R12_SHADOW_ZERO_KPI_REMAINS');
 const tariffCapture=proof.r12InsurerKnowledge.captures.find(x=>x.documentIntent==='tarifa');
 const docCapture=proof.r12InsurerKnowledge.captures.find(x=>x.documentIntent==='documento');
 need(tariffCapture?.kind==='docs-aseguradora'&&tariffCapture?.scope?.aseguradoraId===knowledgeProbe.aseguateId&&tariffCapture?.docCategory==='Tarifario','B4_003_R12_TARIFF_IMPORT_INSURER_SCOPE_MISSING');
 need(docCapture?.kind==='docs-aseguradora'&&docCapture?.scope?.aseguradoraId===knowledgeProbe.aseguateId&&docCapture?.docCategory==='Formulario','B4_003_R12_DOCUMENT_IMPORT_INSURER_SCOPE_MISSING');
 proof.assertions.insurerKnowledgeCountersCanonical=true;
 proof.assertions.insurerImportScopeBound=true;
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
   const unknownRenewVisibleGT=!!h.querySelector('[data-renewal-policy="'+ids.unknownRenewPolicy+'"]');
   const actionLayout=h.querySelector('[data-renewal-policy="'+ids.renewalPolicy+'"] [data-renewal-actions-layout]')?.getAttribute('data-renewal-actions-layout')||'';
   Orbit.pais='CO';Orbit.modules.renovaciones.render(h);
   const renewCO=countries('[data-renewal-country]','data-renewal-country');
   Orbit.pais=previous;
   return{
     cancelGT:gt.countries,cancelCO:co.countries,cancelGtMs:gt.ms,cancelCoMs:co.ms,
     cancelExplicitTargetsGT:gt.explicitTargets,cancelExplicitTargetsCO:co.explicitTargets,
     cancelCrossCountryExplicitGT:gt.crossCountryExplicit,cancelCrossCountryExplicitCO:co.crossCountryExplicit,
     cancelIdentitySampleGT:gt.identitySample,cancelIdentitySampleCO:co.identitySample,
     renewGT,renewCO,syntheticCancelVisibleGT,syntheticRenewVisibleGT,unknownRenewVisibleGT,cancelKpiDetailOpen,actionLayout
   };
 },ids);
 need(proof.visualScope.cancelGT.every(x=>x==='GT')&&proof.visualScope.cancelCO.every(x=>x==='CO'),'B4_003_CANCEL_SELECTED_COUNTRY_SCOPE_LEAK');
 need(proof.visualScope.cancelGtMs<2500&&proof.visualScope.cancelCoMs<2500,'B4_003_R13_CANCEL_COUNTRY_SWITCH_TOO_SLOW:'+JSON.stringify({gtMs:proof.visualScope.cancelGtMs,coMs:proof.visualScope.cancelCoMs}));
 need(proof.visualScope.cancelExplicitTargetsGT===true&&proof.visualScope.cancelExplicitTargetsCO===true,'B4_003_R13_CANCEL_EXPLICIT_TARGETS_MISSING');
 need(proof.visualScope.cancelCrossCountryExplicitGT===true&&proof.visualScope.cancelCrossCountryExplicitCO===true,'B4_003_R13_CANCEL_CROSS_COUNTRY_IDENTITY_AMBIGUOUS');
 need(proof.visualScope.renewGT.every(x=>x==='GT')&&proof.visualScope.renewCO.every(x=>x==='CO'),'B4_003_RENEW_SELECTED_COUNTRY_SCOPE_LEAK');
 need(proof.visualScope.syntheticCancelVisibleGT===true&&proof.visualScope.syntheticRenewVisibleGT===true,'B4_003_GT_SYNTHETIC_SCOPE_MISSING');
 need(proof.visualScope.unknownRenewVisibleGT===false,'B4_003_UNKNOWN_RENEWABILITY_MUST_FAIL_CLOSED');
 proof.assertions.renewabilityTriStateFailClosed=true;
 need(proof.visualScope.cancelKpiDetailOpen===true,'B4_003_CANCEL_KPI_DETAIL_MISSING');
 need(proof.visualScope.actionLayout==='grid2','B4_003_RENEW_ACTION_LAYOUT_NOT_COMPACT');
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

 // R12: information health surfaces policy/calendar mismatch without rewriting either source value.
 proof.r12InformationHealth=await page.evaluate(ids=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';Orbit.pais='GT';Orbit.modules.calidad.render(h);
   const issue=(Orbit.modules.calidad.financialIntegrityIssues?.()||[]).find(x=>x.p&&x.p.id===ids.healthPolicy);
   const row=h.querySelector('[data-information-health-policy="'+ids.healthPolicy+'"]');
   const text=String(row&&row.innerText||'').replace(/\s+/g,' ').trim();
   Orbit.pais=previous;
   return{issue:issue?{total:issue.total,schedule:issue.schedule,delta:issue.delta,receipts:issue.receipts}:null,rowVisible:!!row,rowText:text};
 },ids);
 need(proof.r12InformationHealth.rowVisible===true,'B4_003_R12_INFORMATION_HEALTH_ROW_MISSING');
 need(Math.abs(proof.r12InformationHealth.issue?.total-407.01)<0.001&&Math.abs(proof.r12InformationHealth.issue?.schedule-542.68)<0.001,'B4_003_R12_INFORMATION_HEALTH_VALUES_CHANGED');
 need(Math.abs(proof.r12InformationHealth.issue?.delta-135.67)<0.001,'B4_003_R12_INFORMATION_HEALTH_DELTA_INVALID');
 proof.assertions.informationHealthFinancialMismatchVisible=true;
 proof.assertions.informationHealthNoInference=true;

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
 const policyRouteStarted=Date.now();
 await page.evaluate(()=>{location.hash='#/polizas';});
 await page.waitForFunction(()=>Orbit.route&&Orbit.route.key==='polizas',null,{timeout:10000});
 await page.waitForSelector('#host .tbl',{timeout:10000});
 const policyRouteMs=Date.now()-policyRouteStarted;
 need(policyRouteMs<2500,'B4_003_R13_POLICY_ROUTE_TOO_SLOW:'+policyRouteMs);
 need((await page.locator('[data-polizas-relations-loading]').count())===0,'B4_003_R13_POLICY_ROUTE_STUCK_LOADING');
 const policySearchNumber='B4-003-REN-'+run;
 const policySearchStarted=Date.now();
 await page.fill('#fq',policySearchNumber);
 await page.waitForFunction(num=>{
   const count=String(document.getElementById('fb-count')?.textContent||'').trim();
   const rows=Array.from(document.querySelectorAll('#host .tbl tbody tr')).filter(r=>String(r.innerText||'').includes(num));
   return document.getElementById('fq')?.value===num&&/^1\s+de\s+/i.test(count)&&rows.length===1;
 },policySearchNumber,{timeout:10000});
 const policySearchMs=Date.now()-policySearchStarted;
 need(policySearchMs<2500,'B4_003_R13_POLICY_SEARCH_TOO_SLOW:'+policySearchMs);
 const policyDetailStarted=Date.now();
 const searchRow=page.locator('#host .tbl tbody tr').filter({hasText:policySearchNumber}).first();
 await searchRow.click();
 await page.waitForSelector('[data-policy-fullpage="1"]',{timeout:10000});
 const policyDetailMs=Date.now()-policyDetailStarted;
 need(policyDetailMs<2500,'B4_003_R13_POLICY_DETAIL_TOO_SLOW:'+policyDetailMs);
 proof.r13PolicyPerformance={routeMs:policyRouteMs,searchMs:policySearchMs,detailMs:policyDetailMs,searchNumber:policySearchNumber};
 proof.assertions.policyRouteUnder2500ms=true;
 proof.assertions.policySearchUnder2500ms=true;
 proof.assertions.policyDetailUnder2500ms=true;

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
   let loading=false,leakedRows=-1,readyExpired=false,unknownActionable=true,pendingCount=-1,placeholderClient=false;
   try{
     store._productStatus=function(){const q=original.call(store)||{},confirmed=[].concat(q.serverConfirmedCollections||[]).filter(x=>x!=='aseguradoras');return Object.assign({},q,{serverConfirmedCollections:confirmed});};
     Orbit.modules.renovaciones.render(h);
     loading=!!h.querySelector('[data-renewals-loading]');
     leakedRows=h.querySelectorAll('[data-renewal-policy]').length;
   }finally{store._productStatus=original;}
   Orbit.modules.renovaciones.render(h);
   readyExpired=!!h.querySelector('[data-renewal-policy="'+ids.expiredRenewPolicy+'"]');
   unknownActionable=!!h.querySelector('[data-renewal-policy="'+ids.unknownRenewPolicy+'"]');
   pendingCount=Number(h.querySelector('[data-renewability-pending-count]')?.getAttribute('data-renewability-pending-count')||0);
   placeholderClient=Array.from(h.querySelectorAll('[data-renewal-policy] b')).some(x=>String(x.textContent||'').trim()==='—');
   Orbit.pais=previous;
   return{loading,leakedRows,readyExpired,unknownActionable,pendingCount,placeholderClient};
 },ids);
 need(proof.r14RenewalReadiness.loading===true&&proof.r14RenewalReadiness.leakedRows===0,'B4_003_R14_RENEWAL_LOADING_GATE_FAILED:'+JSON.stringify(proof.r14RenewalReadiness));
 need(proof.r14RenewalReadiness.readyExpired===true,'B4_003_R14_EXPIRED_RENEWAL_DROPPED');
 need(proof.r14RenewalReadiness.unknownActionable===false&&proof.r14RenewalReadiness.pendingCount>=1,'B4_003_R14_UNKNOWN_RENEWABILITY_VISIBILITY_CONTRACT_FAILED');
 need(proof.r14RenewalReadiness.placeholderClient===false,'B4_003_R14_RENEWAL_PLACEHOLDER_LEAK');
 proof.assertions.renewalFirstPaintReadiness=true;
 proof.assertions.expiredRenewalOutcomeContinuity=true;
 proof.assertions.unknownRenewabilityDebtVisibleFailClosed=true;

 proof.r14Client360Authority=await page.evaluate(ids=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';Orbit.pais='GT';Orbit.modules.cliente360.render(h);
   const root=h.querySelector('[data-c360-list-ready="1"]'),text=String(h.innerText||'');
   const out={authority:root?.getAttribute('data-c360-base-authority')||'',syntheticClientVisible:text.includes('B4-003 QA Cliente')};
   Orbit.pais=previous;return out;
 },ids);
 need(proof.r14Client360Authority.authority==='server-confirmed-store'&&proof.r14Client360Authority.syntheticClientVisible===true,'B4_003_R14_CLIENT360_AUTHORITATIVE_LIST_FAILED:'+JSON.stringify(proof.r14Client360Authority));
 proof.assertions.client360AuthoritativeList=true;

 proof.r14QualityGrammar=await page.evaluate(()=>{
   const h=document.getElementById('host'),previous=Orbit.pais||'TODOS';Orbit.pais='GT';Orbit.modules.calidad.render(h);
   const grammar=h.querySelectorAll('[data-quality-table-grammar="canonical"]').length,text=String(h.innerText||'').toLowerCase();Orbit.pais=previous;
   return{grammar,hasCompleteLabel:text.includes('expedientes completos'),hasDecimal:/\d+[.,]\d% de completitud/i.test(text)};
 });
 need(proof.r14QualityGrammar.grammar>=2&&proof.r14QualityGrammar.hasCompleteLabel===true&&proof.r14QualityGrammar.hasDecimal===true,'B4_003_R14_QUALITY_GRAMMAR_OR_COMPLETENESS_FAILED:'+JSON.stringify(proof.r14QualityGrammar));
 proof.assertions.qualityCanonicalGrammar=true;
 proof.assertions.qualityCompletenessExplicit=true;

 // R13: reconcile the real, non-synthetic renewal universe against the canonical YES-only pipeline.
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
 const visibleRenewals=[...proof.r13RenewalReality.realIds].sort();
 if(proof.realRenewalDistribution.eligibleCount>0){
   need(JSON.stringify(visibleRenewals)===JSON.stringify(expectedRenewals),'B4_003_R13_REAL_RENEWAL_PIPELINE_MISMATCH:'+JSON.stringify({expected:expectedRenewals.length,visible:visibleRenewals.length,expectedSample:expectedRenewals.slice(0,20),visibleSample:visibleRenewals.slice(0,20)}));
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

 // R13: controlled insurer Drive E2E on one disposable B4003 QA insurer only.
 await page.waitForFunction(id=>{
   const st=Orbit.store&&typeof Orbit.store._productStatus==='function'?Orbit.store._productStatus():{};
   return (st.serverConfirmedCollections||[]).includes('aseguradoras')&&!!Orbit.store.get('aseguradoras',id);
 },ids.insurer,{timeout:30000});
 const driveProbe=await page.evaluate(async()=>{
   const p=Orbit.productDriveDocumentProviderP0;
   if(!p||typeof p.probe!=='function')return{available:false,status:'provider_missing'};
   return await p.probe(true);
 });
 proof.r13InsurerDrive={probe:driveProbe};
 need(driveProbe&&driveProbe.available===true,'B4_003_R13_DRIVE_PROVIDER_NOT_AVAILABLE:'+JSON.stringify(driveProbe));
 const importerProbe=await page.evaluate(ids=>{
   const out={error:'',fileExists:false,drawerExists:false,drawerOpen:false,backOpen:false,drawerText:'',openSource:'',scriptSrcs:[]};
   try{
     out.openSource=String(Orbit.importa&&Orbit.importa.open||'').slice(0,1000);
     out.scriptSrcs=Array.from(document.scripts||[]).map(x=>String(x.src||'')).filter(x=>/importa/i.test(x));
     Orbit.importa.open('docs-aseguradora',{
       multi:false,
       modo:'documental',
       scope:{aseguradoraId:ids.insurer,aseguradoraNombre:'B4 R13 Aseguradora QA',pais:'GT',moneda:'GTQ',ramo:'Auto',producto:'QA'},
       documentIntent:'tarifa',
       docCategory:'Tarifario'
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
 const driveFileName='b4-r13-drive-'+run+'.csv';
 await page.setInputFiles('#imp-file',{name:driveFileName,mimeType:'text/csv',buffer:Buffer.from('concepto,valor\nqa_r13,'+run+'\n','utf8')});
 await page.waitForSelector('[data-insurer-source-classification="1"]',{timeout:10000});
 const importerClassifyText=await page.locator('#imp-drawer').innerText();
 need(importerClassifyText.includes('Clasificar fuente')&&importerClassifyText.includes('No se extraerán ni aplicarán tarifas automáticamente'),'B4_003_R14_INSURER_IMPORT_STEP_NOT_TRUTHFUL');
 await page.click('#imp-next2');
 await page.waitForSelector('#imp-finish',{timeout:10000});
 proof.assertions.insurerImportTruthfulClassificationStep=true;
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
   const exact=e.status===403
     && /orbit360ProductOperationalCommandPreview$/.test(e.url||'')
     && /Preview operativo solo admite fixtures sintéticos autorizados B3-004\/B4-003/.test(e.responseBody||'')
     && muts.length===1
     && muts[0]&&muts[0].action==='insert'&&muts[0].collection==='actividades'
     && /^secres_[A-Za-z0-9._:-]+$/.test(String(muts[0].id||''))
     && muts[0].payload&&muts[0].payload.tipo==='admin'
     && muts[0].payload.titulo==='Acceso a recurso seguro'
     && /^document\.upload · ok$/.test(String(muts[0].payload.detalle||''));
   if(exact)expectedIsolationDenials.push({status:e.status,url:e.url,id:muts[0].id,collection:'actividades',reason:'SECURE_RESOURCE_AUDIT_NON_SYNTHETIC_DENIED_IN_PREVIEW',persisted:null});
   else unexpectedHttpErrors.push(e);
 }
 for(const x of expectedIsolationDenials)x.persisted=(await ref('actividades',x.id).get()).exists;
 const generic403=(proof.consoleErrors||[]).filter(x=>/Failed to load resource: the server responded with a status of 403/.test(x)).length;
 const non403=(proof.consoleErrors||[]).filter(x=>!/Failed to load resource: the server responded with a status of 403/.test(x));
 const extra403=Math.max(0,generic403-expectedIsolationDenials.length);
 proof.expectedIsolationDenials=expectedIsolationDenials;
 proof.unexpectedHttpErrors=unexpectedHttpErrors;
 proof.unexpectedConsoleErrors=non403.concat(Array.from({length:extra403},()=> 'UNATTRIBUTED_CONSOLE_403'));
 proof.assertions.previewGeneralWriteIsolation=expectedIsolationDenials.length>=1
   && expectedIsolationDenials.every(x=>x.persisted===false)
   && unexpectedHttpErrors.length===0
   && proof.unexpectedConsoleErrors.length===0;
 proof.assertions.noOperationalRealRowsWritten=proof.assertions.previewGeneralWriteIsolation===true;
 need(proof.assertions.cancellationProjectionConsistent===true,'B4_003_REAL_CANCELATION_SOURCE_WITHOUT_PROJECTION');
 proof.status=proof.r13RenewalDataBlocker&&proof.r13RenewalDataBlocker.blocking===true?'PASS_EXCEPT_EXPLICIT_RENEWAL_DATA_BLOCKER':'PASS';
} finally {
 if(page)await page.close().catch(()=>{});
 if(context)await context.close().catch(()=>{});
 if(browser)await browser.close().catch(()=>{});
 await cleanup(startMs).catch(e=>proof.cleanupError=clean(e&&e.message||e));
 const checks=[];
 for(const [c,id] of [['actividades',ids.renewActivity],['actividades',ids.cancelActivity],['negocios',ids.recoveryBusiness],['cancelaciones',ids.cancelation],['recibosEsperados',ids.healthReceipt1],['recibosEsperados',ids.healthReceipt2],['polizas',ids.renewalPolicy],['polizas',ids.expiredRenewPolicy],['polizas',ids.unknownRenewPolicy],['polizas',ids.cancelPolicy],['polizas',ids.healthPolicy],['aseguradoras',ids.insurer],['clientes',ids.client]])checks.push((await ref(c,id).get()).exists);
 proof.syntheticFinalAbsent=checks.every(x=>x===false);
 proof.assertions.cleanupComplete=proof.syntheticFinalAbsent;
 fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
}
if(!['PASS','PASS_EXCEPT_EXPLICIT_RENEWAL_DATA_BLOCKER'].includes(proof.status)||proof.syntheticFinalAbsent!==true||proof.assertions.insurerDriveFileCleanup!==true)process.exitCode=1;
console.log(JSON.stringify({status:proof.status,assertions:proof.assertions,visualScope:proof.visualScope,r13PolicyPerformance:proof.r13PolicyPerformance,r13RenewalSourceDryRun:proof.r13RenewalSourceDryRun,r13RenewalDataBlocker:proof.r13RenewalDataBlocker,r13InsurerDrive:proof.r13InsurerDrive,renewalRenderStability:proof.renewalRenderStability,qaResidue:proof.qaResidue,runtimeCancellationEvidence:proof.runtimeCancellationEvidence,syntheticWrites:proof.syntheticWrites,cleanupWrites:proof.cleanupWrites,syntheticFinalAbsent:proof.syntheticFinalAbsent,pageErrors:proof.pageErrors,consoleErrors:proof.consoleErrors,httpErrors:proof.httpErrors,expectedIsolationDenials:proof.expectedIsolationDenials,unexpectedHttpErrors:proof.unexpectedHttpErrors,unexpectedConsoleErrors:proof.unexpectedConsoleErrors},null,2));
// R12 remaining B4-003 blocker proof: 2026-10-03
