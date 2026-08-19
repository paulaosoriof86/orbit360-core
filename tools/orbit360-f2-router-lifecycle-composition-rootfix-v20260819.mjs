#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const ROUTER='tools/orbit360-validar-gate-contracts-v20260717.mjs';
const REGISTRY='tools/orbit360-gate-contract-registry-v20260717.json';
const LIVE='orbit360-platform/docs/orbit360-live-state-v1.json';
const INDEX='orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json';
const ACADEMIA='orbit360-platform/docs/ACADEMIA-DELTA-F2-VALIDATOR-STALE-REBIND-20260819.md';
const CHECKPOINT='orbit360-platform/docs/CHECKPOINT-F2-SOURCE01-VALIDATOR-STALE-LIFECYCLE-COMPOSITION-20260819.md';
const GATE='f2-productive-acceptance-exact-successor-v20260818';
const CANDIDATE=9385306424;
const SOURCE_RUN=32310148537;
const UPDATED='2026-08-19T22:48:00.000Z';
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8').replace(/^\uFEFF/,'');
const write=(p,c)=>{const a=path.join(ROOT,p);fs.mkdirSync(path.dirname(a),{recursive:true});fs.writeFileSync(a,c,'utf8');};
const readJson=p=>JSON.parse(read(p));
const writeJson=(p,v)=>write(p,JSON.stringify(v,null,2)+'\n');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const once=(txt,from,to,code)=>{const n=txt.split(from).length-1;need(n===1,`${code}:${n}`);return txt.replace(from,to);};

let router=read(ROUTER);
need(router.includes("const CANONICAL_LIFECYCLE_COMPOSITION = 'phase-capability-contract-v1';"),'ROUTER_DEFAULT_COMPOSITION_MISSING');
need(router.includes("const ROUTER_VERSION = 'v10.6-f2-successor-rebind-source-pending';"),'ROUTER_VERSION_PRECONDITION_MISSING');
router=once(router,"const ROUTER_VERSION = 'v10.6-f2-successor-rebind-source-pending';","const ROUTER_VERSION = 'v10.7-f2-lifecycle-composition-profile-aware';",'ROUTER_VERSION_COUNT');
router=once(router,"  ['f2-productive-acceptance-exact-successor-v20260818']: {\n    contractVersion: '2.1.0',","  ['f2-productive-acceptance-exact-successor-v20260818']: {\n    contractVersion: '2.1.0',\n    lifecycleComposition: 'phase-capability-contract-v2-source-rebind',",'F2_LIFECYCLE_PROFILE_COUNT');
router=once(router,"    canonicalLifecycleComposition: CANONICAL_LIFECYCLE_COMPOSITION,\n    canonicalEngine: config && config.engine || '',","    canonicalLifecycleComposition: config && config.lifecycleComposition || CANONICAL_LIFECYCLE_COMPOSITION,\n    canonicalEngine: config && config.engine || '',",'FAIL_OUTPUT_COMPOSITION_COUNT');
router=once(router,"  const lifecycleRevision = lifecycle.validatorLifecycleRevision || 'phase-capability-contract-v1';\n  if (lifecycleRevision !== CANONICAL_LIFECYCLE_COMPOSITION) throw new Error('CANONICAL_LIFECYCLE_REVISION_MISMATCH');","  const lifecycleRevision = lifecycle.validatorLifecycleRevision || 'phase-capability-contract-v1';\n  const expectedLifecycleComposition = config.lifecycleComposition || CANONICAL_LIFECYCLE_COMPOSITION;\n  if (lifecycleRevision !== expectedLifecycleComposition) throw new Error('CANONICAL_LIFECYCLE_REVISION_MISMATCH');",'LIFECYCLE_CHECK_COUNT');
router=once(router,"    canonicalLifecycleComposition: CANONICAL_LIFECYCLE_COMPOSITION,\n    canonicalRouterVersion: ROUTER_VERSION,","    canonicalLifecycleComposition: expectedLifecycleComposition,\n    canonicalRouterVersion: ROUTER_VERSION,",'SUCCESS_OUTPUT_COMPOSITION_COUNT');
write(ROUTER,router);

const registry=readJson(REGISTRY);
const entry=(registry.gates||[]).find(g=>g&&g.gateId===GATE);
need(entry,'REGISTRY_F2_GATE_MISSING');
entry.status='ACTIVE_SOURCE_REBIND_ROUTER_ROOTFIX';
entry.classification='VALIDATOR_STALE';
entry.diagnosticRevision='f2-successor-rebind-lifecycle-composition-profile-aware-v2';
entry.lifecycleComposition='phase-capability-contract-v2-source-rebind';
entry.routerVersion='v10.7-f2-lifecycle-composition-profile-aware';
entry.sourceStatus='PENDING_REBIND_SOURCE_ONLY';
entry.runtimeStatus='BLOCKED_PENDING_SOURCE_REBIND';
entry.runtimeAuthorization=false;
entry.lastFailedSourceRunId=SOURCE_RUN;
entry.lastFailedSourceCode='CANONICAL_LIFECYCLE_REVISION_MISMATCH';
writeJson(REGISTRY,registry);

