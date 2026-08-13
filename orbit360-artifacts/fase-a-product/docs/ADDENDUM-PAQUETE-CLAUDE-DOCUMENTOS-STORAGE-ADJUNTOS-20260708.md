# Addendum paquete Claude — Documentos + Storage futuro + adjuntos

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Estado

Este addendum debe anexarse al paquete Claude acumulado post Equipo/Config + M5.

## Instrucción principal para Claude

El próximo candidato debe incorporar Documentos + Adjuntos + Storage futuro como flujo honesto y seguro:

- documento recibido no equivale a dato aprobado;
- soporte de pago no equivale a pago aplicado;
- documento de identidad no modifica cliente sin diff;
- póliza emitida no crea/activa cartera sin país, moneda, estado y validación;
- Storage pendiente no debe mostrarse como Storage conectado;
- todo documento debe conservar trazabilidad y estado.

## Módulos impactados

Claude debe revisar/actualizar:

```txt
Portal Cliente
Cobros
Finanzas / M5 Conciliaciones
Cliente360
Operativo / Gestiones
Pólizas / Expediente
Importador
Documentos
Academia
Manual maestro
Notificaciones
Configuración / permisos por rol
```

## UX esperada

### Portal Cliente

- Botón/reportar pago puede permitir soporte.
- Estado inicial: `Soporte recibido · pendiente de validación`.
- No mostrar `Pago aplicado` hasta que el flujo autorizado lo aplique realmente.
- Mostrar historial de revisión con lenguaje claro.

### Cobros / Finanzas

- Ver soporte adjunto asociado a pago reportado o conciliación.
- Acciones: revisar, vincular, rechazar, bloquear, pedir aclaración.
- No aplicar pago desde documento sin conciliación y autorización.

### Cliente360

- Pestaña o bloque de documentos por cliente/póliza.
- Separar expediente aprobado vs documentos en revisión.
- Mostrar parches pendientes y diffs.

### Operativo / Gestiones

- Documento puede crear gestión de revisión, no cambio directo.
- Solicitud de información faltante debe quedar trazable.

### Academia

Agregar rutas/lecciones según `ACADEMIA-IMPACTO-DOCUMENTOS-STORAGE-ADJUNTOS-AYS-20260708.md`.

## Copy obligatorio

```txt
Soporte recibido. Pendiente de validación por el equipo.
Documento en revisión.
Cambio propuesto pendiente de aprobación.
Documento aprobado para expediente.
Referencia preparada para canal seguro de documentos.
```

## Copy prohibido sin conexión/aplicación real

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

## Validación esperada del candidato Claude

Debe pasar auditoría forense y revisar:

- textos honestos;
- rutas a módulos;
- sin Storage real simulado;
- sin datos reales;
- sin credenciales;
- sin escritura directa de clientes/pólizas/cobros desde documentos;
- sin mezclar cobros, cartera y finmovs;
- Academia actualizada.

## Estado

Addendum creado. Debe incluirse cuando Paula autorice enviar paquete integral a Claude.