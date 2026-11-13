'use strict';
// Signed, reversible Preview QA for a new policy, vehicle, receipts, portfolio,
// scoped advisor selector and Cliente 360 hydration. Never touches real records.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const admin=require('firebase-admin');
const {chromium}=require('playwright');
const ORIGIN='https://ays-orbit-360-lab--gi-i66-rc-42868854629-abj14q6n.web.app';
const SOURCE='586401bfbe1a80cfef2820982f432743af36b108';
const TENANT='alianzas-soluciones';
assert.equal(process.env.I66_PREVIEW_ORIGIN,ORIGIN,'QA_PREVIEW_ORIGIN_DRIFT');
assert.equal(process.env.I66_PREVIEW_SOURCE_SHA,SOURCE,'QA_PREVIEW_SOURCE_DRIFT');
const credential=['SA_LAB','SA_ALT','SA_DEFAULT'].map(k=>process.env[k]).filter(Boolean)
  .map(value=>{try{return JSON.parse(value);}catch{return null;}})
  .find(value=>value?.type==='service_account'&&value.project_id==='ays-orbit-360-lab'&&value.private_key);
assert.ok(credential,'QA_FIREBASE_SIGNED_CREDENTIAL_MISSING');
admin.initializeApp({credential:admin.credential.cert(credential),projectId:'ays-orbit-360-lab'});
const tenant=admin.firestore().collection('tenants').doc(TENANT);
const auth=admin.auth(),collection=name=>tenant.collection('data').doc(name).collection('items');
const item=(name,id)=>collection(name).doc(id);
const suffix=Date.now().toString(36)+'_'+crypto.randomBytes(4).toString('hex');
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

async function actors(){
  const [members,advisors]=await Promise.all([tenant.collection('members').limit(150).get(),collection('asesores').limit(400).get()]);
  assert.ok(members.size<150&&advisors.size<400,'QA_ACTORS_QUERY_UNBOUNDED');
  const pick=(predicate,role)=>{
    const ids=new Set(),uids=new Set();
    for(const doc of advisors.docs){const row=doc.data()||{};
      if([row.nombre,row.nombreCompleto,row.displayName,row.name].some(value=>predicate(norm(value)))){
        ids.add(doc.id);[row.authUid,row.uid,row.userId].filter(Boolean).forEach(value=>uids.add(String(value)));
      }
    }
    const matches=members.docs.filter(doc=>{
      const row=doc.data()||{};
      return ([row.nombre,row.displayName,row.name,row.nombreCompleto,row.fullName].some(value=>predicate(norm(value)))||
        ids.has(String(row.advisorId||row.asesorId||''))||uids.has(doc.id))&&
        norm(row.activeRole)===role&&row.active!==false&&row.activo!==false&&
        ['active','activo'].includes(norm(row.status||row.estado))&&
        [].concat(row.countries||row.paises||[]).map(value=>String(value).toUpperCase()).includes('GT');
    });
    assert.equal(matches.length,1,'QA_ACTOR_NOT_UNIQUE_'+role);
    return{uid:matches[0].id,role};
  };
  const rows=[pick(value=>value.startsWith('carlos castro'),'operativo'),
    pick(value=>value.includes('paula')&&value.includes('osorio'),'direccion')];
  for(const actor of rows){const user=await auth.getUser(actor.uid);
    assert.ok(!user.disabled&&user.emailVerified,'QA_ACTOR_DISABLED_'+actor.role);
    actor.token=await auth.createCustomToken(actor.uid);
  }
  return rows;
}

