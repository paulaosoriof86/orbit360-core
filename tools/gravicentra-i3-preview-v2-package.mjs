import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const [sourceRoot, packageRoot, publicConfigPath] = process.argv.slice(2);
if (!sourceRoot || !packageRoot || !publicConfigPath) throw new Error('USAGE: package.mjs <sourceRoot> <packageRoot> <publicConfigJson>');
const SOURCE_SHA=process.env.SOURCE_SHA||'';
const PROJECT_ID=process.env.PROJECT_ID||'';
const HOSTING_SITE=process.env.HOSTING_SITE||'';
const TENANT_HINT=process.env.TENANT_HINT||'';
const SRC=path.resolve(sourceRoot,'orbit360-platform');
const FUNCTIONS_SRC=path.resolve(sourceRoot,'functions');
const PACKAGE=path.resolve(packageRoot);
const BUNDLE=path.join(PACKAGE,'bundle');
const SITE=path.join(BUNDLE,'site');
const BACKEND=path.join(BUNDLE,'backend');
const EVIDENCE=path.join(PACKAGE,'evidence');
const requiredEnv={SOURCE_SHA,PROJECT_ID,HOSTING_SITE,TENANT_HINT};
for(const [k,v] of Object.entries(requiredEnv)) if(!v) throw new Error('ENV_MISSING:'+k);
if(!/^[0-9a-f]{40}$/.test(SOURCE_SHA)) throw new Error('SOURCE_SHA_INVALID');
fs.rmSync(PACKAGE,{recursive:true,force:true}); fs.mkdirSync(SITE,{recursive:true}); fs.mkdirSync(BACKEND,{recursive:true}); fs.mkdirSync(EVIDENCE,{recursive:true});
const read=p=>fs.readFileSync(p,'utf8');
for(const p of ['index.html','product-runtime-config.js','sw.js']) if(!fs.existsSync(path.join(SRC,p))) throw new Error('REQUIRED_PRODUCT_FILE_MISSING:'+p);
const runtimeCfg=read(path.join(SRC,'product-runtime-config.js'));
if(!runtimeCfg.includes("hydrationContractVersion: 'fase-a-i2-20260905.3-ledger-server-owned'")) throw new Error('HYDRATION_CONTRACT_VERSION_DRIFT');
if(!runtimeCfg.includes("hydrationContractSource: 'recovery/fase-a-clean-20260831'")) throw new Error('HYDRATION_CONTRACT_SOURCE_DRIFT');
if(!runtimeCfg.includes('enabled: false')) throw new Error('SOURCE_RUNTIME_CONFIG_MUST_BE_DISABLED');
if(!read(path.join(SRC,'data/tenant-runtime-config-index.js')).includes("'alianzas-soluciones'")) throw new Error('TENANT_INDEX_MISSING');

