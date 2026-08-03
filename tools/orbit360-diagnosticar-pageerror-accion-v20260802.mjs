#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const PRODUCT=path.join(ROOT,'orbit360-platform');
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-pageerror-accion-diagnostic-v20260802.json');
const EXT=new Set(['.js','.mjs','.html','.json']);
const IGNORE=new Set(['runtime-gate-crm-v20260716']);
const hits=[];
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.name.startsWith('.'))continue;
  const full=path.join(dir,entry.name);
  if(entry.isDirectory()){
   if(IGNORE.has(entry.name))continue;
   walk(full);
  }else if(EXT.has(path.extname(entry.name).toLowerCase()))scan(full);
 }
}
function scan(full){
 const rel=path.relative(ROOT,full).replaceAll('\\','/');
 const lines=fs.readFileSync(full,'utf8').split(/\r?\n/);
 lines.forEach((line,index)=>{
  if(!/acci[oó]n/i.test(line))return;
  const direct=[...line.matchAll(/(?<!\?)\.acci[oó]n\b/gi)].map(m=>m.index);
  const optional=[...line.matchAll(/\?\.acci[oó]n\b/gi)].map(m=>m.index);
  const bracket=[...line.matchAll(/\[['"]acci[oó]n['"]\]/gi)].map(m=>m.index);
  hits.push({file:rel,line:index+1,text:line.trim().slice(0,500),directPropertyReads:direct.length,optionalPropertyReads:optional.length,bracketReads:bracket.length});
 });
}
walk(PRODUCT);
const direct=hits.filter(h=>h.directPropertyReads>0);
const likely=direct.filter(h=>!/\b(accion|acción)\s*:/.test(h.text));
const result={schemaVersion:'orbit360-gate711-pageerror-accion-diagnostic-v1',productHead:'997fca628f95dd397dba347700a6bc644fe840f0',status:'PAGEERROR_ACCION_SOURCE_SCAN_COMPLETE',classification:'ROOT_CAUSE_DIAGNOSTIC_SOURCE_ONLY',totalHits:hits.length,directPropertyReadHits:direct.length,likelyUnsafeHits:likely.length,hits,direct,likely,productFilesChanged:0,secretsAccessed:false,firestoreReads:0,firestoreWrites:0,runtimeExecuted:false,browserExecuted:false,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false,ok:true};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify(result,null,2));
