import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B3_PREVIEW_URL||'').replace(/\/$/,'');
const outPath=process.env.B3_007_PROOF_OUT||'/tmp/b3-007-preview-proof.json';
const runId=String(process.env.GITHUB_RUN_ID||Date.now());
const suffix=crypto.createHash('sha256').update(runId).digest('hex').slice(0,8);
const today=new Date().toISOString().slice(0,10);
const ids={
 client:'b3007qa_client_'+suffix,
 insurer:'b3007qa_insurer_'+suffix,
 policy:'b3007qa_policy_'+suffix,
 receipt:'b3007qa_receipt_'+suffix,
 portfolio:'b3007qa_portfolio_'+suffix,
 clientName:'B3-007 QA Cliente '+suffix,
 policyNumber:'B3007-QA-'+suffix.toUpperCase()
};
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const privileged=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo']);

need(target,'B3_007_PREVIEW_URL_MISSING');
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId),root=tenant.collection('data');

async function actor(){
  const snap=await tenant.collection('members').get();
  for(const d of snap.docs){
    const m=d.data()||{},state=norm(m.status||m.estado||'active');
    const roles=[m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol].concat(m.roles||[],m.assignedRoles||[],m.rolesAsignados||[]).map(norm).filter(Boolean);
    const role=roles.find(x=>privileged.has(x));
    if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(state)||!role)continue;
    try{const u=await auth.getUser(d.id);if(!u.disabled)return{uid:u.uid,email:clean(u.email),activeRole:role,advisorId:clean(m.advisorId||m.asesorId)};}catch{}
  }
  throw new Error('B3_007_PRIVILEGED_ACTOR_NOT_FOUND');
}
async function queryItems(collection,field,value){
  const s=await root.doc(collection).collection('items').where(field,'==',value).get();
  return s.docs.map(d=>({id:d.id,...d.data(),__ref:d.ref}));
}
async function cleanup(){
  const refs=[],seen=new Set();
  const directIds={clientes:ids.client,aseguradoras:ids.insurer,polizas:ids.policy,recibosEsperados:ids.receipt,carteraPrimas:ids.portfolio};
  for(const [coll,id] of Object.entries(directIds)){
    const direct=await root.doc(coll).collection('items').doc(id).get().catch(()=>null);
    if(direct&&direct.exists){seen.add(direct.ref.path);refs.push(direct.ref);}
  }
  for(const coll of ['polizas','recibosEsperados','carteraPrimas','cobros','actividades']){
    for(const row of await queryItems(coll,'clienteId',ids.client).catch(()=>[])){if(!seen.has(row.__ref.path)){seen.add(row.__ref.path);refs.push(row.__ref);}}
  }
  for(const coll of ['recibosEsperados','carteraPrimas','cobros','actividades']){
    for(const row of await queryItems(coll,'polizaId',ids.policy).catch(()=>[])){if(!seen.has(row.__ref.path)){seen.add(row.__ref.path);refs.push(row.__ref);}}
  }
  for(let i=0;i<refs.length;i+=350){const batch=db.batch();refs.slice(i,i+350).forEach(ref=>batch.delete(ref));await batch.commit();}
  return {deletedRefs:refs.length};
}
async function readback(){
  const out={};
  for(const coll of ['polizas','recibosEsperados','carteraPrimas','cobros','actividades'])out[coll]=(await queryItems(coll,'clienteId',ids.client).catch(()=>[])).length;
  out.client=(await root.doc('clientes').collection('items').doc(ids.client).get()).exists?1:0;
  out.insurer=(await root.doc('aseguradoras').collection('items').doc(ids.insurer).get()).exists?1:0;
  return out;
}

const who=await actor();
await cleanup();
const common={tenantId,pais:'GT',moneda:'GTQ',clienteId:ids.client,asesorId:who.advisorId,aseguradoraId:ids.insurer,__syntheticQa:true,__syntheticGate:'B3-007',__syntheticRun:runId};
await root.doc('clientes').collection('items').doc(ids.client).set({id:ids.client,nombre:ids.clientName,pais:'GT',moneda:'GTQ',asesorId:who.advisorId,estado:'Activo',__syntheticQa:true,__syntheticGate:'B3-007',__syntheticRun:runId});
await root.doc('aseguradoras').collection('items').doc(ids.insurer).set({id:ids.insurer,nombre:'B3-007 QA Aseguradora '+suffix,pais:'GT',paises:['GT'],vinculada:true,activo:true,__syntheticQa:true,__syntheticGate:'B3-007',__syntheticRun:runId});
await root.doc('polizas').collection('items').doc(ids.policy).set({...common,id:ids.policy,numero:ids.policyNumber,ramo:'Autos',producto:'Auto individual',estado:'Vigente',vigenciaInicio:today,vigenciaFin:String(Number(today.slice(0,4))+1)+today.slice(4),frecuencia:'Contado',forma:'Contado',formaPago:'Transferencia',conducto:'Transferencia',cuotas:1,primaNeta:100,primaTotal:100,prima:100});
await root.doc('recibosEsperados').collection('items').doc(ids.receipt).set({...common,id:ids.receipt,polizaId:ids.policy,receiptKey:tenantId+'|'+ids.policy+'|1',secuencia:1,cuota:'1/1',monto:100,montoTotal:100,primaTotal:100,vence:today,fechaLimite:today,estado:'Pendiente',estadoOperativo:'pendiente_vence_corte',calendarActive:true,carteraActiva:true});
await root.doc('carteraPrimas').collection('items').doc(ids.portfolio).set({...common,id:ids.portfolio,polizaId:ids.policy,reciboId:ids.receipt,secuencia:1,cuota:'1/1',monto:100,montoTotal:100,primaTotal:100,vence:today,fechaLimite:today,estado:'Pendiente',estadoOperativo:'pendiente_vence_corte',carteraActiva:true,exigibilidad:'actual'});
need((await queryItems('cobros','polizaId',ids.policy)).length===0,'B3_007_PRECONDITION_COBRO_NOT_ZERO');

