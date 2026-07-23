/* Orbit 360 · Academia 1.234 · Preparación runtime productiva read-only */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  window.Orbit.ACADEMIA_V1234_PRODUCT_RUNTIME_PREPARATION = Object.freeze({
    version: '1.234',
    issuedAt: '2026-07-23',
    title: 'Preparar no significa conectar',
    audience: ['Dirección', 'SuperAdmin', 'AdminTenant', 'Operativo', 'Asesor'],
    lessons: [
      {
        id: 'runtime-authorization-boundary',
        title: 'Autorización antes de usar el entorno productivo',
        summary: 'Los contratos, reglas, smoke y rollback pueden prepararse sin usar el proyecto. La conexión solo ocurre después de una autorización explícita y acotada.'
      },
      {
        id: 'runtime-membership-controlled-write',
        title: 'La membership inicial es una escritura controlada',
        summary: 'Aunque M2 sea read-only para datos operativos, la membership inicial requiere una operación de configuración auditada, idempotente y reversible.'
      },
      {
        id: 'runtime-rules-readonly',
        title: 'Read-only debe existir en Store y Rules',
        summary: 'No basta con ocultar botones. El Store bloquea métodos de escritura y las Rules niegan create, update y delete en Firestore y Storage.'
      },
      {
        id: 'runtime-empty-data-valid',
        title: 'Colecciones vacías pueden ser un PASS',
        summary: 'Antes de migrar datos en el Bloque 4, M2 valida identidad, tenant, rol, scopes y aislamiento. Una colección vacía no es un defecto si la consulta segura funciona.'
      },
      {
        id: 'runtime-stop-rollback',
        title: 'Parar y revertir antes de improvisar',
        summary: 'Proyecto incorrecto, membership inválida, cross-tenant, secretos visibles, fallback o escrituras habilitadas obligan a detener el gate y ejecutar rollback.'
      }
    ],
    invariants: {
      packagePreparedOnly: true,
      productConnectionExecuted: false,
      explicitAuthorizationRequired: true,
      tenantFromMembershipOnly: true,
      writesBlocked: true,
      rulesApplicationAuthorized: false,
      runtimeAuthorized: false,
      deploymentAuthorized: false
    },
    claudeClassification: 'REPLICABLE_CLAUDE_ACUMULADO',
    academyUpdate: 'ACADEMIA_ACTUALIZAR',
    containsPII: false,
    containsSecrets: false
  });
})();
