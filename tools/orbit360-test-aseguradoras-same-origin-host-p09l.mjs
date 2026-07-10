import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createSameOriginHostP09l, transformIndexP09l } from './orbit360-aseguradoras-same-origin-host-p09l.mjs';

function assert(condition,message){ if(!condition) throw new Error(message); }
function hash(value){ return crypto.createHash('sha256').update(value).digest('hex'); }

const appRoot=path.resolve('orbit360-platform');
const indexPath=path.join(appRoot,'index.html');
const original=fs.readFileSync(indexPath,'utf8');
const transformed=transformIndexP09l(original);
assert(transformed.includes('core/backend-lab-security-guard.js?v=p09l'),'debe inyectar security guard sin modificar disco');
assert(transformed.includes('core/aseguradoras-same-origin-document-bridge-p09l.js?v=p09l'),'debe inyectar bridge same-origin');
assert(transformed.includes('core/aseguradoras-runtime-bootstrap-p09f.js?v=p09l'),'debe inyectar bootstrap');
const order=['data/store-firestore-lab.local.js','core/backend-lab-security-guard.js','core/aseguradoras-same-origin-document-bridge-p09l.js','core/aseguradoras-runtime-bootstrap-p09f.js','modules/aseguradoras.js'];
let last=-1;
for(const item of order){ const at=transformed.indexOf(item); assert(at>last,`orden inválido: ${item}`); last=at; }

let referenceCalls=0; let executeCalls=0;
const capability={
  async status(){ return {connected:true,status:'connected',code:'DOCUMENT_BACKEND_CAPABILITY_READY',tasks:['excel_manifest','pdf_manifest'],version:'fixture',metadataOnly:true,writeAllowed:false}; },
  async resolveBatchReferences(request){
    referenceCalls+=1;
    assert(request.tenantId==='alianzas-soluciones','tenant debe conservarse');
    assert(request.actor?.activeRole==='Dirección','actor debe llegar al host');
    const refs={}; request.documentIds.forEach(id=>{ refs[id]=`backend-ref://alianzas-soluciones/${id}/v1`; });
    return {ok:true,connected:true,code:'BATCH_REFERENCES_RESOLVED',sourceRefs:refs,items:request.documentIds.map(documentId=>({documentId,provided:true,referenceValueExposed:false})),total:request.documentIds.length,provided:request.documentIds.length,missing:[],referencesExposed:false,containsLocalPaths:false,writeAllowed:false};
  },
  async execute(task,request){
    executeCalls+=1;
    assert(task==='excel_manifest','debe ejecutar tarea solicitada');
    assert(request.actor?.id==='actor-1','actor debe llegar al runner');
    return {ok:true,code:'EXCEL_MANIFEST_READY_FOR_REVIEW',documentId:request.documentId,manifest:{documentId:request.documentId,flags:{containsCustomerPayload:false}},writeAllowed:false,enablesCotizador:false,enablesComparativo:false};
  }
};

const host=createSameOriginHostP09l({appRoot,capability,discovery:{records:[{documentId:'doc-1'}],issues:[]}});
const ready=await host.start();
assert(ready.host==='127.0.0.1' && ready.sameOrigin===true,'host debe limitarse a loopback same-origin');
try{
  let response=await fetch(`${ready.origin}/__orbit360/status`);
  assert(response.status===401,'API sin sesión debe bloquearse');

  response=await fetch(ready.bootstrapUrl,{redirect:'manual'});
  assert(response.status===302,'bootstrap debe crear sesión y redirigir');
  const setCookie=response.headers.get('set-cookie')||'';
  const cookie=setCookie.split(';')[0];
  assert(cookie.startsWith('orbit360_p09l_session='),'sesión debe usar cookie HttpOnly dedicada');
  assert(/HttpOnly/i.test(setCookie) && /SameSite=Strict/i.test(setCookie),'cookie debe ser HttpOnly y SameSite Strict');
  const location=response.headers.get('location');
  assert(location.includes('orbitBackend=firestore-lab') && location.includes('#/aseguradoras'),'debe abrir Aseguradoras en contexto LAB');

  response=await fetch(`${ready.origin}${location}`,{headers:{Cookie:cookie}});
  assert(response.status===200,'index autenticado debe servirse');
  const html=await response.text();
  assert(html.includes('aseguradoras-same-origin-document-bridge-p09l.js'),'index servido debe incluir bridge temporal');
  assert(hash(fs.readFileSync(indexPath,'utf8'))===hash(original),'index en disco debe permanecer intacto');

  response=await fetch(`${ready.origin}/core/aseguradoras-same-origin-document-bridge-p09l.js`,{headers:{Cookie:cookie}});
  const bridgeText=await response.text();
  assert(response.status===200 && bridgeText.includes('OrbitBackendDocumentBridge'),'debe servir cliente bridge same-origin');

  response=await fetch(`${ready.origin}/__orbit360/status`,{headers:{Cookie:cookie}});
  const status=await response.json();
  assert(status.connected===true && status.containsLocalPaths===false,'status debe ser seguro y conectado');
  assert(!JSON.stringify(status).includes(appRoot),'status no debe exponer rutas');

  response=await fetch(`${ready.origin}/__orbit360/references`,{
    method:'POST',headers:{Cookie:cookie,Origin:ready.origin,'Content-Type':'application/json'},
    body:JSON.stringify({tenantId:'alianzas-soluciones',batchId:'batch-1',documentIds:['doc-1'],purpose:'training',actor:{id:'actor-1',tenantId:'alianzas-soluciones',activeRole:'Dirección'}})
  });
  const refs=await response.json();
  assert(response.status===200 && refs.provided===1 && referenceCalls===1,'debe resolver referencia autorizada');
  assert(refs.referencesExposed===false && refs.containsLocalPaths===false,'respuesta no debe exponer rutas');
  assert(!JSON.stringify(refs).includes(appRoot),'referencias públicas no deben incluir raíz');

  response=await fetch(`${ready.origin}/__orbit360/run`,{
    method:'POST',headers:{Cookie:cookie,Origin:ready.origin,'Content-Type':'application/json'},
    body:JSON.stringify({task:'excel_manifest',request:{tenantId:'alianzas-soluciones',aseguradoraId:'ins_demo',documentId:'doc-1',fileRef:'backend-ref://alianzas-soluciones/doc-1/v1',purpose:'training',actor:{id:'actor-1',tenantId:'alianzas-soluciones',activeRole:'Dirección'}}})
  });
  const run=await response.json();
  assert(response.status===200 && run.ok===true && executeCalls===1,'debe ejecutar inspector por host');
  assert(run.writeAllowed===false && run.enablesCotizador===false && run.enablesComparativo===false,'host nunca habilita ni escribe');

  response=await fetch(`${ready.origin}/__orbit360/references`,{
    method:'POST',headers:{Cookie:cookie,Origin:'http://malicious.invalid','Content-Type':'application/json'},
    body:'{}'
  });
  assert(response.status===403,'origen ajeno debe bloquearse');
} finally {
  await host.stop();
}
assert(hash(fs.readFileSync(indexPath,'utf8'))===hash(original),'smoke no debe modificar index');
console.log('OK orbit360-test-aseguradoras-same-origin-host-p09l');
