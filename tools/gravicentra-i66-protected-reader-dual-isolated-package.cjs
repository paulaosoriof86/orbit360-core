'use strict';
// One immutable isolated backend entrypoint exports ONLY the two matching
// protected reader callables. Preview and LIVE must deploy the same package.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const single=require('./gravicentra-b4-003-isolated-reader-package.cjs');
const ENTRYPOINT="'use strict';\nconst r=require('./b4-003-scoped-policy-callable');\nmodule.exports={orbit360ScopedPolicyReadPreview:r.orbit360ScopedPolicyReadPreview,orbit360ScopedPolicyRead:r.orbit360ScopedPolicyRead};\n";
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function plan(source){
  const base=single.plan(source);assertSourceDiff(base);
  const files={};
  for(const name of single.FILES){
    const bytes=name==='bootstrap.js'?Buffer.from(ENTRYPOINT):fs.readFileSync(path.join(source,name));
    files[name]={sha256:sha(bytes),bytes:bytes.length};
  }
  return{target:'orbit360ScopedPolicyReadPreview+orbit360ScopedPolicyRead',region:'us-east1',
    sourceManifestSha256:sha(JSON.stringify(Object.keys(files).sort().map(name=>[name,files[name].sha256]))),
    sourceFiles:files,localDependencyClosure:base.localDependencyClosure};
}
function stage(source,destination){
  const base=single.stage(source,destination);
  assertSourceDiff(base);
  fs.writeFileSync(path.join(destination,'bootstrap.js'),ENTRYPOINT);
  const reviewed=plan(source);
  return{...reviewed,
    retainedClosedDependencyGraph:base.localDependencyClosure.length,forbiddenExports:0};
}
function assertSourceDiff(base){
  const found=base.localDependencyClosure||[];
  if(found.length!==7||!found.includes('b4-003-scoped-access-boundary.js'))
    throw Error('I66_READER_DEPENDENCY_CLOSURE_DRIFT');
}
if(require.main===module){
  const [source,destination]=process.argv.slice(2);
  if(!source||!destination)throw Error('I66_DUAL_READER_ARGS_REQUIRED');
  console.log(JSON.stringify(stage(source,destination),null,2));
}
module.exports={stage,plan,ENTRYPOINT};
