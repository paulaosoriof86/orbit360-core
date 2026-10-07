import fs from 'node:fs';
import crypto from 'node:crypto';

const CONTROL=process.env.CONTROL||'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const BASE=(process.env.PRODUCTION_URL||'https://ays-orbit-360-lab.web.app').replace(/\/$/,'');
const OUT=process.env.LIVE_DRIFT_OUT||'/tmp/gravicentra-live-drift.json';
const BEFORE=process.env.LIVE_DRIFT_BEFORE||'';
const MODE=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=snapshot').split('=')[1];
const paths=['/index.html','/core/pwa.js','/sw.js','/product-runtime-config.js','/__recovery__/build.json'];
const sha=t=>crypto.createHash('sha256').update(typeof t==='string'||Buffer.isBuffer(t)?t:JSON.stringify(t)).digest('hex');
const c=JSON.parse(fs.readFileSync(CONTROL,'utf8')),expected=c.certifiedCandidate||{};
const result={schema:'GRAVICENTRA_PREEXISTING_LIVE_DRIFT_SNAPSHOT_V1',recordedAt:new Date().toISOString(),mode:MODE,base:BASE,readOnly:true,hostingMutation:false,dataMutation:false,expected:{sourceSha:expected.sourceSha||'',buildId:expected.buildId||''},files:{},status:'INIT'};
for(const p of paths){
  const u=BASE+p+(p.includes('?')?'&':'?')+'drift='+Date.now();
  const r=await fetch(u,{cache:'no-store',headers:{'Cache-Control':'no-cache, no-store','Pragma':'no-cache'}});
  const text=await r.text();
  result.files[p]={status:r.status,ok:r.ok,sha256:sha(text),bytes:Buffer.byteLength(text),cacheControl:String(r.headers.get('cache-control')||'')};
}
for(const p of ['/index.html','/core/pwa.js','/sw.js','/product-runtime-config.js'])if(!result.files[p].ok)throw new Error('LIVE_DRIFT_REQUIRED_FILE_UNAVAILABLE:'+p+':'+result.files[p].status);
const marker=result.files['/__recovery__/build.json'];
result.certifiedMarkerPresent=marker.ok;
result.preexistingCertifiedBindingMismatch=!marker.ok;
if(marker.ok){
  const r=await fetch(BASE+'/__recovery__/build.json?driftMarker='+Date.now(),{cache:'no-store'}),m=await r.json().catch(()=>({}));
  result.marker={sourceSha:String(m.sourceSha||''),buildId:String(m.buildId||'')};
  result.preexistingCertifiedBindingMismatch=result.marker.sourceSha!==result.expected.sourceSha||result.marker.buildId!==result.expected.buildId;
}
result.liveFingerprint=sha(Object.entries(result.files).map(([p,v])=>[p,v.status,v.sha256,v.bytes]));
if(MODE==='compare'){
  if(!BEFORE||!fs.existsSync(BEFORE))throw new Error('LIVE_DRIFT_BEFORE_MISSING');
  const b=JSON.parse(fs.readFileSync(BEFORE,'utf8'));
  result.beforeFingerprint=b.liveFingerprint||'';
  result.unchangedDuringOperation=result.liveFingerprint===result.beforeFingerprint;
  if(!result.unchangedDuringOperation)throw new Error('LIVE_CHANGED_DURING_READONLY_OPERATION');
  result.status='PASS_PREEXISTING_DRIFT_UNCHANGED';
}else{
  result.status=result.preexistingCertifiedBindingMismatch?'PASS_SNAPSHOT_PREEXISTING_CERTIFIED_DRIFT':'PASS_SNAPSHOT_CERTIFIED_MATCH';
}
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,liveFingerprint:result.liveFingerprint,preexistingCertifiedBindingMismatch:result.preexistingCertifiedBindingMismatch,certifiedMarkerPresent:result.certifiedMarkerPresent},null,2));
