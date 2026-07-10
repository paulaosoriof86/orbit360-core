import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRegistryFromCatalogP09k } from './orbit360-document-reference-registry-p09k.mjs';
import { createDocumentBackendCapabilityP09k } from './orbit360-document-backend-capability-p09k.mjs';
import { runCommandP09k } from './orbit360-document-backend-command-p09k.mjs';

function assert(condition,message){ if(!condition) throw new Error(message); }
const root=fs.mkdtempSync(path.join(os.tmpdir(),'orbit-p09k-'));
const excel=path.join(root,'Tarifario demo.xlsx');
const pdf=path.join(root,'Cotizacion demo.pdf');
const arbitrary=path.join(root,'upload-opaque-123.bin');
fs.writeFileSync(excel,'fictional xlsx fixture');
fs.writeFileSync(pdf,'%PDF-1.4 fictional fixture');
fs.writeFileSync(arbitrary,'fictional private fixture');
const catalog=[
  {tenantId:'alianzas-soluciones',aseguradoraId:'ins_demo_alpha',documentId:'doc-excel',fileName:'Tarifario demo.xlsx',task:'excel_manifest',purposes:['training'],version:'v1'},
  {tenantId:'alianzas-soluciones',aseguradoraId:'ins_demo_alpha',documentId:'doc-pdf',fileName:'Cotizacion demo.pdf',task:'pdf_manifest',purposes:['training'],version:'v1'},
  {tenantId:'alianzas-soluciones',aseguradoraId:'ins_demo_beta',documentId:'doc-missing',fileName:'No existe.xlsx',task:'excel_manifest',purposes:['training'],version:'v1'}
];
const privateRecords=[
  {tenantId:'alianzas-soluciones',aseguradoraId:'ins_demo_beta',documentId:'doc-private',localPath:arbitrary,fileRef:'backend-ref://alianzas-soluciones/doc-private/v1',task:'excel_manifest',purposes:['training'],version:'v1'}
];
const built=buildRegistryFromCatalogP09k(catalog,{allowedRoots:[root],allowedTenants:['alianzas-soluciones'],privateRecords});
assert(built.registry.status().total===3,'debe registrar dos descubrimientos y un registro privado');
assert(built.discovery.issues.some(row=>row.documentId==='doc-missing'&&row.code==='SOURCE_FILE_NOT_FOUND'),'debe conservar faltante sin inventar ruta');
assert(built.discovery.privateRecordCount===1,'debe aceptar mapping privado autorizado');
assert(!JSON.stringify(built.registry.listSafe()).includes(root),'estado seguro no debe exponer raíz local');
const internal=await built.registry.lookupReference({tenantId:'alianzas-soluciones',documentId:'doc-excel',fileRef:'backend-ref://alianzas-soluciones/doc-excel/v1'});
assert(internal&&internal.localPath===excel,'lookup interno debe resolver ruta solo dentro de backend');
const capability=createDocumentBackendCapabilityP09k({registry:built.registry,allowedRoots:[root],allowedTenants:['alianzas-soluciones'],toolsRoot:path.resolve('tools')});
const actor={id:'admin-demo',tenantId:'alianzas-soluciones',activeRole:'AdminTenant'};
const refs=await capability.resolveBatchReferences({tenantId:'alianzas-soluciones',batchId:'batch-demo',documentIds:['doc-excel','doc-pdf','doc-missing'],purpose:'training',actor});
assert(refs.ok&&refs.provided===2&&refs.missing.includes('doc-missing'),'debe devolver disponibilidad y faltantes');
assert(refs.sourceRefs['doc-excel'].startsWith('backend-ref://'),'debe devolver referencia opaca');
assert(!JSON.stringify(refs).includes(root),'respuesta pública no debe exponer ruta');
const denied=await capability.resolveBatchReferences({tenantId:'alianzas-soluciones',documentIds:['doc-excel'],purpose:'training',actor:{id:'x',tenantId:'otro'}});
assert(!denied.ok&&denied.code==='ACTOR_TENANT_MISMATCH','tenant cruzado debe bloquearse');
const catalogPath=path.join(root,'catalog.json');
fs.writeFileSync(catalogPath,JSON.stringify({sources:catalog.slice(0,2)},null,2));
const command=await runCommandP09k(['references','--catalog',catalogPath,'--source-root',root,'--documents','doc-excel,doc-pdf'],{toolsRoot:path.resolve('tools')});
assert(command.ok&&command.provided===2,'comando LAB debe resolver referencias del lote');
assert(!JSON.stringify(command).includes(root),'comando no debe imprimir rutas locales');
assert(command.enablesCotizador===false&&command.enablesComparativo===false,'P09k no habilita módulos');
fs.rmSync(root,{recursive:true,force:true});
console.log('OK orbit360-test-document-backend-capability-p09k');
