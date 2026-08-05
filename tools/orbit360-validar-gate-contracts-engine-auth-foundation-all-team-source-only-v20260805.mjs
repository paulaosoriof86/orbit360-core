#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = 'block-auth-foundation-all-team-source-only-v20260805';
const VERSION = '13.6.0';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-foundation-all-team-source-only-v20260805.json';
const REQUEST = process.env.ORBIT360_REQUEST_FILE || '.github/orbit360-requests/auth-foundation-all-team-source-only-v20260805.json';
const WORKFLOW = '.github/workflows/orbit360-auth-access-recovery-lab-v3-20260805.yml';
const PLAN = 'tools/orbit360-auth-foundation-all-team-plan-v20260805.mjs';
const TEST = 'tools/orbit360-test-auth-foundation-all-team-source-only-v20260805.mjs';
const REGISTER = 'tools/orbit360-register-auth-foundation-all-team-gate-source-only-v20260805.mjs';
const V6_LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-auth-access-recovery-source-only-v6-20260805.json';
const V6_REQUEST = '.github/orbit360-requests/auth-access-recovery-source-only-v6-20260805.json';
const FORENSIC = 'orbit360-platform/docs/AUDITORIA-FORENSE-AUTH-SOLUCION-DEFINITIVA-20260805.md';
const BOOTSTRAP = 'tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs';
const ONBOARDING = 'functions/user-onboarding.js';
const TEAM = 'orbit360-platform/modules/equipo.js';
const BRIDGE = 'orbit360-platform/modules/equipo-onboarding-v20260804-bridge.js';
const LOGIN = 'orbit360-platform/core/auth.js';
const RULES = 'firestore.rules';
const FUTURE_V7 = '.github/orbit360-requests/auth-access-recovery-lab-v7-20260805.json';
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const ZERO = Object.freeze({secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false});
const checks=[];
const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,700)});
const rel=value=>path.join(ROOT,value);
const exists=value=>fs.existsSync(rel(value));
const read=value=>JSON.parse(fs.readFileSync(rel(value),'utf8'));
const text=value=>fs.readFileSync(rel(value),'utf8');
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

