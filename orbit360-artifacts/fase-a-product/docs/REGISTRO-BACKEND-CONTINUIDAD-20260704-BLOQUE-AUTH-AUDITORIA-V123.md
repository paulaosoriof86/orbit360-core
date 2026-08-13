# Registro backend continuidad — auditoría Auth/roles/portal v1.123

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft

## Bloque trabajado

Se auditó la candidata activa v1.123 para Auth, roles, tenant, router, Portal, Cliente360, Equipo/Permisos, Calidad de Datos y PWA.

## Archivos creados

- `AUDITORIA-DIAGNOSTICO-AUTH-ROLES-TENANT-PORTAL-V123-20260704.md`
- `CONTRATO-GUARD-AUTORIZACION-RUTAS-ACCIONES-AYS-20260704.md`
- `CONTRATO-AUDITORIA-ACCESO-SEGURIDAD-AYS-20260704.md`
- `ESPEC-VALIDADOR-AUTH-ROLES-TENANT-PORTAL-AYS-20260704.md`
- `PENDIENTES-CLAUDE-AUTH-ROLES-PORTAL-V123-AUDITORIA-20260704.md`

## Hallazgo confirmado

La candidata v1.123 tiene base visual útil, pero todavía no tiene Auth real:

- sesión demo en `localStorage`;
- contraseña visual no validada contra backend real;
- selector de rol en topbar;
- rol activo separado del usuario autenticado;
- sidebar oculta módulos, pero no hay guard central de ruta/acción;
- portal es vista previa interna con selector de cliente;
- no existe entidad `portalUsuarios`;
- no hay auditoría de acceso real.

## Decisión

No implementar Auth real todavía desde esta sesión. Primero dejar contratos, diagnóstico y validadores. La implementación real debe hacerse sin romper backend protegido y conservando `Orbit.store`.

## Próximo paso recomendado

Continuar con contrato/modelo de `clientes` + relación cliente/asesor/portal/calidad de datos, porque Auth y Portal dependen de que el cliente tenga:

- tenantId;
- asesorId confiable;
- estado de portal;
- datos de contacto;
- consentimiento/base de contacto;
- calidad de datos;
- relaciones con pólizas, cobros, documentos y gestiones.

## Estado

Documentado. No se tocó `data/store.js`, Firestore, deploy, main ni datos reales.
