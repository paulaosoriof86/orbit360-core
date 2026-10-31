'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../functions/product-operational-domain.js'),'utf8');
const HttpsError=class extends Error{constructor(code,message){super(message);this.code=code;}};
const contract=require('../functions/goal-participation-contract');
const exportsForTest={};
const req=id=>{
  if(id==='node:crypto')return require(id);
  if(id==='firebase-admin/app')return {getApps:()=>[{}],initializeApp:()=>({})};
  if(id==='firebase-admin/firestore')return {getFirestore:()=>({}),FieldValue:{}};
  if(id==='firebase-admin/storage')return {getStorage:()=>({})};
  if(id==='firebase-functions/v2/https')return {HttpsError,onCall:(_opts,fn)=>fn};
  if(id==='./goal-participation-contract')return contract;
  if(id==='./product-active-role-contract')return {resolveProductActiveRole:()=>({activeRole:'Dirección'})};
  if(id==='./b4-003-scoped-bootstrap-reader')return {projectInsurerActivity:()=>({})};
  throw new Error('Require inesperado: '+id);
};
vm.runInNewContext(source,{require:req,exports:exportsForTest,process:{env:{}},Buffer,console,Date},
  {filename:'product-operational-domain.js'});
const previews=[
  exportsForTest.orbit360ProductOperationalCommandPreview,
  exportsForTest.orbit360ProductOperationalCommandGoalsPreview
];
for(const preview of previews)assert.equal(typeof preview,'function');
async function denied(preview,data,match){
  await assert.rejects(preview({data,auth:{uid:'actor-demo'}}),
    err=>err?.code==='permission-denied'&&match.test(err.message),String(match));
}
async function main(){
  for(const preview of previews){
    await denied(preview,{mutations:[{action:'update',collection:'asesores',id:'asesor-real',
      payload:{tipoVinculacion:'freelance',participaMetas:true}}]},/fixtures sintéticos/i);
    await denied(preview,{mutations:[{action:'update',collection:'asesores',id:'b4003qa_test',
      payload:{tipoVinculacion:'freelance',participaMetas:true}}]},/marca sintética/i);
    await denied(preview,{mutations:[{action:'update',collection:'asesores',id:'b4003qa',
      payload:{__syntheticQa:true,tipoVinculacion:'interno'}}]},/fixtures sintéticos/i);
    await denied(preview,{mutations:[]},/fixtures sintéticos/i);
  }
  process.stdout.write('PASS: 10 controles sobre ambos endpoints Preview, sin lecturas ni escrituras reales.\n');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
