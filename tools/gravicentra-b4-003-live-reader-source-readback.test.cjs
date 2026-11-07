'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'gravicentra-b4-003-live-backend-source-readback.cjs'),'utf8');
const reader='orbit360ScopedPolicyRead',roster='orbit360AssignableAdvisorRoster',writer='orbit360ProductOperationalCommand';
const readerFiles=['bootstrap.js','package.json','package-lock.json','b4-003-scoped-policy-callable.js','b4-003-scoped-bootstrap-reader.js','b4-003-scoped-access-boundary.js','b4-003-scoped-policy-reader.js','b4-003-scoped-related-reader.js','b4-003-client-country-authority.js','b4-003-client-country-list-projection.js'];
const suffix="\n// B4-003: stage reader exports; deploy only LIVE target.\nObject.assign(module.exports,require('./b4-003-scoped-policy-callable'));\n";
async function run(options={}){
 const writes=new Map(),urls=[],logs=[],errors=[];
 if(options.before)writes.set('/tmp/gi-b4003-live-sources-before.json',JSON.stringify(options.before));
 const local=file=>Buffer.from('fixture '+file+'\n');
 const region=name=>name===reader?'us-east1':'us-central1';
 const files=name=>name===reader?readerFiles.filter(file=>!(options.readerMissing||[]).includes(file)):name===roster?['assignable-advisor-roster.js']:['product-operational-domain.js','goal-participation-contract.js'];
 const bytes=(name,file)=>{
  if(name===reader&&file==='bootstrap.js')return Buffer.concat([local(file),Buffer.from(suffix)]);
  if(name===reader&&file==='b4-003-scoped-bootstrap-reader.js'&&!options.readerExact)return Buffer.from('older deployed reader\n');
  return local(file);
 };
 const mockFs={
  readFileSync(file,encoding){const value=file.startsWith('functions/')?local(file.slice(10)):writes.get(file);if(value==null)throw Error('MISSING_FIXTURE:'+file);return encoding?Buffer.from(value).toString(encoding):Buffer.from(value);},
  writeFileSync(file,value){writes.set(file,value);}
 };
 const client={async request(request){
  urls.push(request.url);
  if(request.url.includes('cloudfunctions.googleapis.com')){
   const name=request.url.split('/').pop();
   return {data:{name:'projects/ays-orbit-360-lab/locations/'+region(name)+'/functions/'+name,state:'ACTIVE',environment:'GEN_2',buildConfig:{entryPoint:name,sourceProvenance:{resolvedStorageSource:{bucket:'test-bucket',object:name,generation:'42'}}},serviceConfig:{revision:name===reader?(options.readerRevision||'reader-1'):name===writer?(options.writerRevision||'writer-1'):'roster-1'}}};
  }
  return {data:Buffer.alloc(2048,1)};
 }};
 const mockProcess={argv:['node','readback',options.phase||'before'],env:{GI_DEPS_DIR:'/deps',RUNNER_TEMP:'/tmp',PROJECT_ID:'ays-orbit-360-lab',GI_TARGET_FUNCTION:options.target||reader},exitCode:0};
 const mockRequire=name=>{
  if(name==='node:fs')return mockFs;
  if(name==='node:path')return path;
  if(name==='node:crypto')return crypto;
  if(name==='node:child_process')return{execFileSync(command,args){assert.equal(command,'unzip');const name=[reader,roster,writer].find(n=>args[1].endsWith('-'+n+'.zip'));assert.ok(name);return args[0]==='-Z1'?files(name).join('\n'):bytes(name,args[2]);}};
  if(name==='/deps/google-auth-library')return{GoogleAuth:class{async getClient(){return client;}}};
  throw Error('UNEXPECTED_REQUIRE:'+name);
 };
 vm.runInNewContext(source,{require:mockRequire,process:mockProcess,Buffer,console:{log:x=>logs.push(x),error:x=>errors.push(x)},Date},{filename:'readback-fixture.cjs'});
 await new Promise(resolve=>setImmediate(resolve));
 const raw=writes.get('/tmp/gi-b4003-live-sources-'+(options.phase||'before')+'.json');
 return {output:raw&&JSON.parse(raw),exitCode:mockProcess.exitCode,urls,errors,logs};
}
(async()=>{
 let checks=0;
 const before=await run();
 assert.equal(before.exitCode,0);checks++;
 assert.equal(before.output.readerSourceMatchesCurrent,false);checks++;
 assert.equal(before.output.functions.length,3);checks++;
 assert.equal(Object.keys(before.output.functions[2].sourceFiles).length,10);checks++;
 assert.ok(before.urls.some(url=>url.includes('/locations/us-east1/functions/'+reader)));checks++;
 assert.ok(!before.urls.some(url=>url.includes('/locations/us-central1/functions/'+reader)));checks++;
 assert.ok(before.urls.filter(url=>url.includes('cloudfunctions.googleapis.com')).every(url=>url.endsWith(reader)||url.endsWith(writer)||url.endsWith(roster)));checks++;
 const after=await run({phase:'after',before:before.output,readerExact:true,readerRevision:'reader-2'});
 assert.equal(after.exitCode,0,after.errors.join('\n'));checks++;
 assert.equal(after.output.readerSourceMatchesCurrent,true);checks++;
 const bad=await run({phase:'after',before:before.output,readerRevision:'reader-2'});
 assert.equal(bad.exitCode,41);checks++;
 assert.match(bad.errors.join('\n'),/DEPLOYED_READER_DEPENDENCY_BYTES_MISMATCH/);checks++;
 const unrelated=await run({phase:'after',before:before.output,readerExact:true,readerRevision:'reader-2',writerRevision:'writer-2'});
 assert.equal(unrelated.exitCode,41);checks++;
 assert.match(unrelated.errors.join('\n'),/NON_TARGET_PRODUCTION_FUNCTION_CHANGED/);checks++;
 const stationary=await run({phase:'after',before:before.output,readerExact:true});
 assert.equal(stationary.exitCode,41);checks++;
 assert.match(stationary.errors.join('\n'),/TARGET_REVISION_DID_NOT_MOVE/);checks++;
 const rollback=await run({phase:'rollback',before:before.output,readerRevision:'reader-3'});
 assert.equal(rollback.exitCode,0,rollback.errors.join('\n'));checks++;
 const badRollback=await run({phase:'rollback',before:before.output,readerExact:true,readerRevision:'reader-3'});
 assert.equal(badRollback.exitCode,41);checks++;
 assert.match(badRollback.errors.join('\n'),/ROLLBACK_READER_DEPENDENCY_BYTES_NOT_RESTORED/);checks++;
 await assert.rejects(run({target:'unrelatedFunction'}),/ONLY_THREE_EXACT_B4003_BACKEND_TARGETS_ALLOWED/);checks++;
 const legacy=await run({target:writer});
 assert.equal(legacy.exitCode,0,legacy.errors.join('\n'));checks++;
 assert.equal(legacy.output.region,'us-central1');checks++;
 assert.equal(legacy.output.functions.length,2);checks++;
 assert.equal(legacy.output.writerSourceMatchesCurrent,true);checks++;
 const older=await run({readerMissing:['b4-003-client-country-authority.js','b4-003-client-country-list-projection.js']});
 assert.equal(older.exitCode,0,older.errors.join('\n'));checks++;
 assert.equal(older.output.functions[2].sourceFiles['b4-003-client-country-authority.js'].sha256,null);checks++;
 assert.equal(older.output.readerSourceMatchesCurrent,false);checks++;
 const olderRollback=await run({phase:'rollback',before:older.output,readerRevision:'reader-3',readerMissing:['b4-003-client-country-authority.js','b4-003-client-country-list-projection.js']});
 assert.equal(olderRollback.exitCode,0,olderRollback.errors.join('\n'));checks++;
 const incompleteAfter=await run({phase:'after',before:older.output,readerExact:true,readerRevision:'reader-2',readerMissing:['b4-003-client-country-authority.js']});
 assert.equal(incompleteAfter.exitCode,41);checks++;
 assert.match(incompleteAfter.errors.join('\n'),/DEPLOYED_READER_DEPENDENCY_BYTES_MISMATCH/);checks++;
 console.log('PASS: '+checks+' source readback checks; synthetic fixtures only, no network, deploy or data writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
