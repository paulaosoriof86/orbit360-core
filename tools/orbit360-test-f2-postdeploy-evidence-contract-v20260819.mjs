#!/usr/bin/env node
'use strict';
import {assemblePostdeployEvidence,POSTDEPLOY_EVIDENCE_CONTRACT_VERSION,PROBE_PATH} from './orbit360-f2-postdeploy-evidence-contract-v20260819.mjs';

const clone=v=>JSON.parse(JSON.stringify(v));
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const terminal={schemaVersion:'orbit360-f2-rules01-postdeploy-probe-terminal-v1',ok:true,status:'F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_PASS',classification:'PASS',runId:'32272580947',rulesRedeployExecuted:false,crossTenantForcedServerDenied:true,integrityBeforeAfterPass:true,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false,request06Created:false,containsPII:false,containsSecrets:false};
const probe={schemaVersion:'orbit360-f2-cross-tenant-forced-server-probe-v2',runId:'32272580947',candidateArtifactId:9345207863,candidateSourceHead:'29caae94a3db1f1626bdde2ea6ee9a21799f9df6',serverForced:true,transport:'firestore-rest-v1-node-fetch',probeDocumentPath:PROBE_PATH,probePathValid:true,browserExecuted:true,authRead:true,firestoreRead:true,firestoreDocumentWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,hostingDeploy:false,functionsDeploy:false,packageRebuild:false,publication:false,production:false,customTokenPersisted:false,idTokenPersisted:false,ok:true,status:'F2_CROSS_TENANT_FORCED_SERVER_DENY_PASS',classification:'PASS',responseStatus:403,responseErrorStatus:'PERMISSION_DENIED',crossTenantDenied:true,cacheEligible:false,forcedServerEvidence:true,containsPII:false,containsSecrets:false};
const integrity={schemaVersion:'orbit360-f2-integrity-before-after-v1',ok:true,status:'F2_INTEGRITY_BEFORE_AFTER_PASS',countsIdentical:true,digestsIdentical:true,firestoreWrites:0,authWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false};

function mustFail(mutator,expectedPrefix){
  const t=clone(terminal),p=clone(probe),i=clone(integrity);mutator(t,p,i);let error='';
  try{assemblePostdeployEvidence({terminal:t,probe:p,integrity:i});}catch(e){error=String(e?.message||e);}
  need(error.startsWith(expectedPrefix),`SELFTEST_EXPECTED_FAILURE_MISSING:${expectedPrefix}:${error||'NO_ERROR'}`);
}

const pass=assemblePostdeployEvidence({terminal:clone(terminal),probe:clone(probe),integrity:clone(integrity)});
need(pass.ok===true&&pass.evidenceContractVersion===POSTDEPLOY_EVIDENCE_CONTRACT_VERSION&&pass.probe.responseStatus===403&&pass.probe.responseErrorStatus==='PERMISSION_DENIED'&&pass.integrity.countsIdentical===true&&pass.writes.firestoreDocument===0,'SELFTEST_PASS_ASSEMBLY_INVALID');
mustFail((t,p)=>{p.responseStatus=400;p.responseErrorStatus='INVALID_ARGUMENT';p.ok=false;p.status='VALIDATOR_STALE';p.classification='VALIDATOR_STALE';},'SECURITY_FAILURE:POSTDEPLOY_PROBE_NOT_PASS');
mustFail((t,p)=>{p.probeDocumentPath='tenants/__reserved__/system/config';p.probePathValid=false;},'VALIDATOR_STALE:POSTDEPLOY_PROBE_PATH_CONTRACT_MISMATCH');
mustFail((t,p,i)=>{i.digestsIdentical=false;i.ok=false;i.status='SECURITY_FAILURE_F2_INTEGRITY_CHANGED';},'SECURITY_FAILURE:POSTDEPLOY_INTEGRITY_NOT_IDENTICAL');
mustFail((t)=>{t.rulesRedeployExecuted=true;},'PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_TERMINAL_CONTROL_FLAGS_MISMATCH');
mustFail((t)=>{t.firestoreDocumentWrites=1;},'SECURITY_FAILURE:POSTDEPLOY_TERMINAL_WRITE_NONZERO:firestoreDocumentWrites');

console.log(JSON.stringify({schemaVersion:'orbit360-f2-postdeploy-evidence-contract-selftest-v1',ok:true,status:'F2_POSTDEPLOY_EVIDENCE_PRODUCER_CONTRACT_SELFTEST_PASS',contractVersion:POSTDEPLOY_EVIDENCE_CONTRACT_VERSION,passAssembly:true,negativeInvalidArgument:true,negativeReservedPath:true,negativeIntegrityChange:true,negativeRulesRedeploy:true,negativeWrite:true,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,writes:0,request06Created:false,containsPII:false,containsSecrets:false},null,2));
