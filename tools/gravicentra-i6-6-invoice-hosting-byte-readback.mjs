import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

// The same certified TAR, already installed in Preview, must be byte-identical
// on both LIVE origins after the single Firebase Hosting-version clone.
const root=process.env.I66_SITE_PACKAGE_ROOT;
const source='586401bfbe1a80cfef2820982f432743af36b108';
const manifest=path.join(root||'','evidence','site-manifest.sha256');
const site=path.join(root||'','bundle','site');
const fingerprint=b=>crypto.createHash('sha256').update(b).digest('hex');
const need=(ok,reason)=>{if(!ok)throw Error(reason);};
need(root&&fs.existsSync(manifest),'I66_CERTIFIED_SITE_MANIFEST_REQUIRED');
const meta=JSON.parse(fs.readFileSync(path.join(site,'__recovery__','build.json')));
need(meta.sourceSha===source&&meta.gate==='I6.6','I66_IMMUTABLE_SITE_SOURCE_DRIFT');
const rows=fs.readFileSync(manifest,'utf8').trim().split('\n').map(row=>{
  const match=row.match(/^([0-9a-f]{64})  (.+)$/);
  need(match&&match[2]&&!match[2].startsWith('/')&&!match[2].includes('\\')&&
    !match[2].split('/').some(t=>!t||t==='.'||t==='..'),'I66_SITE_MANIFEST_ROW_INVALID');
  const file=path.join(site,match[2]);
  need(fs.existsSync(file)&&fingerprint(fs.readFileSync(file))===match[1],'I66_LOCAL_CERTIFIED_BYTES_MISSING');
  return{digest:match[1],file:match[2]};
});
need(rows.length>=200&&rows.length<=800&&new Set(rows.map(x=>x.file)).size===rows.length,'I66_SITE_FILE_COUNT_INVALID');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function read(origin,file,attempts=3){
  const url=origin+'/'+file.split('/').map(encodeURIComponent).join('/');
  let last;
  for(let n=0;n<attempts;n++){
    try{
      const resp=await fetch(url,{headers:{'cache-control':'no-cache','pragma':'no-cache'},signal:AbortSignal.timeout(20000)});
      need(resp.ok,'I66_SITE_HTTP_'+resp.status);
      return Buffer.from(await resp.arrayBuffer());
    }catch(e){last=e;if(n+1<attempts)await sleep(750*(n+1));}
  }
  throw last||Error('I66_SITE_FETCH_FAILED');
}
async function ready(origin){
  for(let n=0;n<20;n++){
    try{const live=JSON.parse((await read(origin,'__recovery__/build.json',2)).toString());
      if(live.sourceSha===source&&live.buildId===meta.buildId)return;
    }catch{}
    await sleep(3000);
  }
  throw Error('I66_SITE_SOURCE_NOT_PROPAGATED:'+origin);
}
async function verify(origin,label){
  await ready(origin);
  let cursor=0,passed=0;
  await Promise.all(Array.from({length:12},async()=>{
    while(cursor<rows.length){
      const item=rows[cursor++],actual=await read(origin,item.file);
      need(fingerprint(actual)===item.digest,'I66_SITE_EXACT_BYTE_MISMATCH:'+label+':'+item.file);
      passed++;
    }
  }));
  need(passed===rows.length,'I66_SITE_INCOMPLETE_READBACK:'+label);
  console.log('I66_INVOICE_'+label+'_SAME_IMMUTABLE_ARTIFACT_READBACK_PASS files='+passed+' source='+source);
  return passed;
}
const [preview,firebase,custom]=await Promise.all([
  verify('https://ays-orbit-360-lab--gi-i66-rc-42868854629-abj14q6n.web.app','PREVIEW'),
  verify('https://ays-orbit-360-lab.web.app','FIREBASE_LIVE'),
  verify('https://app.aysseguros.com','STAFF_LIVE')
]);
need(preview===firebase&&firebase===custom,'I66_SITE_THREE_ORIGIN_FILE_COUNT_DRIFT');
console.log('I66_INVOICE_THREE_ORIGINS_SAME_ARTIFACT_FILES_PASS '+firebase+'/'+firebase+' source='+source);
