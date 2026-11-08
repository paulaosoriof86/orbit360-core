import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {GoogleAuth}=require('google-auth-library');
const mode=process.argv[2]||'promote';
const site='ays-orbit-360-lab',root='https://firebasehosting.googleapis.com/v1beta1/';
const liveUrl='https://ays-orbit-360-lab.web.app';
const previewUrl='https://ays-orbit-360-lab--gi-i65-b4-rc-41765742748-neoi3u7r.web.app';
const channel='gi-i65-b4-rc-41765742748';
const sourceSha='f8fa00e4e2e6627cee66c8c521866874e39bc8da';
const buildId='gi-i65-b4-f8fa00e4e2e6-57f234755dc1';
const payloadDigest='819e36b57ef5042ed37458f80274f9db45303e881b4f268c34dec8d4506c9d56';
const oldSource='6c45983610ce0d65a5c63bd07659ad968bfe9da3';
const oldBuild='gi-i65-b4-6c45983610ce-57f234755dc1';
const priorVersion='sites/ays-orbit-360-lab/versions/33af816375dd5cb5';
const out=process.env.B4_004_PROMOTION_OUT;
const pkg=process.env.B4_004_RETAINED_PACKAGE_ROOT;
const proof={schema:'GRAVICENTRA_B4_004_CRONOGRAMA_SAME_ARTIFACT_HOSTING_PROMOTION_V1',
 runId:String(process.env.GITHUB_RUN_ID||''),runAttempt:Number(process.env.GITHUB_RUN_ATTEMPT||1),runnerCommit:String(process.env.GITHUB_SHA||''),
 status:'NOT_STARTED',sourceSha,buildId,artifactId:13600357541,hostedPayloadDigest:payloadDigest,
 priorLiveVersion:priorVersion,previewVersion:null,promotionAttempted:false,rollbackAttempted:false,
 backendChanges:0,rulesChanges:0,authIamChanges:0,businessWrites:0,rebuild:false,artifactPatched:false,fullLiveByteReadback:false,errors:[]};
