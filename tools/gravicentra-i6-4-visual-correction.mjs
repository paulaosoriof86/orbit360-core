import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { chromium } from 'playwright';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const PROD='https://ays-orbit-360-lab.web.app';
const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const SOURCE='artifacts/orbit360-recovery/release-control/I6_4_POLIZAS_RIESGOS_SOURCE_INTAKE_20260918.json';
const LOCK='artifacts/orbit360-recovery/release-control/I6_4_VISUAL_CORRECTION_LOCK_20260918.json';
const OUT=process.env.I64_CORRECTION_EVIDENCE_FILE||path.join(process.env.RUNNER_TEMP||process.cwd(),'i64-visual-correction.json');
const MAYRA='pol_6fc005003a2ba6d52bdba67188ed';
const ADRIANA='pol_dda1a827b1c4443567870abeee8e';
const EXPECTED={polizas:1414,vehiculos:1063,clientes:442,canonical:439,renovaciones:0,domPolicies:319,formaDom:170,conductoDom:319,writes:320,countryCorrections:2};
const clean=(v,m=1000)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,200).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:Buffer.from(String(v??''),'utf8')).digest('hex');
const stable=v=>{if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(typeof v.toDate==='function'){try{return{$timestamp:v.toDate().toISOString()};}catch{}}if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;};
const digest=v=>sha(JSON.stringify(stable(v)));
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const dataCol=(db,n)=>db.collection('tenants').doc(TENANT).collection('data').doc(n).collection('items');
const dataRef=(db,n,id)=>dataCol(db,n).doc(id);
const colDigest=snap=>sha(snap.docs.map(d=>d.id+'|'+digest(d.data()||{})).sort().join('\n'));
const noSecretKeys=(v)=>{const secret=/^(?:password|pass|pwd|contrasena|contraseña|clave|secret|token|accessToken|refreshToken|privateKey|clientSecret|credentialValue|credential_value)$/i;const walk=x=>{if(!x||typeof x!=='object')return true;for(const [k,y] of Object.entries(x)){if(secret.test(k)&&y!==null&&y!==undefined&&clean(y))return false;if(y&&typeof y==='object'&&!walk(y))return false;}return true;};return walk(v);};
const chunks=(a,n)=>{const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o;};

