import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const VERSION = 'p09k-v1';
const ALLOWED_TASKS = ['excel_manifest','pdf_manifest','pdf_ocr','pdf_semantic','excel_semantic'];
const ALLOWED_PURPOSES = ['training','operational'];
const ALLOWED_STATUS = ['ready','mounted','available'];
const MAX_FILES = 10000;
const MAX_DEPTH = 6;

function clean(value){ return String(value == null ? '' : value).trim(); }
function unique(values){ return Array.from(new Set((values || []).filter(Boolean))); }
function normName(value){ return clean(value).normalize('NFC').toLowerCase().replace(/\s+/g,' '); }
function sha256File(filePath){
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath,'r');
  const buf = Buffer.allocUnsafe(1024*1024);
  try { let n=0; do { n=fs.readSync(fd,buf,0,buf.length,null); if(n) hash.update(buf.subarray(0,n)); } while(n); }
  finally { fs.closeSync(fd); }
  return hash.digest('hex');
}
function within(root,candidate){
  const rel = path.relative(root,candidate);
  return rel === '' || (!rel.startsWith('..'+path.sep) && rel !== '..' && !path.isAbsolute(rel));
}
function realRoots(values){
  return unique([].concat(values || []).map(clean).filter(Boolean)).map(value => fs.realpathSync(value));
}
function opaqueRef(entry){
  const version = encodeURIComponent(clean(entry.version || 'v1'));
  return `backend-ref://${encodeURIComponent(clean(entry.tenantId))}/${encodeURIComponent(clean(entry.documentId))}/${version}`;
}
function scanRoot(root, options={}){
  const maxDepth = Math.max(0, Math.min(Number(options.maxDepth ?? MAX_DEPTH), 12));
  const files=[]; const queue=[{dir:root,depth:0}];
  while(queue.length){
    const {dir,depth}=queue.shift();
    for(const item of fs.readdirSync(dir,{withFileTypes:true})){
      const joined=path.join(dir,item.name);
      if(item.isSymbolicLink()) continue;
      if(item.isDirectory()){
        if(depth < maxDepth) queue.push({dir:joined,depth:depth+1});
      } else if(item.isFile()){
        files.push(fs.realpathSync(joined));
        if(files.length > MAX_FILES) throw Object.assign(new Error('SOURCE_SCAN_FILE_LIMIT_EXCEEDED'),{code:'SOURCE_SCAN_FILE_LIMIT_EXCEEDED'});
      }
    }
  }
  return files;
}
function validateCatalogEntry(entry){
  const errors=[];
  if(!clean(entry?.tenantId)) errors.push('TENANT_REQUIRED');
  if(!clean(entry?.documentId)) errors.push('DOCUMENT_REQUIRED');
  if(!clean(entry?.aseguradoraId)) errors.push('INSURER_REQUIRED');
  const task=clean(entry?.task);
  if(!ALLOWED_TASKS.includes(task)) errors.push('TASK_UNSUPPORTED');
  const purposes=unique([].concat(entry?.purposes || entry?.purpose || 'training').map(clean));
  if(purposes.some(p=>!ALLOWED_PURPOSES.includes(p))) errors.push('PURPOSE_INVALID');
  const names=unique([clean(entry?.fileName), ...[].concat(entry?.fileNames || entry?.aliases || []).map(clean)]).filter(Boolean);
  if(!names.length) errors.push('SOURCE_FILE_NAME_REQUIRED');
  return {valid:errors.length===0,errors,names,purposes,task};
}
function discoverCatalog(catalog, options={}){
  const roots=realRoots(options.allowedRoots || []);
  if(!roots.length) throw Object.assign(new Error('ALLOWED_ROOT_REQUIRED'),{code:'ALLOWED_ROOT_REQUIRED'});
  const files=[];
  roots.forEach(root=>scanRoot(root,options).forEach(file=>files.push({root,file,base:normName(path.basename(file))})));
  const records=[]; const issues=[];
  for(const raw of [].concat(catalog || [])){
    const check=validateCatalogEntry(raw);
    if(!check.valid){ issues.push({documentId:clean(raw?.documentId),code:check.errors[0],errors:check.errors}); continue; }
    const wanted=new Set(check.names.map(normName));
    const matches=files.filter(item=>wanted.has(item.base));
    if(matches.length===0){ issues.push({documentId:clean(raw.documentId),code:'SOURCE_FILE_NOT_FOUND',errors:['SOURCE_FILE_NOT_FOUND']}); continue; }
    if(matches.length>1){ issues.push({documentId:clean(raw.documentId),code:'SOURCE_FILE_AMBIGUOUS',errors:['SOURCE_FILE_AMBIGUOUS'],matchCount:matches.length}); continue; }
    const hit=matches[0];
    if(!roots.some(root=>within(root,hit.file))){ issues.push({documentId:clean(raw.documentId),code:'SOURCE_OUTSIDE_ALLOWED_ROOT',errors:['SOURCE_OUTSIDE_ALLOWED_ROOT']}); continue; }
    const stat=fs.statSync(hit.file);
    records.push({
      id:`ref_${crypto.createHash('sha256').update(`${raw.tenantId}|${raw.documentId}|${raw.version||'v1'}`).digest('hex').slice(0,20)}`,
      tenantId:clean(raw.tenantId), aseguradoraId:clean(raw.aseguradoraId), documentId:clean(raw.documentId),
      fileRef:clean(raw.fileRef) || opaqueRef(raw), localPath:hit.file, sourceHash:sha256File(hit.file), sizeBytes:stat.size,
      status:'ready', tasks:unique([check.task,...[].concat(raw.tasks||[]).map(clean)]), purposes:check.purposes,
      version:clean(raw.version||'v1'), singleUse:raw.singleUse===true, allowSensitiveValues:raw.allowSensitiveValues===true,
      discoveredAt:new Date().toISOString(), containsRawPayload:false, containsSecrets:false
    });
  }
  return {records,issues,rootCount:roots.length,fileCount:files.length};
}
function normalizePrivateRecords(records,options={}){
  const roots=realRoots(options.allowedRoots || []), out=[], issues=[];
  for(const raw of [].concat(records || [])){
    const tenantId=clean(raw?.tenantId), documentId=clean(raw?.documentId), aseguradoraId=clean(raw?.aseguradoraId);
    const task=clean(raw?.task || [].concat(raw?.tasks||[])[0]);
    const errors=[];
    if(!tenantId) errors.push('TENANT_REQUIRED');
    if(!documentId) errors.push('DOCUMENT_REQUIRED');
    if(!aseguradoraId) errors.push('INSURER_REQUIRED');
    if(!ALLOWED_TASKS.includes(task)) errors.push('TASK_UNSUPPORTED');
    const requested=clean(raw?.localPath || raw?.path);
    if(!requested) errors.push('REFERENCE_LOCAL_PATH_REQUIRED');
    let resolved='',stat=null;
    if(!errors.length){
      try{
        resolved=fs.realpathSync(requested); stat=fs.statSync(resolved);
        if(!stat.isFile()) errors.push('SOURCE_FILE_REQUIRED');
        if(!roots.some(root=>within(root,resolved))) errors.push('SOURCE_OUTSIDE_ALLOWED_ROOT');
      }catch(error){ errors.push(clean(error?.code || 'SOURCE_FILE_NOT_FOUND')); }
    }
    if(errors.length){ issues.push({documentId,code:errors[0],errors}); continue; }
    const purposes=unique([].concat(raw?.purposes || raw?.purpose || 'training').map(clean));
    out.push({
      id:clean(raw?.id) || `ref_${crypto.createHash('sha256').update(`${tenantId}|${documentId}|${raw?.version||'v1'}`).digest('hex').slice(0,20)}`,
      tenantId,documentId,aseguradoraId,fileRef:clean(raw?.fileRef) || opaqueRef({...raw,tenantId,documentId}),
      localPath:resolved,sourceHash:clean(raw?.sourceHash) || sha256File(resolved),sizeBytes:stat.size,status:clean(raw?.status||'ready'),
      tasks:unique([task,...[].concat(raw?.tasks||[]).map(clean)]),purposes,version:clean(raw?.version||'v1'),
      singleUse:raw?.singleUse===true,allowSensitiveValues:raw?.allowSensitiveValues===true,expiresAt:clean(raw?.expiresAt),usedAt:clean(raw?.usedAt),
      discoveredAt:new Date().toISOString(),containsRawPayload:false,containsSecrets:false
    });
  }
  return {records:out,issues};
}
function safeRecord(record){
  return {
    id:clean(record?.id), tenantId:clean(record?.tenantId), aseguradoraId:clean(record?.aseguradoraId), documentId:clean(record?.documentId),
    fileRef:clean(record?.fileRef), sourceHash:clean(record?.sourceHash), sizeBytes:Number(record?.sizeBytes||0), status:clean(record?.status),
    tasks:unique([].concat(record?.tasks||[]).map(clean)), purposes:unique([].concat(record?.purposes||[]).map(clean)),
    version:clean(record?.version), usedAt:clean(record?.usedAt), expiresAt:clean(record?.expiresAt),
    containsLocalPath:false, containsRawPayload:false, containsSecrets:false
  };
}
export function createDocumentReferenceRegistryP09k(options={}){
  const clock=options.clock || (()=>new Date());
  const allowedTenants=unique([].concat(options.allowedTenants||[]).map(clean));
  const map=new Map();
  [].concat(options.records||[]).forEach(record=>{
    const key=`${clean(record.tenantId)}|${clean(record.documentId)}|${clean(record.fileRef)}`;
    map.set(key,{...record});
  });
  function status(){
    const safe=[...map.values()].map(safeRecord);
    return {connected:safe.length>0,code:safe.length?'REFERENCE_REGISTRY_READY':'REFERENCE_REGISTRY_EMPTY',version:VERSION,total:safe.length,tenants:unique(safe.map(r=>r.tenantId)),documents:unique(safe.map(r=>r.documentId)),containsLocalPaths:false,containsSecrets:false,writeAllowed:false};
  }
  async function lookupReference(query){
    const key=`${clean(query?.tenantId)}|${clean(query?.documentId)}|${clean(query?.fileRef)}`;
    const record=map.get(key);
    return record ? {...record} : null;
  }
  async function markReferenceUsed(input){
    for(const [key,record] of map.entries()) if(clean(record.id)===clean(input?.id) && clean(record.tenantId)===clean(input?.tenantId)) map.set(key,{...record,usedAt:clean(input?.usedAt)||clock().toISOString()});
  }
  function batchReferences(request={}){
    const tenantId=clean(request.tenantId); const purpose=clean(request.purpose||'training'); const ids=unique([].concat(request.documentIds||[]).map(clean));
    const errors=[];
    if(!tenantId) errors.push('TENANT_REQUIRED');
    if(allowedTenants.length && !allowedTenants.includes(tenantId)) errors.push('TENANT_NOT_ALLOWED');
    if(!ALLOWED_PURPOSES.includes(purpose)) errors.push('PURPOSE_INVALID');
    const refs={}; const items=[]; const now=clock().getTime();
    for(const documentId of ids){
      const candidates=[...map.values()].filter(r=>clean(r.tenantId)===tenantId && clean(r.documentId)===documentId);
      const record=candidates.find(r=>ALLOWED_STATUS.includes(clean(r.status)) && (!r.expiresAt || Date.parse(r.expiresAt)>now) && (!r.purposes?.length || r.purposes.includes(purpose)) && !(r.singleUse===true && r.usedAt));
      if(record) refs[documentId]=clean(record.fileRef);
      items.push({documentId,provided:!!record,code:record?'SOURCE_REFERENCE_AVAILABLE':(candidates.length?'SOURCE_REFERENCE_NOT_READY':'SOURCE_REFERENCE_NOT_FOUND'),referenceValueExposed:false});
    }
    return {ok:errors.length===0,code:errors.length?errors[0]:'BATCH_REFERENCES_RESOLVED',errors,total:ids.length,provided:items.filter(i=>i.provided).length,missing:items.filter(i=>!i.provided).map(i=>i.documentId),items,sourceRefs:errors.length?{}:refs,referencesExposed:false,containsLocalPaths:false,containsSecrets:false,writeAllowed:false};
  }
  return {VERSION,status,lookupReference,markReferenceUsed,batchReferences,listSafe:()=>[...map.values()].map(safeRecord)};
}
export function buildRegistryFromCatalogP09k(catalog,options={}){
  const discovered=discoverCatalog(catalog,options);
  const privateResult=normalizePrivateRecords(options.privateRecords||[],options);
  const combined=[...discovered.records,...privateResult.records];
  const seen=new Map();
  combined.forEach(record=>seen.set(`${clean(record.tenantId)}|${clean(record.documentId)}|${clean(record.fileRef)}`,record));
  const records=[...seen.values()];
  const registry=createDocumentReferenceRegistryP09k({...options,records});
  return {registry,discovery:{...discovered,records:records.map(safeRecord),issues:[...discovered.issues,...privateResult.issues],privateRecordCount:privateResult.records.length}};
}
export const documentReferenceRegistryP09k={VERSION,ALLOWED_TASKS:[...ALLOWED_TASKS],ALLOWED_PURPOSES:[...ALLOWED_PURPOSES],discoverCatalog,normalizePrivateRecords,createDocumentReferenceRegistryP09k,buildRegistryFromCatalogP09k};
