'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto'),vm=require('node:vm');
const runtime=require('./gravicentra-i66-signed-qa-runtime-auth.cjs');
const filename=path.join(__dirname,'gravicentra-i66-privileged-role-exact-live-transport.mjs');
const body=fs.readFileSync(filename,'utf8').replace(/^import .*;\n/gm,'').replace('createRequire(import.meta.url)','createRequire("test:exact-live-transport")');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const SITE='ays-orbit-360-lab',SOURCE='16e3a70baf4e31ef8453173990f32a398c65e59b';
const CHANNEL='gi-i66-rc-45518809761',PREVIEW='https://'+SITE+'--'+CHANNEL+'-eiytd3a3.web.app';
const LIVE=['https://'+SITE+'.web.app','https://app.aysseguros.com'];
const NEXT='sites/'+SITE+'/versions/TEST_NEW',OLD='sites/'+SITE+'/versions/TEST_PREVIOUS';
const marker={gate:'I6.6',product:'Gravicentra Insurance',sourceSha:SOURCE,buildId:'gi-i66-16e3a70baf4e-57f234755dc1'};
const previous={sourceSha:'65c825b2808a615ca4195bdde6689dbdbe3193b2',buildId:'gi-i66-65c825b2808a-57f234755dc1'};
function harness(options={}){
  const files=new Map([['index.html',Buffer.from('synthetic index')],['__recovery__/build.json',Buffer.from(JSON.stringify(marker))]]);
  for(let i=0;i<222;i++)files.set('assets/test-'+i+'.js',Buffer.from('synthetic '+i));
  const manifest=Buffer.from([...files].map(([file,bytes])=>hash(bytes)+'  '+file).join('\n')+'\n');
  const candidate={sourceSha:SOURCE,previewUrl:PREVIEW,previewChannelId:CHANNEL,artifactId:35,artifactDigest:'sha256:'+'a'.repeat(64),
    expectedSiteFileCount:224,currentLive:{...previous,hostingVersion:OLD}};
  const env={PROJECT_ID:SITE,GRAVICENTRA_BUILD_PROVIDER:'CLOUD_BUILD',GRAVICENTRA_CLOUD_BUILD_ID:'12345678-1234-1234-1234-123456789abc',
    GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:runtime.C.serviceAccount,I66_OPERATIONAL_CANDIDATE:'true',I66_PACKAGE_ROOT:'/package',FIREBASE_CLI_BIN:'/cli/firebase.js',
    I66_ROLE_SOURCE_SHA:SOURCE,I66_ROLE_PREVIEW_ORIGIN:PREVIEW,I66_ROLE_PREVIEW_CHANNEL:CHANNEL,RUNNER_TEMP:'/evidence',...options.env};
  const calls={metadata:[],googleAuth:[],fetch:[],clone:[],reports:[],logs:[],helper:0};let promoted=false;
  const readFile=file=>{
    if(file==='control.json')return Buffer.from('{}');
    if(file==='/package/evidence/site-manifest.sha256')return manifest;
    if(file.startsWith('/package/bundle/site/'))return files.get(file.slice('/package/bundle/site/'.length));
    throw Error('TEST_UNEXPECTED_FILE');
  };
  const sandbox={process:{env,execPath:'/node',cwd:()=>'/worker'},path,crypto,Buffer,URL,AbortSignal,
    fs:{existsSync:file=>file==='/cli/firebase.js'||file==='/package/evidence/site-manifest.sha256'||file==='/private/existing.json'&&!options.missingLegacyKey||file.startsWith('/package/bundle/site/'),
      readFileSync:(file,encoding)=>{const value=readFile(file);return encoding?value.toString():value;},
      writeFileSync:(file,value)=>calls.reports.push({file,value:JSON.parse(value)})},
    createRequire:()=>id=>{
      if(id==='./gravicentra-i6-6-operational-release-candidate.cjs')return {CONTROL:'control.json',candidateForPhase:()=>candidate,
        validateBuildMarker:(p,hosted,packaged)=>{assert.equal(hosted.sourceSha,p.sourceSha);assert.equal(hosted.buildId,marker.buildId);if(packaged)assert.equal(hosted.buildId,packaged.buildId);}};
      if(id==='./gravicentra-i66-signed-qa-runtime-auth.cjs')return {verifyCloudBuildRuntime:()=>{calls.helper++;return runtime.verifyCloudBuildRuntime(env,
        {homedir:()=>'/worker',existsSync:()=>false,fetch:async(url,request)=>{
          calls.metadata.push(url);assert.equal(request.headers['Metadata-Flavor'],'Google');assert.equal(request.redirect,'error');
          const value=url.endsWith('numeric-project-id')?runtime.C.projectNumber:url.endsWith('project-id')?runtime.C.projectId:options.runtimeAccount||runtime.C.serviceAccount;
          return {status:options.metadataDenied?403:200,headers:{get:()=> 'Google'},text:async()=>value};
        }});}};
      throw Error('TEST_UNEXPECTED_MODULE');
    },
    GoogleAuth:class{constructor(config){calls.googleAuth.push(config);}async getClient(){if(options.googleDenied)throw Error('TEST_GOOGLE_AUTH_DENIED');return {getAccessToken:async()=>({token:'TEST_ONLY_ACCESS_TOKEN'})};}},
    async fetch(url,request={}){
      calls.fetch.push(url);
      if(url.startsWith('https://firebasehosting.googleapis.com/'))return {ok:true,json:async()=>({releases:[{version:{name:url.includes('/channels/live/')?(promoted?NEXT:OLD):NEXT}}]})};
      const origin=[PREVIEW,...LIVE].find(value=>url.startsWith(value+'/'));assert.ok(origin);
      const relative=url.slice(origin.length+1).split('/').map(decodeURIComponent).join('/');
      let bytes=origin!==PREVIEW&&!promoted&&relative==='__recovery__/build.json'?Buffer.from(JSON.stringify(previous)):files.get(relative);
      if(options.previewDrift&&origin===PREVIEW&&relative==='index.html')bytes=Buffer.from('WRONG_BYTES');
      return {ok:true,status:200,arrayBuffer:async()=>bytes};
    },
    execFileSync:(command,args)=>{calls.clone.push({command,args});promoted=true;return '{}';},
    setTimeout:resolve=>{resolve();return 1;},console:{log:value=>calls.logs.push(value),error:value=>calls.logs.push(value)}};
  return {calls,process:sandbox.process,run:()=>new vm.Script('(async()=>{\n'+body+'\n})()',{filename}).runInNewContext(sandbox)};
}
test('Cloud Build ADC clones the same verified Preview version and preserves exact readbacks',async()=>{
  const h=harness();await h.run();assert.equal(h.process.exitCode,undefined);assert.equal(h.calls.helper,1);assert.equal(h.calls.metadata.length,3);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls.googleAuth)),[{scopes:['https://www.googleapis.com/auth/firebase.hosting']}]);
  assert.equal(h.calls.clone.length,1);assert.deepEqual([...h.calls.clone[0].args],['/cli/firebase.js','hosting:clone',SITE+'@TEST_NEW',SITE+':live','--project',SITE,'--non-interactive','--json']);
  const report=h.calls.reports[0].value;
  assert.equal(report.previewHostingVersion,NEXT);assert.equal(report.liveHostingVersion,NEXT);assert.equal(report.previousHostingVersion,OLD);
  assert.deepEqual([report.previewFiles,report.liveSiteFiles,report.customSiteFiles],[224,224,224]);
  assert.equal(report.status,'EXACT_224_OF_224_EACH_ORIGIN_SAME_PREVIEW_VERSION_PASS_SIGNED_LIVE_QA_REQUIRED');
  assert.ok(!h.calls.logs.join('\n').includes('TEST_ONLY_ACCESS_TOKEN'));
});
test('legacy keyFile flow keeps identical transport evidence and does not invoke native metadata',async()=>{
  const cloud=harness(),legacy=harness({env:{GRAVICENTRA_BUILD_PROVIDER:'',GOOGLE_APPLICATION_CREDENTIALS:'/private/existing.json'}});
  await cloud.run();await legacy.run();assert.equal(legacy.calls.helper,0);assert.equal(legacy.calls.metadata.length,0);
  assert.deepEqual(JSON.parse(JSON.stringify(legacy.calls.googleAuth)),[{keyFile:'/private/existing.json',scopes:['https://www.googleapis.com/auth/firebase.hosting']}]);
  assert.deepEqual(JSON.parse(JSON.stringify(legacy.calls.reports)),JSON.parse(JSON.stringify(cloud.calls.reports)));
});
for(const [name,options,code] of [
  ['unrecognized provider',{env:{GRAVICENTRA_BUILD_PROVIDER:'LOCAL'}},'I66_ROLE_RELEASE_PROVIDER_UNSUPPORTED'],
  ['missing legacy key',{env:{GRAVICENTRA_BUILD_PROVIDER:'',GOOGLE_APPLICATION_CREDENTIALS:'/private/existing.json'},missingLegacyKey:true},'I66_ROLE_RELEASE_PRECONDITIONS_MISSING'],
  ['wrong runtime account',{runtimeAccount:'646761409743-compute@developer.gserviceaccount.com'},'I66_SIGNED_QA_CLOUD_RUNTIME_IDENTITY_MISMATCH'],
  ['metadata403',{metadataDenied:true},'I66_SIGNED_QA_CLOUD_METADATA_UNTRUSTED'],
  ['configured key in native mode',{env:{GOOGLE_APPLICATION_CREDENTIALS:'/private/existing.json'}},'I66_SIGNED_QA_CLOUD_CREDENTIAL_OVERRIDE']
])test('auth HOLD before provider or Hosting operations: '+name,async()=>{
  const h=harness(options);await h.run();assert.equal(h.process.exitCode,1);assert.equal(h.calls.clone.length,0);
  assert.equal(h.calls.googleAuth.length,0);assert.equal(h.calls.fetch.length,0);assert.equal(h.calls.reports[0].value.status,'HOLD');
  assert.equal(h.calls.reports[0].value.blocker,code);
});
test('ADC GoogleAuth denial cannot fall back to a key or clone Hosting',async()=>{
  const h=harness({googleDenied:true});await h.run();assert.equal(h.process.exitCode,1);assert.equal(h.calls.googleAuth.length,1);
  assert.equal(h.calls.googleAuth[0].keyFile,undefined);assert.equal(h.calls.clone.length,0);assert.equal(h.calls.reports[0].value.status,'HOLD');
});
test('native authentication does not bypass immutable Preview byte verification',async()=>{
  const h=harness({previewDrift:true});await h.run();assert.equal(h.process.exitCode,1);assert.equal(h.calls.clone.length,0);
  assert.equal(h.calls.googleAuth.length,0);assert.equal(h.calls.reports[0].value.blocker,'I66_ROLE_ORIGIN_BYTES_NOT_EXACT');
});
