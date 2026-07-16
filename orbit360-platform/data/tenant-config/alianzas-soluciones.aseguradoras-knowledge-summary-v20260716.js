/* ============================================================
   Orbit 360 · Resumen sanitizado de conocimiento mapeado por aseguradora
   Tenant configurable: alianzas-soluciones · 2026-07-16

   Este archivo NO contiene tasas comerciales, importes exactos, fórmulas
   completas, PII, rutas locales, binarios, credenciales ni habilitaciones.
   Proyecta de forma honesta el trabajo forense ya ejecutado para evitar
   que la UI lo presente como "no leído" o provoque un remapeo innecesario.
   ============================================================ */
(function () {
  'use strict';
  window.OrbitTenantInsurerKnowledgeSummaries = window.OrbitTenantInsurerKnowledgeSummaries || [];
  window.OrbitTenantInsurerKnowledgeSummaries.push({
    id: 'ays_insurer_knowledge_summary_20260716_v1',
    tenantId: 'alianzas-soluciones',
    version: '2026-07-16-v1',
    status: 'mapped_pending_operational_sync',
    containsCommercialRates: false,
    containsPII: false,
    containsSecrets: false,
    enablesCotizador: false,
    enablesComparativo: false,
    evidence: [
      'REPORTE-EJECUCION-SANITIZADA-OCHO-COTIZADORES-P06B-20260710',
      'REPORTE-MANIFIESTOS-REALES-PDF-P07B-20260710'
    ],
    insurers: [
      {
        insurerName: 'Aseguradora Guatemalteca',
        aliases: ['AseGuate', 'Guatemalteca'],
        sources: [
          {
            documentId: 'ays_aseguate_tarifario_2026_v1',
            nombre: 'Tasas AseGuate.xlsx',
            tipoFuente: 'tarifario_excel', pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo',
            estado: 'mapeado_pendiente_sincronizacion',
            facts: 41, numericFacts: 27, cachedFormulaFacts: 0, candidateTables: 0, groups: 5, outputRoutes: 0,
            clusters: { pricing: 3, financing: 1, dimensions: 1 },
            notes: 'Tres bloques tarifarios de producto y un calendario de financiamiento global detectados. El financiamiento requiere vinculación humana por producto.',
            warnings: []
          },
          {
            documentId: 'ays_aseguate_cotizacion_auto_ejemplo_v1',
            nombre: 'Cotización AseGuate automóvil.pdf',
            tipoFuente: 'cotizacion_pdf_oficial', pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil',
            estado: 'mapeado_pendiente_sincronizacion', pagesWithContent: 2,
            detectedSections: ['pagos', 'coberturas', 'beneficios'],
            notes: 'Perfil de presentación procesado; el plan exacto requiere validación.'
          },
          {
            documentId: 'ays_aseguate_cotizacion_microbus_ejemplo_v1',
            nombre: 'Cotización AseGuate microbús hasta 9 pasajeros.pdf',
            tipoFuente: 'cotizacion_pdf_oficial', pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Microbús hasta 9 pasajeros',
            estado: 'mapeado_pendiente_sincronizacion', pagesWithContent: 2,
            detectedSections: ['pagos', 'coberturas', 'beneficios'],
            notes: 'Se preservaron secciones comunes y diferencias frente a automóvil; el plan exacto requiere validación.'
          }
        ]
      },
      {
        insurerName: 'Seguros BAM', aliases: ['BAM', 'BAM Seguros'],
        sources: [
          {
            documentId: 'ays_bam_salud_2025_v1', nombre: 'Cotizador BAMSALUD 2025.xlsx', tipoFuente: 'cotizador_excel_salida',
            pais: 'GT', moneda: 'GTQ', ramo: 'Gastos Médicos', producto: 'Gastos Médicos', estado: 'mapeado_pendiente_sincronizacion',
            facts: 534, numericFacts: 309, cachedFormulaFacts: 218, candidateTables: 16, groups: 70, outputRoutes: 6,
            clusters: { pricing: 31, health_matrix: 14, dimensions: 17, presentation: 3, financing: 5 },
            notes: 'Matrices, planes y salidas múltiples detectados.', warnings: []
          },
          {
            documentId: 'ays_bam_vehiculos_2025_v1', nombre: 'COTIZADOR BAM 2025 vehiculos seg. completo pr..xlsx', tipoFuente: 'cotizador_excel_salida',
            pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', estado: 'mapeado_pendiente_sincronizacion',
            facts: 2340, numericFacts: 1993, cachedFormulaFacts: 1678, candidateTables: 76, groups: 260, outputRoutes: 7,
            clusters: { pricing: 96, dimensions: 97, presentation: 44, financing: 23 },
            notes: 'Routing por tipo y uso de vehículo detectado; requiere validación por combinación.', warnings: []
          }
        ]
      },
      {
        insurerName: 'Aseguradora Rural', aliases: ['Banrural', 'Seguros Banrural'],
        sources: [
          {
            documentId: 'ays_rural_autos_2026_v1', nombre: 'Mi Carro Seguro Cotizador Banrural.xlsx', tipoFuente: 'cotizador_excel_salida',
            pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Mi Carro Seguro', estado: 'mapeado_requiere_validacion',
            facts: 484, numericFacts: 256, cachedFormulaFacts: 240, candidateTables: 11, groups: 107, outputRoutes: 1,
            clusters: { pricing: 13, dimensions: 84, presentation: 4, financing: 6 },
            notes: 'Las dimensiones confirman que no puede reducirse a una tasa única.', warnings: ['FORMULA_ERRORS_DETECTED']
          },
          {
            documentId: 'ays_rural_gastos_medicos_2025_v1', nombre: 'Cotizador Gastos Médicos Individual 2025.xlsx', tipoFuente: 'cotizador_excel_salida',
            pais: 'GT', moneda: 'GTQ', ramo: 'Gastos Médicos', producto: 'Gastos Médicos', estado: 'mapeado_pendiente_sincronizacion',
            facts: 945, numericFacts: 594, cachedFormulaFacts: 460, candidateTables: 20, groups: 64, outputRoutes: 5,
            clusters: { pricing: 27, health_matrix: 19, dimensions: 7, presentation: 8, financing: 3 },
            notes: 'Edad, género, maternidad, dental y planes requieren tratamiento separado.', warnings: []
          }
        ]
      },
      {
        insurerName: 'Bantrab', aliases: ['Seguros Bantrab'],
        sources: [
          {
            documentId: 'ays_bantrab_autos_v13_v1', nombre: 'COTIZADOR V13. CORREDORES.xlsx', tipoFuente: 'cotizador_excel_salida',
            pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de automóvil', estado: 'mapeado_requiere_validacion',
            facts: 861, numericFacts: 708, cachedFormulaFacts: 597, candidateTables: 21, groups: 86, outputRoutes: 3,
            clusters: { pricing: 20, dimensions: 34, presentation: 9, financing: 23 },
            notes: 'Las referencias externas y fórmulas con error permanecen aisladas y no pasan al runtime.', warnings: ['FORMULA_ERRORS_DETECTED', 'EXTERNAL_REFERENCES_DETECTED']
          },
          {
            documentId: 'ays_bantrab_motos_2024_v1', nombre: 'COTIZADOR MOTO - INTERMEDIARIO 2024.xlsx', tipoFuente: 'cotizador_excel_salida',
            pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de motocicleta', tipoVehiculo: 'Motocicleta', estado: 'mapeado_requiere_validacion',
            facts: 667, numericFacts: 578, cachedFormulaFacts: 503, candidateTables: 10, groups: 68, outputRoutes: 3,
            clusters: { pricing: 10, dimensions: 20, presentation: 11, financing: 27 },
            notes: 'Las rutas Completo, Robo y Responsabilidad Civil permanecen separadas.', warnings: ['EXTERNAL_REFERENCES_DETECTED']
          }
        ]
      },
      {
        insurerName: 'Seguros Columna', aliases: ['Columna'],
        sources: [
          {
            documentId: 'ays_columna_vehiculos_2026_v14', nombre: 'Cotizador VA 2026 V1.4.xlsx', tipoFuente: 'cotizador_excel_salida',
            pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', estado: 'mapeado_requiere_validacion',
            facts: 485, numericFacts: 225, cachedFormulaFacts: 226, candidateTables: 12, groups: 145, outputRoutes: 1,
            clusters: { pricing: 42, dimensions: 80, presentation: 16, financing: 7 },
            notes: 'La salida dinámica, gastos y financiamiento requieren revisión antes de normalizar.', warnings: ['FORMULA_ERRORS_DETECTED', 'EXTERNAL_REFERENCES_DETECTED']
          }
        ]
      },
      {
        insurerName: 'Seguros Universales', aliases: ['Universales'],
        sources: [
          {
            documentId: 'ays_universales_riesgo_plus_ejemplo_v1', nombre: 'Cotización Seguros Universales Riesgo Plus.pdf', tipoFuente: 'cotizacion_pdf_oficial',
            pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Riesgo Plus', plan: 'Riesgo Plus', estado: 'mapeado_pendiente_sincronizacion',
            pagesWithContent: 2, sparsePages: 2, detectedSections: ['opciones de pago', 'coberturas', 'pasos', 'condiciones'],
            notes: 'Fuente válida de presentación para propuesta PDF externa y Comparativo; no habilita cálculo automático sin regla tarifaria validada.', warnings: ['TARIFF_RULE_NOT_LINKED']
          }
        ]
      }
    ]
  });
})();
