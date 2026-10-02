import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const target=String(process.env.B3_PREVIEW_URL||'').replace(/\/$/,'');
const outPath=process.env.B3_006_PROOF_OUT||'/tmp/b3-006-preview-proof.json';
const runId=String(process.env.GITHUB_RUN_ID||Date.now());
const suffix=crypto.createHash('sha256').update(runId).digest('hex').slice(0,8);
const ids={
  client:'b3006qa_client_'+suffix,
  insurer:'b3006qa_insurer_'+suffix,
  policyNumber:'B3006-QA-'+suffix.toUpperCase(),
  invalidPolicyNumber:'B3006-BAD-'+suffix.toUpperCase()
};
const need=(v,c)=>{if(!v)throw new Error(c);};
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const privileged=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin','operativo']);

need(target,'B3_006_PREVIEW_URL_MISSING');
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
  throw new Error('B3_006_PRIVILEGED_ACTOR_NOT_FOUND');
}
async function queryItems(collection,field,value){
  const s=await root.doc(collection).collection('items').where(field,'==',value).get();
  return s.docs.map(d=>({id:d.id,...d.data(),__ref:d.ref}));
}
async function cleanup(){
  const refs=[],seen=new Set();
  for(const coll of ['polizas','recibosEsperados','carteraPrimas','cobros','actividades']){
    const rows=await queryItems(coll,'clienteId',ids.client).catch(()=>[]);
    rows.forEach(x=>{const key=x.__ref.path;if(!seen.has(key)){seen.add(key);refs.push(x.__ref);}});
  }
  for(const number of [ids.policyNumber,ids.invalidPolicyNumber]){
    const rows=await queryItems('polizas','numero',number).catch(()=>[]);
    rows.forEach(x=>{const key=x.__ref.path;if(!seen.has(key)){seen.add(key);refs.push(x.__ref);}});
  }
  for(const ref of [
    root.doc('clientes').collection('items').doc(ids.client),
    root.doc('aseguradoras').collection('items').doc(ids.insurer)
  ]){const key=ref.path;if(!seen.has(key)){seen.add(key);refs.push(ref);}}
  for(let i=0;i<refs.length;i+=350){
    const batch=db.batch();refs.slice(i,i+350).forEach(ref=>batch.delete(ref));await batch.commit();
  }
  return {deletedRefs:refs.length};
}
async function waitPolicy(number,timeout=15000){
  const end=Date.now()+timeout;
  while(Date.now()<end){
    const rows=await queryItems('polizas','numero',number);
    if(rows.length)return rows;
    await sleep(200);
  }
  return [];
}

const who=await actor();
await cleanup();
await root.doc('clientes').collection('items').doc(ids.client).set({
  id:ids.client,nombre:'B3-006 QA Cliente '+suffix,pais:'GT',moneda:'GTQ',asesorId:who.advisorId,
  estado:'Activo',__syntheticQa:true,__syntheticGate:'B3-006',__syntheticRun:runId
});
await root.doc('aseguradoras').collection('items').doc(ids.insurer).set({
  id:ids.insurer,nombre:'B3-006 QA Aseguradora '+suffix,pais:'GT',paises:['GT'],vinculada:true,activo:true,
  comisionDefault:12,__syntheticQa:true,__syntheticGate:'B3-006',__syntheticRun:runId
});

