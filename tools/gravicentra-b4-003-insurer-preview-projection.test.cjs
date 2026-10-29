'use strict';
// I6.5/B4-003 — in-memory Preview insurer QA projection-to-write contract.
// This test does not read Firestore, use credentials or mutate any real data.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const sourcePath=path.resolve(__dirname,'../orbit360-platform/data/store-firestore-product-operational-p0.js');
const source=fs.readFileSync(sourcePath,'utf8');
const qaId='b4003qa_human_insurer_r20';

async function scenario({host,collection='aseguradoras',id=qaId,action='update',marker,role='Operativo'}) {
  const calls=[];
  const member={uid:'synthetic-user',tenantId:'alianzas-soluciones',roles:['SuperAdmin','Operativo'],activeRole:'SuperAdmin',countries:['GT'],advisorId:'advisor-synthetic',email:'qa@example.invalid',productReadOnly:true};
  const prior={id,tenantId:member.tenantId,pais:'GT',nombre:'PRUEBA PREVIEW · Aseguradora',observaciones:'Anterior'};
  const provider={
    browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',noFallback:true,
    initialize:async()=>({auth:{currentUser:{uid:member.uid}}}),
    callFunction:async(name,data,region)=>{
      calls.push({name,data,region});
      const mutation=data.mutations[0];
      if(host.includes('--gi-') && (!/(?:^|_)(?:b3004qa|b4003qa)_[A-Za-z0-9._:-]+$/i.test(mutation.id)||mutation.payload?.__syntheticQa!==true)){
        const e=new Error('Preview requires synthetic marker');e.code='permission-denied';throw e;
      }
      return {canonicalReadback:true,canonicalReadbackCount:1,readback:[{collection:mutation.collection,id:mutation.id,action:mutation.action,exists:mutation.action!=='remove'}]};
    }
  };
  const window={Orbit:{auth:{productUser:member},session:{rol:()=>role},
    access:{can:()=>true,canAccessRecord:()=>true},productRuntimeBrowserProvidersP0:provider},dispatchEvent(){}};
  const readStore={__productReadOnlyP0:true,_productStatus:()=>({ready:true,status:'ready-read-only',noFallback:true,writeEnabled:false}),all:()=>action==='insert'?[]:[prior],get:(_collection,target)=>action!=='insert'&&target===id?prior:null,on:()=>()=>{}};
  const context={window,Orbit:window.Orbit,document:{dispatchEvent(){}},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options?.detail;}},location:{hostname:host},console,setTimeout,clearTimeout,Date,Math,JSON,Object,Array,String};
  vm.runInNewContext(source,context,{filename:sourcePath});
  window.Orbit.productOperationalWriteP0.install(readStore);
  const payload={observaciones:'Prueba de edición sin marca de proyección'};
  if(marker===true)payload.__syntheticQa=true;
  let result=null,err=null;
  try{result=await window.Orbit.store.batchDurable([{action,collection,id,payload}]);}catch(e){err=e;}
  return {calls,result,err};
}

(async()=>{
  const preview='ays-orbit-360-lab--gi-i65-b4-199860dd-40861280332-hcyw59nf.web.app';
  const live='ays-orbit-360-lab.web.app';
  const fixed=await scenario({host:preview});
  assert.equal(fixed.err,null,'Synthetic insurer edit should pass transport validation');
  assert.equal(fixed.calls.length,1);
  assert.equal(fixed.calls[0].name,'orbit360ProductOperationalCommandPreview');
  assert.equal(fixed.calls[0].region,'us-east1');
  assert.equal(fixed.calls[0].data.activeRole,'Operativo','Historical active session-role fix must remain');
  assert.equal(fixed.calls[0].data.mutations[0].payload.__syntheticQa,true);
  assert.equal(fixed.result.canonicalReadback,true);

  const deniedReal=await scenario({host:preview,id:'insurer-real-gt'});
  assert.equal(deniedReal.err?.code,'permission-denied');
  assert.equal(deniedReal.calls[0].data.mutations[0].payload.__syntheticQa,undefined,'Real ID cannot acquire QA marker');

  const deniedOther=await scenario({host:preview,collection:'clientes',id:'b4003qa_client_other'});
  assert.equal(deniedOther.err?.code,'permission-denied','Fix must not expand other synthetic collection permissions');
  assert.equal(deniedOther.calls[0].data.mutations[0].payload.__syntheticQa,undefined);

  const deniedInsert=await scenario({host:preview,action:'insert',id:'b4003qa_insurer_new'});
  assert.equal(deniedInsert.err?.code,'permission-denied','Unmarked insertion remains denied');
  assert.equal(deniedInsert.calls[0].data.mutations[0].payload.__syntheticQa,undefined);

  const unaffectedLive=await scenario({host:live});
  assert.equal(unaffectedLive.err,null);
  assert.equal(unaffectedLive.calls[0].name,'orbit360ProductOperationalCommand');
  assert.equal(unaffectedLive.calls[0].data.mutations[0].payload.__syntheticQa,undefined,'LIVE marker unaffected');

  process.stdout.write(JSON.stringify({gate:'I6.5/B4-003',test:'INSURER_PREVIEW_SYNTHETIC_MARKER_PROJECTION',scenarios:5,passed:5,previewOnly:true,realWrites:0,firestoreAccess:0,permissionChanges:0,liveDeploy:false})+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});