const live=readJson(LIVE);
live.updatedAt=UPDATED;
live.stateVersion='20260819.f2.request06-rootfix-successor-router-lifecycle-rootfix-pending-source.current';
live.phase='F2_SUCCESSOR_SOURCE_ONLY_ROUTER_ROOTFIX_APPLIED';
live.rootCauseState=live.rootCauseState||{};
live.rootCauseState.f2SuccessorLifecycleComposition={classification:'VALIDATOR_STALE',code:'CANONICAL_LIFECYCLE_REVISION_MISMATCH',status:'ROOTFIX_APPLIED_PENDING_SECOND_SOURCE_ONLY',firstSourceRunId:SOURCE_RUN,rootCause:'CANONICAL_ROUTER_USED_GLOBAL_PHASE_CAPABILITY_V1_INSTEAD_OF_GATE_PROFILED_LIFECYCLE_COMPOSITION',productAffected:false,dataAffected:false,candidateArtifactId:CANDIDATE,routerVersion:'v10.7-f2-lifecycle-composition-profile-aware'};
live.rootCauseState.currentBlockingFact={code:'F2_SUCCESSOR_SOURCE_ONLY_RETRY_AFTER_ROUTER_LIFECYCLE_ROOTFIX',status:'PENDING_SECOND_AND_FINAL_SOURCE_ONLY'};
if(live.f2SourceOnly){live.f2SourceOnly.status='PENDING_REBIND_SOURCE_ONLY';live.f2SourceOnly.canonicalRouterVersion='v10.7-f2-lifecycle-composition-profile-aware';live.f2SourceOnly.fullRehashPass=false;}
if(live.nextActionExact){live.nextActionExact.action='VALIDATE_F2_SUCCESSOR_SOURCE_ONLY_SECOND_AND_FINAL';live.nextActionExact.status='PENDING_SECOND_AND_FINAL_SOURCE_ONLY';live.nextActionExact.candidateArtifactId=CANDIDATE;}
writeJson(LIVE,live);

const index=readJson(INDEX);
index.updatedAt=UPDATED;
index.operationalCurrent=index.operationalCurrent||{};
index.operationalCurrent.f2SourceOnlyStatus='PENDING_REBIND_SOURCE_ONLY';
index.operationalCurrent.successorCandidateArtifactId=CANDIDATE;
index.f2SuccessorRebind=index.f2SuccessorRebind||{};
Object.assign(index.f2SuccessorRebind,{status:'PENDING_SECOND_AND_FINAL_SOURCE_ONLY',classification:'VALIDATOR_STALE',routerLifecycleCompositionRootfix:'PASS_STATIC_PENDING_SOURCE_EXECUTION',routerVersion:'v10.7-f2-lifecycle-composition-profile-aware',failedSourceRunId:SOURCE_RUN,failedSourceCode:'CANONICAL_LIFECYCLE_REVISION_MISMATCH',runtimeAuthorized:false,productionTouched:false});
writeJson(INDEX,index);

let academy=fs.existsSync(path.join(ROOT,ACADEMIA))?read(ACADEMIA):'# Academia Orbit 360 — delta F2 2026-08-19\n';
if(!academy.includes('CANONICAL_LIFECYCLE_REVISION_MISMATCH')) academy += `\n## Segundo patrón reusable: composición lifecycle por gate\n\nEl primer SOURCE de la candidata ${CANDIDATE} se detuvo antes de descargar el artifact con \`CANONICAL_LIFECYCLE_REVISION_MISMATCH\`. El producto no participó. La causa fue un router canónico que exigía globalmente \`phase-capability-contract-v1\` aunque el gate F2 había versionado correctamente su lifecycle a \`phase-capability-contract-v2-source-rebind\`. El patrón correcto es conservar v1 como default y permitir que cada gate declare su composición esperada; nunca relajar capacidades ni convertir el router en un bypass.\n`;
write(ACADEMIA,academy);
write(CHECKPOINT,`# Orbit 360 — F2 SOURCE01 validator stale lifecycle composition\n\nFecha: 2026-08-19\nGate: \`${GATE}\`\nCandidate: \`${CANDIDATE}\`\nRun SOURCE fallido: \`${SOURCE_RUN}\`\nClasificación: \`VALIDATOR_STALE\`\nCódigo: \`CANONICAL_LIFECYCLE_REVISION_MISMATCH\`\n\nEl request SOURCE pasó su boundary inmutable y falló en el primer gate canónico, antes de descargar el artifact. No hubo secretos, Firebase, datos, browser, runtime, writes, deploy ni producción.\n\nCausa raíz: el router conservaba una composición lifecycle global \`phase-capability-contract-v1\`. El gate F2 sucesor usa deliberadamente \`phase-capability-contract-v2-source-rebind\`.\n\nRootfix: composición lifecycle profile-aware por gate. V1 permanece default para los demás gates; F2 declara explícitamente V2. No se cambian capacidades ni se relaja seguridad.\n\nSiguiente acción: ejecutar el gate canónico en working tree y exigir PASS; después emitir un segundo y último SOURCE-only sobre artifact ${CANDIDATE}. Si reaparece el mismo código, \`STOP_RETRY\`.\n`);

console.log(JSON.stringify({ok:true,status:'F2_ROUTER_LIFECYCLE_COMPOSITION_ROOTFIX_APPLIED_STATIC',classification:'VALIDATOR_STALE',gateId:GATE,candidateArtifactId:CANDIDATE,failedSourceRunId:SOURCE_RUN,routerVersion:'v10.7-f2-lifecycle-composition-profile-aware',defaultLifecycleComposition:'phase-capability-contract-v1',f2LifecycleComposition:'phase-capability-contract-v2-source-rebind',runtimeAuthorized:false,dataAccess:false,writes:false,deploy:false,production:false},null,2));
