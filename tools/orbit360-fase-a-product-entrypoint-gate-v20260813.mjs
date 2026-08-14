#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),ART=path.join(ROOT,'orbit360-artifacts/fase-a-product');
const INDEX=path.join(ART,'index.html'),OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/fase-a-product-entrypoint-source-v20260813.json');
const requiredIds=['login','login-form','lg-user','lg-pass','host'];
const requiredRefs=['data/store-product-preauth-p0.js','product-runtime-config.js','core/product-runtime-browser-providers-p0.js','core/backend-product-readonly-bootstrap-p0.js','core/auth-product-runtime-p0.js','core/product-tenant-runtime-context-bridge-p0.js','core/router-tenant-config-product-bootstrap-p0.js','core/product-app-p0.js','modules/cliente360.js','modules/aseguradoras.js','modules/ops.js','modules/leads.js'];
const forbidden=[/backend-lab-/i,/store-firestore-lab/i,/client360-lab-/i,/__ORBIT_LAB_SAFE_MODE__/i,/orbitBackend=firestore-lab/i,/data\/store\.js(?:\?|["'])/i,/data\/seed\.js/i,/core\/auth\.js(?:\?|["'])/i,/core\/router-tenant-config-bootstrap\.js/i,/blocked-until-authorized-runtime/i,/Acceso pendiente de activaci[oó]n/i,/Orbit\.store\.init\(Orbit\.SEED\)/,/localStorage\.(?:getItem|setItem)\(/i];
function strip(v){return String(v||'').split('?')[0].split('#')[0].replace(/^\/+/, '');}
function external(v){return /^(?:https?:)?\/\//i.test(v)||/^(?:data:|mailto:|#)/i.test(v);}
function hasLabToken(rel){return strip(rel).split('/').some(seg=>/(^|[-_.])lab([-_.]|$)/i.test(seg));}
function hasId(html,id){return html.includes('id="'+id+'"')||html.includes("id='"+id+"'");}
let report={schemaVersion:'orbit360-fase-a-product-entrypoint-source-v1',ok:false,status:'FASE_A_PRODUCT_ENTRYPOINT_SOURCE_FAIL',checks:{},missingIds:[],missingRefs:[],missingAssets:[],forbiddenMatches:[],labEntrypointRefs:[],secretAccess:false,browserExecuted:false,deployExecuted:false,productionTouched:false,writeAuthorized:false,containsPII:false,containsSecrets:false};
try{
 const html=fs.readFileSync(INDEX,'utf8').replace(/^\uFEFF/,'');
 report.missingIds=requiredIds.filter(id=>!hasId(html,id));
 report.missingRefs=requiredRefs.filter(ref=>!html.includes(ref));
 report.forbiddenMatches=forbidden.map((re,i)=>re.test(html)?i:null).filter(v=>v!==null);
 const refs=[];html.replace(/<(?:script|link)\b[^>]*(?:src|href)=(['"])([^'"]+)\1/gi,(_m,_q,ref)=>{refs.push(ref);return _m;});
 report.labEntrypointRefs=refs.map(strip).filter(hasLabToken);
 report.missingAssets=refs.map(strip).filter(rel=>rel&&!external(rel)&&!fs.existsSync(path.join(ART,rel)));
 const preauthPath=path.join(ART,'data/store-product-preauth-p0.js');
 const preauth=fs.existsSync(preauthPath)?fs.readFileSync(preauthPath,'utf8'):'';
 const tenantBridgePath=path.join(ART,'core/product-tenant-runtime-context-bridge-p0.js');
 const tenantBridge=fs.existsSync(tenantBridgePath)?fs.readFileSync(tenantBridgePath,'utf8'):'';
 const productRouterBootstrapPath=path.join(ART,'core/router-tenant-config-product-bootstrap-p0.js');
 const productRouterBootstrap=fs.existsSync(productRouterBootstrapPath)?fs.readFileSync(productRouterBootstrapPath,'utf8'):'';
 report.checks={
  functionalDom:report.missingIds.length===0,
  requiredRuntimeRefs:report.missingRefs.length===0,
  noForbiddenRuntime:report.forbiddenMatches.length===0,
  noLabEntrypointRefs:report.labEntrypointRefs.length===0,
  allEntrypointAssetsResolve:report.missingAssets.length===0,
  productMode:/data-orbit-product-mode=["']product-readonly["']/i.test(html),
  productInit:/Orbit\.productAppP0\.init\(\)/.test(html),
  productAppStartContract:/core\/product-app-p0\.js/.test(html),
  productTenantBridge:/PRODUCT_TENANT_CONTEXT_MISMATCH/.test(tenantBridge)&&/authenticated-product-membership/.test(tenantBridge)&&!/tenantHint|alianzas-soluciones/i.test(tenantBridge),
  productRouterBootstrap:/authenticated-membership-later/.test(productRouterBootstrap)&&!/URLSearchParams|credentials-provider-lab|alianzas-soluciones/i.test(productRouterBootstrap),
  preAuthStoreFailClosed:/WRITE_BLOCKED_PRODUCT_PREAUTH_P0/.test(preauth)&&/all:function\(\)\{return\[\];\}/.test(preauth)&&/noFallback:true/.test(preauth)
 };
 report.ok=Object.values(report.checks).every(Boolean);report.status=report.ok?'FASE_A_PRODUCT_ENTRYPOINT_SOURCE_PASS':'FASE_A_PRODUCT_ENTRYPOINT_SOURCE_FAIL';
}catch(e){report.error=String(e&&e.message||e).slice(0,300);}
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report,null,2));if(!report.ok)process.exit(41);
