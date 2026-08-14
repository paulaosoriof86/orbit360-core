#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const SRCROOT=path.join(ROOT,'orbit360-platform');
const ART=path.join(ROOT,'orbit360-artifacts/fase-a-product');
const INDEX=path.join(ART,'index.html');
const EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/fase-a-product-r3-dynamic-assets-v20260814.json');
const RENDER_EVIDENCE=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/fase-a-product-render-proof-r3-v20260814.json');
const MANIFEST=path.join(ART,'orbit360-package-manifest.json');
const mode=String(process.argv[2]||'sync').trim();
const TEXT_EXT=new Set(['.js','.css','.json','.html','.webmanifest','.svg']);
const ASSET_EXT_RE=/\.(?:js|css|json|html|webmanifest|svg|png|webp|jpg|jpeg|gif|ico)(?:[?#][^'"\s]*)?$/i;
const PRODUCT_INCOMPATIBLE_EXACT=[
  'core/academia-static-content-write-policy-v20260729.js',
  'data/academia-v1230-operational-directory-v20260722.js'
];
const FORBIDDEN_EXACT=new Set(['data/store.js','data/seed.js','core/auth.js','core/router-tenant-config-bootstrap.js','core/user-credential-selfservice-v20260805.js','core/auth-password-change-v20260805.js'].concat(PRODUCT_INCOMPATIBLE_EXACT));

function cleanRel(v){return String(v||'').split('?')[0].split('#')[0].replace(/\\/g,'/').replace(/^\/+/, '');}
function hasLabToken(rel){return cleanRel(rel).split('/').some(seg=>/(^|[-_.])lab([-_.]|$)/i.test(seg));}
function forbiddenPath(rel){rel=cleanRel(rel);return !rel||FORBIDDEN_EXACT.has(rel)||hasLabToken(rel);}
function inside(root,file){const r=path.resolve(root),f=path.resolve(file);return f===r||f.startsWith(r+path.sep);}
function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function save(report){fs.mkdirSync(path.dirname(EVIDENCE),{recursive:true});fs.writeFileSync(EVIDENCE,JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report,null,2));}
function gitHead(){try{return execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();}catch{return '';}}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function sourceCandidate(ownerRel,raw){
  let value=String(raw||'').trim();
  if(!value||/^(?:https?:|data:|mailto:|#)/i.test(value)||value.includes('${')||value.includes('<'))return '';
  value=cleanRel(value);
  let rel;
  if(/^\.\.?\//.test(value))rel=path.posix.normalize(path.posix.join(path.posix.dirname(ownerRel),value));
  else rel=path.posix.normalize(value);
  if(!rel||rel.startsWith('../')||forbiddenPath(rel))return '';
  const src=path.join(SRCROOT,rel);
  return inside(SRCROOT,src)&&fs.existsSync(src)&&fs.statSync(src).isFile()?rel:'';
}
function stringAssetRefs(text,ownerRel){
  const out=[];
  const re=/['"]([^'"\r\n]+)['"]/g;let m;
  while((m=re.exec(text))){const raw=m[1];if(!ASSET_EXT_RE.test(raw))continue;const rel=sourceCandidate(ownerRel,raw);if(rel&&!out.includes(rel))out.push(rel);}
  return out;
}
function staticRefs(){
  const html=fs.readFileSync(INDEX,'utf8');const out=[];
  html.replace(/<(?:script|link)\b[^>]*(?:src|href)=(['"])([^'"]+)\1/gi,(_m,_q,ref)=>{const rel=sourceCandidate('index.html',ref);if(rel&&!out.includes(rel))out.push(rel);return _m;});
  return out;
}
function walk(dir){let out=[];if(!fs.existsSync(dir))return out;for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,ent.name);if(ent.isDirectory())out=out.concat(walk(full));else out.push(full);}return out;}
function sync(){
  if(!fs.existsSync(INDEX))throw new Error('R3_PRODUCT_INDEX_MISSING');
  const roots=staticRefs();
  const queue=roots.slice();const visited=new Set();const discovered=new Set(roots);const copied=[];const missing=[];const parity=[];
  while(queue.length){
    const rel=queue.shift();if(visited.has(rel))continue;visited.add(rel);
    const src=path.join(SRCROOT,rel);if(!fs.existsSync(src)){missing.push(rel);continue;}
    const dest=path.join(ART,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});
    const before=fs.existsSync(dest)?sha(dest):'';fs.copyFileSync(src,dest);const after=sha(dest),sourceSha=sha(src);
    if(after!==sourceSha)parity.push(rel);
    if(!before||before!==after)copied.push(rel);
    if(TEXT_EXT.has(path.extname(rel).toLowerCase())){
      const text=fs.readFileSync(src,'utf8');
      for(const dep of stringAssetRefs(text,rel)){if(!discovered.has(dep)){discovered.add(dep);queue.push(dep);}}
    }
  }
  const dynamic=[...discovered].filter(rel=>!roots.includes(rel)).sort();
  const dynamicMissing=dynamic.filter(rel=>!fs.existsSync(path.join(ART,rel)));
  const requiredKnown=[
    'core/session-multirol-visibility-v20260716.js',
    'core/client-canonical-view-projection-v20260716.js',
    'core/product-tenant-runtime-context-bridge-p0.js',
    'core/router-tenant-config-product-bootstrap-p0.js',
    'data/tenant-runtime-config-index.js'
  ];
  const knownMissing=requiredKnown.filter(rel=>!fs.existsSync(path.join(ART,rel)));
  const tenantIndex=path.join(SRCROOT,'data/tenant-runtime-config-index.js');
  const tenantIndexText=fs.existsSync(tenantIndex)?fs.readFileSync(tenantIndex,'utf8'):'';
  const tenantRefs=stringAssetRefs(tenantIndexText,'data/tenant-runtime-config-index.js');
  const tenantRefsMissing=tenantRefs.filter(rel=>!fs.existsSync(path.join(ART,rel)));
  const artifactRels=walk(ART).map(file=>path.relative(ART,file).replace(/\\/g,'/'));
  const forbiddenIncluded=artifactRels.filter(forbiddenPath).sort();
  const semanticForbiddenIncluded=artifactRels.filter(rel=>PRODUCT_INCOMPATIBLE_EXACT.includes(rel)).sort();
  const discoveredSemanticForbidden=[...discovered].filter(rel=>PRODUCT_INCOMPATIBLE_EXACT.includes(rel)).sort();
  const report={schemaVersion:'orbit360-fase-a-r3-dynamic-assets-v1',ok:missing.length===0&&parity.length===0&&dynamicMissing.length===0&&knownMissing.length===0&&tenantRefsMissing.length===0&&forbiddenIncluded.length===0&&semanticForbiddenIncluded.length===0&&discoveredSemanticForbidden.length===0,status:'',mode:'sync',sourceHead:gitHead(),staticRootCount:roots.length,dependencyClosureCount:discovered.size,dynamicDependencyCount:dynamic.length,copiedCount:copied.length,dynamicDependencies:dynamic,missing,parityFailures:parity,dynamicMissing,knownMissing,tenantRefs,tenantRefsMissing,productIncompatibleExact:PRODUCT_INCOMPATIBLE_EXACT,forbiddenIncluded,semanticForbiddenIncluded,discoveredSemanticForbidden,noLabRuntime:forbiddenIncluded.length===0&&semanticForbiddenIncluded.length===0&&discoveredSemanticForbidden.length===0,secretAccess:false,browserExecuted:false,deployExecuted:false,productionTouched:false,writeAuthorized:false};
  report.status=report.ok?'FASE_A_PRODUCT_R3_DYNAMIC_ASSETS_PASS':'FASE_A_PRODUCT_R3_DYNAMIC_ASSETS_FAIL';save(report);if(!report.ok)process.exitCode=41;
}
function manifest(){
  if(!fs.existsSync(INDEX))throw new Error('R3_PRODUCT_INDEX_MISSING');
  const runtimeConfig=path.join(ART,'product-runtime-config.js');if(!fs.existsSync(runtimeConfig))throw new Error('R3_PUBLIC_RUNTIME_CONFIG_MISSING');
  if(!fs.existsSync(EVIDENCE))throw new Error('R3_DYNAMIC_EVIDENCE_MISSING');
  if(!fs.existsSync(RENDER_EVIDENCE))throw new Error('R3_RENDER_EVIDENCE_MISSING');
  const dynamicEvidence=readJson(EVIDENCE),renderEvidence=readJson(RENDER_EVIDENCE);
  const activeTenant=renderEvidence?.runtime?.routerState?.['data-orbit-tenant-insurer-config-active-v20260717']||{};
  const store=renderEvidence?.runtime?.store||{};
  const tenantContext=renderEvidence?.runtime?.tenantContext||{};
  const dynamicCertified=dynamicEvidence.ok===true&&dynamicEvidence.status==='FASE_A_PRODUCT_R3_DYNAMIC_ASSETS_PASS'&&[].concat(dynamicEvidence.dynamicMissing||[]).length===0&&[].concat(dynamicEvidence.knownMissing||[]).length===0&&[].concat(dynamicEvidence.tenantRefsMissing||[]).length===0&&[].concat(dynamicEvidence.parityFailures||[]).length===0&&[].concat(dynamicEvidence.semanticForbiddenIncluded||[]).length===0&&[].concat(dynamicEvidence.discoveredSemanticForbidden||[]).length===0&&dynamicEvidence.noLabRuntime===true;
  const hydrationCertified=renderEvidence.ok===true&&renderEvidence.status==='FASE_A_PRODUCT_RENDER_PROOF_R3_PASS'&&store.ready===true&&store.status==='ready-read-only'&&store.writeEnabled===false&&[].concat(store.requiredMissing||[]).length===0&&[].concat(store.requiredFailed||[]).length===0;
  const tenantContextCertified=tenantContext.ready===true&&tenantContext.writeAuthorized===false&&String(tenantContext.tenantId||'')===String(renderEvidence?.runtime?.user?.tenantId||'')&&activeTenant.ready===true&&activeTenant.status==='ready';
  const routerRenderCertified=renderEvidence?.runtime?.productApp?.started===true&&renderEvidence?.runtime?.productApp?.routerStarted===true&&Number(renderEvidence?.runtime?.hostChildCount||0)>0&&String(renderEvidence?.runtime?.routeKey||'').length>0&&[].concat(renderEvidence.pageErrors||[]).length===0&&[].concat(renderEvidence.httpFailures||[]).filter(x=>x&&x.scope==='local-artifact').length===0;
  if(!dynamicCertified)throw new Error('R3_DYNAMIC_EVIDENCE_NOT_CERTIFIED');
  if(!hydrationCertified)throw new Error('R3_HYDRATION_EVIDENCE_NOT_CERTIFIED');
  if(!tenantContextCertified)throw new Error('R3_TENANT_CONTEXT_EVIDENCE_NOT_CERTIFIED');
  if(!routerRenderCertified)throw new Error('R3_ROUTER_RENDER_EVIDENCE_NOT_CERTIFIED');
  const files=walk(ART).filter(f=>f!==MANIFEST).sort();
  const rels=files.map(f=>path.relative(ART,f).replace(/\\/g,'/'));
  const forbidden=rels.filter(forbiddenPath);
  const secretMaterial=[];
  for(const file of files){
    const ext=path.extname(file).toLowerCase();if(!TEXT_EXT.has(ext))continue;
    const text=fs.readFileSync(file,'utf8');
    if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)||/["']type["']\s*:\s*["']service_account["']/.test(text)||/["']private_key["']\s*:/.test(text))secretMaterial.push(path.relative(ART,file).replace(/\\/g,'/'));
  }
  const entries=files.map(file=>({path:path.relative(ART,file).replace(/\\/g,'/'),bytes:fs.statSync(file).size,sha256:sha(file)}));
  const result={schemaVersion:'orbit360-fase-a-product-package-manifest-v1',status:'FASE_A_PRODUCT_R3_DURABLE_PACKAGE_CERTIFIED',sourceHead:process.env.GITHUB_SHA||gitHead(),generatedAt:new Date().toISOString(),artifactRoot:'orbit360-artifacts/fase-a-product',fileCount:entries.length,files:entries,requiredHydrationCertified:hydrationCertified,dynamicRuntimeClosureCertified:dynamicCertified,productTenantContextCertified:tenantContextCertified,routerRenderCertified:routerRenderCertified,noLabRuntime:forbidden.length===0,noPrivateSecretMaterial:secretMaterial.length===0,forbiddenFiles:forbidden,secretMaterialFiles:secretMaterial,writeAuthorized:false,productionTouched:false,deployExecuted:false,containsPrivateSecrets:false};
  if(forbidden.length||secretMaterial.length)throw new Error('R3_PACKAGE_SAFETY_FAIL:'+forbidden.concat(secretMaterial).join(','));
  fs.writeFileSync(MANIFEST,JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify({ok:true,status:result.status,fileCount:result.fileCount,manifest:path.relative(ROOT,MANIFEST).replace(/\\/g,'/'),sourceHead:result.sourceHead,writeAuthorized:false,productionTouched:false},null,2));
}
try{if(mode==='sync')sync();else if(mode==='manifest')manifest();else throw new Error('R3_MODE_INVALID:'+mode);}catch(error){const report={schemaVersion:'orbit360-fase-a-r3-dynamic-assets-v1',ok:false,status:'FASE_A_PRODUCT_R3_DYNAMIC_ASSETS_FAIL',mode,error:String(error&&error.message||error).slice(0,500),secretAccess:false,browserExecuted:false,deployExecuted:false,productionTouched:false,writeAuthorized:false};save(report);process.exitCode=41;}
