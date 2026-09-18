import fs from 'node:fs';

const CONTROL=process.env.CONTROL||'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const BASE=(process.env.PRODUCTION_URL||'https://ays-orbit-360-lab.web.app').replace(/\/$/,'');
const attempts=Number(process.env.LIVE_BINDING_ATTEMPTS||12);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const need=(x,c)=>{if(!x)throw new Error(c);};
const c=JSON.parse(fs.readFileSync(CONTROL,'utf8'));
const expected=c.certifiedCandidate||{};
need(expected.sourceSha&&expected.buildId,'LIVE_BINDING_CERTIFIED_CANDIDATE_MISSING');

async function fetchText(path){
  const u=BASE+path+(path.includes('?')?'&':'?')+'binding='+Date.now();
  const r=await fetch(u,{cache:'no-store',headers:{'Cache-Control':'no-cache, no-store','Pragma':'no-cache'}});
  if(!r.ok)throw new Error('HTTP_'+r.status+':'+path);
  return {text:await r.text(),headers:Object.fromEntries(r.headers.entries())};
}
let last='';
for(let i=1;i<=attempts;i++){
  try{
    const [marker,pwa,sw,index,cfg]=await Promise.all([
      fetchText('/__recovery__/build.json'),
      fetchText('/core/pwa.js'),
      fetchText('/sw.js'),
      fetchText('/index.html'),
      fetchText('/product-runtime-config.js')
    ]);
    const m=JSON.parse(marker.text);
    need(m.sourceSha===expected.sourceSha,'LIVE_BINDING_SOURCE_MISMATCH');
    need(m.buildId===expected.buildId,'LIVE_BINDING_BUILD_MISMATCH');
    need(pwa.text.includes("var RUNTIME_BUILD = '"+expected.buildId+"';"),'LIVE_BINDING_PWA_BUILD_MISMATCH');
    need(sw.text.includes("var BUILD = '"+expected.buildId+"';"),'LIVE_BINDING_SW_BUILD_MISMATCH');
    need(sw.text.includes("var CACHE = 'orbit360-"+expected.buildId+"';"),'LIVE_BINDING_SW_CACHE_MISMATCH');
    for(const [name,obj] of [['build',marker],['index',index],['runtimeConfig',cfg],['sw',sw]]){
      const cc=String(obj.headers['cache-control']||'').toLowerCase();
      need(cc.includes('no-cache')||cc.includes('no-store'),'LIVE_BINDING_CACHE_HEADER_MISSING:'+name);
    }
    console.log('LIVE_BINDING=PASS');
    console.log('LIVE_BINDING_SOURCE='+expected.sourceSha);
    console.log('LIVE_BINDING_BUILD='+expected.buildId);
    console.log('LIVE_BINDING_ATTEMPT='+i);
    process.exit(0);
  }catch(e){
    last=String(e&&e.message||e);
    if(i<attempts)await sleep(5000);
  }
}
throw new Error('LIVE_BINDING_FAIL:'+last);
