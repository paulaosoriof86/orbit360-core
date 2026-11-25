'use strict';
// Native execution may request the existing signed expected-head commit through
// its trusted operator. This module never writes GitHub or weakens its signature
// gate. Runtime/provider authority must already have been verified by the owner.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {requestJson}=require('./gravicentra-i6-6-cloud-build-package.cjs');
const C=Object.freeze({repository:'paulaosoriof86/orbit360-core',branch:'recovery/fase-a-clean-20260831',
  bucket:'ays-orbit360-firestore-private-backup-646761409743',provider:'CLOUD_BUILD',schema:'I66_NATIVE_SIGNED_CAS_REQUEST_V1'});
const DIR='artifacts/orbit360-recovery/release-control/';
const FIXED=new Set([DIR+'CONTROL_PLANE.json',DIR+'I6_6_RELEASE_TRANSPORT_CONTROL_20261110.json',
  DIR+'CAPABILITY_STATUS_LEDGER.json',DIR+'I6_6_FRONTEND_PREVERSIONED_CONTROL_VIEW.json',
  'orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json']);
const sha1=bytes=>crypto.createHash('sha1').update(bytes).digest('hex');
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const hash40=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const serial=value=>JSON.stringify(value,null,2)+'\n';
const gitBlob=bytes=>sha1(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]));
const fail=code=>{throw Error('I66_SIGNED_CAS_HOLD_'+code);};
const need=(value,code)=>{if(!value)fail(code);};
const same=(a,b,code)=>{try{assert.deepEqual(a,b);}catch{fail(code);}};
const api='https://api.github.com/repos/'+C.repository+'/';
const branchUrl=api+'git/ref/heads/'+C.branch;

