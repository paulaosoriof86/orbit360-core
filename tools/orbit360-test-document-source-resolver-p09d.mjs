import { createDocumentSourceResolverP09d } from './orbit360-document-source-resolver-p09d.mjs';
function assert(c,m){if(!c)throw new Error(m)}
const records = new Map();
records.set('tenant-a|drive://source-a', { id:'ref-a', tenantId:'tenant-a', aseguradoraId:'ins-a', documentId:'doc-a', fileRef:'drive://source-a', localPath:'/mounted/tenant-a/source-a.xlsx', sourceHash:'hash-a', status:'ready', tasks:['excel_manifest'], purposes:['training'], expiresAt:'2099-01-01T00:00:00Z' });
const resolver = createDocumentSourceResolverP09d({ allowedTenants:['tenant-a'], lookupReference: async ({tenantId,fileRef}) => records.get(`${tenantId}|${fileRef}`) });
const ok = await resolver({ tenantId:'tenant-a', aseguradoraId:'ins-a', documentId:'doc-a', fileRef:'drive://source-a', task:'excel_manifest', purpose:'training' });
assert(ok.ok && ok.localPath.endsWith('source-a.xlsx'), 'referencia válida debe resolver');
assert(ok.audit.containsLocalPath === false, 'auditoría no expone ruta');
const cross = await resolver({ tenantId:'tenant-b', aseguradoraId:'ins-a', documentId:'doc-a', fileRef:'drive://source-a', task:'excel_manifest', purpose:'training' });
assert(!cross.ok && cross.code === 'TENANT_NOT_ALLOWED', 'cross-tenant debe bloquear');
const clientPath = await resolver({ tenantId:'tenant-a', aseguradoraId:'ins-a', documentId:'doc-a', fileRef:'drive://source-a', localPath:'/tmp/x', task:'excel_manifest', purpose:'training' });
assert(!clientPath.ok && clientPath.code === 'CLIENT_PATH_FORBIDDEN', 'cliente no envía ruta');
const wrongTask = await resolver({ tenantId:'tenant-a', aseguradoraId:'ins-a', documentId:'doc-a', fileRef:'drive://source-a', task:'pdf_manifest', purpose:'training' });
assert(!wrongTask.ok && wrongTask.code === 'REFERENCE_TASK_NOT_ALLOWED', 'task no autorizada debe bloquear');
console.log('OK orbit360-test-document-source-resolver-p09d');
