import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {initializeApp,applicationDefault,getApps} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
const projectId='ays-orbit-360-lab',tenantId='alianzas-soluciones',url='https://ays-orbit-360-lab.web.app';
const out=process.env.B4_004_SINIESTROS_OUT||'/tmp/gi-b4004-siniestros-live-qa.json';
const sha=s=>createHash('sha256').update(String(s||'')).digest('hex');
const norm=s=>String(s||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const need=(ok,code)=>{if(!ok)throw Error('B4004_SINIESTROS_'+code);};
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),auth=getAuth(app),tenant=db.collection('tenants').doc(tenantId);
const receipt={schema:'GRAVICENTRA_B4_004_SINIESTROS_RETAINED_SOURCE_LIVE_READONLY_V1',status:'INIT',runId:String(process.env.GITHUB_RUN_ID||''),
 sourceSha:'f8fa00e4e2e6627cee66c8c521866874e39bc8da',buildId:'gi-i65-b4-f8fa00e4e2e6-57f234755dc1',
 artifactId:13600357541,hostingVersion:'sites/ays-orbit-360-lab/versions/439cb977fd4649d1',
 siniestrosSourceBlob:'f52c2046157f0bc72008e09e826d34d05eeb668b',
 authAccountsChanged:0,membershipWrites:0,operationalWrites:0,writeAttempts:0,productChanges:0,
 actors:[],checks:[],errors:[],diagnostics:[],screenshots:[],firstRenderMs:[],noClaimsAssumed:false,previousApprovalRetained:true};
