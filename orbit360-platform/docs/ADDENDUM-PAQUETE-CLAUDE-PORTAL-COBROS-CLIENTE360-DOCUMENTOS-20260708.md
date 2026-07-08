# Addendum paquete Claude — Portal + Cobros + Cliente360 documentos visibles

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Estado

Este addendum debe anexarse al paquete Claude acumulado.

## Instrucción principal para Claude

Actualizar UX/prototipo para que Portal Cliente, Cobros y Cliente360 cumplan el contrato documental:

- soporte de pago recibido no equivale a pago aplicado;
- reporte validado no equivale a pago aplicado;
- documento subido no equivale a dato aprobado;
- Cliente360 debe mostrar documentos visibles por rol/relación;
- Cobros debe pedir motivo para validar/rechazar/bloquear/aplicar;
- rechazar soporte no debe borrar trazabilidad;
- Storage no conectado debe mostrarse como pendiente/preparado, no activo.

## Cambios UX esperados

### Portal Cliente

- En reporte de pago, mostrar estado `Soporte recibido · pendiente de validación`.
- Crear tarjeta de seguimiento del reporte.
- Mostrar si se requiere aclaración.
- Permitir ver historial de revisión.
- No mostrar pago aplicado hasta flujo autorizado.

### Cobros

- Panel de revisión de soporte con acciones:
  - marcar en revisión;
  - solicitar aclaración;
  - rechazar con motivo;
  - validar reporte no aplicado;
  - aplicar pago autorizado;
  - bloquear/anular con motivo.
- Mostrar soporte/documento asociado.
- Mostrar país/moneda como dato bloqueante.

### Cliente360

Agregar pestaña o bloque `Documentos` con:

- expediente aprobado;
- soportes de pago en revisión;
- documentos en revisión;
- parches/diffs pendientes;
- historial de acciones.

## Copy obligatorio

```txt
Soporte recibido. Pendiente de validación por el equipo.
Reporte validado. Pendiente de aplicación autorizada.
Documento recibido. En revisión.
Cambio propuesto pendiente de aprobación.
Referencia preparada para canal seguro de documentos.
```

## Copy prohibido sin flujo real

```txt
Pago aplicado.
Cobro confirmado.
Documento subido a Storage real.
Cliente actualizado automáticamente.
Póliza activada automáticamente.
Conciliado automáticamente.
```

## Backend protegido

Claude no debe tocar ni reemplazar:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
orbit360-platform/index.html
```

## Academia

Debe incorporar el contenido de:

```txt
orbit360-platform/docs/ACADEMIA-IMPACTO-PORTAL-COBROS-CLIENTE360-DOCUMENTOS-V1330-20260708.md
```

## Estado

Addendum creado. Recomendado enviar a Claude como parte del paquete integral después de cerrar el próximo bloque de decisión hotfix vs candidata UX.