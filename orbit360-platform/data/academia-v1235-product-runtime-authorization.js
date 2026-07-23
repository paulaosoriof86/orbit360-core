(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  window.Orbit.ACADEMIA = window.Orbit.ACADEMIA || [];
  window.Orbit.ACADEMIA.push({
    id: 'm2-product-runtime-authorization-1235',
    version: '1.235',
    title: 'Autorización controlada del runtime productivo read-only',
    roles: ['Dirección', 'SuperAdmin', 'AdminTenant', 'IT'],
    authorizationReceived: true,
    allowedExecutions: 1,
    tenantSource: 'membership_only',
    operationalWritesAuthorized: false,
    hostingAuthorized: false,
    functionsAuthorized: false,
    importsAuthorized: false,
    policiesAuthorized: false,
    learning: [
      'Preparar una autorización no equivale a ejecutar una conexión.',
      'El preflight debe terminar antes de leer referencias de entorno o acceder a Firebase.',
      'Auth, membership, país, rol y scopes deben validarse antes de instalar Orbit.store.',
      'Un fallo de entorno no se corrige modificando módulos funcionales.',
      'El runtime productivo permanece fail-closed y sin fallback a LAB, demo, seed o localStorage.',
      'Las Rules read-only y el store bloquean toda escritura operativa.'
    ],
    classification: 'REPLICABLE_CLAUDE_ACUMULADO',
    containsPII: false,
    containsSecrets: false
  });
})();
