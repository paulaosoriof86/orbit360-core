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



/* ============================================================
   Gravicentra Insurance · Delta visible de conocimiento aseguradoras
   Tenant alianzas-soluciones · 2026-10-03
   Fuente sanitizada: Biblioteca persistente + documentos aportados por Paula.
   No contiene PII ni secretos. No habilita cálculo automático por sí sola.
   ============================================================ */
(function () {
  'use strict';
  window.OrbitTenantInsurerKnowledgeSummaries = window.OrbitTenantInsurerKnowledgeSummaries || [];
  window.OrbitTenantInsurerKnowledgeSummaries.push({
  "id": "ays_insurer_knowledge_summary_20261003_v1",
  "tenantId": "alianzas-soluciones",
  "version": "2026-10-03-v1",
  "status": "source_backed_knowledge_preview",
  "containsCommercialRates": true,
  "containsPII": false,
  "containsSecrets": false,
  "enablesCotizador": false,
  "enablesComparativo": false,
  "evidence": [
    "I6_5_B4_003_R9_INSURER_KNOWLEDGE_PREVIEW_AUTHORIZATION_LOCK_20261003",
    "A&S Transformacion Digital/CotComp/Evidencia Cotizaciones Reales/2026-09-2026/",
    "A&S Transformacion Digital/Conocimiento Aseguradoras/2026-10-03/"
  ],
  "sourceCorpus": {
    "libraryRoot": "/A&S Transformacion Digital/CotComp/Evidencia Cotizaciones Reales/2026-09-2026/",
    "currentSourceRoot": "/A&S Transformacion Digital/Conocimiento Aseguradoras/2026-10-03/",
    "quotePdfCount": 16,
    "riskClusters": 5,
    "insurerFamilies": 10,
    "useRule": "Cotizaciones reales se reutilizan como evidencia de presentación, coberturas, deducibles, pagos y hechos observados del producto; nunca se reutilizan como propuesta de otro riesgo."
  },
  "productDomains": [
    {
      "pais": "GT",
      "ramo": "Automóviles",
      "estado": "FUENTES_ACTIVAS",
      "detalle": "Tarifarios/cotizadores, pólizas y corpus real de cotizaciones disponibles."
    },
    {
      "pais": "GT",
      "ramo": "Vida",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Solicitar fuentes cuando entre este ramo al siguiente paquete."
    },
    {
      "pais": "GT",
      "ramo": "Gastos Médicos",
      "estado": "FUENTES_HISTORICAS_DISPONIBLES",
      "detalle": "Existen fuentes históricas BAM, Rural y Universales; requieren refresh/versionado antes de regla automática."
    },
    {
      "pais": "GT",
      "ramo": "Incendio y Líneas Aliadas",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "No bloquear salida por cobertura incompleta; mantener fail-closed."
    },
    {
      "pais": "GT",
      "ramo": "Daños",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Fuentes se pedirán por aseguradora/producto."
    },
    {
      "pais": "GT",
      "ramo": "Fianzas",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Fuentes se pedirán por aseguradora/producto."
    },
    {
      "pais": "GT",
      "ramo": "Transporte",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Fuentes se pedirán por aseguradora/producto/certificado."
    },
    {
      "pais": "GT",
      "ramo": "Responsabilidad Civil",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Fuentes se pedirán por aseguradora/producto."
    },
    {
      "pais": "GT",
      "ramo": "Accidentes Personales",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Fuentes se pedirán por aseguradora/producto."
    },
    {
      "pais": "CO",
      "ramo": "Automóviles",
      "estado": "MUESTRAS_ACTIVAS",
      "detalle": "Pólizas reales AXA Colpatria, Previsora y SBS disponibles; SBS requiere copia legible/no protegida para extracción."
    },
    {
      "pais": "CO",
      "ramo": "Vida",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Solicitar fuentes cuando entre este ramo al siguiente paquete."
    },
    {
      "pais": "CO",
      "ramo": "Salud",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Solicitar fuentes por aseguradora/producto."
    },
    {
      "pais": "CO",
      "ramo": "Incendio y Terremoto",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Solicitar fuentes por aseguradora/producto."
    },
    {
      "pais": "CO",
      "ramo": "Daños",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Solicitar fuentes por aseguradora/producto."
    },
    {
      "pais": "CO",
      "ramo": "Cumplimiento",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Solicitar fuentes por aseguradora/producto."
    },
    {
      "pais": "CO",
      "ramo": "Transporte",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Solicitar fuentes por aseguradora/producto."
    },
    {
      "pais": "CO",
      "ramo": "Responsabilidad Civil",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Solicitar fuentes por aseguradora/producto."
    },
    {
      "pais": "CO",
      "ramo": "ARL / Riesgos Laborales",
      "estado": "PENDIENTE_FUENTE_JIT",
      "detalle": "Solicitar fuentes cuando corresponda."
    }
  ],
  "insurers": [
    {
      "insurerName": "Aseguradora Guatemalteca",
      "aliases": [
        "AseGuate",
        "Guatemalteca"
      ],
      "sources": [
        {
          "documentId": "ays_aseguate_tarifario_2026_r9",
          "nombre": "Tasas AseGuate.xlsx",
          "tipoFuente": "tarifario_excel",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "validado_fuente_actual",
          "sourceRef": "Biblioteca/Conocimiento Aseguradoras/2026-10-03/Tasas AseGuate.xlsx"
        },
        {
          "documentId": "ays_aseguate_quote_yaris_20260930_r9",
          "nombre": "Cotización AseGuate Auto 2026-09-30",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "validado_muestra_actual",
          "sourceRef": "Biblioteca/CotComp/01_Yaris_2008_Q37500_W5"
        },
        {
          "documentId": "ays_aseguate_policy_auto38594_r9",
          "nombre": "Póliza AseGuate AUTO-38594",
          "tipoFuente": "poliza_ejemplo",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "validado_muestra_actual",
          "sourceRef": "Biblioteca/Conocimiento Aseguradoras/2026-10-03/AUTO-38594.pdf"
        }
      ],
      "knowledgeProducts": [
        {
          "id": "aseguate_gt_auto_2026_r9",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "VALIDADO_CON_FUENTE_Y_MUESTRA",
          "vigencia": "Fuentes 2026; revisar al recibir versión posterior",
          "rules": [
            {
              "label": "Plan Premium · tasa",
              "value": "3.20% sobre valor asegurado",
              "status": "FUENTE_TARIFARIA"
            },
            {
              "label": "Plan Premium · prima mínima",
              "value": "Q1,800 + asistencia",
              "status": "FUENTE_TARIFARIA"
            },
            {
              "label": "Plan Plus · tasa",
              "value": "4.00% sobre valor asegurado",
              "status": "FUENTE_TARIFARIA"
            },
            {
              "label": "Plan Plus · prima mínima",
              "value": "Q1,600 + recargo aplicable + asistencia",
              "status": "FUENTE_TARIFARIA"
            },
            {
              "label": "Plan Plus · recargo por antigüedad",
              "value": "15% según condición del tarifario",
              "status": "FUENTE_TARIFARIA"
            },
            {
              "label": "Plan Básico · prima mínima",
              "value": "Q800 + asistencia",
              "status": "FUENTE_TARIFARIA"
            },
            {
              "label": "Asistencia",
              "value": "Q350 en los tres planes documentados",
              "status": "FUENTE_TARIFARIA"
            },
            {
              "label": "Gastos de emisión",
              "value": "5% de prima neta",
              "status": "VALIDADO_EN_POLIZA"
            },
            {
              "label": "Fraccionamiento",
              "value": "Hasta 6 pagos al precio de contado; 8 pagos 5.37%; 10 pagos 8.42% sobre prima neta",
              "status": "FUENTE_TARIFARIA_Y_POLIZA"
            },
            {
              "label": "IVA",
              "value": "12%; en la póliza muestra grava prima neta + gastos de emisión + asistencia + financiamiento",
              "status": "VALIDADO_EN_POLIZA"
            },
            {
              "label": "Visa/Cuotas",
              "value": "Cotización muestra 3, 6 y 10 pagos; tratar separado del recargo de aseguradora cuando corresponda",
              "status": "MUESTRA_COTIZACION"
            }
          ],
          "warnings": [
            "El tarifario anota deducible 3% mínimo Q1,800; la cotización actual muestra mínimos distintos por plan (Premium Q2,000 / Plus Q1,800). Mantener versionado y no convertir un mínimo en universal.",
            "La cotización muestra también 7 y 9 pagos; el tarifario entregado solo fija porcentajes explícitos para 8 y 10. No inferir porcentajes intermedios sin fuente."
          ],
          "sources": [
            "ays_aseguate_tarifario_2026_r9",
            "ays_aseguate_quote_yaris_20260930_r9",
            "ays_aseguate_policy_auto38594_r9"
          ]
        }
      ]
    },
    {
      "insurerName": "Seguros Columna",
      "aliases": [
        "Columna",
        "Columna Compañía de Seguros"
      ],
      "sources": [
        {
          "documentId": "ays_columna_cotizador_va_2026_v14_r9",
          "nombre": "Cotizador VA 2026 V1.4.xlsx",
          "tipoFuente": "cotizador_excel_salida",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "validado_fuente_actual",
          "sourceRef": "Biblioteca/Conocimiento Aseguradoras/2026-10-03/Cotizador VA 2026 V1.4.xlsx"
        },
        {
          "documentId": "ays_columna_quote_crv_20260928_r9",
          "nombre": "Cotización Columna CRV 2026-09-28",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "validado_muestra_actual",
          "sourceRef": "Biblioteca/CotComp/05_CRV_2002_Q35000"
        },
        {
          "documentId": "ays_columna_quote_moto_20260928_r9",
          "nombre": "Cotización Columna Motocicleta 2026-09-28",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Motocicleta",
          "estado": "validado_muestra_actual",
          "sourceRef": "Biblioteca/CotComp/02_Pulsar_NS400Z_2026_Q25000"
        },
        {
          "documentId": "ays_columna_policy_va41977_r9",
          "nombre": "Póliza Columna VA-41977",
          "tipoFuente": "poliza_ejemplo",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "validado_muestra_actual",
          "sourceRef": "Biblioteca/Conocimiento Aseguradoras/2026-10-03/VA41977-162867883.pdf"
        }
      ],
      "knowledgeProducts": [
        {
          "id": "columna_gt_auto_2026_r9",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos / Motocicleta",
          "estado": "VALIDADO_CON_COTIZADOR_Y_POLIZA",
          "vigencia": "Fuentes 2026; revisar al recibir versión posterior",
          "rules": [
            {
              "label": "Gastos de emisión",
              "value": "0% en cotizador/pólizas y muestras revisadas de Vehículos",
              "status": "VALIDADO_EN_FUENTE_Y_POLIZA"
            },
            {
              "label": "Fraccionamiento de aseguradora",
              "value": "0% en póliza muestra de 10 pagos; cotizaciones 2/3/4/5/6/8/10/12 reconstruyen el mismo total",
              "status": "VALIDADO_EN_POLIZA_Y_COTIZACIONES"
            },
            {
              "label": "IVA",
              "value": "12% sobre la prima neta en las muestras revisadas",
              "status": "VALIDADO_EN_POLIZA_Y_COTIZADOR"
            },
            {
              "label": "Pronto pago",
              "value": "No es universal: se observó 5% de descuento en una cotización de motocicleta y 0% en otra muestra",
              "status": "VARIACION_OBSERVADA"
            },
            {
              "label": "Visa Cuotas",
              "value": "Hasta 12 pagos según cotización; no tratarlo automáticamente como recargo de la aseguradora",
              "status": "MUESTRA_COTIZACION"
            }
          ],
          "warnings": [
            "Las condiciones de pronto pago varían por perfil/producto. No hardcodear 5% global."
          ],
          "sources": [
            "ays_columna_cotizador_va_2026_v14_r9",
            "ays_columna_quote_crv_20260928_r9",
            "ays_columna_quote_moto_20260928_r9",
            "ays_columna_policy_va41977_r9"
          ]
        }
      ]
    },
    {
      "insurerName": "AXA Colpatria Seguros S.A.",
      "aliases": [
        "AXA Colpatria",
        "AXA"
      ],
      "sources": [
        {
          "documentId": "ays_axa_auto_10104_2026_r9",
          "nombre": "Póliza AXA Colpatria Auto 10104",
          "tipoFuente": "poliza_ejemplo",
          "pais": "CO",
          "moneda": "COP",
          "ramo": "Automóviles",
          "producto": "AU Plus",
          "estado": "validado_muestra_actual",
          "sourceRef": "Biblioteca/Conocimiento Aseguradoras/2026-10-03/AXA_10104-101-10-0.pdf"
        },
        {
          "documentId": "ays_axa_auto_9414_2026_r9",
          "nombre": "Póliza AXA Colpatria Auto 9414",
          "tipoFuente": "poliza_ejemplo",
          "pais": "CO",
          "moneda": "COP",
          "ramo": "Automóviles",
          "producto": "AU Cupos Excepción Plus Renovación",
          "estado": "validado_muestra_actual",
          "sourceRef": "Biblioteca/Conocimiento Aseguradoras/2026-10-03/LNU485.pdf"
        }
      ],
      "knowledgeProducts": [
        {
          "id": "axa_co_auto_2026_r9",
          "pais": "CO",
          "moneda": "COP",
          "ramo": "Automóviles",
          "producto": "AU Plus / AU Cupos Excepción Plus",
          "estado": "DOS_MUESTRAS_CONCORDANTES",
          "vigencia": "Muestras 2026",
          "rules": [
            {
              "label": "Gastos",
              "value": "COP 20,000 fijos en las dos pólizas muestra",
              "status": "MUESTRA_CONCORDANTE"
            },
            {
              "label": "IVA",
              "value": "19% aplicado a prima + gastos en ambas muestras",
              "status": "MUESTRA_CONCORDANTE"
            },
            {
              "label": "Forma de pago",
              "value": "Contado / contado a plazo (45 días observado); no se evidencia recargo de fraccionamiento de aseguradora",
              "status": "MUESTRA_CONCORDANTE"
            }
          ],
          "warnings": [
            "COP 20,000 es un valor observado en dos pólizas de Auto; no generalizar a otros productos ni versiones sin fuente tarifaria."
          ],
          "sources": [
            "ays_axa_auto_10104_2026_r9",
            "ays_axa_auto_9414_2026_r9"
          ]
        }
      ]
    },
    {
      "insurerName": "La Previsora S.A. Compañía de Seguros",
      "aliases": [
        "Previsora",
        "La Previsora"
      ],
      "sources": [
        {
          "documentId": "ays_previsora_auto_3117159_2025_r9",
          "nombre": "Póliza Previsora Auto 3117159",
          "tipoFuente": "poliza_ejemplo",
          "pais": "CO",
          "moneda": "COP",
          "ramo": "Automóviles",
          "producto": "Automóviles Livianos",
          "estado": "validado_muestra",
          "sourceRef": "Biblioteca/Conocimiento Aseguradoras/2026-10-03/Poliza Todo Riesgo Volvo 2025 Previsora.pdf"
        }
      ],
      "knowledgeProducts": [
        {
          "id": "previsora_co_auto_2025_r9",
          "pais": "CO",
          "moneda": "COP",
          "ramo": "Automóviles",
          "producto": "Automóviles Livianos",
          "estado": "MUESTRA_VALIDADA",
          "vigencia": "Muestra 2025-2026",
          "rules": [
            {
              "label": "Gastos",
              "value": "COP 0 en la muestra",
              "status": "MUESTRA_POLIZA"
            },
            {
              "label": "IVA",
              "value": "19% sobre la prima en la muestra",
              "status": "MUESTRA_POLIZA"
            },
            {
              "label": "Pago",
              "value": "Contado / plazo de pago documentado; no se evidencia recargo de fraccionamiento de aseguradora",
              "status": "MUESTRA_POLIZA"
            }
          ],
          "warnings": [
            "Confirmar con fuente 2026/2027 antes de convertir estos hechos en regla automática."
          ],
          "sources": [
            "ays_previsora_auto_3117159_2025_r9"
          ]
        }
      ]
    },
    {
      "insurerName": "SBS Seguros",
      "aliases": [
        "SBS",
        "SBS Seguros Colombia"
      ],
      "sources": [
        {
          "documentId": "ays_sbs_auto_2215841_r9",
          "nombre": "Póliza SBS Auto 2215841",
          "tipoFuente": "poliza_ejemplo",
          "pais": "CO",
          "moneda": "COP",
          "ramo": "Automóviles",
          "producto": "Automóviles",
          "estado": "fuente_recibida_requiere_copia_legible",
          "sourceRef": "Biblioteca/Conocimiento Aseguradoras/2026-10-03/Autos Poliza SBS 2215841 Bogota.pdf"
        }
      ],
      "knowledgeProducts": [
        {
          "id": "sbs_co_auto_r9",
          "pais": "CO",
          "moneda": "COP",
          "ramo": "Automóviles",
          "producto": "Automóviles",
          "estado": "FUENTE_RECIBIDA_REQUIERE_EXTRACCION",
          "vigencia": "Pendiente",
          "rules": [],
          "warnings": [
            "El PDF recibido está protegido y no pudo extraerse de forma segura. Si este producto entra a cálculo, solicitar una copia exportada sin protección; no pedir transcripción manual."
          ],
          "sources": [
            "ays_sbs_auto_2215841_r9"
          ]
        }
      ]
    },
    {
      "insurerName": "MAPFRE Seguros Guatemala",
      "aliases": [
        "MAPFRE",
        "Mapfre Guatemala"
      ],
      "sources": [
        {
          "documentId": "ays_corpus_mapfre_auto_r9",
          "nombre": "Cotizaciones reales MAPFRE · corpus CotComp",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos/Motocicleta",
          "estado": "muestras_reales_disponibles",
          "sourceRef": "Biblioteca/CotComp"
        }
      ]
    },
    {
      "insurerName": "Seguros El Roble",
      "aliases": [
        "El Roble"
      ],
      "sources": [
        {
          "documentId": "ays_corpus_roble_auto_r9",
          "nombre": "Cotizaciones reales El Roble · corpus CotComp",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos/Motocicleta",
          "estado": "muestras_reales_disponibles",
          "sourceRef": "Biblioteca/CotComp"
        }
      ]
    },
    {
      "insurerName": "Aseguradora La Ceiba",
      "aliases": [
        "La Ceiba"
      ],
      "sources": [
        {
          "documentId": "ays_corpus_ceiba_auto_r9",
          "nombre": "Cotizaciones reales La Ceiba · corpus CotComp",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos/Motocicleta",
          "estado": "muestras_reales_disponibles",
          "sourceRef": "Biblioteca/CotComp"
        }
      ]
    },
    {
      "insurerName": "Seguros G&T",
      "aliases": [
        "G&T",
        "G&T Continental"
      ],
      "sources": [
        {
          "documentId": "ays_corpus_gt_auto_r9",
          "nombre": "Cotización real G&T · corpus CotComp",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "muestra_real_disponible",
          "sourceRef": "Biblioteca/CotComp"
        }
      ]
    },
    {
      "insurerName": "Aseguradora General",
      "aliases": [
        "General"
      ],
      "sources": [
        {
          "documentId": "ays_corpus_general_auto_r9",
          "nombre": "Cotización real Aseguradora General · corpus CotComp",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "muestra_real_disponible",
          "sourceRef": "Biblioteca/CotComp"
        }
      ]
    },
    {
      "insurerName": "Bantrab",
      "aliases": [
        "Seguros Bantrab"
      ],
      "sources": [
        {
          "documentId": "ays_corpus_bantrab_auto_r9",
          "nombre": "Cotización real Bantrab · corpus CotComp",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "muestra_real_disponible",
          "sourceRef": "Biblioteca/CotComp"
        }
      ]
    },
    {
      "insurerName": "Aseguradora Rural",
      "aliases": [
        "Banrural",
        "Seguros Banrural"
      ],
      "sources": [
        {
          "documentId": "ays_corpus_rural_auto_r9",
          "nombre": "Cotización real Aseguradora Rural · corpus CotComp",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "muestra_real_disponible",
          "sourceRef": "Biblioteca/CotComp"
        }
      ]
    },
    {
      "insurerName": "Seguros Universales",
      "aliases": [
        "Universales"
      ],
      "sources": [
        {
          "documentId": "ays_corpus_universales_auto_r9",
          "nombre": "Cotizaciones reales Universales · corpus CotComp",
          "tipoFuente": "cotizacion_pdf_oficial",
          "pais": "GT",
          "moneda": "GTQ",
          "ramo": "Automóviles",
          "producto": "Vehículos",
          "estado": "muestras_reales_disponibles",
          "sourceRef": "Biblioteca/CotComp"
        }
      ]
    }
  ]
});
})();
