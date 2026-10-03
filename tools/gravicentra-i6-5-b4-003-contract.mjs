import fs from 'node:fs';
import cp from 'node:child_process';

const need=(v,c)=>{if(!v)throw new Error(c);};
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>cp.execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim();

const paths={
  workflow:'functions/product-ops-leads-domain.js',
  operationalBackend:'functions/product-operational-domain.js',
  store:'orbit360-platform/data/store-firestore-product-operational-p0.js',
  base:'orbit360-platform/modules/renovaciones.js',
  bridge:'orbit360-platform/modules/renewals-v1200-operational-bridge.js',
  permission:'orbit360-platform/modules/renewals-v1200-permission-guard.js',
  issued:'orbit360-platform/modules/renewals-v1201-issued-filter.js',
  cancel:'orbit360-platform/modules/cancelaciones.js',
  index:'orbit360-platform/index.html',
  composition:'artifacts/orbit360-recovery/release-control/I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
  lock:'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B4_EXECUTION_LOCK_20261002.json',
  control:'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json',
  r1:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_20261003.json',
  r2:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_R2_20261003.json',
  r3:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_CAUSAL_SOURCE_FIX_R3_PREVIEW_ISOLATION_20261003.json',
  adjudication:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_DIAGNOSTIC_ADJUDICATION_20261003.json'
};
for(const p of Object.values(paths))need(fs.existsSync(p),'B4_003_REQUIRED_FILE_MISSING:'+p);

const workflow=read(paths.workflow),opBackend=read(paths.operationalBackend),store=read(paths.store),base=read(paths.base),bridge=read(paths.bridge),permission=read(paths.permission),issued=read(paths.issued),cancel=read(paths.cancel),index=read(paths.index);
const comp=json(paths.composition),lock=json(paths.lock),control=json(paths.control),r1=json(paths.r1),r2=json(paths.r2),r3=json(paths.r3),adj=json(paths.adjudication);

need(control.nextAction==='I6_5_FORENSIC_REMEDIATION_B4_003_CONTRACT_AND_EXACT_PREVIEW','B4_003_CONTROL_NEXT_ACTION_INVALID');
need(/^B4_003_SOURCE_FIXED_R3_/.test(String(control.currentB4?.status||'')),'B4_003_CONTROL_STATUS_INVALID');
need(/^B4_003_SOURCE_FIXED_R3_/.test(String(lock.status||''))&&lock.activeFinding?.id==='B4-003','B4_003_LOCK_STATUS_INVALID');
need(r1.status==='SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R1_RECEIPT_INVALID');
need(r2.status==='SOURCE_FIXED_R2_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R2_RECEIPT_INVALID');
need(r3.status==='SOURCE_FIXED_R3_PREVIEW_ISOLATION_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R3_RECEIPT_INVALID');
need(adj.status==='CAUSES_RECONCILED_NARROW_SOURCE_FIX_AUTHORIZED','B4_003_ADJUDICATION_INVALID');

need(/BUSINESS_MUTABLE_FIELDS[\s\S]*'polizaId','cancelacionId'/.test(workflow),'B4_003_RECOVERY_BUSINESS_LINK_FIELDS_MISSING');
need(/MANAGEMENT_MUTABLE_FIELDS[\s\S]*'negocioId','cancelacionId'/.test(workflow),'B4_003_RECOVERY_MANAGEMENT_LINK_FIELD_MISSING');
need(/BUSINESS_CREATE_EXTRA_FIELDS[\s\S]*'polizaId','cancelacionId'/.test(workflow),'B4_003_RECOVERY_BUSINESS_CREATE_LINK_FIELDS_MISSING');
need(/MANAGEMENT_CREATE_EXTRA_FIELDS[\s\S]*'cancelacionId'/.test(workflow),'B4_003_RECOVERY_MANAGEMENT_CREATE_LINK_FIELD_MISSING');

