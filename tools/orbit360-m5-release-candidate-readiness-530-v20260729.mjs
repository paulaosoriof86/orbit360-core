#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const PLAT=path.join(ROOT,'orbit360-platform');
const DESCRIPTOR_REL='tools/orbit360-m5-release-candidate-descriptor-530-v20260729.json';
const OVERLAY_REL='tools/orbit360-m5-release-candidate-control-overlay-529-v20260729.json';
const OUT=path.join(PLAT,'runtime-gate-crm-v20260716/m5-release-candidate-readiness-530-summary.json');
const MANIFEST=path.join(PLAT,'runtime-gate-crm-v20260716/m5-release-candidate-manifest-530.json');

const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const text=value=>String(value==null?'':value).trim();
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');};

function localAsset(rel){
  const file=path.join(PLAT,rel);
  if(!fs.existsSync(file)) return {path:rel,present:false,sha256:''};
  return {path:rel,present:true,sha256:sha(fs.readFileSync(file))};
}

async function remoteAsset(base,local,token){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const url=`${base}/${local.path}?m5_rc_530=${encodeURIComponent(token)}`;
    const response=await fetch(url,{headers:{'Cache-Control':'no-cache','Accept-Encoding':'identity'},signal:controller.signal});
    const body=Buffer.from(await response.arrayBuffer());
    const type=text(response.headers.get('content-type')).toLowerCase();
    const isCss=local.path.endsWith('.css');
    const mimeOk=!isCss||type.includes('text/css');
    const remoteSha=sha(body);
    return {path:local.path,status:response.status,mimeOk,match:response.ok&&mimeOk&&remoteSha===local.sha256};
  }catch(error){
    return {path:local.path,status:0,mimeOk:false,match:false,error:'REMOTE_FETCH_FAILED'};
  }finally{clearTimeout(timer);}
}