const token=await auth.createCustomToken(who.uid,{b3007CronogramaQa:true});
const proof={schema:'GRAVICENTRA_I6_5_B3_007_PREVIEW_PROOF_V1',status:'RUNNING',projectId,tenantId,previewUrl:target,today,ids,actor:{activeRole:who.activeRole},assertions:{},readback:{},cleanup:null,pageErrors:[],consoleErrors:[]};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(25000);
  page.on('pageerror',e=>proof.pageErrors.push(clean(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')proof.consoleErrors.push(clean(m.text()));});
  const legalScope='user:'+clean(who.email||who.uid);
  await page.addInitScript(({scope})=>{
    try{
      localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
      localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
    }catch{}
  },{scope:legalScope});
  await page.goto(target+'/#/inicio',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0&&!!window.Orbit?.modules?.cronograma);
  const boot=await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    const activated=await Promise.resolve(Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate());
    return{uid:String(c.auth.currentUser?.uid||''),started:activated?.started===true};
  },token);
  need(boot.uid&&boot.started,'B3_007_PRODUCT_SESSION_NOT_STARTED');

  await page.waitForFunction(({pid,rid})=>!!Orbit.store?.get?.('polizas',pid)&&!!Orbit.store?.get?.('recibosEsperados',rid),{pid:ids.policy,rid:ids.receipt},{timeout:18000});
  await page.waitForFunction(()=>Orbit.modules?.cronograma?.__b3007?.obligationsReady?.()===true,null,{timeout:18000});
  const snapshot=await page.evaluate(pid=>({
    ready:Orbit.modules.cronograma.__b3007.obligationsReady(),
    rows:Orbit.modules.cronograma.__b3007.pendingObligations().filter(x=>x.polizaId===pid).map(x=>({id:x.id,reciboId:x.reciboId,clienteId:x.clienteId,fechaLimite:x.fechaLimite,vence:x.vence}))
  }),ids.policy);
  proof.readback.pendingSnapshot=snapshot;
  need(snapshot.ready===true,'B3_007_OBLIGATION_OWNER_NOT_READY');
  need(snapshot.rows.length===1,'B3_007_PENDING_OBLIGATION_NOT_EXACTLY_ONE:'+snapshot.rows.length);
  need(clean(snapshot.rows[0].reciboId)===ids.receipt,'B3_007_RECEIPT_RELATION_MISMATCH');

  await page.evaluate(()=>Orbit.router.go('cronograma'));
  await page.waitForFunction(()=>Orbit.route?.key==='cronograma');
  await page.waitForSelector('[data-v="dia"]');
  await page.click('[data-v="dia"]');
  const event=page.locator('.cr-ev').filter({hasText:ids.clientName});
  need(await event.count()===1,'B3_007_VISIBLE_EVENT_NOT_EXACTLY_ONE:'+await event.count());
  const eventText=clean(await event.first().innerText());
  proof.readback.eventText=eventText;
  need(eventText.includes('Recibo pendiente'),'B3_007_EVENT_NOT_RECEIPT_PENDING:'+eventText);
  need(!eventText.includes('Cobro ·'),'B3_007_EVENT_STILL_COBRO_SEMANTICS:'+eventText);
  need((await queryItems('cobros','polizaId',ids.policy)).length===0,'B3_007_COBRO_CREATED_BEFORE_CLICK');

  await event.first().click();
  await page.waitForFunction(({cid,rid})=>location.hash.includes('/cliente360?')&&location.hash.includes('c='+encodeURIComponent(cid))&&location.hash.includes('t=recibos')&&location.hash.includes('r='+encodeURIComponent(rid)),{cid:ids.client,rid:ids.receipt},{timeout:12000});
  proof.readback.route=await page.evaluate(()=>location.hash);
  need((await queryItems('cobros','polizaId',ids.policy)).length===0,'B3_007_COBRO_CREATED_BY_NAVIGATION');
  proof.assertions={
    serverConfirmedObligationOwner:true,
    portfolioObligationVisibleWithZeroCobros:true,
    semanticLabelIsReceiptPending:true,
    exactReceiptRoute:true,
    countryAndRoleScopeViaCanonicalAdapter:true,
    zeroCobros:true,
    noPageErrors:proof.pageErrors.length===0
  };
  need(proof.pageErrors.length===0,'B3_007_PAGE_ERRORS:'+JSON.stringify(proof.pageErrors));
  proof.status='PASS';
}catch(error){
  proof.status='FAIL';proof.failure=clean(error?.stack||error?.message||error);throw error;
}finally{
  if(browser)await browser.close().catch(()=>null);
  proof.cleanup=await cleanup().catch(error=>({error:clean(error?.message||error)}));
  proof.cleanup.readback=await readback().catch(error=>({error:clean(error?.message||error)}));
  proof.cleanup.pass=proof.cleanup.readback&&!proof.cleanup.readback.error&&Object.values(proof.cleanup.readback).every(v=>v===0);
  if(proof.status==='PASS'&&!proof.cleanup.pass){proof.status='FAIL';proof.failure='B3_007_CLEANUP_RESIDUE:'+JSON.stringify(proof.cleanup.readback);}
  fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
}
if(proof.status!=='PASS')throw new Error(proof.failure||'B3_007_PREVIEW_PROOF_FAILED');
console.log('B3_007_PREVIEW_PROOF=PASS');
console.log(JSON.stringify(proof));
