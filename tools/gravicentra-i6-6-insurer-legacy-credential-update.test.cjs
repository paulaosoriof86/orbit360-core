'use strict';
// I6.6: authorized ordinary insurer edits must not replay legacy credentials.
// VM-only transport sentinel; no Firebase, actual insurer, or customer write.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('orbit360-platform/data/store-firestore-product-operational-p0.js','utf8');
const SENTINEL='QA_TRANSPORT_STOP_NO_NETWORK';
let passed=0;
function check(name,run){return Promise.resolve().then(run).then(()=>{passed++;console.log('PASS '+name);});}
function runtime({role='Dirección',countries=['GT'],row,canEdit=true,restrict=false}={}){
  const existing=Object.assign({id:'gt-qa-insurer',tenantId:'alianzas-soluciones',pais:'GT',
    nombre:'Aseguradora vigente',usuario:'legacy-internal-user',password:'legacy-hidden',
    actividad:[]},row||{});
  const transport=[];
  const member={uid:'signed-qa',tenantId:'alianzas-soluciones',productReadOnly:true,
    roles:[role],activeRole:role,countries};
  const provider={browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',
    noFallback:true,initialize:async()=>({auth:{currentUser:{uid:'signed-qa'}}}),
    callFunction:async(name,payload,region)=>{transport.push({name,payload,region});throw Error(SENTINEL);}};
  const readStore={__productReadOnlyP0:true,_productStatus:()=>({ready:true,status:'ready-read-only',
    noFallback:true,writeEnabled:false}),get:(c,id)=>c==='aseguradoras'&&id===existing.id?existing:null,
    all:c=>c==='aseguradoras'?[existing]:[],on:()=>()=>{},pref:()=>null};
  const access={can:(module,action)=>module==='aseguradoras'&&canEdit,
    canAccessRecord:(rec,module)=>module==='aseguradoras'&&!restrict&&
      rec.tenantId==='alianzas-soluciones'&&countries.includes(rec.pais)};
  const Orbit={auth:{productUser:member},session:{rol:()=>role},access,
    productRuntimeBrowserProvidersP0:provider};
  const window={Orbit,dispatchEvent:()=>{}};
  vm.runInNewContext(source,{window,Orbit,location:{hostname:'app.aysseguros.com'},
    document:{dispatchEvent:()=>{}},CustomEvent:class{},console,setTimeout,clearTimeout});
  const status=Orbit.productOperationalWriteP0.install(readStore);
  assert.equal(status.failClosed,true);
  return {store:Orbit.store,transport,existing};
}
async function accepted(runtimeOptions,patch,{batch=false}={}){
  const r=runtime(runtimeOptions);
  const operation=batch
    ?r.store.batchDurable([{action:'update',collection:'aseguradoras',id:r.existing.id,payload:patch}])
    :r.store.updateDurable('aseguradoras',r.existing.id,patch);
  await assert.rejects(operation,e=>String(e.message).includes(SENTINEL));
  assert.equal(r.transport.length,1,'one server command, never a browser Firestore write');
  const cmd=r.transport[0],mut=cmd.payload.mutations[0];
  assert.equal(cmd.name,'orbit360ProductOperationalCommand');
  assert.equal(mut.collection,'aseguradoras');
  assert.equal(mut.id,r.existing.id);
  assert.equal(mut.payload.nombre,patch.nombre);
  for(const key of ['usuario','username','password','contrasena','credential'])
    assert.equal(Object.prototype.hasOwnProperty.call(mut.payload,key),false,
      'existing sensitive field must not enter durable payload: '+key);
  return r;
}
async function denied(runtimeOptions,patch,code,{batch=false}={}){
  const r=runtime(runtimeOptions);
  const act=()=>batch?r.store.batchDurable([{action:'update',collection:'aseguradoras',
    id:r.existing.id,payload:patch}]):r.store.updateDurable('aseguradoras',r.existing.id,patch);
  try{await assert.rejects(Promise.resolve().then(act),e=>String(e.message).includes(code));}
  finally{assert.equal(r.transport.length,0,'denied update must never reach server');}
}
(async()=>{
  for(const role of ['Dirección','Operativo','Admin','AdminTenant','SuperAdmin']){
    await check(role+'_ordinary_edit_ignores_unchanged_legacy_credential_fields',()=>
      accepted({role},{nombre:'Nombre editado'}));
  }
  await check('batch_update_uses_delta_not_sensitive_existing_record',()=>
    accepted({role:'Dirección'},{nombre:'Nombre editado'},{batch:true}));
  await check('legacy_ui_update_path_no_longer_throws_before_transport',async()=>{
    const r=runtime({role:'Dirección'});
    const result=r.store.update('aseguradoras',r.existing.id,{nombre:'Nombre editado'});
    assert.equal(result.nombre,'Nombre editado');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(r.transport.length,1);
    assert.equal(r.transport[0].payload.mutations[0].payload.nombre,'Nombre editado');
    assert.equal(Object.prototype.hasOwnProperty.call(r.transport[0].payload.mutations[0].payload,'password'),false);
  });
  await check('unchanged_full_form_credentials_not_replayed_to_backend',()=>
    accepted({role:'Dirección'}, {nombre:'Nombre editado',usuario:'legacy-internal-user',
      password:'legacy-hidden'}));
  await check('changed_legacy_password_fails_closed',()=>denied({role:'Dirección'},
    {nombre:'Nombre editado',password:'NEW-SECRET'},'PRODUCT_WRITE_SECURE_INSURER_OWNER_REQUIRED'));
  await check('changed_legacy_username_fails_closed',()=>denied({role:'Operativo'},
    {nombre:'Nombre editado',usuario:'NEW-USER'},'PRODUCT_WRITE_SECURE_INSURER_OWNER_REQUIRED',{batch:true}));
  await check('country_scope_still_denies_foreign_insurer',()=>denied({role:'Dirección',countries:['CO']},
    {nombre:'Nombre editado'},'PRODUCT_WRITE_RECORD_SCOPE_DENIED'));
  await check('explicit_module_edit_denial_still_fails_closed',()=>denied({role:'Dirección',canEdit:false},
    {nombre:'Nombre editado'},'PRODUCT_WRITE_ACCESS_DENIED'));
  await check('explicit_record_restriction_still_fails_closed',()=>denied({role:'SuperAdmin',restrict:true},
    {nombre:'Nombre editado'},'PRODUCT_WRITE_RECORD_SCOPE_DENIED'));
  await check('credential_free_insert_still_validates_full_new_payload',async()=>{
    const r=runtime();
    assert.throws(()=>r.store.insertDurable('aseguradoras',{id:'new-qa',pais:'GT',
      nombre:'Nueva',password:'unsafe'}),e=>e.message==='PRODUCT_WRITE_SECURE_INSURER_OWNER_REQUIRED');
    assert.equal(r.transport.length,0);
  });
  console.log('I66_INSURER_LEGACY_CREDENTIAL_UPDATE_'+passed+'_PASS_NO_FIREBASE_WRITES');
})().catch(e=>{console.error(e);process.exitCode=1;});
