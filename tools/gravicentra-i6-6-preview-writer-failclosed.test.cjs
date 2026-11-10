'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const readProvider=read('orbit360-platform/core/product-runtime-browser-providers-p0.js');
const oldPreview='ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app';
const newPreview='ays-orbit-360-lab--gi-i66-rc-42855090882-mbductf0.web.app';
const unknownPreview='ays-orbit-360-lab--gi-i66-bad-42999999999.web.app';
const live='app.aysseguros.com';
function providerFor(hostname){
  const window={location:{hostname},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{enabled:true,scopedReadPreviewCandidate:true}};
  vm.runInNewContext(readProvider,{window,Promise,Object}, {filename:'product-runtime-browser-providers-p0.js'});
  return window.Orbit.productRuntimeBrowserProvidersP0;
}
for(const host of [oldPreview,newPreview,unknownPreview,live]){
  const p=providerFor(host);
  assert.equal(p.protectedHostMode(),host===unknownPreview?'':host===live?'live':'preview','exact protected host classification');
  assert.equal(p.isI66PreviewHost(),host===newPreview,'strictly isolated I6.6 QA channel');
}
const bodies=[
  ['orbit360-platform/data/store-firestore-product-operational-p0.js','isB2PreviewHost',[]],
  ['orbit360-platform/modules/aseguradoras.js','isB2PreviewHost',[]],
  ['orbit360-platform/modules/cronograma.js','previewUat',[]],
  ['orbit360-platform/core/product-insurer-credential-provider-p0.js','isCertifiedPreviewHost',[]],
  ['orbit360-platform/modules/policy-receipts-v1199-bridge.js','protectedPreviewRealPolicy',['receiptId']]
];
function extractBody(source,name){
  const start=source.indexOf('function '+name+'(');
  assert(start>=0,name+' missing');
  const from=source.indexOf('{',start);
  let depth=0;
  for(let i=from;i<source.length;i++){
    if(source[i]==='{')depth++;
    if(source[i]==='}'&&--depth===0)return source.slice(from+1,i);
  }
  throw Error(name+' body unbalanced');
}
for(const [path,name,args] of bodies){
  const body=extractBody(read(path),name);
  const f=Function('location','window','Orbit','text',...args,body);
  for(const hostname of [oldPreview,newPreview,unknownPreview,live]){
    const runtime=providerFor(hostname),location={hostname},window={location},Orbit={productRuntimeBrowserProvidersP0:runtime};
    const out=f(location,window,Orbit,value=>String(value==null?'':value).trim(),...(args.length?['real_policy_123']:[]));
    const expect=hostname===oldPreview||hostname===newPreview;
    assert.equal(out,expect,path+' must protect exact Preview and avoid unknown/LIVE');
  }
}
const app=read('orbit360-platform/core/product-app-p0.js');
assert.match(app,/releaseHostMode=providers&&typeof providers\.protectedHostMode/,'product scoped bootstrap must use shared host classifier');
const insurer=read('orbit360-platform/modules/aseguradoras.js');
assert.match(insurer,/const previewHost = isB2PreviewHost\(\)/,'insurer asset upload must use shared Preview classifier');
const policy=read('orbit360-platform/modules/policy-receipts-v1199-bridge.js');
assert.match(policy,/return \(releasePreview\|\|/,'real receipt edits must be blocked on release Preview');
const deny=[
  ['orbit360ProductOperationalCommand','us-central1',{}],
  ['orbit360ProductOperationalCommandPreview','us-east1',{}],
  ['orbit360OpsLeadsCommand','us-central1',{operation:'create_management'}],
  ['orbit360OpsLeadsCommandPreview','us-east1',{operation:'create_management'}],
  ['orbit360ProductAssetUpload','us-central1',{}],
  ['orbit360ProductAssetUploadPreview','us-east1',{}],
  ['orbit360ProductInsurerCredentialCommand','us-central1',{}],
  ['orbit360ProductInsurerCredentialCommandPreview','us-east1',{operation:'read'}],
  ['orbit360CobrosReconciliationCommand','us-central1',{}],
  ['orbit360CobrosReconciliationCommandPreview','us-east1',{}],
  ['orbit360TenantDomainConfigPreview','us-east1',{action:'save',domain:'access'}],
  ['orbit360ProvisionTeamAccess','us-central1',{operation:'sync_self_auth_state'}],
  ['orbit360DocumentDriveUploadPreview','us-east1',{}],
  ['orbit360ScopedPolicyReadPreview','us-east1',{mode:'write'}],
  ['orbit360ScopedPolicyReadPreview','us-central1',{mode:'list'}]
];
(async()=>{
  const preview=providerFor(newPreview);
  for(const [name,region,data] of deny)
    await assert.rejects(preview.callFunction(name,data,region),/I66_PREVIEW_/,'I6.6 Preview must reject '+name+' before network');
  console.log('I6_6_PREVIEW_ALL_WRITE_CALLABLES_FAIL_CLOSED_PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
