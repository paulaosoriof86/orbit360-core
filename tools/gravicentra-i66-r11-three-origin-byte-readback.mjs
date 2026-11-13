import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const root=process.env.I66_R11_EXTRACTED_ROOT;
const source=process.env.I66_R11_SOURCE_SHA;
const evidence=process.env.I66_R11_EVIDENCE_PATH;
const need=(ok,reason)=>{if(!ok)throw Error(reason);};
need(root&&source&&evidence,'R11_EXACT_PACKAGE_ENV_REQUIRED');
need(/^[a-f0-9]{40}$/.test(source),'R11_EXACT_SOURCE_INVALID');
const manifest=path.join(root,'evidence','site-manifest.sha256');
const site=path.join(root,'bundle','site');
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const meta=JSON.parse(fs.readFileSync(path.join(site,'__recovery__','build.json')));
need(meta.sourceSha===source&&meta.gate==='I6.6','R11_PACKAGE_SOURCE_OR_GATE_DRIFT');
const items=fs.readFileSync(manifest,'utf8').trim().split('\n').map(line=>{
  const m=line.match(/^([a-f0-9]{64})  (.+)$/);
  need(m&&!m[2].startsWith('/')&&!m[2].includes('\\')&&
    !m[2].split('/').some(x=>!x||x==='.'||x==='..'),'R11_BAD_FILE_MANIFEST');
  const full=path.join(site,m[2]);
  need(fs.existsSync(full)&&digest(fs.readFileSync(full))===m[1],
    'R11_LOCAL_PACKAGE_INTEGRITY_FAILED');
  return {sha:m[1],file:m[2]};
});
need(items.length>=200&&items.length<=800&&
  new Set(items.map(x=>x.file)).size===items.length,'R11_MANIFEST_BOUNDS');

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function read(origin,file,attempts=3){
  let last;
  const url=origin+'/'+file.split('/').map(encodeURIComponent).join('/');
  for(let i=0;i<attempts;i++){
    try{
      const r=await fetch(url,{headers:{'cache-control':'no-cache','pragma':'no-cache'},
        signal:AbortSignal.timeout(18000)});
      need(r.ok,'R11_HTTP_'+r.status+':'+file);
      return Buffer.from(await r.arrayBuffer());
    }catch(e){last=e;if(i+1<attempts)await pause(800*(i+1));}
  }
  throw last||Error('R11_READ_FAILED');
}
async function inspect(origin,label){
  let ready=false;
  for(let i=0;i<20;i++){
    try{
      const marker=JSON.parse((await read(origin,'__recovery__/build.json',2)).toString());
      if(marker.sourceSha===source&&marker.buildId===meta.buildId){ready=true;break;}
    }catch{}
    await pause(3000);
  }
  need(ready,'R11_LIVE_MARKER_NOT_PROPAGATED_'+label);
  let next=0,passed=0;
  await Promise.all(Array.from({length:12},async()=>{
    while(next<items.length){
      const row=items[next++];
      need(digest(await read(origin,row.file))===row.sha,
        'R11_LIVE_BYTE_DIFFERENCE_'+label+':'+row.file);
      passed++;
    }
  }));
  need(passed===items.length,'R11_LIVE_INCOMPLETE_'+label);
  console.log('I66_R11_'+label+'_EXACT_BYTE_READBACK_PASS files='+passed);
  return passed;
}
const preview='https://ays-orbit-360-lab--gi-i66-rc-42868854629-abj14q6n.web.app';
const firebase='https://ays-orbit-360-lab.web.app';
const staff='https://app.aysseguros.com';
const [a,b,c]=await Promise.all([
  inspect(preview,'PREVIEW'),inspect(firebase,'FIREBASE_LIVE'),inspect(staff,'STAFF_LIVE')
]);
need(a===b&&b===c,'R11_ORIGIN_FILE_COUNT_DRIFT');
fs.writeFileSync(evidence,JSON.stringify({gate:'I6.6',sourceSha:source,
  previewFiles:a,firebaseLiveFiles:b,staffLiveFiles:c,buildId:meta.buildId,
  realFinancialWrites:0,fullI66ProductionAccepted:false},null,2)+'\n');
console.log('I66_R11_THREE_ORIGINS_SAME_IMMUTABLE_ARTIFACT_PASS files='+a);
