#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {GoogleAuth} from 'google-auth-library';

const mode=String(process.argv[2]||'').trim();
const ROOT=process.cwd();
const PROJECT=String(process.env.ORBIT360_PRODUCT_PROJECT_ID||'ays-orbit-360-lab').trim();
const LIVE_URL=String(process.env.ORBIT360_PRODUCT_URL||'https://ays-orbit-360-lab.web.app').replace(/\/$/,'');
const SITE=new URL(LIVE_URL).hostname.split('.')[0];
const ARTIFACT=path.resolve(ROOT,String(process.env.ORBIT360_PRODUCT_ARTIFACT||'orbit360-artifacts/fase-a-product'));
const EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const BEFORE=path.join(EVIDENCE,'fase-a-product-hosting-before-v20260813.json');
const SMOKE=path.join(EVIDENCE,'fase-a-product-hosting-smoke-v20260813.json');
const ROLLBACK=path.join(EVIDENCE,'fase-a-product-hosting-rollback-v20260813.json');
const ASSETS=['index.html','product-runtime-config.js','core/auth-product-runtime-p0.js','core/backend-product-readonly-bootstrap-p0.js','data/store-firestore-product-readonly-p0.js','modules/cliente360.js','modules/aseguradoras.js','modules/ops.js','modules/leads.js'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const safe=async(url,opts={})=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);try{return await fetch(url,{...opts,signal:c.signal,redirect:'follow'});}finally{clearTimeout(t);}};
const write=(file,p)=>{fs.mkdirSync(EVIDENCE,{recursive:true});fs.writeFileSync(file,JSON.stringify({...p,containsPII:false,containsSecrets:false,firestoreWrites:0,authWrites:0,operationalWrites:0,reimportExecuted:false,mainTouched:false,mergeExecuted:false},null,2)+'\n','utf8');};
const clean=e=>String(e?.message||e||'').replace(/[\r\n]+/g,' ').replace(/[A-Za-z0-9_-]{40,}/g,'[redacted]').slice(0,500);
async function token(){const a=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase']});const c=await a.getClient(),r=await c.getAccessToken(),v=typeof r==='string'?r:r?.token;if(!v)throw new Error('HOSTING_ACCESS_TOKEN_EMPTY');return v;}
async function hosting(){const t=await token(),h={authorization:`Bearer ${t}`,accept:'application/json'};const sr=await safe(`https://firebasehosting.googleapis.com/v1beta1/projects/${PROJECT}/sites/${SITE}`,{headers:h}),s=await sr.json().catch(()=>({}));const rr=await safe(`https://firebasehosting.googleapis.com/v1beta1/sites/${SITE}/releases?pageSize=10`,{headers:h}),rp=await rr.json().catch(()=>({})),rels=Array.isArray(rp.releases)?rp.releases:[];const pick=x=>x?{name:x.name||'',version:x.version?.name||x.version||'',type:x.type||'',releaseTime:x.releaseTime||''}:null;return{siteStatus:sr.status,releasesStatus:rr.status,siteName:s.name||'',defaultUrl:s.defaultUrl||LIVE_URL,currentRelease:pick(rels[0]),previousRelease:pick(rels[1]),releases:rels.map(pick),ok:sr.ok&&rr.ok&&rels.length>0};}
async function remote(){const q=`orbit-go-live=${Date.now()}`,out={};for(const a of ASSETS){const r=await safe(`${LIVE_URL}/${a}?${q}`,{headers:{'cache-control':'no-cache','pragma':'no-cache'}}),b=Buffer.from(await r.arrayBuffer());out[a]={status:r.status,sha256:sha(b)};}return out;}
function local(){return Object.fromEntries(ASSETS.map(a=>{const p=path.join(ARTIFACT,a);if(!fs.existsSync(p))throw new Error(`PRODUCT_ASSET_MISSING:${a}`);return[a,{sha256:sha(fs.readFileSync(p))}];}));}
const exact=(r,l)=>ASSETS.every(a=>r?.[a]?.status>=200&&r?.[a]?.status<400&&r?.[a]?.sha256===l?.[a]?.sha256);
const matchesBefore=(r,b)=>ASSETS.every(a=>r?.[a]?.status>=200&&r?.[a]?.status<400&&r?.[a]?.sha256===b?.publicAssets?.[a]?.sha256);
async function observedRollbackState(b,anchor){const [h,r]=await Promise.all([hosting(),remote()]);return{h,r,currentReleaseAtAnchor:Boolean(h.ok&&h.currentRelease?.version===anchor),publicAssetsRestored:matchesBefore(r,b)};}
try{
 if(!['before','smoke','rollback'].includes(mode))throw new Error('HOSTING_HELPER_MODE_INVALID');
 if(mode==='before'){
  const [h,r]=await Promise.all([hosting(),remote()]),l=local();
  const reachable=ASSETS.every(a=>r[a]?.status>=200&&r[a]?.status<400);
  const ok=h.ok&&Boolean(h.currentRelease?.version)&&reachable;
  const p={schemaVersion:'orbit360-fase-a-hosting-before-v1',generatedAt:new Date().toISOString(),projectId:PROJECT,liveUrl:LIVE_URL,artifact:'orbit360-artifacts/fase-a-product',hosting:h,publicAssets:r,localAssets:l,rollbackAnchor:h.currentRelease?.version||'',checks:{hostingReadable:h.ok,currentReleaseAvailable:Boolean(h.currentRelease?.version),rollbackAnchorAvailable:Boolean(h.currentRelease?.version),publicReachable:reachable},deployExecuted:false,productionTouched:false,ok};write(BEFORE,p);console.log(JSON.stringify(p,null,2));process.exit(ok?0:41);
 }
 if(mode==='smoke'){
  const b=JSON.parse(fs.readFileSync(BEFORE,'utf8')),l=local();let r={},matched=false;
  for(let i=0;i<24;i++){r=await remote();if(exact(r,l)){matched=true;break;}await sleep(5000);}
  const h=await hosting(),newRelease=Boolean(h.currentRelease?.version&&h.currentRelease.version!==b.rollbackAnchor),anchorPreserved=h.releases.some(x=>x?.version===b.rollbackAnchor),ok=matched&&h.ok&&newRelease&&anchorPreserved;
  const p={schemaVersion:'orbit360-fase-a-hosting-smoke-v1',generatedAt:new Date().toISOString(),projectId:PROJECT,liveUrl:LIVE_URL,artifact:'orbit360-artifacts/fase-a-product',hosting:h,publicAssets:r,checks:{assetsExactlyProductArtifact:matched,hostingReadable:h.ok,newReleaseObserved:newRelease,priorAnchorPreserved:anchorPreserved},deployExecuted:true,productionTouched:true,rollbackExecuted:false,ok};write(SMOKE,p);console.log(JSON.stringify(p,null,2));process.exit(ok?0:41);
 }
 const b=JSON.parse(fs.readFileSync(BEFORE,'utf8')),anchor=b.rollbackAnchor;if(!anchor)throw new Error('ROLLBACK_ANCHOR_MISSING');
 let observed=await observedRollbackState(b,anchor);
 if(observed.currentReleaseAtAnchor&&observed.publicAssetsRestored){
  const p={schemaVersion:'orbit360-fase-a-hosting-rollback-v2-idempotent',generatedAt:new Date().toISOString(),projectId:PROJECT,liveUrl:LIVE_URL,rollbackAnchor:anchor,hosting:observed.h,publicAssets:observed.r,checks:{rollbackReleaseCreated:false,rollbackNoopAlreadyAtAnchor:true,currentReleaseAtAnchor:true,publicAssetsRestored:true,hostingReadable:true},deployExecuted:true,productionTouched:false,rollbackExecuted:true,decision:'ROLLBACK_ALREADY_AT_ANCHOR_NOOP_SAFE',ok:true};write(ROLLBACK,p);console.log(JSON.stringify(p,null,2));process.exit(0);
 }
 const t=await token(),resp=await safe(`https://firebasehosting.googleapis.com/v1beta1/sites/${SITE}/releases?versionName=${encodeURIComponent(anchor)}`,{method:'POST',headers:{authorization:`Bearer ${t}`,accept:'application/json','content-type':'application/json'},body:'{}'});
 if(!resp.ok){
  observed=await observedRollbackState(b,anchor);
  if(observed.currentReleaseAtAnchor&&observed.publicAssetsRestored){
   const p={schemaVersion:'orbit360-fase-a-hosting-rollback-v2-idempotent',generatedAt:new Date().toISOString(),projectId:PROJECT,liveUrl:LIVE_URL,rollbackAnchor:anchor,hosting:observed.h,publicAssets:observed.r,checks:{rollbackReleaseCreated:false,rollbackCreateResponseStatus:resp.status,rollbackNoopAlreadyAtAnchor:true,currentReleaseAtAnchor:true,publicAssetsRestored:true,hostingReadable:true},deployExecuted:true,productionTouched:false,rollbackExecuted:true,decision:'ROLLBACK_POST_NONOK_BUT_ANCHOR_ALREADY_ACTIVE_SAFE',ok:true};write(ROLLBACK,p);console.log(JSON.stringify(p,null,2));process.exit(0);
  }
  throw new Error(`ROLLBACK_RELEASE_CREATE_FAILED_${resp.status}`);
 }
 let r={},restored=false;for(let i=0;i<24;i++){r=await remote();restored=matchesBefore(r,b);if(restored)break;await sleep(5000);}const h=await hosting(),atAnchor=Boolean(h.ok&&h.currentRelease?.version===anchor),ok=restored&&h.ok&&atAnchor;
 const p={schemaVersion:'orbit360-fase-a-hosting-rollback-v2-idempotent',generatedAt:new Date().toISOString(),projectId:PROJECT,liveUrl:LIVE_URL,rollbackAnchor:anchor,hosting:h,publicAssets:r,checks:{rollbackReleaseCreated:true,rollbackNoopAlreadyAtAnchor:false,currentReleaseAtAnchor:atAnchor,publicAssetsRestored:restored,hostingReadable:h.ok},deployExecuted:true,productionTouched:true,rollbackExecuted:true,decision:ok?'ROLLED_BACK_SAFE':'ROLLBACK_FAILED_ESCALATE',ok};write(ROLLBACK,p);console.log(JSON.stringify(p,null,2));process.exit(ok?0:42);
}catch(e){const f=mode==='before'?BEFORE:mode==='rollback'?ROLLBACK:SMOKE,p={schemaVersion:'orbit360-fase-a-hosting-helper-error-v1',generatedAt:new Date().toISOString(),mode,classification:'PIPELINE_MECHANISM_FAILURE',error:clean(e),deployExecuted:mode!=='before',productionTouched:mode!=='before',rollbackExecuted:mode==='rollback',ok:false};write(f,p);console.error(JSON.stringify(p,null,2));process.exit(mode==='rollback'?42:41);}
