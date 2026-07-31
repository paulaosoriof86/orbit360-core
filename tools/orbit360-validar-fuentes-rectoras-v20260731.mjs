#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function fail(code,msg,extra={}){
  const out={schemaVersion:'orbit360-source-manifest-validation-v1',ok:false,status:code,error:msg,operationalWrites:0,firestoreWrites:0,productionTouched:false,...extra};
  console.error(JSON.stringify(out,null,2));
  process.exit(41);
}
function sha256(file){
  const h=crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
}
function loadJson(file){
  if(!fs.existsSync(file)) fail('PIPELINE_MECHANISM_FAILURE','MANIFEST_FILE_MISSING',{file:path.basename(file)});
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){fail('DATA_CONTRACT_FAILURE','MANIFEST_JSON_INVALID',{file:path.basename(file)});}
}
function arg(name,def=''){
  const i=process.argv.indexOf(name);return i>=0?String(process.argv[i+1]||''):def;
}
const indexPath=arg('--index','orbit360-platform/docs/FUENTES-RECTORAS-AYS-INDEX-20260731.json');
const mode=arg('--mode','READ_ONLY').toUpperCase();
const filesArg=arg('--files',process.env.ORBIT360_SOURCE_FILES||'');
const index=loadJson(indexPath);
if(index.schemaVersion!=='orbit360-source-registry-index-v1') fail('DATA_CONTRACT_FAILURE','INDEX_SCHEMA_INVALID');
if(mode==='WRITE_PRECHECK' && index.status!=='CLOSED_READY') fail('DATA_CONTRACT_FAILURE','SOURCE_MANIFEST_NOT_CLOSED',{manifestStatus:index.status});
const base=path.dirname(indexPath);
const allowed=new Map();
for(const rel of index.manifests||[]){
  const m=loadJson(path.resolve(base,rel));
  for(const s of m.sources||[]){if(s&&s.sha256) allowed.set(String(s.sha256).toLowerCase(),{logicalName:s.logicalName||'',domain:s.domain||'',manifest:rel});}
}
if(!allowed.size) fail('DATA_CONTRACT_FAILURE','NO_ALLOWED_SOURCES');
const files=filesArg.split(';').map(x=>x.trim()).filter(Boolean);
const checked=[];
for(const f of files){
  if(!fs.existsSync(f)) fail('PIPELINE_MECHANISM_FAILURE','SOURCE_FILE_MISSING',{file:path.basename(f)});
  const sha=sha256(f),meta=allowed.get(sha.toLowerCase());
  if(!meta) fail('DATA_CONTRACT_FAILURE','UNMANIFESTED_SOURCE_REJECTED',{file:path.basename(f),sha256:sha});
  checked.push({file:path.basename(f),sha256:sha,logicalName:meta.logicalName,domain:meta.domain,manifest:meta.manifest});
}
const out={schemaVersion:'orbit360-source-manifest-validation-v1',ok:true,status:mode==='WRITE_PRECHECK'?'SOURCE_WRITE_PRECHECK_PASS':'SOURCE_READONLY_VALIDATION_PASS',registryStatus:index.status,allowedUniqueSources:allowed.size,checkedSources:checked.length,checked,operationalWrites:0,firestoreWrites:0,productionTouched:false,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));
