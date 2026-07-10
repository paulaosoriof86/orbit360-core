import { createDocumentSourceResolverP09d } from './orbit360-document-source-resolver-p09d.mjs';
import { createDocumentBackendBridgeP09c } from './orbit360-document-backend-bridge-p09c.mjs';

const VERSION='p09k-v1';
function clean(value){ return String(value == null ? '' : value).trim(); }
function sanitize(value,depth=0){
  if(depth>14) return '[depth_limited]';
  if(value==null || ['string','number','boolean'].includes(typeof value)) return value;
  if(Array.isArray(value)) return value.slice(0,5000).map(v=>sanitize(v,depth+1));
  if(typeof value!=='object') return String(value);
  const out={};
  for(const [key,item] of Object.entries(value)){
    if(/^(?:localPath|path|mountedPath|raw|bytes|binary|base64|apiKey|token|secret|password|credential|authorization)$/i.test(key)) continue;
    out[key]=sanitize(item,depth+1);
  }
  return out;
}
function actorErrors(actor,tenantId){
  const errors=[]; const id=clean(actor?.id||actor?.uid||actor?.email); const actorTenant=clean(actor?.tenantId||actor?.tenant);
  if(!id) errors.push('ACTOR_REQUIRED');
  if(actorTenant && actorTenant!==clean(tenantId)) errors.push('ACTOR_TENANT_MISMATCH');
  return errors;
}
export function createDocumentBackendCapabilityP09k(options={}){
  const registry=options.registry;
  if(!registry || typeof registry.lookupReference!=='function' || typeof registry.batchReferences!=='function') throw Object.assign(new Error('REFERENCE_REGISTRY_REQUIRED'),{code:'REFERENCE_REGISTRY_REQUIRED'});
  const resolver=createDocumentSourceResolverP09d({
    lookupReference:registry.lookupReference,
    markReferenceUsed:registry.markReferenceUsed,
    allowedTenants:options.allowedTenants||['alianzas-soluciones'],
    clock:options.clock
  });
  const runner=createDocumentBackendBridgeP09c({...options,resolveSource:resolver});
  async function status(){
    const runnerState=await runner.status(); const registryState=registry.status();
    return {
      connected:runnerState.connected===true && registryState.connected===true,
      status:runnerState.connected===true && registryState.connected===true?'connected':'backend_required',
      code:runnerState.connected===true && registryState.connected===true?'DOCUMENT_BACKEND_CAPABILITY_READY':(!registryState.connected?'REFERENCE_REGISTRY_EMPTY':runnerState.code),
      version:VERSION,tasks:runnerState.tasks||[],deterministic:true,externalAi:false,metadataOnly:true,
      registry:{total:registryState.total,tenants:registryState.tenants,documents:registryState.documents,containsLocalPaths:false},
      containsLocalPaths:false,containsSecrets:false,writeAllowed:false
    };
  }
  async function resolveBatchReferences(request={}){
    const errors=actorErrors(request.actor,request.tenantId);
    if(errors.length) return {connected:false,ok:false,code:errors[0],errors,sourceRefs:{},items:[],referencesExposed:false,containsLocalPaths:false,writeAllowed:false};
    const resolved=registry.batchReferences(request);
    return {
      connected:resolved.ok===true,ok:resolved.ok===true,code:resolved.code,errors:resolved.errors||[],
      sourceRefs:resolved.sourceRefs||{},items:resolved.items||[],total:resolved.total||0,provided:resolved.provided||0,missing:resolved.missing||[],
      referencesExposed:false,containsLocalPaths:false,containsSecrets:false,writeAllowed:false,enablesCotizador:false,enablesComparativo:false
    };
  }
  async function execute(task,request={}){
    const errors=actorErrors(request.actor,request.tenantId);
    if(errors.length){ const error=new Error(errors[0]); error.code=errors[0]; throw error; }
    const result=await runner.execute(task,request);
    return sanitize(result);
  }
  return {
    VERSION,status,execute,resolveBatchReferences,
    prepareBatchReferences:resolveBatchReferences,
    resolveSourceReferences:resolveBatchReferences,
    referencesForBatch:resolveBatchReferences,
    containsLocalPaths:false,containsSecrets:false,writeAllowed:false
  };
}
