import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const backend=read('functions/product-insurer-credentials.js');
const provider=read('orbit360-platform/core/product-insurer-credential-provider-p0.js');

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

console.log('GRAVICENTRA_I2_INSURER_PREVIEW_BACKEND_CONTRACT=PASS');
console.log('PREVIEW_BACKEND=orbit360ProductInsurerCredentialCommandPreview@us-east1');
console.log('PRODUCTION_BACKEND=orbit360ProductInsurerCredentialCommand@us-central1');
console.log('PREVIEW_OPERATIONAL_WRITES=false');
