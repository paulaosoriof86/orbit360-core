import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { chromium } from 'playwright';

const PROJECT='ays-orbit-360-lab';
const TENANT='alianzas-soluciones';
const LOCK=process.env.B1_LOCK_FILE||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B1_EXECUTION_LOCK_20260919.json';
const OUT=process.env.B1_R6_DIRECTED_OUT||path.join(process.env.RUNNER_TEMP||process.cwd(),'b1-r6-directed');
const clean=(v,m=900)=>String(v==null?'':v).trim().slice(0,m);
const norm=v=>clean(v,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const need=(ok,msg)=>{if(!ok)throw new Error(msg)};
function sa(){for(const k of ['SA_DEFAULT','SA_ORBIT360_LAB','SA_ORBIT_360_LAB']){try{const x=JSON.parse(process.env[k]||'');if(x?.type==='service_account'&&x?.project_id===PROJECT&&x?.client_email&&x?.private_key)return x;}catch{}}throw new Error('B1_R6_SERVICE_ACCOUNT_MISSING')}
function roles(m){return [...new Set([].concat(m?.roles||[],m?.rolesAsignados||[],m?.assignedRoles||[],m?.role||[],m?.rol||[],m?.rolDefault||[],m?.defaultRole||[],m?.activeRole||[]).map(clean).filter(Boolean))]}
async function actor(db,auth){
  const snap=await db.collection('tenants').doc(TENANT).collection('members').get(),rows=[];
  for(const d of snap.docs){
    const m=d.data()||{},uid=clean(m.uid||d.id),st=norm(m.status||m.estado||'active');
    if(!uid||m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado','suspended','suspendido'].includes(st))continue;
    try{
      const u=await auth.getUser(uid);if(u.disabled)continue;
      const rr=roles(m),manager=rr.some(r=>['direccion','superadmin','super_admin','admintenant','admin_tenant','admin'].includes(norm(r)));
      rows.push({uid,verified:u.emailVerified===true,roles:rr,advisorId:clean(m.advisorId||m.asesorId),score:(manager?100:0)+(u.emailVerified?50:0)});
    }catch{}
  }
  rows.sort((a,b)=>b.score-a.score);
  need(rows.length,'B1_R6_NO_ACTIVE_ACTOR');
  need(rows[0].verified===true,'B1_R6_TOP_MANAGER_NOT_EMAIL_VERIFIED');
  return rows[0];
}
function hash(v){return crypto.createHash('sha256').update(String(v||'')).digest('hex')}
function measureBrandInPage(selector){
  const img=document.querySelector(selector);
  if(!img)return null;
  const r=img.getBoundingClientRect(),cs=getComputedStyle(img),parent=img.parentElement,pr=parent?.getBoundingClientRect?.();
  let bbox=null;
  try{
    const w=img.naturalWidth||0,h=img.naturalHeight||0;
    if(w&&h){
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
      const data=ctx.getImageData(0,0,w,h).data;
      let minX=w,minY=h,maxX=-1,maxY=-1,count=0;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(data[(y*w+x)*4+3]>8){count++;if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y;}}
      if(maxX>=minX&&maxY>=minY)bbox={x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1,ratio:(maxX-minX+1)/(maxY-minY+1),alphaPixels:count,canvasCoverage:count/(w*h)};
    }
  }catch(e){bbox={error:String(e?.message||e)}}
  return{
    src:String(img.currentSrc||img.src||'').replace(location.origin,''),
    naturalWidth:img.naturalWidth||0,naturalHeight:img.naturalHeight||0,naturalRatio:(img.naturalWidth||0)/(img.naturalHeight||1),
    renderedWidth:r.width,renderedHeight:r.height,renderedRatio:r.width/(r.height||1),
    objectFit:cs.objectFit,objectPosition:cs.objectPosition,width:cs.width,height:cs.height,
    parent:pr?{width:pr.width,height:pr.height,overflow:getComputedStyle(parent).overflow}:null,
    alphaBoundingBox:bbox
  };
}

fs.mkdirSync(OUT,{recursive:true});
const lock=JSON.parse(fs.readFileSync(LOCK,'utf8'));
const TARGET=clean(lock?.preview?.url||lock?.latestSuccessfulRun?.previewUrl||'',700);
need(/^https:\/\/.+\.web\.app$/.test(TARGET),'B1_R6_PREVIEW_URL_MISSING');
const ev={schema:'GRAVICENTRA_I6_5_B1_R6_DIRECTED_READONLY_V1',status:'FAIL',target:TARGET,writes:0,authWrites:0,firestoreWrites:0,actor:{},branding:{},reload:{},startup:{},equipo:{},network:{},errors:[]};
const app=initializeApp({credential:cert(sa()),projectId:PROJECT},'b1-r6-directed');
const db=getFirestore(app),adminAuth=getAuth(app);
let browser,context,page;
try{
  const a=await actor(db,adminAuth);
  ev.actor={uidHash:hash(a.uid),advisorId:a.advisorId,roles:a.roles,emailVerified:a.verified};
  const token=await adminAuth.createCustomToken(a.uid,{b1R6DirectedReadOnly:true});
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport:{width:1440,height:1000}});
  page=await context.newPage();

  await page.addInitScript(()=>{
    window.__B1R6={samples:[],renderEvents:[],hostMutations:[]};
    const visible=el=>!!el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0;
    const sample=()=>{
      try{
        const login=document.getElementById('login'),shell=document.getElementById('shell'),top=document.querySelector('.topbar'),host=document.getElementById('host');
        window.__B1R6.samples.push({
          t:Math.round(performance.now()*10)/10,
          readyState:document.readyState,
          preAuth:document.body?.classList?.contains('pre-auth')||false,
          authRestoring:document.documentElement.getAttribute('data-auth-restoring')||'',
          loginVisible:visible(login),shellVisible:visible(shell),topbarVisible:visible(top),
          bodyBg:document.body?getComputedStyle(document.body).backgroundColor:'',
          hostChildren:host?host.children.length:0,
          hash:location.hash,
          started:!!window.Orbit?.productAppP0?.status?.().started,
          productUid:window.Orbit?.auth?.productUser?.uid?String(window.Orbit.auth.productUser.uid):''
        });
        if(window.__B1R6.samples.length>1600)window.__B1R6.samples.shift();
      }catch{}
    };
    setInterval(sample,25);
    document.addEventListener('DOMContentLoaded',()=>{
      try{
        const host=document.getElementById('host');
        if(host){
          const mo=new MutationObserver(()=>{try{window.__B1R6.hostMutations.push({t:Math.round(performance.now()*10)/10,rows:host.querySelectorAll('tbody tr').length,text:(host.innerText||'').replace(/\s+/g,' ').slice(0,140)});}catch{}});
          mo.observe(host,{childList:true,subtree:true});
        }
      }catch{}
    },{once:true});
  });

  const allRequests=[];
  page.on('request',r=>allRequests.push({t:Date.now(),url:r.url(),method:r.method()}));
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(clean(e?.message||e)));

  await page.goto(TARGET+'/?b1r6='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.Orbit?.productRuntimeBrowserProvidersP0&&!!window.Orbit?.productAppP0,null,{timeout:20000});
  await page.waitForSelector('[data-login-tenant-logo],[data-login-company-brand] img',{timeout:12000}).catch(()=>{});
  ev.branding.loginBeforeAuth=await page.evaluate(measureBrandInPage,'[data-login-tenant-logo],[data-login-company-brand] img');

  const activated=await page.evaluate(async t=>{
    const p=Orbit.productRuntimeBrowserProvidersP0,c=await p.initialize();
    if(!c.auth.currentUser)await c.modules.auth.signInWithCustomToken(c.auth,t);
    return Orbit.productAppP0.status?.().started?Orbit.productAppP0.status():Orbit.productAppP0.activate();
  },token);
  need(activated?.started,'B1_R6_INITIAL_ACTIVATION_FAILED');
  await page.evaluate(()=>{location.hash='#/equipo';});
  await page.waitForFunction(()=>location.hash.startsWith('#/equipo')&&document.querySelector('#eq-add'),null,{timeout:15000});
  await page.waitForTimeout(700);
  ev.branding.headerBeforeReload=await page.evaluate(measureBrandInPage,'#client-logo img,[data-company-brand-logo]');

  const beforeUid=await page.evaluate(()=>String(Orbit.auth?.productUser?.uid||''));
  need(beforeUid===a.uid,'B1_R6_ACTOR_UID_MISMATCH');

  const reloadRequestsStart=allRequests.length;
  const reloadStarted=Date.now();
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});

  await page.evaluate(()=>{
    try{
      const mod=window.Orbit?.modules?.equipo;
      if(mod&&typeof mod.render==='function'&&!mod.__b1r6Wrapped){
        const original=mod.render.bind(mod);
        mod.render=function(host){
          const t=Math.round(performance.now()*10)/10,out=original(host);
          try{window.__B1R6.renderEvents.push({t,rows:host?.querySelectorAll?.('tbody tr')?.length||0,text:(host?.innerText||'').replace(/\s+/g,' ').slice(0,160)});}catch{}
          return out;
        };
        mod.__b1r6Wrapped=true;
      }
    }catch{}
  });

  await page.waitForFunction(expected=>!!window.Orbit?.productAppP0?.status?.().started&&String(window.Orbit?.auth?.productUser?.uid||'')===expected&&!document.body.classList.contains('pre-auth'),a.uid,{timeout:30000});
  const readyMs=Date.now()-reloadStarted;
  await page.waitForSelector('#eq-add',{timeout:12000});
  await page.waitForTimeout(6000);

  const postRequests=allRequests.slice(reloadRequestsStart);
  const forbiddenAuthRequests=postRequests.filter(x=>/signInWithCustomToken|signInWithPassword|accounts:signInWith/i.test(x.url));
  ev.network={postReloadRequestCount:postRequests.length,forbiddenSignInRequests:forbiddenAuthRequests.map(x=>x.url.replace(/key=[^&]+/,'key=REDACTED'))};

  const runtime=await page.evaluate(async expectedUid=>{
    const d=window.__B1R6||{samples:[],renderEvents:[],hostMutations:[]},p=window.Orbit?.productRuntimeBrowserProvidersP0;
    let provider={};
    try{const c=p&&typeof p.initialize==='function'?await p.initialize():null,u=c?.auth?.currentUser||null;provider={currentUser:!!u,uidMatch:String(u?.uid||'')===String(expectedUid||''),emailVerified:u?.emailVerified===true,persistence:String(p?.authPersistence||'')};}catch(e){provider={error:String(e?.message||e)};}
    const status=window.Orbit?.store?._productStatus?.()||{},login=document.getElementById('login'),shell=document.getElementById('shell');
    return{
      samples:d.samples,renderEvents:d.renderEvents,hostMutations:d.hostMutations,
      provider,appStatus:window.Orbit?.productAppP0?.status?.()||null,
      loginDisplay:login?getComputedStyle(login).display:'',loginVisibility:login?getComputedStyle(login).visibility:'',
      shellVisibility:shell?getComputedStyle(shell).visibility:'',route:location.hash,
      rowCount:document.querySelectorAll('#eq-body tbody tr').length,
      store:{requiredCollections:status.requiredCollections||status.requiredStartupCollections||[],optionalCollections:status.optionalCollections||status.deferredCollections||[],serverConfirmedCollections:status.serverConfirmedCollections||[],deferredAttached:status.deferredAttached===true}
    };
  },a.uid);

  ev.reload={readyMs,provider:runtime.provider,appStatus:runtime.appStatus,route:runtime.route,noPostReloadSignInRequest:forbiddenAuthRequests.length===0,sameUid:runtime.provider.uidMatch===true,finalLoginDisplay:runtime.loginDisplay,finalShellVisibility:runtime.shellVisibility};
  ev.equipo={rowCount:runtime.rowCount,renderEvents:runtime.renderEvents,hostMutations:runtime.hostMutations.slice(-60),store:runtime.store};

  const samples=runtime.samples||[],first=samples[0]||{};
  const loginSamples=samples.filter(x=>x.loginVisible),hiddenBoth=samples.filter(x=>!x.loginVisible&&!x.shellVisible);
  const blackLike=hiddenBoth.filter(x=>String(x.bodyBg||'').includes('15, 17, 20')||String(x.bodyBg||'').includes('16, 18, 21')||String(x.bodyBg||'').includes('17, 19, 22'));
  const firstStarted=samples.find(x=>x.started&&x.shellVisible&&!x.preAuth);
  ev.startup={sampleCount:samples.length,initial:first,firstLoginVisibleAt:loginSamples.length?loginSamples[0].t:null,loginVisibleSampleCount:loginSamples.length,hiddenLoginAndShellSampleCount:hiddenBoth.length,blackOrDarkHiddenSampleCount:blackLike.length,firstStartedVisibleAt:firstStarted?.t??null,lastSample:samples[samples.length-1]||{},pageErrors};

  ev.branding.loginAfterReload=await page.evaluate(measureBrandInPage,'[data-login-tenant-logo],[data-login-company-brand] img');
  ev.branding.headerAfterReload=await page.evaluate(measureBrandInPage,'#client-logo img,[data-company-brand-logo]');

  need(runtime.provider.uidMatch===true,'B1_R6_NATIVE_RELOAD_UID_CHANGED');
  need(forbiddenAuthRequests.length===0,'B1_R6_RELOAD_CALLED_SIGNIN_ENDPOINT');
  need(runtime.rowCount===7,'B1_R6_EQUIPO_CANONICAL_COUNT:'+runtime.rowCount);
  need(pageErrors.length===0,'B1_R6_PAGE_ERRORS:'+JSON.stringify(pageErrors.slice(0,5)));
  ev.status='PASS';
}catch(e){
  ev.errors.push(clean(e?.stack||e?.message||e,2600));process.exitCode=1;
}finally{
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  await deleteApp(app).catch(()=>{});
  fs.writeFileSync(path.join(OUT,'b1-r6-directed-readonly.json'),JSON.stringify(ev,null,2)+'\n');
  console.log('B1_R6_DIRECTED='+ev.status);
  console.log('B1_R6_ACTOR='+JSON.stringify(ev.actor));
  console.log('B1_R6_RELOAD='+JSON.stringify(ev.reload));
  console.log('B1_R6_STARTUP='+JSON.stringify(ev.startup));
  console.log('B1_R6_EQUIPO='+JSON.stringify(ev.equipo));
  console.log('B1_R6_BRANDING='+JSON.stringify(ev.branding));
  console.log('B1_R6_NETWORK='+JSON.stringify(ev.network));
  console.log('B1_R6_ERRORS='+JSON.stringify(ev.errors));
  console.log('B1_R6_WRITES=0');
}
