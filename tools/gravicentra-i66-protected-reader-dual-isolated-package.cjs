'use strict';
// One immutable isolated backend entrypoint exports ONLY the two matching
// protected reader callables. Preview and LIVE must deploy the same package.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const single=require('./gravicentra-b4-003-isolated-reader-package.cjs');
const ENTRYPOINT="'use strict';\nconst r=require('./b4-003-scoped-policy-callable');\nmodule.exports={orbit360ScopedPolicyReadPreview:r.orbit360ScopedPolicyReadPreview,orbit360ScopedPolicyRead:r.orbit360ScopedPolicyRead};\n";
// The B4-003 packaging contract remains historically pinned. I6.6 explicitly
// owns the two later reviewed, read-only ledger dependencies.
const MODULES=Object.freeze([...single.MODULES,
  'i66-conciliaciones-active-ledger-projection.js','cobros-ledger-contract.js']);
const FILES=Object.freeze(['bootstrap.js','package.json','package-lock.json',...MODULES]);
const EXTERNAL=new Set(['firebase-admin/app','firebase-admin/firestore','firebase-functions/v2/https']);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function closedDependencyGraph(source){
  const pkg=JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8'));
  if(pkg.main!=='bootstrap.js'||String(pkg.engines?.node)!=='22')
    throw Error('I66_READER_PACKAGE_ENTRY_OR_RUNTIME');
  const allowed=new Set(MODULES),seen=new Set(),pending=[MODULES[0]];
  while(pending.length){
    const name=pending.shift();
    if(seen.has(name))continue;
    if(!allowed.has(name))throw Error('I66_READER_UNREVIEWED_LOCAL_DEPENDENCY:'+name);
    const code=fs.readFileSync(path.join(source,name),'utf8');
    const literal=[...code.matchAll(/\brequire\s*\(\s*(['"])([^'"]+)\1\s*\)/g)];
    if((code.match(/\brequire\s*\(/g)||[]).length!==literal.length||/\bimport\s*\(/.test(code))
      throw Error('I66_READER_DYNAMIC_DEPENDENCY:'+name);
    for(const match of literal){
      const request=match[2];
      if(request.startsWith('.')){
        let next=path.posix.normalize(path.posix.join(path.posix.dirname(name),request));
        if(!next.endsWith('.js'))next+='.js';
        if(!allowed.has(next))throw Error('I66_READER_UNREVIEWED_LOCAL_DEPENDENCY:'+next);
        pending.push(next);
      }else if(!EXTERNAL.has(request))
        throw Error('I66_READER_UNREVIEWED_EXTERNAL_DEPENDENCY:'+request);
    }
    seen.add(name);
  }
  if(seen.size!==MODULES.length)throw Error('I66_READER_DEPENDENCY_CLOSURE_DRIFT');
  return [...seen].sort();
}
function plan(source){
  const localDependencyClosure=closedDependencyGraph(source);
  const files={};
  for(const name of FILES){
    const bytes=name==='bootstrap.js'?Buffer.from(ENTRYPOINT):fs.readFileSync(path.join(source,name));
    files[name]={sha256:sha(bytes),bytes:bytes.length};
  }
  return{target:'orbit360ScopedPolicyReadPreview+orbit360ScopedPolicyRead',region:'us-east1',
    sourceManifestSha256:sha(JSON.stringify(Object.keys(files).sort().map(name=>[name,files[name].sha256]))),
    sourceFiles:files,localDependencyClosure};
}
function stage(source,destination){
  const reviewed=plan(source);
  if(fs.existsSync(destination)&&fs.readdirSync(destination).length)
    throw Error('ISOLATED_READER_DESTINATION_NOT_EMPTY');
  fs.mkdirSync(destination,{recursive:true});
  for(const name of FILES){
    const bytes=name==='bootstrap.js'?Buffer.from(ENTRYPOINT):fs.readFileSync(path.join(source,name));
    fs.writeFileSync(path.join(destination,name),bytes);
  }
  return{...reviewed,
    retainedClosedDependencyGraph:reviewed.localDependencyClosure.length,forbiddenExports:0};
}
if(require.main===module){
  const [source,destination]=process.argv.slice(2);
  if(!source||!destination)throw Error('I66_DUAL_READER_ARGS_REQUIRED');
  console.log(JSON.stringify(stage(source,destination),null,2));
}
module.exports={stage,plan,ENTRYPOINT,FILES,MODULES};
