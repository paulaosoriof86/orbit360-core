/* ============================================================
   Orbit 360 · Perfiles de carga inicial por tenant
   Configuración sin datos reales. Los lotes se seleccionan localmente.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.importInitialProfiles = Object.assign({}, Orbit.importInitialProfiles || {}, {
    'alianzas-soluciones': {
      id: 'ays-initial-lab-v1',
      tenantId: 'alianzas-soluciones',
      title: 'Carga inicial A&S',
      description: 'Clientes y directorio canónico de aseguradoras, con revisión previa y rollback.',
      requiredBackendMode: 'firestore-lab',
      allowedCollections: ['clientes', 'aseguradoras'],
      expectedCounts: {
        clientes: 414,
        clientesRetenidos: 26,
        aseguradoras: 26
      },
      sourceSchemaVersion: 'orbit360.initial-tenant-batch.v1',
      confirmationLabel: 'Confirmo la carga controlada en el entorno de validación de A&S.',
      confirmationReason: 'Carga inicial autorizada de Clientes y Aseguradoras para validación operativa A&S.',
      restrictions: [
        'No producción',
        'No pólizas',
        'No cobros',
        'No movimientos financieros',
        'No credenciales ni secretos'
      ]
    }
  });
})();
