'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const helper=require('./gravicentra-b4-003-isolated-reader-package.cjs');
const root=path.join(__dirname,'../functions');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-reader-package-'));
let checks=0;
try{
 const p=helper.plan(root);
 assert.equal(p.target,'orbit360ScopedPolicyRead');checks++;
 assert.equal(p.region,'us-east1');checks++;
 assert.equal(p.localDependencyClosure.length,7);checks++;
 assert.equal(Object.keys(p.sourceFiles).length,10);checks++;
 assert.equal(p.sourceManifestSha256,'b0d010ec3cb1aebc3a6bcd38a3e748406b04fcfca281d04602935dcc92a874cb');checks++;
 const before=fs.readFileSync(path.join(root,'bootstrap.js'));
 const staged=path.join(temp,'staged');helper.stage(root,staged);
 assert.deepEqual(fs.readdirSync(staged).sort(),helper.FILES.slice().sort());checks++;
 assert.deepEqual(fs.readFileSync(path.join(root,'bootstrap.js')),before);checks++;
 const live=function(){},preview=function(){},seen=[];
 const ctx={module:{exports:{}},require(name){seen.push(name);assert.equal(name,'./b4-003-scoped-policy-callable');return{orbit360ScopedPolicyRead:live,orbit360ScopedPolicyReadPreview:preview,other:()=>{}};}};
 vm.runInNewContext(fs.readFileSync(path.join(staged,'bootstrap.js'),'utf8'),ctx);
 assert.deepEqual(Object.keys(ctx.module.exports),['orbit360ScopedPolicyRead']);checks++;
 assert.equal(ctx.module.exports.orbit360ScopedPolicyRead,live);checks++;
 assert.deepEqual(seen,['./b4-003-scoped-policy-callable']);checks++;
 assert.throws(()=>helper.stage(root,staged),/DESTINATION_NOT_EMPTY/);checks++;
 function altered(name,change,pattern){
  const source=path.join(temp,name);fs.mkdirSync(source);
  for(const file of helper.FILES.filter(f=>f!=='bootstrap.js'))fs.copyFileSync(path.join(root,file),path.join(source,file));
  change(source);assert.throws(()=>helper.plan(source),pattern);checks++;
 }
 altered('local',dir=>fs.appendFileSync(path.join(dir,helper.MODULES[0]),"\nrequire('./unreviewed-module');\n"),/UNREVIEWED_LOCAL_DEPENDENCY/);
 altered('dynamic',dir=>fs.appendFileSync(path.join(dir,helper.MODULES[0]),"\nrequire(runtimeName);\n"),/DYNAMIC_DEPENDENCY/);
 altered('external',dir=>fs.appendFileSync(path.join(dir,helper.MODULES[0]),"\nrequire('node:child_process');\n"),/UNREVIEWED_EXTERNAL_DEPENDENCY/);
 altered('entry',dir=>{const file=path.join(dir,'package.json'),x=JSON.parse(fs.readFileSync(file));x.main='other.js';fs.writeFileSync(file,JSON.stringify(x));},/PACKAGE_ENTRY_OR_RUNTIME/);
 altered('runtime',dir=>{const file=path.join(dir,'package.json'),x=JSON.parse(fs.readFileSync(file));x.engines.node='20';fs.writeFileSync(file,JSON.stringify(x));},/PACKAGE_ENTRY_OR_RUNTIME/);
 console.log('ISOLATED_READER_PACKAGE_PASS '+checks+' checks; one export, exact ten files, complete reviewed local closure, no network');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
