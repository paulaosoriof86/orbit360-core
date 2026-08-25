#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const OWNER='tools/orbit360-control-plane-publication-preflight-v20260825.mjs';
const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-publication-cli-contract-'));
const txn=path.join(tempDir,'invalid-transaction.json');
let out={ok:false,status:'PUBLICATION_OWNER_CLI_CONTRACT_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',stdoutSingleJson:false,stderrEmpty:false,mergedStreamSingleJson:false,failureCode:null,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
try{
  fs.writeFileSync(txn,JSON.stringify({ok:false,status:'INVALID_SELFTEST_TRANSACTION'},null,2)+'\n','utf8');
  const r=spawnSync(process.execPath,[path.join(ROOT,OWNER),'--publish-validated',txn],{cwd:ROOT,encoding:'utf8',env:{...process.env,GITHUB_ACTIONS:'false',GITHUB_REPOSITORY:'',GH_TOKEN:''}});
  let parsed=null,mergedParsed=null;
  try{parsed=JSON.parse(String(r.stdout||'').trim());}catch{}
  try{mergedParsed=JSON.parse(`${String(r.stdout||'')}${String(r.stderr||'')}`.trim());}catch{}
  const stderrEmpty=String(r.stderr||'').trim()==='';
  const expectedFailure=Number(r.status)===41&&parsed?.ok===false&&parsed?.status==='CONTROL_PLANE_PUBLICATION_TRANSACTION_FAIL'&&parsed?.mode==='PUBLISH_VALIDATED'&&parsed?.code==='PUBLICATION_TRANSACTION_PREPARE_INVALID'&&parsed?.stdoutSingleJson===true;
  out={...out,ok:expectedFailure&&stderrEmpty&&Boolean(mergedParsed),status:expectedFailure&&stderrEmpty&&Boolean(mergedParsed)?'PUBLICATION_OWNER_CLI_CONTRACT_PASS':'PUBLICATION_OWNER_CLI_CONTRACT_FAIL',classification:expectedFailure&&stderrEmpty&&Boolean(mergedParsed)?'PASS':'PIPELINE_MECHANISM_FAILURE',stdoutSingleJson:Boolean(parsed),stderrEmpty,mergedStreamSingleJson:Boolean(mergedParsed),failureCode:parsed?.code||null};
}finally{try{fs.rmSync(tempDir,{recursive:true,force:true});}catch{}}
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
