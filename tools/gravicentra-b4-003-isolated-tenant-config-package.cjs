'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// Same manifest contract as the reviewed isolated reader; its target and grants stay unchanged.
const {manifest}=require('./gravicentra-b4-003-isolated-reader-package.cjs');
const TARGET='orbit360TenantDomainConfig',REGION='us-central1',PROJECT='ays-orbit-360-lab';
const MODULES=['tenant-domain-config.js','product-active-role-contract.js'];
const FILES=['bootstrap.js','package.json','package-lock.json',...MODULES];
const ENTRYPOINT="'use strict';\nconst config=require('./tenant-domain-config');\nmodule.exports={orbit360TenantDomainConfig:config.orbit360TenantDomainConfig};\n";
const EXTERNAL=['node:crypto','node:fs','node:path','firebase-admin/app','firebase-admin/firestore','firebase-functions/v2/https'];
const PINS={'tenant-domain-config.js':'231fb2f106a6c139bb83c367f0f5e1a1c8924823','product-active-role-contract.js':'09681f536c5cbbd36bcba6514d4829d2494b9387','package.json':'a016a9f9d6a48ab44d45dedc88611cff083091ef','package-lock.json':'868690d441b0073c550aea2de56c35950fafa9d1'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
function plan(root){
 const bytes=Object.fromEntries(FILES.map(file=>[file,file==='bootstrap.js'?Buffer.from(ENTRYPOINT):fs.readFileSync(path.join(root,file))]));
 for(const [file,pin] of Object.entries(PINS))if(blob(bytes[file])!==pin)throw Error('TENANT_CONFIG_CANONICAL_SOURCE_PIN:'+file);
 const pkg=JSON.parse(bytes['package.json']);
 if(pkg.main!=='bootstrap.js'||String(pkg.engines?.node)!=='22')throw Error('TENANT_CONFIG_PACKAGE_RUNTIME');
 const seen=new Set(),queue=[MODULES[0]];
 while(queue.length){
  const name=queue.shift();if(seen.has(name))continue;
  if(!MODULES.includes(name))throw Error('TENANT_CONFIG_UNREVIEWED_LOCAL_DEPENDENCY:'+name);
  const source=bytes[name].toString('utf8'),calls=[...source.matchAll(/\brequire\s*\(\s*(['"])([^'"]+)\1\s*\)/g)];
  if((source.match(/\brequire\s*\(/g)||[]).length!==calls.length||/\bimport\s*\(/.test(source))throw Error('TENANT_CONFIG_DYNAMIC_DEPENDENCY');
  for(const [, ,request] of calls){
   if(request.startsWith('.')){
    let next=path.posix.normalize(path.posix.join(path.posix.dirname(name),request));if(!next.endsWith('.js'))next+='.js';
    if(!MODULES.includes(next))throw Error('TENANT_CONFIG_UNREVIEWED_LOCAL_DEPENDENCY:'+next);queue.push(next);
   }else if(!EXTERNAL.includes(request))throw Error('TENANT_CONFIG_UNREVIEWED_EXTERNAL_DEPENDENCY:'+request);
  }
  seen.add(name);
 }
 if(seen.size!==2)throw Error('TENANT_CONFIG_INCOMPLETE_CLOSURE');
 const sourceFiles=Object.fromEntries(FILES.map(file=>[file,{sha256:sha(bytes[file]),gitBlobSha:blob(bytes[file]),bytes:bytes[file].length}]));
 return{target:TARGET,region:REGION,project:PROJECT,files:FILES,localDependencyClosure:[...seen].sort(),sourceFiles,sourceManifestSha256:manifest(sourceFiles),bytes};
}
function stage(root,destination){
 const p=plan(root);if(fs.existsSync(destination)&&fs.readdirSync(destination).length)throw Error('TENANT_CONFIG_DESTINATION_NOT_EMPTY');
 fs.mkdirSync(destination,{recursive:true});for(const [file,bytes] of Object.entries(p.bytes))fs.writeFileSync(path.join(destination,file),bytes);
 return{...p,bytes:undefined};
}
module.exports={TARGET,REGION,PROJECT,MODULES,FILES,ENTRYPOINT,EXTERNAL,PINS,sha,blob,manifest,plan,stage};
if(require.main===module){const [mode,root,destination]=process.argv.slice(2);if(mode!=='stage'||!root||!destination)throw Error('TENANT_CONFIG_STAGE_ARGUMENTS');console.log(JSON.stringify(stage(root,destination),null,2));}
