# Plan de implementación — Gates administrativos seguros v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Convertir la administración directa de Orbit 360 en una capacidad segura y comercializable: resolver casos operativos desde la plataforma sin depender de correcciones externas, pero sin permitir mutaciones sensibles sin permisos, confirmación, motivo y auditoría.

## Decisión metodológica

Se continuará localmente con auditoría/documentación y parches pequeños cuando el archivo local coincida exactamente con el remoto.

Codex se reserva para cambios que requieran:

- tocar varios módulos;
- integrar patrón transversal;
- modificar archivos grandes que no coinciden localmente;
- validar contrato backend;
- evitar reemplazos completos inseguros desde conector.

## Estado de archivos locales vs remoto

```txt
cobros.js: copia local exacta disponible; hotfix local preparado y node --check OK.
configuracion.js: copia local exacta disponible; pero archivo grande y cambio de gates requiere revisión integral.
equipo.js: copia local NO coincide con remoto; no reemplazar desde local.
aseguradoras.js: copia local NO coincide con remoto; no reemplazar desde local.
```

## Cambios mínimos que no deben quedar pendientes antes de operación real

### P0/P1 — Cobros lote

Aplicar hotfix funcional en `orbit360-platform/modules/cobros.js`:

- `Notificar por lote` -> `Preparar lote`.
- `Enviar recordatorios` -> `Preparar recordatorios`.
- `Recordatorio de cobro enviado` -> `Recordatorio de cobro preparado`.
- Toast final honesto.
- No afirmar WhatsApp/correo real como hecho consumado.

Referencia:

```txt
orbit360-platform/docs/PARCHE-LOCAL-LISTO-COBROS-LOTE-HONESTIDAD-V1330-20260707.md
```

### P0 — Configuración interna

Aplicar gates a:

- cambiar plan del cliente;
- guardar módulos activos;
- resetear tenant;
- activar/desactivar add-ons sensibles;
- configurar APIs/credenciales.

Requisitos:

- confirmación explícita;
- motivo obligatorio para plan/módulos/reset;
- actividad/auditoría con before/after;
- no permitir apagar `configuracion`;
- no permitir acciones internas si rol no es Dirección/Admin/Orbit interno.

### P0/P1 — Equipo / permisos

Aplicar gates a:

- crear usuario;
- editar roles;
- editar módulos visibles;
- editar permisos;
- inactivar usuario.

Requisitos:

- confirmar cambios de rol/permisos;
- auditoría con before/after;
- no permitir dejar tenant sin admin;
- no afirmar invitación enviada si no hay Auth/backend/canal conectado.

### P1 — Aseguradoras

Aplicar gates a:

- borrar aseguradora;
- editar cuentas;
- editar portales/credenciales;
- editar comisiones;
- importar planilla de comisiones.

Requisitos:

- bloquear borrado si hay pólizas/reclamos vinculados;
- sugerir desactivar vinculación en vez de borrar;
- registrar actividad/auditoría;
- mantener `credentialRef/backend_required`, nunca contraseña real en frontend.

### P1 — Siniestros

Aplicar gates a estados finales:

- `Aprobado`;
- `Pagado`;
- `Rechazado`.

Requisitos:

- confirmación;
- motivo obligatorio;
- actividad/auditoría;
- si `Aprobado/Pagado` sin monto aprobado, mantener alerta de monto pendiente.

### P1 — Cancelaciones

Aplicar protección anti-duplicados:

- no crear múltiples negocios de recuperación por guardar varias veces;
- guardar `recuperacionNegocioId` / `recuperacionGestionId` o equivalente;
- gate antes de crear reemisión/negocio;
- actividad/auditoría.

## Patrón recomendado

Si puede integrarse sin tocar `index.html`, crear helper no protegido:

```txt
orbit360-platform/core/admin-actions.js
```

API sugerida:

```txt
Orbit.adminAction({
  modulo,
  accion,
  nivel,
  entidadTipo,
  entidadId,
  descripcion,
  before,
  after,
  requiereMotivo,
  requiereConfirmacion,
  rolesPermitidos,
  run
})
```

Si no se puede cargar sin tocar `index.html`, no forzar. Implementar gates locales por módulo con `Orbit.ui.confirm` y documentar helper como fase posterior.

## Validaciones requeridas

```txt
node --check orbit360-platform/modules/cobros.js
node --check orbit360-platform/modules/configuracion.js
node --check orbit360-platform/modules/equipo.js
node --check orbit360-platform/modules/aseguradoras.js
node --check orbit360-platform/modules/siniestros.js
node --check orbit360-platform/modules/cancelaciones.js
node tools/orbit360-validar-backend-lab-contrato.mjs
```

## Restricciones

- No tocar `data/store.js`.
- No tocar `data/store-firestore-lab.local.js`.
- No tocar `core/auth.js`.
- No tocar `core/importa.js`.
- No tocar `backend-lab-*`.
- No tocar `firestore.rules`.
- No tocar `tools/orbit360-*`.
- No reemplazar `index.html`.
- No merge.
- No deploy.
- No main.
- No datos reales.
- No secretos.

## Documentación esperada después del hotfix

Crear/actualizar:

```txt
orbit360-platform/docs/HOTFIX-ADMIN-GATES-V1330-20260707.md
orbit360-platform/docs/HOTFIX-COBROS-LOTE-HONESTIDAD-V1330-20260707.md
```

Debe incluir:

- archivos modificados;
- antes/después;
- validaciones;
- impacto Academia;
- impacto Claude/prototipo;
- confirmación de backend protegido intacto.

## Estado

Pendiente de implementación funcional. La auditoría y el plan están documentados para ejecutar en un solo bloque controlado, preferiblemente con Codex si se decide tocar los módulos que no coinciden localmente.