const want=(condition,code)=>{if(!condition)throw Error(code);};
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const save=()=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(proof,null,2)+'\n');};
const client=async scope=>new GoogleAuth({keyFile:process.env.GOOGLE_APPLICATION_CREDENTIALS,scopes:[scope]}).getClient();
const fixedGet=async(c,url)=>{
 want(url.startsWith(root),'HOSTING_URL_NOT_ALLOWED');
 const r=await c.request({url,method:'GET',timeout:30000,retry:false});
 return r.data;
};
const version=raw=>{
 const m=String(raw||'').match(/(?:^|\/)(sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+)$/);
 want(!!m,'HOSTING_VERSION_INVALID');
 return m[1];
};
const channelGet=async(c,name)=>fixedGet(c,root+'projects/-/sites/'+site+'/channels/'+name);
const channelVersion=async(c,name)=>version((await channelGet(c,name)).release?.version?.name);
const versionMeta=async(c,name)=>{
 const v=await fixedGet(c,root+name);
 want(version(v.name)===name&&v.status==='FINALIZED','HOSTING_VERSION_NOT_FINALIZED');
 return v;
};
const readRows=()=>{
 const b=fs.readFileSync(path.join(pkg,'evidence/site-manifest.sha256'));
 want(digest(b)===payloadDigest,'ARCHIVE_MANIFEST_DIGEST_MISMATCH');
 const rows=String(b).trim().split('\n').map(s=>{
  const i=s.indexOf('  ');want(i===64,'ARCHIVE_MANIFEST_ROW_INVALID');
  const sha=s.slice(0,i),rel=s.slice(i+2);
  want(/^[a-f0-9]{64}$/.test(sha)&&rel&&!rel.includes('..')&&!rel.startsWith('/'),'ARCHIVE_MANIFEST_PATH_INVALID');
  const file=fs.readFileSync(path.join(pkg,'bundle/site',rel));
  want(digest(file)===sha,'ARCHIVE_FILE_SHA_MISMATCH:'+rel);
  return{sha,rel};
 });
 want(rows.length===218&&new Set(rows.map(r=>r.rel)).size===218,'ARCHIVE_EXACT_FILE_COUNT');
 const marker=JSON.parse(fs.readFileSync(path.join(pkg,'bundle/site/__recovery__/build.json'),'utf8'));
 want(marker.sourceSha===sourceSha&&marker.buildId===buildId,'ARCHIVE_BUILD_MARKER_MISMATCH');
 return rows;
};
const fetchExact=async(origin,rel,expected)=>{
 const u=origin+'/'+rel.split('/').map(encodeURIComponent).join('/')+'?gi_b4004='+Date.now();
 const response=await fetch(u,{redirect:'manual',headers:{'Accept-Encoding':'identity','Cache-Control':'no-cache, no-store'}});
 want(response.status===200&&new URL(response.url).origin===origin,'HOSTED_RESPONSE_INVALID:'+rel);
 const buf=Buffer.from(await response.arrayBuffer());
 want(digest(buf)===expected,'HOSTED_SHA_MISMATCH:'+rel);
};
const siteReadback=async(origin,rows)=>{
 for(let i=0;i<rows.length;i+=12)await Promise.all(rows.slice(i,i+12).map(x=>fetchExact(origin,x.rel,x.sha)));
 const marker=await (await fetch(origin+'/__recovery__/build.json?gi_b4004='+Date.now(),{headers:{'Cache-Control':'no-cache'}})).json();
 want(marker.sourceSha===sourceSha&&marker.buildId===buildId,'HOSTED_BUILD_MARKER_MISMATCH');
};
const release=async(v,kind)=>{
 want(kind==='promote'||kind==='rollback','RELEASE_KIND');
 want(v===(kind==='promote'?proof.previewVersion:priorVersion),'RELEASE_VERSION_OUTSIDE_PIN');
 const c=await client('https://www.googleapis.com/auth/firebase.hosting');
 const url=root+'sites/'+site+'/channels/live/releases?versionName='+encodeURIComponent(v);
 const r=await c.request({url,method:'POST',data:{message:'B4-004 exact existing-version '+kind+' run '+proof.runId},timeout:30000,retry:false,headers:{'Content-Type':'application/json'}});
 want(version(r.data.version?.name)===v,'RELEASE_RESPONSE_WRONG_VERSION');
 const read=await client('https://www.googleapis.com/auth/firebase.hosting.readonly');
 for(let i=0;i<10;i++){
  if(await channelVersion(read,'live')===v)return;
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 throw Error('LIVE_VERSION_READBACK_TIMEOUT');
};
const readOnly=async()=>client('https://www.googleapis.com/auth/firebase.hosting.readonly');
async function rollback(){
 if(!fs.existsSync(out))throw Error('ROLLBACK_MISSING_EXECUTION_RECEIPT');
 const original=JSON.parse(fs.readFileSync(out,'utf8'));
 Object.assign(proof,original);
 const rd=await readOnly();
 const current=await channelVersion(rd,'live');
 want(current===priorVersion||current===proof.previewVersion,'ROLLBACK_UNKNOWN_LIVE_VERSION');
 if(current===priorVersion){proof.status='ROLLBACK_NOT_NEEDED';save();return;}
 proof.rollbackAttempted=true;save();
 await release(priorVersion,'rollback');
 const marker=await (await fetch(liveUrl+'/__recovery__/build.json?gi_restore='+Date.now(),{headers:{'Cache-Control':'no-cache'}})).json();
 want(marker.sourceSha===oldSource&&marker.buildId===oldBuild,'ROLLBACK_MARKER_MISMATCH');
 proof.status='ROLLED_BACK_TO_PREVIOUS_VERIFIED_VERSION';save();
}
async function promote(){
 let posted=false;
 try{
  want(process.env.B4_004_GUARD_RUN_STATUS==='success','HISTORICAL_GUARD_NOT_PASS');
  const cp=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json','utf8'));
  const p=cp.b4004CronogramaCountryFocalPreviewPass20261107,c=cp.b4004PolicyCaptureFrontendSuccessor20261107;
  want(p?.status==='CRONOGRAMA_COUNTRY_FOCAL_AUTHENTICATED_PREVIEW_PASS_LIVE_PENDING'&&
    p.sourceSha===sourceSha&&p.buildId===buildId&&p.artifactId===13600357541&&
    p.hostedPayloadDigest===payloadDigest&&c?.liveFunctionalAcceptance?.status==='POLICY_CAPTURE_FOCAL_LIVE_PASS',
    'B4004_PREVIEW_OR_PREDECESSOR_PROOF_NOT_BOUND');
  const rows=readRows();
  const rd=await readOnly();
  proof.previewVersion=await channelVersion(rd,channel);
  const old=await channelVersion(rd,'live');
  want(old===priorVersion,'LIVE_CHANGED_FROM_CERTIFIED_PREDECESSOR');
  await Promise.all([versionMeta(rd,proof.previewVersion),versionMeta(rd,priorVersion)]);
  proof.oldLiveVersionObserved=old;proof.previewFileCount=rows.length;
  await siteReadback(previewUrl,rows);
  const oldMarker=await (await fetch(liveUrl+'/__recovery__/build.json?b4004_before='+Date.now(),{headers:{'Cache-Control':'no-cache'}})).json();
  want(oldMarker.sourceSha===oldSource&&oldMarker.buildId===oldBuild,'LIVE_PREDECESSOR_MARKER_MISMATCH');
  proof.status='EXACT_PREFLIGHT_PASS_PROMOTION_REQUESTED';
  proof.promotionAttempted=true;save();posted=true;
  await release(proof.previewVersion,'promote');
  await siteReadback(liveUrl,rows);
  proof.fullLiveByteReadback=true;proof.status='EXACT_PREVIEW_VERSION_PROMOTED_AND_LIVE_BYTES_PASS_FUNCTIONAL_PENDING';save();
  console.log('B4_004_EXACT_EXISTING_VERSION_LIVE_BYTES_PASS '+proof.previewVersion+' files='+rows.length);
 }catch(err){
  proof.errors.push(String(err?.message||err).slice(0,160));proof.status='FAILED';save();
  if(posted){
   try{await rollback();}catch(e){proof.errors.push('ROLLBACK_FAILED_'+String(e?.message||e).slice(0,120));proof.status='ROLLBACK_UNVERIFIED';save();}
  }
  throw err;
 }
}
if(mode==='promote')await promote();else if(mode==='rollback')await rollback();else throw Error('BAD_MODE');