async function main(){
  const base={schemaVersion:'orbit360-m5-release-candidate-readiness-530-v1',gateId:'block5-release-candidate-visualization-v20260728',contractVersion:'5.0.30',secrets:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,browser:false,runtime:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false,mergeMain:false,policies:false,pólizas:false,containsPII:false,containsSecrets:false};
  try{
    const descriptor=json(DESCRIPTOR_REL);
    const overlay=json(OVERLAY_REL);
    const firebase=json('firebase.json');
    const errors=[];
    const critical=[].concat(descriptor.criticalAssets||[]).map(localAsset);
    const remoteLocals=[].concat(descriptor.remoteAssets||[]).map(localAsset);
    const candidateHash=sha(JSON.stringify(critical.map(row=>({path:row.path,sha256:row.sha256}))));
    const accessSource=read('orbit360-platform/core/access-role-session-owner-v20260728.js');
    const multirolSource=read('orbit360-platform/core/session-multirol-visibility-v20260716.js');
    const swSource=read('orbit360-platform/sw.js');

    if(descriptor.schemaVersion!=='orbit360-m5-release-candidate-descriptor-v1'||descriptor.contractVersion!=='5.0.30') errors.push('descriptor_schema_invalid');
    if(critical.length!==43||critical.some(row=>!row.present)) errors.push('critical_assets_invalid');
    if(remoteLocals.length!==26||remoteLocals.some(row=>!row.present)) errors.push('remote_assets_invalid');
    if(!descriptor.remoteAssets.includes('core/session-multirol-visibility-v20260716.js')) errors.push('multirol_remote_asset_missing');
    if(!descriptor.criticalAssets.includes('core/session-multirol-visibility-v20260716.js')) errors.push('multirol_critical_asset_missing');
    if(overlay.status!=='M5_MULTIROL_OWNER_REMEDIATION_529_STATIC_PASS_READY_TO_REQUEST_NEW_HOSTING_LAB_DELIVERY'||overlay.remediation529?.closed!==true||overlay.remediation529?.failed!==0) errors.push('remediation_529_not_closed');
    if(overlay.baseline?.clients!==414||overlay.baseline?.insurers!==26||overlay.baseline?.advisors!==7||overlay.baseline?.missingCurrency!==0||overlay.baseline?.targetOnlyClients!==0||overlay.baseline?.targetOnlyInsurers!==0) errors.push('baseline_invalid');
    if(firebase.hosting?.public!=='orbit360-platform'||!Array.isArray(firebase.hosting?.ignore)||!firebase.hosting.ignore.includes('docs/**')||firebase.hosting?.rewrites) errors.push('firebase_hosting_contract_invalid');
    if(!accessSource.includes("var VERSION = '20260729.3'")&&!accessSource.includes("var VERSION='20260729.3'")) errors.push('access_owner_version_invalid');
    if(!multirolSource.includes("var VERSION = '20260729.2'")&&!multirolSource.includes("var VERSION='20260729.2'")) errors.push('multirol_owner_version_invalid');
    if(!multirolSource.includes('immutable-delegating-facade')) errors.push('multirol_facade_marker_missing');
    if(!swSource.includes("var CACHE = 'orbit360-v20260729-11-multirol-owner';")) errors.push('pwa_cache_generation_invalid');

    write(MANIFEST,{schemaVersion:'orbit360-m5-release-candidate-manifest-530-v1',gateId:base.gateId,contractVersion:'5.0.30',hash:candidateHash,hashAlgorithm:'sha256',criticalAssetCount:critical.length,remoteAssetCount:remoteLocals.length,assets:critical,descriptor:DESCRIPTOR_REL,containsPII:false,containsSecrets:false});

    const remoteRows=errors.length?[]:await Promise.all(remoteLocals.map(row=>remoteAsset(descriptor.target.canonicalUrl,row,candidateHash.slice(0,16))));
    const assetsMatched=remoteRows.filter(row=>row.match).length;
    const mismatchCount=remoteRows.length-assetsMatched;
    const remoteParity=remoteRows.length===26&&assetsMatched===26&&mismatchCount===0;
    const status=errors.length?'DATA_CONTRACT_FAILURE':(remoteParity?'M5_RC_READY_FOR_RUNTIME_SMOKE':'M5_RC_READY_LAB_DELIVERY_REQUIRED');
    const out={...base,ok:errors.length===0,status,classification:errors.length?'DATA_CONTRACT_FAILURE':null,errors,releaseCandidate:{hash:candidateHash,hashAlgorithm:'sha256',criticalAssetCount:critical.length,allCriticalAssetsPresent:critical.every(row=>row.present),descriptor:DESCRIPTOR_REL,multirolContractBound:true,pwaCacheGeneration:'orbit360-v20260729-11-multirol-owner'},remoteLab:{assetsExpected:26,assetsChecked:remoteRows.length,assetsMatched,mismatchCount,remoteParity,reviewUrl:descriptor.target.reviewUrl,mismatchPaths:remoteRows.filter(row=>!row.match).map(row=>row.path)},baseline:descriptor.baseline,approvalReadyForLabDelivery:errors.length===0&&!remoteParity,approvalReadyForRuntimeSmoke:errors.length===0&&remoteParity,visualReviewAuthorized:false,block5Closed:false};
    write(OUT,out);
    console.log(JSON.stringify({ok:out.ok,status:out.status,releaseCandidateHash:candidateHash,criticalAssets:critical.length,remoteAssetsChecked:remoteRows.length,assetsMatched,mismatchCount,remoteParity,mismatchPaths:out.remoteLab.mismatchPaths},null,2));
    if(errors.length) process.exitCode=41;
  }catch(error){
    const out={...base,ok:false,status:'PIPELINE_MECHANISM_FAILURE',classification:'PIPELINE_MECHANISM_FAILURE',error:text(error&&error.message||error).replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').slice(0,300)};
    write(OUT,out);console.error(out.error);process.exitCode=41;
  }
}

await main();
