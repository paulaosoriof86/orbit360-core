'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/data/store-firestore-product-operational-p0.js'),'utf8');
const previewHost='ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app';
let checks=0;
function env(role='Dirección',advisor={id:'ase-test',canonicalDocumentId:'ase-test',nombre:'Test',tipoVinculacion:'sin_clasificar'}){
  const calls=[],uid='signed-uid';
  const member={uid,tenantId:'tenant-test',activeRole:role,roles:[role],productReadOnly:true};
  const provider={browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,
    initialize:async()=>({auth:{currentUser:{uid}}}),
    callFunction:async(name,payload,region)=>{
      calls.push({name,payload,region});
      return {ok:true,canonicalReadback:true,canonicalReadbackCount:1,readback:[{collection:'asesores',id:'ase-test',action:'update',exists:true}]};
    }};
  const readStore={__productReadOnlyP0:true,_productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false}),
    get:()=>advisor,all:()=>[advisor],on:()=>{},_ensureCollections:()=>{}};
  const Orbit={auth:{productUser:member},session:{rol:()=>role},access:{can:(module,action)=>module==='equipo'&&action==='edit',canAccessRecord:()=>true},
    productRuntimeBrowserProvidersP0:provider};
  const window={Orbit,addEventListener:()=>{},dispatchEvent:()=>{},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{goalParticipationPreviewCandidate:true}};
  vm.runInNewContext(source,{Orbit,window,location:{hostname:previewHost},console,Date,CustomEvent:class{}},
    {filename:'store-firestore-product-operational-p0.js'});
  Orbit.productOperationalWriteP0.install(readStore);
  return{store:Orbit.store,calls};
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

  const ordinary=env();
  await ordinary.store.updateDurable('asesores','ase-test',{nombre:'No habilitado en Preview'});
  assert.equal(ordinary.calls[0].name,'orbit360ProductOperationalCommandGoalsPreview','El editor ordinario sigue conectado solo a fixtures');checks++;
  assert.match(source,/classifyAdvisorDurable:classifyAdvisorDurable/);checks++;
  process.stdout.write('PASS: '+checks+' checks, consent+role+canonicalId+minimum fields+real signed callable+normal preview unchanged.\n');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
