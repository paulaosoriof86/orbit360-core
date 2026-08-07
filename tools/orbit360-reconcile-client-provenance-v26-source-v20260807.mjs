#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 'orbit360-v26-client-provenance-source-reconciliation-v1';
const ROOT = process.cwd();
const V25 = process.env.ORBIT360_V25_DIFFERENTIAL || 'orbit360-platform/runtime-gate-crm-v20260716/v25-block1-universe-differential-sanitized-v20260807.json';
const EVIDENCE = process.env.ORBIT360_V26_CLIENT_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/v26-client-provenance-source-sanitized-v20260807.json';
const TARGET_COUNT = 16;
const MAX_BLOB = 2 * 1024 * 1024;
const MAX_HISTORY_BYTES = 64 * 1024 * 1024;
const SAFE_PREFIXES = ['orbit360-platform/docs/','orbit360-platform/runtime-gate-crm-v20260716/','orbit360-platform/data/seed.js','tools/','.github/'];
const FORBIDDEN_INFERENCE = /(poliz|cobro|finmov|financiero|finanzas|movimientos?\s*(ing|eg)|comision|estado.?cuenta)/i;
const RELEVANT_PATH = /(client|cliente|migr|import|manifest|dry|recon|baseline|seed|audit|bitac|gate|runtime|incident|freeze|request)/i;
const TEXT_EXT = /\.(?:js|mjs|cjs|json|md|txt|csv|html|yml|yaml)$/i;

