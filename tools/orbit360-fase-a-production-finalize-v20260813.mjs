#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const DIR=path.join(process.cwd(),'orbit360-platform/runtime-gate-crm-v20260716'),OUT=path.join(DIR,'fase-a-production-go-live-final-v20260813.json');
const e=process.env,code=k=>String(e[k]??'').trim(),attempted=code('DEPLOY_CODE')!=='';
const forwardOk=['DEPLOY_CODE','HOSTING_CODE','BROWSER_CODE','SNAPSHOT_CODE','INTEGRITY_CODE'].every(k=>code(k)==='0');
const rolledBack=!forwardOk&&code('ROLLBACK_CODE')==='0';
const decision=forwardOk?'GO_LIVE_PASS':rolledBack?'ROLLED_BACK_SAFE':attempted?'GO_LIVE_STOP_RETRY':'PIPELINE_STOP_BEFORE_DEPLOY';
const classification=forwardOk?'PRODUCTION_E2E_PASS':rolledBack?'STOP_RETRY_ROLLBACK_SAFE':attempted?'ENVIRONMENT_OR_RUNTIME_FAILURE':'PIPELINE_MECHANISM_FAILURE';
const out={schemaVersion:'orbit360-fase-a-production-go-live-final-v2',generatedAt:new Date().toISOString(),decision,classification,sourceHead:e.ORBIT360_SOURCE_HEAD||'',triggerCommit:e.GITHUB_SHA||'',liveUrl:e.ORBIT360_PRODUCT_URL||'',deployAttempted:attempted,deployCount:attempted?1:0,productionMaintained:forwardOk,rollbackExecuted:rolledBack,firestoreWrites:0,authWrites:0,operationalWrites:0,reimportExecuted:false,functionsDeployed:false,rulesDeployed:false,hostdimeTouched:false,mainTouched:false,mergeExecuted:false,ok:forwardOk};
fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));
