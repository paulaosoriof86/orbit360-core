import { buildDocumentBatchPlanP09d, executeDocumentBatchDryRunP09d } from './orbit360-document-batch-plan-p09d.mjs';
function assert(c,m){if(!c)throw new Error(m)}
const plan = buildDocumentBatchPlanP09d({ tenantId:'tenant-demo', sources:[
  { id:'doc-excel', tenantId:'tenant-demo', aseguradoraId:'ins-a', fileRef:'drive://excel', tipoFuente:'tarifario_excel', version:'v1', pais:'GT', moneda:'GTQ', producto:'Auto' },
  { id:'doc-pdf', tenantId:'tenant-demo', aseguradoraId:'ins-a', fileRef:'drive://pdf', tipoFuente:'cotizacion_pdf_oficial', version:'v1', pais:'GT', moneda:'GTQ', producto:'Auto', tipoVehiculo:'Automóvil' },
  { id:'doc-health', tenantId:'tenant-demo', aseguradoraId:'ins-b', fileRef:'drive://health', tipoFuente:'cotizador_excel_salida', version:'v2', pais:'GT', moneda:'GTQ', producto:'Gastos Médicos' }
]});
assert(plan.ok && plan.summary.total===3 && plan.summary.excel===2 && plan.summary.pdf===1 && plan.summary.insurers===2, 'lote debe agrupar y contar');
assert(plan.items.every(x=>x.enabledCotizador===false&&x.writeAllowed===false), 'lote no habilita ni escribe');
const dry = await executeDocumentBatchDryRunP09d(plan,{inspect:async item=>({ok:true,code:'READY:'+item.documentId})});
assert(dry.ok&&dry.summary.ok===3&&dry.applyAllowed===false,'dry-run debe completar sin aplicar');
const duplicate = buildDocumentBatchPlanP09d({tenantId:'tenant-demo',sources:[plan.items[0],plan.items[0]]});
assert(!duplicate.ok&&duplicate.items.some(x=>x.errors.includes('DUPLICATE_DOCUMENT_VERSION')),'duplicado debe bloquear');
console.log('OK orbit360-test-document-batch-plan-p09d');
