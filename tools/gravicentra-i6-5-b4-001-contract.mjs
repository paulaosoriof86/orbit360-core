import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const need=(v,c)=>{if(!v)throw new Error(c);};
const ciclo=read('orbit360-platform/core/ciclo.js');
const portal=read('orbit360-platform/modules/portal.js');
const store=read('orbit360-platform/data/store-firestore-product-operational-p0.js');
const backend=read('functions/product-ops-leads-domain.js');
const index=read('orbit360-platform/index.html');

need(!/['"]ase001['"]/.test(ciclo),'B4_001_HARDCODED_ADVISOR_FALLBACK');
need(/async function setEtapa\(/.test(ciclo)&&/await S\(\)\.updateDurable\('negocios'/.test(ciclo),'B4_001_BUSINESS_TRANSITION_NOT_DURABLE');
need(/function crearGestion\(g\)\s*\{\s*return crearGestionDurable\(g\);/s.test(ciclo),'B4_001_LEGACY_MANAGEMENT_ENTRY_NOT_DURABLE');
need(!/S\(\)\.insert\('gestiones'/.test(ciclo),'B4_001_DIRECT_GESTION_INSERT_REMAINS');
need(/await S\(\)\.insertDurable\('negocios', n\)/.test(ciclo),'B4_001_NEW_BUSINESS_NOT_DURABLE');
need(/await S\(\)\.updateDurable\('gestiones', id, \{ estado: 'Resuelta'/.test(ciclo),'B4_001_RESOLVE_MANAGEMENT_NOT_DURABLE');
need(/await S\(\)\.updateDurable\('gestiones', id, \{ estado: 'Pendiente'/.test(ciclo),'B4_001_REOPEN_MANAGEMENT_NOT_DURABLE');
need(/await S\(\)\.updateDurable\('gestiones', id, \{ archivado: true/.test(ciclo),'B4_001_ARCHIVE_MANAGEMENT_NOT_DURABLE');

need(/drawer\('🗂 Solicitar una gestión', html, async \(\) =>/.test(portal),'B4_001_PORTAL_CALLBACK_NOT_ASYNC');
need(/await Orbit\.ciclo\.crearGestionDurable\(/.test(portal),'B4_001_PORTAL_MANAGEMENT_NOT_DURABLE');
need(/if \(!gestion \|\| !gestion\.id\) throw new Error\('PORTAL_MANAGEMENT_CANONICAL_READBACK_REQUIRED'\)/.test(portal),'B4_001_PORTAL_READBACK_GUARD_MISSING');
need(/await S\(\)\.insertDurable\('actividades'/.test(portal),'B4_001_PORTAL_ACTIVITY_PRECOMMIT');
need(!/Orbit\.ciclo\.crearGestion\(\{/.test(portal),'B4_001_PORTAL_LEGACY_CREATE_REMAINS');
need(/No fue posible confirmar la solicitud\. No se registró un falso éxito\./.test(portal),'B4_001_PORTAL_FALSE_SUCCESS_GUARD_MISSING');

need(/if\(action==='insert'\)\{[\s\S]*?return \/portal\|solicitud del cliente\/.test\(origin\)\?'portal_request':'create_management';/.test(store),'B4_001_PORTAL_OPERATION_MAPPING_MISSING');
need(/if\(operation==='portal_request'\)return'Solicitud de gestión desde Portal del Cliente';/.test(store),'B4_001_PORTAL_REASON_MISSING');
need(/WORKFLOW_PREVIEW_COMMAND='orbit360OpsLeadsCommandPreview'/.test(store),'B4_001_PREVIEW_WORKFLOW_TRANSPORT_MISSING');

need(/'portal_request'/.test(backend),'B4_001_BACKEND_PORTAL_REQUEST_MISSING');
need(/advisorAllowed\(authz\.member/.test(backend),'B4_001_BACKEND_SCOPE_GUARD_MISSING');
need(/tx\.set\(outboxRef/.test(backend),'B4_001_BACKEND_OUTBOX_MISSING');
need(/canonicalReadback:true/.test(backend),'B4_001_BACKEND_READBACK_MISSING');

need(index.includes('core/ciclo.js?v=20261002-b4001'),'B4_001_INDEX_CICLO_IDENTITY_MISSING');
need(index.includes('modules/portal.js?v=20261002-b4001'),'B4_001_INDEX_PORTAL_IDENTITY_MISSING');
need(index.includes('data/store-firestore-product-operational-p0.js?v=20261002-b4001'),'B4_001_INDEX_STORE_IDENTITY_MISSING');

console.log(JSON.stringify({
  status:'PASS',
  findingId:'B4-001',
  assertions:{
    noHardcodedAdvisor:true,
    durableBusinessTransitions:true,
    durableManagementEntries:true,
    portalDurableReadback:true,
    portalExplicitOperation:true,
    backendScopeGuard:true,
    backendOutbox:true,
    indexAssetIdentity:true
  }
},null,2));
