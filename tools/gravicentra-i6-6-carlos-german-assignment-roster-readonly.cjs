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
const ORIGINS=['https://app.aysseguros.com','https://ays-orbit-360-lab--gi-i66-rc-44635291863-jq6kji80.web.app'];
(async()=>{
 const [members,advisors]=await Promise.all([
  tenant.collection('members').limit(180).get(),
  tenant.collection('data').doc('asesores').collection('items').limit(450).get()]);
 assert.ok(members.size<180&&advisors.size<450,'SIGNED_ROSTER_SCAN_UNBOUNDED');
 const advisorCarlos=advisors.docs.filter(d=>{
   const a=d.data()||{};return [a.nombre,a.nombreCompleto,a.displayName,a.name].some(v=>norm(v).startsWith('carlos castro'));
 });
 const ids=new Set(advisorCarlos.map(d=>d.id)),uids=new Set();
 for(const d of advisorCarlos){const a=d.data()||{};for(const value of [a.authUid,a.uid,a.userId])if(value)uids.add(String(value));}
 const carlos=members.docs.filter(d=>{
   const r=d.data()||{};
   const linked=[r.nombre,r.displayName,r.name,r.nombreCompleto,r.fullName].some(v=>norm(v).startsWith('carlos castro'))||
     ids.has(String(r.advisorId||r.asesorId||''))||uids.has(d.id);
   return linked&&norm(r.activeRole)==='operativo'&&r.active!==false&&r.activo!==false;
 });
 assert.equal(carlos.length,1,'CARLOS_OPERATIVO_MEMBERSHIP_NOT_UNIQUE');
 const german=advisors.docs.filter(d=>{
   const r=d.data()||{};return [r.nombre,r.displayName,r.name,r.nombreCompleto].some(v=>norm(v).includes('german')&&norm(v).includes('reyes'));
 });
 assert.equal(german.length,1,'GERMAN_CANONICAL_IDENTITY_NOT_UNIQUE');
 const germanId=german[0].id;
 const priscila=advisors.docs.filter(d=>[d.data().nombre,d.data().displayName,d.data().name,d.data().nombreCompleto].some(v=>norm(v).includes('priscila')));
 assert.equal(priscila.length,1,'PRISCILA_CANONICAL_IDENTITY_NOT_UNIQUE');
 const priscilaId=priscila[0].id;
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
    const result=await page.evaluate(async ({token,germanId,priscilaId,newPreview})=>{
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
     let modalVisible=false,optionCount=0,optionGerman=false,optionPriscila=false,selectDisabled=true,modalError='';
     try{
      await Orbit.ciclo.nuevoNegocio({pais:'GT'});
      const select=document.getElementById('nn-ase');
      modalVisible=!!select;
      optionCount=select?.options?.length||0;
      optionGerman=!!select&&[...select.options].some(o=>o.value===germanId);
       optionPriscila=!!select&&[...select.options].some(o=>o.value===priscilaId);
      selectDisabled=!!select?.disabled;
     }catch(e){modalError=String(e.code||e.message||e).slice(0,180);}
     document.querySelectorAll('#ciclo-modal').forEach(n=>n.remove());
     // Production incident: Carlos creates policies from Cliente 360 / Pólizas,
     // not only a prospect from Ops. A PASS for Ops must not certify this other
     // selector. Exercise the exact effective modal without saving anything.
     let policyClientReady=false,policyModalVisible=false,policyGerman=false;
     let policyOptionCount=0,policyDisabled=true,policyPriscila=false,policyModalError='';
      let gtClient=null;
     try{
       const scoped=(Orbit.store?.all?.('clientes')||[]);
       gtClient=scoped.find(c=>c?.id&&String(c.pais||'').toUpperCase()==='GT'&&!c.archivado);
       policyClientReady=!!gtClient;
       if(gtClient){
         await Orbit.modules.cliente360.nuevaPoliza(gtClient.id);
         const cutoff=Date.now()+12000;
         let picker=document.querySelector('#policy-v1199 [data-advisor]');
         while(picker&&picker.disabled&&Date.now()<cutoff){
           await new Promise(resolve=>setTimeout(resolve,120));
           picker=document.querySelector('#policy-v1199 [data-advisor]');
         }
         policyModalVisible=!!picker;
         policyOptionCount=picker?.options?.length||0;
         policyGerman=!!picker&&[...picker.options].some(o=>o.value===germanId);
          policyPriscila=!!picker&&[...picker.options].some(o=>o.value===priscilaId);
         policyDisabled=picker?.disabled!==false;
       }
     }catch(e){policyModalError=String(e.code||e.message||e).slice(0,180);}
     document.querySelectorAll('#policy-v1199').forEach(n=>n.remove());
      // Actual incident reported by Carlos: edit existing client, not only Ops/policy.
      // No form submissions here. Verify source-backed selector state for both people.
      let editVisible=false,editGerman=false,editPriscila=false,editReady=false,editError='';
      let createVisible=false,createGerman=false,createPriscila=false,createReady=false,createError='';
      if(newPreview&&gtClient){
        const waitRoster=async selector=>{
          for(let n=0;n<55;n++){
            const el=document.querySelector(selector);
            if(!el||el.dataset.rosterState==='ready'||el.dataset.rosterState==='blocked')return el;
            await new Promise(resolve=>setTimeout(resolve,160));
          }
          return document.querySelector(selector);
        };
        try{
          Orbit.modules.cliente360.edit(gtClient.id);
          const node=await waitRoster('#ce-ase');
          editVisible=!!node;editReady=node?.dataset.rosterState==='ready'&&node.disabled===false;
          editGerman=!!node&&[...node.options].some(o=>o.value===germanId);
          editPriscila=!!node&&[...node.options].some(o=>o.value===priscilaId);
        }catch(error){editError=String(error.code||error.message||error).slice(0,160);}
        document.querySelectorAll('#c360-edit').forEach(n=>n.remove());
        try{
          Orbit.modules.cliente360.nuevoCliente();
          const node=await waitRoster('#v1198-ase');
          createVisible=!!node;createReady=node?.dataset.rosterState==='ready'&&node.disabled===false&&document.getElementById('crm-new-client-v1198')!==null;
          createGerman=!!node&&[...node.options].some(o=>o.value===germanId);
          createPriscila=!!node&&[...node.options].some(o=>o.value===priscilaId);
        }catch(error){createError=String(error.code||error.message||error).slice(0,160);}
        document.querySelectorAll('#crm-new-client-v1198,#cli-nuevo').forEach(n=>n.remove());
      }
     return {
       started:activated?.started===true,
       role,preview:provider.isI66PreviewHost(),
       callable:roster?.status?.().functionName,region:roster?.status?.().region,
       beforeCount:before.length,serverCount:rows.length,serverGerman:rows.some(r=>r.id===germanId),
       callError:error,modalVisible,optionCount,optionGerman,optionPriscila,selectDisabled,modalError,
       policyClientReady,policyModalVisible,policyOptionCount,policyGerman,policyPriscila,policyDisabled,policyModalError,
       editVisible,editGerman,editPriscila,editReady,editError,createVisible,createGerman,createPriscila,createReady,createError
     };
    },{token,germanId,priscilaId,newPreview:origin.includes('--gi-i66-rc-44635291863-')});
    console.log('I66_CARLOS_GERMAN_SIGNED_ROSTER_READONLY '+JSON.stringify({origin:origin.includes('--')?'preview':'live',...result}));
    assert.equal(norm(result.role),'operativo','CARLOS_ACTIVE_ROLE_NOT_OPERATIVO');
    if(!result.started||result.callError||!result.serverGerman||!result.optionGerman||!result.optionPriscila||!result.policyClientReady||!result.policyModalVisible||!result.policyGerman||!result.policyPriscila||result.policyDisabled||result.policyModalError)
      throw Error('I66_CARLOS_GERMAN_PRISCILA_OPS_AND_POLICY_SELECTOR_NOT_READY_'+(origin.includes('--')?'PREVIEW':'LIVE'));
     if(origin.includes('--gi-i66-rc-44635291863-')&&(!result.editVisible||!result.editReady||!result.editGerman||!result.editPriscila||result.editError||!result.createVisible||!result.createReady||!result.createGerman||!result.createPriscila||result.createError))
       throw Error('I66_CARLOS_EDIT_AND_NEW_CLIENT_SIGNED_TEAM_ROSTER_NOT_READY_PREVIEW');
   }finally{await context.close();}
  }
 }finally{await browser.close();}
 console.log('I66_CARLOS_GERMAN_PRISCILA_OPS_POLICY_EDIT_NEW_SIGNED_PREVIEW_PASS noDataWrites=true noLiveWrite=true');
})().catch(e=>{console.error('I66_CARLOS_GERMAN_SIGNED_HOLD '+String(e.message||e).slice(0,210));process.exitCode=1;})
 .finally(()=>admin.app().delete());
