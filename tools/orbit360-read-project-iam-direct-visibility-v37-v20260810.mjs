#!/usr/bin/env node
'use strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT='ays-orbit-360-lab';
const TEST_PERMISSION='resourcemanager.projects.getIamPolicy';
const ROLES=['roles/owner','roles/iam.securityAdmin','roles/logging.admin','roles/iam.devOps','roles/iam.infrastructureAdmin','roles/iam.networkAdmin'];
const OUT=process.env.ORBIT360_V37_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/v37-project-iam-direct-visibility-sanitized-v20260810.json';
const fp=v=>crypto.createHash('sha256').update(`orbit360:v37:project-iam-direct:${String(v)}`,'utf8').digest('hex').slice(0,20);
const directIdentity=n=>typeof n==='string'&&(n.startsWith('user:')||n.startsWith('serviceAccount:'));
const principalValue=n=>String(n).replace(/^(user:|serviceAccount:)/,'');
const principalType=n=>String(n).startsWith('serviceAccount:')?'SERVICE_ACCOUNT':'USER';
const isGroupOrDomain=n=>typeof n==='string'&&(n.startsWith('group:')||n.startsWith('domain:'));
const isCustomRole=r=>typeof r==='string'&&(r.startsWith('projects/')||r.startsWith('organizations/'))&&r.includes('/roles/');

function base(){return {schemaVersion:'orbit360-v37-project-iam-direct-visibility-v1',gateId:'block1-client360-insurers-lab-v20260717',contractVersion:'1.0.41',projectClass:'LAB_PROJECT',testPermission:TEST_PERMISSION,testIamPermissionsCalls:0,testPermissionEffective:false,projectIamPolicyReads:0,requestedPolicyVersion:3,returnedPolicyVersion:null,candidateRoleCount:ROLES.length,candidateCount:0,ambiguousBindingCount:0,unverifiedCustomRoleBindingCount:0,candidates:[],iamPolicyWrites:0,iamWrites:0,policyAnalyzerQueries:0,policyTroubleshooterQueries:0,firestoreReads:0,authReads:0,loggingEntryReads:0,operationalWrites:0,rawPoliciesPersisted:false,rawPrincipalsPersisted:false,principalFingerprintsOnly:true,credentialsPersisted:false,containsPII:false,containsSecrets:false,runtimeExecuted:true};}
function persist(v){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(v,null,2)+'\n','utf8');console.log(JSON.stringify({decision:v.decision,classification:v.classification,testPermissionEffective:v.testPermissionEffective,projectIamPolicyReads:v.projectIamPolicyReads,candidateCount:v.candidateCount,ambiguousBindingCount:v.ambiguousBindingCount,iamWrites:v.iamWrites,ok:v.ok}));return v;}
function fail(rootCause,partial={}){return persist({...base(),...partial,decision:'STOP_RETRY',classification:'ENVIRONMENT_FAILURE',rootCause,ok:false});}
async function token(sa){const {GoogleAuth}=await import('google-auth-library');const auth=new GoogleAuth({credentials:sa,scopes:['https://www.googleapis.com/auth/cloud-platform.read-only']});const c=await auth.getClient();const t=await c.getAccessToken();return typeof t==='string'?t:t?.token;}
async function requestJson(url,tok,{method='POST',body={}}={}){const r=await fetch(url,{method,headers:{authorization:`Bearer ${tok}`,'content-type':'application/json'},body:JSON.stringify(body)});if(!r.ok){const e=new Error(`HTTP_${r.status}`);e.status=r.status;throw e;}return r.json();}
function parsePolicy(policy,targetPrincipal){const byPrincipal=new Map();let ambiguousBindingCount=0;let unverifiedCustomRoleBindingCount=0;for(const b of (Array.isArray(policy?.bindings)?policy.bindings:[])){
    const role=String(b?.role||'');const conditionPresent=Boolean(b?.condition);const members=Array.isArray(b?.members)?b.members:[];
    if(isCustomRole(role)&&members.length>0){unverifiedCustomRoleBindingCount++;continue;}
    if(!ROLES.includes(role))continue;
    if(conditionPresent){ambiguousBindingCount++;continue;}
    for(const m of members){const member=String(m||'');if(principalValue(member)===targetPrincipal&&directIdentity(member))continue;
      if(isGroupOrDomain(member)||(!directIdentity(member)&&member)){ambiguousBindingCount++;continue;}
      if(!directIdentity(member))continue;
      const current=byPrincipal.get(member)||{identity:member,roles:new Set()};current.roles.add(role);byPrincipal.set(member,current);
    }
  }
  const candidates=[...byPrincipal.values()].map(x=>({fingerprint:fp(x.identity),principalType:principalType(x.identity),roleIds:[...x.roles].sort(),conditional:false})).sort((a,b)=>a.fingerprint.localeCompare(b.fingerprint));
  return {candidates,ambiguousBindingCount,unverifiedCustomRoleBindingCount};}