const assetExt='(?:js|css|json|webmanifest|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|pdf)';
const generic=new RegExp(`(?<![A-Za-z0-9_])(/?(?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_.-]+\\.${assetExt})(?:\\?[^\\s'\"<>)]*)?`,'g');
const htmlRef=/(?:src|href)=["']([^"']+)["']/gi;
const cssRef=/url\((?:["']?)([^)"']+)/gi;
const textExt=new Set(['.html','.js','.css','.json','.webmanifest','.svg']);
const queue=['index.html','product-runtime-config.js','sw.js']; const seen=new Set();
function norm(raw,parent=''){
  raw=String(raw||'').trim().split('#',1)[0].split('?',1)[0];
  if(!raw||/^(https?:|data:|blob:|mailto:|tel:|#|\/\/)/.test(raw)) return null;
  let c=raw.startsWith('/')?raw.slice(1):raw;
  if(/^\.\.?\//.test(c)) c=path.posix.normalize(path.posix.join(path.posix.dirname(parent),c));
  c=c.replace(/^\.\//,''); if(c==='..'||c.startsWith('../')) return null; return c;
}
function add(c){if(!c||seen.has(c)||queue.includes(c))return; const p=path.resolve(SRC,c); if(!p.startsWith(SRC+path.sep))return; if(fs.existsSync(p)&&fs.statSync(p).isFile())queue.push(c);}
while(queue.length){
  const rel=queue.shift(); if(seen.has(rel))continue;
  const p=path.resolve(SRC,rel); if(!p.startsWith(SRC+path.sep))throw new Error('PATH_ESCAPE:'+rel); if(!fs.existsSync(p)||!fs.statSync(p).isFile())throw new Error('REQUIRED_PRODUCT_FILE_MISSING:'+rel);
  if(/(^|\/)(?:lab|seeds?|demo-auth)(?:\/|[-_.])/i.test(rel))throw new Error('FORBIDDEN_PRODUCT_DEPENDENCY:'+rel);
  seen.add(rel); const out=path.join(SITE,rel); fs.mkdirSync(path.dirname(out),{recursive:true}); fs.copyFileSync(p,out);
  if(!textExt.has(path.extname(p).toLowerCase()))continue; const text=read(p);
  if(path.extname(p).toLowerCase()==='.html') for(const m of text.matchAll(htmlRef)){const c=norm(m[1],rel); if(c&&!fs.existsSync(path.resolve(SRC,c)))throw new Error(`HTML_LOCAL_REFERENCE_MISSING:${rel}:${c}`); add(c);}
  if(path.extname(p).toLowerCase()==='.css') for(const m of text.matchAll(cssRef))add(norm(m[1],rel));
  for(const m of text.matchAll(generic))add(norm(m[1],rel));
}
const requiredSite=['index.html','product-runtime-config.js','sw.js','core/product-app-p0.js','core/pwa.js','core/product-insurer-credential-provider-p0.js','data/tenant-runtime-config-index.js','data/store-firestore-product-readonly-p0.js','data/store-firestore-product-operational-p0.js'];
for(const p of requiredSite) if(!seen.has(p))throw new Error('REACHABILITY_CLOSURE_MISSING:'+p);
for(const p of seen) if(/^(tools|docs|reports|functions|\.github)\//.test(p))throw new Error('NON_PRODUCT_TREE_REACHED:'+p);
fs.writeFileSync(path.join(EVIDENCE,'reachable-files.txt'),[...seen].sort().join('\n')+'\n');

function copyTree(src,dst){for(const e of fs.readdirSync(src,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.git'||e.name.endsWith('.local'))continue;const a=path.join(src,e.name),b=path.join(dst,e.name);if(e.isDirectory()){fs.mkdirSync(b,{recursive:true});copyTree(a,b);}else if(e.isFile()){fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(a,b);}}}
copyTree(FUNCTIONS_SRC,BACKEND);
for(const p of ['package.json','package-lock.json','bootstrap.js','product-active-role-contract.js','product-insurer-credentials.js']) if(!fs.existsSync(path.join(BACKEND,p)))throw new Error('BACKEND_REQUIRED_FILE_MISSING:'+p);
const backendText=read(path.join(BACKEND,'product-insurer-credentials.js'));
for(const token of ['orbit360ProductInsurerCredentialCommand=onCall','orbit360ProductInsurerCredentialCommandPreview=onCall',"const PREVIEW_REGION='us-east1'","request=>execute(request,'cloudlog')","request=>execute(request,'firestore')"]) if(!backendText.includes(token))throw new Error('BACKEND_CONTRACT_MISSING:'+token);
execFileSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:BACKEND,stdio:['ignore','ignore','inherit']});
if(!fs.existsSync(path.join(BACKEND,'node_modules/firebase-admin/app/package.json')))throw new Error('BACKEND_LOCKED_DEPENDENCIES_NOT_MATERIALIZED');

let raw=JSON.parse(read(publicConfigPath)); let result=raw&&raw.result||{}; let cfg=result.sdkConfig;
if(!cfg&&typeof result.fileContents==='string'){const m=result.fileContents.match(/initializeApp\((\{.*?\})\)/s);if(m)cfg=JSON.parse(m[1]);}
if(!cfg||typeof cfg!=='object')throw new Error('PUBLIC_FIREBASE_SDK_CONFIG_INVALID');
for(const k of ['apiKey','authDomain','projectId','appId']) if(!String(cfg[k]||'').trim())throw new Error('PUBLIC_FIREBASE_CONFIG_INCOMPLETE:'+k);
if(cfg.projectId!==PROJECT_ID)throw new Error('PUBLIC_FIREBASE_PROJECT_MISMATCH');
const canonical=Object.fromEntries(['apiKey','authDomain','projectId','appId','storageBucket'].map(k=>[k,cfg[k]||'']));
const cfgHash=crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(canonical).sort()))).digest('hex');
const buildId=`gi-i3-${SOURCE_SHA.slice(0,12)}-${cfgHash.slice(0,12)}`;
const payload={enabled:true,environmentRef:'firebase-hosting-preview-i3',tenantHint:TENANT_HINT,projectId:cfg.projectId,authDomain:cfg.authDomain,appId:cfg.appId,apiKey:cfg.apiKey,storageBucket:cfg.storageBucket||'',buildId,sourceSha:SOURCE_SHA,hydrationContractVersion:'fase-a-i2-20260905.3-ledger-server-owned',hydrationContractSource:'recovery/fase-a-clean-20260831',requiredCollections:['clientes','polizas','cobros','aseguradoras'],optionalCollections:['vehiculos','recibosEsperados','carteraPrimas','estadosCuentaAseguradora','recibosAseguradora','conciliacionesPrimas','conciliaciones','asesores','metas','negocios','gestiones','comisiones','cancelaciones']};
fs.writeFileSync(path.join(SITE,'product-runtime-config.js'),'/* Generated only inside the certified I3 artifact. Public Firebase Web config; no secrets. */\nwindow.__ORBIT360_PRODUCT_PUBLIC_CONFIG__ = Object.freeze('+JSON.stringify(payload)+');\n');
fs.mkdirSync(path.join(SITE,'__recovery__'),{recursive:true});fs.writeFileSync(path.join(SITE,'__recovery__/build.json'),JSON.stringify({product:'Gravicentra Insurance',gate:'I3',sourceSha:SOURCE_SHA,buildId,environmentRef:'firebase-hosting-preview-i3'})+'\n');
fs.writeFileSync(path.join(EVIDENCE,'public-config-descriptor.json'),JSON.stringify({projectId:cfg.projectId,authDomain:cfg.authDomain,appIdPresent:true,apiKeyPresent:true,storageBucketPresent:!!cfg.storageBucket,configSha256:cfgHash})+'\n');
fs.writeFileSync(path.join(BUNDLE,'firebase.json'),JSON.stringify({hosting:{site:HOSTING_SITE,public:'site',ignore:['firebase.json','firebase.backend.json','backend/**','**/.*','**/node_modules/**'],rewrites:[{source:'**',destination:'/index.html'}]}})+'\n');
fs.writeFileSync(path.join(BUNDLE,'firebase.backend.json'),JSON.stringify({functions:{source:'backend',runtime:'nodejs22',ignore:['node_modules','.git','firebase-debug.log','firebase-debug.*.log','*.local']}})+'\n');
fs.writeFileSync(path.join(BUNDLE,'.firebaserc'),JSON.stringify({projects:{default:PROJECT_ID}})+'\n');
function manifest(root,out){const files=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules')continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.isFile())files.push(p);}};walk(root);files.sort();const rows=files.map(p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')+'  '+path.relative(root,p).split(path.sep).join('/'));const text=rows.join('\n')+'\n';fs.writeFileSync(out,text);return{count:rows.length,digest:crypto.createHash('sha256').update(text).digest('hex')};}
const siteM=manifest(SITE,path.join(EVIDENCE,'site-manifest.sha256')); const backendM=manifest(BACKEND,path.join(EVIDENCE,'backend-manifest.sha256')); const bundleM=manifest(BUNDLE,path.join(EVIDENCE,'bundle-manifest.sha256'));
const output={buildId,hostedFileCount:siteM.count,hostedPayloadDigest:siteM.digest,backendFileCount:backendM.count,backendSourceDigest:backendM.digest,bundleFileCount:bundleM.count,bundleDigest:bundleM.digest,reachableProductFiles:seen.size};
fs.writeFileSync(path.join(EVIDENCE,'package-output.json'),JSON.stringify(output)+'\n'); console.log(JSON.stringify(output));
