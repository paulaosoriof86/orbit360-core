'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const providers=fs.readFileSync('orbit360-platform/core/product-runtime-browser-providers-p0.js','utf8');
const auth=fs.readFileSync('orbit360-platform/core/auth-product-runtime-p0.js','utf8');
const hostBody=providers.match(/function protectedHostMode\(\)\{([\s\S]*?)\n  \}/);
assert(hostBody,'protected transport host selector must exist');
const classify=Function('window',hostBody[1]);
const host=(hostname)=>classify({location:{hostname}});

const oldPreview='ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app';
const newPreview='ays-orbit-360-lab--gi-i66-rc-42853400840-3me7zojr.web.app';
assert.equal(host(oldPreview),'preview','sealed B4 Preview must remain allowed');
assert.equal(host(newPreview),'preview','current I6.6 isolated Preview must be allowed');
assert.equal(host('ays-orbit-360-lab.web.app'),'live','canonical Firebase LIVE still uses live reader');
assert.equal(host('app.aysseguros.com'),'live','staff custom domain still uses live reader');
for(const other of ['evil.example.com','ays-orbit-360-lab--gi-i66-attacker.web.app','ays-orbit-360-lab--gi-i66-rc-trick.web.app.evil.example','not-ays-orbit-360-lab--gi-i66-rc-123.web.app'])
  assert.equal(host(other),'','no arbitrary host may select privileged scoped readers');

async function syncProbe(hostname){
  const runtime={
    location:{hostname},
    __ORBIT360_PRODUCT_PUBLIC_CONFIG__:{enabled:true,tenantHint:'alianzas-soluciones',scopedReadPreviewCandidate:true}
  };
  const probeSource=auth.replace('  window.Orbit.auth={','  window.__I66_TEST_SYNC__=syncSelfAccess;\n  window.Orbit.auth={');
  assert.notEqual(probeSource,auth,'test hook installed only in isolated VM');
  vm.runInNewContext(probeSource,{window:runtime,location:runtime.location,Promise,setTimeout,sessionStorage:{getItem:()=>null,setItem:()=>{}}},{filename:'auth-product-runtime-p0.js'});
  let invoked=0;
  await runtime.__I66_TEST_SYNC__({callFunction:async()=>{invoked++;return {ok:true};}});
  return invoked;
}
(async()=>{
  assert.equal(await syncProbe(oldPreview),0,'B4 Preview cannot call self-provisioning writer');
  assert.equal(await syncProbe(newPreview),0,'I6.6 Preview cannot call self-provisioning writer');
  assert.equal(await syncProbe('app.aysseguros.com'),1,'LIVE still uses its existing self-access contract');
  console.log('I6_6_PROTECTED_HOST_AUTH_PREVIEW_READONLY_PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
