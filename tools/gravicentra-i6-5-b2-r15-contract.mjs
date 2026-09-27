import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const need=(v,c)=>{if(!v)throw new Error(c);};
const has=(s,x,c)=>need(s.includes(x),c);

const idx=read('orbit360-platform/index.html');
const css=read('orbit360-platform/styles/base.css');
const c360=read('orbit360-platform/modules/cliente360.js');
const ciclo=read('orbit360-platform/core/ciclo.js');
const renew=read('orbit360-platform/modules/renewals-v1200-operational-bridge.js');
const policy=read('orbit360-platform/modules/policy-receipts-v1199-detail-guard.js');
const del=read('orbit360-platform/core/record-delete.js');
const store=read('orbit360-platform/data/store-firestore-product-operational-p0.js');
const imports=read('orbit360-platform/core/importa.js');
const resources=read('orbit360-platform/core/backend-resource-contracts.js');
const driveClient=read('orbit360-platform/core/product-drive-document-provider-p0.js');
const driveBackend=read('functions/document-drive-domain.js');
const cobros=read('orbit360-platform/modules/cobros.js');
const siniestros=read('orbit360-platform/modules/siniestros.js');
const cancelaciones=read('orbit360-platform/modules/cancelaciones.js');
const comisiones=read('orbit360-platform/modules/comisiones.js');

has(idx,'core/record-delete.js?v=20260927-b2r15','R15_DELETE_OWNER_NOT_COMPOSED');
has(idx,'core/product-drive-document-provider-p0.js?v=20260927-b2r15','R15_DRIVE_PROVIDER_NOT_COMPOSED');

has(css,'.c360-search{','R74_MOBILE_SEARCH_STYLE_MISSING');
has(css,'.tb-logo{','R73_TENANT_LOGO_MOBILE_CONTRACT_MISSING');
has(css,'.c360-renewal-row{','R75_RENEWAL_RESPONSIVE_CONTRACT_MISSING');
has(c360,'class="c360-search"','R74_CLIENT_SEARCH_OWNER_NOT_FIXED');
has(c360,"['documentos', 'Documentos', '📎']",'R81_CLIENT_DOCUMENTS_TAB_MISSING');
has(c360,'data-doc-connect','R81_DRIVE_CONNECT_ENTRYPOINT_MISSING');

has(ciclo,'function managementCreateModal(opts)','R76_CANONICAL_MANAGEMENT_EDITOR_MISSING');
has(ciclo,"return managementCreateModal({ origen: 'Ops'","R76_OPS_STILL_SPLIT");
has(ciclo,'id="mg-drive-connect"','R77_MANAGEMENT_DRIVE_CONNECT_MISSING');
has(ciclo,"Orbit.recordDelete.remove('gestiones'","R78_MANAGEMENT_DELETE_MISSING");
need(!ciclo.includes("adjuntos: files.map(f => ({ nombre: f.name, size: f.size }))"),'R77_METADATA_ONLY_ATTACHMENT_PATH_REMAINS');

has(renew,'Orbit.ciclo.managementCreateModal','R76_RENEWALS_NOT_USING_CANONICAL_EDITOR');
has(renew,"workflowType:'renewal_proposals'",'R76_RENEWAL_PROPOSAL_CONTEXT_MISSING');
has(renew,"workflowType:'renewal_accepted'",'R76_RENEWAL_ACCEPTED_CONTEXT_MISSING');

has(policy,'const renewalWindowDays = 45','R79_RENEWAL_WINDOW_MISSING');
has(policy,"renewals.solicitarPropuestas(policyId)",'R79_POLICY_RENEWAL_FALSE_ACCEPTANCE');
has(policy,'function vehicleIdentity(item)','R80_CANONICAL_VEHICLE_IDENTITY_MISSING');
has(policy,"return 'PLATE:' + plate",'R80_PLATE_DEDUP_MISSING');

for(const collection of ['clientes','polizas','vehiculos','cobros','gestiones','negocios','reclamos','cancelaciones','comisiones','asesores','aseguradoras']){
  has(del,collection+":",'R82_DELETE_MODULE_MAP_MISSING:'+collection);
}
has(del,'DELETE_RELATION_BLOCKED','R82_DELETE_RELATION_FAIL_CLOSED_MISSING');
has(del,'deleteReason','R82_DELETE_REASON_AUDIT_MISSING');
has(store,'function isSoftDeleted(row)','R82_SOFT_DELETE_PROJECTION_FILTER_MISSING');
has(cobros,"Orbit.recordDelete.remove('cobros'","R82_COBROS_DELETE_ENTRYPOINT_MISSING");
has(siniestros,"Orbit.recordDelete.remove('reclamos'","R82_SINIESTROS_DELETE_ENTRYPOINT_MISSING");
has(cancelaciones,"Orbit.recordDelete.remove('cancelaciones'","R82_CANCELACIONES_DELETE_ENTRYPOINT_MISSING");
has(comisiones,"Orbit.recordDelete.remove('comisiones'","R82_COMISIONES_DELETE_ENTRYPOINT_MISSING");
has(c360,"Orbit.recordDelete.remove('clientes'","R82_CLIENT_DELETE_ENTRYPOINT_MISSING");

has(resources,'async function uploadDocument(file, extra)','R77_DOCUMENT_UPLOAD_CONTRACT_MISSING');
has(imports,'async function persistDocumentaryFiles()','R81_DOCUMENTARY_PERSISTENCE_MISSING');
has(imports,"await Orbit.store.updateDurable('clientes', cid, clientPatch)",'R81_CLIENT_DOCUMENT_READBACK_LINK_MISSING');
need(!imports.includes('Los archivos quedan almacenados y visibles en el expediente/ficha.'),'R81_FALSE_DOCUMENT_SUCCESS_COPY_REMAINS');

has(driveClient,"provider.addScope('https://www.googleapis.com/auth/drive')",'R77_DRIVE_OAUTH_SCOPE_MISSING');
has(driveClient,"tokenPersistence: 'memory_only'",'R77_DRIVE_TOKEN_PERSISTENCE_NOT_MEMORY_ONLY');
has(driveClient,'authMod.linkWithPopup','R77_DRIVE_USER_CONSENT_FLOW_MISSING');
need(!driveClient.includes('service-account credentials'),'R77_STALE_SERVICE_ACCOUNT_PROVIDER_COPY');

has(driveBackend,'function googleToken(input)','R77_DRIVE_DELEGATED_TOKEN_REQUIRED');
has(driveBackend,'driveIdentity(accessToken)','R77_DRIVE_IDENTITY_READBACK_MISSING');
has(driveBackend,'capabilities.canAddChildren!==true','R77_DRIVE_WRITE_CAPABILITY_CHECK_MISSING');
has(driveBackend,'ROOT_BY_TENANT','R81_DRIVE_ROOT_BINDING_MISSING');
need(!driveBackend.includes('new GoogleAuth('),'R77_SERVICE_ACCOUNT_DRIVE_AUTH_REMAINS');
need(!driveBackend.includes('serviceAccount:SERVICE_ACCOUNT'),'R77_SERVICE_ACCOUNT_FUNCTION_BINDING_REMAINS');

console.log(JSON.stringify({
  status:'PASS',
  contract:'I6.5-B2-R15-R15A',
  findings:['R73','R74','R75','R76','R77','R78','R79','R80','R81','R82'],
  drive:{repository:'Google Drive',auth:'delegated-user-oauth',tokenPersistence:'memory_only',readbackRequired:true},
  delete:{ui:'Eliminar',default:'durable-soft-delete',relationalSafety:'fail-closed'},
  renewalWindowDays:45
},null,2));
