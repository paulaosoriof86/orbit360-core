'use strict';
// B4-003: isolated post-auth diagnostic + read-only UAT guard regression.
// In-memory only: no Firebase session, network, auth token or operational write.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const bootstrap=fs.readFileSync('orbit360-platform/core/backend-product-readonly-bootstrap-p0.js','utf8');
const app=fs.readFileSync('orbit360-platform/core/product-app-p0.js','utf8');
const auth=fs.readFileSync('orbit360-platform/core/auth-product-runtime-p0.js','utf8');
const tenant='synthetic-tenant';
const role={uid:'test-uid',email:'test@example.invalid',tenantId:tenant,
  status:'active',activeRole:'asesor',roles:['asesor'],countries:['GT'],modulesExtra:[],modulesRestricted:[]};
const bootOwner={
  membershipMultirolEffectiveP0:{normalize:x=>x,validate:x=>({ok:true,membership:x,errors:[]}),effectiveModules:()=>[]},
  tenantCanonicalPathsP0:{VERSION:'mock',validateTenantId:x=>({ok:x===tenant,tenantId:x})},
  tenantAccessPolicyProductP0:{VERSION:'mock'},
  productQueryPlannerP0:{createPlanner:()=>()=>({ok:true})},
  backendProductReadinessP0:{readiness:()=>({ok:true})},
  createFirestoreProductReadOnlyStoreP0:()=>{throw new Error('private@example.invalid token/secret');}
};
const bootWindow={Orbit:bootOwner,dispatchEvent:()=>{}};
vm.runInNewContext(bootstrap,{window:bootWindow,Promise,console,Date,setTimeout,
  CustomEvent:function(){}},{timeout:1000});
const deps={environmentProvider:{describePublicConfig:async()=>({})},
  firebaseAdapter:{initializeFromEnvironment:async()=>({db:{}}),storeDependencies:()=>({db:{}})},
  authProvider:{waitForAuthenticatedUser:async()=>({uid:'test-uid',email:'test@example.invalid'})},
  membershipProvider:{getByUid:async()=>role},protectedReadPage:async()=>({ok:true})};
const opts={mode:'product',authorizedProductReadOnly:true,runtimeAuthorized:true,
  protectedReadCandidate:true,collections:['clientes']};
(async()=>{
  const failure=await bootOwner.backendProductReadOnlyBootstrapP0.start(deps,opts);
  assert.equal(failure.ok,false);
  assert.equal(failure.status.phase,'blocked');
  assert.equal(failure.status.failurePhase,'planning');
  assert.equal(failure.status.failureCode,'PLANNING_FAILED');
  assert.deepEqual(Array.from(failure.status.errors),['PLANNING_FAILED']);
  assert.ok(!JSON.stringify(failure.status).includes('private@example.invalid'));

  bootOwner.createFirestoreProductReadOnlyStoreP0=()=>({
    _productStatus:()=>({ready:false,status:'snapshot-error'}),
    _attachSnapshots:()=>true,_detachSnapshots:()=>{}
  });
  const snapshot=await bootOwner.backendProductReadOnlyBootstrapP0.start(deps,opts);
  assert.equal(snapshot.ok,false);
  assert.equal(snapshot.status.failurePhase,'waiting-snapshots');
  assert.equal(snapshot.status.failureCode,'STORE_SNAPSHOT_ERROR');
  const preflight=await bootOwner.backendProductReadOnlyBootstrapP0.start(deps,{...opts,runtimeAuthorized:false});
  assert.equal(preflight.status.failurePhase,'preflight');
  assert.equal(preflight.status.failureCode,'BOOTSTRAP_PREFLIGHT_REJECTED');

  const warnings=[];
  const appWindow={Orbit:{
    productRuntimeBrowserProvidersP0:{dependencies:()=>({})},
    backendProductReadOnlyBootstrapP0:{start:async()=>({ok:false,ready:false,writeAuthorized:false,
      status:{failurePhase:'membership',failureCode:'MEMBERSHIP_REJECTED',
        errors:['private@example.invalid /tenant/secret/token']}})},
    productHydrationRequiredOptionalP0:{contract:()=>({required:['clientes']})}
  },location:{hostname:'ays-orbit-360-lab--gi-i65-b4-synthetic.web.app'},
    __ORBIT360_PRODUCT_PUBLIC_CONFIG__:{enabled:true,scopedReadPreviewCandidate:true}};
  vm.runInNewContext(app,{window:appWindow,Orbit:appWindow.Orbit,Promise,
    console:{warn:(...args)=>warnings.push(args)},
    document:{querySelector:()=>null,dispatchEvent:()=>{}},CustomEvent:function(){}},{timeout:1000});
  await assert.rejects(appWindow.Orbit.productAppP0.activate(),/PRODUCT_READONLY_BOOTSTRAP_NOT_READY/);
  assert.equal(warnings.length,1);
  assert.equal(warnings[0].length,1);
  assert.equal(warnings[0][0],
    '[Orbit Product] READONLY_BOOTSTRAP_BLOCKED phase=membership code=MEMBERSHIP_REJECTED detail=UNKNOWN_DETAIL');
  assert.ok(!JSON.stringify(warnings).includes('private@example.invalid'));

  // Call actual self-sync helper from its IIFE in sandbox; no real callable.
  const hostCase=async(hostname,flag)=>{
    let count=0;
    const w={Orbit:{},location:{hostname},__ORBIT360_PRODUCT_PUBLIC_CONFIG__:{
      tenantHint:tenant,scopedReadPreviewCandidate:flag}};
    const instrumented=auth.replace(/\}\)\(\);\s*$/,
      'window.__qaSyncSelfAccess=syncSelfAccess;\n})();');
    vm.runInNewContext(instrumented,{window:w,Promise,console},{timeout:1000});
    await w.__qaSyncSelfAccess({callFunction:async(name,body,region)=>{
      count++;
      assert.equal(name,'orbit360ProvisionTeamAccess');
      assert.equal(body.operation,'sync_self_auth_state');
      assert.equal(region,'us-central1');
      return {ok:true};
    }});
    return count;
  };
  const scoped='ays-orbit-360-lab--gi-i65-b4-synthetic.web.app';
  assert.equal(await hostCase(scoped,true),0,'READONLY_PREVIEW_MUST_NOT_SYNC_MUTABLY');
  assert.equal(await hostCase(scoped,false),1,'HOST_WITHOUT_FLAG_MUST_NOT_SKIP');
  assert.equal(await hostCase('ays-orbit-360-lab.web.app',true),1,'LIVE_BEHAVIOR_UNCHANGED');
  assert.equal(await hostCase('ays-orbit-360-lab--other.web.app',true),1,'FOREIGN_PREVIEW_UNCHANGED');
  console.log('B4_003_POST_AUTH_DIAGNOSTIC_VM_PASS checks=17 isolated_in_memory writes=0 no_network');
})().catch(error=>{console.error(error);process.exitCode=1;});
