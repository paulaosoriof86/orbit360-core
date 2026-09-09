import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const MANIFEST='artifacts/orbit360-recovery/project-sources-v2/04_MANIFIESTO_FUENTES_EVERGREEN_V2.json';
const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const LINEAGE='artifacts/orbit360-recovery/release-control/CAPABILITY_LINEAGE_LOCK.json';
const PLAN='artifacts/orbit360-recovery/release-control/PLAN_TRABAJO_CONGELADO_V2.md';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const read=p=>fs.readFileSync(p,'utf8');
need(fs.existsSync(MANIFEST),'EVERGREEN_MANIFEST_MISSING');
const m=JSON.parse(read(MANIFEST));
need(m.schemaVersion==='gravicentra-project-sources-evergreen-v2','EVERGREEN_MANIFEST_SCHEMA_INVALID');
need(m.operationalAuthority===CONTROL,'EVERGREEN_OPERATIONAL_AUTHORITY_DRIFT');
need(m.lineageAuthority===LINEAGE,'EVERGREEN_LINEAGE_AUTHORITY_DRIFT');
need(m.frozenExecutionPlan===PLAN,'EVERGREEN_PLAN_AUTHORITY_DRIFT');
for(const key of ['containsCurrentGate','containsCurrentHead','containsCurrentRunId','containsCurrentBuildId','containsCurrentPreviewUrl','containsMutablePassPendingState']) need(m[key]===false,'EVERGREEN_MUTABLE_STATE_FLAG_INVALID:'+key);
need(Array.isArray(m.files)&&m.files.length===4,'EVERGREEN_FILE_COUNT_INVALID');
for(const f of m.files){
  need(typeof f.path==='string'&&f.path.startsWith('artifacts/orbit360-recovery/project-sources-v2/'),'EVERGREEN_PATH_INVALID');
  need(/^[0-9a-f]{40}$/.test(String(f.gitBlobSha||'')),'EVERGREEN_BLOB_SHA_INVALID:'+f.path);
  need(fs.existsSync(f.path),'EVERGREEN_FILE_MISSING:'+f.path);
  const actual=git('hash-object',f.path);
  need(actual===f.gitBlobSha,'EVERGREEN_FILE_BLOB_DRIFT:'+f.path+':'+actual);
  const text=read(f.path);
  need(!/https:\/\/ays-orbit-360-lab--gi-i3-[A-Za-z0-9-]+\.web\.app/.test(text),'EVERGREEN_CURRENT_PREVIEW_URL_FORBIDDEN:'+f.path);
  need(!/\bgi-i3-[0-9a-f]{12}-[0-9a-f]{12}\b/.test(text),'EVERGREEN_CURRENT_BUILD_ID_FORBIDDEN:'+f.path);
  need(!/\b343\d{8}\b/.test(text),'EVERGREEN_CURRENT_RUN_ID_FORBIDDEN:'+f.path);
}
console.log('GRAVICENTRA_EVERGREEN_SOURCES_INVARIANT=PASS');
console.log('EVERGREEN_FILE_COUNT='+m.files.length);
console.log('OPERATIONAL_AUTHORITY='+CONTROL);
console.log('LINEAGE_AUTHORITY='+LINEAGE);
