'use strict';
// LIVE remains untouched. Real signed Firebase Auth sessions through the
// isolated Hosting Preview and existing scoped reader Preview function only.
const assert=require('node:assert/strict');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab',R7='0153f5cbbe00c3732e11ebae59b32bd357e38bfd';
const MODE=String(process.env.I66_STAGE_MODE||'PREVIEW').toUpperCase();
assert.ok(['PREVIEW','LIVE'].includes(MODE),'I66_SIGNED_STAGE_MODE_NOT_ALLOWED');
const PREVIEW=String(process.env.I66_STAGE_PREVIEW_URL||'');
const SOURCE=String(process.env.I66_STAGE_SOURCE_SHA||'');
const LIVE_ORIGINS=['https://ays-orbit-360-lab.web.app','https://app.aysseguros.com'];
if(MODE==='PREVIEW')assert.match(PREVIEW,/^https:\/\/ays-orbit-360-lab--gi-i66-rc-\d+-[a-z0-9]+\.web\.app$/,
 'I66_PREVIEW_HOST_UNEXPECTED');
assert.match(SOURCE,/^[0-9a-f]{40}$/,'I66_SOURCE_SHA_INVALID');
const cred=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{
 try{return JSON.parse(process.env[k]||'');}catch{return null;}
}).find(x=>x?.type==='service_account'&&x.project_id===PROJECT&&x.private_key);
assert.ok(cred,'I66_PREVIEW_SIGNED_AUTH_CREDENTIAL_MISSING');
admin.initializeApp({credential:admin.credential.cert(cred),projectId:PROJECT});
const db=admin.firestore(),auth=admin.auth(),tenant=db.collection('tenants').doc(TENANT);
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9]+/g,'');
async function readBuild(origin){
 const r=await fetch(origin+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}});
 assert.equal(r.status,200,'I66_BUILD_ORIGIN_UNAVAILABLE');return r.json();
}
async function actors(){
 // Exactly the already certified tenant-member/advisor-link resolver used in
 // signed Ops/Leads UAT; no guessed identity and no broad role impersonation.
 const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),
   tenant.collection('data').doc('asesores').collection('items').limit(400).get()]);
 assert.ok(members.size<150&&advisors.size<400,'I66_SIGNED_STAFF_SCAN_LIMIT');
 const resolve=(predicate,role)=>{
  const advisorIds=new Set(),uids=new Set();
  for(const doc of advisors.docs){const a=doc.data()||{};
   if([a.nombre,a.nombreCompleto,a.displayName,a.name].some(x=>predicate(norm(x)))){
    advisorIds.add(doc.id);[a.authUid,a.uid,a.userId].filter(Boolean).forEach(x=>uids.add(String(x)));
   }
  }
  const found=members.docs.filter(doc=>{const m=doc.data()||{};
   const identified=[m.nombre,m.nombreCompleto,m.name,m.displayName,m.fullName]
    .some(x=>predicate(norm(x)))||advisorIds.has(String(m.advisorId||m.asesorId||''))||uids.has(doc.id);
   return identified&&norm(m.activeRole)===role&&m.active!==false&&m.activo!==false&&
    ['active','activo'].includes(norm(m.status||m.estado))&&
    [].concat(m.countries||m.paises||[]).map(x=>String(x).toUpperCase()).includes('GT');
  });
  assert.equal(found.length,1,'I66_SIGNED_REAL_ACTOR_NOT_UNIQUE_'+role);
  return found[0].id;
 };
 const selected={direction:resolve(v=>v.includes('paula')&&v.includes('osorio'),'direccion'),
  carlos:resolve(v=>v.startsWith('carloscastro'),'operativo')};
 const people={};
 for(const [key,uid] of Object.entries(selected)){
  const user=await auth.getUser(uid);
  assert.ok(!user.disabled&&user.emailVerified,'I66_AUTHENTICATED_MEMBER_NOT_READY_'+key);
  people[key]={uid,token:await auth.createCustomToken(uid)};
 }
 return people;
}
async function signedPage(browser,{token},role,origin){
 const context=await browser.newContext({viewport:{width:1280,height:850}});
 const page=await context.newPage(),faults=[];
 page.on('pageerror',error=>faults.push(String(error.message||error).slice(0,140)));
 try{
  await page.goto(origin+'/#/conciliaciones',{waitUntil:'commit',timeout:30000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&
    !!window.Orbit?.productAppP0,null,{timeout:30000});
  const signed=await page.evaluate(async({token,role})=>{
   const provider=Orbit.productRuntimeBrowserProvidersP0,c=await provider.initialize();
   await c.modules.auth.setPersistence(c.auth,c.modules.auth.browserSessionPersistence);
   await c.modules.auth.signInWithCustomToken(c.auth,token);
   const app=await Orbit.productAppP0.activate();
   return {started:app?.started===true,preview:provider.isI66PreviewHost(),
     role:Orbit.session?.rol?.(),canView:Orbit.access?.can('conciliaciones','view')===true,
     source:window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__?.version||''};
  },{token,role});
  assert.ok(signed.started&&signed.preview===(MODE==='PREVIEW'),
    'I66_SIGNED_'+MODE+'_ACTIVATION_NOT_READY_'+role);
  assert.equal(norm(signed.role),norm(role),'I66_SIGNED_ACTIVE_ROLE_MISMATCH_'+role);
  if(role==='Operativo'){
   const check=await page.evaluate(async()=>{
    try{const r=await Orbit.productRuntimeBrowserProvidersP0.protectedReadPage({tenantId:'alianzas-soluciones',
      activeRole:'Operativo',country:'GT',collection:'conciliaciones',pageSize:200});
      return{denied:false,rows:r?.rows?.length||0};}
    catch(_){return{denied:true,rows:0};}
   });
   assert.equal(check.denied,true,'I66_CARLOS_UNASSIGNED_CONCILIACIONES_MODULE_EXPOSURE');
   assert.equal(check.rows,0);assert.equal(faults.length,0,'I66_CARLOS_PAGE_ERRORS');
   console.log('I66_SIGNED_CARLOS_OPERATIVO_CONCILIACIONES_UNASSIGNED_DENY_PASS writes=0');
   return;
  }
  assert.equal(signed.canView,true,'I66_DIRECTION_CONCILIACIONES_UI_MODULE_HIDDEN');
  const t0=Date.now();
  const protectedRead=await page.evaluate(async()=>{
   const p=Orbit.productRuntimeBrowserProvidersP0;
   const r=await p.protectedReadPage({tenantId:'alianzas-soluciones',activeRole:'Dirección',
     country:'GT',collection:'conciliaciones',pageSize:200});
   return{serverScoped:r?.serverScoped===true,scope:r?.scope,country:r?.country,
     rows:(r?.rows||[]).map(x=>({id:x.canonicalDocumentId,pais:x.pais,
       readOnly:x.readOnly,applicationPermitted:x.applicationPermitted}))};
  });
  const elapsed=Date.now()-t0;
  assert.ok(protectedRead.serverScoped&&protectedRead.scope==='all'&&protectedRead.country==='GT');
  assert.equal(protectedRead.rows.length,52,'I66_SIGNED_PREVIEW_PROTECTED_READER_COUNT_DRIFT');
  assert.equal(new Set(protectedRead.rows.map(x=>x.id)).size,52);
  assert.ok(protectedRead.rows.every(x=>x.pais==='GT'&&x.readOnly&&x.applicationPermitted===false));
  await page.evaluate(()=>Orbit.store._ensureCollections(['conciliaciones','conciliacionesPrimas']));
  await page.waitForFunction(()=>{
   const s=Orbit.store?._productStatus?.()||{},confirmed=s.serverConfirmedCollections||[];
   return confirmed.includes('conciliaciones')&&confirmed.includes('conciliacionesPrimas');
  },null,{timeout:45000});
  const view=await page.evaluate(()=>{
   const proposals=Orbit.cobrosConciliacionReadOnly.proposalRows();
   const host=document.createElement('div');Orbit.modules.conciliaciones.render(host);
   return{ready:Orbit.cobrosConciliacionReadOnly.proposalReadiness(),
     count:proposals.length,rendered:host.querySelectorAll('[data-conc-id]').length,
     previewReadOnly:Orbit.cobrosConciliacionReadOnly.firestoreWrites===0,
     headingAndNoAutoApply:host.textContent?.includes('Bandeja de conciliaciones')===true&&
       host.textContent?.includes('Ninguna propuesta aplica pagos por sí sola')===true,
     errors:Object.keys(Orbit.store._productStatus().snapshotErrors||{})
       .filter(x=>x==='conciliaciones'||x==='conciliacionesPrimas')};
  });
  assert.equal(view.ready,'ready');assert.equal(view.count,52);assert.equal(view.rendered,52);
  assert.ok(view.previewReadOnly&&view.headingAndNoAutoApply&&view.errors.length===0);
  assert.equal(faults.length,0,'I66_SIGNED_PREVIEW_JS_PAGE_ERROR');
  console.log('I66_SIGNED_DIRECTION_CONCILIACIONES_'+MODE+'_UI_PASS '+JSON.stringify({
    proposals:52,rendered:52,readOnly:true,source:SOURCE,
    protectedListElapsedMs:elapsed,writes:0}));
 }finally{await context.close();}
}
async function main(){
 console.log('I66_SIGNED_UAT_STEP=BUILD_ORIGINS');
 const origins=MODE==='PREVIEW'?[PREVIEW,...LIVE_ORIGINS]:LIVE_ORIGINS;
 const builds=await Promise.all(origins.map(readBuild));
 assert.equal(builds[0].sourceSha,SOURCE,'I66_'+MODE+'_IMMUTABLE_SOURCE_DRIFT');
 if(MODE==='PREVIEW'){
  assert.equal(builds[1].sourceSha,R7,'I66_LIVE_PRIMARY_DRIFT');
  assert.equal(builds[2].sourceSha,R7,'I66_LIVE_STAFF_DRIFT');
 }else{
  assert.equal(builds[1].sourceSha,SOURCE,'I66_LIVE_STAFF_SOURCE_DRIFT');
 }
 console.log('I66_SIGNED_UAT_STEP=REAL_ACTORS');
 const people=await actors();
 console.log('I66_SIGNED_UAT_STEP=SIGNED_BROWSER');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const origin of (MODE==='PREVIEW'?[PREVIEW]:LIVE_ORIGINS)){
   await signedPage(browser,people.direction,'Dirección',origin);
   await signedPage(browser,people.carlos,'Operativo',origin);
  }}
 finally{await browser.close();}
 console.log('I66_CONCILIACIONES_STAGE_SIGNED_'+MODE+'_ACCEPTANCE_PASS zero_business_writes');
}
main().catch(e=>{
 const code=String(e?.code||'UNKNOWN').replace(/[^A-Z0-9_]/gi,'_').slice(0,40);
 const message=String(e?.message||'').replace(/[^\w.:/-]+/g,'_').slice(0,150);
 const frame=String(e?.stack||'').split('\n').find(x=>/at (signedPage|actors|main|readBuild) \(/.test(x))||'';
 const position=frame.match(/:(\d+):(\d+)\)?$/);
 console.error('I66_SIGNED_PREVIEW_HOLD code='+code+' reason='+message+
   ' localLine='+(position?.[1]||'unknown'));
 process.exitCode=1;
})
 .finally(()=>admin.app().delete());
