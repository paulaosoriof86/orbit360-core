# Pendientes Claude — Ops, Portal, gestiones y notificaciones v1.123

Fecha: 2026-07-04
Base: `Prototype Development Request - 2026-07-04T152321.882.zip`
Estado: pendientes frontend/prototipo. No tocar backend protegido.

## Regla general

Claude debe corregir UX/ruteo visible y estado del prototipo sin tocar:

- `data/store.js`
- `data/store-firestore-lab.local.js`
- `core/backend-lab-*`
- `firestore.rules`
- `tools/orbit360-*`

## P0-OPS-01 — Pago reportado no debe caer en Gestiones Admin

### Actual

`modules/portal.js` crea gestión con:

```txt
lista: Gestiones Admin
tipo: Validar pago reportado
```

### Esperado

Crear o mostrar en lista específica:

```txt
Pagos reportados / Conciliación
```

Debe quedar visible para Cobros/Operativo y asociado al cliente, póliza, cobro y asesor.

## P0-OPS-02 — Soporte de pago debe verse como documento/adjunto

### Actual

El archivo queda solo como `soporteNombre` en el cobro y texto en actividad.

### Esperado frontend/prototipo

Aunque no haya Storage real, debe verse claramente:

- soporte adjunto del pago reportado;
- nombre del archivo;
- relación con la gestión;
- relación con Cobros;
- estado de revisión.

No afirmar carga real a Storage si no existe.

## P0-OPS-03 — Notificar al asesor cuando el cliente reporte pago

### Actual

No hay notificación formal clara al asesor. Algunos flujos usan `notify()` con datos de cliente, lo que puede abrir canal incorrecto.

### Esperado

Cuando cliente reporta pago:

- confirmar recepción al cliente;
- avisar al asesor relacionado;
- avisar a Cobros/Operativo;
- dejar actividad/trazabilidad visible.

Si WhatsApp/correo no está conectado realmente, mostrar estado honesto: notificación interna registrada / pendiente de conexión.

## P1-OPS-04 — Ampliar listas/filtros de Ops

Agregar vistas/listas/filtros para:

- Pagos reportados / Conciliación;
- Documentos / Soportes;
- Siniestros / Reclamos;
- Cancelaciones / Retención;
- Pólizas / Emisión / Endosos;
- Soporte Portal;
- Urgentes / Escaladas.

La lista `Gestiones Admin` debe quedar como residual.

## P1-OPS-05 — Estados separados por audiencia

Mostrar o preparar estructura visual para:

- estado interno;
- estado cliente;
- estado asesor.

Ejemplo:

```txt
Interno: pendiente_conciliacion
Cliente: recibido / en revisión
Asesor: recibido / pendiente operativo
```

## P1-OPS-06 — Solicitudes de Portal deben rutear según tipo

No todo debe ir a `Gestiones Admin`:

- reclamo/siniestro → Siniestros / Reclamos;
- cancelación → Cancelaciones / Retención;
- documento → Documentos / Soportes;
- pago → Pagos reportados / Conciliación;
- póliza/endoso/emisión → Pólizas / Emisión / Endosos;
- consulta general → Soporte Portal.

## P1-OPS-07 — Manuales y Academia

Actualizar o registrar pendiente en:

- manual Ops;
- manual Portal Cliente;
- manual Cobros;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- evaluación sobre seguimiento de solicitudes y reporte de pagos.

## Criterio de aceptación

La corrección se considera aceptable si:

- pago reportado no aparece como administrativa genérica;
- asesor y Cobros reciben aviso visible;
- cliente ve estado de recepción/revisión;
- soporte se conserva visualmente como adjunto/documento;
- no se afirma envío real ni Storage real si no está conectado;
- backend protegido permanece intacto.
