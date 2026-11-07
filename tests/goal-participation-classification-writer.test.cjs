'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/data/store-firestore-product-operational-p0.js'),'utf8');
const previewHost='ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app';
let checks=0;
function env(role='Dirección',advisor={id:'ase-test',canonicalDocumentId:'ase-test',nombre:'Test',tipoVinculacion:'sin_clasificar'},options={}){
  const calls=[],events=[],readListeners=[],uid='signed-uid';
  const member={uid,tenantId:'tenant-test',activeRole:role,roles:[role],productReadOnly:true};
  const provider={browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,
    initialize:async()=>({auth:{currentUser:{uid}}}),
    callFunction:async(name,payload,region)=>{
      calls.push({name,payload,region});
      if(options.respond)return options.respond(name,payload,region);
      return {ok:true,canonicalReadback:true,canonicalReadbackCount:1,readback:[{collection:'asesores',id:'ase-test',action:'update',exists:true}]};
    }};
  const readStore={__productReadOnlyP0:true,_productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false}),
    get:()=>advisor,all:()=>[advisor],on:(_collection,fn)=>readListeners.push(fn),_ensureCollections:()=>{}};
  const Orbit={auth:{productUser:member},session:{rol:()=>role},access:{can:(module,action)=>module==='equipo'&&action==='edit',canAccessRecord:()=>true},
    productRuntimeBrowserProvidersP0:provider};
  const window={Orbit,addEventListener:()=>{},dispatchEvent:event=>events.push(event),__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{goalParticipationPreviewCandidate:true}};
  vm.runInNewContext(source,{Orbit,window,location:{hostname:previewHost},console,Date,CustomEvent:class{constructor(type,input){this.type=type;this.detail=input.detail;}}},
    {filename:'store-firestore-product-operational-p0.js'});
  Orbit.productOperationalWriteP0.install(readStore);
  return{store:Orbit.store,calls,events,hydrate(row){advisor=row;readListeners.forEach(fn=>fn('asesores'));}};
}
async function main(){
  const e=env();
  await assert.rejects(e.store.classifyAdvisorDurable('ase-test',{tipoVinculacion:'interno',participaMetas:false}),/PRODUCT_TEAM_REAL_DATA_CONFIRMATION_REQUIRED/);checks++;
  await assert.rejects(e.store.classifyAdvisorDurable('ase-test',{tipoVinculacion:'freelance',participaMetas:true,roles:['SuperAdmin']},true),/PRODUCT_TEAM_CLASSIFICATION_FIELDS_INVALID/);checks++;
  await assert.rejects(e.store.classifyAdvisorDurable('ase-test',{tipoVinculacion:'interno',participaMetas:true},true),/PRODUCT_TEAM_CLASSIFICATION_INVALID/);checks++;
  await assert.rejects(e.store.classifyAdvisorDurable('ase-other',{tipoVinculacion:'interno',participaMetas:false},true),/PRODUCT_TEAM_CANONICAL_ADVISOR_REQUIRED/);checks++;
  assert.equal(e.calls.length,0);checks++;

  const denial=env('Operativo');
  await assert.rejects(denial.store.classifyAdvisorDurable('ase-test',{tipoVinculacion:'interno',participaMetas:false},true),/PRODUCT_TEAM_CLASSIFICATION_ROLE_DENIED/);checks++;
  assert.equal(denial.calls.length,0);checks++;

  const success=await e.store.classifyAdvisorDurable('ase-test',{tipoVinculacion:'freelance',participaMetas:false},true);
  assert.equal(success.canonicalReadback,true);checks++;
  assert.equal(e.calls.length,1);checks++;
  assert.equal(e.calls[0].name,'orbit360ProductOperationalCommand');checks++;
  assert.equal(e.calls[0].region,'us-central1');checks++;
  const sent=JSON.parse(JSON.stringify(e.calls[0].payload));
  assert.deepEqual(sent.mutations,[{action:'update',collection:'asesores',id:'ase-test',payload:{tipoVinculacion:'freelance',participaMetas:false}}]);checks++;
  assert.equal(sent.tenantId,'tenant-test');checks++;
  assert.equal(sent.activeRole,'Dirección');checks++;
  assert.equal(Object.keys(sent.mutations[0].payload).length,2);checks++;

  // The same shared projection powers Equipo and its downstream consumers.
  assert.equal(e.store.get('asesores','ase-test').tipoVinculacion,'freelance','A confirmed save must be visible without a second write or reload');checks++;
  assert.equal(e.store.all('asesores')[0].participaMetas,false);checks++;
  assert.equal(e.store.get('asesores','ase-test').nombre,'Test','Unrelated canonical fields must survive classification');checks++;

  const acknowledged={ok:true,canonicalReadback:true,canonicalReadbackCount:1,readback:[{collection:'asesores',id:'ase-test',action:'update',exists:true}]};
  let resolveAck;
  const delayed=env('Dirección',undefined,{respond:()=>new Promise(resolve=>{resolveAck=resolve;})});
  const changes=[];
  delayed.store.on('asesores',collection=>changes.push({collection,type:delayed.store.get('asesores','ase-test').tipoVinculacion}));
  const saving=delayed.store.classifyAdvisorDurable('ase-test',{tipoVinculacion:'freelance',participaMetas:true},true);
  await Promise.resolve();await Promise.resolve();
  assert.equal(typeof resolveAck,'function');checks++;
  assert.equal(delayed.store.get('asesores','ase-test').tipoVinculacion,'sin_clasificar','Do not publish a classification before a valid server ACK');checks++;
  assert.equal(changes.length,0);checks++;
  resolveAck(acknowledged);await saving;
  assert.deepEqual(changes,[{collection:'asesores',type:'freelance'}],'Exactly one notification observes the acknowledged state');checks++;
  assert.equal(delayed.store.all('asesores')[0].participaMetas,true);checks++;
  assert.equal(delayed.events.filter(event=>event.type==='orbit:operational-write:committed').length,1);checks++;
  delayed.hydrate({id:'ase-test',canonicalDocumentId:'ase-test',nombre:'Test',tipoVinculacion:'sin_clasificar'});
  assert.equal(delayed.store.get('asesores','ase-test').tipoVinculacion,'freelance','A lagging protected-read response must not erase an acknowledged classification');checks++;
  const canonical={id:'ase-test',canonicalDocumentId:'ase-test',nombre:'Server refreshed',tipoVinculacion:'freelance',participaMetas:true};
  delayed.hydrate(canonical);
  assert.equal(delayed.store.get('asesores','ase-test').nombre,'Server refreshed','Matching canonical hydration releases the pending projection');checks++;
  delayed.hydrate({...canonical,tipoVinculacion:'interno',participaMetas:false});
  assert.equal(delayed.store.get('asesores','ase-test').tipoVinculacion,'interno','Later canonical changes remain authoritative');checks++;
  const reloaded=env('Dirección',canonical);
  assert.equal(reloaded.store.all('asesores')[0].tipoVinculacion,'freelance','Fresh install reads the durable classification');checks++;

  for(const invalid of [null,{canonicalReadback:false}, {...acknowledged,readback:[{collection:'asesores',id:'ase-test',action:'update',exists:false}]}, {...acknowledged,readback:[{collection:'asesores',id:'ase-other',action:'update',exists:true}]}]){
    const rejected=env('Dirección',undefined,{respond:async()=>invalid});
    let notifications=0;rejected.store.on('asesores',()=>notifications++);
    await assert.rejects(rejected.store.classifyAdvisorDurable('ase-test',{tipoVinculacion:'freelance',participaMetas:true},true),/PRODUCT_SERVER_CANONICAL_/);checks++;
    assert.equal(rejected.store.all('asesores')[0].tipoVinculacion,'sin_clasificar');checks++;
    assert.equal(notifications,0);checks++;
    assert.equal(rejected.events.filter(event=>event.type==='orbit:operational-write:committed').length,0);checks++;
  }
  const failed=env('Dirección',undefined,{respond:async()=>{throw Error('SIGNED_TRANSPORT_FAILURE');}});
  await assert.rejects(failed.store.classifyAdvisorDurable('ase-test',{tipoVinculacion:'interno',participaMetas:false},true),/SIGNED_TRANSPORT_FAILURE/);checks++;
  assert.equal(failed.store.get('asesores','ase-test').tipoVinculacion,'sin_clasificar');checks++;

  const ordinary=env();
  await ordinary.store.updateDurable('asesores','ase-test',{nombre:'No habilitado en Preview'});
  assert.equal(ordinary.calls[0].name,'orbit360ProductOperationalCommandGoalsPreview','El editor ordinario sigue conectado solo a fixtures');checks++;
  assert.match(source,/classifyAdvisorDurable:classifyAdvisorDurable/);checks++;
  process.stdout.write('PASS: '+checks+' checks, consent+role+canonicalId+minimum fields+signed ACK+shared projection+read hydration+failure atomicity+normal preview unchanged.\n');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

