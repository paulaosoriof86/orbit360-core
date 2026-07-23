/* Orbit 360 · Academia 1.233 · Bootstrap productivo read-only */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  window.Orbit.ACADEMIA_V1233_PRODUCT_READONLY = Object.freeze({
    version: '1.233',
    issuedAt: '2026-07-23',
    title: 'Acceso productivo seguro y de solo lectura',
    audience: ['Dirección', 'SuperAdmin', 'AdminTenant', 'Operativo', 'Asesor'],
    lessons: [
      {
        id: 'product-readonly-membership-first',
        title: 'El tenant se resuelve desde la membresía',
        summary: 'En un entorno productivo no se acepta el tenant desde la dirección web. La identidad autenticada conduce a una membresía activa y esa membresía define tenant, roles, países y scopes.'
      },
      {
        id: 'product-readonly-role-taxonomy',
        title: 'Roles canónicos y aliases de lectura',
        summary: 'Dirección, SuperAdmin, AdminTenant, Operativo y los demás roles se guardan de forma canónica. Variantes históricas se normalizan solo para lectura y nunca se vuelven a persistir como aliases ambiguos.'
      },
      {
        id: 'product-readonly-no-fallback',
        title: 'Fallo cerrado, sin fuentes alternas silenciosas',
        summary: 'Si falta configuración autorizada, usuario, membresía, rol, tenant o alcance, Orbit 360 muestra un estado honesto y no entra al sistema operativo con otra fuente.'
      },
      {
        id: 'product-readonly-write-lock',
        title: 'Solo lectura significa cero escrituras',
        summary: 'Insertar, actualizar, eliminar, cambiar preferencias o resembrar permanecen bloqueados. La etapa valida aislamiento y consultas antes de diseñar el escritor durable.'
      },
      {
        id: 'product-readonly-defect-vs-validator',
        title: 'Defecto funcional frente a validador obsoleto',
        summary: 'Un defecto funcional cambia el comportamiento del producto. Un validador obsoleto contradice un contrato vigente. La clasificación se hace antes de corregir para evitar parches innecesarios.'
      }
    ],
    roleGuidance: {
      'Dirección': 'Verifica que el entorno permanezca bloqueado hasta resolver identidad, membresía y tenant.',
      'SuperAdmin': 'Audita owners, contratos, aislamiento y evidencia sanitizada sin usar secretos en reportes.',
      'AdminTenant': 'Administra membresías y roles solo mediante cambios auditados y confirmación reforzada cuando amplía acceso.',
      'Operativo': 'Accede únicamente a módulos y datos permitidos por su rol activo y scope.',
      'Asesor': 'Consulta exclusivamente clientes y relaciones dentro de su alcance propios/equipo según la membresía.'
    },
    invariants: {
      tenantFromMembershipOnly: true,
      queryStringTenantInProduct: false,
      storeNoFallback: true,
      writesBlocked: true,
      credentialRefsFrontendRead: false,
      productRuntimeNotAuthorizedByThisLesson: true
    },
    claudeClassification: 'REPLICABLE_CLAUDE_ACUMULADO',
    academyUpdate: 'ACADEMIA_ACTUALIZAR',
    containsPII: false,
    containsSecrets: false
  });
})();
