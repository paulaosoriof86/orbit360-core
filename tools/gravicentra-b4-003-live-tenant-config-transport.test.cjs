'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const pkg=require('./gravicentra-b4-003-isolated-tenant-config-package.cjs');
const t=require('./gravicentra-b4-003-live-tenant-config-readback.cjs');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gi-catalog-qa-'));
let count=0;const check=(label,fn)=>{fn();count++;};
const clone=x=>structuredClone(x);
try{
 const plan=pkg.plan(path.join(root,'functions'));
 check('exact canonical five files',()=>{assert.equal(plan.sourceManifestSha256,t.EXPECTED);assert.deepEqual(plan.files,pkg.FILES);assert.equal(plan.localDependencyClosure.length,2);});
 const stage=path.join(tmp,'stage');pkg.stage(path.join(root,'functions'),stage);
 check('stage excludes all other endpoints/assets',()=>assert.deepEqual(fs.readdirSync(stage).sort(),pkg.FILES.slice().sort()));
 check('no overwrite of nonempty stage',()=>assert.throws(()=>pkg.stage(path.join(root,'functions'),stage),/DESTINATION_NOT_EMPTY/));
 fs.appendFileSync(path.join(stage,'tenant-domain-config.js'),'\n// altered');
 check('canonical bytes cannot be patched',()=>assert.throws(()=>pkg.plan(stage),/CANONICAL_SOURCE_PIN/));
 fs.rmSync(stage,{recursive:true});pkg.stage(path.join(root,'functions'),stage);
 const zip=path.join(tmp,'source.zip');
 execFileSync('python3',['-c',"import sys,zipfile,pathlib\nr=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],'w') as z:\n for p in sorted(r.iterdir()):z.write(p,p.name)",stage,zip]);
 const source=t.sourceArchive(zip);
 check('complete ZIP bytes equal package',()=>{assert.equal(source.sourceManifestSha256,t.EXPECTED);assert.equal(Object.keys(source.sourceFiles).length,5);});
 const unsafe=path.join(tmp,'unsafe.zip');
 execFileSync('python3',['-c',"import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],'w') as z:\n z.writestr('tenant-domain-config.js','synthetic')\n z.writestr('../outside.js','synthetic')",unsafe]);
 check('archive traversal refused',()=>assert.throws(()=>t.sourceArchive(unsafe),/ARCHIVE_UNSAFE_PATH/));
 const inventory=[{id:pkg.TARGET,region:pkg.REGION,revision:'old'},{id:'orbit360ScopedPolicyRead',region:'us-east1',revision:'orbit360scopedpolicyread-00002-pok'},{id:'orbit360ProductOperationalCommand',region:pkg.REGION,revision:'writer-fixed'}];
 const meta={name:`projects/${pkg.PROJECT}/locations/${pkg.REGION}/functions/${pkg.TARGET}`,environment:'GEN_2',state:'ACTIVE',buildConfig:{entryPoint:pkg.TARGET,runtime:'nodejs22',source:{storageSource:{bucket:'synthetic',object:'source.zip',generation:'1'}}},serviceConfig:{service:`projects/${pkg.PROJECT}/locations/${pkg.REGION}/services/orbit360tenantdomainconfig`,revision:t.BEFORE.revision,uri:'https://synthetic.invalid',serviceAccountEmail:'synthetic@invalid',ingressSettings:'ALLOW_ALL',environmentVariables:{SAFE_FIXTURE:'value'},secretEnvironmentVariables:[]}};
 const identity=t.metadataIdentity(meta),iam=t.iamIdentity({version:1,bindings:[{role:'roles/run.invoker',members:['synthetic-b','synthetic-a']}]});
 check('wrong metadata endpoint refused',()=>assert.throws(()=>t.metadataIdentity({...meta,name:meta.name+'Preview'}),/EXACT_FUNCTION_IDENTITY/));
 check('cross-project service refused',()=>assert.throws(()=>t.metadataIdentity({...meta,serviceConfig:{...meta.serviceConfig,service:meta.serviceConfig.service.replace(pkg.PROJECT,'other')}}),/RUN_SERVICE_IDENTITY/));
 check('equivalent numeric project service accepted',()=>assert.ok(t.metadataIdentity({...meta,serviceConfig:{...meta.serviceConfig,service:meta.serviceConfig.service.replace(pkg.PROJECT,'646761409743')}})));
 check('IAM order and etag do not change permissions hash',()=>assert.deepEqual(iam,t.iamIdentity({version:1,etag:'different',bindings:[{role:'roles/run.invoker',members:['synthetic-a','synthetic-b']}]})));
 check('duplicate target inventory refused',()=>assert.throws(()=>t.inventorySummary([...inventory,inventory[0]]),/EXACT_EXISTING_INVENTORY_TARGET/));
 const before={target:pkg.TARGET,region:pkg.REGION,project:pkg.PROJECT,identity,iam,sourceGitBlobSha:t.BEFORE.sourceGitBlobSha,archiveSha256:t.BEFORE.archiveSha256,sourceFiles:{'tenant-domain-config.js':{sha256:'a'.repeat(64)}},sourceManifestSha256:'b'.repeat(64),inventory:t.inventorySummary({result:inventory})};
 const after={...clone(before),identity:{...identity,revision:'new-exact'},...source};
 check('exact after source/config/IAM passes',()=>assert.equal(t.compare('after',before,after,t.EXPECTED).status,'EXACT_CATALOG_BYTES_CONFIG_IAM_PASS_SIGNED_UI_PENDING'));
 for(const [label,edit,pattern] of [
  ['unreviewed archive file',x=>{x.sourceFiles['extra.js']={sha256:'x'};x.sourceManifestSha256='c'.repeat(64);},/COMPLETE_DEPLOYED_PACKAGE_MISMATCH/],
  ['no new target revision',x=>{x.identity.revision=before.identity.revision;},/REVISION_DID_NOT_MOVE/],
  ['environment changed',x=>{x.identity.environmentVariablesSha256='changed';},/NON_SOURCE_CONFIGURATION_CHANGED/],
  ['secret config changed',x=>{x.identity.secretEnvironmentVariablesSha256='changed';},/NON_SOURCE_CONFIGURATION_CHANGED/],
  ['service config changed',x=>{x.identity.serviceConfigNonRevisionSha256='changed';},/NON_SOURCE_CONFIGURATION_CHANGED/],
  ['IAM changed',x=>{x.iam.policySha256='c'.repeat(64);},/IAM_CHANGED/],
  ['IAM unreadable',x=>{x.iam.status='UNAVAILABLE';},/IAM_READBACK_REQUIRED/],
  ['reader or other function changed',x=>{x.inventory.nonTargetInventorySha256='c'.repeat(64);},/NON_TARGET_FUNCTION_CHANGED/],
  ['function created',x=>{x.inventory.functionCount++;},/NON_TARGET_FUNCTION_CHANGED/]
 ])check(label,()=>{const x=clone(after);edit(x);assert.throws(()=>t.compare('after',before,x,t.EXPECTED),pattern);});
 check('complete predecessor rollback passes',()=>assert.equal(t.compare('rollback',before,clone(before),t.EXPECTED).status,'EXACT_CATALOG_PREDECESSOR_RESTORED'));
 check('partial predecessor rollback refused',()=>assert.throws(()=>t.compare('rollback',before,after,t.EXPECTED),/ROLLBACK_SOURCE_NOT_RESTORED/));
 const files=Object.fromEntries(t.TOOL_PATHS.map(p=>[p,Buffer.from('synthetic:'+p)]));
 const grant={schema:'GRAVICENTRA_LIVE_TENANT_CONFIG_TRANSPORT_SUCCESSOR_V1',sourceBaseHead:t.BASE,preservedFrontendSource:t.FRONTEND,target:pkg.TARGET,region:pkg.REGION,project:pkg.PROJECT,deployAuthorized:true,requiresActivationReceipt:true,activationPath:t.ACTIVATION,businessWrites:0,hostingDeployAuthorized:false,otherFunctionsDeployAuthorized:false,readerGrantExpanded:false,sourceChanged:false,expectedSourceManifestSha256:t.EXPECTED,packageFiles:5,singleExport:pkg.TARGET,before:t.BEFORE,changes:t.TOOL_PATHS.map(p=>({path:p,blobSha:pkg.blob(files[p]),sha256:pkg.sha(files[p])}))};
 check('own bounded grant accepts pinned tools only',()=>assert.equal(t.validateGrant(grant,files),grant));
 for(const [field,value] of [['target','orbit360ScopedPolicyRead'],['region','us-east1'],['sourceChanged',true],['readerGrantExpanded',true],['businessWrites',1]])check('grant denies '+field,()=>assert.throws(()=>t.validateGrant({...grant,[field]:value},files),/TENANT_CONFIG_AUTHORITY_/));
 const activation={schema:'GRAVICENTRA_LIVE_TENANT_CONFIG_ACTIVATION_V1',status:'AUTHORIZED_EXACT_SINGLE_CATALOG_DEPLOY',target:pkg.TARGET,region:pkg.REGION,project:pkg.PROJECT,preservedFrontendSource:t.FRONTEND,reviewedReadbackConclusion:'success',reviewedReadbackRunId:42401330632,reviewedSourceHead:'a'.repeat(40),realBusinessWritesAuthorized:false,otherFunctionsDeployAuthorized:false,hostingDeployAuthorized:false,readerGrantExpanded:false,beforeArchiveSha256:before.archiveSha256,beforeSourceManifestSha256:before.sourceManifestSha256,beforeRevision:before.identity.revision,beforeServiceConfigSha256:before.identity.serviceConfigNonRevisionSha256,beforeEnvironmentSha256:before.identity.environmentVariablesSha256,beforeIamPolicySha256:before.iam.policySha256,beforeNonTargetInventorySha256:before.inventory.nonTargetInventorySha256,expectedSourceManifestSha256:t.EXPECTED};
 check('fresh complete activation accepts exact evidence',()=>assert.equal(t.validateActivation(activation,grant,before),true));
 for(const field of ['beforeArchiveSha256','beforeSourceManifestSha256','beforeRevision','beforeServiceConfigSha256','beforeEnvironmentSha256','beforeIamPolicySha256','beforeNonTargetInventorySha256','expectedSourceManifestSha256'])check('activation binds '+field,()=>assert.throws(()=>t.validateActivation({...activation,[field]:'tampered'},grant,before),/ACTIVATION_EXACT_BINDING/));
 check('old diagnostic cannot activate',()=>assert.throws(()=>t.validateActivation({...activation,reviewedReadbackRunId:42400488638},grant,before),/ACTIVATION_FRESH_READBACK/));
 for(const [message,expected] of [[t.READ_SUBJECT,'readback'],[t.READ_SUBJECT+'\n\n[october-private-readback]','readback'],[t.READ_SUBJECT+' extra',null],[t.DEPLOY_SUBJECT,'deploy'],[t.DEPLOY_SUBJECT+'\n\nbody',null],[t.DEPLOY_SUBJECT+' extra',null],['ordinary commit',null]])check('routing '+JSON.stringify(message),()=>assert.equal(t.requestedMode(message),expected));
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/gravicentra-b4-003-executor.yml'),'utf8');
 // GitHub validates job env before assigning a runner; runner/steps/job/env are unavailable there.
 const catalogJobHeader=workflow.split('\n  b4-003-live-tenant-config-causal:\n')[1].split('\n    steps:\n')[0];
 const jobEnv=catalogJobHeader.split('\n    env:\n')[1];
 const validateJobEnvContexts=source=>{for(const expression of source.matchAll(/\$\{\{([\s\S]*?)\}\}/g)){const literalsRemoved=expression[1].replace(/'(?:[^']|'')*'/g,"''");for(const token of literalsRemoved.matchAll(/(?<![.\w])([A-Za-z_][A-Za-z0-9_]*)\s*\./g))assert.ok(['github','needs','strategy','matrix','vars','secrets','inputs'].includes(token[1]),'UNAVAILABLE_JOB_ENV_CONTEXT:'+token[1]);}};
 check('job env uses only contexts available before runner allocation',()=>validateJobEnvContexts(jobEnv));
 check('published runner.temp job env regression is rejected',()=>assert.throws(()=>validateJobEnvContexts(jobEnv+'\n      GI_CATALOG_INVENTORY_PATH: ${{ runner.temp }}/inventory.json'),/UNAVAILABLE_JOB_ENV_CONTEXT:runner/));
 const condition=job=>{const block=workflow.split('\n  '+job+':\n')[1];assert.ok(block);return JSON.parse(block.match(/^    if: (.+)$/m)[1]);};
 const evaluate=(expr,message)=>Function('github','startsWith','format','fromJSON','return ('+expr+')')({event_name:'push',event:{head_commit:{message}}},(a,b)=>a.startsWith(b),(template,...args)=>template.replace(/\{(\d+)\}/g,(_,i)=>args[+i]),s=>JSON.parse(s.replace(/\n/g,'\\n')));
 for(const message of [t.READ_SUBJECT,t.READ_SUBJECT+'\n\n[october-private-readback]',t.DEPLOY_SUBJECT])check('actual workflow chooses only catalog job',()=>{assert.equal(evaluate(condition('b4-003-live-tenant-config-causal'),message),true);assert.equal(evaluate(condition('b4-003-renewals-cancelations-preview'),message),false);});
 for(const message of [t.READ_SUBJECT+' extra',t.DEPLOY_SUBJECT+'\nbody',t.DEPLOY_SUBJECT+' extra','ordinary commit'])check('actual workflow denies nonexact catalog route',()=>assert.equal(evaluate(condition('b4-003-live-tenant-config-causal'),message),false));
 console.log('LIVE_TENANT_CONFIG_TRANSPORT_PASS '+count+' checks; synthetic packages and metadata only; no network, credentials, data writes or deployment');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

// The enclosing guard independently pins these real reviewed bytes before it
// projects the executor back to its preserved frontend-promotion proof.
(async()=>{
 const {pathToFileURL}=require('node:url');
 const {validateCatalogTransportSuccessorSnapshot:validate}=await import(pathToFileURL(path.join(root,'tools/gravicentra-b4-003-formal-live-closeout-guard.mjs')));
 const workflow=t.TOOL_PATHS[0],fileBytes=Object.fromEntries(t.TOOL_PATHS.map(p=>[p,fs.readFileSync(path.join(root,p))]));
 const before=process.env.GI_CATALOG_BASE_EXECUTOR?fs.readFileSync(process.env.GI_CATALOG_BASE_EXECUTOR):execFileSync('git',['show',t.BASE+':'+workflow],{cwd:root});
 const baseSourceBytes=Object.fromEntries(t.TOOL_PATHS.map(p=>[p,p===workflow?before:null]));
 const grant={schema:'GRAVICENTRA_LIVE_TENANT_CONFIG_TRANSPORT_SUCCESSOR_V1',status:'CANONICAL_CATALOG_PREPARED_READBACK_REQUIRED',sourceBaseHead:t.BASE,preservedFrontendSource:t.FRONTEND,target:pkg.TARGET,region:pkg.REGION,project:pkg.PROJECT,deployAuthorized:true,requiresActivationReceipt:true,activationPath:t.ACTIVATION,businessWrites:0,hostingDeployAuthorized:false,otherFunctionsDeployAuthorized:false,readerGrantExpanded:false,sourceChanged:false,expectedSourceManifestSha256:t.EXPECTED,packageFiles:5,singleExport:pkg.TARGET,before:t.BEFORE,firstPublishMode:'READBACK_ONLY',allowedReadbackSubject:t.READ_SUBJECT,allowedDeploySubject:t.DEPLOY_SUBJECT,changes:t.TOOL_PATHS.map(p=>({path:p,previousBlobSha:p===workflow?'8178fdfd8c4c16a1b1bf17432c87e6b5115cdd4e':null,blobSha:pkg.blob(fileBytes[p]),sha256:pkg.sha(fileBytes[p])}))};
 const args={record:{catalogTransportSuccessor:grant},fileBytes,baseSourceBytes};
 const good=validate(args);assert.equal(pkg.blob(good.comparableFileBytes[workflow]),'8178fdfd8c4c16a1b1bf17432c87e6b5115cdd4e');assert.equal(good.allowedPaths.length,5);
 let checks=1;
 for(const edit of [x=>{x.record.catalogTransportSuccessor.readerGrantExpanded=true;},x=>{x.record.catalogTransportSuccessor.target='orbit360ScopedPolicyRead';},x=>{x.record.catalogTransportSuccessor.sourceBaseHead=t.FRONTEND;},x=>{x.fileBytes[workflow]=Buffer.from('unreviewed');},x=>{x.record.catalogTransportSuccessor.changes.push({path:'functions/tenant-domain-config.js'});},x=>{x.baseSourceBytes[workflow]=Buffer.from('wrong predecessor');}]){const mutated=structuredClone(args);edit(mutated);assert.throws(()=>validate(mutated),/CATALOG_/);checks++;}
 console.log('CATALOG_BOUNDED_GUARD_PASS '+checks+' checks; preserves the prior executor proof and reader grant');
})().catch(e=>{console.error(e);process.exitCode=1;});
