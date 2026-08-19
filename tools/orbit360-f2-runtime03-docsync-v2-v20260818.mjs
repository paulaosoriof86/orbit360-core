#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const LIVE='orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';
const CHECKPOINT='orbit360-platform/docs/CHECKPOINT-F2-RUNTIME03-LEGAL-READINESS-VALIDATOR-STALE-ROOTFIX-PASS-20260818.md';
const PIPE='orbit360-platform/runtime-gate-crm-v20260716/f2-runtime03-docsync-pipeline-mechanism-v20260818.json';
const run=spawnSync(process.execPath,['tools/orbit360-f2-runtime03-docsync-v20260818.mjs'],{cwd:ROOT,env:process.env,encoding:'utf8'});
if(run.stdout)process.stdout.write(run.stdout);
if(run.stderr)process.stderr.write(run.stderr);
if(run.status!==0)process.exit(run.status||41);
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const write=(rel,obj)=>fs.writeFileSync(path.join(ROOT,rel),JSON.stringify(obj,null,2)+'\n','utf8');
const live=read(LIVE),index=read(INDEX);
live.rootCauseState={...(live.rootCauseState||{}),f2Runtime03DocsyncPersistence:{classification:'PIPELINE_MECHANISM_FAILURE',code:'CONCURRENT_OBSERVER_COMMIT_NON_FAST_FORWARD',status:'CLOSED_BY_SERIALIZED_DOCSYNC_V2',productAffected:false,gateHadPassedBeforePushFailure:true,failedRunId:32207625109,retrySameMechanism:false}};
index.operationalCurrent={...(index.operationalCurrent||{}),f2Runtime03DocsyncPipelineClassification:'PIPELINE_MECHANISM_FAILURE',f2Runtime03DocsyncPipelineCode:'CONCURRENT_OBSERVER_COMMIT_NON_FAST_FORWARD',f2Runtime03DocsyncPipelineStatus:'CLOSED_BY_SERIALIZED_DOCSYNC_V2',f2Runtime03DocsyncFailedRunId:'32207625109'};
write(LIVE,live);write(INDEX,index);
fs.appendFileSync(path.join(ROOT,CHECKPOINT),'\n## Incidencia de persistencia del cierre\n\nEl primer run de docsync (`32207625109`) pasó el gate canónico sobre los documentos ya modificados, pero su push fue rechazado por `non-fast-forward` porque un observador de descubrimiento avanzó la misma rama en paralelo. Clasificación: `PIPELINE_MECHANISM_FAILURE / CONCURRENT_OBSERVER_COMMIT_NON_FAST_FORWARD`; producto no afectado. El mecanismo concurrente queda prohibido para este cierre y se sustituye por persistencia serializada V2, nuevamente con gate canónico antes del push.\n','utf8');
write(PIPE,{schemaVersion:'orbit360-f2-runtime03-docsync-pipeline-mechanism-v1',ok:true,status:'F2_RUNTIME03_DOCSYNC_PIPELINE_MECHANISM_CLOSED_BY_SERIALIZED_V2',classification:'PIPELINE_MECHANISM_FAILURE',code:'CONCURRENT_OBSERVER_COMMIT_NON_FAST_FORWARD',failedRunId:32207625109,canonicalGatePassedBeforePushFailure:true,productAffected:false,runtimeAffected:false,dataAffected:false,writes:0,retrySameMechanism:false,resolution:'SERIALIZED_DOCSYNC_V2_NO_PARALLEL_DISCOVERY_WRITES',containsPII:false,containsSecrets:false});
console.log(JSON.stringify({ok:true,status:'F2_RUNTIME03_DOCSYNC_V2_PREPARED',pipelineMechanismClosed:true,request04Created:false,runtimeAuthorized:false,writes:0},null,2));