function sourceOnly(){const target='target@example.iam.gserviceaccount.com';const clean={version:3,bindings:[{role:'roles/logging.admin',members:['serviceAccount:executor@example.iam.gserviceaccount.com']},{role:'roles/editor',members:['user:reader@example.com']},{role:'roles/owner',members:[`serviceAccount:${target}`]}]};const ambiguous={version:3,bindings:[...clean.bindings,{role:'roles/iam.securityAdmin',members:['group:admins@example.com']},{role:'roles/logging.admin',members:['user:conditional@example.com'],condition:{title:'x',expression:'true'}},{role:'projects/x/roles/customAdmin',members:['user:custom@example.com']} ]};const a=parsePolicy(clean,target),b=parsePolicy(ambiguous,target);const fixtureCandidateParsing=a.candidates.length===1&&a.ambiguousBindingCount===0&&a.unverifiedCustomRoleBindingCount===0&&b.candidates.length===1&&b.ambiguousBindingCount===2&&b.unverifiedCustomRoleBindingCount===1;return persist({...base(),runtimeExecuted:false,networkAccess:false,secretAccess:false,fixtureCandidateParsing,decision:'SOURCE_ONLY_RUNTIME_READY',classification:'ENVIRONMENT_PROJECT_IAM_DIRECT_VISIBILITY_RUNTIME_SOURCE_READY',ok:fixtureCandidateParsing});}
export async function run(sa){let evidence=base();let tok;try{tok=await token(sa);if(!tok)return fail('ACCESS_TOKEN_UNAVAILABLE',evidence);}catch{return fail('ACCESS_TOKEN_UNAVAILABLE',evidence);}
  evidence.testIamPermissionsCalls=1;let test;try{test=await requestJson(`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:testIamPermissions`,tok,{body:{permissions:[TEST_PERMISSION]}});}catch(e){return fail(e.status===403?'PROJECT_IAM_TEST_PERMISSION_FORBIDDEN':'PROJECT_IAM_TEST_PERMISSION_UNAVAILABLE',evidence);}
  evidence.testPermissionEffective=Array.isArray(test?.permissions)&&test.permissions.includes(TEST_PERMISSION);if(!evidence.testPermissionEffective)return fail('PROJECT_GET_IAM_POLICY_PERMISSION_NOT_EFFECTIVE',evidence);
  evidence.projectIamPolicyReads=1;let policy;try{policy=await requestJson(`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:getIamPolicy`,tok,{body:{options:{requestedPolicyVersion:3}}});}catch(e){return fail(e.status===403?'PROJECT_IAM_POLICY_READ_FORBIDDEN':'PROJECT_IAM_POLICY_READ_UNAVAILABLE',evidence);}
  evidence.returnedPolicyVersion=Number.isInteger(policy?.version)?policy.version:null;const parsed=parsePolicy(policy,String(sa.client_email||''));evidence.candidateCount=parsed.candidates.length;evidence.ambiguousBindingCount=parsed.ambiguousBindingCount;evidence.unverifiedCustomRoleBindingCount=parsed.unverifiedCustomRoleBindingCount;evidence.candidates=parsed.candidates;
  if(evidence.ambiguousBindingCount>0||evidence.unverifiedCustomRoleBindingCount>0)return fail('PROJECT_IAM_EVIDENCE_AMBIGUOUS',evidence);
  if(evidence.candidateCount===0)return fail('NO_DIRECT_SOURCE_VERIFIED_IAM_EXECUTOR_CANDIDATE',evidence);
  if(evidence.candidateCount>1)return fail('MULTIPLE_DIRECT_SOURCE_VERIFIED_IAM_EXECUTOR_CANDIDATES',evidence);
  return persist({...evidence,decision:'DIRECT_IAM_EXECUTOR_CANDIDATE_IDENTIFIED',classification:'ENVIRONMENT_PROJECT_IAM_DIRECT_VISIBILITY_PASS',selectedExecutorFingerprint:evidence.candidates[0].fingerprint,selectedExecutorType:evidence.candidates[0].principalType,selectedRoleIds:evidence.candidates[0].roleIds,rootCause:null,ok:true});}
async function main(){if(process.env.ORBIT360_SOURCE_ONLY==='1')return sourceOnly();const key=process.env.GOOGLE_APPLICATION_CREDENTIALS;if(!key)throw new Error('CREDENTIAL_PATH_MISSING');const sa=JSON.parse(fs.readFileSync(key,'utf8'));if(sa.project_id!==PROJECT)throw new Error('PROJECT_MISMATCH');const out=await run(sa);if(!out.ok)process.exitCode=42;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){main().catch(e=>{persist({...base(),decision:'STOP_RETRY',classification:'PIPELINE_MECHANISM_FAILURE',rootCause:String(e?.message||e).slice(0,160),ok:false});process.exit(42);});}
