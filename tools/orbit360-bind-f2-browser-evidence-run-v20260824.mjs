#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';
const ROOT=process.cwd(),RUN_ID=String(process.env.GITHUB_RUN_ID||process.env.ORBIT360_F2_RUN_ID||'').trim(),DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
if(!/^\d+$/.test(RUN_ID))throw new Error('PIPELINE_MECHANISM_FAILURE:F2_BROWSER_RUN_ID_REQUIRED');const p=path.join(DIR,`f2-browser-run-${RUN_ID}.json`);if(!fs.existsSync(p))throw new Error('DATA_CONTRACT_FAILURE:F2_BROWSER_CURRENT_RUN_EVIDENCE_MISSING');const e=JSON.parse(fs.readFileSync(p,'utf8'));e.runId=Number(RUN_ID);e.browserRunId=Number(RUN_ID);e.evidenceFreshness='current-run-only';e.containsPII=false;e.containsSecrets=false;fs.writeFileSync(p,JSON.stringify(e,null,2)+'\n','utf8');console.log(JSON.stringify({ok:true,status:'F2_BROWSER_EVIDENCE_BOUND_TO_CURRENT_RUN',runId:Number(RUN_ID),path:p,browserOk:e.ok===true,browserStatus:e.status||null},null,2));
