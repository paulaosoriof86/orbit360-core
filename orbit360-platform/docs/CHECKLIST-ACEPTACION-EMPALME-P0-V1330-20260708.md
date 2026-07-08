# Checklist de aceptación — empalme P0 v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Definir cuándo se puede declarar aceptado el empalme P0 post-candidata Claude v1330.

Este checklist aplica después de ejecutar:

```powershell
node orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
```

## Criterio mínimo de aceptación

El empalme P0 solo se acepta si el runner devuelve:

```txt
ok: true
status: ok
branch: ays/backend-tenant-lab-v99-20260703
forbidden: []
protectedChanges: []
```

Además, el reporte generado en `_orbit360_reports/` debe confirmar `node --check` OK en:

```txt
orbit360-platform/modules/cobros.js
orbit360-platform/modules/conciliaciones.js
orbit360-platform/modules/portal.js
orbit360-platform/modules/configuracion.js
orbit360-platform/modules/equipo.js
orbit360-platform/data/academia-plus.js
```

## Checklist funcional por módulo

### 1. Cobros

Aceptar solo si:

- No existe `readAsDataURL`.
- No existe `base64` usado para factura/soporte.
- No existe `factData`.
- Validar reporte exige motivo obligatorio.
- Aplicar pago exige motivo obligatorio.
- Aplicar pago bloquea si falta país/moneda.
- Aplicar pago bloquea GT con moneda distinta a GTQ.
- Aplicar pago bloquea CO con moneda distinta a COP.
- Factura queda metadata-only.
- Factura no concilia automáticamente.
- Se registra auditoría.
- El copy diferencia reportado, validado, aplicado y conciliado.

### 2. Conciliaciones M5

Aceptar solo si:

- Validar exige motivo obligatorio.
- Validar bloquea país/moneda faltante o incoherente.
- Validar no aplica pago.
- Validar no modifica cobros.
- Validar no crea finmovs.
- Estado visible dice `VALIDADA · no aplicada` o equivalente.
- Anular exige confirmación reforzada `ANULAR`.
- Rechazar/bloquear/anular conservan trazabilidad.
- Se registra auditoría.

### 3. Portal Cliente

Aceptar solo si:

- Reportar pago no aplica pago automáticamente.
- Soporte de pago crea documento metadata-only.
- Documento queda `estado: en_revision`.
- Documento queda `storageEstado: pendiente_storage`.
- Cobro queda vinculado a `soporteDocumentoId`.
- Cobro conserva `soporteNombre`, `soporteMetaOnly`, `soporteEstado`.
- Historial registra `reportado_cliente`.
- Auditoría registra `pago_reportado_recibido`.
- Gestión usa fecha dinámica.
- No hay base64 ni URL pública ni Storage simulado.

### 4. Configuración

Aceptar solo si:

- Integraciones no piden ni guardan key/token.
- Integraciones usan `credentialRef`.
- Cuando no existe proveedor seguro usan `backend_required`.
- Estado honesto `pendiente_conexion`.
- Guardar integración exige motivo.
- Cambiar plan exige motivo.
- Guardar módulos activos exige motivo.
- Se registra auditoría.
- No se muestra integración real como activa si no está conectada.

### 5. Equipo

Aceptar solo si:

- Crear usuario exige motivo.
- Editar usuario exige motivo.
- Cambiar roles/permisos exige motivo.
- Inactivar usuario exige motivo.
- Inactivar último administrador activo queda bloqueado.
- Reset permisos exige confirmación `RESTABLECER`.
- Reset permisos exige motivo.
- Se registra auditoría.

### 6. Academia

Aceptar solo si:

- Se agrega curso/ruta de roles, permisos y auditoría segura.
- Se agrega curso/ruta de modificaciones locales post-Claude.
- Incluye último administrador protegido.
- Incluye motivo obligatorio y confirmación reforzada.
- Incluye auditLog/auditoría y datos prohibidos.
- Incluye historial cliente vs historial interno.
- Incluye cambios locales de Cobros/M5/Portal/Config/Equipo.
- `CONTENT_V` se incrementa.
- Progreso/certificados existentes se conservan por la lógica de actualización.

## Checklist técnico

Aceptar solo si:

- Rama correcta.
- Sin cambios en protegidos.
- `index.html` intacto.
- `data/store.js` intacto.
- `store-firestore-lab.local.js` intacto.
- `core/backend-lab-*` intactos.
- `core/auth.js` intacto.
- `core/importa.js` intacto.
- `firestore.rules` intacto.
- Sin datos reales.
- Sin secretos.
- Sin tokens.
- Sin payloads/base64/bytes de documentos.
- Sin deploy.
- Sin merge.
- Sin main.

## Resultado de aceptación

Si todo está OK:

```txt
Empalme P0 v1330 aceptado como baseline frontend corregido post-Claude.
Pendiente: commit local controlado de módulos corregidos.
```

Si algo falla:

```txt
Empalme P0 bloqueado.
Corregir solo el bloque fallido.
No commit.
No push.
No deploy.
```

## Estado

Checklist creado. Pendiente aplicar tras ejecución local del runner.