import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const backend=read('functions/product-insurer-credentials.js');
const provider=read('orbit360-platform/core/product-insurer-credential-provider-p0.js');
const resources=read('orbit360-platform/core/backend-resource-contracts.js');
const owner=read('orbit360-platform/core/client-insurer-operational-directory-owner-v20260722.js');
const tenantRuntime=read('orbit360-platform/core/product-tenant-runtime-context-bridge-p0.js');

need(backend.includes("const REGION='us-central1'"),'PROD_REGION_NOT_PINNED');
need(backend.includes("const PREVIEW_REGION='us-east1'"),'PREVIEW_REGION_NOT_PINNED');
need(backend.includes('exports.orbit360ProductInsurerCredentialCommand=onCall'),'PROD_CALLABLE_EXPORT_MISSING');
need(backend.includes('exports.orbit360ProductInsurerCredentialCommandPreview=onCall'),'PREVIEW_CALLABLE_EXPORT_MISSING');
need(backend.includes("request=>execute(request,'firestore')"),'PROD_AUDIT_MODE_NOT_FIRESTORE');
need(backend.includes("request=>execute(request,'cloudlog')"),'PREVIEW_AUDIT_MODE_NOT_CLOUDLOG');
need(backend.includes("if(auditMode==='cloudlog'&&op==='import')"),'PREVIEW_IMPORT_NOT_FAIL_CLOSED');
need(backend.includes("if(mode==='cloudlog'){console.info('GRAVICENTRA_PREVIEW_CREDENTIAL_AUDIT "),'PREVIEW_AUDIT_NOT_NON_MUTATING');
need(backend.includes("collection('auditEvents').add"),'PROD_AUDIT_PERSISTENCE_MISSING');
need(backend.includes("writesOperationalData:false"),'PREVIEW_ZERO_OPERATIONAL_WRITE_CONTRACT_MISSING');

need(provider.includes("const PROD_CALLABLE = 'orbit360ProductInsurerCredentialCommand'"),'PROVIDER_PROD_CALLABLE_MISSING');
need(provider.includes("const PREVIEW_CALLABLE = 'orbit360ProductInsurerCredentialCommandPreview'"),'PROVIDER_PREVIEW_CALLABLE_MISSING');
need(provider.includes("const PREVIEW_REGION = 'us-east1'"),'PROVIDER_PREVIEW_REGION_MISSING');
need(provider.includes("/^ays-orbit-360-lab--gi-i3-[a-z0-9-]+\\.web\\.app$/"),'PREVIEW_HOST_FAIL_CLOSED_PATTERN_MISSING');
need(provider.includes("? { callable: PREVIEW_CALLABLE, region: PREVIEW_REGION, preview: true }") && provider.includes(": { callable: PROD_CALLABLE, region: PROD_REGION, preview: false }"),'HOST_TO_CALLABLE_SWITCH_NOT_EXPLICIT');
need(provider.includes('runtime().callFunction(endpoint.callable') && provider.includes('}, endpoint.region);'),'PROVIDER_REGION_NOT_BOUND_TO_TARGET');
need(provider.includes('directFirestoreWrites:false'),'BROWSER_DIRECT_WRITE_BOUNDARY_REGRESSED');
need(provider.includes('serverAuditAuthoritative:true'),'SERVER_AUDIT_AUTHORITY_MARKER_MISSING');
need(provider.includes("copy: (ref, extra) => command('copy', ref, extra)"),'PROVIDER_COPY_OPERATION_NOT_BOUND');
need(provider.includes("reveal: (ref, extra) => command('reveal', ref, extra)"),'PROVIDER_REVEAL_OPERATION_NOT_BOUND');

// Regression: credential audit is server-owned. Browser observability remains, but no duplicate Orbit.store audit path may execute for credential.*.
need(resources.includes("function credentialAuditIsServerOwned(action)"),'SERVER_OWNED_AUDIT_GUARD_MISSING');
need(resources.includes("/^credential\\./.test(String(action || ''))"),'SERVER_OWNED_AUDIT_SCOPE_NOT_CREDENTIAL_ONLY');
need(resources.includes('Orbit.productInsurerCredentialProviderP0.serverAuditAuthoritative === true'),'SERVER_OWNED_AUDIT_MARKER_NOT_REQUIRED');
need(resources.includes('if (!credentialAuditIsServerOwned(action))'),'CLIENT_AUDIT_NOT_GUARDED');
need(resources.includes("document.dispatchEvent(new CustomEvent('orbit:secure-resource-audit'"),'BROWSER_AUDIT_EVENT_REMOVED');
need(resources.includes("audit('credential.reveal'"),'REVEAL_AUDIT_EVENT_MISSING');
need(resources.includes("audit('credential.copy'"),'COPY_AUDIT_EVENT_MISSING');
need(resources.includes("Orbit.store.insert('auditLog', row)") && resources.includes("Orbit.store.insert('actividades'"),'NON_CREDENTIAL_AUDIT_FALLBACK_UNEXPECTEDLY_REMOVED');

// Regression: UI copy must use the backend copy contract, never reuse reveal for copy.
need(owner.includes('async function resolveCredentialForCopy('),'OWNER_COPY_RESOLVER_MISSING');
need(owner.includes("typeof Orbit.secureResources.copyCredential !== 'function'"),'OWNER_COPY_PROVIDER_GUARD_MISSING');
need(owner.includes("return await Orbit.secureResources.copyCredential(ref, { module:'aseguradoras', insurerId:insurer.id, portalIndex:index });"),'OWNER_COPY_NOT_ROUTED_TO_COPY_CONTRACT');
need(owner.includes("? await resolveCredential(portal, insurer, index)\n        : await resolveCredentialForCopy(portal, insurer, index)"),'OWNER_REVEAL_COPY_DISPATCH_NOT_SEPARATED');

// Regression: provider must consume the object actually exported by the authenticated tenant runtime bridge.
need(tenantRuntime.includes('window.Orbit.productTenantRuntimeContextP0=Object.freeze'),'TENANT_RUNTIME_CANONICAL_EXPORT_MISSING');
need(tenantRuntime.includes('status:status'),'TENANT_RUNTIME_STATUS_API_MISSING');
need(provider.includes('Orbit.productTenantRuntimeContextP0'),'PROVIDER_CANONICAL_TENANT_RUNTIME_MISSING');
need(provider.includes("typeof bridge.status === 'function' ? bridge.status() : null"),'PROVIDER_CANONICAL_TENANT_STATUS_NOT_USED');
need(provider.includes('c && c.ready === true && c.tenantId'),'PROVIDER_TENANT_READY_CONTEXT_NOT_REQUIRED');
need(!provider.includes('productTenantRuntimeContextBridgeP0'),'PROVIDER_STALE_NONEXISTENT_TENANT_SYMBOL_REINTRODUCED');
need(!provider.includes('window.location.search')&&!provider.includes('URLSearchParams'),'PROVIDER_URL_TENANT_FALLBACK_FORBIDDEN');

console.log('GRAVICENTRA_I2_INSURER_PREVIEW_BACKEND_CONTRACT=PASS');
console.log('PREVIEW_BACKEND=orbit360ProductInsurerCredentialCommandPreview@us-east1');
console.log('PRODUCTION_BACKEND=orbit360ProductInsurerCredentialCommand@us-central1');
console.log('TENANT_RUNTIME=Orbit.productTenantRuntimeContextP0.status');
console.log('CREDENTIAL_AUDIT_AUTHORITY=server-owned');
console.log('OWNER_COPY_OPERATION=credential.copy');
console.log('PREVIEW_OPERATIONAL_WRITES=false');
