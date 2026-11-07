'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const TARGET='orbit360ScopedPolicyRead',REGION='us-east1';
const MODULES=['b4-003-scoped-policy-callable.js','b4-003-scoped-bootstrap-reader.js','b4-003-scoped-access-boundary.js','b4-003-scoped-policy-reader.js','b4-003-scoped-related-reader.js','b4-003-client-country-authority.js','b4-003-client-country-list-projection.js'];
const FILES=['bootstrap.js','package.json','package-lock.json',...MODULES];
const ENTRYPOINT="'use strict';\nconst reader=require('./b4-003-scoped-policy-callable');\nmodule.exports={orbit360ScopedPolicyRead:reader.orbit360ScopedPolicyRead};\n";
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const manifest=files=>sha(JSON.stringify(Object.keys(files).sort().map(file=>[file,files[file].sha256])));
function plan(root){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 if(pkg.main!=='bootstrap.js'||String(pkg.engines?.node)!=='22')throw Error('ISOLATED_READER_PACKAGE_ENTRY_OR_RUNTIME');
 const allowed=new Set(MODULES),seen=new Set(),queue=[MODULES[0]];
 while(queue.length){
  const name=queue.shift();if(seen.has(name))continue;
  if(!allowed.has(name))throw Error('ISOLATED_READER_UNREVIEWED_LOCAL_DEPENDENCY:'+name);
  const code=fs.readFileSync(path.join(root,name),'utf8');
  const literal=[...code.matchAll(/\brequire\s*\(\s*(['"])([^'"]+)\1\s*\)/g)];
  if((code.match(/\brequire\s*\(/g)||[]).length!==literal.length||/\bimport\s*\(/.test(code))throw Error('ISOLATED_READER_DYNAMIC_DEPENDENCY:'+name);
  for(const match of literal){
   const request=match[2];
   if(request.startsWith('.')){
    let next=path.posix.normalize(path.posix.join(path.posix.dirname(name),request));
    if(!next.endsWith('.js'))next+='.js';
    if(!allowed.has(next))throw Error('ISOLATED_READER_UNREVIEWED_LOCAL_DEPENDENCY:'+next);
    queue.push(next);
   }else if(!['firebase-admin/app','firebase-admin/firestore','firebase-functions/v2/https'].includes(request))throw Error('ISOLATED_READER_UNREVIEWED_EXTERNAL_DEPENDENCY:'+request);
  }
  seen.add(name);
 }
 if(seen.size!==MODULES.length)throw Error('ISOLATED_READER_CLOSURE_INCOMPLETE');
 const bytes=Object.fromEntries(FILES.map(file=>[file,file==='bootstrap.js'?Buffer.from(ENTRYPOINT):fs.readFileSync(path.join(root,file))]));
 const sourceFiles=Object.fromEntries(FILES.map(file=>[file,{sha256:sha(bytes[file]),gitBlobSha:blob(bytes[file]),bytes:bytes[file].length}]));
 return{target:TARGET,region:REGION,entrypoint:'bootstrap.js',localDependencyClosure:[...seen].sort(),sourceFiles,sourceManifestSha256:manifest(sourceFiles),bytes};
}
function stage(root,destination){
 const p=plan(root);
 if(fs.existsSync(destination)&&fs.readdirSync(destination).length)throw Error('ISOLATED_READER_DESTINATION_NOT_EMPTY');
 fs.mkdirSync(destination,{recursive:true});
 for(const [file,bytes] of Object.entries(p.bytes))fs.writeFileSync(path.join(destination,file),bytes);
 return{...p,bytes:undefined};
}
module.exports={TARGET,REGION,MODULES,FILES,ENTRYPOINT,manifest,plan,stage};
if(require.main===module){
 const [mode,root,destination]=process.argv.slice(2);
 if(mode!=='stage'||!root||!destination)throw Error('ISOLATED_READER_STAGE_ARGUMENTS');
 console.log(JSON.stringify(stage(root,destination),null,2));
}
