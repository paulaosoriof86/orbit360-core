#!/usr/bin/env node
'use strict';
// PROMOTER_STATE_MUTATION_FORBIDDEN
// Retained only as a pure validation shim. Canonical state mutation belongs exclusively to orbit360-continuity-transition-owner-v20260820.mjs.
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const metadata=process.env.ORBIT360_MACRO2_RESUME_METADATA||'orbit360-platform/runtime-gate-crm-v20260716/macro2-candidate-artifact-metadata-v20260821.json';
const p=path.join(ROOT,metadata);if(!fs.existsSync(p))throw new Error('MACRO2_DURABLE_CANDIDATE_METADATA_REQUIRED');
const M=JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const need=(v,c)=>{if(!v)throw new Error(c);};
need(M.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY','MACRO2_METADATA_STATUS_INVALID');need(M.sourcePublished===true,'MACRO2_SOURCE_NOT_PUBLISHED');need(M.fileCount===194&&M.deltaCount===9&&M.unchangedFileCount===185,'MACRO2_194_9_185_INVALID');need(M.runtimeExecuted===false&&M.browserExecuted===false&&M.secretAccess===false&&M.firestoreRead===false&&Number(M.writes)===0&&M.deployExecuted===false&&M.productionTouched===false,'MACRO2_METADATA_SIDE_EFFECT_SIGNAL');
console.log(JSON.stringify({ok:true,status:'MACRO2_PROMOTION_INPUT_VALIDATED_NO_STATE_MUTATION',canonicalMutationOwner:'tools/orbit360-continuity-transition-owner-v20260820.mjs',candidateArtifactId:M.artifactId,candidateSourceHead:M.sourceHead,artifactDigest:M.artifactDigest,fileCount:M.fileCount,deltaCount:M.deltaCount,unchangedFileCount:M.unchangedFileCount,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,writes:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
