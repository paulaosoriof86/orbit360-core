# Runbook — aplicar hotfix P0 Portal v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Cerrar el P0 de Portal detectado en la reauditoría de certeza:

```txt
- soporte de pago como documento/adjunto metadata-only;
- fecha dinámica de gestión;
- relación cobro-documento;
- historial visible para cliente;
- no base64, no URL pública, no Storage simulado.
```

## Script creado

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-PORTAL-V1330.mjs
```

## Comando único

Desde la raíz del repo:

```powershell
node orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-PORTAL-V1330.mjs
```

## Qué hace

- Hace backup local en `_backups/`.
- Parchea únicamente:
  - `orbit360-platform/modules/portal.js`
- Ejecuta `node --check` a `portal.js`.
- Genera reporte en `_orbit360_reports/`.
- No hace commit.
- No hace push.
- No hace deploy.
- No toca Firestore.
- No toca backend protegido.
- No toca `index.html`.

## Cambios aplicados por el script

### Reportar pago

- El reporte no aplica pago automáticamente.
- El soporte del pago se registra como documento metadata-only:
  - `tipo: soporte_pago`.
  - `metaOnly: true`.
  - `storageEstado: pendiente_storage`.
  - `estado: en_revision`.
- El cobro queda relacionado con:
  - `soporteDocumentoId`.
  - `soporteMetaOnly`.
  - `soporteEstado`.
- Se agrega historial de `reportado_cliente`.
- Se registra auditoría `pago_reportado_recibido`.
- La gestión usa fecha dinámica `Orbit.ui.today()`.

### Subir documento general

- Reutiliza helper metadata-only.
- Refuerza que el documento no reemplaza datos por sí solo.
- Registra auditoría documental.

## Qué revisar después

El comando debe devolver JSON con:

```txt
ok: true
checks: portal.js code 0
reportFile: _orbit360_reports/...
backupRoot: _backups/...
```

## Impacto Claude/prototipo

Sí aplica. Claude debe conservar:

- soporte de pago como documento metadata-only;
- historial visible para cliente;
- no pago aplicado desde reporte;
- copy honesto de revisión;
- no base64 ni Storage real simulado.

## Estado

Script de empalme Portal creado. Pendiente ejecución local o aplicación controlada sobre worktree.