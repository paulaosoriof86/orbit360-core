'use strict';
// The existing Firebase CLI still performs the exact five-function deployment.
// For this successor only, deny its two project-IAM mutation entry points.
// Missing event-service permissions must stop deployment, never broaden IAM.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const SDK=Object.freeze({version:'14.10.1',
  resourceManagerSha256:'83226a30f97eda85dddd61ba291af7ecf2017d7fb73bab69b7b5ce946cd6ae3b',
  checkIamSha256:'7e98f10e3ac1123400d1fc7f495d449215c39029956a663b1dc630439d0b4054',
  promptsSha256:'9f2b68fb48524860ef811213aabfd078efef22b4f666f35a050249c38312f506'});
function guardProjectIam(resourceManager){
  for(const name of ['setIamPolicy','addServiceAccountToRoles']){
    assert.equal(typeof resourceManager[name],'function','INGRESS_PINNED_CLI_IAM_METHOD_MISSING');
    Object.defineProperty(resourceManager,name,{value:async()=>{throw Object.assign(Error('INGRESS_PROJECT_IAM_AUTOMUTATION_FORBIDDEN'),
      {code:'INGRESS_PROJECT_IAM_AUTOMUTATION_FORBIDDEN'});},enumerable:true,writable:false,configurable:false});
  }
  return resourceManager;
}
// --force acknowledges only the already-approved retry policy. It must never
// authorize deletion or an unsafe event-type migration in this exact release.
function guardDeployPrompts(prompts){
  for(const name of ['promptForFailurePolicies','promptForFunctionDeletion','promptForUnsafeMigration'])
    assert.equal(typeof prompts[name],'function','INGRESS_PINNED_CLI_PROMPT_METHOD_MISSING');
  const deny=(name,check,code)=>Object.defineProperty(prompts,name,{value:async(rows)=>{
    assert.ok(Array.isArray(rows),'INGRESS_CLI_DEPLOYMENT_PLAN_REQUIRED');
    assert.ok(check(rows),code);return name==='promptForFunctionDeletion'?true:rows;
  },enumerable:true,writable:false,configurable:false});
  deny('promptForFunctionDeletion',rows=>rows.length===0,'INGRESS_CLI_IMPLICIT_FUNCTION_DELETION_FORBIDDEN');
  deny('promptForUnsafeMigration',rows=>rows.every(row=>row&&typeof row==='object'&&!row.unsafe),
    'INGRESS_CLI_UNSAFE_EVENT_MIGRATION_FORBIDDEN');
  return prompts;
}
function deploymentArgs(phase,args){
  assert.ok(['preview','live'].includes(phase),'INGRESS_CLI_PHASE_REQUIRED');
  assert.equal(args.length,9,'INGRESS_CLI_EXACT_ARGUMENTS_REQUIRED');assert.equal(args[0],'deploy');
  assert.equal(args[1],'--only');assert.equal(args[2],g.MAKE_TARGETS[phase].map(t=>'functions:'+t.name).join(','));
  assert.equal(args[3],'--config');assert.ok(path.isAbsolute(args[4]));
  assert.equal(args[5],'--project');assert.equal(args[6],'ays-orbit-360-lab');assert.equal(args[7],'--non-interactive');assert.equal(args[8],'--force');
  return args;
}
function run(cli,phase,args){
  assert.ok(path.isAbsolute(cli)&&cli.endsWith('/firebase-tools/lib/bin/firebase.js'),'INGRESS_PINNED_CLI_PATH_REQUIRED');
  deploymentArgs(phase,args);
  const root=path.resolve(path.dirname(cli),'../..'),req=createRequire(path.join(root,'package.json'));
  assert.equal(req('./package.json').version,SDK.version,'INGRESS_FIREBASE_CLI_VERSION_DRIFT');
  const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
  assert.equal(hash('lib/gcp/resourceManager.js'),SDK.resourceManagerSha256,'INGRESS_CLI_IAM_SOURCE_DRIFT');
  assert.equal(hash('lib/deploy/functions/checkIam.js'),SDK.checkIamSha256,'INGRESS_CLI_EVENT_IAM_SOURCE_DRIFT');
  assert.equal(hash('lib/deploy/functions/prompts.js'),SDK.promptsSha256,'INGRESS_CLI_PROMPT_SOURCE_DRIFT');
  guardProjectIam(req('./lib/gcp/resourceManager.js'));
  guardDeployPrompts(req('./lib/deploy/functions/prompts.js'));
  process.argv=[process.execPath,cli,...args];req(cli);
}
if(require.main===module){try{const [cli,phase,...args]=process.argv.slice(2);run(cli,phase,args);}catch(error){
  console.error(/^INGRESS_[A-Z_]+$/.test(error?.code||error?.message||'')?error.code||error.message:'INGRESS_GUARDED_CLI_SETUP_HOLD');process.exitCode=1;
}}
module.exports={SDK,guardProjectIam,guardDeployPrompts,deploymentArgs,run};
