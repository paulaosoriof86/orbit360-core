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
  ['orbit360-platform/modules/policy-receipts-v1199-bridge.js','protectedPreviewRealPolicy',['id']]
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
  const fx=require('./gravicentra-i6-6-advisor-payables-signed-uat.cjs').fixtures('b4003qa_i66_cxp_transport_unit');
  const base={tenantId:'alianzas-soluciones',activeRole:'Dirección',advisorPayable:fx.specs[0]};
  const changed=patch=>({...base,advisorPayable:{...base.advisorPayable,...patch}});
  const canonical={version:1,operation:'preview',advisorId:fx.ids.advisor70,cutoff:'2026-11-15',syntheticQa:true,commissionIds:[fx.plans[0].commission.id]};
  const restore={version:1,operation:'restoreSynthetic',syntheticQa:true,preparedRequestId:'advisorpay_'+'a'.repeat(32)};
  const allowed=[base,{...base,activeRole:'Operativo'},changed({operation:'prepare',previewDigest:'b'.repeat(64)}),
    {...base,advisorPayable:canonical},{...base,advisorPayable:restore},{...base,mutations:[]}];
  for(const input of allowed){
    // The harness has no Firebase config/SDK/network. This exact error proves
    // the bounded transport reached initialization, not that authorization or
    // a business write passed. The signed server denial remains mandatory.
    await assert.rejects(preview.callFunction('orbit360ProductOperationalCommandPreview',input,'us-east1'),
      /^Error: PRODUCT_RUNTIME_NOT_CONFIGURED$/,'authorized synthetic CxP transport must reach signed initialization');
  }
  const denied=[
    {...base,tenantId:'foreign-tenant'},changed({version:2}),changed({operation:'pay'}),
    changed({syntheticQa:false}),changed({syntheticQa:undefined}),changed({advisorId:'advisor-real'}),
    changed({advisorId:'real_b4003qa_suffix'}),changed({cutoff:''}),changed({cutoff:'not-a-date'}),
    changed({lines:[]}),changed({lines:null}),changed({lines:{}}),changed({commissionIds:null}),
    changed({commissionIds:{}}),changed({lines:Array(41).fill(fx.specs[0].lines[0])}),
    changed({lines:[null]}),changed({lines:[[]]}),changed({lines:[{polizaId:'policy-real'}]}),
    changed({lines:[{...fx.specs[0].lines[0],commissionId:'real-commission'}]}),
    changed({commissionIds:[fx.plans[0].commission.id]}),
    {...base,advisorPayable:{...canonical,commissionIds:['real-commission']}},
    {...base,advisorPayable:{...restore,preparedRequestId:'request-real'}},
    {...base,advisorPayable:{...restore,advisorId:'advisor-real'}},
    {...base,advisorPayable:{...restore,lines:[]}},
    {...base,advisorPayable:{...restore,commissionIds:[]}},
    {...base,advisorPayable:{...restore,syntheticQa:false}},
    {...base,mutations:null},{...base,mutations:{}},
    {...base,mutations:[{collection:'finmovs',id:'real-debt',action:'update',payload:{estado:'pagado'}}]},
    {...base,mutations:[{collection:'finmovs',id:fx.ids.ordinary,action:'update',payload:{__syntheticQa:true}}]}
  ];
  for(const input of denied)await assert.rejects(preview.callFunction('orbit360ProductOperationalCommandPreview',input,'us-east1'),
    /I66_PREVIEW_MUTATION_CALLABLE_DENIED/,'real, malformed, mixed or out-of-contract CxP remains blocked before network');
  for(const input of allowed){
    await assert.rejects(preview.callFunction('orbit360ProductOperationalCommandPreview',input,'us-central1'),/I66_PREVIEW_REGION_DENIED/);
    await assert.rejects(preview.callFunction('orbit360ProductOperationalCommand',input,'us-central1'),/I66_PREVIEW_REGION_DENIED/);
    await assert.rejects(preview.callFunction('orbit360ProductOperationalCommand',input,'us-east1'),/I66_PREVIEW_MUTATION_CALLABLE_DENIED/);
  }
  console.log('I6_6_PREVIEW_CXP_BOUNDED_SYNTHETIC_TRANSPORT_REGRESSION_PASS accepted='+allowed.length+' rejected='+denied.length+' liveAndWrongRegionRejected='+allowed.length*3);
  console.log('I6_6_PREVIEW_ALL_WRITE_CALLABLES_FAIL_CLOSED_PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
