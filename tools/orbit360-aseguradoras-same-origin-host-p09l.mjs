#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildRegistryFromCatalogP09k } from './orbit360-document-reference-registry-p09k.mjs';
import { createDocumentBackendCapabilityP09k } from './orbit360-document-backend-capability-p09k.mjs';

const VERSION = 'p09l-v1';
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 1024 * 1024;
const COOKIE_NAME = 'orbit360_p09l_session';
const ALLOWED_ROLES = new Set(['superadmin','super_admin','direccion','admin','admintenant','admin_tenant','operativo']);
const MIME = Object.freeze({
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon',
  '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.pdf':'application/pdf'
});

function clean(value){ return String(value == null ? '' : value).trim(); }
function norm(value){ return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''); }
function unique(values){ return Array.from(new Set((values || []).filter(Boolean))); }
function within(root,candidate){
  const rel=path.relative(root,candidate);
  return rel==='' || (!rel.startsWith('..'+path.sep) && rel!=='..' && !path.isAbsolute(rel));
}
function sanitize(value,depth=0){
  if(depth>18) return '[depth_limited]';
  if(value==null || ['string','number','boolean'].includes(typeof value)) return value;
  if(Array.isArray(value)) return value.slice(0,10000).map(item=>sanitize(item,depth+1));
  if(typeof value!=='object') return String(value);
  const out={};
  for(const [key,item] of Object.entries(value)){
    if(/^(?:localPath|path|mountedPath|resolvedPath|root|roots|allowedRoots|raw|rawBytes|bytes|binary|base64|apiKey|token|secret|password|credential|authorization)$/i.test(key)) continue;
    out[key]=sanitize(item,depth+1);
  }
  return out;
}
function randomToken(bytes=32){ return crypto.randomBytes(bytes).toString('base64url'); }
function parseCookies(header){
  const out={};
  clean(header).split(';').forEach(part=>{ const index=part.indexOf('='); if(index>0) out[part.slice(0,index).trim()]=part.slice(index+1).trim(); });
  return out;
}
function safeJson(res,status,payload){
  const body=JSON.stringify(sanitize(payload || {}));
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body)});
  res.end(body);
}
function securityHeaders(res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}
function actorErrors(actor,tenantId){
  const errors=[]; const id=clean(actor?.id||actor?.uid||actor?.email); const role=norm(actor?.activeRole||actor?.rolActivo||actor?.role||actor?.rol);
  const actorTenant=clean(actor?.tenantId||actor?.tenant);
  if(!id) errors.push('ACTOR_REQUIRED');
  if(!role || !ALLOWED_ROLES.has(role)) errors.push('ACTIVE_ROLE_NOT_AUTHORIZED');
  if(actorTenant && actorTenant!==clean(tenantId)) errors.push('ACTOR_TENANT_MISMATCH');
  return errors;
}
function injectAfter(html,pattern,markup,label){
  if(html.includes(markup.match(/src="([^"]+)/)?.[1] || markup)) return html;
  const match=html.match(pattern);
  if(!match) throw Object.assign(new Error('INDEX_ANCHOR_MISSING:'+label),{code:'INDEX_ANCHOR_MISSING'});
  return html.replace(match[0],match[0]+'\n'+markup);
}
function injectBefore(html,pattern,markup,label){
  const marker=markup.match(/src="([^"]+)/)?.[1] || markup;
  if(html.includes(marker)) return html;
  const match=html.match(pattern);
  if(!match) throw Object.assign(new Error('INDEX_ANCHOR_MISSING:'+label),{code:'INDEX_ANCHOR_MISSING'});
  return html.replace(match[0],markup+'\n'+match[0]);
}
export function transformIndexP09l(source){
  let html=String(source || '');
  if(!/<meta[^>]+charset=["']?utf-8/i.test(html)) throw Object.assign(new Error('INDEX_UTF8_REQUIRED'),{code:'INDEX_UTF8_REQUIRED'});
  if(!html.includes('core/backend-lab-loader.js')) html=injectBefore(html,/<script[^>]+src=["']data\/store\.js[^>]*><\/script>/i,'  <script src="core/backend-lab-loader.js?v=p09l"></script>\n  <script src="core/backend-lab-init.js?v=p09l"></script>','store');
  if(!html.includes('core/backend-lab-security-guard.js')) html=injectAfter(html,/<script[^>]+src=["']data\/store-firestore-lab\.local\.js[^>]*><\/script>/i,'  <script src="core/backend-lab-security-guard.js?v=p09l"></script>','store-lab');
  html=injectBefore(html,/<script[^>]+src=["']modules\/aseguradoras\.js[^>]*><\/script>/i,'  <script src="core/aseguradoras-same-origin-document-bridge-p09l.js?v=p09l"></script>','aseguradoras');
  html=injectBefore(html,/<script[^>]+src=["']modules\/aseguradoras\.js[^>]*><\/script>/i,'  <script src="core/aseguradoras-runtime-bootstrap-p09f.js?v=p09l"></script>','aseguradoras');
  const order=['core/backend-lab-loader.js','core/backend-lab-init.js','data/store.js','data/store-firestore-lab.local.js','core/backend-lab-security-guard.js','core/aseguradoras-same-origin-document-bridge-p09l.js','core/aseguradoras-runtime-bootstrap-p09f.js','modules/aseguradoras.js'];
  let last=-1;
  for(const item of order){ const at=html.indexOf(item); if(at<0 || at<=last) throw Object.assign(new Error('INDEX_ORDER_INVALID:'+item),{code:'INDEX_ORDER_INVALID'}); last=at; }
  return html;
}
function readBody(req){
  return new Promise((resolve,reject)=>{
    const chunks=[]; let total=0;
    req.on('data',chunk=>{ total+=chunk.length; if(total>MAX_BODY_BYTES){ reject(Object.assign(new Error('REQUEST_BODY_TOO_LARGE'),{code:'REQUEST_BODY_TOO_LARGE'})); req.destroy(); return; } chunks.push(chunk); });
    req.on('end',()=>{ try{ resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}); } catch(error){ reject(Object.assign(new Error('REQUEST_JSON_INVALID'),{code:'REQUEST_JSON_INVALID'})); } });
    req.on('error',reject);
  });
}
function staticFile(appRoot,urlPath){
  const decoded=decodeURIComponent(urlPath.split('?')[0]);
  const relative=decoded==='/'?'index.html':decoded.replace(/^\/+/, '');
  if(relative.includes('\0')) throw Object.assign(new Error('STATIC_PATH_INVALID'),{code:'STATIC_PATH_INVALID'});
  const candidate=path.resolve(appRoot,relative);
  if(!within(appRoot,candidate)) throw Object.assign(new Error('STATIC_PATH_FORBIDDEN'),{code:'STATIC_PATH_FORBIDDEN'});
  return candidate;
}
function parseArgs(argv){
  const out={roots:[]};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i]; const next=argv[i+1];
    if(key==='--root' && next){ out.roots.push(next); i+=1; }
    else if(key==='--app' && next){ out.appRoot=next; i+=1; }
    else if(key==='--catalog' && next){ out.catalogPath=next; i+=1; }
    else if(key==='--private-records' && next){ out.privateRecordsPath=next; i+=1; }
    else if(key==='--port' && next){ out.port=Number(next); i+=1; }
    else if(key==='--ready-file' && next){ out.readyFile=next; i+=1; }
    else if(key==='--python' && next){ out.pythonExecutable=next; i+=1; }
  }
  return out;
}
function loadJson(filePath,fallback){
  if(!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath,'utf8'));
}
export function buildCapabilityP09l(options={}){
  if(options.capability) return {capability:options.capability,discovery:options.discovery||{records:[],issues:[]}};
  const catalogFile=path.resolve(options.catalogPath);
  const catalogDoc=loadJson(catalogFile,{sources:[]});
  const privateDoc=loadJson(options.privateRecordsPath,{records:[]});
  const built=buildRegistryFromCatalogP09k(catalogDoc.sources||catalogDoc,{
    allowedRoots:options.allowedRoots||[], privateRecords:privateDoc.records||privateDoc,
    allowedTenants:['alianzas-soluciones']
  });
  const capability=createDocumentBackendCapabilityP09k({
    registry:built.registry, allowedTenants:['alianzas-soluciones'], allowedRoots:options.allowedRoots||[],
    toolsRoot:options.toolsRoot, pythonExecutable:options.pythonExecutable, region:'local-lab'
  });
  return {capability,discovery:built.discovery};
}
export function createSameOriginHostP09l(options={}){
  const appRoot=fs.realpathSync(path.resolve(options.appRoot));
  const indexPath=path.join(appRoot,'index.html');
  if(!fs.existsSync(indexPath)) throw Object.assign(new Error('APP_INDEX_REQUIRED'),{code:'APP_INDEX_REQUIRED'});
  const sessionId=randomToken(); const bootstrapNonce=randomToken();
  const built=buildCapabilityP09l(options); const capability=built.capability;
  let server=null; let origin='';
  function authorized(req){ return parseCookies(req.headers.cookie||'')[COOKIE_NAME]===sessionId; }
  function sameOrigin(req){
    const expected=origin; const supplied=clean(req.headers.origin); const referer=clean(req.headers.referer);
    return (!supplied || supplied===expected) && (!referer || referer.startsWith(expected+'/'));
  }
  async function handler(req,res){
    securityHeaders(res);
    const requestUrl=new URL(req.url||'/',origin||`http://${HOST}`);
    if(req.method==='GET' && requestUrl.pathname===`/__orbit360/session/${bootstrapNonce}`){
      res.setHeader('Set-Cookie',`${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=14400`);
      res.writeHead(302,{Location:'/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones#/aseguradoras'}); res.end(); return;
    }
    if(!authorized(req)){ safeJson(res,401,{ok:false,code:'P09L_SESSION_REQUIRED'}); return; }
    if(requestUrl.pathname.startsWith('/__orbit360/')){
      if(!sameOrigin(req)){ safeJson(res,403,{ok:false,code:'P09L_ORIGIN_FORBIDDEN'}); return; }
      if(req.method==='GET' && requestUrl.pathname==='/__orbit360/status'){
        const status=await capability.status();
        safeJson(res,200,Object.assign({},status,{hostVersion:VERSION,sameOrigin:true,discovery:{records:(built.discovery.records||[]).length,issues:(built.discovery.issues||[]).map(item=>({documentId:clean(item.documentId),code:clean(item.code)}))},containsLocalPaths:false,containsSecrets:false,writeAllowed:false})); return;
      }
      if(req.method==='POST' && requestUrl.pathname==='/__orbit360/references'){
        const body=await readBody(req); const tenantId=clean(body.tenantId||'alianzas-soluciones');
        const errors=actorErrors(body.actor,tenantId);
        if(tenantId!=='alianzas-soluciones') errors.push('TENANT_NOT_ALLOWED');
        if(errors.length){ safeJson(res,403,{ok:false,connected:false,code:errors[0],errors,referencesExposed:false,containsLocalPaths:false,writeAllowed:false}); return; }
        const result=await capability.resolveBatchReferences(Object.assign({},body,{tenantId,purpose:'training'}));
        safeJson(res,200,Object.assign({},result,{referencesExposed:false,containsLocalPaths:false,containsSecrets:false,writeAllowed:false,enablesCotizador:false,enablesComparativo:false})); return;
      }
      if(req.method==='POST' && requestUrl.pathname==='/__orbit360/run'){
        const body=await readBody(req); const task=clean(body.task); const request=body.request||{}; const tenantId=clean(request.tenantId||'alianzas-soluciones');
        const errors=actorErrors(request.actor,tenantId);
        if(tenantId!=='alianzas-soluciones') errors.push('TENANT_NOT_ALLOWED');
        if(errors.length){ safeJson(res,403,{ok:false,code:errors[0],errors,writeAllowed:false}); return; }
        try{
          const result=await capability.execute(task,Object.assign({},request,{tenantId,purpose:'training',includeSensitiveValues:false}));
          safeJson(res,200,Object.assign({},result,{containsLocalPaths:false,containsSecrets:false,writeAllowed:false,enablesCotizador:false,enablesComparativo:false}));
        }catch(error){ safeJson(res,422,{ok:false,code:clean(error?.code||error?.message||'DOCUMENT_TASK_FAILED'),errors:[clean(error?.message||error)],containsLocalPaths:false,writeAllowed:false}); }
        return;
      }
      safeJson(res,404,{ok:false,code:'P09L_ENDPOINT_NOT_FOUND'}); return;
    }
    if(req.method!=='GET' && req.method!=='HEAD'){ safeJson(res,405,{ok:false,code:'METHOD_NOT_ALLOWED'}); return; }
    try{
      const filePath=staticFile(appRoot,requestUrl.pathname);
      if(!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()){ safeJson(res,404,{ok:false,code:'STATIC_FILE_NOT_FOUND'}); return; }
      const ext=path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type',MIME[ext]||'application/octet-stream');
      if(path.basename(filePath)==='index.html'){
        const html=transformIndexP09l(fs.readFileSync(filePath,'utf8'));
        res.setHeader('Content-Length',Buffer.byteLength(html));
        if(req.method==='HEAD'){ res.end(); return; }
        res.end(html); return;
      }
      const stat=fs.statSync(filePath); res.setHeader('Content-Length',stat.size);
      if(req.method==='HEAD'){ res.end(); return; }
      fs.createReadStream(filePath).pipe(res);
    }catch(error){ safeJson(res,400,{ok:false,code:clean(error?.code||error?.message||'STATIC_REQUEST_FAILED')}); }
  }
  return {
    VERSION,
    async start(){
      if(server) return {origin,bootstrapUrl:`${origin}/__orbit360/session/${bootstrapNonce}`};
      server=http.createServer((req,res)=>Promise.resolve(handler(req,res)).catch(error=>safeJson(res,500,{ok:false,code:clean(error?.code||error?.message||'P09L_HOST_FAILED')})));
      await new Promise((resolve,reject)=>{ server.once('error',reject); server.listen(Number(options.port||0),HOST,resolve); });
      const address=server.address(); origin=`http://${HOST}:${address.port}`;
      return {origin,bootstrapUrl:`${origin}/__orbit360/session/${bootstrapNonce}`,host:HOST,port:address.port,sessionCookieHttpOnly:true,sameOrigin:true,writeAllowed:false};
    },
    async stop(){ if(!server) return; await new Promise(resolve=>server.close(resolve)); server=null; },
    status(){ return {running:!!server,origin,host:HOST,sameOrigin:true,containsLocalPaths:false,containsSecrets:false,writeAllowed:false}; },
    discovery:sanitize(built.discovery)
  };
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const appRoot=path.resolve(args.appRoot||path.join(repoRoot,'orbit360-platform'));
  const catalogPath=path.resolve(args.catalogPath||path.join(appRoot,'data','tenant-alianzas-soluciones-source-catalog-p09k.json'));
  const roots=unique(args.roots.map(value=>path.resolve(value)).filter(value=>fs.existsSync(value)));
  if(!roots.length) throw Object.assign(new Error('ALLOWED_ROOT_REQUIRED_USE_ROOT'),{code:'ALLOWED_ROOT_REQUIRED_USE_ROOT'});
  const host=createSameOriginHostP09l({
    appRoot,catalogPath,allowedRoots:roots,privateRecordsPath:args.privateRecordsPath&&path.resolve(args.privateRecordsPath),
    toolsRoot:path.join(repoRoot,'tools'),pythonExecutable:args.pythonExecutable,port:args.port
  });
  const ready=await host.start();
  const publicReady={event:'ORBIT360_P09L_READY',version:VERSION,origin:ready.origin,bootstrapUrl:ready.bootstrapUrl,discovery:{records:(host.discovery.records||[]).length,issues:(host.discovery.issues||[]).length},containsLocalPaths:false,writeAllowed:false};
  if(args.readyFile){ fs.mkdirSync(path.dirname(path.resolve(args.readyFile)),{recursive:true}); fs.writeFileSync(path.resolve(args.readyFile),JSON.stringify(publicReady,null,2),{encoding:'utf8',mode:0o600}); }
  process.stdout.write(JSON.stringify(publicReady)+'\n');
  const shutdown=async()=>{ await host.stop(); process.exit(0); };
  process.on('SIGINT',shutdown); process.on('SIGTERM',shutdown);
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{ process.stderr.write(JSON.stringify({ok:false,code:clean(error?.code||error?.message||'P09L_START_FAILED')})+'\n'); process.exit(1); });
}
