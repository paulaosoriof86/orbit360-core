# Addendum — modificaciones locales para Claude: hotfixes P0 v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Este addendum alimenta el registro acumulado de modificaciones locales que Claude debe conservar cuando vuelva a tener capacidad.

## Base

Última candidata Claude auditada:

```txt
Prototype Development Request - 2026-07-08T135740.684.zip
```

Estado:

```txt
Aceptada como última base incremental frontend/UX.
No cerró todos los P0.
ChatGPT/Codex preparó hotfixes P0 para empalme seguro.
```

## Modificaciones locales que Claude debe replicar/conservar

### 1. Cobros + Conciliaciones

Archivos objetivo:

```txt
modules/cobros.js
modules/conciliaciones.js
```

Cambios locales:

- Eliminar `readAsDataURL`/base64/factData.
- Factura como metadata-only.
- Validar reporte exige motivo.
- Aplicar pago exige motivo.
- Aplicar pago bloquea falta/incoherencia país-moneda.
- GT debe ser GTQ.
- CO debe ser COP.
- Factura no concilia automáticamente.
- Conciliación validada = validada no aplicada.
- M5 no toca cobros ni aplica pagos.
- Anular conciliación exige `ANULAR`.
- Auditoría por acción sensible.

Instrucción futura para Claude:

```txt
No reintroducir copy de pago aplicado/conciliado desde soporte o factura.
No convertir validación M5 en aplicación de pago.
```

### 2. Portal

Archivo objetivo:

```txt
modules/portal.js
```

Cambios locales:

- Soporte de pago crea documento metadata-only.
- Relación cobro-documento mediante `soporteDocumentoId`.
- `storageEstado: pendiente_storage`.
- `soporteMetaOnly: true`.
- Historial `reportado_cliente`.
- Auditoría `pago_reportado_recibido`.
- Fecha dinámica.
- Documento general también usa metadata-only.

Instrucción futura para Claude:

```txt
El cliente puede reportar soporte, pero eso no aplica pago. El estado debe mostrarse como recibido/en revisión/pendiente de validación.
```

### 3. Config + Equipo

Archivos objetivo:

```txt
modules/configuracion.js
modules/equipo.js
```

Cambios locales:

- No guardar key/token en frontend/store.
- Usar `credentialRef` y `backend_required`.
- Estado `pendiente_conexion`.
- Guardar integración exige motivo.
- Cambiar plan exige motivo.
- Guardar módulos activos exige motivo.
- Crear/editar/inactivar usuario exige motivo.
- Bloquear último administrador activo.
- Reset permisos exige `RESTABLECER` + motivo.
- Auditoría por tenant.

Instrucción futura para Claude:

```txt
Integración preparada no equivale a integración activa. No mostrar campos de secretos ni pedir API keys reales en la UI de prototipo.
```

### 4. Academia

Archivo objetivo:

```txt
data/academia-plus.js
```

Cambios locales:

- Agregar ruta roles/permisos/auditoría segura.
- Agregar ruta cambios locales post-Claude.
- Incluir último administrador protegido.
- Incluir motivo obligatorio y confirmación reforzada.
- Incluir historial cliente vs interno.
- Incluir datos prohibidos en auditoría.
- Incrementar `CONTENT_V`.

Instrucción futura para Claude:

```txt
Academia debe quedar profunda, por rol, con evaluaciones y certificados; no como texto plano superficial.
```

## Runner único

Archivo:

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
```

Claude debe saber que estos hotfixes son baseline post-Claude y no debe revertirlos.

## Estado

Addendum creado. Debe incluirse en próximo paquete Claude descargable cuando Paula lo solicite o Claude recupere capacidad.