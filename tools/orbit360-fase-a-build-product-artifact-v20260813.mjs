#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const SOURCE=path.join(ROOT,'orbit360-platform/index.html');
const ARTIFACT=path.join(ROOT,'orbit360-artifacts/fase-a-product');
const OUT=path.join(ARTIFACT,'index.html');
const PRODUCT_APP_SOURCE=path.join(ROOT,'orbit360-platform/core/product-app-p0.js');
const PRODUCT_APP_OUT=path.join(ARTIFACT,'core/product-app-p0.js');
const REQUIRED_RUNTIME=[
 'product-runtime-config.js',
 'core/membership-multirol-contract-p0.js',
 'core/membership-multirol-effective-p0.js',
 'core/tenant-access-policy-contract-p0.js',
 'core/aseguradoras-bank-account-visibility-policy-p0.js',
 'core/tenant-access-policy-effective-p0.js',
 'core/tenant-access-policy-product-p0.js',
 'core/product-query-planner-contract-p0.js',
 'core/tenant-canonical-paths-contract-p0.js',
 'core/backend-product-readiness-contract-p0.js',
 'data/store-firestore-product-readonly-p0.js',
 'core/product-runtime-browser-providers-p0.js',
 'core/backend-product-readonly-bootstrap-p0.js',
 'core/auth-product-runtime-p0.js'
];
const BLOCKED_RE=/(backend-lab-|store-firestore-lab|client360-lab-|__ORBIT_LAB_SAFE_MODE__|orbitBackend=firestore-lab)/i;
const BLOCKED_EXACT=new Set(['data/seed.js','core/auth.js','core/user-credential-selfservice-v20260805.js','core/auth-password-change-v20260805.js']);
function stripQuery(v){return String(v||'').split('?')[0].split('#')[0];}
function isExternal(v){return /^(?:https?:)?\/\//i.test(v)||/^(?:data:|mailto:|#)/i.test(v);}
function ensureDir(file){fs.mkdirSync(path.dirname(file),{recursive:true});}
function copyMissing(ref){
 const rel=stripQuery(ref);if(!rel||isExternal(rel)||BLOCKED_RE.test(rel)||BLOCKED_EXACT.has(rel))return;
 const dest=path.join(ARTIFACT,rel);if(fs.existsSync(dest))return;
 const src=path.join(ROOT,'orbit360-platform',rel);if(!fs.existsSync(src))throw new Error('PRODUCT_ARTIFACT_SOURCE_ASSET_MISSING:'+rel);
 ensureDir(dest);fs.copyFileSync(src,dest);
}
function removeBlockedFiles(dir){
 if(!fs.existsSync(dir))return;
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,ent.name),rel=path.relative(ARTIFACT,full).replace(/\\/g,'/');
  if(ent.isDirectory()){removeBlockedFiles(full);continue;}
  if(BLOCKED_RE.test(rel)||BLOCKED_EXACT.has(rel))fs.rmSync(full,{force:true});
 }
}
if(!fs.existsSync(SOURCE))throw new Error('CANONICAL_INDEX_MISSING');
if(!fs.existsSync(PRODUCT_APP_SOURCE))throw new Error('PRODUCT_APP_SOURCE_MISSING');
let html=fs.readFileSync(SOURCE,'utf8').replace(/^\uFEFF/,'');
html=html.replace(/<html\b([^>]*)>/i,function(_,attrs){var clean=String(attrs||'').replace(/\sdata-orbit-(?:entrypoint|product-mode)=(?:"[^"]*"|'[^']*')/gi,'');return '<html'+clean+' data-orbit-entrypoint="fase-a-product" data-orbit-product-mode="product-readonly">';});
html=html.replace(/<script\b[^>]*\bsrc=(['"])([^'"]+)\1[^>]*><\/script>/gi,function(block,_q,src){var rel=stripQuery(src);return BLOCKED_RE.test(rel)||BLOCKED_EXACT.has(rel)||REQUIRED_RUNTIME.includes(rel)||rel==='core/product-app-p0.js'?'':block;});
html=html.replace(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi,function(block){return BLOCKED_RE.test(block)?'':block;});
const storeTag=html.match(/<script\b[^>]*\bsrc=(['"])data\/store\.js[^'"]*\1[^>]*><\/script>/i);
if(!storeTag)throw new Error('CANONICAL_BASE_STORE_TAG_MISSING');
const runtimeTags=REQUIRED_RUNTIME.map(function(rel){return '<script src="'+rel+'?v=20260813-product-entrypoint"></script>';}).join('');
html=html.replace(storeTag[0],storeTag[0]+runtimeTags);
const initRe=/<script>\s*Orbit\.store\.init\(Orbit\.SEED\);\s*Orbit\.router\.init\(\);\s*Orbit\.auth\.init\(\);\s*if\s*\(Orbit\.novedades\)\s*Orbit\.novedades\.init\(\);/;
if(!initRe.test(html))throw new Error('CANONICAL_INIT_SEQUENCE_NOT_FOUND');
html=html.replace(initRe,'<script src="core/product-app-p0.js?v=20260813-product-entrypoint"></script>\n  <script>\n    Orbit.productAppP0.init();');
if(BLOCKED_RE.test(html)||/data\/seed\.js|core\/auth\.js(?:\?|["'])/i.test(html))throw new Error('PRODUCT_INDEX_BLOCKED_RUNTIME_REMAINED');
if(!/id=(['"])login-form\1/i.test(html)||!/id=(['"])host\1/i.test(html))throw new Error('PRODUCT_INDEX_REQUIRED_DOM_MISSING');
ensureDir(PRODUCT_APP_OUT);fs.copyFileSync(PRODUCT_APP_SOURCE,PRODUCT_APP_OUT);
for(const rel of REQUIRED_RUNTIME){if(!fs.existsSync(path.join(ARTIFACT,rel)))throw new Error('PRODUCT_RUNTIME_DEPENDENCY_MISSING:'+rel);}
const refs=[];html.replace(/<(?:script|link)\b[^>]*(?:src|href)=(['"])([^'"]+)\1/gi,function(_m,_q,ref){refs.push(ref);return _m;});
for(const ref of refs)copyMissing(ref);
removeBlockedFiles(ARTIFACT);
ensureDir(OUT);fs.writeFileSync(OUT,html,'utf8');
const result={ok:true,status:'FASE_A_PRODUCT_ARTIFACT_ASSEMBLED',source:'orbit360-platform/index.html',output:'orbit360-artifacts/fase-a-product/index.html',functionalEntrypoint:true,loginForm:true,productRuntimeBound:true,labRuntimeRemoved:true,seedRemoved:true,genericAuthRemoved:true,writeAuthorized:false,productionTouched:false};
console.log(JSON.stringify(result,null,2));
