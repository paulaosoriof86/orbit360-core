# Contrato documentos, adjuntos y gestiones — LAB A&S

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato backend/documental. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir cómo deben relacionarse `documentos`, adjuntos y `gestiones` para que ningún soporte cargado desde Portal, Cobros, Cliente360, Pólizas, Siniestros, Aseguradoras o Importador se pierda.

Este contrato responde al hallazgo reportado por Paula: el cliente reporta un pago y adjunta soporte; aparece la gestión/log, pero no aparece el adjunto.

## 2. Principio obligatorio

Toda acción que acepte un archivo debe crear o referenciar un documento persistente.

No basta guardar texto en un log. Si hay adjunto, debe existir referencia navegable para los roles autorizados.

## 3. Colecciones involucradas

- `documentos`
- `gestiones`
- `actividades`
- `conciliacionBanco`
- `cobros`
- `clientes`
- `polizas`
- `reclamos`

## 4. Documento base

Campos mínimos recomendados para `documentos`:

- id
- tenantId
- pais
- moneda si aplica
- tipoDocumento
- nombreArchivo
- mimeType
- sizeBytes
- storagePath
- urlPrivada
- checksum
- entidadTipo
- entidadId
- clienteId
- polizaId
- cobroId
- reclamoId
- gestionId
- conciliacionId
- visibleParaCliente
- visibleParaAsesor
- visibleParaOperativo
- estadoDocumento
- origen
- trazabilidad
- createdBy
- createdAt
- updatedAt

## 5. Estados de documento

- recibido
- pendiente_revision
- validado
- rechazado
- reemplazado
- bloqueado
- requiere_config_privada

## 6. Gestión con adjunto

Campos mínimos en `gestiones` cuando exista soporte:

- id
- tenantId
- tipoGestion
- origen
- clienteId
- asesorId
- moduloOrigen
- estado
- prioridad
- descripcion
- documentoIds[]
- conciliacionId si aplica
- createdBy
- asignadoA
- createdAt
- updatedAt

Regla: si `documentoIds[]` no existe o está vacío pero la acción recibió archivo, el flujo está incompleto.

## 7. Pago reportado desde Portal

Flujo esperado:

1. Cliente carga soporte.
2. Se crea `documentos` con entidad `conciliacionBanco` o `cobro` pendiente.
3. Se crea `gestiones` con `documentoIds[]`.
4. Se crea `conciliacionBanco` con `documentoId` o `adjuntos[]`.
5. Cobros/Operativo recibe notificación con enlace al soporte.
6. Cliente ve estado: recibido, en revisión, aplicado, rechazado o requiere información.
7. El recibo/cobro no cambia a pagado hasta conciliación autorizada.

## 8. Reglas por módulo

### Portal

Debe mostrar al cliente estado de solicitud y soporte cargado, sin exponer rutas internas ni datos de otros clientes.

### Cobros

Debe mostrar soporte del pago reportado, coincidencia sugerida y decisión de conciliación.

### Cliente360

Debe mostrar documentos del expediente del cliente, incluyendo soportes de pago si el rol tiene permiso.

### Pólizas

Debe mostrar documentos relacionados con póliza, emisión, renovación, endosos y recibos.

### Siniestros

Debe mostrar soportes de reclamo y trazabilidad de revisión.

### Aseguradoras

Puede guardar documentos comerciales, clausulados o requisitos, pero accesos/credenciales privadas deben quedar fuera de UI cliente.

## 9. Seguridad y visibilidad

Los documentos deben tener control por:

- tenantId;
- rol;
- entidad relacionada;
- país;
- visibilidad cliente/asesor/operativo;
- estado del documento.

No exponer URL pública permanente si el backend real no tiene control de permisos.

## 10. Notificaciones

Cuando se cree documento relevante, debe poder generarse notificación:

- a operativo/cobros por pago reportado;
- a asesor por solicitud de cliente;
- a cliente por recepción/validación/rechazo;
- a administración por documentos vencidos o pendientes.

## 11. Academia y manuales

Cada ajuste de documentos/adjuntos debe actualizar:

- manual de Portal;
- manual de Cobros;
- curso de Administrativo/Operativo;
- curso de Cliente nuevo;
- evaluación sobre reporte de pagos y soportes;
- notificación de actualización si el flujo cambia.

## 12. Criterio de aceptación futuro

El flujo se considera correcto cuando:

- el adjunto se conserva;
- la gestión referencia el adjunto;
- Cobros/Operativo puede abrirlo;
- el cliente ve estado del reporte;
- no se aplica pago sin validación;
- la trazabilidad muestra origen, usuario, fecha, módulo y entidad relacionada.

## 13. Estado

Contrato documental listo. No implementa Storage ni Firestore todavía. Debe guiar el siguiente smoke/backend de Portal + Cobros + Documentos.
