#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const ROOT=process.cwd();
const INDEX=path.join(ROOT,'orbit360-platform/index.html');
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/policies-visual-shell-build-summary.json');
function write(payload){fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...payload,containsPII:false,containsSecrets:false},null,2)+'\n','utf8');}
try{
  const run=spawnSync(process.execPath,['tools/orbit360-m6-build-product-shell-v20260730.mjs','--apply'],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
  if(run.status!==0)throw new Error('PIPELINE_MECHANISM_FAILURE:BASE_SHELL_BUILD:'+String(run.stderr||run.stdout||'').slice(0,500));
  let html=fs.readFileSync(INDEX,'utf8');
  const anchor='<script src="core/product-runtime-browser-providers-p0.js?v=20260730-m6"></script>';
  if(!html.includes(anchor))throw new Error('VALIDATOR_STALE:PROVIDER_ANCHOR');
  const overlay='<script src="core/policies-visual-direction-role-overlay-v20260801.js?v=20260801-1"></script>';
  html=html.replace(anchor,anchor+overlay);
  html=html.replace('</head>','<meta name="orbit360-review-scope" content="policies-readonly-direction-20260801">\n</head>');
  const required=['product-runtime-config.js','policies-visual-direction-role-overlay-v20260801.js','modules/polizas.js','modules/cliente360.js','modules/cobros.js','core/policy-receipts-engine.js','modules/policy-receipts-v1199-detail-guard.js'];
  const missing=required.filter(item=>!html.includes(item));if(missing.length)throw new Error('DATA_CONTRACT_FAILURE:VISUAL_ASSET_MISSING:'+missing.join(','));
  const forbidden=['backend-lab-loader.js','backend-lab-init.js','store-firestore-lab.local.js','Orbit.store.init(Orbit.SEED)','demo123'];
  const leaked=forbidden.filter(item=>html.includes(item));if(leaked.length)throw new Error('SECURITY_FAILURE:VISUAL_SHELL_FORBIDDEN:'+leaked.join(','));
  fs.writeFileSync(INDEX,html,'utf8');
  write({ok:true,status:'POLICIES_VISUAL_SHELL_BUILT',baseBuilder:'tools/orbit360-m6-build-product-shell-v20260730.mjs',requiredAssets:required.length,visualRoleOverlay:true,visualReviewRole:'Dirección',writeAuthorized:false,indexSha256:crypto.createHash('sha256').update(html).digest('hex'),operationalWrites:0});
}catch(error){write({ok:false,status:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',classification:String(error&&error.message||error).split(':')[0]||'PIPELINE_MECHANISM_FAILURE',error:String(error&&error.message||error).slice(0,700),operationalWrites:0});process.exitCode=41;}
