/* Orbit 360 · configuración A&S de aliases y perfiles financieros.
   Datos operativos no sensibles. No contiene contactos, cuentas,
   credenciales, tasas de producto ni datos de clientes. */
(function () {
  'use strict';
  window.OrbitTenantInsurerConfigsP10 = window.OrbitTenantInsurerConfigsP10 || [];
  var config = {
    tenantId: 'alianzas-soluciones',
    version: '2026-07-16',
    updatedAt: '2026-07-16',
    preferredInsurerCountryOrder: ['GT', 'CO'],
    knowledgeSummarySrc: 'data/tenant-config/alianzas-soluciones.aseguradoras-knowledge-summary-v20260716.js',
    insurers: [
      {
        canonicalKey: 'gt_seguros_bam', internalId: 'ins_gt_seguros_bam',
        canonicalName: 'Seguros BAM', displayName: 'Seguros BAM', pais: 'GT',
        aliases: ['BAM', 'BAM Seguros', 'Seguros BAM'],
        sourceHints: ['cotizador bam', 'bamsalud']
      },
      {
        canonicalKey: 'gt_bantrab', internalId: 'ins_gt_bantrab',
        canonicalName: 'Bantrab', displayName: 'Bantrab', pais: 'GT',
        aliases: ['Bantrab', 'Seguros Bantrab'],
        sourceHints: ['cotizador v13 corredores', 'cotizador moto intermediario']
      },
      {
        canonicalKey: 'gt_seguros_columna', internalId: 'ins_gt_seguros_columna',
        canonicalName: 'Seguros Columna', displayName: 'Seguros Columna', pais: 'GT',
        aliases: ['Columna', 'Seguros Columna'],
        sourceHints: ['cotizador va 2026']
      },
      {
        canonicalKey: 'gt_aseguradora_guatemalteca', internalId: 'ins_gt_aseguradora_guatemalteca',
        canonicalName: 'Aseguradora Guatemalteca', displayName: 'Aseguradora Guatemalteca (AseGuate)', pais: 'GT',
        aliases: ['AseGuate', 'Aseguradora Guatemalteca', 'Guatemalteca'],
        sourceHints: ['tasas aseguate', 'cotizacion aseguate'],
        financialProfiles: [
          {
            id: 'ays_aseguate_vehiculos_financial_v1',
            pais: 'GT', moneda: 'GTQ',
            ramoPatterns: ['Vehículos', 'Automóviles'],
            productoPatterns: ['Seguro de vehículo', 'Auto', 'Automóvil', 'Microbús'],
            status: 'confirmed_tenant_config',
            confirmedAt: '2026-07-10',
            confirmedBy: 'direccion_tenant',
            requiresSecondGateForEnablement: true,
            evidenceRefs: [
              { documentId: 'decision_ays_aseguate_financial_20260710', block: 'gasto_emision_5pct_prima_neta' },
              { documentId: 'decision_ays_aseguate_financial_20260710', block: 'iva_12pct_base_gravable' },
              { documentId: 'cotizacion_aseguate_auto_ejemplo', page: 1 },
              { documentId: 'cotizacion_aseguate_microbus_ejemplo', page: 1 }
            ],
            components: [
              {
                id: 'ays_aseguate_ge_5pct_neta', tipo: 'issuance_expense',
                nombre: 'Gastos de emisión', calculationType: 'rate', rate: 0.05,
                amountBasis: 'net', formulaModel: { base: 'base_premium' }, taxable: true,
                evidence: { mediaKind: 'configuration', documentId: 'decision_ays_aseguate_financial_20260710', block: 'gasto_emision_5pct_prima_neta', method: 'tenant_confirmed_plus_quote_examples' }
              },
              {
                id: 'ays_aseguate_iva_12pct', tipo: 'tax',
                nombre: 'IVA', calculationType: 'rate', rate: 0.12,
                amountBasis: 'net_plus_fees', formulaModel: { base: 'subtotal_before_tax' }, taxable: false,
                evidence: { mediaKind: 'configuration', documentId: 'decision_ays_aseguate_financial_20260710', block: 'iva_12pct_base_gravable', method: 'tenant_confirmed_plus_quote_examples' }
              }
            ]
          }
        ]
      },
      {
        canonicalKey: 'gt_aseguradora_rural', internalId: 'ins_gt_aseguradora_rural',
        canonicalName: 'Aseguradora Rural', displayName: 'Aseguradora Rural (Banrural)', pais: 'GT',
        aliases: ['Aseguradora Rural', 'Banrural', 'Banco de Desarrollo Rural', 'Seguros Banrural', 'Banrural GM'],
        sourceHints: ['mi carro seguro cotizador banrural', 'cotizador gastos medicos individual']
      },
      {
        canonicalKey: 'gt_seguros_universales', internalId: 'ins_gt_seguros_universales',
        canonicalName: 'Seguros Universales', displayName: 'Seguros Universales', pais: 'GT',
        aliases: ['Seguros Universales', 'Universales'],
        sourceHints: ['riesgo plus']
      }
    ]
  };
  window.OrbitTenantInsurerConfigsP10.push(config);
  if (window.Orbit && window.Orbit.tenantInsurerConfigP10) {
    window.Orbit.tenantInsurerConfigP10.registerTenantConfig(config);
  }
})();
