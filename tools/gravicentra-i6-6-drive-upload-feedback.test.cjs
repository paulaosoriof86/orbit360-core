'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/core/product-drive-document-provider-p0.js'),'utf8');

function launch(uploadResult,tenantStatus){
  const calls=[];
  const Orbit={session:{rol:()=> 'Operativo'},secureResources:{registerDocumentProvider(p){this.documentProvider=p;}}};
  Orbit.productRuntimeBrowserProvidersP0={async callFunction(name,data,region){
    calls.push({name,data,region});
    if(/Status/.test(name))return tenantStatus;
    if(/Upload/.test(name)){
      if(uploadResult instanceof Error)throw uploadResult;
      return uploadResult;
    }
    throw Error('UNEXPECTED_CALL_'+name);
  }};
  class FileReader{readAsDataURL(){this.result='data:application/pdf;base64,QQ==';this.onload();}}
  const ctx={window:{Orbit,__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{tenantHint:'alianzas-soluciones'}},
    Orbit,document:{addEventListener(){}},location:{hostname:'app.aysseguros.com',origin:'https://app.aysseguros.com'},
    FileReader,setTimeout(){return 1;},setInterval(){return 1;},clearInterval(){},Date,Map,Promise,Error};
  vm.runInNewContext(source,ctx,{filename:'product-drive-document-provider-p0.js'});
  return{provider:Orbit.secureResources.documentProvider,calls};
}
const file={name:'renovacion-emitida.pdf',type:'application/pdf',size:1};
const extra={entidad:'gestion',entidadId:'gestion_qa',clienteId:'cliente_qa',sourceModule:'renovaciones'};

test('Drive missing tenant connection reports actionable administrative cause without claiming saved file',async()=>{
  const x=launch(Error('functions/failed-precondition'),{status:'tenant_setup_required',bootstrapRequired:true,configured:false});
  const r=await x.provider.upload(file,extra);
  assert.equal(r.ok,false);
  assert.equal(r.status,'tenant_setup_required');
  assert.equal(r.action,'configurar_drive');
  assert.match(r.message,/Dirección.*Configurar Drive/);
  assert.match(r.message,/no se guardó/);
  assert.deepEqual(x.calls.map(x=>x.name),['orbit360DocumentDriveUpload','orbit360DocumentDriveStatus']);
});

test('Drive invalid tenant connection reports reconnect, not billing or user role speculation',async()=>{
  const x=launch(Error('functions/failed-precondition'),{status:'tenant_connection_invalid',configured:true});
  const r=await x.provider.upload(file,extra);
  assert.equal(r.ok,false);
  assert.equal(r.status,'tenant_connection_invalid');
  assert.equal(r.action,'reconectar_drive');
});

test('Drive permission denial preserves its status when tenant backend is connected',async()=>{
  const x=launch(Error('functions/permission-denied'),{status:'disponible',configured:true,available:true});
  const r=await x.provider.upload(file,extra);
  assert.equal(r.ok,false);
  assert.equal(r.status,'sin_permiso');
  assert.match(r.message,/permisos de la gestión/);
});

test('Confirmed document upload retains canonical reference and never triggers speculative status probe',async()=>{
  const x=launch({ok:true,documentRef:'12345678901234567890',driveUrl:'https://drive.google.com/file/d/12345678901234567890/view'},{status:'tenant_setup_required'});
  const r=await x.provider.upload(file,extra);
  assert.equal(r.ok,true);
  assert.equal(r.documentRef,'12345678901234567890');
  assert.deepEqual(x.calls.map(x=>x.name),['orbit360DocumentDriveUpload']);
});
