# Contrato Ops — ruteo de gestiones, notificaciones y trazabilidad

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Decisión de producto

No es correcto que todo lo que pidan clientes, asesores u otros usuarios quede únicamente en una lista genérica de `gestiones administrativas`.

Sí debe existir una bandeja central de Ops para control y supervisión, pero cada gestión debe clasificarse y rutearse por:

- origen;
- solicitante;
- tipo de gestión;
- módulo destino;
- responsable;
- prioridad;
- SLA;
- asesor relacionado;
- cliente relacionado;
- póliza/cobro/documento relacionado;
- estado;
- trazabilidad.

## 2. Bandeja central vs listas específicas

### Bandeja central Ops

Ops debe tener una vista global tipo tablero de todo lo que está pendiente, vencido, asignado o bloqueado.

### Listas específicas

Además de la bandeja central, deben existir listas o filtros por tipo:

- pagos_reportados / conciliación;
- cobros y cartera;
- emisión / pólizas;
- renovaciones;
- cancelaciones;
- siniestros;
- documentos / soportes;
- datos del cliente;
- solicitud comercial;
- soporte de portal;
- requerimiento de aseguradora;
- gestión administrativa general;
- urgente / escalada.

La lista administrativa general debe ser residual: solo para gestiones que no encajan en flujos operativos específicos.

## 3. Clasificación mínima de una gestión

Campos recomendados:

- id
- tenantId
- origen
- canal
- solicitanteTipo
- solicitanteId
- clienteId
- asesorId
- polizaId
- cobroId
- documentoIds[]
- conciliacionId
- tipoGestion
- subTipoGestion
- moduloDestino
- listaDestino
- responsableRol
- responsableId
- prioridad
- slaHoras
- estado
- estadoCliente
- estadoAsesor
- descripcion
- trazabilidad[]
- notificaciones[]
- createdAt
- updatedAt
- closedAt

## 4. Orígenes permitidos

- portal_cliente
- asesor
- operativo
- cobros
- cliente360
- polizas
- renovaciones
- cancelaciones
- siniestros
- importador
- aseguradora
- sistema
- automatizacion

## 5. Tipos de gestión sugeridos

- pago_reportado
- solicitud_documento
- actualizacion_datos_cliente
- gestion_poliza
- emision
- endoso
- renovacion
- cancelacion
- reclamo_siniestro
- solicitud_cobro
- solicitud_comercial
- consulta_cliente
- requerimiento_aseguradora
- soporte_portal
- gestion_administrativa
- escalamiento

## 6. Matriz de ruteo inicial

| Tipo | Lista destino | Responsable principal | Notificar asesor | Notificar cliente |
|---|---|---|---|---|
| pago_reportado | conciliacion/cobros | Cobros/Operativo | Sí | Sí |
| solicitud_documento | documentos | Operativo | Sí | Sí |
| actualizacion_datos_cliente | cliente360 | Operativo | Sí | Según origen |
| gestion_poliza | polizas | Operativo | Sí | Según estado |
| emision | polizas/emision | Operativo | Sí | Según estado |
| endoso | polizas/endosos | Operativo | Sí | Según estado |
| renovacion | renovaciones | Renovaciones/Asesor | Sí | Sí |
| cancelacion | cancelaciones/retención | Operativo/Asesor | Sí | Sí |
| reclamo_siniestro | siniestros | Reclamos/Operativo | Sí | Sí |
| solicitud_cobro | cobros | Cobros | Sí | Sí |
| solicitud_comercial | leads/ops | Asesor | Sí | Según origen |
| consulta_cliente | servicio/portal | Asesor u Operativo | Sí | Sí |
| requerimiento_aseguradora | aseguradoras/ops | Operativo | Sí si afecta cliente | No siempre |
| soporte_portal | soporte/portal | Operativo/Admin | Sí si afecta cliente | Sí |
| gestion_administrativa | administrativa | Operativo/Admin | Según caso | Según caso |
| escalamiento | urgente | Dirección/Responsable | Sí | Según caso |

## 7. Pago reportado por cliente

Cuando un cliente reporte un pago:

1. crear `documentos` si adjunta soporte;
2. crear `conciliacionBanco` en `pendiente_conciliacion`;
3. crear `gestiones` tipo `pago_reportado`;
4. `listaDestino = conciliacion/cobros`;
5. `responsableRol = cobros_operativo`;
6. notificar al asesor relacionado;
7. notificar a Cobros/Operativo;
8. confirmar recepción al cliente;
9. no aplicar pago automáticamente;
10. mantener trazabilidad de cada cambio.

## 8. Notificaciones obligatorias al asesor

El asesor relacionado debe ser notificado cuando un cliente suyo:

- reporta pago;
- adjunta soporte;
- solicita gestión;
- modifica datos importantes;
- solicita renovación, cancelación o reclamo;
- carga documento relevante;
- recibe respuesta operativa;
- tiene gestión vencida o bloqueada.

Excepción: si la gestión es estrictamente administrativa interna y no afecta al cliente ni al asesor, puede omitirse.

## 9. Retroalimentación al cliente y asesor

Cada gestión debe tener estados visibles por audiencia:

- `estado` interno;
- `estadoCliente` para portal;
- `estadoAsesor` para seguimiento comercial.

Estados sugeridos:

- recibido;
- en_revision;
- asignado;
- esperando_informacion;
- en_gestion;
- resuelto;
- rechazado;
- cerrado;
- vencido;
- escalado.

La plataforma debe poder enviar o mostrar retroalimentación cuando:

- se recibe la solicitud;
- se asigna responsable;
- se requiere información;
- se resuelve;
- se rechaza;
- se aplica pago;
- se cierra;
- se escala.

## 10. Trazabilidad mínima

Cada cambio debe registrar:

- fecha/hora;
- usuario o sistema;
- rol;
- acción;
- estado anterior;
- estado nuevo;
- comentario;
- documentoIds[] si aplica;
- notificación generada;
- módulo origen/destino.

## 11. Relación con Academia y manuales

Cualquier cambio de este contrato debe actualizar:

- manual de Ops;
- manual de Portal Cliente;
- manual de Cobros;
- manual de Cliente360;
- ruta Administrativo/Operativo;
- ruta Asesor nuevo;
- ruta Cliente nuevo;
- evaluación de seguimiento de gestiones;
- notificación de actualización de Academia.

## 12. Criterio de aceptación futuro

El flujo se considerará correcto cuando:

- una solicitud no caiga sin clasificar en administrativa general;
- la lista destino corresponda al tipo de gestión;
- el asesor sea notificado si afecta a su cliente;
- el cliente reciba retroalimentación si la solicitud vino de Portal;
- Cobros vea pagos reportados con soporte;
- documentos no se pierdan;
- el historial muestre toda la trazabilidad;
- las notificaciones queden registradas.

## 13. Estado

Contrato creado para guiar auditoría y backend. No implementa Firestore ni modifica `data/store.js` todavía.
