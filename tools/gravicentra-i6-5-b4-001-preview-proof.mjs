import fs from 'node:fs';
import { chromium } from 'playwright';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B4_PREVIEW_URL||'').replace(/\/$/,'');
const outPath=process.env.B4_001_PROOF_OUT||'/tmp/b4-001-preview-proof.json';
const run=String(process.env.GITHUB_RUN_ID||Date.now());
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
need(target,'B4_001_PREVIEW_URL_MISSING');

const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);
const ids=['ops','cliente360','portal'].map(x=>'b4001_'+run+'_'+x);
const proof={schema:'GRAVICENTRA_I6_5_B4_001_PREVIEW_PROOF_V1',status:'INIT',target,ids,assertions:{},pageErrors:[],consoleErrors:[],syntheticWrites:0,cleanupWrites:0};

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
    try{const u=await auth.getUser(d.id);if(!u.disabled)candidates.push({uid:u.uid,email:clean(u.email),activeRole:role});}catch{}
  }
  need(candidates.length,'B4_001_PRIVILEGED_ACTOR_NOT_FOUND');
  return candidates.sort((a,b)=>order.indexOf(a.activeRole)-order.indexOf(b.activeRole))[0];
}
async function applyLegal(page,who){
  const scope='user:'+clean(who.email||who.uid);
  await page.addInitScript(({scope})=>{try{
    localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
    localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
  }catch{}},{scope});
}
async function boot(page,token){
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0);
  const x=await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    const s=Orbit.productAppP0.status?.();
    const activated=await Promise.resolve(s?.started?s:Orbit.productAppP0.activate());
    return{uid:String(c.auth.currentUser?.uid||''),started:activated?.started===true};
  },token);
  need(x.uid&&x.started,'B4_001_PRODUCT_SESSION_NOT_STARTED');
  await page.waitForFunction(()=>!!window.Orbit?.store?.insertDurable&&!!window.Orbit?.ciclo?.crearGestionDurable);
}
async function cleanup(){
  for(const id of ids){
    const ref=tenant.collection('data').doc('gestiones').collection('items').doc(id);
    const s=await ref.get();if(s.exists){await ref.delete();proof.cleanupWrites++;}
  }
  const ev=await tenant.collection('workflowEvents').where('entityId','in',ids).get();
  for(const d of ev.docs){
    const x=d.data()||{};
    await d.ref.delete();proof.cleanupWrites++;
    const out=tenant.collection('notificationOutbox').doc(d.id);if((await out.get()).exists){await out.delete();proof.cleanupWrites++;}
    if(x.requestId){const req=tenant.collection('workflowRequests').doc(String(x.requestId));if((await req.get()).exists){await req.delete();proof.cleanupWrites++;}}
  }
}
let browser,context,page;
try{
  await cleanup();
  const who=await actor(),token=await auth.createCustomToken(who.uid);
  proof.actor={uid:who.uid,activeRole:who.activeRole};
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  context=await browser.newContext({ignoreHTTPSErrors:false});
  page=await context.newPage();
  page.on('pageerror',e=>proof.pageErrors.push(clean(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')proof.consoleErrors.push(clean(m.text()));});
  await applyLegal(page,who);
  await page.goto(target+'/#/ops',{waitUntil:'domcontentloaded',timeout:60000});
  await boot(page,token);
  await page.evaluate(()=>{try{Orbit.store._ensureCollections?.(['asesores','gestiones','clientes','polizas']);}catch{}});
  await page.waitForFunction(()=>Array.isArray(Orbit.store.all('asesores'))&&Orbit.store.all('asesores').some(x=>x&&x.id),null,{timeout:20000});
  const runtime=await page.evaluate(()=>({
    status:Orbit.store._operationalWriteStatus?.()||{},
    advisor:(Orbit.store.all('asesores')||[]).find(x=>x&&x.id&&!x.inactivo)?.id||''
  }));
  need(runtime.advisor,'B4_001_ADVISOR_NOT_FOUND');
  need(runtime.status?.writeTransport==='firebase-functions'&&runtime.status?.browserFirestoreWriteAuthorized===false&&runtime.status?.workflowSemanticOwner===true,'B4_001_OPERATIONAL_WRITE_AUTHORITY_INVALID');
  proof.assertions.serverOwnedWriteFacade=true;

  const origins=[
    {id:ids[0],origin:'Ops',title:'QA B4-001 Ops'},
    {id:ids[1],origin:'Ficha cliente',title:'QA B4-001 Cliente360'},
    {id:ids[2],origin:'Portal del cliente',title:'QA B4-001 Portal'}
  ];
  for(const row of origins){
    await page.evaluate(async ({row,advisor})=>{
      await Orbit.ciclo.crearGestionDurable({
        id:row.id,lista:'Gestiones Admin',tipo:'QA B4-001',titulo:row.title,
        clienteId:'b4001_synthetic_client',asesorId:advisor,prioridad:'Baja',
        estado:'Pendiente',vence:'2099-12-31',nota:'Fixture sintético B4-001',origen:row.origin,
        checklist:[{t:'Creación canónica confirmada',done:true}]
      });
      const got=Orbit.store.get('gestiones',row.id);
      if(!got||got.id!==row.id)throw new Error('B4_001_BROWSER_READBACK_MISSING:'+row.id);
    },{row,advisor:runtime.advisor});
    proof.syntheticWrites++;
  }

  await page.waitForFunction(ids=>ids.every(id=>(Orbit.store.all('gestiones')||[]).filter(x=>x&&x.id===id).length===1),ids,{timeout:15000});
  const browserReadback=await page.evaluate(ids=>({
    rows:ids.map(id=>Orbit.store.get('gestiones',id)),
    counts:ids.map(id=>(Orbit.store.all('gestiones')||[]).filter(x=>x&&x.id===id).length),
    opsProjection:ids.map(id=>(Orbit.ciclo.gestiones()||[]).filter(x=>x&&x.id===id).length)
  }),ids);
  need(browserReadback.counts.every(x=>x===1),'B4_001_BROWSER_DUPLICATE');
  need(browserReadback.opsProjection.every(x=>x===1),'B4_001_OPS_PROJECTION_MISMATCH');
  proof.browserReadback=browserReadback;
  proof.assertions.singleCanonicalBrowserRecord=true;
  proof.assertions.opsProjectionConverges=true;

  const docs=[];
  for(const id of ids){const s=await tenant.collection('data').doc('gestiones').collection('items').doc(id).get();need(s.exists,'B4_001_SERVER_READBACK_MISSING:'+id);docs.push({id,...s.data()});}
  need(docs.every(x=>x.previewWrite===true&&x.previewSource==='hosting-preview-uat'),'B4_001_PREVIEW_WRITE_MARKER_MISSING');
  need(docs[0].origen==='Ops'&&docs[1].origen==='Ficha cliente'&&docs[2].origen==='Portal del cliente','B4_001_ORIGIN_NOT_PRESERVED');
  proof.serverReadback=docs.map(x=>({id:x.id,origen:x.origen,asesorId:x.asesorId,previewWrite:x.previewWrite,previewSource:x.previewSource}));
  proof.assertions.serverCanonicalReadback=true;
  proof.assertions.originsPreserved=true;

  const ev=await tenant.collection('workflowEvents').where('entityId','in',ids).get();
  const events=ev.docs.map(d=>({id:d.id,...d.data()}));
  need(events.filter(x=>ids.includes(x.entityId)).length===3,'B4_001_EVENT_CARDINALITY');
  const byId=Object.fromEntries(events.map(x=>[x.entityId,x]));
  need(norm(byId[ids[0]]?.operation)==='create_management','B4_001_OPS_OPERATION_WRONG');
  need(norm(byId[ids[1]]?.operation)==='create_management','B4_001_CLIENT360_OPERATION_WRONG');
  need(norm(byId[ids[2]]?.operation)==='portal_request','B4_001_PORTAL_OPERATION_WRONG');
  proof.events=ids.map(id=>({entityId:id,operation:byId[id]?.operation,eventId:byId[id]?.id}));
  proof.assertions.portalExplicitOperation=true;
  proof.assertions.eventCardinality=true;

  await page.evaluate(async id=>{
    let rejected=false;
    try{
      const row=Orbit.store.get('gestiones',id);
      await Orbit.store.insertDurable('gestiones',row);
    }catch(e){rejected=true;}
    if(!rejected)throw new Error('B4_001_DUPLICATE_CREATE_NOT_REJECTED');
  },ids[2]);
  const dup=await tenant.collection('data').doc('gestiones').collection('items').doc(ids[2]).get();
  need(dup.exists,'B4_001_DUPLICATE_TEST_REMOVED_RECORD');
  proof.assertions.duplicateCreateFailClosed=true;

  proof.status='PASS';
}catch(e){
  proof.status='FAIL';proof.error=clean(e?.stack||e);throw e;
}finally{
  try{await cleanup();}catch(e){proof.cleanupError=clean(e?.stack||e);if(proof.status==='PASS')proof.status='FAIL';}
  try{if(browser)await browser.close();}catch{}
  fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
}
