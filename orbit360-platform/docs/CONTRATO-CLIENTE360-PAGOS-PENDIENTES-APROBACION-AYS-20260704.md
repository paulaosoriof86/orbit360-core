# Contrato Cliente360 — pagos reportados pendientes de aprobación

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Hallazgo

Paula detectó que cuando un cliente reporta un pago desde Portal, el pago tampoco aparece en la ficha Cliente360 / Pagos con estado pendiente de aprobación.

Este hallazgo complementa el diagnóstico anterior:

- el pago reportado cae en `Gestiones Admin`;
- el soporte queda como `soporteNombre` en `cobros`;
- no se crea `documentos`;
- no se crea `conciliacionBanco`;
- no hay `documentoIds[]` ni `conciliacionId`;
- no existe estado visible y trazable en Cliente360 / Pagos.

## 2. Decisión de producto

Todo pago reportado por cliente debe aparecer en Cliente360, pestaña Recibos/Pagos, con estado visible:

```txt
Pendiente de aprobación / Pendiente de conciliación
```

No debe quedar oculto únicamente en Portal, Actividades o Gestiones Admin.

## 3. Objetivo

Cliente360 debe ser la ficha integral. Si ocurre algo relevante con el cliente, debe poder verse desde su expediente:

- pago reportado;
- soporte adjunto;
- estado de revisión;
- responsable;
- asesor notificado;
- gestión relacionada;
- conciliación relacionada;
- historial de cambios.

## 4. Estado esperado en Cliente360 / Pagos

Cuando un cliente reporta pago:

- el recibo/cobro conserva su estado financiero real: no pagado hasta validación;
- se muestra un badge de reporte: `Pago reportado`;
- se muestra estado: `Pendiente de aprobación` o `Pendiente de conciliación`;
- se muestra soporte adjunto o nombre de soporte si Storage real no existe;
- se muestra fecha de reporte;
- se muestra nota del cliente;
- se muestra gestión relacionada;
- se muestra conciliación relacionada si existe;
- se muestra asesor relacionado y notificación registrada;
- se permite abrir detalle/trazabilidad.

## 5. Campos mínimos de lectura en `cobros`

Hasta que exista modelo backend completo, la UI puede leer:

- `reportado`;
- `soporteNombre`;
- `notaReporte`;
- `estadoAprobacionPago`;
- `estadoConciliacion`;
- `gestionId`;
- `conciliacionId`;
- `documentoIds[]`.

Si los últimos campos aún no existen, deben prepararse como pendientes y mostrarse honestamente con datos disponibles.

## 6. Relación esperada entre colecciones

```txt
cobros.reportado = fecha/hora del reporte
cobros.estadoAprobacionPago = pendiente_aprobacion | aprobado | rechazado
cobros.estadoConciliacion = pendiente_conciliacion | conciliado | requiere_validacion
cobros.gestionId -> gestiones.id
cobros.conciliacionId -> conciliacionBanco.id
cobros.documentoIds[] -> documentos.id
```

## 7. Reglas de no aplicación automática

Un pago reportado por cliente no debe cambiar el recibo a pagado automáticamente.

El flujo correcto es:

1. cliente reporta pago;
2. sistema registra reporte;
3. Cliente360 muestra pendiente de aprobación;
4. Cobros/Operativo revisa soporte;
5. si corresponde, concilia/aplica pago;
6. solo entonces cambia el estado financiero del recibo.

## 8. Notificaciones

Al reportarse el pago deben notificarse:

- Cobros/Operativo;
- asesor relacionado;
- cliente con confirmación de recepción.

Cuando cambie el estado del pago:

- cliente ve estado en Portal;
- asesor ve actualización;
- Cliente360 muestra historial;
- Cobros conserva evidencia.

## 9. Vista esperada

En Cliente360 / Recibos y pagos debe existir una fila/tarjeta con:

- número de recibo/cuota;
- póliza;
- monto;
- vencimiento;
- estado financiero;
- estado del reporte;
- soporte;
- acciones: ver soporte, ver gestión, ver conciliación, aprobar/rechazar si el rol tiene permiso.

## 10. Impacto en Ops y Cobros

El pago reportado debe aparecer simultáneamente en:

- Cliente360 / Pagos;
- Cobros / Conciliación;
- Ops / Pagos reportados o Conciliación;
- Portal del Cliente / estado del reporte;
- Notificaciones del asesor;
- Actividad/historial del cliente.

## 11. Criterio de aceptación

El flujo se considera correcto cuando:

- el cliente reporta pago desde Portal;
- Cliente360 muestra el pago como pendiente de aprobación/conciliación;
- Cobros puede revisar soporte;
- Ops lo ve en lista correcta, no administrativa general;
- asesor recibe aviso;
- cliente recibe confirmación;
- no se marca pagado sin aprobación;
- todo queda trazado.

## 12. Academia y manuales

Actualizar:

- manual Cliente360;
- manual Portal;
- manual Cobros;
- manual Ops;
- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- evaluación sobre reporte y aprobación de pagos.

## 13. Estado

Contrato creado. No modifica backend protegido ni implementa Storage/Firestore. Debe guiar corrección frontend y validadores backend.
