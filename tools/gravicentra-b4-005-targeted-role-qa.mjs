import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Independent identities; read-only validation of the EXISTING immutable B4-005 Preview.
// This script does not build/deploy, modify tenant membership, or submit operational writes.
const projectId = 'ays-orbit-360-lab';
const tenantId = 'alianzas-soluciones';
const url = 'https://ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app';
const sourceSha = '6c2266311b156b4a5d19be456bcef197a43b888e';
const buildId = 'gi-i65-b4-6c2266311b15-57f234755dc1';
const qaPolicyId = 'b4003qa_policy_expired_renew_38102224750';
const qaClientId = 'b4003qa_client_38102224750';
const out = process.env.B4005_ROLE_QA_OUT || '/tmp/gravicentra-b4005-role-qa.json';
const hash = x => createHash('sha256').update(String(x || '')).digest('hex');
const norm = x => String(x || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const must = (ok,code) => { if (!ok) throw Error('B4005_ROLE_QA_' + code); };
const app = getApps()[0] || initializeApp({credential:applicationDefault(),projectId});
const db = getFirestore(app), auth = getAuth(app), tenant = db.collection('tenants').doc(tenantId);
const receipt = {schema:'GRAVICENTRA_B4005_DISTINCT_EXISTING_UID_PREVIEW_READONLY_V1',status:'INIT',sourceSha,buildId,
  immutableArtifactId:13605062717,previewUrl:url,runId:String(process.env.GITHUB_RUN_ID||''),
  actorChecks:[],backendReadback:null,networkErrors:[],pageErrors:[],writeAttempts:0,businessWrites:0,authUsersCreated:0,membershipsChanged:0,
  historicalPassesReopened:false,liveTouched:false,errors:[]};
function save(){fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');}
async function chooseActors(){
 const rows=[];
 for (const d of (await tenant.collection('members').get()).docs){
  const m=d.data()||{};
  if(m.active===false||m.activo===false||m.inactivo===true||String(m.tenantId||'')!==tenantId)continue;
  let u;try{u=await auth.getUser(d.id);}catch{continue;}
  if(u.disabled||u.emailVerified!==true)continue;
  const roles=[m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol,...(m.roles||[]),...(m.assignedRoles||[])].map(norm);
  const countries=[...(m.countries||[]),...(m.paises||[]),...(m.paisesAutorizados||[])].map(x=>String(x).toUpperCase());
  for(const role of new Set(roles))for(const country of ['GT','CO'])if(role&&countries.includes(country))rows.push({uid:u.uid,email:u.email,role,country});
 }
 const director=rows.find(x=>x.country==='GT'&&x.role==='direccion')||rows.find(x=>x.country==='GT'&&['admin','admintenant','superadmin'].includes(x.role));
 const operative=rows.find(x=>x.country==='CO'&&x.role==='operativo'&&x.uid!==director?.uid)||rows.find(x=>x.country==='GT'&&x.role==='operativo'&&x.uid!==director?.uid);
 must(director&&operative&&director.uid!==operative.uid,'DISTINCT_UIDS_UNAVAILABLE');
 return [director,operative];
}
async function legal(page,a){
 const scope='user:'+String(a.email||a.uid).trim();
 await page.addInitScript(({scope})=>{try{localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));}catch{}},{scope});
}
async function checkActor(browser,a,index){
 const context=await browser.newContext({viewport:index===0?{width:1440,height:900}:{width:390,height:844},serviceWorkers:'block'});
 const page=await context.newPage();let controlledReload=false;
 const pageErrors=[],networkErrors=[];
 page.on('pageerror',e=>pageErrors.push({kind:'PAGE_ERROR',errorHash:hash(e.message)}));
 page.on('response',r=>{if(r.status()===404){const p=new URL(r.url()); if(!p.pathname.endsWith('/orbit360DocumentDriveStatus'))networkErrors.push({kind:'HTTP_404',host:p.hostname,pathHash:hash(p.pathname)});}});
 page.on('requestfailed',r=>{const p=new URL(r.url()),code=String(r.failure()?.errorText||'');if(p.pathname.endsWith('/orbit360DocumentDriveStatus')||(controlledReload&&code.includes('ERR_ABORTED')))return;networkErrors.push({kind:'REQUEST_FAILED',host:p.hostname,pathHash:hash(p.pathname),code});});
 await context.route(/orbit360ProductOperationalCommand|orbit360OpsLeadsCommand/i,async route=>{if(route.request().method()==='OPTIONS')return route.continue();receipt.writeAttempts++;await route.abort('blockedbyclient');});
 try{
  await legal(page,a);
  const started=Date.now();
  const token=await auth.createCustomToken(a.uid);
  await page.goto(url+'/#/ops',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
  const boot=await page.evaluate(async token=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
    let s=Orbit.productAppP0.status?.();
    for(let n=0;n<6&&!s?.started;n++){
     try{s=await Promise.resolve(Orbit.productAppP0.activate());}
     catch(e){if(!/PRODUCT_(?:READONLY_BOOTSTRAP_NOT_READY|STORE_NOT_READY)/.test(String(e?.message||'')))throw e;await new Promise(r=>setTimeout(r,250*(n+1)));}
    }
    return {uid:c.auth.currentUser?.uid,started:s?.started===true};
  },token);
  must(boot.uid===a.uid&&boot.started,'SESSION_UID_NOT_MATCHED');
  must(await page.evaluate(role=>Orbit.session.set(role)===true,a.role),'ACTIVE_ROLE_DENIED');
  await page.locator('#pais-sel').selectOption(a.country);
  await page.waitForFunction(country=>Orbit.pais===country,a.country,{timeout:15000});
  await page.evaluate(async()=>{await Orbit.store?._ensureCollections?.(['polizas','clientes','gestiones']);location.hash='#/ops';});
  await page.waitForFunction(()=>document.querySelector('#host')?.textContent?.includes('Ops')===true,null,{timeout:20000});
  await page.waitForFunction(country=>(Orbit.store?.all?.('polizas')||[]).some(p=>p.pais===country),a.country,{timeout:20000});
  const before=await page.evaluate(()=>({country:Orbit.pais,role:Orbit.session.rol(),uid:Orbit.productRuntimeBrowserProvidersP0?.status?.()?.authUid||'',
    qaGtPolicyInScopedStore:(Orbit.store?.all?.('polizas')||[]).some(p=>p.id==='b4003qa_policy_expired_renew_38102224750'),
    visibleOps:document.querySelector('#host')?.textContent?.includes('Gestiones operativas')===true}));
  must(before.country===a.country&&norm(before.role)===norm(a.role)&&before.visibleOps,'ROLE_COUNTRY_OR_OPS_ROUTE_MISMATCH');
  let form={open:false,beneficiaryField:false,cancelled:false},policyId='';
  if(a.country==='CO')must(!before.qaGtPolicyInScopedStore,'GT_POLICY_VISIBLE_IN_CO_SCOPE');
  policyId=await page.evaluate(country=>(Orbit.store?.all?.('polizas')||[]).find(p=>p.pais===country&&Orbit.access?.canView?.('polizas',p,'cliente360'))?.id||'',a.country);
  must(Boolean(policyId),'VIEWABLE_POLICY_UNAVAILABLE');
  await page.evaluate(({policyId})=>{location.hash='#/cliente360?c='+(Orbit.store.get('polizas',policyId)?.clienteId||'')+'&p='+policyId;},{policyId});
  await page.waitForFunction(()=>!!document.querySelector('[data-policy-endoso-request]'),null,{timeout:20000});
  await page.locator('[data-policy-endoso-request]').click();
  await page.waitForFunction(()=>!!document.querySelector('#end-type')&&!!document.querySelector('#end-note'),null,{timeout:12000});
  form.open=true;
  await page.locator('#end-type').selectOption('beneficiarios');
  form.beneficiaryField=await page.locator('#end-benef').count()===1;
  must(form.beneficiaryField,'BENEFICIARIES_FORM_MISSING');
  await page.locator('#endorsement-request-v1201').getByText('Cancelar').click().catch(async()=>{await page.locator('.ciclo-modal [data-close], .modal [data-close]').first().click();});
  form.cancelled=await page.locator('#end-type').count()===0;
  must(form.cancelled,'FORM_CLOSE_FAILED');
  controlledReload=true;
  try{await page.reload({waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>!!document.querySelector('#host')?.textContent,null,{timeout:20000});}
  finally{controlledReload=false;}
  const readback=await page.evaluate(({policyId})=>({policyId,policyExists:!!Orbit.store?.get?.('polizas',policyId),role:Orbit.session.rol(),country:Orbit.pais}),{policyId});
  const persistedRoleCountry=norm(readback.role)===norm(a.role)&&readback.country===a.country;
  receipt.actorChecks.push({uidSha256:hash(a.uid),role:a.role,country:a.country,viewport:index===0?'1440x900':'390x844',firstReadyMs:Date.now()-started,
    qaPolicyScoped:before.qaGtPolicyInScopedStore,policyIdSha256:hash(policyId),form,readback: {exists:readback.policyExists,role:readback.role,country:readback.country},
    roleCountryPersistedOnReload:persistedRoleCountry,authenticatedIndependentUid:true,writeAttempts:receipt.writeAttempts,pageErrors:pageErrors.length,networkErrors:networkErrors.length});
  must(readback.policyExists,'RELOAD_POLICY_ABSENT');
  must(!pageErrors.length&&!networkErrors.length&&receipt.writeAttempts===0,'PAGE_NETWORK_OR_WRITE_ATTEMPT');
 }finally{receipt.pageErrors.push(...pageErrors);receipt.networkErrors.push(...networkErrors);await context.close();}
}
async function main(){let browser;
 try{
  const marker=await(await fetch(url+'/__recovery__/build.json',{headers:{'Cache-Control':'no-cache'}})).json();
  must(marker.sourceSha===sourceSha&&marker.buildId===buildId,'PREVIEW_MARKER_MISMATCH');
  const policy=await tenant.collection('data').doc('polizas').collection('items').doc(qaPolicyId).get();
  const p=policy.data()||{};
  must(policy.exists&&p.__syntheticQa===true&&p.ultimoEndosoId==='b4003qa_ges_end_mw7di0gc_0wqpn','FIRESTORE_POLICY_MARKER');
  must(p.beneficiarios?.length===1&&p.beneficiarios[0]==='Beneficiario QA sintético 42449448186','FIRESTORE_BENEFICIARY_READBACK');
  receipt.backendReadback={source:'FIRESTORE_ADMIN_READONLY',policyId:qaPolicyId,beneficiariesExact:true,managementIdMatched:true};
  const actors=await chooseActors();browser=await chromium.launch({headless:true});
  for(let i=0;i<actors.length;i++)await checkActor(browser,actors[i],i);
  must(receipt.actorChecks.length===2&&receipt.actorChecks[0].uidSha256!==receipt.actorChecks[1].uidSha256,'TWO_UID_CERTIFICATION_INCOMPLETE');
  receipt.status='B4005_TWO_UID_ROLE_COUNTRY_VIEWPORT_READONLY_AND_BACKEND_FIELD_PASS';
 }catch(error){receipt.status='HOLD';receipt.errors.push(String(error?.message||error).slice(0,240));}
 finally{if(browser)await browser.close();save();}
 if(receipt.status==='HOLD')throw Error('B4005_TARGETED_ROLE_QA_HOLD');
}
await main();
