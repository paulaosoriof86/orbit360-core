'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const dual=require('./gravicentra-i66-protected-reader-dual-isolated-package.cjs');
const single=require('./gravicentra-b4-003-isolated-reader-package.cjs');
const source=path.join(__dirname,'../functions');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-i66-dual-reader-'));
let checks=0;
try{
 const p=dual.plan(source);
 assert.equal(p.region,'us-east1');checks++;
 assert.equal(p.localDependencyClosure.length,7);checks++;
 assert.equal(Object.keys(p.sourceFiles).length,10);checks++;
 const before=fs.readFileSync(path.join(source,'bootstrap.js'));
 const staged=path.join(tmp,'staged');
 const d=dual.stage(source,staged);
 assert.equal(d.sourceManifestSha256,p.sourceManifestSha256);checks++;
 assert.deepEqual(fs.readdirSync(staged).sort(),single.FILES.slice().sort());checks++;
 assert.deepEqual(fs.readFileSync(path.join(source,'bootstrap.js')),before);checks++;
 for(const name of single.FILES){
  const b=fs.readFileSync(path.join(staged,name));
  const crypto=require('node:crypto');
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),p.sourceFiles[name].sha256);checks++;
 }
 const preview=()=>{},live=()=>{},seen=[];
 const ctx={module:{exports:{}},require(request){seen.push(request);
  assert.equal(request,'./b4-003-scoped-policy-callable');
  return{orbit360ScopedPolicyReadPreview:preview,orbit360ScopedPolicyRead:live,other:()=>{}};}};
 vm.runInNewContext(fs.readFileSync(path.join(staged,'bootstrap.js'),'utf8'),ctx);
 assert.deepEqual(Object.keys(ctx.module.exports).sort(),['orbit360ScopedPolicyRead','orbit360ScopedPolicyReadPreview'].sort());checks++;
 assert.equal(ctx.module.exports.orbit360ScopedPolicyReadPreview,preview);checks++;
 assert.equal(ctx.module.exports.orbit360ScopedPolicyRead,live);checks++;
 assert.deepEqual(seen,['./b4-003-scoped-policy-callable']);checks++;
 assert.throws(()=>dual.stage(source,staged),/DESTINATION_NOT_EMPTY/);checks++;
 console.log('I66_DUAL_ISOLATED_READER_PACKAGE_PASS checks='+checks+' one-source ten-file dual export closed-dependency exact-byte staging');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