function metadataPath(file){
  if(typeof file!=='string'||file.includes('\\')||file.split('/').some(x=>!x||x==='.'||x==='..'))return false;
  if(FIXED.has(file))return true;
  if(!file.startsWith(DIR))return false;
  const name=file.slice(DIR.length);
  return /^I6_6_FRONTEND_E\d{5}_(?:JOURNAL|RECEIPT|LIVE_PROOF|LIVE_UI|FOCAL_PROGRESS)\.json$/.test(name)||
    /^I6_6_[A-Z0-9_]*(?:PROGRESS|OBSERVER|SNAPSHOT)[A-Z0-9_]*\.json$/.test(name);
}
function jsonOnly(value,seen=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){need(Number.isFinite(value),'FINITE_JSON');return;}
  need(typeof value==='object'&&!seen.has(value),'PLAIN_JSON');
  need(Array.isArray(value)||[Object.prototype,null].includes(Object.getPrototypeOf(value)),'PLAIN_JSON');
  seen.add(value);
  if(Array.isArray(value)){
    need(Object.keys(value).length===value.length,'DENSE_JSON_ARRAY');
    for(const item of value)jsonOnly(item,seen);
  }else{
    need(Object.getOwnPropertySymbols(value).length===0,'PLAIN_JSON');
    for(const key of Object.keys(value)){
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      need(descriptor&&Object.hasOwn(descriptor,'value'),'JSON_ACCESSOR');jsonOnly(descriptor.value,seen);
    }
  }
  seen.delete(value);
}
function validateInput({head,headline,entries,allowedPaths,execution}){
  need(hash40(head),'EXPECTED_HEAD');
  need(typeof headline==='string'&&headline.length>0&&headline.length<=300&&!/[\x00-\x1f\x7f]/.test(headline),'HEADLINE');
  need(entries&&typeof entries==='object'&&!Array.isArray(entries),'ENTRIES');
  const paths=Object.keys(entries).sort();
  need(paths.length>0&&paths.length<=64,'ENTRY_COUNT');
  need(Array.isArray(allowedPaths)&&allowedPaths.length===new Set(allowedPaths).size,'EXACT_OWNER_PATHS_REQUIRED');
  same([...allowedPaths].sort(),paths,'EXACT_OWNER_PATHS_REQUIRED');
  need(paths.every(metadataPath),'METADATA_ONLY_SCOPE');
  need(execution&&typeof execution==='object'&&!Array.isArray(execution),'EXECUTION');
  same(Object.keys(execution).sort(),['authorityHead','buildId','phase','sourceSha'],'EXECUTION_FIELDS');
  need(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(execution.buildId),'BUILD_UUID');
  need(hash40(execution.sourceSha)&&hash40(execution.authorityHead),'EXECUTION_PINS');
  need(['preview','live'].includes(execution.phase),'PHASE');
  for(const file of paths){need(entries[file]&&typeof entries[file]==='object'&&!Array.isArray(entries[file]),'METADATA_OBJECT');jsonOnly(entries[file]);}
  return paths;
}
function safeGitPath(file){return typeof file==='string'&&file.length>0&&!/[\x00-\x1f\x7f\\]/.test(file)&&file.split('/').every(x=>x&&x!=='.'&&x!=='..');}
function treeMap(response,rootSha){
  need(response&&response.sha===rootSha&&response.truncated===false&&Array.isArray(response.tree),'COMPLETE_BASE_TREE');
  const records=new Map();
  for(const row of response.tree){
    need(safeGitPath(row.path)&&hash40(row.sha)&&!records.has(row.path),'BASE_TREE_ENTRY');
    need(({tree:['040000'],blob:['100644','100755','120000'],commit:['160000']})[row.type]?.includes(row.mode),'BASE_TREE_MODE');
    records.set(row.path,{path:row.path,mode:row.mode,type:row.type,sha:row.sha});
  }
  same(hashTree(records,true),rootSha,'BASE_TREE_HASH');
  return records;
}
function hashTree(records,verify=false){
  const children=new Map([['',[]]]);
  for(const row of records.values())if(row.type==='tree')children.set(row.path,[]);
  for(const row of records.values()){
    const slash=row.path.lastIndexOf('/'),parent=slash<0?'':row.path.slice(0,slash);
    need(children.has(parent),'TREE_PARENT');children.get(parent).push(row);
  }
  function visit(dir,depth){
    need(depth<=64,'TREE_DEPTH');
    const rows=children.get(dir).map(row=>({...row,name:row.path.slice(dir?dir.length+1:0)}));
    rows.sort((a,b)=>Buffer.compare(Buffer.from(a.name+(a.type==='tree'?'/':'')),Buffer.from(b.name+(b.type==='tree'?'/':''))));
    const chunks=[];
    for(const row of rows){
      const digest=row.type==='tree'?visit(row.path,depth+1):row.sha;
      if(verify&&row.type==='tree')same(digest,row.sha,'BASE_SUBTREE_HASH');
      chunks.push(Buffer.from((row.type==='tree'?'40000':row.mode)+' '+row.name+'\0'),Buffer.from(digest,'hex'));
    }
    const bytes=Buffer.concat(chunks);return sha1(Buffer.concat([Buffer.from('tree '+bytes.length+'\0'),bytes]));
  }
  return visit('',0);
}
function preparePacket(input,baseCommit,baseTree){
  const paths=validateInput(input);
  need(baseCommit?.sha===input.head&&hash40(baseCommit?.commit?.tree?.sha),'BASE_COMMIT');
  const records=treeMap(baseTree,baseCommit.commit.tree.sha),next=new Map(records),entries=[],changedPaths=[];
  for(const path of paths){
    const before=records.get(path),bytes=Buffer.from(serial(input.entries[path]));
    need(bytes.length<=8*1024*1024,'ENTRY_SIZE');
    need(!before||(before.type==='blob'&&before.mode==='100644'),'REGULAR_METADATA_FILE');
    const blobSha=gitBlob(bytes);
    entries.push({path,baseBlobSha:before?.sha||null,newBlobSha:blobSha,sha256:sha256(bytes),bytes:bytes.length,content:bytes.toString('utf8')});
    if(before?.sha!==blobSha)changedPaths.push(path);
    next.set(path,{path,mode:'100644',type:'blob',sha:blobSha});
  }
  need(changedPaths.length>0,'NO_CHANGES');
  const packet={schema:C.schema,provider:C.provider,repository:C.repository,branch:C.branch,
    expectedHead:input.head,expectedBaseTree:baseCommit.commit.tree.sha,expectedTree:hashTree(next),
    headline:input.headline,execution:{...input.execution},allowedPaths:paths,changedPaths,entries};
  const bytes=Buffer.from(serial(packet));need(bytes.length<=32*1024*1024,'PACKET_SIZE');
  const digest=sha256(bytes),name='i66/signed-cas/'+input.execution.buildId+'/'+digest+'.json';
  return{packet,bytes,sha256:digest,bucket:C.bucket,name,uri:'gs://'+C.bucket+'/'+name};
}
function verifyCommit(prepared,commit){
  const packet=prepared.packet;
  need(hash40(commit?.sha)&&commit.sha!==packet.expectedHead,'COMMIT_SHA');
  same(commit.parents?.map(p=>p.sha),[packet.expectedHead],'ONE_EXPECTED_PARENT');
  same(commit.commit?.message,packet.headline,'EXACT_HEADLINE');
  need(commit.commit?.verification?.verified===true,'GITHUB_SIGNATURE_UNVERIFIED');
  // Reconstructing the complete Git tree from the authenticated base tree and
  // exact requested blobs also detects extra paths, deletes and mode changes.
  same(commit.commit?.tree?.sha,packet.expectedTree,'EXACT_REQUESTED_TREE');
  return commit.sha;
}
function retainedReference(prepared,receipt){
  need(receipt&&receipt.bucket===prepared.bucket&&receipt.name===prepared.name,'RETENTION_PATH');
  need(typeof receipt.generation==='string'&&/^[1-9]\d*$/.test(receipt.generation),'RETENTION_GENERATION');
  same(receipt.sha256,prepared.sha256,'RETENTION_HASH');same(receipt.size,prepared.bytes.length,'RETENTION_SIZE');
  return{bucket:receipt.bucket,name:receipt.name,generation:receipt.generation,uri:prepared.uri,
    sha256:prepared.sha256,bytes:prepared.bytes.length};
}
async function requestSignedCas(input){
  const {io={},maxPolls=40,pollIntervalMs=15000}=input;validateInput(input);
  need(Number.isInteger(maxPolls)&&maxPolls>=1&&maxPolls<=40,'POLL_BOUND');
  need(Number.isInteger(pollIntervalMs)&&pollIntervalMs>=1000&&pollIntervalMs<=30000,'POLL_INTERVAL');
  need(typeof io.retainOnce==='function'&&typeof io.readObjectExact==='function'&&typeof io.emit==='function','RETENTION_IO_REQUIRED');
  const getJson=io.getJson||((url)=>requestJson(url,{headers:{Accept:'application/vnd.github+json','User-Agent':'Gravicentra-Signed-CAS-Readback',Connection:'close'}},
    {operation:'PROVIDER_JSON',fetch:io.fetch,emit:io.diagnostic,pause:io.pause}));
  const pause=io.pause||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
  const readHead=async()=>{const ref=await getJson(branchUrl);need(ref?.ref==='refs/heads/'+C.branch&&ref?.object?.type==='commit'&&hash40(ref.object.sha),'EXACT_BRANCH_REF');return ref.object.sha;};
  const base=await getJson(api+'commits/'+input.head);
  need(base?.sha===input.head&&hash40(base?.commit?.tree?.sha),'BASE_COMMIT');
  const tree=await getJson(api+'git/trees/'+base.commit.tree.sha+'?recursive=1');
  const prepared=preparePacket(input,base,tree);
  async function observe(candidate){
    const sha=verifyCommit(prepared,await getJson(api+'commits/'+candidate));
    same(sha,candidate,'OBSERVED_COMMIT_ID');same(await readHead(),sha,'BRANCH_MOVED_DURING_READBACK');return sha;
  }
  const initial=await readHead();
  if(initial!==input.head)return observe(initial);
  // This conditional write is issued once. A lost response is a HOLD, never a
  // blind repeat. The adapter must return only an exact immutable generation.
  let receipt;
  try{receipt=await io.retainOnce({bucket:prepared.bucket,name:prepared.name,ifGenerationMatch:0,
    bytes:prepared.bytes,contentType:'application/json'});}catch{fail('RETENTION_UNCONFIRMED_NO_RETRY');}
  const reference=retainedReference(prepared,receipt),readback=await io.readObjectExact(reference);
  same(readback?.generation,reference.generation,'RETENTION_READBACK_GENERATION');
  need(Buffer.isBuffer(readback?.bytes),'RETENTION_READBACK_BYTES');
  need(readback.bytes.equals(prepared.bytes),'RETENTION_READBACK_EXACT');
  io.emit({type:'I66_SIGNED_CAS_REQUEST_RETAINED',uri:reference.uri,generation:reference.generation,
    sha256:reference.sha256,bytes:reference.bytes,buildId:input.execution.buildId});
  for(let attempt=0;attempt<maxPolls;attempt++){
    const candidate=await readHead();if(candidate!==input.head)return observe(candidate);
    if(attempt+1<maxPolls)await pause(pollIntervalMs);
  }
  fail('SIGNED_COMMIT_NOT_OBSERVED');
}
module.exports={C,metadataPath,validateInput,hashTree,treeMap,preparePacket,verifyCommit,retainedReference,requestSignedCas};
