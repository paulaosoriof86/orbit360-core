import fs from 'node:fs';
import vm from 'node:vm';

const Orbit = {};
const context = {
  window: { Orbit }, Orbit, console, Date, Math, Set, Array,
  String, Object, JSON, Number, Promise
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(
  fs.readFileSync('orbit360-platform/core/document-intelligence-router-p08.js', 'utf8'),
  context,
  { filename: 'orbit360-platform/core/document-intelligence-router-p08.js' }
);

const api = Orbit.documentIntelligenceRouterP08;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const sufficient = {
  documentId: 'doc-provider',
  file: { fileRef: 'ref-provider' },
  confidence: 92,
  pages: [{ blank: false, contentChars: 800, tableCount: 1 }],
  sections: [{ title: 'Coberturas' }],
  insurerCandidates: [{ id: 'insurer-a', confidence: 98 }],
  dimensiones: { producto: 'Seguro de vehículo' },
  warnings: [],
  flags: {}
};

const registry = {
  deterministic_ok: { inspect: async () => sufficient },
  ocr_demo: {
    ocr: async () => ({
      confidence: 80,
      pages: [{ blank: false, contentChars: 700 }],
      warnings: [],
      flags: { ocrExecuted: true }
    })
  },
  semantic_demo: {
    analyze: async () => ({
      confidence: 94,
      sections: [{ title: 'Coberturas' }],
      insurerCandidates: [{ id: 'insurer-a', confidence: 96 }],
      dimensiones: { producto: 'Seguro de vehículo' },
      warnings: []
    })
  },
  deterministic_low: {
    inspect: async () => ({
      confidence: 30,
      pages: [{ blank: true, contentChars: 0 }],
      sections: [],
      insurerCandidates: [],
      dimensiones: {},
      warnings: ['ASEGURADORA_REQUIERE_VALIDACION']
    })
  }
};

const config = {
  iaPorTarea: {
    pdf_manifest: 'deterministic_ok',
    pdf_ocr: 'ocr_demo',
    pdf_semantic: 'semantic_demo'
  },
  dataPolicy: { allowExternalAi: true, allowOcr: true }
};
const input = {
  tenantId: 'tenant-demo', documentId: 'doc-demo', fileRef: 'ref-demo',
  fileName: 'quote.pdf', purpose: 'training', reason: 'Calibración sintética'
};

const plan = api.buildPlan(input, config);
assert(plan.validation.valid && plan.tasks[0].providerId === 'deterministic_ok', 'Debe usar configuración por tarea');
assert(plan.request.returnRawBytes === false && plan.request.executeEmbeddedContent === false, 'No debe pedir bytes ni ejecución');

const ready = await api.run(input, registry, config);
assert(ready.ok && ready.stages.length === 1, 'No debe invocar IA si el parser determinístico es suficiente');
assert(ready.code === 'MANIFEST_READY_FOR_REVIEW', 'Debe quedar listo para revisión, no habilitado');
assert(ready.writeAllowed === false && ready.enabled === false, 'No debe escribir ni habilitar');
assert(ready.manifest.documentId === 'doc-provider' && ready.manifest.file.fileRef === 'ref-provider', 'Debe conservar metadata estructural del provider');

const lowConfig = {
  iaPorTarea: {
    pdf_manifest: 'deterministic_low',
    pdf_ocr: 'ocr_demo',
    pdf_semantic: 'semantic_demo'
  },
  dataPolicy: { allowExternalAi: true, allowOcr: true }
};
const recovered = await api.run(input, registry, lowConfig);
assert(recovered.ok, 'Debe completar el pipeline de fallback');
assert(recovered.stages.some(item => item.task === 'pdf_ocr'), 'Debe usar OCR solo cuando falta texto');
assert(recovered.stages.some(item => item.task === 'pdf_semantic'), 'Debe usar semántica cuando falta estructura');
assert(recovered.manifest.confidence === 94, 'Debe conservar la mayor confianza validable');
assert(recovered.writeAllowed === false && !recovered.enabled, 'Fallback tampoco debe habilitar');

const noAi = await api.run(input, registry, {
  iaPorTarea: {
    pdf_manifest: 'deterministic_low',
    pdf_ocr: 'ocr_demo',
    pdf_semantic: 'semantic_demo'
  },
  dataPolicy: { allowExternalAi: false, allowOcr: false }
});
assert(noAi.ok && noAi.stages.length === 1, 'La política tenant puede impedir OCR e IA externa');
assert(noAi.code === 'MANIFEST_REQUIRES_VALIDATION', 'Política restrictiva no debe fingir suficiencia');
assert(!noAi.stages.some(item => item.task === 'pdf_semantic'), 'No debe saltarse la política de datos');
assert(noAi.fallback.reasons.includes('OCR_BLOQUEADO_POR_POLITICA'), 'Debe explicar el fallback bloqueado');

const secretPlan = api.buildPlan(input, {
  iaPorTarea: {
    pdf_manifest: { providerId: 'deterministic_ok', apiKey: 'secret-fixture', routeKey: 'safe-route' }
  }
});
assert(!JSON.stringify(secretPlan).includes('secret-fixture'), 'No debe conservar secretos de provider');
const safeTask = api.taskConfig('pdf_manifest', {
  iaPorTarea: { pdf_manifest: { providerId: 'deterministic_ok', routeKey: 'safe-route' } }
});
assert(JSON.stringify(safeTask).includes('safe-route'), 'No debe eliminar claves funcionales como routeKey');

const invalid = await api.run(
  { tenantId: 'tenant-demo', documentId: 'doc-demo', fileName: 'quote.pdf' },
  registry,
  config
);
assert(!invalid.ok && invalid.code === 'REFERENCIA_O_HASH_REQUERIDO', 'Debe exigir referencia o hash');

const excelPlan = api.buildPlan({
  tenantId: 'tenant-demo', documentId: 'doc-xlsx', fileRef: 'ref-xlsx',
  fileName: 'calculator.xlsx', reason: 'Inventario sintético'
}, {
  iaPorTarea: { excel_manifest: 'excel-deterministic', excel_semantic: 'excel-semantic' }
});
assert(excelPlan.request.mediaKind === 'spreadsheet', 'Debe detectar spreadsheet');
assert(excelPlan.tasks[0].task === 'excel_manifest', 'Debe enrutar primero al inspector Excel');
assert(excelPlan.request.includeCellValues === false && excelPlan.request.executeMacros === false, 'No debe pedir valores ni macros');

console.log('OK orbit360-test-document-intelligence-router-p08');