const token=await auth.createCustomToken(who.uid,{b3006PolicyImportQa:true});
const proof={schema:'GRAVICENTRA_I6_5_B3_006_PREVIEW_PROOF_V1',status:'RUNNING',projectId,tenantId,previewUrl:target,ids,actor:{activeRole:who.activeRole},assertions:{},readback:{},cleanup:null,errors:[],pageErrors:[],consoleErrors:[]};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>proof.pageErrors.push(clean(e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')proof.consoleErrors.push(clean(m.text()));});
  const legalScope='user:'+clean(who.email||who.uid);
  await page.addInitScript(({scope})=>{
    try{
      localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');
      localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));
    }catch{}
  },{scope:legalScope});
  await page.goto(target+'/#/polizas',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0&&!!window.Orbit?.importa&&!!window.Orbit?.policyReceipts);
  const boot=await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    const activated=await Promise.resolve(Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate());
    return{uid:String(c.auth.currentUser?.uid||''),started:activated?.started===true};
  },token);
  need(boot.uid&&boot.started,'B3_006_PRODUCT_SESSION_NOT_STARTED');
  await page.waitForFunction(({cid,iid})=>!!Orbit.store?.get?.('clientes',cid)&&!!Orbit.store?.get?.('aseguradoras',iid),{cid:ids.client,iid:ids.insurer},{timeout:12000});

  const csv=[
    'poliza,ramo,producto,aseguradora,prima neta,prima total,pais,moneda,cliente,vigencia inicio,vigencia fin,frecuencia,medio de pago,estado',
    [ids.policyNumber,'Autos','Auto individual','B3-006 QA Aseguradora '+suffix,'100','112','GT','GTQ','B3-006 QA Cliente '+suffix,'2026-10-01','2027-09-30','Contado','Transferencia','Vigente'].join(','),
    [ids.invalidPolicyNumber,'Autos','Auto individual','B3-006 QA Aseguradora '+suffix,'100','112','GT','GTQ','CLIENTE INEXISTENTE '+suffix,'2026-10-01','2027-09-30','Contado','Transferencia','Vigente'].join(',')
  ].join('\n');

  await page.evaluate(()=>Orbit.importa.open('polizas'));
  await page.waitForSelector('#imp-file');
  await page.locator('#imp-file').setInputFiles({name:'b3006-policy-import.csv',mimeType:'text/csv',buffer:Buffer.from(csv,'utf8')});
  await page.waitForSelector('#imp-next2',{timeout:10000});
  await page.click('#imp-next2');
  await page.waitForSelector('#imp-finish');
  await page.click('#imp-finish');
  await page.waitForFunction(()=>!document.getElementById('imp-drawer')?.classList.contains('open'),null,{timeout:25000});

  const policies=await waitPolicy(ids.policyNumber);
  need(policies.length===1,'B3_006_VALID_POLICY_NOT_EXACTLY_ONE:'+policies.length);
  const policy=policies[0],pid=policy.id;
  const [receipts,portfolio,cobros,badPolicies]=await Promise.all([
    queryItems('recibosEsperados','polizaId',pid),
    queryItems('carteraPrimas','polizaId',pid),
    queryItems('cobros','polizaId',pid),
    queryItems('polizas','numero',ids.invalidPolicyNumber)
  ]);
  proof.readback={policyId:pid,policyCount:policies.length,receiptCount:receipts.length,portfolioCount:portfolio.length,cobroCount:cobros.length,invalidPolicyCount:badPolicies.length,policyFuente:policy.fuente||''};
  need(clean(policy.fuente)==='importacion_poliza_controlada','B3_006_IMPORT_PROVENANCE_NOT_CANONICAL');
  need(receipts.length===1,'B3_006_EXPECTED_RECEIPTS_NOT_ONE:'+receipts.length);
  need(portfolio.length===1,'B3_006_EXPECTED_PORTFOLIO_NOT_ONE:'+portfolio.length);
  need(cobros.length===0,'B3_006_IMPORT_CREATED_COBRO:'+cobros.length);
  need(badPolicies.length===0,'B3_006_INVALID_ROW_DID_NOT_FAIL_CLOSED');
  need(clean(receipts[0].polizaId)===pid&&clean(portfolio[0].polizaId)===pid&&clean(portfolio[0].reciboId)===clean(receipts[0].id),'B3_006_RELATION_READBACK_INVALID');
  need(clean(receipts[0].clienteId)===ids.client&&clean(portfolio[0].clienteId)===ids.client,'B3_006_CLIENT_RELATION_INVALID');

  proof.assertions={
    browserImportPathExecuted:true,
    canonicalPolicyCreated:true,
    expectedReceiptsCreated:true,
    portfolioCreated:true,
    zeroCobrosWithoutEvidence:true,
    invalidRowFailClosed:true,
    relationsExact:true,
    provenanceExact:true,
    noPageErrors:proof.pageErrors.length===0
  };
  need(proof.pageErrors.length===0,'B3_006_PAGE_ERRORS:'+JSON.stringify(proof.pageErrors));
  proof.status='PASS';
}catch(error){
  proof.status='FAIL';proof.failure=clean(error?.stack||error?.message||error);throw error;
}finally{
  if(browser)await browser.close().catch(()=>null);
  proof.cleanup=await cleanup().catch(error=>({error:clean(error?.message||error)}));
  const validAfter=await queryItems('polizas','numero',ids.policyNumber).catch(()=>[]);
  const invalidAfter=await queryItems('polizas','numero',ids.invalidPolicyNumber).catch(()=>[]);
  const byClientAfter={};
  for(const coll of ['polizas','recibosEsperados','carteraPrimas','cobros','actividades'])byClientAfter[coll]=(await queryItems(coll,'clienteId',ids.client).catch(()=>[])).length;
  const clientAfter=await root.doc('clientes').collection('items').doc(ids.client).get().catch(()=>({exists:true}));
  const insurerAfter=await root.doc('aseguradoras').collection('items').doc(ids.insurer).get().catch(()=>({exists:true}));
  proof.cleanup.readback={validPolicy:validAfter.length,invalidPolicy:invalidAfter.length,...byClientAfter,client:clientAfter.exists?1:0,insurer:insurerAfter.exists?1:0};
  proof.cleanup.pass=Object.values(proof.cleanup.readback).every(v=>v===0);
  if(proof.status==='PASS'&&!proof.cleanup.pass){proof.status='FAIL';proof.failure='B3_006_CLEANUP_RESIDUE:'+JSON.stringify(proof.cleanup.readback);}
  fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n');
}
if(proof.status!=='PASS')throw new Error(proof.failure||'B3_006_PREVIEW_PROOF_FAILED');
console.log('B3_006_PREVIEW_PROOF=PASS');
console.log(JSON.stringify(proof));
