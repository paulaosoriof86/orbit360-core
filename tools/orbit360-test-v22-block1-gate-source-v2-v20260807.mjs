#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildV22MatrixArtifact, V22_MATRIX_SCHEMA, V22_GATE_SCOPE, V22_EXCLUDED_BLOCKERS } from './orbit360-build-v22-block1-matrix-artifact-v2-v20260807.mjs';
const read=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');
const request=JSON.parse(read('.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'));
const wrapper=read('tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs');
const checks={};
checks.v21Frozen=request.requestVersion==='20260807.21-two-phase-runtime'&&request.consumed===true&&request.authorizationFrozen===true&&request.allowedExecutions===0&&request.replayAllowed===false;
checks.wrapperV22V2Owner=wrapper.includes("orbit360-build-v22-block1-matrix-artifact-v2-v20260807.mjs")&&wrapper.includes('buildV22MatrixArtifact');
checks.scopeExact=JSON.stringify(V22_GATE_SCOPE)===JSON.stringify(['inicio','cliente360','aseguradoras']);
checks.excludedExact=JSON.stringify(V22_EXCLUDED_BLOCKERS)===JSON.stringify(['polizas','cobros','ops','leads','conciliaciones','cancelaciones']);
const source=buildV22MatrixArtifact();
const digest=crypto.createHash('sha256').update(source).digest('hex');
checks.schema=source.includes(`schemaVersion: '${V22_MATRIX_SCHEMA}'`);
checks.blockingRoutes=source.includes("blockingRoutes: ['inicio','cliente360','aseguradoras']")&&source.includes("go(page, role, 'cliente360')")&&source.includes("go(page, role, 'aseguradoras')");
checks.legacyNonblocking=!['vehicle-detail-button','receipt-detail-button','cobro-detail-button','polizas-kpis-stable',"['cliente360', 'polizas'"].some(t=>source.includes(t));
checks.block1Contracts=['membership-ready','multirol-assigned','scope-cliente360-visible','scope-aseguradoras-visible','mobile-menu-contract','legal-accepted-once','cliente360-list-bounded','cliente360-ficha','cliente360-relations-honest','aseguradoras-directorio','aseguradoras-ficha','aseguradoras-conocimiento','cliente360-no-technical-copy','aseguradoras-no-technical-copy'].every(t=>source.includes(t));
checks.eventDrivenV21Preserved=source.includes('new MutationObserver')&&source.includes('orbit360:v21-render-complete')&&source.indexOf('armV21RenderObserver(page, role, target)')<source.indexOf("location.hash = '#/' + value");
checks.threeRoles=['Direccion','Operativo','Asesor'].every(r=>source.includes(`role: '${r}'`));
checks.zeroWrites=source.includes('firestoreWrites: 0')&&source.includes('authWrites: 0')&&source.includes('operationalWrites: 0');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-v22v2-')); const artifact=path.join(tmp,'matrix.mjs'); const evidence=path.join(tmp,'evidence.json'); fs.writeFileSync(artifact,source);
checks.compile=spawnSync(process.execPath,['--check',artifact],{encoding:'utf8'}).status===0;
if(typeof vm.SourceTextModule==='function'&&typeof vm.SyntheticModule==='function'){
  const pv=process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY,pe=process.env.ORBIT360_VISUAL_EVIDENCE,po=process.env.ORBIT360_VISUAL_ARTIFACT_DIR;
  process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY='1';process.env.ORBIT360_VISUAL_EVIDENCE=evidence;process.env.ORBIT360_VISUAL_ARTIFACT_DIR=path.join(tmp,'caps');
  const context=vm.createContext({console,process,Buffer,setTimeout,clearTimeout,URL,TextEncoder,TextDecoder});
  const linker=async s=>{if(s==='firebase-admin')return new vm.SyntheticModule(['default'],function(){this.setExport('default',{});},{context});if(s==='playwright')return new vm.SyntheticModule(['chromium'],function(){this.setExport('chromium',{});},{context});const ns=await import(s),keys=Object.keys(ns);return new vm.SyntheticModule(keys,function(){for(const k of keys)this.setExport(k,ns[k]);},{context});};
  try{const m=new vm.SourceTextModule(source,{context});await m.link(linker);await m.evaluate();const e=JSON.parse(fs.readFileSync(evidence,'utf8'));checks.import=e.ok===true&&e.schemaVersion===V22_MATRIX_SCHEMA&&e.stage==='SOURCE_ARTIFACT_IMPORT_VALIDATED';}catch(e){checks.import=false;checks.importError=String(e.message||e).slice(0,200);}finally{if(pv==null)delete process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY;else process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY=pv;if(pe==null)delete process.env.ORBIT360_VISUAL_EVIDENCE;else process.env.ORBIT360_VISUAL_EVIDENCE=pe;if(po==null)delete process.env.ORBIT360_VISUAL_ARTIFACT_DIR;else process.env.ORBIT360_VISUAL_ARTIFACT_DIR=po;}
}else checks.import=false;
checks.deterministic=crypto.createHash('sha256').update(buildV22MatrixArtifact()).digest('hex')===digest;
const failedCheckIds=Object.entries(checks).filter(([,v])=>v!==true).map(([k])=>k);
const output={schemaVersion:'orbit360-v22-block1-gate-source-v2',status:failedCheckIds.length?'STOP_V22_BLOCK1_GATE_SOURCE':'PASS_V22_BLOCK1_GATE_SOURCE_ONLY',classification:failedCheckIds.length?'PIPELINE_MECHANISM_FAILURE':'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY',artifactSchema:V22_MATRIX_SCHEMA,artifactSha256:digest,blockingRoutes:V22_GATE_SCOPE,excludedLegacyBlockers:V22_EXCLUDED_BLOCKERS,total:Object.keys(checks).length,passed:Object.values(checks).filter(v=>v===true).length,failed:failedCheckIds.length,failedCheckIds,checks,secretsRead:false,firebaseAccess:false,hostingTouched:false,browserExecuted:false,firestoreWrites:0,authWrites:0,operationalWrites:0,productionTouched:false,containsPII:false,ok:failedCheckIds.length===0};
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716',{recursive:true});fs.writeFileSync('orbit360-platform/runtime-gate-crm-v20260716/v22-block1-gate-source-sanitized-v20260807.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));try{fs.rmSync(tmp,{recursive:true,force:true});}catch{}process.exit(output.ok?0:41);
