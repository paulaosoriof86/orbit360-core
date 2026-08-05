#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const GATE='block-auth-access-recovery-lab-v3-20260805';
const VERSION='13.2.0';
const LIFECYCLE='tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v3-20260805.json';
const REQUEST=process.env.ORBIT360_REQUEST_FILE||'.github/orbit360-requests/auth-access-recovery-lab-v3-20260805.json';
const PRIOR1='.github/orbit360-requests/auth-access-recovery-lab-v20260805.json';
const PRIOR2='.github/orbit360-requests/auth-access-recovery-lab-v2-20260805.json';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,500)});
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const exists=rel=>fs.existsSync(path.join(ROOT,rel));
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
let result;
try{
  const lifecycle=read(LIFECYCLE), request=read(REQUEST);
  const priorLifecycle1=read('tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v20260805.json');
  const priorLifecycle2=read('tools/orbit360-validator-lifecycle-contract-auth-access-recovery-lab-v2-20260805.json');
  const cap=lifecycle.executionProfile?.capabilities||{}, scope=request.scope||{};
  add('GATE_ID_VERSION',process.argv[2]===GATE&&lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION);
  add('LIFECYCLE_AUTHORIZED_ONCE',lifecycle.status==='AUTH_ACCESS_RECOVERY_V3_AUTHORIZED_ONCE'&&lifecycle.authorization?.activeRequest===true&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.consumed===false&&lifecycle.authorization?.replayAllowed===false);
  add('PHASE_CAPABILITIES',lifecycle.executionProfile?.phase==='AUTH_ACCESS_RECOVERY_LAB_V3'&&same(cap,{secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:true,functionsDeploy:true,rulesDeploy:false,production:false}));
  add('REQUEST_ACTIVE',request.schemaVersion==='orbit360-auth-access-recovery-request-v3'&&request.gateId===GATE&&request.status==='AUTHORIZED_ONCE'&&request.approved===true&&request.allowedExecutions===1&&request.consumed===false&&request.replayAllowed===false);
  add('REQUEST_BINDING',request.rcId==='RC-AYS-LAB-CANONICA-01'&&request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5&&request.projectId==='ays-orbit-360-lab'&&request.tenantId==='alianzas-soluciones'&&request.parentHead===git(['rev-parse','HEAD^']));
  add('SCOPE_POSITIVE',scope.planApprovedAccessConfig===true&&scope.applyApprovedAccessConfig===true&&scope.authCensusReadOnly===true&&scope.deployOnboardingFunctionOnlyIfAbsent===true&&scope.createOrLinkApprovedRealUsers===true&&scope.syncMembershipRolesCountriesScopes===true&&scope.sendPasswordEstablishmentOrReset===true&&scope.verifyIdentityMembershipContract===true&&scope.rollbackAuthMembershipsOnFailure===true);
  add('SCOPE_NEGATIVE',scope.syntheticUsers===false&&scope.syntheticMemberships===false&&scope.hardcodedUsers===false&&scope.temporaryPasswords===false&&scope.otherFunctions===false&&scope.hosting===false&&scope.rules===false&&scope.reimport===false&&scope.crmWrites===false&&scope.production===false&&scope.main===false&&scope.merge===false);
  add('ACCESS_CONFIG_BOUNDARY',lifecycle.accessConfigurationBoundary?.maximumAdvisorDocumentsUpdated===3&&same(lifecycle.accessConfigurationBoundary?.allowedFields,['email','roles','defaultRole','activeRole','countries','dataScopes'])&&lifecycle.accessConfigurationBoundary?.crmWritesAllowed===false);
  add('FUNCTION_ALLOWLIST',same(lifecycle.onboardingBoundary?.allowedFunctionDeploys,['orbit360ProvisionTeamAccess'])&&lifecycle.onboardingBoundary?.otherFunctionsDeployAllowed===false);
  add('PRIOR_ATTEMPTS_CONSUMED',priorLifecycle1.authorization?.consumed===true&&priorLifecycle1.authorization?.allowedExecutions===0&&priorLifecycle2.authorization?.consumed===true&&priorLifecycle2.authorization?.allowedExecutions===0);
  add('PRIOR_REQUESTS_IMMUTABLE',git(['hash-object',PRIOR1])==='fffef59bd6065390d1e8b28128754a06d94340b5'&&exists(PRIOR2));
  const required=[LIFECYCLE,REQUEST,PRIOR1,PRIOR2,'tools/orbit360-auth-access-config-repair-lab-v3-20260805.mjs','tools/orbit360-auth-access-recovery-lab-v20260805.mjs','tools/orbit360-auth-access-scope-postverify-lab-v2-20260805.mjs','.github/workflows/orbit360-auth-access-recovery-lab-v3-20260805.yml','functions/user-onboarding.js','functions/bootstrap.js'];
  add('REQUIRED_FILES',required.every(exists),required.filter(x=>!exists(x)).join(','));
  const failed=checks.filter(x=>!x.ok),ok=failed.length===0;
  result={schemaVersion:'orbit360-auth-access-recovery-gate-v3',gateId:GATE,contractVersion:VERSION,status:ok?'GO_GATE_CONTRACT':'VALIDATOR_STALE',classification:ok?'AUTH_ACCESS_RECOVERY_V3_READY':'VALIDATOR_STALE',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,executionAuthorized:ok,secretAccessAuthorized:ok,firestoreReadAuthorized:ok,writeAuthorized:ok,maximumAdvisorDocumentsUpdated:ok?3:0,allowedAdvisorFields:ok?['email','roles','defaultRole','activeRole','countries','dataScopes']:[],authWriteAuthorized:ok,runtimeAuthorized:ok,browserAuthorized:false,deployAuthorized:ok,functionsDeployAuthorized:ok,allowedFunctions:ok?['orbit360ProvisionTeamAccess']:[],hostingDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authReads:0,authWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
}catch(error){result={schemaVersion:'orbit360-auth-access-recovery-gate-v3',gateId:GATE,contractVersion:VERSION,status:'VALIDATOR_STALE',classification:'PIPELINE_MECHANISM_FAILURE',error:String(error?.message||error).replace(/[\r\n]+/g,' ').replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,700),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,authWriteAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,deployAuthorized:false,functionsDeployAuthorized:false,hostingDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};}
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result,null,2));process.exit(result.status==='GO_GATE_CONTRACT'?0:41);