let result;
try {
  const lifecycle=read(LIFECYCLE);
  const request=read(REQUEST);
  const workflow=text(WORKFLOW);
  const plan=text(PLAN);
  const forensic=text(FORENSIC);
  const bootstrap=text(BOOTSTRAP);
  const onboarding=text(ONBOARDING);
  const team=text(TEAM);
  const bridge=text(BRIDGE);
  const login=text(LOGIN);
  const rules=text(RULES);
  const v6=read(V6_LIFECYCLE);
  const cap=lifecycle.executionProfile?.capabilities||{};
  const coverage=lifecycle.coverageContract||{};
  const scope=request.scope||{};
  const changed=git(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).split(/\r?\n/).filter(Boolean);
  const parent=git(['rev-parse','HEAD^']);

  add('GATE_ID_VERSION',process.argv[2]===GATE&&lifecycle.gateId===GATE&&lifecycle.gateContractVersion===VERSION);
  add('LIFECYCLE_AUTHORIZED_ONCE',lifecycle.status==='AUTH_FOUNDATION_ALL_TEAM_SOURCE_ONLY_AUTHORIZED_ONCE'&&lifecycle.authorization?.activeRequest===true&&lifecycle.authorization?.allowedExecutions===1&&lifecycle.authorization?.consumed===false&&lifecycle.authorization?.replayAllowed===false);
  add('ZERO_CAPABILITIES',same(cap,ZERO));
  add('REQUEST_ACTIVE',request.schemaVersion==='orbit360-auth-foundation-all-team-source-only-request-v1'&&request.gateId===GATE&&request.status==='AUTHORIZED_ONCE'&&request.approved===true&&request.allowedExecutions===1&&request.consumed===false&&request.replayAllowed===false);
  add('REQUEST_BINDING',request.rcId==='RC-AYS-LAB-CANONICA-01'&&request.branch==='ays/backend-tenant-lab-v99-20260703'&&request.pullRequest===5&&request.parentHead===parent);
  add('REQUEST_SINGLE_FILE_COMMIT',changed.length===1&&changed[0]===REQUEST,changed.join(','));
  add('SOURCE_SCOPE_POSITIVE',scope.validateSevenCurrentUsers===true&&scope.validateThreeFunctionalProfiles===true&&scope.validateFutureUserPath===true&&scope.validateBootstrapSeparation===true&&scope.validateSplitBrainRootCause===true&&scope.validatePasswordRecoveryGap===true&&scope.validateRulesDemoDebt===true&&scope.validateSourceFixtures===true);
  add('SOURCE_SCOPE_NEGATIVE',['secrets','firebase','firestore','auth','functions','hosting','browser','deploy','rules','reimport','crm','production','main','merge'].every(key=>scope[key]===false));
  add('V6_CONSUMED_PASS',v6.status==='AUTH_ACCESS_RECOVERY_SOURCE_ONLY_V6_CONSUMED_PASS'&&v6.authorization?.consumed===true&&v6.authorization?.allowedExecutions===0&&v6.authorization?.replayAllowed===false&&v6.executionResult?.ok===true);
  add('V6_REQUEST_IMMUTABLE',git(['hash-object',V6_REQUEST])==='28f9ea2beda77827ece06a4d06d3e36795736ccd');
  add('V7_ABSENT_AND_SUSPENDED',!exists(FUTURE_V7)&&forensic.includes('SUSPENDIDO / NO EJECUTADO / REQUEST AUSENTE'));

  add('COVERAGE_CONTRACT_7_OF_7',coverage.currentActiveTeamExpected===7&&coverage.currentIdentityCoverageRequired==='7/7');
  add('FUNCTIONAL_PROFILES_3_OF_3',same(coverage.functionalRoleProfiles,['direccion','operativo','asesor'])&&coverage.functionalProfileCoverageRequired==='3/3');
  add('FUTURE_USERS_GENERIC',coverage.futureUsersSupported===true&&coverage.dynamicRosterSource==='tenant_team_configuration'&&coverage.genericOwnerMayHardcodePeople===false);
  add('PLAN_DYNAMIC_COUNT',plan.includes('expectedActiveCount = 7')&&plan.includes('teamRecords')&&plan.includes('allCurrentUsersCovered'));
  add('PLAN_BOOTSTRAP_SEPARATED',plan.includes('BOOTSTRAP_ADMIN_REQUIRED')&&plan.includes('normal_onboarding_callable_after_bootstrap'));
  add('PLAN_NO_PERSON_HARDCODE',!/(Paula|Carlos|Samuel|Fernando)/.test(plan));

  add('EXISTING_ADMIN_SDK_BOOTSTRAP_REUSABLE',bootstrap.includes("from 'firebase-admin/auth'")&&bootstrap.includes('auth.createUser')&&bootstrap.includes('db.runTransaction')&&bootstrap.includes('deleteCreatedUsers'));
  add('NORMAL_ONBOARDING_REQUIRES_EXISTING_ADMIN',onboarding.includes('async function authorize')&&onboarding.includes('Membresía administrativa requerida')&&onboarding.includes('El rol activo no permite administrar accesos'));
  add('TEAM_SPLIT_BRAIN_CONFIRMED',team.includes('accessProvisioned = false')&&team.includes("invitacionEstado = 'pendiente_habilitacion'"));
  add('BRIDGE_FAIL_SOFT_CONFIRMED',bridge.includes('!Orbit.userOnboarding.available()')&&bridge.includes('return null'));
  add('PASSWORD_RECOVERY_GAP_CONFIRMED',!login.includes('sendPasswordResetEmail')&&!login.includes('Olvidé mi contraseña'));
  add('RULES_DEMO_DEBT_CONFIRMED',rules.includes('function isLabUser()')&&rules.includes('orbit.lab@demo.com'));
  add('REQUIRED_FILES_PRESENT',[LIFECYCLE,WORKFLOW,PLAN,TEST,REGISTER,V6_LIFECYCLE,FORENSIC,BOOTSTRAP,ONBOARDING,TEAM,BRIDGE,LOGIN,RULES].every(exists));

  let fixture=null;
  try { fixture=JSON.parse(execFileSync(process.execPath,[TEST],{cwd:ROOT,encoding:'utf8'}).trim()); }
  catch(error){ fixture={ok:false,error:String(error?.stderr||error?.message||error).slice(0,500)}; }
  add('SOURCE_FIXTURES_PASS',fixture?.ok===true&&fixture?.currentUsersCovered===7&&fixture?.expectedCurrentUsers===7&&fixture?.functionalProfilesCovered===3&&fixture?.futureUserPathSupported===true,JSON.stringify(fixture));
  add('SOURCE_FIXTURES_ZERO_CAPABILITIES',fixture?.operationalCapabilitiesUsed===0);
  add('WORKFLOW_NEW_PATH',workflow.includes(".github/orbit360-requests/auth-foundation-all-team-source-only-v20260805.json")&&workflow.includes('block-auth-foundation-all-team-source-only-v20260805'));
  add('WORKFLOW_ZERO_CAPABILITIES',!['${{ secrets.','firebase deploy','firebase-admin','playwright','curl ','wget ','gcloud '].some(token=>workflow.includes(token)));
  add('WORKFLOW_CANONICAL_GATE',workflow.includes('node tools/orbit360-validar-gate-contracts-v20260717.mjs "$ORBIT360_GATE_ID"'));

  const failed=checks.filter(item=>!item.ok);
  const ok=failed.length===0;
  result={
    schemaVersion:'orbit360-auth-foundation-all-team-source-only-gate-v1',gateId:GATE,contractVersion:VERSION,
    status:ok?'GO_GATE_CONTRACT':'STOP_RETRY',classification:ok?'AUTH_FOUNDATION_ALL_TEAM_SOURCE_ONLY_READY':'PIPELINE_MECHANISM_FAILURE',
    total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,
    executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,authWriteAuthorized:false,
    runtimeAuthorized:false,browserAuthorized:false,deployAuthorized:false,functionsDeployAuthorized:false,hostingDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,
    dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authReads:0,authWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,
    currentUsersCovered:fixture?.currentUsersCovered||0,expectedCurrentUsers:7,functionalProfilesCovered:fixture?.functionalProfilesCovered||0,futureUserPathSupported:fixture?.futureUserPathSupported===true,
    bootstrapSeparatedFromNormalOnboarding:checks.find(x=>x.id==='PLAN_BOOTSTRAP_SEPARATED')?.ok===true,
    runtimeV7Absent:!exists(FUTURE_V7),sourceFixtures:fixture,containsPII:false,containsSecrets:false,ok
  };
} catch(error) {
  result={schemaVersion:'orbit360-auth-foundation-all-team-source-only-gate-v1',gateId:GATE,contractVersion:VERSION,status:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',error:String(error?.message||error).replace(/[\r\n]+/g,' ').replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,700),executionAuthorized:false,secretAccessAuthorized:false,firestoreReadAuthorized:false,writeAuthorized:false,authWriteAuthorized:false,runtimeAuthorized:false,browserAuthorized:false,deployAuthorized:false,functionsDeployAuthorized:false,hostingDeployAuthorized:false,rulesDeployAuthorized:false,productionAuthorized:false,dataAccess:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authReads:0,authWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};
}
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');
console.log(JSON.stringify(result,null,2));
process.exit(result.status==='GO_GATE_CONTRACT'?0:41);
