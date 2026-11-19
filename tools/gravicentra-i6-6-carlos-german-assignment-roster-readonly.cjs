'use strict';
// I6.6 existing authorised tenant and staff: authenticated READ-ONLY roster + UI diagnosis.
// No legal acceptance, customer modification, Firebase data writes, permissions or deployment.
const assert=require('node:assert/strict');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const TENANT='alianzas-soluciones';
const service=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>{try{return JSON.parse(process.env[k]||'');}catch{return null;}})
 .find(s=>s?.type==='service_account'&&s.project_id==='ays-orbit-360-lab'&&s.private_key);
assert.ok(service,'SIGNED_ROSTER_IDENTITY_UNAVAILABLE');
admin.initializeApp({credential:admin.credential.cert(service),projectId:'ays-orbit-360-lab'});
const tenant=admin.firestore().collection('tenants').doc(TENANT);
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ORIGINS=['https://app.aysseguros.com','https://ays-orbit-360-lab--gi-i66-rc-44609701409-zv8vzb9e.web.app'];
(async()=>{
 const [members,advisors]=await Promise.all([
  tenant.collection('members').limit(180).get(),
  tenant.collection('data').doc('asesores').collection('items').limit(450).get()]);
 assert.ok(members.size<180&&advisors.size<450,'SIGNED_ROSTER_SCAN_UNBOUNDED');
 const carlos=members.docs.filter(d=>{
   const r=d.data()||{};return [r.nombre,r.displayName,r.name,r.nombreCompleto,r.fullName].some(v=>norm(v).startsWith('carlos castro'))&&
   norm(r.activeRole)==='operativo'&&r.active!==false&&r.activo!==false;
 });
 assert.equal(carlos.length,1,'CARLOS_OPERATIVO_MEMBERSHIP_NOT_UNIQUE');
 const german=advisors.docs.filter(d=>{
   const r=d.data()||{};return [r.nombre,r.displayName,r.name,r.nombreCompleto].some(v=>norm(v).includes('german')&&norm(v).includes('reyes'));
 });
 assert.equal(german.length,1,'GERMAN_CANONICAL_IDENTITY_NOT_UNIQUE');
 const germanId=german[0].id;
 const account=await admin.auth().getUser(carlos[0].id);
 assert.ok(!account.disabled&&account.emailVerified,'CARLOS_AUTH_ACCOUNT_NOT_READY');
 const token=await admin.auth().createCustomToken(carlos[0].id);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const origin of ORIGINS){
   const context=await browser.newContext({viewport:{width:1280,height:850}});
   try{
    const page=await context.newPage();
    await page.goto(origin+'/#/ops',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const result=await page.evaluate(async ({token,germanId})=>{
     const provider=Orbit.productRuntimeBrowserProvidersP0;
     const client=await provider.initialize();
     await client.modules.auth.setPersistence(client.auth,client.modules.auth.browserSessionPersistence);
     await client.modules.auth.signInWithCustomToken(client.auth,token);
     const activated=await Orbit.productAppP0.activate();
     const role=String(Orbit.session?.rol?.()||'');
     const roster=Orbit.assignableAdvisorRoster;
     const before=roster?.peek?.('GT')||[];
     let rows=[],error='';
     try{rows=await roster.list('GT',{force:true});}
     catch(e){error=String(e.code||e.message||e).slice(0,180);}
     let modalVisible=false,optionCount=0,optionGerman=false,selectDisabled=true,modalError='';
     try{
      await Orbit.ciclo.nuevoNegocio({pais:'GT'});
      const select=document.getElementById('nn-ase');
      modalVisible=!!select;
      optionCount=select?.options?.length||0;
      optionGerman=!!select&&[...select.options].some(o=>o.value===germanId);
      selectDisabled=!!select?.disabled;
     }catch(e){modalError=String(e.code||e.message||e).slice(0,180);}
     document.querySelectorAll('#ciclo-modal').forEach(n=>n.remove());
     return {
       started:activated?.started===true,
       role,preview:provider.isI66PreviewHost(),
       callable:roster?.status?.().functionName,region:roster?.status?.().region,
       beforeCount:before.length,serverCount:rows.length,serverGerman:rows.some(r=>r.id===germanId),
       callError:error,modalVisible,optionCount,optionGerman,selectDisabled,modalError
     };
    },{token,germanId});
    console.log('I66_CARLOS_GERMAN_SIGNED_ROSTER_READONLY '+JSON.stringify({origin:origin.includes('--')?'preview':'live',...result}));
    assert.equal(norm(result.role),'operativo','CARLOS_ACTIVE_ROLE_NOT_OPERATIVO');
    if(!result.started||result.callError||!result.serverGerman||!result.optionGerman)
      throw Error('I66_CARLOS_GERMAN_ASSIGNMENT_ROSTER_NOT_READY_'+(origin.includes('--')?'PREVIEW':'LIVE'));
   }finally{await context.close();}
  }
 }finally{await browser.close();}
 console.log('I66_CARLOS_GERMAN_LIVE_AND_PREVIEW_ASSIGNABLE_UI_PASS noDataWrites=true');
})().catch(e=>{console.error('I66_CARLOS_GERMAN_SIGNED_HOLD '+String(e.message||e).slice(0,210));process.exitCode=1;})
 .finally(()=>admin.app().delete());
