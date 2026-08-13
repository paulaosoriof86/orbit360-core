# Contrato Portal Cliente — vista 360, pólizas, trazabilidad y notificaciones

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin Firestore real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Ampliar el Portal del Cliente para que no sea una ficha mínima, sino una vista útil y clara de la relación del cliente con el tenant.

## 2. Regla de experiencia

El cliente debe poder entender qué tiene, qué está pendiente, qué está en proceso y qué requiere su acción.

La UI debe ser visual, sencilla y móvil, pero no pobre en información.

## 3. Pólizas

Cada póliza debe tener ficha visual con detalle suficiente:

- aseguradora;
- ramo/producto;
- número de póliza;
- vigencia;
- estado;
- moneda;
- prima total y desglose visible según permisos;
- recibos pagados y pendientes;
- documentos visibles;
- asesor;
- próximas acciones;
- trazabilidad.

## 4. Elementos en curso visibles para cliente

El portal debe mostrar si existen:

- próximas renovaciones;
- cotizaciones en curso;
- emisiones en curso;
- inspecciones en curso;
- solicitudes activas;
- documentos pendientes;
- datos faltantes;
- pagos reportados pendientes;
- siniestros/reclamos en curso;
- actualizaciones relevantes.

## 5. Ventana grande al ingresar

Si el cliente tiene pendientes o actualizaciones relevantes, al ingresar debe aparecer una ventana grande o panel destacado con:

- título claro;
- resumen de lo pendiente;
- prioridad;
- acciones disponibles;
- fecha límite si aplica;
- contacto del asesor;
- botón para ver detalle.

También debe quedar en Notificaciones.

## 6. Trazabilidad visible

El cliente debe ver la trazabilidad de sus solicitudes en lenguaje simple:

- recibido;
- en revisión;
- asignado;
- pendiente de información;
- en gestión con aseguradora;
- resuelto;
- cerrado;
- rechazado con explicación si aplica.

No mostrar notas internas ni información sensible operativa.

## 7. Facturas y documentos visibles

Si en Cobros se adjunta factura, recibo, comprobante o soporte visible para cliente, el Portal debe poder mostrarlo asociado a:

- póliza;
- recibo/cobro;
- pago aplicado o pendiente;
- estado de conciliación;
- fecha;
- monto;
- moneda.

## 8. Notificaciones

Las notificaciones del Portal deben incluir:

- pagos pendientes o reportados;
- factura/documento adjunto;
- solicitud recibida o resuelta;
- dato/documento faltante;
- renovación próxima;
- cotización/emisión/inspección en curso;
- cambio de estado relevante.

## 9. Restricciones

No mostrar:

- cartera global;
- otros clientes;
- comisiones;
- notas internas;
- información técnica;
- documentos privados operativos;
- estados de conexión internos.

## 10. Academia y manuales

Actualizar:

- manual Portal Cliente;
- ruta Cliente nuevo;
- manual Cliente360;
- manual Cobros;
- manual Notificaciones;
- evaluación de cliente sobre uso del portal.

## 11. Estado

Contrato creado. Debe guiar frontend Claude, backend ChatGPT/Codex y validadores futuros.
