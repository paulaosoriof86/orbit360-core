/* Orbit 360 · A&S · Plan de binding AseGuate P0.10c.
   Solo contiene referencias y dimensiones; no incluye tasas, PII ni secretos. */
(function () {
  'use strict';
  window.OrbitTenantBindingPlansP10c = window.OrbitTenantBindingPlansP10c || [];
  var plan = {
    id: 'ays_aseguate_vehiculos_binding_v1',
    tenantId: 'alianzas-soluciones',
    version: '2026-07-12',
    pais: 'GT',
    insurerName: 'Aseguradora Guatemalteca',
    insurerAliases: ['AseGuate', 'Guatemalteca'],
    tariffDocumentId: 'ays_aseguate_tarifario_2026_v1',
    variants: [
      {
        id: 'ays_aseguate_auto_v1',
        presentationDocumentId: 'ays_aseguate_cotizacion_auto_ejemplo_v1',
        dimensiones: {
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos',
          producto: 'Seguro de vehículo', tipoVehiculo: 'Automóvil'
        },
        targets: {
          cotizador_automatico: false,
          cotizador_pdf_externo: false,
          comparativo: false
        }
      },
      {
        id: 'ays_aseguate_microbus_v1',
        presentationDocumentId: 'ays_aseguate_cotizacion_microbus_ejemplo_v1',
        dimensiones: {
          pais: 'GT', moneda: 'GTQ', ramo: 'Vehículos',
          producto: 'Seguro de vehículo', tipoVehiculo: 'Microbús hasta 9 pasajeros'
        },
        targets: {
          cotizador_automatico: false,
          cotizador_pdf_externo: false,
          comparativo: false
        }
      }
    ],
    status: 'configured_pending_runtime_sources',
    enabled: false,
    enablesCotizador: false,
    enablesComparativo: false,
    requiresHumanValidation: true,
    requiresSecondGateForEnablement: true
  };
  window.OrbitTenantBindingPlansP10c.push(plan);
  if (window.Orbit && window.Orbit.tenantBindingPlanP10c) {
    window.Orbit.tenantBindingPlanP10c.registerPlan(plan);
  }
})();