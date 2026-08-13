/* ============================================================
   Orbit 360 · A&S · P0.9f · Primera fuente metadata-only
   Fecha: 2026-07-10

   Registra la primera fuente a procesar en LAB. No contiene ruta local,
   tasas, PII, binarios ni habilitaciones. La referencia real la entrega
   el backend al seleccionar/cargar el archivo.
   ============================================================ */
(function () {
  'use strict';
  window.OrbitFirstSourcePlansP09f = window.OrbitFirstSourcePlansP09f || [];
  window.OrbitFirstSourcePlansP09f.push({
    id: 'ays_aseguate_tarifario_first_source_v1',
    tenantId: 'alianzas-soluciones',
    insurerName: 'Aseguradora Guatemalteca',
    insurerAliases: ['AseGuate', 'Aseguradora Guatemalteca'],
    pais: 'GT',
    moneda: 'GTQ',
    source: {
      documentId: 'ays_aseguate_tarifario_2026_v1',
      nombre: 'Tasas AseGuate.xlsx',
      tipoFuente: 'tarifario_excel',
      ramo: 'Vehículos',
      producto: 'Seguro de vehículo',
      pais: 'GT',
      moneda: 'GTQ',
      version: '2026-v1',
      estado: 'lectura_pendiente'
    },
    purpose: 'training',
    requiresBackendReference: true,
    expectedOutputs: ['manifest', 'mapping_proposal'],
    enabled: false,
    enablesCotizador: false,
    enablesComparativo: false,
    requiresHumanValidation: true,
    requiresSecondGateForEnablement: true
  });
})();