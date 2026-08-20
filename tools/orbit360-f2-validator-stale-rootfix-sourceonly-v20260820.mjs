#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const GATE='f2-productive-acceptance-exact-successor-v20260818';
const REQUEST_VERSION='F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-request11-validator-stale-rootfix-sourceonly-v20260820.json');
const PREFLIGHT_COPY=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-request11-rootfix-source-preflight-v20260820.json');
const SYN_SELFTEST=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-request12-synthetic-selftest-v20260820.json');
const ROUTER=path.join(ROOT,'tools/orbit360-validar-gate-contracts-v20260717.mjs');
const SELFTEST=path.join(ROOT,'tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs');
const ENGINE=path.join(ROOT,'tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs');
const RUNNER=path.join(ROOT,'tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs');
const REQ11=path.join(ROOT,'.github/orbit360-requests/f2-productive-acceptance-runtime-browser-readonly-runbound-20260820-11.json');
const AUTH11=path.join(ROOT,'.github/orbit360-authorizations/f2-productive-acceptance-runtime-browser-readonly-request11-v20260820.json');
const DISPATCH=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-request11-runtime-dispatch-probe-v20260820.json');
const SYN_AUTH_REL='.github/orbit360-authorizations/f2-productive-acceptance-runtime-browser-readonly-request12-v20260820.json';
const SYN_REQ_REL='.github/orbit360-requests/f2-productive-acceptance-runtime-browser-readonly-runbound-synthetic-20260820-12.json';
const SYN_AUTH=path.join(ROOT,SYN_AUTH_REL),SYN_REQ=path.join(ROOT,SYN_REQ_REL);
const PRE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/preflight-sanitizado.json');
const CANDIDATE={artifactId:9387820198,sourceHead:'fc46bd85783d8b4d524cbeb0fee54ee9a2c774af',zipSha256:'58fcbe6e8d7d3a425509c87f229b1cb12dd35a99133d46c757544cc75c55aacc',manifestSha256:'b18422fdf82830d28e82f657f83b4fd5c10ea134a4735263fa2587a2ddd808cb',manifestStatus:'FASE_A_PRODUCT_F2_REQUEST08_ROUTER_READINESS_SUCCESSOR_CERTIFIED',fileCount:194};
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p).replace(/^\uFEFF/,''));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(args,env={})=>execFileSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,...env}});
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n','utf8');};
const scope={candidateArtifactRead:true,existingIdentityRead:true,membershipRead:true,secrets:true,firestoreRead:true,customTokenMint:true,browser:true,runtime:true,writes:false,firestoreWrites:false,authWrites:false,membershipWrites:false,dataWrites:false,operationalWrites:false,packageRebuild:false,deploy:false,publish:false,publication:false,production:false,productionMutation:false,main:false,merge:false};
const result={schemaVersion:'orbit360-f2-validator-stale-rootfix-sourceonly-v1',ok:false,status:'F2_REQUEST11_VALIDATOR_STALE_ROOTFIX_SOURCEONLY_FAIL',classification:'VALIDATOR_STALE',rootCause:'VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_PATH_BINDING_LITERAL_ADJACENCY_STALE',candidateArtifactId:CANDIDATE.artifactId,request11RunId:32330791880,preflight:false,coherence:false,synthetic:false,request11Replay:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,membershipWrites:0,dataWrites:0,operationalWrites:0,deployExecuted:false,publicationExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,errors:[]};
const routerOriginal=read(ROUTER);
try{
  // 1) PRE-FLIGHT: canonical source gate before any synthetic runtime-mode gate.
  try{
    run(['tools/orbit360-validar-gate-contracts-v20260717.mjs',GATE],{ORBIT360_EXPECTED_REQUEST_VERSION:'NONE_PENDING_FRESH_AUTHORIZATION',ORBIT360_REQUEST_FILE:''});
    const p=json(PRE); write(PREFLIGHT_COPY,p);
    if(!(p.ok===true&&p.status==='PASS_GATE_CONTRACT_SOURCE_F2_PRODUCTIVE_ACCEPTANCE'&&p.executionAuthorized===false&&p.secretAccessAuthorized===false&&p.runtimeAuthorized===false&&p.browserAuthorized===false)) throw new Error('SOURCE_PREFLIGHT_PAYLOAD_INVALID');
    result.preflight=true;
  }catch(e){result.errors.push('PREFLIGHT:'+String(e?.message||e).slice(0,400));}

  // 2) COHERENCE: verify root cause, consumed Request11 and reusable/dynamic guard design.
  try{
    const self=read(SELFTEST),engine=read(ENGINE),runner=read(RUNNER),req11=json(REQ11),auth11=json(AUTH11),dispatch=json(DISPATCH);
    const checks={
      request11Consumed:req11.consumed===true&&req11.allowedExecutions===0&&req11.replayAllowed===false&&req11.runtimeRunId===32330791880&&req11.classification==='VALIDATOR_STALE',
      authorization11Consumed:auth11.consumed===true&&auth11.allowedExecutions===0&&auth11.replayAllowed===false&&auth11.runtimeRunId===32330791880,
      dispatchExact:dispatch.ok===true&&dispatch.uniquenessCount===1&&Number(dispatch.run?.id)===32330791880&&dispatch.run?.conclusion==='failure',
      semanticProbeSelftest:self.includes('F2_FULL_RUNTIME_PROBE_SEMANTIC_BINDING_MISSING')&&self.includes('probeSemanticBinding'),
      staleAdjacencyRemoved:!self.includes("runner.includes('page.evaluate(async deniedPath=>')&&runner.includes('},PROBE_DOCUMENT_PATH);need(crossTenantDenied')"),
      dynamicOrdinalSelftest:self.includes('dynamicOrdinal:true')&&!self.includes("authorizationRecordPath==='.github/orbit360-authorizations/f2-productive-acceptance-runtime-browser-readonly-request11-v20260820.json'"),
      dynamicAuthorizationEngine:engine.includes('authorizationRecordPath=String(request.authorizationRecordPath')&&engine.includes('Number(authorization.requestOrdinal)===requestOrdinal')&&!engine.includes("AUTH_RECORD='.github/orbit360-authorizations/f2-productive-acceptance-runtime-browser-readonly-request11-v20260820.json'"),
      runnerSemantics:/page\.evaluate\(async\s+deniedPath\s*=>[\s\S]*?ctx\.modules\.store\.doc\(ctx\.db,deniedPath\)[\s\S]*?\},\s*PROBE_DOCUMENT_PATH\)/.test(runner)&&runner.includes('crossTenantDeniedObserved=crossTenantDenied')&&runner.includes("need(crossTenantDenied,'SECURITY_FAILURE:F2_CROSS_TENANT_READ_NOT_DENIED')")
    };
    if(!Object.values(checks).every(Boolean)) throw new Error('COHERENCE_CHECK_FAILED:'+JSON.stringify(checks));
    result.coherence=true; result.coherenceChecks=checks;
  }catch(e){result.errors.push('COHERENCE:'+String(e?.message||e).slice(0,700));}

  // 3) SYNTHETIC: temporary Request12 + persisted authorization, no secrets/browser/provider/data access.
  try{
    const basis='SYNTHETIC_SOURCE_ONLY_F2_REQUEST12_DYNAMIC_AUTHORIZATION_VALIDATION';
    const auth={schemaVersion:'orbit360-f2-runtime-authorization-v1',status:'AUTHORIZED_PERSISTED_PENDING_REQUEST',approved:true,requestVersion:REQUEST_VERSION,requestOrdinal:12,gateId:GATE,branch:'ays/backend-tenant-lab-v99-20260703',pullRequest:5,authorizationBasis:basis,authorizedAt:'2026-08-20T04:25:00.000Z',allowedExecutions:1,consumed:false,authorizationFrozen:true,replayAllowed:false,candidateArtifactId:CANDIDATE.artifactId,candidateSourceHead:CANDIDATE.sourceHead,candidateZipSha256:CANDIDATE.zipSha256,candidateManifestSha256:CANDIDATE.manifestSha256,scope,containsPII:false,containsSecrets:false};
    write(SYN_AUTH,auth);
    const authDigest=sha(SYN_AUTH);
    const req={schemaVersion:'orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v1',requestVersion:REQUEST_VERSION,requestOrdinal:12,gateId:GATE,rcId:'RC-AYS-LAB-CANONICA-01',status:'AUTHORIZED_ONCE',approved:true,allowedExecutions:1,consumed:false,authorizationFrozen:false,replayAllowed:false,branch:'ays/backend-tenant-lab-v99-20260703',pullRequest:5,projectId:'ays-orbit-360-lab',tenantId:'alianzas-soluciones',candidateArtifactId:CANDIDATE.artifactId,candidateZipSha256:CANDIDATE.zipSha256,candidateManifestSha256:CANDIDATE.manifestSha256,candidateSourceHead:CANDIDATE.sourceHead,candidate:{artifactId:CANDIDATE.artifactId,zipName:'orbit360-fase-a-product-f2-request08-router-readiness-successor-fc46bd85783d.zip',zipSha256:CANDIDATE.zipSha256,manifestSha256:CANDIDATE.manifestSha256,sourceHead:CANDIDATE.sourceHead,manifestStatus:CANDIDATE.manifestStatus,fileCount:CANDIDATE.fileCount},scope,authorizationRecordPath:SYN_AUTH_REL,authorizationRecordSha256:authDigest,authorizationBasis:basis,containsPII:false,containsSecrets:false};
    write(SYN_REQ,req);
    run(['tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs'],{ORBIT360_REQUEST_FILE:SYN_REQ_REL,ORBIT360_F2_KNOWN_ROOTFIXES_EVIDENCE:SYN_SELFTEST});
    const st=json(SYN_SELFTEST); if(!(st.ok===true&&st.status==='F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SOURCE_AUDIT_PASS'&&st.requestOrdinal===12&&st.requestLifecycle?.dynamicOrdinal===true&&st.crossTenant?.semanticBinding===true)) throw new Error('SYNTHETIC_SELFTEST_INVALID');
    run(['tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs']);
    run(['tools/orbit360-validar-gate-contracts-v20260717.mjs',GATE],{ORBIT360_EXPECTED_REQUEST_VERSION:REQUEST_VERSION,ORBIT360_REQUEST_FILE:SYN_REQ_REL});
    const gate=json(PRE); if(!(gate.ok===true&&gate.status==='GO_GATE_CONTRACT'&&gate.requestOrdinal===12&&gate.persistedAuthorizationBound===true&&gate.persistedAuthorizationSha256===authDigest&&gate.executionAuthorized===true&&gate.writeAuthorized===false&&gate.deployAuthorized===false&&gate.productionAuthorized===false)) throw new Error('SYNTHETIC_GATE_INVALID');
    result.synthetic=true; result.syntheticChecks={selftestPass:true,dynamicOrdinal:true,semanticProbeBinding:true,persistedAuthorizationBound:true,gateGo:true,writeAuthorized:false,deployAuthorized:false,productionAuthorized:false};
  }catch(e){result.errors.push('SYNTHETIC:'+String(e?.message||e).slice(0,700));}
}finally{
  try{fs.writeFileSync(ROUTER,routerOriginal,'utf8');}catch{}
  for(const p of [SYN_AUTH,SYN_REQ]){try{fs.rmSync(p,{force:true});}catch{}}
}
result.ok=result.preflight&&result.coherence&&result.synthetic;
result.status=result.ok?'F2_REQUEST11_VALIDATOR_STALE_ROOTFIX_SOURCEONLY_PASS':'F2_REQUEST11_VALIDATOR_STALE_ROOTFIX_SOURCEONLY_FAIL';
result.classification=result.ok?'PASS':'VALIDATOR_STALE';
write(OUT,result);
if(!result.ok) process.exitCode=41;
