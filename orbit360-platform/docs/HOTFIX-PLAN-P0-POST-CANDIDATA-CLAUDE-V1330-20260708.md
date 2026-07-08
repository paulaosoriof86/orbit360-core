# Hotfix plan P0 — post candidata Claude v1330 `2026-07-08T135740`

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Corregir los hallazgos P0 de la auditoría para convertir la candidata Claude en baseline frontend corregida sin tocar backend protegido.

## Orden de ejecución recomendado

### Bloque A — Cobros

Archivo objetivo:

```txt
modules/cobros.js
```

Cambios:

- Quitar `FileReader.readAsDataURL`.
- Guardar factura como metadata-only:
  - `facturaNombre`.
  - `facturaMetaOnly=true`.
  - `facturaEstado='en_revision'` o similar.
- Motivo obligatorio al validar reporte.
- Motivo obligatorio al aplicar pago.
- Guard país/moneda antes de aplicar.
- Copy: factura adjunta no concilia automáticamente; queda evidencia para revisión/conciliación.

### Bloque B — Conciliaciones

Archivo objetivo:

```txt
modules/conciliaciones.js
```

Cambios:

- Motivo obligatorio para validar.
- Confirmación reforzada para anular.
- Guard país/moneda al validar.
- Copy `VALIDADA` → `VALIDADA · no aplicada` o equivalente.

### Bloque C — Portal

Archivo objetivo:

```txt
modules/portal.js
```

Cambios:

- Al reportar pago con soporte, crear registro en `documentos` metadata-only.
- Crear relación/adjunto conceptual vinculado a cobro si existe colección `adjuntos` o al menos datos `documentoSoporteId` en cobro.
- Fecha de gestión dinámica, no `2026-06-26`.

### Bloque D — Config/Equipo

Archivos objetivo:

```txt
modules/configuracion.js
modules/equipo.js
```

Cambios:

- Equipo: motivo al crear/editar/inactivar usuario.
- Equipo: bloquear inactivar último admin.
- Equipo: reset permisos con motivo/confirmación.
- Config: plan/módulos/reset con motivo.
- Config integraciones: no guardar key/token; usar `credentialRef: backend_required`.

### Bloque E — Academia

Archivo objetivo:

```txt
data/academia-plus.js
```

Cambios:

- Incorporar roles/permisos v1330.
- Incorporar auditoría unificada.
- Incluir historial cliente vs interno.
- Mantener rutas por rol y certificados.

## Validación

Usar cuando sea necesario:

```powershell
node tools/orbit360-run-validaciones-agrupadas-v1330.mjs
```

## Restricciones

- No tocar `index.html` directo.
- No tocar backend protegido.
- No datos reales.
- No secretos.
- No deploy.
- No merge.
- No main.

## Estado

Plan de hotfix P0 listo. Siguiente bloque puede implementar Cobros/Conciliaciones primero.