function save(){fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');}
async function actors(){
 const members=await tenant.collection('members').get(),ret=[];
 for(const d of members.docs){
  const m=d.data()||{};if(!m||m.active===false||m.activo===false||m.inactivo===true||String(m.tenantId||'')!==tenantId)continue;
  let user;try{user=await auth.getUser(d.id);}catch{continue;}
  if(user.disabled||user.emailVerified!==true)continue;
  const roles=[m.activeRole,m.rolActivo,m.defaultRole,m.rolDefault,m.rol,...(m.roles||[]),...(m.assignedRoles||[])].map(norm);
  const countries=[...(m.countries||[]),...(m.paises||[]),...(m.paisesAutorizados||[])].map(x=>String(x).toUpperCase());
  for(const role of new Set(roles))if(role){
   for(const country of ['GT','CO'])if(countries.includes(country))ret.push({uid:user.uid,email:user.email,role,country});
  }
 }
 const director=ret.find(x=>x.country==='GT'&&x.role==='direccion')||ret.find(x=>x.country==='GT'&&['admintenant','superadmin','admin'].includes(x.role));
 const operative=ret.find(x=>x.country==='CO'&&x.role==='operativo'&&x.uid!==director?.uid)||ret.find(x=>x.country==='GT'&&x.role==='operativo'&&x.uid!==director?.uid);
 need(director&&operative&&director.uid!==operative.uid,'DISTINCT_EXISTING_UID_COUNTRY_PAIR_UNAVAILABLE');
 return[director,operative];
}
async function legal(page,a){
 const scope='user:'+String(a.email||a.uid).trim();
 await page.addInitScript(({scope})=>{try{localStorage.setItem('orbit360_confidencialidad','qa-existing-legal-acceptance');localStorage.setItem('orbit360_legal_aceptaciones',JSON.stringify({[scope]:{aceptado:true,version:'2.0',fecha:'2000-01-01T00:00:00.000Z',tipo:'interno',qaEphemeralPriorAcceptance:true}}));}catch{}},{scope});
}
async function checkActor(browser,a,index){
 const context=await browser.newContext({viewport:{width:index===0?1440:390,height:index===0?900:844},serviceWorkers:'block'}),page=await context.newPage();
 const errs=[],failed=[];
 page.on('pageerror',e=>errs.push({code:'PAGE_ERROR',hash:sha(String(e.message))}));
 page.on('response',r=>{if(r.status()===404){const u=new URL(r.url());errs.push({code:'HTTP_404',originHost:u.hostname,pathSha:sha(u.pathname),resourceType:r.request().resourceType(),staticAsset:/\.(js|css|png|svg|ico|webmanifest)$/i.test(u.pathname),documentDriveStatus:u.pathname.endsWith('/orbit360DocumentDriveStatus')});}});
 page.on('requestfailed',r=>{const u=new URL(r.url());if(!u.pathname.endsWith('/orbit360DocumentDriveStatus'))failed.push({code:'REQUEST_FAILED',originHost:u.hostname,pathSha:sha(u.pathname),resourceType:r.resourceType(),failureCode:String(r.failure()?.errorText||'').slice(0,80)});});
 await context.route(/orbit360ProductOperationalCommand|orbit360OpsLeadsCommand/,async route=>{
  if(route.request().method()==='OPTIONS'){await route.continue();return;}
  receipt.writeAttempts++;await route.abort('blockedbyclient');
 });
 try{
  await legal(page,a);const start=Date.now();
  const token=await auth.createCustomToken(a.uid);
  await page.goto(url+'/#/siniestros',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
  const boot=await page.evaluate(async token=>{
   const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
   if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,token);
   let s=Orbit.productAppP0.status?.();
   for(let i=0;i<6&&!s?.started;i++){
    try{s=await Promise.resolve(Orbit.productAppP0.activate());}
    catch(e){if(!/PRODUCT_(?:READONLY_BOOTSTRAP_NOT_READY|STORE_NOT_READY)/.test(String(e?.message||'')))throw e;await new Promise(r=>setTimeout(r,250*(i+1)));}
   }
   return {uid:c.auth.currentUser?.uid,started:s?.started===true};
  },token);
  need(boot.uid===a.uid&&boot.started,'SESSION_NOT_ACTIVE');
  need(await page.evaluate(role=>Orbit.session.set(role)===true,a.role),'ROLE_MISMATCH');
  const sel=page.locator('#pais-sel');need(await sel.count()===1,'COUNTRY_SELECTOR');
  await sel.selectOption(a.country);
  await page.waitForFunction(c=>Orbit.pais===c,a.country,{timeout:15000});
  await page.evaluate(()=>{Orbit.store?._ensureCollections?.(['reclamos','clientes','polizas','gestiones','actividades']);location.hash='#/siniestros';});
  await page.waitForFunction(()=>!!document.querySelector('#si-new')&&!!document.querySelector('#si-imp')&&!!document.querySelector('#host')?.textContent?.includes('Siniestros'),null,{timeout:20000});
  const ms=Date.now()-start;
  const before=await page.evaluate(()=>({route:Orbit.route?.key||'',country:Orbit.pais,role:Orbit.session.rol(),rendered:document.querySelector('#host')?.textContent?.includes('Siniestros')===true,claimCount:(Orbit.store?.all?.('reclamos')||[]).length,writeAuthorized:Orbit.store?.__productOperationalWriteP0===true}));
  need(before.rendered&&before.country===a.country&&norm(before.role)===norm(a.role),'ROUTE_COUNTRY_ROLE');
  await page.locator('#si-new').click();
  const modal=await page.evaluate(()=>({client:!!document.querySelector('#sn-cli'),policy:!!document.querySelector('#sn-pol'),type:!!document.querySelector('#sn-tipo'),amount:!!document.querySelector('#sn-monto'),submit:!!document.querySelector('#sn-ok'),cancel:!!document.querySelector('#sn-cancel')}));
  need(Object.values(modal).every(Boolean),'READONLY_CREATE_FORM_NOT_RENDERED');
  await page.locator('#sn-cancel').click();
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!document.querySelector('#si-new')&&!!document.querySelector('#host')?.textContent?.includes('Siniestros'),null,{timeout:30000});
  const after=await page.evaluate(()=>({route:Orbit.route?.key||'',bodyOk:!!document.querySelector('#si-new'),noModal:!document.querySelector('#sn-ok')}));
  need(after.bodyOk&&after.noModal,'RELOAD_STATE');
  receipt.diagnostics.push({actorUidHash:sha(a.uid),role:a.role,country:a.country,observedRoute:before.route,firstRenderMs:ms,modal,after,errors:errs,requestFailures:failed,writeAttemptCount:receipt.writeAttempts});
  need(!errs.length&&!failed.length&&receipt.writeAttempts===0,'PAGE_OR_WRITE_ERRORS');
  const observed={uidHash:sha(a.uid),role:a.role,country:a.country,viewport:index===0?'1440x900':'390x844',sessionUidMatched:true,
    routeVisible:true,formOpenedAndCancelled:true,reloadPass:true,claimRowsObserved:before.claimCount,firstRouteRenderMs:ms,noBusinessWrite:true,pageErrors:errs,networkFailures:failed};
  receipt.actors.push({uidHash:sha(a.uid),role:a.role,country:a.country});
  receipt.checks.push(observed);receipt.firstRenderMs.push(ms);
  const shot=process.env.RUNNER_TEMP+'/b4004-siniestros-'+index+'.png';
  await page.screenshot({path:shot,fullPage:false});
  receipt.screenshots.push({path:shot,sha256:createHash('sha256').update(fs.readFileSync(shot)).digest('hex')});
 }finally{await context.close();}
}
async function main(){
 let browser;
 try{
  const marker=await(await fetch(url+'/__recovery__/build.json',{headers:{'Cache-Control':'no-cache'}})).json();
  need(marker.sourceSha===receipt.sourceSha&&marker.buildId===receipt.buildId,'EXACT_CURRENT_LIVE_BUILD');
  const selected=await actors();
  browser=await chromium.launch({headless:true});
  for(let i=0;i<selected.length;i++)await checkActor(browser,selected[i],i);
  need(receipt.checks.length===2&&receipt.writeAttempts===0&&receipt.operationalWrites===0,'INCOMPLETE_TWO_UID_PROOF');
  receipt.status='SINIESTROS_RETAINED_SOURCE_TWO_UID_LIVE_READONLY_FOCAL_PASS';
 }catch(e){receipt.errors.push(String(e?.message||e).slice(0,180));receipt.status='HOLD';}
 finally{if(browser)await browser.close();save();}
 if(receipt.status!=='SINIESTROS_RETAINED_SOURCE_TWO_UID_LIVE_READONLY_FOCAL_PASS')throw Error('B4004_SINIESTROS_READONLY_HOLD');
}
await main();