function serviceAccount(){
  for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){
    try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}
  }
  throw new Error('I64_CORRECTION_SERVICE_ACCOUNT');
}
function rolesOf(m){return [...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.rolesDisponibles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[]).map(v=>clean(v)).filter(Boolean))];}
async function selectManager(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get();
  const pref=['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo'];
  for(const p of pref){for(const d of snap.docs){const m=d.data()||{},uid=clean(m.uid||d.id,180),rs=rolesOf(m),role=rs.find(r=>norm(r)===p),state=norm(m.status||m.estado||'active');if(!uid||!role||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state))continue;try{const u=await auth.getUser(uid);if(!u.disabled&&u.emailVerified===true)return{uid,role};}catch{}}}
  throw new Error('I64_CORRECTION_NO_MANAGER');
}
async function activate(page,auth,actor){
  const token=await auth.createCustomToken(actor.uid,{gravicentraI64VisualCorrection:true});
  await page.goto(PROD,{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:12000});
  const s=await page.evaluate(async tok=>{const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,tok);return Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate();},token);
  need(s?.started===true,'I64_CORRECTION_APP_NOT_STARTED');
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:15000});
  const gate=page.locator('[data-legal-gate].open');
  if(await gate.count()){const chk=gate.locator('#lg-chk'),ok=gate.locator('#lg-ok');if(await chk.count())await chk.check();if(await ok.count())await ok.click();await gate.waitFor({state:'detached',timeout:5000}).catch(()=>{});}
  const sess=await page.evaluate(()=>({active:Orbit.session?.rol?.()||'',assigned:Orbit.session?.allowedRoles?.()||[]}));
  if(sess.active!==actor.role){need(sess.assigned.includes(actor.role),'I64_CORRECTION_ROLE_NOT_ASSIGNED');need(await page.evaluate(r=>Orbit.session.set(r),actor.role),'I64_CORRECTION_ROLE_SWITCH');await page.waitForFunction(r=>Orbit.session?.rol?.()===r,actor.role,{timeout:6000});}
}
function policyCountryMismatches(policyDocs,insurers){
  const out=[];
  for(const d of policyDocs){
    const p=d.data()||{},ins=insurers.get(clean(p.aseguradoraId,256)),ic=clean(ins?.pais,20).toUpperCase(),pc=clean(p.pais,20).toUpperCase(),cur=clean(p.moneda,20).toUpperCase();
    if(['GT','CO'].includes(ic)&&['GT','CO'].includes(pc)&&ic!==pc)out.push({id:d.id,insurerCountry:ic,policyCountry:pc,currency:cur});
    if(pc==='GT'&&cur&&!['GTQ','USD'].includes(cur))out.push({id:d.id,reason:'GT_CURRENCY_MISMATCH',policyCountry:pc,currency:cur});
    if(pc==='CO'&&cur&&!['COP','USD'].includes(cur))out.push({id:d.id,reason:'CO_CURRENCY_MISMATCH',policyCountry:pc,currency:cur});
  }
  return out;
}
async function relationAudit(db){
  const [cs,ps,vs]=await Promise.all([dataCol(db,'clientes').get(),dataCol(db,'polizas').get(),dataCol(db,'vehiculos').get()]);
  const clients=new Map(cs.docs.map(d=>[d.id,d.data()||{}])),policies=new Map(ps.docs.map(d=>[d.id,d.data()||{}]));
  let policyClientMissing=0,policyClientTombstone=0,vehiclePolicyMissing=0,vehicleClientMissing=0,vehicleClientTombstone=0;
  for(const d of ps.docs){const p=d.data()||{},cid=clean(p.clienteId,256);if(cid){const c=clients.get(cid);if(!c)policyClientMissing++;else if(c.fusionado===true||clean(c.mergedIntoClientId,256))policyClientTombstone++;}}
  for(const d of vs.docs){const v=d.data()||{},pid=clean(v.polizaId,256),cid=clean(v.clienteId,256);if(pid&&!policies.has(pid))vehiclePolicyMissing++;if(cid){const c=clients.get(cid);if(!c)vehicleClientMissing++;else if(c.fusionado===true||clean(c.mergedIntoClientId,256))vehicleClientTombstone++;}}
  const canonicalClients=cs.docs.filter(d=>{const x=d.data()||{};return x.fusionado!==true&&!clean(x.mergedIntoClientId,256);}).length;
  return{policyClientMissing,policyClientTombstone,vehiclePolicyMissing,vehicleClientMissing,vehicleClientTombstone,canonicalClients};
}

const C=JSON.parse(fs.readFileSync(CONTROL,'utf8')),S=JSON.parse(fs.readFileSync(SOURCE,'utf8')),L=JSON.parse(fs.readFileSync(LOCK,'utf8'));
need(C.gateState?.gates?.I6?.activeSubgate==='I6.4'&&C.gateState?.gates?.I6?.status==='I6_4_DATA_UPDATE_V5_ACTIVE','I64_CORRECTION_GATE');
need(C.i64VisualCorrection?.status==='AUTHORIZED_PENDING_APPLY'&&C.i64VisualCorrection?.userAuthorized===true,'I64_CORRECTION_CONTROL_AUTH');
need(C.i6Execution?.dataMutationAuthorized===true&&C.gateState?.gates?.I6?.dataMutationAuthorized===true,'I64_CORRECTION_DATA_AUTH');
need(S.execution?.cursorState==='POST_WRITE_READBACK_INTEGRITY_PASS'&&S.execution?.writeApplied===true&&S.execution?.postWriteReadbackPassed===true,'I64_CORRECTION_CURSOR');
need(L.status==='AUTHORIZED_PENDING_APPLY'&&L.userAuthorized===true&&L.applyContract?.expectedUniquePolicyWrites===320&&L.applyContract?.writePath==='orbit360ProductOperationalCommand','I64_CORRECTION_LOCK');
need(L.applyContract?.receiptsWritesAuthorized===false&&L.applyContract?.carteraWritesAuthorized===false&&L.applyContract?.cobrosWritesAuthorized===false&&L.applyContract?.commissionWritesAuthorized===false,'I64_CORRECTION_BOUNDARY');