const fp = id => crypto.createHash('sha256').update(`clientes:${id}`, 'utf8').digest('hex').slice(0,20);
const hash = value => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex').slice(0,20);
function readJson(rel) { return JSON.parse(fs.readFileSync(path.resolve(ROOT, rel), 'utf8').replace(/^\uFEFF/,'')); }
export function extractCandidateTokens(content) {
  const out = new Set();
  const tokenRe = /[A-Za-z0-9][A-Za-z0-9_.:@-]{2,127}/g;
  let m;
  while ((m = tokenRe.exec(content)) !== null) out.add(m[0]);
  const quoted = /(['"`])([^'"`\r\n]{1,128})\1/g;
  while ((m = quoted.exec(content)) !== null) {
    const value = m[2].trim();
    if (value && !/\s/.test(value)) out.add(value);
  }
  return out;
}
function sourceClass(rel, historical=false) {
  if (rel === 'orbit360-platform/data/seed.js') return historical ? 'HISTORICAL_DEMO_SEED_REFERENCE' : 'CURRENT_DEMO_SEED_REFERENCE';
  if (rel.startsWith('orbit360-platform/runtime-gate-crm-v20260716/')) return historical ? 'HISTORICAL_SANITIZED_ARTIFACT_REFERENCE' : 'CURRENT_SANITIZED_ARTIFACT_REFERENCE';
  if (rel.startsWith('orbit360-platform/docs/')) return historical ? 'HISTORICAL_DOC_MANIFEST_REFERENCE' : 'CURRENT_DOC_MANIFEST_REFERENCE';
  if (rel.startsWith('tools/')) return historical ? 'HISTORICAL_TOOL_IMPORT_REFERENCE' : 'CURRENT_TOOL_IMPORT_REFERENCE';
  if (rel.startsWith('.github/')) return historical ? 'HISTORICAL_CONTROL_PLANE_REFERENCE' : 'CURRENT_CONTROL_PLANE_REFERENCE';
  return historical ? 'HISTORICAL_SOURCE_REFERENCE' : 'CURRENT_SOURCE_REFERENCE';
}
function allowedPath(rel) {
  if (!SAFE_PREFIXES.some(p => rel === p || rel.startsWith(p))) return false;
  if (FORBIDDEN_INFERENCE.test(rel)) return false;
  if (!TEXT_EXT.test(rel)) return false;
  if (!RELEVANT_PATH.test(rel) && rel !== 'orbit360-platform/data/seed.js') return false;
  return true;
}
function walk(dir, files=[]) {
  if (!fs.existsSync(dir)) return files;
  const st=fs.statSync(dir);
  if (st.isFile()) { files.push(dir); return files; }
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    if (ent.name === '.git' || ent.name === 'node_modules') continue;
    const p=path.join(dir,ent.name); ent.isDirectory()?walk(p,files):files.push(p);
  }
  return files;
}
function recordMatches(content, rel, targets, matches, historical=false) {
  for (const candidate of extractCandidateTokens(content)) {
    const fingerprint = fp(candidate);
    if (!targets.has(fingerprint)) continue;
    const entry={sourceClass:sourceClass(rel,historical),historical,pathHash:hash(rel)};
    const key=JSON.stringify(entry);
    if (!matches.has(fingerprint)) matches.set(fingerprint,new Map());
    matches.get(fingerprint).set(key,entry);
  }
}
function scanCurrent(targets, matches) {
  const roots=['orbit360-platform/docs','orbit360-platform/runtime-gate-crm-v20260716','orbit360-platform/data/seed.js','tools','.github'];
  let filesScanned=0;
  for (const root of roots) for (const absolute of walk(path.resolve(ROOT,root),[])) {
    const rel=path.relative(ROOT,absolute).split(path.sep).join('/');
    if (!allowedPath(rel)) continue;
    const stat=fs.statSync(absolute); if (stat.size>MAX_BLOB) continue;
    let content; try { content=fs.readFileSync(absolute,'utf8'); } catch { continue; }
    recordMatches(content,rel,targets,matches,false); filesScanned++;
  }
  return filesScanned;
}
function git(args,input=null,encoding='utf8') {
  const run=spawnSync('git',args,{cwd:ROOT,input,encoding,maxBuffer:128*1024*1024});
  if (run.status!==0) throw new Error(`SOURCE_HISTORY_GIT_FAILURE:${args[0]}`);
  return run.stdout;
}
function scanHistory(targets,matches) {
  const raw=git(['rev-list','--objects','--all']);
  const objectPath=new Map();
  for (const line of raw.split(/\r?\n/)) {
    const sp=line.indexOf(' '); if (sp<0) continue;
    const sha=line.slice(0,sp), rel=line.slice(sp+1);
    if (allowedPath(rel) && !objectPath.has(sha)) objectPath.set(sha,rel);
  }
  const shas=[...objectPath.keys()];
  if (!shas.length) return {objectsConsidered:0,blobsScanned:0,bytesScanned:0};
  const checks=git(['cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],shas.join('\n')+'\n');
  const selected=[]; let total=0;
  for (const line of checks.split(/\r?\n/)) {
    const [sha,type,sizeRaw]=line.trim().split(/\s+/); const size=Number(sizeRaw);
    if (type!=='blob'||!Number.isFinite(size)||size>MAX_BLOB||total+size>MAX_HISTORY_BYTES) continue;
    selected.push({sha,rel:objectPath.get(sha),size}); total+=size;
  }
  if (!selected.length) return {objectsConsidered:shas.length,blobsScanned:0,bytesScanned:0};
  const batch=git(['cat-file','--batch'],selected.map(x=>x.sha).join('\n')+'\n','buffer');
  let offset=0,scanned=0,bytes=0;
  const bySha=new Map(selected.map(x=>[x.sha,x]));
  while (offset<batch.length) {
    const nl=batch.indexOf(10,offset); if (nl<0) break;
    const header=batch.slice(offset,nl).toString('utf8'); offset=nl+1;
    const parts=header.split(' '); if (parts.length<3) break;
    const sha=parts[0],type=parts[1],size=Number(parts[2]);
    if (type!=='blob'||!Number.isFinite(size)) break;
    const content=batch.slice(offset,offset+size).toString('utf8'); offset+=size;
    if (batch[offset]===10) offset++;
    const meta=bySha.get(sha); if (!meta) continue;
    recordMatches(content,meta.rel,targets,matches,true); scanned++; bytes+=size;
  }
  return {objectsConsidered:shas.length,blobsScanned:scanned,bytesScanned:bytes};
}
export function deterministicPatternProbe(targets) {
  const found=new Set();
  const prefixes=['cli','cliente','client','c','cl','cli_','cli-','cliente_','cliente-','client_','client-','CL','CLI','CLIENTE'];
  for (let n=0;n<=5000;n++) {
    const nums=new Set([String(n),String(n).padStart(2,'0'),String(n).padStart(3,'0'),String(n).padStart(4,'0'),String(n).padStart(5,'0'),String(n).padStart(6,'0')]);
    for (const prefix of prefixes) for (const num of nums) { const h=fp(prefix+num); if (targets.has(h)) found.add(h); }
  }
  return found;
}
export function reconcileSourceOnly() {
  const v25=readJson(V25);
  const diff=Array.isArray(v25?.differential?.clientes)?v25.differential.clientes:[];
  const fingerprints=diff.map(x=>String(x.fingerprint||'')).filter(Boolean);
  const targets=new Set(fingerprints);
  if (targets.size!==TARGET_COUNT) throw new Error(`V26_EXPECTED_16_CLIENT_FINGERPRINTS_GOT_${targets.size}`);
  const matches=new Map();
  const currentFilesScanned=scanCurrent(targets,matches);
  const history=scanHistory(targets,matches);
  const patternMatches=deterministicPatternProbe(targets);
  const items=fingerprints.map(fingerprint=>{
    const evidence=[...(matches.get(fingerprint)?.values()||[])];
    const seed=evidence.some(x=>x.sourceClass.includes('DEMO_SEED'));
    const direct=evidence.length>0;
    return {fingerprint,sourceSafeDirectReferenceFound:direct,currentOrHistoricalDemoSeedMatch:seed,deterministicSimpleIdPatternMatch:patternMatches.has(fingerprint),referenceClasses:[...new Set(evidence.map(x=>x.sourceClass))].sort(),referencePathHashes:[...new Set(evidence.map(x=>x.pathHash))].sort(),classification:seed?'SEED_PROTOTYPE_RESIDUAL_SOURCE_PROVEN':direct?'SOURCE_REFERENCE_FOUND_REQUIRES_CONTEXT':'UNKNOWN_SOURCE_PROVENANCE',recommendedTreatment:seed?'EXCLUDE_FROM_REAL_CLIENT_UNIVERSE_ONLY_AFTER_SEPARATE_AUTHORIZATION':'FOCAL_LOCATOR_PROVENANCE_REQUIRED_NO_WRITE'};
  });
  const resolvedSeed=items.filter(x=>x.classification==='SEED_PROTOTYPE_RESIDUAL_SOURCE_PROVEN').length;
  const directReferences=items.filter(x=>x.sourceSafeDirectReferenceFound).length;
  const unresolved=items.filter(x=>x.classification==='UNKNOWN_SOURCE_PROVENANCE').length;
  const finalClassification=unresolved===0 && resolvedSeed===TARGET_COUNT ? 'DATA_CONTRACT_FAILURE_SOURCE_PROVEN' : 'REQUIERE_VALIDACION';
  return {schemaVersion:SCHEMA,sourceOnly:true,inputV25FingerprintCount:TARGET_COUNT,sourceEvidence:{currentFilesScanned,historyObjectsConsidered:history.objectsConsidered,historyBlobsScanned:history.blobsScanned,historyBytesScanned:history.bytesScanned,currentSeedMatchCount:items.filter(x=>x.referenceClasses.includes('CURRENT_DEMO_SEED_REFERENCE')).length,historicalSeedMatchCount:items.filter(x=>x.referenceClasses.includes('HISTORICAL_DEMO_SEED_REFERENCE')).length,deterministicSimpleIdPatternMatchCount:patternMatches.size,directReferenceCount:directReferences},items,summary:{resolvedSeed,directReferences,unresolved,classification:finalClassification,rootCause:unresolved?'SOURCE_SAFE_EVIDENCE_LACKS_ROW_LOCATOR_PROVENANCE_JOIN':'SOURCE_SAFE_PROVENANCE_RESOLVED'},focalReadContract:unresolved?{required:true,executeNow:false,scope:'ONLY_UNRESOLVED_V25_CLIENT_FINGERPRINTS',blocker:'SANITIZED_FINGERPRINT_IS_ONE_WAY_AND_NOT_A_FIRESTORE_LOCATOR',requiredMechanism:'RESOLVE_A_RUNTIME_ONLY_LOCATOR_OR_EXISTING_INDEX_FOR_EACH_UNRESOLVED_FINGERPRINT_BEFORE_ANY_GET',fullCollectionRereadAuthorized:false,writesAuthorized:0}:{required:false,executeNow:false},firestoreReads:0,firestoreWrites:0,authReads:0,authWrites:0,hostingTouched:false,browserExecuted:false,reimport:false,productionTouched:false,containsPII:false,containsNames:false,containsEmails:false,containsDocuments:false,containsSecrets:false,ok:true};
}
function main(){const out=reconcileSourceOnly();fs.mkdirSync(path.dirname(path.resolve(ROOT,EVIDENCE)),{recursive:true});fs.writeFileSync(path.resolve(ROOT,EVIDENCE),JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify({status:'PASS_V26_CLIENT_SOURCE_RECONCILIATION',classification:out.summary.classification,unresolved:out.summary.unresolved,currentSeedMatchCount:out.sourceEvidence.currentSeedMatchCount,historicalSeedMatchCount:out.sourceEvidence.historicalSeedMatchCount,deterministicSimpleIdPatternMatchCount:out.sourceEvidence.deterministicSimpleIdPatternMatchCount,directReferenceCount:out.sourceEvidence.directReferenceCount,firestoreReads:0,writes:0,ok:true}));}
if (process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(e){console.error(JSON.stringify({status:'STOP_V26_CLIENT_SOURCE_RECONCILIATION',classification:'PIPELINE_MECHANISM_FAILURE',error:String(e.message||e).slice(0,240),firestoreReads:0,writes:0,ok:false}));process.exit(41);}}
