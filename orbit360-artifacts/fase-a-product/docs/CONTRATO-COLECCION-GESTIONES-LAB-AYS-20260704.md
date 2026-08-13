# Contrato colección `gestiones` — LAB A&S

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato backend/documental. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir `gestiones` como entidad operativa trazable, clasificada y enrutable. Una gestión no debe ser solo una tarjeta en Ops; debe ser una solicitud con origen, tipo, destino, responsable, estados, notificaciones, documentos relacionados y trazabilidad.

## 2. Regla principal

Toda solicitud de cliente, asesor, operativo, sistema, importador o aseguradora debe tener:

- tipo canónico;
- origen;
- lista destino;
- módulo destino;
- responsable;
- asesor relacionado cuando aplique;
- estado interno;
- estado visible para cliente si aplica;
- estado visible para asesor si aplica;
- trazabilidad.

## 3. Campos base recomendados

- id
- tenantId
- pais
- moneda si aplica
- origen
- canal
- solicitanteTipo
- solicitanteId
- clienteId
- asesorId
- polizaId
- cobroId
- reclamoId
- documentoIds[]
- conciliacionId
- tipoGestion
- subTipoGestion
- titulo
- descripcion
- moduloDestino
- listaDestino
- responsableRol
- responsableId
- prioridad
- slaHoras
- vence
- estado
- estadoCliente
- estadoAsesor
- checklist[]
- comentarios[]
- bitacora[]
- notificaciones[]
- createdBy
- createdAt
- updatedAt
- closedAt
- archivado

## 4. Tipos canónicos iniciales

- pago_reportado
- solicitud_documento
- carga_documento
- actualizacion_datos_cliente
- consulta_cliente
- gestion_poliza
- emision
- endoso
- renovacion
- cancelacion
- reclamo_siniestro
- solicitud_cobro
- solicitud_comercial
- requerimiento_aseguradora
- soporte_portal
- gestion_administrativa
- escalamiento

## 5. Listas destino recomendadas

- conciliacion_cobros
- cobros_cartera
- documentos_soportes
- cliente360_datos
- polizas_emision_endosos
- renovaciones
- cancelaciones_retencion
- siniestros_reclamos
- leads_comercial
- soporte_portal
- aseguradoras_requerimientos
- administrativa_general
- urgentes_escaladas

## 6. Estados internos

- nuevo
- recibido
- asignado
- en_revision
- en_gestion
- esperando_informacion
- pendiente_documento
- pendiente_conciliacion
- requiere_validacion
- aprobado
- rechazado
- resuelto
- cerrado
- vencido
- escalado

## 7. Estados visibles para cliente

- recibido
- en_revision
- esperando_informacion
- aplicado
- resuelto
- rechazado
- cerrado

## 8. Estados visibles para asesor

- recibido
- asignado
- en_gestion
- esperando_cliente
- pendiente_operativo
- resuelto
- vencido
- escalado

## 9. Reglas de ruteo inicial

- `pago_reportado` → `conciliacion_cobros`, responsable `cobros_operativo`, notifica asesor y cliente.
- `solicitud_documento` / `carga_documento` → `documentos_soportes`, responsable `operativo`, notifica asesor si afecta cliente.
- `actualizacion_datos_cliente` → `cliente360_datos`, responsable `operativo`, notifica asesor.
- `renovacion` → `renovaciones`, responsable `renovaciones/asesor`, notifica asesor y cliente.
- `cancelacion` → `cancelaciones_retencion`, responsable `operativo/asesor`, notifica asesor y cliente.
- `reclamo_siniestro` → `siniestros_reclamos`, responsable `reclamos_operativo`, notifica asesor y cliente.
- `solicitud_comercial` → `leads_comercial`, responsable `asesor`, notifica asesor.
- `soporte_portal` → `soporte_portal`, responsable `operativo/admin`, notifica cliente y asesor si afecta servicio.
- `gestion_administrativa` → `administrativa_general`, solo cuando no encaja en flujos específicos.
- `escalamiento` → `urgentes_escaladas`, responsable `direccion/responsable`, notificación según impacto.

## 10. Reglas para pagos reportados

Una gestión `pago_reportado` debe tener o vincular:

- `cobroId`;
- `clienteId`;
- `asesorId`;
- `documentoIds[]` si hay soporte;
- `conciliacionId`;
- `estado = pendiente_conciliacion` o `en_revision`;
- `estadoCliente = recibido`;
- `estadoAsesor = recibido`.

No puede quedar en `administrativa_general` ni marcar cobro como pagado.

## 11. Notificaciones mínimas

Cada gestión relevante debe registrar eventos en `notificaciones[]` o entidad relacionada:

- recepción al solicitante;
- aviso al responsable;
- aviso al asesor si afecta cliente;
- aviso a Cobros si es pago;
- aviso al cliente cuando cambia estado;
- aviso de vencimiento/escalamiento.

## 12. Bitácora mínima

Cada cambio debe registrar:

- fecha/hora;
- actor;
- rol;
- acción;
- estado anterior;
- estado nuevo;
- campo cambiado;
- comentario;
- documentoIds[] si aplica;
- notificaciones generadas.

## 13. Anti-regresiones

No se permite:

- `pago_reportado` en lista administrativa general;
- adjunto sin `documentoIds[]` o referencia documental;
- gestión de cliente sin `asesorId` si el cliente tiene asesor;
- solicitud de Portal sin `estadoCliente`;
- cambio de estado sin bitácora;
- notificación sin audiencia.

## 14. Academia y manuales

Este contrato afecta:

- manual Ops;
- manual Portal;
- manual Cobros;
- manual Cliente360;
- ruta Asesor nuevo;
- ruta Administrativo/Operativo;
- ruta Cliente nuevo;
- evaluaciones sobre trazabilidad y gestión de solicitudes.

## 15. Estado

Contrato documental listo. No implementa Firestore ni modifica `data/store.js`. Debe usarse para validadores, smoke y corrección frontend/backend futura.
