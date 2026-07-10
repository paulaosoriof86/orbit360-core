import fs from 'node:fs';
import vm from 'node:vm';
const Orbit={};
const context={window:{Orbit},Orbit,console,Date,Math,Set,Array,String,Object,JSON,Number,Promise};
context.window.window=context.window;
vm.createContext(context);
for(const file of [
  'orbit360-platform/core/document-provider-registry-p09.js',
  'orbit360-platform/core/document-provider-bridge-p09b.js'
]) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
function assert(c,m){if(!c)throw new Error(m)}
const bridgeApi=Orbit.documentProviderBridgeP09b,registry=Orbit.documentProviderRegistryP09;
const missing=await bridgeApi.registerAvailable();
assert(!missing.ok&&missing.code==='BACKEND_REQUIRED','missing bridge honest');
const bridge={
  status:async()=>({connected:true,tasks:['excel_manifest','pdf_manifest','pdf_ocr'],region:'latam',deterministic:true,version:'1'}),
  execute:async(task,request)=>({task,documentId:request.documentId,key:'functional',apiKey:'drop',rawBytes:'drop'})
};
const registered=await bridgeApi.registerAvailable({bridge});
assert(registered.ok&&registered.tasks.length===3,'connected bridge registers');
const result=await registry.execute('excel_manifest',{tenantId:'tenant-a',aseguradoraId:'ins-a',documentId:'doc-a',fileRef:'drive://a',purpose:'training'},{tenantConfig:{documentIntelligence:{tasks:{excel_manifest:{primary:bridgeApi.PROVIDER_ID}}}}});
assert(result.ok&&result.result.key==='functional','bridge executes via registry');
assert(!('apiKey'in result.result)&&!('rawBytes'in result.result),'registry strips secrets and payload');
const disconnected=await bridgeApi.registerAvailable({bridge:{status:async()=>({connected:false,tasks:['excel_manifest']})}});
assert(!disconnected.ok,'disconnected bridge unregisters');
assert(registry.resolve('excel_manifest',{}).code==='BACKEND_REQUIRED','registry returns backend required after disconnect');
console.log('OK orbit360-test-document-provider-bridge-p09b');