'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');

// Execute the real CLI body with isolated SDK/Firestore/metadata doubles. No
// credentials, network or operational records are read by this source test.
const filename=path.join(__dirname,'gravicentra-i6-5-b1-branding-snapshot.mjs');
const source=fs.readFileSync(filename,'utf8').replace(/^import .*;\n/gm,'');
const project='ays-orbit-360-lab';
const account='firebase-adminsdk-test@ays-orbit-360-lab.iam.gserviceaccount.com';
const baseEnv={PROJECT_ID:project,TENANT_HINT:'alianzas-soluciones',
  GRAVICENTRA_BUILD_PROVIDER:'CLOUD_BUILD',
  GRAVICENTRA_CLOUD_BUILD_ID:'00000000-0000-4000-8000-000000000035',
  GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:account};
const branding={displayName:'Gravicentra test',legalName:'Synthetic branding',
  logo:'assets/tenant/alianzas-soluciones/logo.png',favicon:'assets/tenant/alianzas-soluciones/favicon.png',
  updatedAt:{toDate:()=>new Date('2026-11-24T00:00:00Z')}};

function harness(options={}){
  const env={...baseEnv,...options.env};
  const calls={cert:0,adc:0,initialize:0,reads:0,deletes:0,metadata:[],fileReads:[],writes:[],logs:[],path:[]};
  const certificate={kind:'certificate'},adc={kind:'attached-runtime-adc'};
  const fixedDate=class extends Date{constructor(...args){super(...(args.length?args:['2026-11-25T12:00:00Z']));}};
  const db={collection(name){calls.path.push(name);return this;},doc(name){calls.path.push(name);return this;},
    async get(){calls.reads++;if(options.firestoreError)throw new Error(options.firestoreError);
      return {exists:options.exists!==false,data:()=>options.branding||branding};}};
  const sandbox={process:{env,argv:['node',filename,'/output/branding.json']},crypto,path,
    os:{homedir:()=>'/worker'},Date:fixedDate,AbortSignal,
    fs:{readFileSync(file){calls.fileReads.push(file);assert.equal(file,'/private/existing-sa.json');
        return JSON.stringify({type:'service_account',project_id:options.certProject||project,private_key:'SYNTHETIC_ONLY'});},
      existsSync(file){return (options.existingFiles||[]).includes(file);},
      writeFileSync(file,data){calls.writes.push({file,data});}},
    cert(value){calls.cert++;assert.equal(value.type,'service_account');return certificate;},
    applicationDefault(){calls.adc++;return adc;},
    initializeApp(config,name){calls.initialize++;assert.equal(config.projectId,env.PROJECT_ID);
      assert.equal(name,'b1-branding-snapshot');assert.ok(config.credential===certificate||config.credential===adc);return {};},
    getFirestore(){return db;},async deleteApp(){calls.deletes++;},
    console:{log(line){calls.logs.push(line);}},
    async fetch(url,request){
      calls.metadata.push(url);
      assert.equal(request.headers['Metadata-Flavor'],'Google');
      assert.equal(request.redirect,'error');
      const root='http://metadata.google.internal/computeMetadata/v1/';
      assert.ok([root+'project/project-id',root+'instance/service-accounts/default/email'].includes(url));
      if(options.metadataError)throw new Error(options.metadataError);
      return {ok:options.metadataOk!==false,
        headers:{get:key=>key==='metadata-flavor'?(options.metadataFlavor??'Google'):null},
        text:async()=>url.endsWith('project/project-id')?(options.runtimeProject||project):(options.runtimeAccount||account)};
    }};
  return {calls,run:()=>new vm.Script('(async()=>{\n'+source+'\n})()', {filename}).runInNewContext(sandbox)};
}

async function rejectBeforeRead(options,code){
  const h=harness(options);
  await assert.rejects(h.run(),error=>error.message===code);
  assert.equal(h.calls.initialize,0);assert.equal(h.calls.reads,0);
  assert.equal(h.calls.adc,0);assert.equal(h.calls.cert,0);
  assert.deepEqual(h.calls.writes,[]);assert.deepEqual(h.calls.logs,[]);
  return h;
}

test('historical service-account path still reads only canonical branding and uses cert',async()=>{
  const h=harness({env:{GRAVICENTRA_BUILD_PROVIDER:'',GOOGLE_APPLICATION_CREDENTIALS:'/private/existing-sa.json'}});
  await h.run();
  assert.deepEqual([h.calls.cert,h.calls.adc,h.calls.reads,h.calls.deletes],[1,0,1,1]);
  assert.deepEqual(h.calls.metadata,[]);
  assert.deepEqual(h.calls.path,['tenants','alianzas-soluciones','config','branding']);
});

test('attached Cloud Build ADC preserves complete snapshot bytes and branding hash',async()=>{
  const legacy=harness({env:{GRAVICENTRA_BUILD_PROVIDER:'',GOOGLE_APPLICATION_CREDENTIALS:'/private/existing-sa.json'}});
  const cloud=harness();
  await legacy.run();await cloud.run();
  assert.deepEqual(cloud.calls.writes,legacy.calls.writes);
  assert.deepEqual(cloud.calls.logs,legacy.calls.logs);
  assert.deepEqual([cloud.calls.cert,cloud.calls.adc,cloud.calls.reads,cloud.calls.deletes],[0,1,1,1]);
  assert.deepEqual(cloud.calls.fileReads,[]);
  assert.equal(cloud.calls.metadata.length,2);
  assert.deepEqual(cloud.calls.path,['tenants','alianzas-soluciones','config','branding']);
  assert.ok(cloud.calls.logs.every(line=>!line.includes(account)&&!line.includes('SYNTHETIC_ONLY')));
});