need(!/function\s+campana\s*\(/.test(base)&&!/function\s+solicitarPropuestas\s*\(/.test(base),'B4_003_LEGACY_RENEWAL_ACTION_OWNER_REMAINS');
need(/return\s*\{\s*render\s*\}/.test(base),'B4_003_BASE_RENDER_ONLY_CONTRACT_MISSING');
need(/!p\.renovadaPor/.test(base)&&/renovacionEstado/.test(base),'B4_003_BASE_RENEWED_FILTER_MISSING');
need(/mod\.campana\s*=\s*campana/.test(bridge)&&/mod\.solicitarPropuestas\s*=\s*solicitarPropuestas/.test(bridge)&&/mod\.registrarAceptacion\s*=\s*registrarAceptacion/.test(bridge),'B4_003_OPERATIONAL_RENEWAL_OWNER_INCOMPLETE');
need(/batchDurable/.test(bridge)&&/await\s+S\(\)\.batchDurable/.test(bridge),'B4_003_RENEWAL_CAMPAIGN_DURABLE_READBACK_MISSING');
need(/No fue posible confirmar la preparación\. No se registró un falso éxito\./.test(bridge),'B4_003_RENEWAL_FALSE_SUCCESS_GUARD_MISSING');
need(/!p\.renovadaPor/.test(bridge)&&/renovacionEstado/.test(bridge),'B4_003_OPERATIONAL_RENEWED_FILTER_MISSING');
need(!/mod\.render\s*=/.test(permission)&&!/setTimeout\s*\(/.test(permission),'B4_003_PERMISSION_SECOND_RENDER_FORBIDDEN');
need(!/mod\.render\s*=/.test(issued)&&!/setTimeout\s*\(/.test(issued),'B4_003_ISSUED_SECOND_RENDER_FORBIDDEN');

for(const token of ["await S().updateDurable('cancelaciones'","await S().updateDurable('negocios'","await S().insertDurable('negocios'","await S().updateDurable('gestiones'","await Orbit.ciclo.crearGestion"])need(cancel.includes(token),'B4_003_CANCEL_DURABLE_PATH_MISSING:'+token);
need(!/S\(\)\.update\('cancelaciones'/.test(cancel)&&!/S\(\)\.insert\('negocios'/.test(cancel)&&!/S\(\)\.update\('negocios'/.test(cancel)&&!/S\(\)\.update\('gestiones'/.test(cancel),'B4_003_CANCEL_OPTIMISTIC_CRITICAL_WRITE_REMAINS');
need(/No fue posible confirmar la recuperación\. No se registró un falso éxito\./.test(cancel),'B4_003_CANCEL_FALSE_SUCCESS_GUARD_MISSING');

need(/GENERAL_PREVIEW_COMMAND='orbit360ProductOperationalCommandPreview'/.test(store),'B4_003_GENERAL_PREVIEW_COMMAND_MISSING');
need(/previewGeneral\?GENERAL_PREVIEW_COMMAND:GENERAL_COMMAND/.test(store),'B4_003_GENERAL_PREVIEW_ROUTING_MISSING');
need(/previewGeneral\?'us-east1':'us-central1'/.test(store),'B4_003_GENERAL_PREVIEW_REGION_MISSING');
need(/b4003qa/.test(opBackend)&&/__syntheticQa/.test(opBackend),'B4_003_PREVIEW_SYNTHETIC_GUARD_MISSING');
need(/modules\/renovaciones\.js\?v=20261003-b4003r2/.test(index),'B4_003_BASE_CACHE_BINDING_MISSING');
need(/renewals-v1200-operational-bridge\.js\?v=20261003-b4003r3/.test(index),'B4_003_BRIDGE_CACHE_BINDING_MISSING');
need(/renewals-v1200-permission-guard\.js\?v=20261003-b4003r2/.test(index),'B4_003_PERMISSION_CACHE_BINDING_MISSING');
need(/renewals-v1201-issued-filter\.js\?v=20261003-b4003r2/.test(index),'B4_003_ISSUED_CACHE_BINDING_MISSING');
need(/cancelaciones\.js\?v=20261003-b4003r3/.test(index),'B4_003_CANCEL_CACHE_BINDING_MISSING');
need(/store-firestore-product-operational-p0\.js\?v=20261003-b4003r3/.test(index),'B4_003_STORE_CACHE_BINDING_MISSING');

const productPaths=[paths.workflow,paths.operationalBackend,paths.store,paths.base,paths.bridge,paths.permission,paths.issued,paths.cancel,paths.index];
const bindings=Object.fromEntries(productPaths.map(p=>[p,hash(p)]));
for(const [p,sha] of Object.entries(bindings)){
  need((comp.productFiles||[]).includes(p),'B4_003_COMPOSITION_PATH_MISSING:'+p);
  need(comp.productFileBlobs?.[p]===sha,'B4_003_COMPOSITION_BLOB_DRIFT:'+p);
}
need(comp.productFileCount===(comp.productFiles||[]).length,'B4_003_PRODUCT_FILE_COUNT_DRIFT');
need(comp.b4003SourceFix?.status==='SOURCE_FIXED_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R1_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR2?.status==='SOURCE_FIXED_R2_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R2_COMPOSITION_STATE_INVALID');
need(comp.b4003SourceFixR3?.status==='SOURCE_FIXED_R3_PREVIEW_ISOLATION_PENDING_CONTRACT_AND_EXACT_PREVIEW','B4_003_R3_COMPOSITION_STATE_INVALID');
need(lock.boundaries?.businessWritesAuthorized===false&&lock.boundaries?.dataMutationAuthorized===false&&lock.boundaries?.reimportAuthorized===false&&lock.boundaries?.livePromotionAuthorized===false,'B4_003_BOUNDARY_INVALID');
need(lock.boundaries?.syntheticQaWritesAuthorized===true,'B4_003_SYNTHETIC_QA_NOT_AUTHORIZED');

console.log(JSON.stringify({status:'PASS',contract:'B4_003_RENEWALS_CANCELATIONS_CONTRACT',exactBlobBindings:bindings,singleRenewalActionOwner:paths.bridge,noDelayedRenewalRenderOwners:true,durableRenewalCampaign:true,durableCancelationRecovery:true,previewGeneralWritesIsolated:true,productFileCount:comp.productFileCount},null,2));
