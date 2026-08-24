#!/usr/bin/env node
'use strict';
// PROMOTER_STATE_MUTATION_FORBIDDEN
// Pure validation only. Canonical state mutation belongs exclusively to orbit360-continuity-transition-owner-v20260820.mjs.
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const AUTHORITY='tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json';
const authorityPath=path.join(ROOT,AUTHORITY);
if(!fs.existsSync(authorityPath))throw new Error('PIPELINE_MECHANISM_FAILURE:PROMOTER_AUTHORITY_MISSING');
const authority=JSON.parse(fs.readFileSync(authorityPath,'utf8').replace(/^\uFEFF/,''));
const metadata=String(process.env.ORBIT360_MACRO2_RESUME_METADATA||authority.candidateCertificationEvidence||'').trim();
if(!metadata)throw new Error('VALIDATOR_STALE:PROMOTER_CURRENT_METADATA_POINTER_MISSING');
const p=path.join(ROOT,metadata);
if(!fs.existsSync(p))throw new Error('MACRO2_DURABLE_CANDIDATE_METADATA_REQUIRED');
const M=JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const need=(v,c)=>{if(!v)throw new Error(c);};
const fileCount=Number(M.fileCount),deltaCount=Number(M.deltaCount),unchanged=Number(M.unchangedFileCount);
need(M.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY','MACRO2_METADATA_STATUS_INVALID');
need(M.sourcePublished===true,'MACRO2_SOURCE_NOT_PUBLISHED');
need(Number.isInteger(fileCount)&&fileCount>0&&Number.isInteger(deltaCount)&&deltaCount>=0&&deltaCount<=fileCount&&unchanged===fileCount-deltaCount&&Number.isInteger(Number(M.checksPassed))&&Number(M.checksPassed)>0,'MACRO2_DYNAMIC_COUNTS_INVALID');
need(M.runtimeExecuted===false&&M.browserExecuted===false&&M.secretAccess===false&&M.firestoreRead===false&&Number(M.writes)===0&&M.deployExecuted===false&&M.productionTouched===false,'MACRO2_METADATA_SIDE_EFFECT_SIGNAL');
need(Number(authority.candidate?.artifactId)===Number(M.artifactId)&&authority.candidate?.sourceHead===M.sourceHead&&authority.candidate?.artifactDigest===M.artifactDigest,'VALIDATOR_STALE:PROMOTER_AUTHORITY_METADATA_DRIFT');
console.log(JSON.stringify({ok:true,status:'MACRO2_PROMOTION_INPUT_VALIDATED_NO_STATE_MUTATION',canonicalMutationOwner:'tools/orbit360-continuity-transition-owner-v20260820.mjs',candidateCertificationEvidence:metadata,candidateArtifactId:M.artifactId,candidateSourceHead:M.sourceHead,artifactDigest:M.artifactDigest,fileCount,deltaCount,unchangedFileCount:unchanged,checksPassed:Number(M.checksPassed),runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
