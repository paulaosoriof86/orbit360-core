#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ROOT=process.cwd(),PLAT=path.join(ROOT,'orbit360-platform');
const sourcePath=path.join(PLAT,'index.html');
const apply=process.argv.includes('--apply');
const outArg=process.argv.find(x=>x.startsWith('--out='));
const outPath=apply?sourcePath:path.resolve(ROOT,outArg?outArg.slice(6):'orbit360-platform/runtime-gate-crm-v20260716/m6-product-index.generated.html');
let html=fs.readFileSync(sourcePath,'utf8');
const originalHash=crypto.createHash('sha256').update(html).digest('hex');
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function removeSrc(rel){const re=new RegExp('<script\\s+src=["\\\'][^"\\\']*'+esc(rel)+'[^"\\\']*["\\\'][^>]*><\\/script>','g');html=html.replace(re,'');}
function afterSrc(rel,content){const re=new RegExp('(<script\\s+src=["\\\'][^"\\\']*'+esc(rel)+'[^"\\\']*["\\\'][^>]*><\\/script>)');if(!re.test(html))throw new Error('M6_BUILD_ANCHOR_MISSING:'+rel);html=html.replace(re,'$1'+content);}
[
 'core/backend-lab-loader.js','core/backend-lab-init.js','data/store.js','data/store-firestore-lab.local.js','data/seed.js','core/router-tenant-config-bootstrap.js','core/product-role-taxonomy-p0.js'
].forEach(removeSrc);
const authRe=/<script\s+src=["'][^"']*core\/auth\.js[^"']*["'][^>]*><\/script>/;
if(!authRe.test(html))throw new Error('M6_BUILD_AUTH_ANCHOR_MISSING');
html=html.replace(authRe,'<script src="core/auth-product-runtime-p0.js?v=20260730-m6"></script><script src="core/product-app-runtime-p0.js?v=20260730-m6"></script>');
afterSrc('core/config.js','<script src="core/product-config-session-overlay-p0.js?v=20260730-m6"></script>');
const policyRe=/<script\s+src=["'][^"']*core\/academia-static-content-write-policy-v20260729\.js[^"']*["'][^>]*><\/script>/;
if(!policyRe.test(html))throw new Error('M6_BUILD_POLICY_ANCHOR_MISSING');
const productStack=[
 '<script src="product-runtime-config.js?v=20260730-m6"></script>',
 '<script src="core/product-role-taxonomy-p0.js?v=20260723-m2"></script>',
 '<script src="core/membership-multirol-contract-p0.js?v=20260713"></script>',
 '<script src="core/membership-multirol-effective-p0.js?v=20260723-m2"></script>',
 '<script src="core/tenant-access-policy-contract-p0.js?v=20260713"></script>',
 '<script src="core/aseguradoras-bank-account-visibility-policy-p0.js?v=20260713"></script>',
 '<script src="core/tenant-access-policy-effective-p0.js?v=20260714"></script>',
 '<script src="core/tenant-access-policy-product-p0.js?v=20260723-m2"></script>',
 '<script src="core/product-query-planner-contract-p0.js?v=20260713"></script>',
 '<script src="core/tenant-canonical-paths-contract-p0.js?v=20260713"></script>',
 '<script src="core/backend-product-readiness-contract-p0.js?v=20260724-m2"></script>',
 '<script src="data/store-firestore-product-readonly-p0.js?v=20260713"></script>',
 '<script src="core/backend-product-readonly-bootstrap-p0.js?v=20260723-m2"></script>',
 '<script src="core/product-runtime-provider-contracts-p0.js?v=20260724-m2"></script>',
 '<script src="core/product-prebootstrap-store-p0.js?v=20260730-m6"></script>'
].join('');
html=html.replace(policyRe,productStack+'$&');
afterSrc('core/access-role-session-owner-v20260728.js','<script src="core/product-membership-access-bridge-p0.js?v=20260730-m6-access"></script>');
const init='Orbit.store.init(Orbit.SEED); Orbit.router.init(); Orbit.auth.init(); if (Orbit.novedades) Orbit.novedades.init();';
if(!html.includes(init))throw new Error('M6_BUILD_INIT_ANCHOR_MISSING');
html=html.replace(init,'Orbit.productAppP0.init();');
const forbidden=['backend-lab-loader.js','backend-lab-init.js','store-firestore-lab.local.js','data/seed.js','core/auth.js','Orbit.store.init(Orbit.SEED)','orbitBackend=firestore-lab','tenant=alianzas-soluciones','admin@demo.com','orbit.lab@demo.com','demo123'];
const leaked=forbidden.filter(x=>html.includes(x));
if(leaked.length)throw new Error('M6_PRODUCT_SHELL_FORBIDDEN:'+leaked.join(','));
const required=['product-runtime-config.js','product-prebootstrap-store-p0.js','product-runtime-browser-providers-p0.js','auth-product-runtime-p0.js','product-app-runtime-p0.js','store-firestore-product-readonly-p0.js','backend-product-readonly-bootstrap-p0.js','product-membership-access-bridge-p0.js'];
// Browser providers are inserted adjacent to product stack only after contracts.
if(!html.includes('product-runtime-browser-providers-p0.js')){
  const anchor='<script src="core/product-prebootstrap-store-p0.js?v=20260730-m6"></script>';
  html=html.replace(anchor,anchor+'<script src="core/product-runtime-browser-providers-p0.js?v=20260730-m6"></script>');
}
const missing=required.filter(x=>!html.includes(x));if(missing.length)throw new Error('M6_PRODUCT_SHELL_REQUIRED_MISSING:'+missing.join(','));
fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,html,'utf8');
const productHash=crypto.createHash('sha256').update(html).digest('hex');
console.log(JSON.stringify({ok:true,status:'M6_PRODUCT_SHELL_BUILT',apply,source:'orbit360-platform/index.html',output:path.relative(ROOT,outPath),sourceSha256:originalHash,productSha256:productHash,forbiddenPresent:[],requiredPresent:required.length,containsPII:false,containsSecrets:false},null,2));
