# Matriz de notificaciones — Cliente, Asesor, Ops y Cobros

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Principio

Todo movimiento relevante del cliente debe avisar al asesor relacionado y al rol operativo que corresponda. Además, toda gestión debe retroalimentar al solicitante con estado claro.

No basta crear una actividad interna. Debe existir comunicación y trazabilidad.

## 2. Audiencias

- Cliente
- Asesor relacionado
- Operativo/Ops
- Cobros
- Reclamos/Siniestros
- Renovaciones
- Dirección/Admin
- Sistema/Automatización

## 3. Eventos mínimos y destinatarios

| Evento | Cliente | Asesor | Ops | Cobros | Otros |
|---|---|---|---|---|---|
| Cliente reporta pago | Confirmación recibido | Sí | Sí | Sí | - |
| Cliente adjunta soporte | Confirmación recibido | Sí | Sí | Sí | - |
| Cliente solicita gestión | Confirmación recibido | Sí | Sí | Según tipo | - |
| Cliente actualiza datos | Confirmación/cambio en revisión | Sí | Sí | - | - |
| Cliente carga documento | Confirmación recibido | Sí | Sí | Según tipo | - |
| Cliente solicita renovación | Confirmación recibido | Sí | Sí | - | Renovaciones |
| Cliente solicita cancelación | Confirmación recibido | Sí | Sí | - | Retención/Dirección según monto |
| Cliente reporta siniestro | Confirmación recibido | Sí | Sí | - | Reclamos |
| Cliente consulta póliza | Respuesta/estado | Sí | Según caso | - | - |
| Asesor solicita gestión | - | Confirmación/estado | Sí | Según tipo | - |
| Cobros valida pago | Confirmación aplicado/rechazado | Sí | Sí | Sí | - |
| Gestión cambia estado | Según visibilidad | Sí si afecta cliente | Sí | Según tipo | - |
| Gestión se vence | - | Sí si afecta cliente | Sí | Según tipo | Dirección si escalada |
| Gestión se cierra | Cierre/resultado si solicitó | Sí | Sí | Según tipo | - |

## 4. Estados visibles

### Para cliente

- recibido
- en_revision
- esperando_informacion
- aplicado
- resuelto
- rechazado
- cerrado

### Para asesor

- recibido
- asignado
- en_gestion
- esperando_cliente
- pendiente_operativo
- resuelto
- vencido
- escalado

### Para Ops/Cobros

- nuevo
- asignado
- en_revision
- pendiente_documento
- pendiente_conciliacion
- requiere_validacion
- aprobado
- rechazado
- cerrado
- vencido
- escalado

## 5. Registro mínimo de notificación

Cada notificación debe registrar:

- id
- tenantId
- evento
- audiencia
- canal
- destinatarioId
- destinatarioRol
- clienteId
- asesorId
- gestionId
- documentoId
- conciliacionId
- mensajeResumen
- estadoEnvio
- createdAt
- readAt
- trazabilidad

## 6. Canales previstos

- notificación interna;
- correo;
- WhatsApp/wa.me;
- WhatsApp Cloud API vía Make;
- tarea/actividad interna;
- alerta en topbar;
- notificación de Academia cuando aplique.

Si el canal real no está conectado, mostrar estado honesto: pendiente de conexión o notificación interna registrada.

## 7. Reglas específicas

### Pago reportado

Debe notificar siempre a:

- cliente: recepción del reporte;
- asesor: cliente reportó pago;
- Cobros/Operativo: pago pendiente de conciliación;
- Ops: si requiere gestión adicional.

### Solicitud del cliente

Debe notificar siempre al asesor relacionado, salvo que sea una acción interna sin impacto comercial/servicio.

### Solicitud del asesor

Debe crear gestión y retroalimentar al asesor con estado.

### Cambios de estado

Cada cambio visible debe generar trazabilidad y, si aplica, notificación a cliente/asesor.

## 8. Academia y manuales

Este contrato exige actualización de:

- ruta Cliente nuevo;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- manual Portal;
- manual Ops;
- manual Cobros;
- curso sobre seguimiento y trazabilidad.

## 9. Estado

Matriz creada para guiar auditoría e implementación. No conecta canales reales ni modifica backend protegido.
