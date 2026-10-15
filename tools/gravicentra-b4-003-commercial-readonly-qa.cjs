'use strict';
const fs=require('node:fs');
const {initializeApp,cert,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {getAuth}=require('firebase-admin/auth');
const {chromium}=require('playwright');
const out=(process.env.RUNNER_TEMP||'/tmp')+'/b4-003-commercial-readonly.json';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const assert=(v,m)=>{if(!v)throw Error(m)};
const tid='alianzas-soluciones';
const result={schema:'B4_003_COMMERCIAL_TWO_UID_READONLY_V1',status:'STARTED',twoVerifiedUids:false,
 country:null,actors:[],contactPairsChecked:0,contactConflictsReview:0,contactUnavailable:0,
 d04:'HOLD_ATTACHMENT_WRITE_NOT_AUTHORIZED',d15:'UNTESTED',d18:'HOLD_CREATE_UPDATE_NOT_AUTHORIZED',
 operationalWrites:0,syntheticWrites:0,firestoreRulesDeployed:false,livePromoted:false,errors:[]};
let app,browser;
async function main(){
 const control=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json','utf8'));
 const proof=control.b4003Oct15ScopedPreviewEvidence||{};
 assert(control.nextAction==='I6_5_FORENSIC_REMEDIATION_B4_003_R20_TARGETED_PAULA_VISUAL','GATE_CHANGED');
 assert(control.b4003CommercialReadOnlyQa20261015?.status==='REQUESTED_READONLY_EXISTING_PREVIEW_ONLY','QA_NOT_REQUESTED');
 assert(control.b4003SecurityReleaseHold?.status==='ACTIVE_FAIL_CLOSED_UNAUTHORIZED_BROWSER_FIRESTORE_READ_WRITE','SECURITY_HOLD_CHANGED');
 assert(proof.exactHostingReadback===true&&proof.authenticatedReadOnlyPass===true,'PREVIEW_NOT_CERTIFIED');
 const host=proof.previewUrl;
 assert(/^https:\/\/ays-orbit-360-lab--gi-i65-b4-[a-z0-9-]+\.web\.app$/.test(host),'WRONG_HOST');
 const h=await fetch(host+'/__recovery__/build.json?qa='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
 assert(h.ok,'HOSTING_MARKER_HTTP');const m=await h.json();
 assert(m.sourceSha===proof.sourceHead&&m.buildId===proof.buildId,'HOSTING_IDENTITY_CHANGED');
 result.buildId=proof.buildId;result.artifactId=proof.artifactId;
 const sa=['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']
  .map(k=>{try{return JSON.parse(process.env[k]||'')}catch{return null}})
  .find(x=>x?.type==='service_account'&&x.project_id==='ays-orbit-360-lab'&&x.private_key);
 assert(sa,'EXISTING_SERVICE_ACCOUNT_NOT_AVAILABLE');
 app=initializeApp({credential:cert(sa),projectId:'ays-orbit-360-lab'});
 const db=getFirestore(app),auth=getAuth(app);
 const docs=(await db.collection('tenants').doc(tid).collection('members').get()).docs;
 const valid=[],diagnostic={membershipDocuments:docs.length,
   canonicalActiveCandidates:0,contradictoryInactivoFlag:0,authLookupErrors:0,
   authDisabled:0,emailNotVerified:0,authVerifiedEligible:0};
 for(const d of docs){
  const v=d.data()||{},roles=[v.rol,v.role,v.defaultRole,v.rolDefault,...(v.roles||[]),...(v.rolesAsignados||[])].map(norm),
   countries=[...(v.countries||[]),...(v.paises||[]),...(v.paisesAutorizados||[])].map(x=>String(x||'').toUpperCase()),
   states=[v.status,v.estado].filter(Boolean).map(norm);
  if(v.uid!==d.id||v.tenantId!==tid||v.active===false||v.activo===false||!states.length||
    states.some(x=>!['active','activo'].includes(x)))continue;
  diagnostic.canonicalActiveCandidates++;
  if(v.inactivo===true){diagnostic.contradictoryInactivoFlag++;continue;}
  try{const a=await auth.getUser(d.id);
    if(a.disabled){diagnostic.authDisabled++;continue;}
    if(!a.emailVerified){diagnostic.emailNotVerified++;continue;}
    valid.push({uid:d.id,roles,countries,claim:norm(a.customClaims?.giActiveRole)});
    diagnostic.authVerifiedEligible++;
  }catch{diagnostic.authLookupErrors++;}
 }
 assert(valid.length===diagnostic.authVerifiedEligible,'AUTH_VERIFIED_COUNT_PROJECTION_DRIFT');
 result.membershipEligibilityDiagnostic=diagnostic;
 let pair=null;
 for(const country of ['GT','CO']){
  const ops=valid.find(x=>x.countries.includes(country)&&['operativo','direccion'].some(z=>x.roles.includes(z)&&(!x.claim||x.claim===z)));
  const adv=valid.find(x=>x.uid!==ops?.uid&&x.countries.includes(country)&&['asesor','comercial'].some(z=>x.roles.includes(z)&&(!x.claim||x.claim===z)));
  if(ops&&adv){const opRole=['operativo','direccion'].find(role=>ops.roles.includes(role)&&(!ops.claim||ops.claim===role));
   const advRole=['asesor','comercial'].find(role=>adv.roles.includes(role)&&(!adv.claim||adv.claim===role));
   assert(opRole&&advRole,'QA_ACTOR_ROLE_RESOLUTION_MISMATCH');
   pair={country,actors:[{...ops,role:opRole},{...adv,role:advRole}]};break;}
 }
 const eligibility={totalVerifiedActiveMembership:valid.length,byCountry:{}};
 for(const country of ['GT','CO']){
  const ops=valid.filter(x=>x.countries.includes(country)&&['operativo','direccion'].some(z=>x.roles.includes(z)&&(!x.claim||x.claim===z)));
  const advisers=valid.filter(x=>x.countries.includes(country)&&['asesor','comercial'].some(z=>x.roles.includes(z)&&(!x.claim||x.claim===z)));
  eligibility.byCountry[country]={operationsEligible:ops.length,advisorEligible:advisers.length,
   distinctPairExists:ops.some(a=>advisers.some(b=>a.uid!==b.uid))};
 }
 result.actorEligibility=eligibility;
 if(!pair){result.status='DIAGNOSTIC_HOLD_NO_TWO_DISTINCT_ELIGIBLE_UIDS';result.d15='NOT_TESTED_IDENTITY_PRECONDITION';result.identityBlocker=diagnostic.authLookupErrors?'AUTH_LOOKUP_FAILURE_OR_IAM':diagnostic.contradictoryInactivoFlag?'CONTRADICTORY_MEMBER_INACTIVO':diagnostic.canonicalActiveCandidates===0?'NO_CANONICAL_ACTIVE_MEMBERS':'NO_DISTINCT_COUNTRY_ROLE_PAIR';return;}
 assert(pair.actors[0].uid!==pair.actors[1].uid,'ACTOR_PAIR_COLLISION');
 result.twoVerifiedUids=true;result.country=pair.country;
 browser=await chromium.launch({headless:true});
 for(const actor of pair.actors){
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errs=[];
  page.on('pageerror',e=>errs.push(String(e?.message||'PAGE_ERROR').slice(0,80)));
  const blockedNetwork={directFirestore:0,nonScopedCallable:0};
  await page.route('**/*',r=>{
   const url=r.request().url();
   if(url.includes('firestore.googleapis.com')){blockedNetwork.directFirestore++;return r.abort();}
   if(url.includes('cloudfunctions.net')&&!url.includes('orbit360ScopedPolicyReadPreview')){
     blockedNetwork.nonScopedCallable++;return r.abort();
   }
   return r.continue();
  });
  try{
   const token=await auth.createCustomToken(actor.uid);
   await page.goto(host+'/#/inicio',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0,null,{timeout:20000});
   const q=await page.evaluate(async({token,tid,country,role})=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    await c.modules.auth.signInWithCustomToken(c.auth,token);
    const get=async args=>{try{const x=await p.callFunction('orbit360ScopedPolicyReadPreview',
      {tenantId:tid,country,activeRole:role,...args},'us-east1');return{ok:x?.ok===true&&x?.serverScoped===true,rows:x.rows||[],row:x.row||null,error:''}}
      catch(e){return{ok:false,rows:[],row:null,error:String(e?.code||e?.message||'').slice(0,80)}}};
    const a=await get({mode:'list',collection:'negocios',pageSize:50});
    const b=await get({mode:'list',collection:'gestiones',pageSize:50});
    const deny=await get({mode:'list',collection:'negocios',activeRole:'unassigned_role',pageSize:1});
    const contacts={checked:0,conflicts:0,missing:0};
    if(a.ok)for(const row of a.rows.filter(x=>!!x.clienteId).slice(0,8)){
      const cl=await get({mode:'get',collection:'clientes',documentId:row.clienteId});
      if(!cl.ok||!cl.row){contacts.missing++;continue;}
      const p=x=>String(x||'').replace(/\D/g,''),e=x=>String(x||'').trim().toLowerCase();
      const c=cl.row;contacts.checked++;
      if(e(row.email)&&e(c.email)&&e(row.email)!==e(c.email)||
        p(row.telefono)&&p(c.telefono)&&p(row.telefono)!==p(c.telefono))contacts.conflicts++;
    }
    return{businessOk:a.ok,managementOk:b.ok,denied:!deny.ok&&
      /permission-denied|invalid-argument|unauthenticated/.test(deny.error),
      businessCount:a.rows.length,managementCount:b.rows.length,
      businessError:a.error,managementError:b.error,contacts,
      serverDocumentIds:{
        negocios:a.rows.map(x=>String(x.canonicalDocumentId||x.id||'')),
        gestiones:b.rows.map(x=>String(x.canonicalDocumentId||x.id||''))
      }};
   },{token,tid,country:pair.country,role:actor.role});
   result.contactPairsChecked+=q.contacts.checked;
   result.contactConflictsReview+=q.contacts.conflicts;
   result.contactUnavailable+=q.contacts.missing;
   const record={role:actor.role,readBusiness:q.businessOk,readManagement:q.managementOk,
     unauthorizedDenied:q.denied,readBusinessCount:q.businessCount,
     readManagementCount:q.managementCount,pageErrors:errs.length,
     requestedCountry:pair.country,uiRoutes:{},hydration:{},blockedNetwork:{}};
   assert(q.businessOk&&q.managementOk&&q.denied,'READ_SCOPES_NOT_CONFIRMED_'+actor.role);
   assert(!errs.length,'PAGE_ERROR_'+actor.role);
   // The previously green UI assertion only proved .kanban existed. Compare
   // identical authenticated source IDs to the hydrated store, then to each
   // projected board. Keep IDs in isolated browser memory, never in evidence.
   try{
    record.activation=await page.evaluate(async()=>{
      if(!Orbit.productAppP0?.activate)throw Error('APP_ACTIVATE_UNAVAILABLE');
      const r=await Orbit.productAppP0.activate();
      return {started:Orbit.productAppP0?.isStarted?.()===true,
        ready:r?.ready===true,status:String(r?.status||'').slice(0,65)};
    });
    // Reproduce the exact role/country used for the protected read using
    // the application's ordinary selectors. This changes the isolated
    // browser view only (no tenant, Firestore, or operational write).
    record.viewSelection=await page.evaluate(({targetRole,targetCountry})=>{
      const n=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .toLowerCase().replace(/[^a-z0-9]+/g,'');
      const roles=Orbit.session?.allowedRoles?.()||[];
      const selected=roles.find(x=>n(x)===n(targetRole));
      if(!selected)return{ok:false,reason:'ROLE_NOT_ASSIGNED_TO_UI_SESSION',roleAvailable:false};
      const countrySel=document.getElementById('pais-sel');
      if(!countrySel||![...countrySel.options].some(x=>x.value===targetCountry))
        return{ok:false,reason:'COUNTRY_SELECTOR_UNAVAILABLE',roleAvailable:true};
      if(Orbit.session?.set?.(selected)!==true)
        return{ok:false,reason:'ROLE_SELECTOR_REJECTED',roleAvailable:true};
      countrySel.value=targetCountry;
      countrySel.dispatchEvent(new Event('change',{bubbles:true}));
      return{ok:true,roleAvailable:true};
    },{targetRole:actor.role,targetCountry:pair.country});
    if(!record.viewSelection.ok)throw Error(record.viewSelection.reason);
    await page.waitForFunction(({targetRole,targetCountry})=>{
      const n=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
      return n(Orbit.session?.rol?.())===n(targetRole)&&
        String(Orbit.pais||'').toUpperCase()===targetCountry;
    },{targetRole:actor.role,targetCountry:pair.country},{timeout:5000});
    await page.evaluate(()=>{Orbit.store?._ensureCollections?.(['negocios','gestiones']);});
    await page.waitForFunction(()=>{
      const st=Orbit.store?._productStatus?.()||{},required=['negocios','gestiones'];
      const ok=st.serverConfirmedCollections||[],denied=st.deniedCollections||[],errors=st.snapshotErrors||{};
      return required.every(k=>ok.includes(k))||
        required.some(k=>denied.includes(k)||Object.prototype.hasOwnProperty.call(errors,k));
    },null,{timeout:12000}).catch(()=>{});
    record.hydration=await page.evaluate(ids=>{
      const store=Orbit.store,st=store?._productStatus?.()||{},
        getRows=k=>{try{return store?.all?.(k)||[]}catch{return[]}},
        allNames=(st.serverConfirmedCollections||[]),snapshotErrors=st.snapshotErrors||{},
        counts={};
      for(const k of ['negocios','gestiones']){
        const rows=getRows(k),keys=new Set(rows.map(x=>String(x.canonicalDocumentId||x.id||'')));
        counts[k]={storeRows:rows.length,serverPageRows:ids[k].length,
          serverIdsPresentInStore:ids[k].filter(id=>keys.has(id)).length,
          serverConfirmed:allNames.includes(k),denied:(st.deniedCollections||[]).includes(k),
          hasSnapshotError:!!snapshotErrors[k]};
      }
      return{status:String(st.status||''),ready:st.ready===true,
        requiredConfirmed:['negocios','gestiones'].every(k=>allNames.includes(k)),
        counts,role:String(Orbit.session?.rol?.()||'').toLowerCase(),
        country:String(Orbit.pais||'').toUpperCase(),
        started:Orbit.productAppP0?.isStarted?.()===true};
    },q.serverDocumentIds);
    for(const moduleKey of ['ops','leads']){
      await page.evaluate(k=>{if(Orbit.router?.go)Orbit.router.go(k);else location.hash='#/'+k;},moduleKey);
      await page.waitForFunction(k=>Orbit.route?.key===k,moduleKey,{timeout:7000}).catch(()=>{});
      await page.waitForTimeout(350);
      record.uiRoutes[moduleKey]=await page.evaluate(k=>{
        const board=k==='ops'?Orbit.ciclo?.opsBoard?.():Orbit.ciclo?.leadsBoard?.();
        const all=Array.isArray(board)?board:[];
        const countItems=all.reduce((n,col)=>n+(col.items?.length||0),0);
        const visibleItems=k==='ops'?all.reduce((n,col)=>n+(col.items||[])
          .filter(it=>!Orbit.access?.canView||Orbit.access.canView(
            it.kind==='negocio'?'negocios':'gestiones',it.rec,'ops')).length,0):countItems;
        const text=String(document.querySelector('#host')?.innerText||'');
        const authorized=Orbit.access?.can?.(k,'view')===true;
        return{route:String(Orbit.route?.key||''),moduleAuthorized:authorized,
          hasBoard:!!document.querySelector('#host .kanban'),
          deniedNotice:/No tienes acceso con el rol activo/.test(text),
          cards:document.querySelectorAll('#host [data-neg],#host [data-ges]').length,
          boardCandidates:countItems,boardExpectedVisible:visibleItems,
          boardColumns:all.length,preAuth:document.body.classList.contains('pre-auth'),
          horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2};
      },moduleKey);
    }
   }catch(e){record.uiRoutes.diagnosticError=String(e?.code||e?.message||e).slice(0,110);}
   record.blockedNetwork=blockedNetwork;
   record.pageErrors=errs.length;
   record.roleAligned=record.hydration.role===actor.role;
   record.countryComparable=record.hydration.country===pair.country;
   const h=record.hydration;
   record.serverStoreComparable=record.roleAligned&&record.countryComparable&&h.requiredConfirmed===true;
   record.serverRowsAbsent=record.serverStoreComparable&&Object.values(h.counts||{})
     .some(x=>x.serverIdsPresentInStore<x.serverPageRows);
   record.uiProjectionCoherent=['ops','leads'].every(k=>{
     const x=record.uiRoutes[k];return x&&x.route===k&&
       (x.moduleAuthorized?x.hasBoard&&!x.deniedNotice&&
         x.cards===x.boardExpectedVisible:x.deniedNotice);
   });
   result.actors.push(record);
  }finally{await ctx.close();}
 }
 result.d15=result.contactConflictsReview?'SAMPLED_CONTACT_CONFLICT_REVIEW_REQUIRED':
   result.contactPairsChecked?'SAMPLED_CONTACT_READBACK_NO_CONFLICT':'NO_COMPARABLE_SAMPLE_HOLD';
 result.uiReadOnlyEvaluated=true;
 result.uiReadOnlyReady=result.actors.every(a=>a.uiProjectionCoherent&&
   a.hydration.requiredConfirmed&&a.activation?.started&&a.pageErrors===0);
 result.serverStoreComparability=result.actors.map(a=>({
   role:a.role,roleAligned:a.roleAligned,countryComparable:a.countryComparable,
   fullyHydrated:a.hydration.requiredConfirmed,serverRowsAbsent:a.serverRowsAbsent,
   projectionCoherent:a.uiProjectionCoherent
 }));
 const comparable=result.actors.every(a=>a.serverStoreComparable===true);
 const mismatch=result.actors.some(a=>a.serverRowsAbsent||!a.uiProjectionCoherent);
 result.status=!comparable?'QA_PRECONDITION_ROLE_COUNTRY_OR_HYDRATION_NOT_COMPARABLE':
   mismatch?'SERVER_STORE_OR_UI_PARITY_MISMATCH_DIAGNOSTIC_NOT_ACCEPTED':
   result.uiReadOnlyReady?'TWO_UID_SERVER_STORE_UI_PARITY_READONLY_PASS_WRITES_PENDING':
   'TWO_UID_UI_ACTIVATION_OR_RENDER_NOT_READY_DIAGNOSTIC';
}
main().catch(e=>{result.status='HOLD_OR_QA_FAIL';result.errors.push(String(e?.message||e).slice(0,130));process.exitCode=1})
.finally(async()=>{try{if(browser)await browser.close()}catch{}
 try{if(app)await deleteApp(app)}catch{}
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 console.log('COMMERCIAL_TWO_UID_READONLY='+result.status+' UID_DISTINCT='+result.twoVerifiedUids+
   ' CONTACTS='+result.contactPairsChecked+' CONFLICTS='+result.contactConflictsReview+' WRITES=0');
});
