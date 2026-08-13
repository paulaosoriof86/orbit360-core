# Runbook — aplicar hotfix P0 Cobros + Conciliaciones v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Cerrar el empalme seguro de los P0 más sensibles detectados en la candidata Claude v1330 sin tocar backend protegido ni `index.html`.

## Script creado

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-COBROS-CONCILIACIONES-V1330.mjs
```

## Comando único

Desde la raíz del repo:

```powershell
node orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-COBROS-CONCILIACIONES-V1330.mjs
```

## Qué hace

- Hace backup local en `_backups/`.
- Parchea únicamente:
  - `orbit360-platform/modules/cobros.js`
  - `orbit360-platform/modules/conciliaciones.js`
- Ejecuta `node --check` a ambos módulos.
- Genera reporte en `_orbit360_reports/`.
- No hace commit.
- No hace push.
- No hace deploy.
- No toca Firestore.
- No toca backend protegido.
- No toca `index.html`.

## Cobros — cambios aplicados

- `Validada (por aplicar)` cambia a `Validada (por confirmar)`.
- Validar reporte exige motivo obligatorio.
- Rechazar reporte exige motivo y conserva soporte/trazabilidad.
- Aplicar pago exige motivo obligatorio.
- Aplicar pago bloquea país/moneda faltante o incoherente.
- GT exige GTQ.
- CO exige COP.
- Factura queda metadata-only.
- Se elimina generación de base64/readAsDataURL/factData.
- Factura no concilia automáticamente.
- Auditoría se registra en colección `auditoria`.

## Conciliaciones — cambios aplicados

- Estado visible `VALIDADA · no aplicada`.
- Validar exige motivo obligatorio.
- Validar bloquea país/moneda faltante o incoherente.
- Anular exige confirmación reforzada `ANULAR`.
- Validar no aplica pagos ni toca cobros.
- Auditoría se registra en colección `auditoria`.

## Qué revisar después

El comando debe devolver JSON con:

```txt
ok: true
checks: cobros.js code 0, conciliaciones.js code 0
reportFile: _orbit360_reports/...
backupRoot: _backups/...
```

## Estado

Script de empalme creado. Pendiente ejecución local cuando Paula esté en computador o cuando se aplique por worktree autorizado.