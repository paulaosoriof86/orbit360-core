# Registro — empalme/hotfix P0 Portal v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Después de Cobros + Conciliaciones, el siguiente P0 de empalme seguro es Portal:

```txt
- soporte de pago como documento/adjunto metadata-only;
- fecha dinámica de gestión;
- relación cobro-documento;
- historial visible para cliente.
```

## Bloque trabajado

Se creó script de hotfix seguro para aplicar sobre `modules/portal.js` sin tocar backend protegido ni `index.html`.

## Archivos agregados

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-PORTAL-V1330.mjs
orbit360-platform/docs/RUNBOOK-APLICAR-HOTFIX-P0-PORTAL-V1330-20260708.md
orbit360-platform/docs/REGISTRO-EMPALME-HOTFIX-P0-PORTAL-V1330-20260708.md
```

## Qué corrige

### Portal — reportar pago

- El soporte de pago crea un documento metadata-only.
- El documento queda `estado: en_revision`.
- El documento queda `storageEstado: pendiente_storage`.
- El cobro queda vinculado con `soporteDocumentoId`.
- El cobro conserva `soporteNombre`, `soporteMetaOnly`, `soporteEstado`.
- El historial del cobro registra `reportado_cliente`.
- Se registra auditoría `pago_reportado_recibido`.
- La gestión usa fecha dinámica.
- El copy dice soporte recibido/pendiente de validación.

### Portal — subir documento general

- Reutiliza helper metadata-only.
- Registra auditoría `documento_recibido_metadata_only`.
- Refuerza que el documento no modifica datos por sí solo.

## Restricciones cumplidas

- No merge.
- No deploy.
- No main.
- No producción.
- No datos reales.
- No secretos.
- No Firestore writes.
- No backend protegido.
- No `index.html`.

## ¿Aplica a Claude/prototipo?

Sí.

Instrucción futura para Claude:

- Conservar soporte de pago como documento metadata-only.
- Mostrar historial visible para cliente.
- Nunca convertir soporte reportado en pago aplicado.
- Mantener `storageEstado: pendiente_storage` cuando Storage real no esté conectado.
- No usar base64 ni URL pública.

## Pendientes derivados

- Ejecutar script en worktree local o aplicar módulo corregido.
- Ejecutar `node --check`.
- Documentar cierre con reporte/commit.
- Continuar Config/Equipo gates y Academia.