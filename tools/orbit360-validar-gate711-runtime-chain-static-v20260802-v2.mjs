#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-runtime-chain-static-v20260802-v2.json');
const PRODUCT='267f7231b46d65b80c167f54567a67503b6a6793';
const GATE='block7-canonical-runtime-cumulative-visual-lab-v20260801';
const BRANCH='ays/backend-tenant-lab-v99-20260703';
const F={
 workflow:'.github/workflows/orbit360-gate711-release-critical-runtime-v20260802.yml',
 readiness:'tools/orbit360-validar-gate711-runtime-package-readiness-v20260802.mjs',
 identity:'tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs',
 snapshot:'tools/orbit360-revalidar-policies-full-canonical-readonly-v20260801.mjs',
 runtime:'tools/orbit360-validar-gate711-release-critical-runtime-v20260802.mjs',
 loader:'orbit360-platform/core/backend-lab-loader.js',
 index:'orbit360-platform/index.html',
 requestTemplate:'.github/orbit360-templates/gate711-release-critical-runtime-request-template-v20260802.json',
 lifecycleTemplate:'tools/orbit360-gate711-release-critical-runtime-lifecycle-template-v20260802.json'
};
const checks=[];const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail});
const abs=r=>path.join(ROOT,r);const exists=r=>fs.existsSync(abs(r));const read=r=>exists(r)?fs.readFileSync(abs(r),'utf8'):'';
const has=(text,...terms)=>terms.every(term=>text.includes(term));const pos=(text,term)=>text.indexOf(term);const count=(text,term)=>text.split(term).length-1;
const syntax=rel=>{const r=spawnSync(process.execPath,['--check',abs(rel)],{encoding:'utf8'});return{ok:r.status===0,detail:String(r.stderr||r.stdout||'').trim().slice(0,240)}};
try{
 for(const [k,v] of Object.entries(F))add('FILE_'+k.toUpperCase(),exists(v),v);
 const missing=Object.values(F).filter(v=>!exists(v));if(missing.length)throw new Error('PIPELINE_MECHANISM_FAILURE:MISSING:'+missing.join(','));
 const workflow=read(F.workflow),readiness=read(F.readiness),identity=read(F.identity),snapshot=read(F.snapshot),runtime=read(F.runtime),loader=read(F.loader),index=read(F.index);
 const requestTemplate=JSON.parse(read(F.requestTemplate)),lifecycleTemplate=JSON.parse(read(F.lifecycleTemplate));
 add('REQUEST_INERT',requestTemplate.status==='INERT_TEMPLATE_PENDING_EXPLICIT_AUTHORIZATION'&&requestTemplate.approved===false&&requestTemplate.allowedExecutions===0&&requestTemplate.consumed===true&&requestTemplate.authorizedProductHead===PRODUCT);
 add('LIFECYCLE_INERT',lifecycleTemplate.status==='INERT_TEMPLATE_PENDING_EXPLICIT_AUTHORIZATION'&&lifecycleTemplate.authorization?.explicit===false&&lifecycleTemplate.authorization?.allowedExecutions===0&&lifecycleTemplate.authorization?.consumed===true&&lifecycleTemplate.sourceLock?.productHead===PRODUCT);
 add('LIFECYCLE_ROUTER',lifecycleTemplate.validatorLifecycleRevision==='phase-capability-contract-v1');
 const expectedCaps={secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false};
 add('LIFECYCLE_CAPABILITIES',JSON.stringify(lifecycleTemplate.intendedExecutionProfileAfterAuthorization?.capabilities||{})===JSON.stringify(expectedCaps));
 const stages=['Verificar autorización inmutable y freeze antes de secrets','Gate contractual obligatorio antes de secrets','Instalar dependencias controladas','Resolver identidad de servicio LAB','Preparar identidad existente read-only','Snapshot canónico inicial','Servir checkout exacto sin deploy','Ejecutar una sola sesión CRM Ops Leads','Snapshot final y comparación exacta','Guardar evidencia sanitizada','Limpiar archivos temporales','Publicar estado observable final'];
 const positions=stages.map(s=>pos(workflow,s));add('WORKFLOW_ORDER',positions.every((n,i)=>n>=0&&(i===0||n>positions[i-1])));
 add('WORKFLOW_IMMUTABLE',has(workflow,'test "$GITHUB_RUN_ATTEMPT" = \'1\'','git rev-parse HEAD^','git diff-tree --no-commit-id --name-only -r HEAD','test "${#CHANGED[@]}" = \'1\''));
 add('WORKFLOW_FREEZE',has(workflow,'ORBIT360_PRODUCT_HEAD: '+PRODUCT,'git diff --name-only "$ORBIT360_PRODUCT_HEAD"..HEAD','test "${#PRODUCT_DIFF[@]}" = \'0\''));
 add('WORKFLOW_BRANCH_GATE',has(workflow,'ORBIT360_BRANCH: '+BRANCH,'ORBIT360_GATE_ID: '+GATE));
 add('WORKFLOW_ONE_RUNTIME',count(workflow,'node tools/orbit360-validar-gate711-release-critical-runtime-v20260802.mjs')===1);
 add('WORKFLOW_TWO_SNAPSHOTS',count(workflow,'node tools/orbit360-revalidar-policies-full-canonical-readonly-v20260801.mjs')===2);
 add('WORKFLOW_NO_RETRY',has(workflow,'cancel-in-progress: false','STOP_RETRY'));

 const helperCall=pos(workflow,'node tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs');
 add('IDENTITY_EXPORT_ORDER',pos(workflow,'export ORBIT360_CUSTOM_TOKEN_FILE="$TOKEN_FILE"')>=0&&pos(workflow,'export ORBIT360_CUSTOM_TOKEN_FILE="$TOKEN_FILE"')<helperCall&&pos(workflow,'export ORBIT360_LOCAL_FIREBASE_CONFIG_FILE="$CONFIG_FILE"')>=0&&pos(workflow,'export ORBIT360_LOCAL_FIREBASE_CONFIG_FILE="$CONFIG_FILE"')<helperCall);
 add('IDENTITY_POSTCHECK',has(workflow,'explicitTokenPathHonored==true','explicitConfigPathHonored==true','test -s "$TOKEN_FILE"','test -s "$CONFIG_FILE"'));
 add('IDENTITY_TOKEN_CONTRACT',has(identity,'process.env.ORBIT360_CUSTOM_TOKEN_FILE','customTokenCreatedEphemeral:true','tokenWrittenToRunnerTemp:true')&&has(workflow,'echo "ORBIT360_CUSTOM_TOKEN_FILE=$TOKEN_FILE" >> "$GITHUB_ENV"')&&runtime.includes('process.env.ORBIT360_CUSTOM_TOKEN_FILE'));
 add('IDENTITY_CONFIG_CONTRACT',has(identity,'process.env.ORBIT360_LOCAL_FIREBASE_CONFIG_FILE','configWrittenToIgnoredLocalFile:true')&&has(workflow,'echo "ORBIT360_LOCAL_FIREBASE_CONFIG_FILE=$CONFIG_FILE" >> "$GITHUB_ENV"')&&loader.includes("'core/auth-firebase.config.local.js'"));
 add('IDENTITY_READONLY',has(identity,'auth.listUsers','collection(\'members\').get()','createCustomToken','authWrites:0','firestoreWrites:0','operationalWrites:0'));

 add('SNAPSHOT_OUTPUT',snapshot.includes('policies-full-canonical-revalidation-readonly-v20260801.json')&&workflow.includes('$EVIDENCE_DIR/policies-full-canonical-revalidation-readonly-v20260801.json'));
 add('SNAPSHOT_ENV',has(snapshot,'ORBIT360_PRODUCT_PROJECT_ID','ORBIT360_PRODUCT_TENANT_ID','GOOGLE_APPLICATION_CREDENTIALS')&&has(workflow,'GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE','ORBIT360_PRODUCT_PROJECT_ID=$ORBIT360_PROJECT_ID','ORBIT360_PRODUCT_TENANT_ID=$ORBIT360_TENANT_ID'));
 add('SNAPSHOT_DIGEST_PRODUCER',has(snapshot,'sourceSnapshotDigest','targetSnapshotDigest','canonicalDigestSealed'));
 add('SNAPSHOT_DIGEST_CONSUMER',has(workflow,"'.digests.sourceSnapshotDigest'","'.digests.targetSnapshotDigest'",'gate711-release-critical-before-v20260802.json','gate711-release-critical-after-v20260802.json'));
 add('SNAPSHOT_SEALED_DIGEST',snapshot.includes("EXPECTED_TARGET_DIGEST='19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b'")&&workflow.includes('19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b'));
 add('SNAPSHOT_READONLY',has(snapshot,'firestoreWrites:0','operationalWrites:0','reimportExecuted:false','deployExecuted:false','productionTouched:false'));

 add('SERVER_PRODUCER',has(workflow,'python3 -m http.server 4173 --directory orbit360-platform','http://127.0.0.1:4173/index.html','ORBIT360_SERVER_PID=$SERVER_PID'));
 add('SERVER_BASE_URL',workflow.includes('ORBIT360_BASE_URL=http://127.0.0.1:4173/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones#/inicio'));
 add('SERVER_RUNTIME_CONSUMER',runtime.includes('process.env.ORBIT360_BASE_URL')&&runtime.includes("'BASE_URL_INVALID'"));
 add('LOCAL_CONFIG_ROUTE',loader.includes("var configSource = isFirebaseHosting ? '/__/firebase/init.js' : 'core/auth-firebase.config.local.js'")&&workflow.includes('orbit360-platform/core/auth-firebase.config.local.js'));
 add('INDEX_BACKEND_ORDER',pos(index,'core/backend-lab-loader.js')>=0&&pos(index,'core/backend-lab-loader.js')<pos(index,'core/backend-lab-init.js')&&pos(index,'core/backend-lab-init.js')<pos(index,'data/store-firestore-lab.local.js'));

 add('RUNTIME_OUTPUT',runtime.includes('gate711-release-critical-runtime-v20260802.json')&&workflow.includes('$EVIDENCE_DIR/gate711-release-critical-runtime-v20260802.json'));
 add('RUNTIME_SHOTS',runtime.includes('visual-sanitized-gate711-release-critical-v20260802')&&workflow.includes('visual-sanitized-gate711-release-critical-v20260802/*.png')&&runtime.includes('expectedScreenshotCount === 13')&&runtime.includes('report.screenshots.length === expectedScreenshotCount')&&workflow.includes('(.expectedScreenshotCount==13)')&&workflow.includes('((.screenshots|length)==13)'));
 add('RUNTIME_ONE_SESSION',count(runtime,'chromium.launch')===1&&count(runtime,'browser.newContext')===1&&count(runtime,'context.newPage')===1&&count(runtime,'await settleLegal(page);')===1);
 add('RUNTIME_WRITE_GUARD',has(runtime,"['insert', 'update', 'remove', 'setPref']",'RUNTIME_WRITE_GUARD','final.writeCalls.length === 0'));
 add('RUNTIME_GUARD_REGISTRY',has(runtime,'Orbit.__crmV1198GuardDiagnostics',"'self_guarded_readonly'","'immutable_unwrapped'",'guardState.immutableUnwrapped === 0',"guardState.conciliacionesMode === 'self_guarded_readonly'")&&has(workflow,'.checks.guardRegistry==true','.guardRegistry.immutableUnwrapped==0','.guardRegistry.conciliacionesMode=="self_guarded_readonly"'));
 add('RUNTIME_COUNTS',has(runtime,'clientes: 430','aseguradoras: 30','polizas: 1373','vehiculos: 1032','recibosEsperados: 1294','carteraPrimas: 673','cobros: 5','asesores: 7'));
 add('RUNTIME_MATRIX',has(runtime,"role: 'Dirección'","role: 'Operativo'","role: 'Asesor'","ops: 'restricted'","#/cliente360","#/aseguradoras","#/polizas","#/ops","#/leads"));
 add('RUNTIME_ALWAYS_SAVES',has(runtime,'finally {','save();','process.exit(report.ok ? 0 : 41)'));

 add('ARTIFACT_COMPLETE',has(workflow,'preflight-sanitizado.json','gate711-release-critical-static-v20260802.json','canonical-browser-identity-readonly-v20260801.json','gate711-release-critical-before-v20260802.json','gate711-release-critical-runtime-v20260802.json','gate711-release-critical-after-v20260802.json','visual-sanitized-gate711-release-critical-v20260802/*.png'));
 add('ARTIFACT_ALWAYS',/- name: Guardar evidencia sanitizada[\s\S]*?if: always\(\)/.test(workflow));
 add('CLEANUP_ALWAYS',/- name: Limpiar archivos temporales[\s\S]*?if: always\(\)/.test(workflow));
 add('CLEANUP_ALL',has(workflow,'kill "$ORBIT360_SERVER_PID"','ORBIT360_TEMP_KEY_FILE','ORBIT360_CUSTOM_TOKEN_FILE','ORBIT360_LOCAL_FIREBASE_CONFIG_FILE','rm -f'));
 add('FINAL_STATUS_ALWAYS',/- name: Publicar estado observable final[\s\S]*?if: always\(\)/.test(workflow));
 add('NO_DEPLOY',!/firebase\s+deploy|hosting:channel:deploy|gcloud\s+run\s+deploy|git\s+push\s+origin\s+main|gh\s+pr\s+merge/i.test(workflow));
 add('NO_ACADEMIA_RUNTIME',!workflow.includes('academia_root_fix_ready')&&!runtime.includes("#/academia"));
 add('READINESS_PATH_CONTRACT',has(readiness,'export ORBIT360_CUSTOM_TOKEN_FILE="$TOKEN_FILE"','export ORBIT360_LOCAL_FIREBASE_CONFIG_FILE="$CONFIG_FILE"','.explicitTokenPathHonored==true','.explicitConfigPathHonored==true'));
 for(const rel of [F.readiness,F.identity,F.snapshot,F.runtime]){const s=syntax(rel);add('SYNTAX_'+path.basename(rel).replace(/[^A-Za-z0-9]+/g,'_').toUpperCase(),s.ok,s.detail);}
 const failed=checks.filter(c=>!c.ok);const result={schemaVersion:'orbit360-gate711-runtime-chain-static-evidence-v2',gateId:GATE,productHead:PRODUCT,branch:BRANCH,status:failed.length?'GATE711_RUNTIME_CHAIN_STATIC_FAIL':'GATE711_RUNTIME_CHAIN_STATIC_PASS',classification:failed.length?'PIPELINE_MECHANISM_FAILURE':'GO_STATIC_RUNTIME_CHAIN_END_TO_END',total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(c=>c.id),checks,productFilesChanged:0,secretsAccessed:false,firestoreReads:0,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:failed.length===0};
 fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result,null,2));process.exit(failed.length?41:0);
}catch(error){const failed=checks.filter(c=>!c.ok);const result={schemaVersion:'orbit360-gate711-runtime-chain-static-evidence-v2',gateId:GATE,productHead:PRODUCT,branch:BRANCH,status:'GATE711_RUNTIME_CHAIN_STATIC_FAIL',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',total:checks.length,passed:checks.length-failed.length,failed:Math.max(1,failed.length),failedCheckIds:failed.map(c=>c.id),error:String(error&&error.message||error).slice(0,700),productFilesChanged:0,secretsAccessed:false,firestoreReads:0,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:false};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result,null,2));process.exit(41);}
