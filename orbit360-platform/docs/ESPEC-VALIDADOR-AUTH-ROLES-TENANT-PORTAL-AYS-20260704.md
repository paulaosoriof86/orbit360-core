# Especificación validador — Auth, roles, tenant y Portal

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: especificación técnica. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Crear un validador seguro de anti-regresiones para revisar Auth/roles/tenant/portal en candidatas futuras.

## 2. Archivos a escanear

- `orbit360-platform/core/auth.js`
- `orbit360-platform/core/config.js`
- `orbit360-platform/core/router.js`
- `orbit360-platform/modules/portal.js`
- `orbit360-platform/modules/equipo.js`
- `orbit360-platform/modules/configuracion.js`
- `orbit360-platform/modules/cliente360.js`
- `orbit360-platform/data/seed.js`
- `orbit360-platform/index.html`

## 3. Bloqueantes P0

### AUTH-P0-01 — Auth demo tratado como real

Fallar si la UI o documentación afirma Auth real/productivo mientras `core/auth.js` sigue usando `localStorage` o login sin validación real.

### AUTH-P0-02 — Contraseña plana o credencial real

Fallar si se detectan contraseñas planas, tokens reales, secretos o emails reales de operación en seed/código.

### AUTH-P0-03 — Portal cliente con selector de cliente en experiencia final

Fallar si el Portal final para cliente muestra selector para cambiar `clienteId`.

Excepción: vista interna/admin debe estar claramente rotulada como previsualización.

### AUTH-P0-04 — Ruta directa sin guard

Fallar o marcar bloqueo si el router no valida acceso antes de renderizar rutas restringidas.

### AUTH-P0-05 — Usuario sin tenant

Fallar si se prepara usuario/portalUsuario sin `tenantId`.

## 4. Revisión P1

### AUTH-P1-01 — Roles sin permisos por acción

Marcar revisión si solo existen permisos `ver/editar` y no hay estructura para `modulo.accion`.

### AUTH-P1-02 — Cliente360 sin estado portal

Marcar revisión si Cliente360 no muestra estado de portal/invitación/activación.

### AUTH-P1-03 — Equipo/Usuarios sin authUid

Marcar revisión si usuarios no tienen estructura preparada para `authUid`, `tenantId`, `estadoUsuario`, `roles[]`, `modulosVisibles[]`.

### AUTH-P1-04 — Falta auditoría de acceso

Marcar revisión si no hay estructura de auditoría para login, cambio de rol, cambio de permisos, acceso denegado o acción crítica.

### AUTH-P1-05 — PWA sin scope portal

Marcar revisión si PWA solo usa scope global y no hay plan para portal cliente/ruta directa.

## 5. Salida esperada

Generar reportes:

```txt
VALIDACION-AUTH-ROLES-TENANT-PORTAL-AYS-<timestamp>.json
VALIDACION-AUTH-ROLES-TENANT-PORTAL-AYS-<timestamp>.txt
```

Decisión:

- `OK`;
- `REQUIERE_REVISION`;
- `BLOQUEADO`.

## 6. Restricciones

- Solo lectura.
- No Firestore.
- No Storage.
- No writes.
- No datos reales.
- No deploy.

## 7. Estado

Especificación documentada. El ejecutable puede crearse después desde Codex/local.