async function runOne(browser,actor){
  const prefix='b4003qa_newpol_'+actor.role+'_'+suffix;
  const ids={client:prefix+'_client',insurer:prefix+'_insurer',policy:prefix+'_policy'};
  const operationId='qa_newpolicy_'+actor.role+'_'+suffix;
  const seed=[
    ['clientes',ids.client,{id:ids.client,tenantId:TENANT,pais:'GT',nombre:'I6.6 QA alta póliza nueva',tipo:'Persona',activo:true,
      asesorId:'',__syntheticQa:true}],
    ['aseguradoras',ids.insurer,{id:ids.insurer,tenantId:TENANT,pais:'GT',nombre:'I6.6 QA aseguradora',vinculada:true,activo:true,
      moneda:'GTQ',ramos:['Autos'],__syntheticQa:true}]
  ];
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  let page;
  try{
    for(const [name,id] of seed)assert.equal((await item(name,id).get()).exists,false,'QA_FIXTURE_ID_COLLISION');
    for(const [name,id,row] of seed)await item(name,id).create(row);
    page=await context.newPage();
    await page.goto(ORIGIN+'/#/cliente360',{waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    const session=await page.evaluate(async token=>{
      const provider=Orbit.productRuntimeBrowserProvidersP0,client=await provider.initialize();
      await client.modules.auth.setPersistence(client.auth,client.modules.auth.browserSessionPersistence);
      await client.modules.auth.signInWithCustomToken(client.auth,token);
      const activated=await Orbit.productAppP0.activate();
      return{started:activated?.started===true,role:Orbit.session?.rol?.(),
        preview:provider.isI66PreviewHost(),managePolicy:Orbit.policyReceipts?.canManagePolicies?.(),
        canEdit:Orbit.access?.can?.('polizas','edit'),newPolicy:!!Orbit.modules?.cliente360?.nuevaPoliza};
    },actor.token);
    assert.ok(session.started&&session.preview&&norm(session.role)===actor.role&&
      session.managePolicy&&session.canEdit&&session.newPolicy,
    'QA_SIGNED_ROLE_CAPABILITY_DENIED_'+actor.role+':'+JSON.stringify(session));
    await page.evaluate(async()=>{await Orbit.store._ensureCollections(['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas']);});
    await page.waitForFunction(ids=>!!Orbit.store.get('clientes',ids.client)&&!!Orbit.store.get('aseguradoras',ids.insurer),ids,{timeout:30000});
    console.log('I66_NEW_POLICY_'+actor.role.toUpperCase()+'_SIGNED_FIXTURE_HYDRATED');
    const ui=await page.evaluate(async ids=>{
      Orbit.modules.cliente360.nuevaPoliza(ids.client);
      const modal=document.getElementById('policy-v1199');
      return{present:!!modal,advisorDisabled:!!modal?.querySelector('[data-advisor]')?.disabled,
        saver:!!modal?.querySelector('[data-save]'),clientId:modal?.querySelector('[data-client]')?.value,
        choicesBefore:(modal?.querySelector('[data-advisor]')?.options?.length||0)};
    },ids);
    assert.ok(ui.present&&ui.saver&&ui.clientId===ids.client,'QA_CLIENT360_NEW_POLICY_ROUTE_MISSING_'+actor.role);
    await page.waitForFunction(()=>{
      const el=document.querySelector('#policy-v1199 [data-advisor]');
      return !!el&&!el.disabled&&el.options.length>1;
    },null,{timeout:30000});
    const roster=await page.evaluate(async()=>{
      const select=document.querySelector('#policy-v1199 [data-advisor]');
      const rows=await Orbit.assignableAdvisorRoster.list('GT',{force:true});
      const ids=rows.map(row=>row.id);
      return{count:rows.length,unique:new Set(ids).size===ids.length,
        selectCount:select.options.length,selectedNames:[...select.options].map(x=>x.textContent).slice(0,2)};
    });
    assert.ok(roster.unique&&roster.count>0&&roster.selectCount===roster.count+1,
      'QA_ADVISOR_ROSTER_NOT_CANONICAL_'+actor.role+':'+JSON.stringify(roster));
    const advisorId=await page.evaluate(()=>{
      const select=document.querySelector('#policy-v1199 [data-advisor]');
      const id=select.options[1].value;select.remove();document.getElementById('policy-v1199').remove();
      return id;
    });
    const raw={
      id:ids.policy,__syntheticQa:true,tenantId:TENANT,clienteId:ids.client,asesorId:advisorId,
      aseguradoraId:ids.insurer,pais:'GT',moneda:'GTQ',numero:'QA-NEWPOL-'+actor.role+'-'+suffix,
      ramo:'Autos',subramo:'Auto Individual',producto:'Auto Individual',tipoPoliza:'Individual',
      estado:'Vigente',renovable:true,vigenciaInicio:'2026-11-13',vigenciaFin:'2027-11-12',
      frecuencia:'Contado',formaPago:'Transferencia',conducto:'Aseguradora',cuotas:1,
      primaNeta:1000,gastosEmision:50,otros:0,ivaPct:12,comAseguradoraPct:12,comVendedorPct:50,
      vehiculo:{marca:'Toyota',linea:'QA',placa:'QA-'+suffix.slice(-6),anio:'2026',uso:'Particular',chasis:'QA-'+suffix}
    };
    const created=await page.evaluate(async input=>{
      const result=await Orbit.policyReceipts.createPolicy(input.raw,{motivo:'I6.6 QA alta reversible',operationId:input.op});
      return{ok:result?.ok===true,errors:result?.errors||[],policyId:result?.policy?.id,
        receiptExpected:result?.receipts?.expected,portfolioExpected:result?.portfolio?.expected,
        operationId:result?.operationId,serverCommit:result?.atomicServerCommit===true};
    },{raw,op:operationId});
    assert.ok(created.ok&&created.serverCommit&&created.policyId===ids.policy,
      'QA_NEW_POLICY_ATOMIC_COMMIT_FAILED_'+actor.role+':'+JSON.stringify(created));
    const [policy,receipts,portfolio,vehicles]=await Promise.all([
      item('polizas',ids.policy).get(),
      collection('recibosEsperados').where('polizaId','==',ids.policy).limit(20).get(),
      collection('carteraPrimas').where('polizaId','==',ids.policy).limit(20).get(),
      collection('vehiculos').where('polizaId','==',ids.policy).limit(20).get()
    ]);
    assert.equal(policy.data()?.operationId,operationId,'QA_NEW_POLICY_SERVER_READBACK_MISSING');
    assert.equal(receipts.size,1,'QA_NEW_POLICY_RECEIPT_COUNT_WRONG');
    assert.equal(portfolio.size,1,'QA_NEW_POLICY_PORTFOLIO_COUNT_WRONG');
    assert.equal(vehicles.size,1,'QA_NEW_POLICY_VEHICLE_MISSING');
    assert.equal(receipts.docs[0].data()?.clienteId,ids.client);
    assert.equal(portfolio.docs[0].data()?.reciboId,receipts.docs[0].id);
    assert.equal(vehicles.docs[0].data()?.clienteId,ids.client);
    await page.reload({waitUntil:'commit',timeout:30000});
    await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:30000});
    await page.evaluate(async()=>{
      const provider=Orbit.productRuntimeBrowserProvidersP0;
      await provider.initialize();await provider.waitForUser();await Orbit.productAppP0.activate();
      await Orbit.store._ensureCollections(['clientes','polizas','vehiculos','recibosEsperados','carteraPrimas']);
    });
    await page.waitForFunction(ids=>!!Orbit.store?.get?.('polizas',ids.policy)&&
      Orbit.store.get('polizas',ids.policy).clienteId===ids.client,ids,{timeout:30000});
    const readback=await page.evaluate(ids=>{
      const p=Orbit.store.get('polizas',ids.policy),c=Orbit.store.get('clientes',ids.client);
      const linked=(Orbit.store.all('polizas')||[]).filter(row=>row.clienteId===ids.client);
      return{policy:p?.id,client:c?.id,linked:linked.some(row=>row.id===ids.policy),
        receipt:(Orbit.store.all('recibosEsperados')||[]).some(row=>row.polizaId===ids.policy),
        portfolio:(Orbit.store.all('carteraPrimas')||[]).some(row=>row.polizaId===ids.policy),
        vehicle:(Orbit.store.all('vehiculos')||[]).some(row=>row.polizaId===ids.policy)};
    },ids);
    assert.ok(readback.policy===ids.policy&&readback.client===ids.client&&readback.linked&&
      readback.receipt&&readback.portfolio&&readback.vehicle,
    'QA_CLIENT360_RELOAD_LINKED_READBACK_HOLD_'+actor.role+':'+JSON.stringify(readback));
    console.log('I66_NEW_POLICY_'+actor.role.toUpperCase()+'_SIGNED_PREVIEW_ATOMIC_CREATE_CLIENT360_RELOAD_PASS');
  }finally{
    const errors=[];
    for(const name of ['actividades','vehiculos','carteraPrimas','recibosEsperados','polizas']){
      try{
        const snapshot=await collection(name).where('clienteId','==',ids.client).limit(50).get();
        assert.ok(snapshot.size<50,'QA_CLEANUP_UNBOUNDED_'+name);
        for(const doc of snapshot.docs){
          const row=doc.data()||{};
          assert.ok(row.__syntheticQa===true&&(row.id===ids.policy||
            row.clienteId===ids.client),'QA_CLEANUP_NON_SYNTHETIC_HALT_'+name);
          await doc.ref.delete();
        }
      }catch(error){errors.push(name+':'+String(error.message||error));}
    }
    for(const [name,id] of [['aseguradoras',ids.insurer],['clientes',ids.client]]){
      try{const doc=await item(name,id).get();if(doc.exists){
        assert.equal(doc.data()?.__syntheticQa,true,'QA_CLEANUP_SEED_MARKER_MISSING');
        await doc.ref.delete();
      }}catch(error){errors.push(name+':'+String(error.message||error));}
    }
    await context.close();
    assert.equal(errors.length,0,'QA_CLEANUP_REQUIRES_REVIEW:'+errors.join(';'));
    for(const name of ['clientes','aseguradoras','polizas']){
      const id=ids[name==='clientes'?'client':name==='aseguradoras'?'insurer':'policy'];
      assert.equal((await item(name,id).get()).exists,false,'QA_FIXTURE_LEFT_BEHIND_'+name);
    }
    console.log('I66_NEW_POLICY_'+actor.role.toUpperCase()+'_SYNTHETIC_CLEANUP_CONFIRMED');
  }
}

(async()=>{
  const b=await fetch(ORIGIN+'/__recovery__/build.json',{headers:{'cache-control':'no-cache'}}).then(r=>r.json());
  assert.equal(b.sourceSha,SOURCE,'QA_LIVE_OR_PREVIEW_SOURCE_MISMATCH');
  const users=await actors();
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{for(const user of users)await runOne(browser,user);}
  finally{await browser.close();}
  console.log('I66_NEW_POLICY_CLIENT360_CARLOS_PAULA_PREVIEW_SIGNED_UAT_PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