const evidence={schema:'GRAVICENTRA_I6_4_VISUAL_CORRECTION_EVIDENCE_V1',status:'FAIL',writes:0,batchesCommitted:0,countsBefore:{},countsAfter:{},fieldChanges:{},countryCurrency:{},nonPolicyCollectionsUnchanged:false,relations:{},functional:{},rollback:{executed:false},containsPII:false,containsSecrets:false,errors:[]};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
const sa=serviceAccount(),app=initializeApp({credential:cert(sa),projectId:PROJECT},'i64-visual-correction'),db=getFirestore(app),auth=getAuth(app);
let browser=null,committed=false,beforeTargets=new Map();
try{
  const [clientsB,polB,vehB,renB,recB,cartB,cobB,comB,insB]=await Promise.all([
    dataCol(db,'clientes').get(),dataCol(db,'polizas').get(),dataCol(db,'vehiculos').get(),dataCol(db,'renovaciones').get(),
    dataCol(db,'recibosEsperados').get(),dataCol(db,'carteraPrimas').get(),dataCol(db,'cobros').get(),dataCol(db,'comisiones').get(),dataCol(db,'aseguradoras').get()
  ]);
  const canonical=clientsB.docs.filter(d=>{const x=d.data()||{};return x.fusionado!==true&&!clean(x.mergedIntoClientId,256);}).length;
  need(polB.size===EXPECTED.polizas&&vehB.size===EXPECTED.vehiculos&&clientsB.size===EXPECTED.clientes&&canonical===EXPECTED.canonical&&renB.size===EXPECTED.renovaciones,'I64_CORRECTION_BASE_COUNTS');
  const protectedBefore={clientes:colDigest(clientsB),vehiculos:colDigest(vehB),renovaciones:colDigest(renB),recibosEsperados:colDigest(recB),carteraPrimas:colDigest(cartB),cobros:colDigest(cobB),comisiones:colDigest(comB)};
  const insurers=new Map(insB.docs.map(d=>[d.id,d.data()||{}]));
  const policies=new Map(polB.docs.map(d=>[d.id,d.data()||{}]));
  const dom=[];
  let formaDom=0,conductoDom=0;
  for(const d of polB.docs){
    const p=d.data()||{},f=norm(p.formaPago),c=norm(p.conductoPago);
    if(f==='domiciliado')formaDom++;
    if(c==='domiciliado')conductoDom++;
    if(f==='domiciliado'||c==='domiciliado')dom.push(d.id);
  }
  need(dom.length===EXPECTED.domPolicies&&formaDom===EXPECTED.formaDom&&conductoDom===EXPECTED.conductoDom,'I64_CORRECTION_DOM_BASELINE');
  const mismatches=policyCountryMismatches(polB.docs,insurers);
  need(mismatches.length===2&&new Set(mismatches.map(x=>x.id)).size===2&&mismatches.some(x=>x.id===MAYRA)&&mismatches.some(x=>x.id===ADRIANA),'I64_CORRECTION_COUNTRY_BASELINE');
  const mayra=policies.get(MAYRA)||{},adriana=policies.get(ADRIANA)||{};
  need(clean(mayra.aseguradoraId,256)==='gt-seguros-ficohsa'&&clean(mayra.clienteId,256)==='cli_siga_3c96785d46080aa47e'&&clean(mayra.pais,20)==='CO'&&clean(mayra.moneda,20)==='COP','I64_CORRECTION_MAYRA_BASELINE');
  need(clean(adriana.aseguradoraId,256)==='co-axa-colpatria'&&clean(adriana.clienteId,256)==='cli_siga_5e987d972fbd309c7217'&&clean(adriana.pais,20)==='GT'&&clean(adriana.moneda,20)==='GTQ','I64_CORRECTION_ADRIANA_BASELINE');

  const patches=new Map();
  const patch=(id,k,v)=>{if(!patches.has(id))patches.set(id,{});patches.get(id)[k]=v;};
  for(const id of dom){
    const p=policies.get(id)||{};
    if(norm(p.formaPago)==='domiciliado')patch(id,'formaPago','Transferencia');
    if(norm(p.conductoPago)==='domiciliado')patch(id,'conductoPago','Transferencia');
  }
  patch(MAYRA,'pais','GT'); patch(MAYRA,'moneda','GTQ');
  patch(ADRIANA,'pais','CO'); patch(ADRIANA,'moneda','COP');
  need(patches.size===EXPECTED.writes,'I64_CORRECTION_TARGET_COUNT');
  const fieldCounts={};
  for(const [id,p] of patches){const before=policies.get(id);need(before,'I64_CORRECTION_TARGET_MISSING');beforeTargets.set(id,before);for(const k of Object.keys(p))fieldCounts[k]=(fieldCounts[k]||0)+1;}
  need(fieldCounts.formaPago===170&&fieldCounts.conductoPago===319&&fieldCounts.pais===2&&fieldCounts.moneda===2,'I64_CORRECTION_FIELD_COUNTS');
  const mutations=[...patches].map(([id,payload])=>({collection:'polizas',action:'update',id,payload}));
  need(mutations.every(m=>noSecretKeys(m.payload)),'I64_CORRECTION_SECRET_SCOPE');

  const unrelatedBefore=new Map(polB.docs.filter(d=>!patches.has(d.id)).map(d=>[d.id,digest(d.data()||{})]));
  const actor=await selectManager(db,auth);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  const pageErrors=[],http404=[];
  page.on('pageerror',e=>pageErrors.push(clean(e?.message||e)));
  page.on('response',r=>{if(r.status()===404&&r.url().startsWith(PROD))http404.push(new URL(r.url()).pathname);});
  await activate(page,auth,actor);

  const batches=chunks(mutations,80); need(batches.length===4,'I64_CORRECTION_BATCH_COUNT');
  for(let i=0;i<batches.length;i++){
    const batch=batches[i];
    const requestId='i64corr_'+clean(process.env.GITHUB_RUN_ID||'run',24)+'_'+String(i+1)+'_'+sha(JSON.stringify(batch.map(x=>x.id))).slice(0,10);
    const res=await page.evaluate(async input=>{const p=Orbit.productRuntimeBrowserProvidersP0;const r=await p.callFunction('orbit360ProductOperationalCommand',input,'us-central1');return r&&r.data?r.data:r;},{tenantId:TENANT,activeRole:actor.role,requestId,mutations:batch});
    need(res?.ok===true&&res?.serverOwned===true&&Number(res?.mutationCount)===batch.length,'I64_CORRECTION_BATCH_REJECTED_'+String(i+1));
    committed=true;evidence.batchesCommitted=i+1;evidence.writes+=batch.length;
  }
  need(evidence.writes===EXPECTED.writes,'I64_CORRECTION_WRITE_COUNT');

  const [clientsA,polA,vehA,renA,recA,cartA,cobA,comA,insA]=await Promise.all([
    dataCol(db,'clientes').get(),dataCol(db,'polizas').get(),dataCol(db,'vehiculos').get(),dataCol(db,'renovaciones').get(),
    dataCol(db,'recibosEsperados').get(),dataCol(db,'carteraPrimas').get(),dataCol(db,'cobros').get(),dataCol(db,'comisiones').get(),dataCol(db,'aseguradoras').get()
  ]);
  const canonicalA=clientsA.docs.filter(d=>{const x=d.data()||{};return x.fusionado!==true&&!clean(x.mergedIntoClientId,256);}).length;
  need(polA.size===EXPECTED.polizas&&vehA.size===EXPECTED.vehiculos&&clientsA.size===EXPECTED.clientes&&canonicalA===EXPECTED.canonical&&renA.size===0,'I64_CORRECTION_POST_COUNTS');
  const protectedAfter={clientes:colDigest(clientsA),vehiculos:colDigest(vehA),renovaciones:colDigest(renA),recibosEsperados:colDigest(recA),carteraPrimas:colDigest(cartA),cobros:colDigest(cobA),comisiones:colDigest(comA)};
  need(Object.keys(protectedBefore).every(k=>protectedBefore[k]===protectedAfter[k]),'I64_CORRECTION_PROTECTED_COLLECTION_CHANGED');
  const postMap=new Map(polA.docs.map(d=>[d.id,d.data()||{}]));
  for(const [id,p] of patches){const a=postMap.get(id)||{};for(const [k,v] of Object.entries(p))need(JSON.stringify(stable(a[k]))===JSON.stringify(stable(v)),'I64_CORRECTION_PAYLOAD_MISMATCH:'+k);}
  for(const [id,h] of unrelatedBefore){need(digest(postMap.get(id)||{})===h,'I64_CORRECTION_UNRELATED_POLICY_CHANGED');}
  const domAfter=polA.docs.filter(d=>norm((d.data()||{}).formaPago)==='domiciliado'||norm((d.data()||{}).conductoPago)==='domiciliado');
  need(domAfter.length===0,'I64_CORRECTION_DOM_REMAINS');
  const insurersA=new Map(insA.docs.map(d=>[d.id,d.data()||{}]));
  const mismatchAfter=policyCountryMismatches(polA.docs,insurersA);
  need(mismatchAfter.length===0,'I64_CORRECTION_COUNTRY_MISMATCH_REMAINS');
  const mA=postMap.get(MAYRA)||{},aA=postMap.get(ADRIANA)||{};
  need(mA.pais==='GT'&&mA.moneda==='GTQ','I64_CORRECTION_MAYRA_FAIL');
  need(aA.pais==='CO'&&aA.moneda==='COP','I64_CORRECTION_ADRIANA_FAIL');
  const rel=await relationAudit(db);
  need(rel.policyClientMissing===0&&rel.policyClientTombstone===0&&rel.vehiclePolicyMissing===0&&rel.vehicleClientMissing===0&&rel.vehicleClientTombstone===0&&rel.canonicalClients===439,'I64_CORRECTION_RELATION_FAIL');

  await page.reload({waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:12000});
  await page.evaluate(async()=>Orbit.productAppP0.status?.().started===true?Orbit.productAppP0.status():await Orbit.productAppP0.activate());
  await page.waitForFunction(()=>Orbit?.productAppP0?.status?.().started===true&&!document.body.classList.contains('pre-auth'),null,{timeout:15000});
  await page.evaluate(()=>{location.hash='#/polizas';});
  await page.waitForFunction(()=>Orbit?.route?.key==='polizas',null,{timeout:15000});
  await page.waitForFunction(({mayra,adriana})=>{
    const ps=Orbit.store?.all?.('polizas')||[],m=Orbit.store?.get?.('polizas',mayra),a=Orbit.store?.get?.('polizas',adriana);
    return ps.length===1414&&m?.pais==='GT'&&m?.moneda==='GTQ'&&a?.pais==='CO'&&a?.moneda==='COP'&&!ps.some(p=>String(p.formaPago||'').trim().toLowerCase()==='domiciliado'||String(p.conductoPago||'').trim().toLowerCase()==='domiciliado');
  },{mayra:MAYRA,adriana:ADRIANA},{timeout:30000});
  need(pageErrors.length===0,'I64_CORRECTION_PAGE_ERRORS');need(http404.length===0,'I64_CORRECTION_HTTP404');

  evidence.status='PASS';
  evidence.countsBefore={polizas:polB.size,vehiculos:vehB.size,clientesPhysical:clientsB.size,clientesCanonical:canonical,renovaciones:renB.size};
  evidence.countsAfter={polizas:polA.size,vehiculos:vehA.size,clientesPhysical:clientsA.size,clientesCanonical:canonicalA,renovaciones:renA.size};
  evidence.fieldChanges=fieldCounts;
  evidence.countryCurrency={beforeMismatches:2,afterMismatches:0,corrections:2,explicitUsdPreserved:true};
  evidence.domiciliado={policiesBefore:dom.length,formaPagoBefore:formaDom,conductoPagoBefore:conductoDom,policiesAfter:0,canonicalReplacement:'Transferencia'};
  evidence.nonPolicyCollectionsUnchanged=true;
  evidence.relations=rel;
  evidence.functional={status:'PASS',polizasRouteLoads:true,runtimePolicyCount:1414,mayraGTQ:true,adrianaCOP:true,noDomiciliado:true,pageErrors:0,http404:0,actorRole:actor.role};
}catch(error){
  evidence.errors.push(clean(error?.message||error,300));
  if(committed){
    evidence.rollback.executed=true;
    try{
      let batch=db.batch(),ops=0;
      const flush=async()=>{if(ops){await batch.commit();batch=db.batch();ops=0;}};
      for(const [id,before] of beforeTargets){batch.set(dataRef(db,'polizas',id),before,{merge:false});ops++;if(ops>=400)await flush();}
      await flush();
      const pol=await dataCol(db,'polizas').get();
      const ok=pol.size===EXPECTED.polizas&&[...beforeTargets].every(([id,b])=>digest((pol.docs.find(d=>d.id===id)?.data())||{})===digest(b));
      evidence.rollback.status=ok?'PASS':'FAIL';
    }catch(rb){evidence.rollback.status='FAIL';evidence.errors.push('ROLLBACK:'+clean(rb?.message||rb,240));}
  }
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log('I64_VISUAL_CORRECTION_STATUS='+evidence.status);
  console.log('I64_VISUAL_CORRECTION_WRITES='+evidence.writes);
  console.log('I64_VISUAL_CORRECTION_DOM_AFTER='+(evidence.domiciliado?.policiesAfter??'NA'));
  console.log('I64_VISUAL_CORRECTION_COUNTRY_MISMATCH_AFTER='+(evidence.countryCurrency?.afterMismatches??'NA'));
  console.log('I64_VISUAL_CORRECTION_ROLLBACK='+(evidence.rollback.executed?(evidence.rollback.status||'UNKNOWN'):'NOT_NEEDED'));
}
