/* ============================================================
   Orbit 360 · A&S · P0.9g · Lote documental inicial de Aseguradoras
   Fecha: 2026-07-10

   Define once fuentes y dependencias de binding del tenant A&S. No contiene
   rutas, PII, tasas, binarios, secretos ni habilitaciones.
   ============================================================ */
(function () {
  'use strict';
  window.OrbitSourceBatchesP09g = window.OrbitSourceBatchesP09g || [];

  window.OrbitSourceBatchesP09g.push({
    id: 'ays_aseguradoras_knowledge_batch_2026_v1',
    tenantId: 'alianzas-soluciones',
    version: '2026-v1',
    purpose: 'training',
    executionPolicy: {
      concurrency: 1,
      maxRetries: 2,
      stopOnError: false,
      persistenceDefault: false,
      verifyAfterPersist: true
    },
    sources: [
      {
        order: 10,
        insurerName: 'Seguros BAM',
        insurerAliases: ['BAM', 'BAM Seguros'],
        source: {
          documentId: 'ays_bam_vehiculos_2025_v1',
          nombre: 'COTIZADOR BAM 2025 vehiculos seg. completo pr..xlsx',
          tipoFuente: 'cotizador_excel_salida',
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo',
          version: '2025-v1', estado: 'lectura_pendiente'
        }
      },
      {
        order: 20,
        insurerName: 'Seguros BAM',
        insurerAliases: ['BAM', 'BAM Seguros'],
        source: {
          documentId: 'ays_bam_salud_2025_v1',
          nombre: 'Cotizador BAMSALUD 2025.xlsx',
          tipoFuente: 'cotizador_excel_salida',
          pais: 'GT', moneda: 'GTQ', ramo: 'Gastos Médicos', producto: 'Gastos Médicos',
          version: '2025-v1', estado: 'lectura_pendiente'
        }
      },
      {
        order: 30,
        insurerName: 'Bantrab',
        insurerAliases: ['Seguros Bantrab'],
        source: {
          documentId: 'ays_bantrab_autos_v13_v1',
          nombre: 'COTIZADOR V13. CORREDORES.xlsx',
          tipoFuente: 'cotizador_excel_salida',
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de automóvil',
          version: 'v13', estado: 'lectura_pendiente'
        }
      },
      {
        order: 40,
        insurerName: 'Bantrab',
        insurerAliases: ['Seguros Bantrab'],
        source: {
          documentId: 'ays_bantrab_motos_2024_v1',
          nombre: 'COTIZADOR MOTO - INTERMEDIARIO 2024.xlsx',
          tipoFuente: 'cotizador_excel_salida',
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de motocicleta',
          tipoVehiculo: 'Motocicleta', version: '2024-v1', estado: 'lectura_pendiente'
        }
      },
      {
        order: 50,
        insurerName: 'Seguros Columna',
        insurerAliases: ['Columna'],
        source: {
          documentId: 'ays_columna_vehiculos_2026_v14',
          nombre: 'Cotizador VA 2026 V1.4.xlsx',
          tipoFuente: 'cotizador_excel_salida',
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo',
          version: '2026-v1.4', estado: 'lectura_pendiente'
        }
      },
      {
        order: 60,
        insurerName: 'Aseguradora Guatemalteca',
        insurerAliases: ['AseGuate', 'Guatemalteca'],
        source: {
          documentId: 'ays_aseguate_tarifario_2026_v1',
          nombre: 'Tasas AseGuate.xlsx',
          tipoFuente: 'tarifario_excel',
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo',
          version: '2026-v1', estado: 'lectura_pendiente'
        }
      },
      {
        order: 70,
        insurerName: 'Aseguradora Guatemalteca',
        insurerAliases: ['AseGuate', 'Guatemalteca'],
        source: {
          documentId: 'ays_aseguate_cotizacion_auto_ejemplo_v1',
          nombre: 'Cotización AseGuate automóvil.pdf',
          tipoFuente: 'cotizacion_pdf_oficial',
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo',
          tipoVehiculo: 'Automóvil', usoVehiculo: 'Particular',
          version: 'ejemplo-v1', estado: 'lectura_pendiente'
        }
      },
      {
        order: 80,
        insurerName: 'Aseguradora Guatemalteca',
        insurerAliases: ['AseGuate', 'Guatemalteca'],
        source: {
          documentId: 'ays_aseguate_cotizacion_microbus_ejemplo_v1',
          nombre: 'Cotización AseGuate microbús hasta 9 pasajeros.pdf',
          tipoFuente: 'cotizacion_pdf_oficial',
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo',
          tipoVehiculo: 'Microbús hasta 9 pasajeros', usoVehiculo: 'Particular',
          version: 'ejemplo-v1', estado: 'lectura_pendiente'
        }
      },
      {
        order: 90,
        insurerName: 'Aseguradora Rural',
        insurerAliases: ['Banrural', 'Seguros Banrural'],
        source: {
          documentId: 'ays_rural_autos_2026_v1',
          nombre: 'Mi Carro Seguro Cotizador Banrural.xlsx',
          tipoFuente: 'cotizador_excel_salida',
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Mi Carro Seguro',
          version: '2026-v1', estado: 'lectura_pendiente'
        }
      },
      {
        order: 100,
        insurerName: 'Aseguradora Rural',
        insurerAliases: ['Banrural', 'Seguros Banrural'],
        source: {
          documentId: 'ays_rural_gastos_medicos_2025_v1',
          nombre: 'Cotizador Gastos Médicos Individual 2025.xlsx',
          tipoFuente: 'cotizador_excel_salida',
          pais: 'GT', moneda: 'GTQ', ramo: 'Gastos Médicos', producto: 'Gastos Médicos',
          version: '2025-v1', estado: 'lectura_pendiente'
        }
      },
      {
        order: 110,
        insurerName: 'Seguros Universales',
        insurerAliases: ['Universales'],
        source: {
          documentId: 'ays_universales_riesgo_plus_ejemplo_v1',
          nombre: 'Cotización Seguros Universales Riesgo Plus.pdf',
          tipoFuente: 'cotizacion_pdf_oficial',
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Riesgo Plus',
          tipoVehiculo: 'Camioneta agrícola', usoVehiculo: 'Particular',
          plan: 'Riesgo Plus', version: 'ejemplo-v1', estado: 'lectura_pendiente'
        }
      }
    ],
    bindingSets: [
      {
        id: 'ays_aseguate_auto_binding_set_v1',
        insurerName: 'Aseguradora Guatemalteca',
        variant: { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil' },
        requiredDocuments: ['ays_aseguate_tarifario_2026_v1', 'ays_aseguate_cotizacion_auto_ejemplo_v1'],
        requiredKnowledge: ['tariff_rule', 'presentation', 'reconciliation'],
        knownMissingKnowledge: [],
        requiresHumanValidation: true,
        requiresSecondGateForEnablement: true
      },
      {
        id: 'ays_aseguate_microbus_binding_set_v1',
        insurerName: 'Aseguradora Guatemalteca',
        variant: { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Seguro de vehículo', tipoVehiculo: 'Microbús hasta 9 pasajeros' },
        requiredDocuments: ['ays_aseguate_tarifario_2026_v1', 'ays_aseguate_cotizacion_microbus_ejemplo_v1'],
        requiredKnowledge: ['tariff_rule', 'presentation', 'reconciliation'],
        knownMissingKnowledge: [],
        requiresHumanValidation: true,
        requiresSecondGateForEnablement: true
      },
      {
        id: 'ays_universales_riesgo_plus_binding_set_v1',
        insurerName: 'Seguros Universales',
        variant: { pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos', producto: 'Riesgo Plus', plan: 'Riesgo Plus' },
        requiredDocuments: ['ays_universales_riesgo_plus_ejemplo_v1'],
        requiredKnowledge: ['tariff_rule', 'presentation'],
        knownMissingKnowledge: ['tariff_rule'],
        requiresHumanValidation: true,
        requiresSecondGateForEnablement: true
      }
    ],
    enabled: false,
    applyAllowed: false,
    enablesCotizador: false,
    enablesComparativo: false,
    requiresHumanValidation: true,
    requiresSecondGateForEnablement: true
  });
})();