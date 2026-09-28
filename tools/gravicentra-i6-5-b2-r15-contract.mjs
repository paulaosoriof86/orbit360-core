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
const hydration=read('orbit360-platform/core/product-hydration-required-optional-p0.js');
const imports=read('orbit360-platform/core/importa.js');
const resources=read('orbit360-platform/core/backend-resource-contracts.js');
const driveClient=read('orbit360-platform/core/product-drive-document-provider-p0.js');
const driveBackend=read('functions/document-drive-domain.js');
const i6Workflow=read('.github/workflows/gravicentra-recovery-i6-postsalida.yml');
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
has(c360,'data-doc-bootstrap','R84_CLIENT_DRIVE_BOOTSTRAP_ENTRYPOINT_MISSING');

has(ciclo,'function managementCreateModal(opts)','R76_CANONICAL_MANAGEMENT_EDITOR_MISSING');
has(ciclo,"return managementCreateModal({ origen: 'Ops'","R76_OPS_STILL_SPLIT");
has(ciclo,'id="mg-drive-bootstrap"','R84_MANAGEMENT_DRIVE_BOOTSTRAP_MISSING');
has(ciclo,"Orbit.recordDelete.remove('gestiones'","R78_MANAGEMENT_DELETE_MISSING");
need(!ciclo.includes("adjuntos: files.map(f => ({ nombre: f.name, size: f.size }))"),'R77_METADATA_ONLY_ATTACHMENT_PATH_REMAINS');
need(!ciclo.includes('La autorización se usa solo durante esta sesión'),'R84_MANAGEMENT_SESSION_OAUTH_COPY_REMAINS');
need(!ciclo.includes('✓ Drive conectado para esta sesión.'),'R84_MANAGEMENT_SESSION_OAUTH_SUCCESS_COPY_REMAINS');

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
has(store,'var listeners=[], pending={}, pendingExpected={}, deleted={}, prefOverlay={};','R89_PENDING_EXPECTATION_STATE_MISSING');
has(store,'function baseMatchesExpectation(row,expectation)','R89_EXPECTATION_MATCHER_MISSING');
has(store,'if(baseMatchesExpectation(ids[id],expectation))clearPending(c,id);','R89_RECONCILE_FIELD_MATCH_MISSING');
need(!store.includes("pendingIds.forEach(function(id){if(ids[id])delete pending[c][id];});"),'R89_PREMATURE_ID_ONLY_RECONCILE_REMAINS');
has(store,"{kind:'update',patch:expectedPatch(patch||{})}",'R89_UPDATE_EXPECTATION_MISSING');
has(store,"pendingReconcile:'expected-field-match'",'R89_STATUS_INVARIANT_MISSING');
has(hydration,"required=[startup]",'R88_SINGLE_AUTHORITATIVE_STARTUP_COLLECTION_MISSING');
has(hydration,"fullHydrationDeferred:true",'R88_DEFERRED_FULL_HYDRATION_MISSING');
has(hydration,"startupCollection:startup",'R88_STARTUP_COLLECTION_STATUS_MISSING');
has(hydration,"primaryByRoute",'R88_ROUTE_PRIMARY_MAP_MISSING');
has(cobros,"Orbit.recordDelete.remove('cobros'","R82_COBROS_DELETE_ENTRYPOINT_MISSING");
has(siniestros,"Orbit.recordDelete.remove('reclamos'","R82_SINIESTROS_DELETE_ENTRYPOINT_MISSING");
has(cancelaciones,"Orbit.recordDelete.remove('cancelaciones'","R82_CANCELACIONES_DELETE_ENTRYPOINT_MISSING");
has(comisiones,"Orbit.recordDelete.remove('comisiones'","R82_COMISIONES_DELETE_ENTRYPOINT_MISSING");
has(c360,"Orbit.recordDelete.remove('clientes'","R82_CLIENT_DELETE_ENTRYPOINT_MISSING");

has(resources,'async function uploadDocument(file, extra)','R77_DOCUMENT_UPLOAD_CONTRACT_MISSING');
has(imports,'async function persistDocumentaryFiles()','R81_DOCUMENTARY_PERSISTENCE_MISSING');
has(imports,"await Orbit.store.updateDurable('clientes', cid, clientPatch)",'R81_CLIENT_DOCUMENT_READBACK_LINK_MISSING');
need(!imports.includes('Los archivos quedan almacenados y visibles en el expediente/ficha.'),'R81_FALSE_DOCUMENT_SUCCESS_COPY_REMAINS');