for(const [label,options,code] of [
  ['no implicit ADC outside explicit provider',{env:{GRAVICENTRA_BUILD_PROVIDER:''}},'B1_BRANDING_CREDENTIAL_REQUIRED'],
  ['unsupported provider',{env:{GRAVICENTRA_BUILD_PROVIDER:'LOCAL'}},'B1_BRANDING_PROVIDER_UNSUPPORTED'],
  ['other project',{env:{PROJECT_ID:'other-project'}},'B1_BRANDING_CLOUD_SCOPE_MISMATCH'],
  ['other tenant',{env:{TENANT_HINT:'other-tenant'}},'B1_BRANDING_CLOUD_SCOPE_MISMATCH'],
  ['missing build identity',{env:{GRAVICENTRA_CLOUD_BUILD_ID:''}},'B1_BRANDING_CLOUD_BUILD_ID_REQUIRED'],
  ['GitHub run id posing as build UUID',{env:{GRAVICENTRA_CLOUD_BUILD_ID:'45549464538'}},'B1_BRANDING_CLOUD_BUILD_ID_REQUIRED'],
  ['missing runtime SA',{env:{GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:''}},'B1_BRANDING_CLOUD_SERVICE_ACCOUNT_REQUIRED'],
  ['foreign-project SA',{env:{GRAVICENTRA_CLOUD_BUILD_SERVICE_ACCOUNT:'runner@other-project.iam.gserviceaccount.com'}},'B1_BRANDING_CLOUD_SERVICE_ACCOUNT_REQUIRED'],
  ['different runtime project',{runtimeProject:'other-project'},'B1_BRANDING_CLOUD_RUNTIME_IDENTITY_MISMATCH'],
  ['different attached SA',{runtimeAccount:'other@ays-orbit-360-lab.iam.gserviceaccount.com'},'B1_BRANDING_CLOUD_RUNTIME_IDENTITY_MISMATCH'],
  ['missing metadata origin header',{metadataFlavor:''},'B1_BRANDING_CLOUD_METADATA_UNTRUSTED'],
  ['metadata denied',{metadataOk:false},'B1_BRANDING_CLOUD_METADATA_UNTRUSTED'],
  ['metadata unavailable',{metadataError:'connection failed'},'B1_BRANDING_CLOUD_METADATA_UNAVAILABLE'],
  ['local user ADC',{existingFiles:['/worker/.config/gcloud/application_default_credentials.json']},'B1_BRANDING_CLOUD_LOCAL_ADC_FORBIDDEN'],
  ['configured ADC directory',{env:{CLOUDSDK_CONFIG:'/custom-gcloud'},existingFiles:['/custom-gcloud/application_default_credentials.json']},'B1_BRANDING_CLOUD_LOCAL_ADC_FORBIDDEN'],
  ['standard ADC with alternate config directory',{env:{CLOUDSDK_CONFIG:'/custom-gcloud'},existingFiles:['/worker/.config/gcloud/application_default_credentials.json']},'B1_BRANDING_CLOUD_LOCAL_ADC_FORBIDDEN'],
  ['historical key from other project',{env:{GRAVICENTRA_BUILD_PROVIDER:'',GOOGLE_APPLICATION_CREDENTIALS:'/private/existing-sa.json'},certProject:'other-project'},'B1_BRANDING_CREDENTIAL_PROJECT_MISMATCH']
]) test('fails closed before Firestore: '+label,()=>rejectBeforeRead(options,code));

for(const key of ['GOOGLE_APPLICATION_CREDENTIALS','CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE',
  'GCE_METADATA_HOST','GCE_METADATA_IP','GCE_METADATA_ROOT','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST']){
  test('fails closed before Firestore: '+key,async()=>{
    const h=await rejectBeforeRead({env:{[key]:'untrusted-override'}},'B1_BRANDING_CLOUD_CREDENTIAL_OVERRIDE');
    assert.deepEqual(h.calls.fileReads,[]);assert.deepEqual(h.calls.metadata,[]);
  });
}

test('real Firestore denial is propagated, app cleaned, and no snapshot/PASS emitted',async()=>{
  const h=harness({firestoreError:'PERMISSION_DENIED'});
  await assert.rejects(h.run(),error=>error.message==='PERMISSION_DENIED');
  assert.equal(h.calls.reads,1);assert.equal(h.calls.deletes,1);
  assert.deepEqual(h.calls.writes,[]);assert.deepEqual(h.calls.logs,[]);
});

test('ADC does not turn missing or incomplete canonical branding into a snapshot',async()=>{
  for(const options of [{exists:false},{branding:{displayName:'incomplete'}}]){
    const h=harness(options);
    await assert.rejects(h.run(),error=>/^B1_BRANDING_CONFIG_(MISSING|INCOMPLETE)$/.test(error.message));
    assert.equal(h.calls.deletes,1);assert.deepEqual(h.calls.writes,[]);assert.deepEqual(h.calls.logs,[]);
  }
});
