#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const text=v=>String(v==null?'':v).trim();

export function resolveCurrentStepEnvValue(name,{env=process.env,fsImpl=fs}={}){
  const direct=text(env?.[name]);
  if(direct)return{value:direct,source:'process.env'};
  const githubEnv=text(env?.GITHUB_ENV);
  if(!githubEnv||!fsImpl.existsSync(githubEnv))return{value:'',source:'missing'};
  const prefix=`${name}=`;
  const lines=String(fsImpl.readFileSync(githubEnv,'utf8')).replace(/^\uFEFF/,'').split(/\r?\n/);
  for(let i=lines.length-1;i>=0;i--){
    const line=lines[i];
    if(line.startsWith(prefix))return{value:text(line.slice(prefix.length)),source:'github_env_file'};
  }
  return{value:'',source:'missing'};
}

export function bindCurrentStepEnvValue(name,options={}){
  const env=options.env||process.env;
  const resolved=resolveCurrentStepEnvValue(name,options);
  if(resolved.value&&!text(env[name]))env[name]=resolved.value;
  return resolved;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-current-step-env-'));
  const envFile=path.join(dir,'github_env');
  const fakeCredential=path.join(dir,'service-account.json');
  fs.writeFileSync(fakeCredential,'{}\n','utf8');
  fs.writeFileSync(envFile,`UNRELATED=x\nGOOGLE_APPLICATION_CREDENTIALS=${fakeCredential}\n`,'utf8');
  const env={GITHUB_ENV:envFile};
  const bridged=bindCurrentStepEnvValue('GOOGLE_APPLICATION_CREDENTIALS',{env});
  const directEnv={GITHUB_ENV:envFile,GOOGLE_APPLICATION_CREDENTIALS:'/direct/path.json'};
  const direct=resolveCurrentStepEnvValue('GOOGLE_APPLICATION_CREDENTIALS',{env:directEnv});
  const missing=resolveCurrentStepEnvValue('NOT_PRESENT',{env});
  const out={
    schemaVersion:'orbit360-current-step-env-resolver-selftest-v1',
    ok:bridged.source==='github_env_file'&&bridged.value===fakeCredential&&env.GOOGLE_APPLICATION_CREDENTIALS===fakeCredential&&direct.source==='process.env'&&direct.value==='/direct/path.json'&&missing.source==='missing'&&missing.value==='',
    status:'',classification:'',
    currentStepGithubEnvBridgePass:bridged.source==='github_env_file'&&bridged.value===fakeCredential,
    currentProcessBindingPass:env.GOOGLE_APPLICATION_CREDENTIALS===fakeCredential,
    directProcessEnvPrecedencePass:direct.source==='process.env'&&direct.value==='/direct/path.json',
    missingFailsClosedPass:missing.source==='missing'&&missing.value==='',
    runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false
  };
  out.status=out.ok?'CURRENT_STEP_ENV_RESOLVER_SELFTEST_PASS':'CURRENT_STEP_ENV_RESOLVER_SELFTEST_FAIL';
  out.classification=out.ok?'PASS':'PIPELINE_MECHANISM_FAILURE';
  console.log(JSON.stringify(out,null,2));
  fs.rmSync(dir,{recursive:true,force:true});
  if(!out.ok)process.exit(41);
}