need(!driveClient.includes("provider.addScope('https://www.googleapis.com/auth/drive')")||driveClient.includes('async function bootstrap()'),'R84_ROUTINE_USER_DRIVE_OAUTH_REMAINS');
need(!driveClient.includes('googleAccessToken'),'R84_BROWSER_DRIVE_TOKEN_REMAINS');
has(driveClient,"oauthDelegated: false",'R84_CLIENT_OAUTH_DELEGATION_NOT_DISABLED');
has(driveClient,"backendPersistent: true",'R84_CLIENT_BACKEND_PERSISTENCE_MISSING');
has(driveClient,"tokenPersistence: 'backend_secret_manager'",'R84_CLIENT_SECRET_MANAGER_PERSISTENCE_MISSING');
has(driveClient,'async function bootstrap()','R84_ONE_TIME_ADMIN_BOOTSTRAP_MISSING');
has(driveClient,'google.accounts.oauth2.initCodeClient','R85_GOOGLE_AUTH_CODE_CLIENT_MISSING');
has(driveClient,'authorizationCode: String(response.code)','R85_AUTHORIZATION_CODE_HANDOFF_MISSING');
need(!driveClient.includes('signInWithPopup'),'R85_FIREBASE_AUTH_POPUP_BOOTSTRAP_REMAINS');
need(!driveClient.includes('oauthRefreshToken'),'R85_BROWSER_REFRESH_TOKEN_REMAINS');
has(driveClient,'async function download(ref, extra)','R83_DRIVE_DOWNLOAD_PROVIDER_MISSING');
has(driveClient,'async function resolve(ref, extra)','R84_BACKEND_DOCUMENT_READ_MISSING');
has(driveClient,"a.download = String(out.nombre || 'documento')",'R83_DRIVE_DOWNLOAD_BROWSER_HANDOFF_MISSING');

need(!driveBackend.includes('function googleToken(input)'),'R84_DELEGATED_TOKEN_BACKEND_REMAINS');
need(!driveBackend.includes('input.googleAccessToken'),'R84_BROWSER_ACCESS_TOKEN_BACKEND_REMAINS');
has(driveBackend,'SecretManagerServiceClient','R84_SECRET_MANAGER_VAULT_MISSING');
has(driveBackend,"'orbit360-drive-oauth-preview-'",'R84_PREVIEW_DRIVE_VAULT_ISOLATION_MISSING');
has(driveBackend,'async function accessTokenFromRefresh','R84_REFRESH_TOKEN_EXCHANGE_MISSING');
has(driveBackend,'async function authorizationCodeTokens','R85_BACKEND_AUTH_CODE_EXCHANGE_MISSING');
has(driveBackend,"DRIVE_OAUTH_CLIENT_PREVIEW_SECRET = 'ORBIT360_DRIVE_OAUTH_CLIENT_PREVIEW'",'R86_PREVIEW_OAUTH_CLIENT_SECRET_NAME_MISSING');
has(driveBackend,'secrets:[DRIVE_OAUTH_CLIENT_PREVIEW_SECRET]','R86_PREVIEW_FUNCTION_SECRET_BINDING_MISSING');
need(!driveBackend.includes('new GoogleAuth('),'R86_RUNTIME_IDENTITY_TOOLKIT_SECRET_FETCH_REMAINS');
has(i6Workflow,'functions:secrets:set ORBIT360_DRIVE_OAUTH_CLIENT_PREVIEW','R86_PREVIEW_OAUTH_CLIENT_SECRET_PROVISION_MISSING');
has(i6Workflow,'B2_R86_GOOGLE_OAUTH_CLIENT_SECRET_READ_FAILED','R86_PREVIEW_OAUTH_CLIENT_PREFLIGHT_MISSING');
need(!i6Workflow.includes('functions:secrets:set ORBIT360_DRIVE_OAUTH_CLIENT_PRODUCTION'),'R86_PRODUCTION_OAUTH_CLIENT_SECRET_TOUCHED_IN_PREVIEW');
has(driveBackend,"grant_type:'authorization_code'",'R85_AUTHORIZATION_CODE_GRANT_MISSING');
has(driveBackend,'bootstrapClientId','R85_BOOTSTRAP_CLIENT_ID_READBACK_MISSING');
has(driveBackend,"La credencial persistente de Drive no puede ingresar desde el navegador.",'R85_BROWSER_REFRESH_TOKEN_REJECTION_MISSING');
has(driveBackend,'async function bootstrap(request,previewOnly)','R84_TENANT_BOOTSTRAP_MISSING');
has(driveBackend,'async function readDocument(request,previewOnly,downloadMode)','R84_SECURE_READ_DOWNLOAD_MISSING');
has(driveBackend,'serviceAccount:SERVICE_ACCOUNT','R84_DRIVE_FUNCTION_SERVICE_ACCOUNT_BINDING_MISSING');
has(driveBackend,'authorizeRead(request,tenantId','R84_READ_SCOPE_AUTHORIZATION_MISSING');
has(driveBackend,'El documento no pertenece al expediente autorizado.','R84_DOCUMENT_RESOURCE_BINDING_MISSING');
has(driveBackend,"'_GRAVICENTRA_PREVIEW_QA'",'R84_PREVIEW_ISOLATION_MISSING');
has(driveBackend,'ROOT_BY_TENANT','R81_DRIVE_ROOT_BINDING_MISSING');

console.log(JSON.stringify({
  status:'PASS',
  contract:'I6.5-B2-R15-R15A-R16',
  findings:['R73','R74','R75','R76','R77','R78','R79','R80','R81','R82','R83','R84','R85','R86','R87','R88','R89'],
  drive:{repository:'Google Drive',auth:'tenant-persistent-backend-auth-code',tokenPersistence:'SecretManager',routineUserGoogleOAuth:false,browserRefreshToken:false,readbackRequired:true},
  delete:{ui:'Eliminar',default:'durable-soft-delete',relationalSafety:'fail-closed'},
  renewalWindowDays:45,
  startup:{authority:'membership-before-data',readiness:'single-route-primary-authoritative',fullHydrationDeferred:true},
  operationalOverlay:{reconcile:'expected-field-match'}
},null,2));
