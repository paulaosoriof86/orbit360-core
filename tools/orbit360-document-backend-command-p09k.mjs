#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildRegistryFromCatalogP09k } from './orbit360-document-reference-registry-p09k.mjs';
import { createDocumentBackendCapabilityP09k } from './orbit360-document-backend-capability-p09k.mjs';

function clean(value){ return String(value == null ? '' : value).trim(); }
function args(argv){
  const out={_:[]};
  for(let i=0;i<argv.length;i+=1){ const token=argv[i]; if(token.startsWith('--')){ const key=token.slice(2); const next=argv[i+1]; if(next && !next.startsWith('--')){out[key]=next;i+=1;} else out[key]=true; } else out._.push(token); }
  return out;
}
function readJson(file){ return JSON.parse(fs.readFileSync(file,'utf8')); }
function safeOut(value){ process.stdout.write(JSON.stringify(value,null,2)+'\n'); }
function catalogRows(value){ return Array.isArray(value)?value:Array.isArray(value?.sources)?value.sources:value?.catalog||[]; }

export async function runCommandP09k(argv=process.argv.slice(2), overrides={}){
  const parsed=args(argv); const command=clean(parsed._[0]||'status');
  const catalogPath=path.resolve(parsed.catalog || overrides.catalogPath || process.env.ORBIT_DOCUMENT_CATALOG || 'orbit360-platform/data/tenant-alianzas-soluciones-source-catalog-p09k.json');
  const roots=[].concat(parsed['source-root']||overrides.sourceRoots||process.env.ORBIT_DOCUMENT_SOURCE_ROOT||[]).flatMap(v=>String(v||'').split(path.delimiter)).map(clean).filter(Boolean);
  if(!fs.existsSync(catalogPath)) return {ok:false,code:'SOURCE_CATALOG_NOT_FOUND',catalogPathExposed:false,writeAllowed:false};
  if(!roots.length) return {ok:false,code:'SOURCE_ROOT_REQUIRED',writeAllowed:false};
  const catalog=catalogRows(readJson(catalogPath));
  const privateRegistryPath=path.resolve(parsed['private-registry'] || overrides.privateRegistryPath || process.env.ORBIT_DOCUMENT_PRIVATE_REGISTRY || '_orbit360_private_sources/document-source-registry.local.json');
  const privateRecords=fs.existsSync(privateRegistryPath) ? catalogRows(readJson(privateRegistryPath)) : [];
  const built=buildRegistryFromCatalogP09k(catalog,{allowedRoots:roots,allowedTenants:['alianzas-soluciones'],privateRecords});
  const capability=createDocumentBackendCapabilityP09k({registry:built.registry,allowedRoots:roots,allowedTenants:['alianzas-soluciones'],toolsRoot:overrides.toolsRoot||parsed['tools-root']||'tools'});
  if(command==='status') return {ok:true,command,status:await capability.status(),discovery:built.discovery,containsLocalPaths:false,writeAllowed:false};
  const tenantId=clean(parsed.tenant||'alianzas-soluciones');
  const documentIds=clean(parsed.documents||parsed.document||'').split(',').map(clean).filter(Boolean);
  const actor={id:clean(parsed.actor||'lab-admin'),tenantId,activeRole:clean(parsed.role||'AdminTenant')};
  if(command==='references'){
    return capability.resolveBatchReferences({tenantId,batchId:clean(parsed.batch||'ays_aseguradoras_knowledge_batch_2026_v1'),documentIds,purpose:clean(parsed.purpose||'training'),actor});
  }
  if(command==='run'){
    if(documentIds.length!==1) return {ok:false,code:'ONE_DOCUMENT_REQUIRED',writeAllowed:false};
    const refs=await capability.resolveBatchReferences({tenantId,documentIds,purpose:clean(parsed.purpose||'training'),actor});
    if(!refs.ok || refs.missing.length) return {ok:false,code:refs.code||'SOURCE_REFERENCE_NOT_FOUND',missing:refs.missing,writeAllowed:false};
    const catalogEntry=catalog.find(row=>clean(row.documentId)===documentIds[0]);
    if(!catalogEntry) return {ok:false,code:'CATALOG_DOCUMENT_NOT_FOUND',writeAllowed:false};
    const result=await capability.execute(clean(parsed.task||catalogEntry.task),{
      tenantId,aseguradoraId:clean(catalogEntry.aseguradoraId),documentId:documentIds[0],fileRef:refs.sourceRefs[documentIds[0]],
      purpose:clean(parsed.purpose||'training'),actor,versionFuente:clean(catalogEntry.version),dimensions:catalogEntry.dimensions||{},directory:[]
    });
    return {ok:true,command,documentId:documentIds[0],result,containsLocalPaths:false,writeAllowed:false,enablesCotizador:false,enablesComparativo:false};
  }
  return {ok:false,code:'COMMAND_UNSUPPORTED',writeAllowed:false};
}

if(import.meta.url===`file://${process.argv[1]}`){
  runCommandP09k().then(safeOut).catch(error=>{safeOut({ok:false,code:clean(error?.code||error?.message)||'COMMAND_FAILED',writeAllowed:false});process.exitCode=1;});
}
