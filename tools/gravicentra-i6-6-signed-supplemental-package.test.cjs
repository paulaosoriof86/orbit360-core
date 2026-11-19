'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

test('I6.6 immutable builder includes exactly pinned dormant configuration bridge outside canonical runtime reachability',()=>{
  const root=path.resolve(__dirname,'..');
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'gravicentra-i66-package-test-'));
  try{
    const cfg=path.join(scratch,'firebase-public.json');
    const branding=path.join(scratch,'branding.json');
    const out=path.join(scratch,'package');
    fs.writeFileSync(cfg,JSON.stringify({result:{sdkConfig:{apiKey:'public-test-key',authDomain:'ays-orbit-360-lab.firebaseapp.com',projectId:'ays-orbit-360-lab',appId:'1:000000:web:test'}}}));
    fs.writeFileSync(branding,JSON.stringify({tenantId:'alianzas-soluciones',hash:'a'.repeat(64),version:'test',branding:{displayName:'A&S',logo:'assets/tenant/alianzas-soluciones/logo-bolita-192.png',favicon:'assets/tenant/alianzas-soluciones/logo-bolita-512.png'}}));
    const result=spawnSync(process.execPath,[path.join(root,'tools/gravicentra-i6-1-preview-package.mjs'),root,out,cfg],{
      cwd:root,encoding:'utf8',timeout:45000,
      env:{...process.env,SOURCE_SHA:'0'.repeat(40),PROJECT_ID:'ays-orbit-360-lab',HOSTING_SITE:'ays-orbit-360-lab',TENANT_HINT:'alianzas-soluciones',RELEASE_GATE:'I6.6',BUILD_PREFIX:'gi-i66',ENVIRONMENT_REF:'firebase-hosting-preview-i6-6',TENANT_BRANDING_SNAPSHOT_FILE:branding,GRAVICENTRA_B4_003_SCOPED_PREVIEW:'true',GRAVICENTRA_B4_003_GOALS_PREVIEW:'true'}
    });
    assert.equal(result.status,0,result.stderr||result.stdout);
    const rel='modules/config-domain-v20260804-bridge.js';
    assert.deepEqual(fs.readFileSync(path.join(out,'bundle/site',rel)),fs.readFileSync(path.join(root,'orbit360-platform',rel)));
    const reachable=fs.readFileSync(path.join(out,'evidence/reachable-files.txt'),'utf8').split('\n');
    assert.equal(reachable.includes(rel),false,'dormant approved source must not gain a new runtime entrypoint');
    const proof=JSON.parse(fs.readFileSync(path.join(out,'evidence/approved-dormant-source.json'),'utf8'));
    assert.equal(proof.supplemental.length,1);
    assert.equal(proof.supplemental[0].path,rel);
    assert.equal(proof.supplemental[0].executedFromCanonicalEntrypoint,false);
    assert.ok(!fs.readFileSync(path.join(out,'bundle/site/index.html'),'utf8').includes('modules/config-domain-v20260804-bridge.js'));
  }finally{fs.rmSync(scratch,{recursive:true,force:true});}
});
