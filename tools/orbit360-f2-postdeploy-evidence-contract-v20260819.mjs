#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const POSTDEPLOY_EVIDENCE_CONTRACT_VERSION='F2_POSTDEPLOY_EVIDENCE_PRODUCER_CONTRACT_V1';
export const POSTDEPLOY_RUN_ID='32272580947';
export const POSTDEPLOY_ARTIFACT_ID=9372746151;
export const POSTDEPLOY_ARTIFACT_DIGEST='sha256:c087ad3bae277f990c760eb04edcce96ef2746add36120040ba6da5f4d55a860';
export const EXACT_ARTIFACT_ID=9345207863;
export const PROBE_PATH='tenants/orbit360-f2-cross-tenant-probe/system/config';

const runEq=(v)=>String(v??'')===POSTDEPLOY_RUN_ID;
const fail=(code)=>{const e=new Error(code);e.code=code;throw e;};
const need=(ok,code)=>{if(!ok)fail(code);};

export function assemblePostdeployEvidence({terminal,probe,integrity}){
  need(terminal&&typeof terminal==='object','PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_TERMINAL_MISSING');
  need(probe&&typeof probe==='object','PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_PROBE_DETAIL_MISSING');
  need(integrity&&typeof integrity==='object','PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_INTEGRITY_DETAIL_MISSING');

  need(terminal.schemaVersion==='orbit360-f2-rules01-postdeploy-probe-terminal-v1','PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_TERMINAL_SCHEMA_MISMATCH');
  need(terminal.ok===true&&terminal.status==='F2_RULES01_POSTDEPLOY_CROSS_TENANT_PROBE_PASS'&&terminal.classification==='PASS','PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_TERMINAL_NOT_PASS');
  need(runEq(terminal.runId),'PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_TERMINAL_RUN_MISMATCH');
  need(terminal.rulesRedeployExecuted===false&&terminal.crossTenantForcedServerDenied===true&&terminal.integrityBeforeAfterPass===true,'PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_TERMINAL_CONTROL_FLAGS_MISMATCH');
  for(const k of ['firestoreDocumentWrites','authWrites','membershipWrites','dataWrites']) need(Number(terminal[k])===0,`SECURITY_FAILURE:POSTDEPLOY_TERMINAL_WRITE_NONZERO:${k}`);
  for(const k of ['hostingDeploy','functionsDeploy','packageRebuild','publication','production']) need(terminal[k]===false,`SECURITY_FAILURE:POSTDEPLOY_TERMINAL_FORBIDDEN_EFFECT:${k}`);
  need(terminal.request06Created===false,'SECURITY_FAILURE:POSTDEPLOY_TERMINAL_REQUEST06_UNEXPECTED');

  need(probe.schemaVersion==='orbit360-f2-cross-tenant-forced-server-probe-v2','PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_PROBE_SCHEMA_MISMATCH');
  need(probe.ok===true&&probe.status==='F2_CROSS_TENANT_FORCED_SERVER_DENY_PASS'&&probe.classification==='PASS','SECURITY_FAILURE:POSTDEPLOY_PROBE_NOT_PASS');
  need(runEq(probe.runId),'PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_PROBE_RUN_MISMATCH');
  need(Number(probe.candidateArtifactId)===EXACT_ARTIFACT_ID,'DATA_CONTRACT_FAILURE:POSTDEPLOY_PROBE_ARTIFACT_MISMATCH');
  need(probe.serverForced===true&&probe.transport==='firestore-rest-v1-node-fetch'&&probe.forcedServerEvidence===true,'PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_PROBE_NOT_SERVER_FORCED');
  need(probe.probeDocumentPath===PROBE_PATH&&probe.probePathValid===true,'VALIDATOR_STALE:POSTDEPLOY_PROBE_PATH_CONTRACT_MISMATCH');
  need(Number(probe.responseStatus)===403&&probe.responseErrorStatus==='PERMISSION_DENIED'&&probe.crossTenantDenied===true,'SECURITY_FAILURE:POSTDEPLOY_CROSS_TENANT_DENY_NOT_PROVEN');
  for(const k of ['firestoreDocumentWrites','authWrites','membershipWrites','dataWrites']) need(Number(probe[k])===0,`SECURITY_FAILURE:POSTDEPLOY_PROBE_WRITE_NONZERO:${k}`);
  for(const k of ['hostingDeploy','functionsDeploy','packageRebuild','publication','production']) need(probe[k]===false,`SECURITY_FAILURE:POSTDEPLOY_PROBE_FORBIDDEN_EFFECT:${k}`);

  need(integrity.schemaVersion==='orbit360-f2-integrity-before-after-v1','PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_INTEGRITY_SCHEMA_MISMATCH');
  need(integrity.ok===true&&integrity.status==='F2_INTEGRITY_BEFORE_AFTER_PASS'&&integrity.countsIdentical===true&&integrity.digestsIdentical===true,'SECURITY_FAILURE:POSTDEPLOY_INTEGRITY_NOT_IDENTICAL');
  need(Number(integrity.firestoreWrites)===0&&Number(integrity.authWrites)===0&&Number(integrity.operationalWrites)===0,'SECURITY_FAILURE:POSTDEPLOY_INTEGRITY_WRITE_NONZERO');

  return {
    schemaVersion:'orbit360-f2-postdeploy-composite-evidence-v1',evidenceContractVersion:POSTDEPLOY_EVIDENCE_CONTRACT_VERSION,
    ok:true,status:'F2_RULES01_POSTDEPLOY_COMPOSITE_EVIDENCE_PASS',classification:'PASS',runId:Number(POSTDEPLOY_RUN_ID),
    artifactId:POSTDEPLOY_ARTIFACT_ID,artifactDigest:POSTDEPLOY_ARTIFACT_DIGEST,candidateArtifactId:EXACT_ARTIFACT_ID,
    terminal:{flatProducerSchema:true,status:terminal.status,rulesRedeployExecuted:false,request06Created:false},
    probe:{serverForced:true,transport:probe.transport,documentPath:probe.probeDocumentPath,pathValid:true,responseStatus:403,responseErrorStatus:'PERMISSION_DENIED',crossTenantDenied:true},
    integrity:{beforeAfterPass:true,countsIdentical:true,digestsIdentical:true},writes:{firestoreDocument:0,auth:0,membership:0,data:0,operational:0},
    forbiddenEffects:{rulesRedeploy:false,hosting:false,functions:false,rebuild:false,publication:false,production:false},containsPII:false,containsSecrets:false
  };
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:'';}
const isCli=Boolean(process.argv[1])&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]);
if(isCli){
  try{
    const terminalPath=arg('--terminal'),probePath=arg('--probe'),integrityPath=arg('--integrity'),out=arg('--out');
    need(terminalPath&&probePath&&integrityPath&&out,'PIPELINE_MECHANISM_FAILURE:POSTDEPLOY_EVIDENCE_CLI_ARGS_REQUIRED');
    const read=(p)=>JSON.parse(fs.readFileSync(path.resolve(p),'utf8'));
    const composite={...assemblePostdeployEvidence({terminal:read(terminalPath),probe:read(probePath),integrity:read(integrityPath)}),generatedAt:new Date().toISOString()};
    const target=path.resolve(out);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(composite,null,2)+'\n','utf8');console.log(JSON.stringify(composite,null,2));
  }catch(error){console.error(String(error?.message||error));process.exitCode=41;}
}
