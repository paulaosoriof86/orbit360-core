# Contrato colección `conciliacionBanco` — LAB A&S

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato backend/documental. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Definir la colección `conciliacionBanco` como bandeja segura para estados de cuenta bancarios, pagos reportados y soportes pendientes de validación.

Esta colección evita el error crítico de convertir movimientos bancarios en cobros, cartera, producción o `finmovs` sin conciliación.

## 2. Alcance

`conciliacionBanco` recibe o referencia:

- movimientos de estado de cuenta bancario importado;
- pagos reportados por cliente desde Portal;
- soportes adjuntos de pago;
- coincidencias sugeridas con póliza, recibo, cliente o asesor;
- estado de revisión del área operativa/cobros.

## 3. Regla principal

Un registro en `conciliacionBanco` NO es cobro aplicado.

No debe impactar:

- cartera;
- producción;
- comisiones;
- recibos pagados;
- `finmovs`;
- pólizas;
- clientes.

Solo después de validación/conciliación explícita puede generar una acción posterior en la colección que corresponda.

## 4. Campos base recomendados

- id
- tenantId
- pais
- moneda
- fechaMovimiento
- fechaReporte
- origen
- tipoOrigen
- monto
- referenciaBanco
- descripcionBanco
- clienteIdSugerido
- polizaIdSugerida
- reciboIdSugerido
- asesorIdSugerido
- documentoId
- adjuntos
- estadoConciliacion
- coincidencias
- decision
- validacion
- trazabilidad
- createdAt
- updatedAt

## 5. Estados permitidos

- pendiente_conciliacion
- requiere_validacion
- sugerido
- conciliado
- rechazado
- duplicado_probable
- bloqueado

## 6. Orígenes permitidos

- portal_cliente_pago_reportado
- estado_cuenta_bancario
- carga_manual_operativa
- planilla_aseguradora_referencia
- conciliacion_importador

## 7. Reglas de país y moneda

GT usa GTQ. CO usa COP. Si falta país o moneda confiable, el estado debe ser `requiere_validacion`.

Nunca sumar GTQ y COP en crudo.

## 8. Relación con documentos

Si hay soporte adjunto, debe existir o referenciarse un registro en `documentos`.

El registro de conciliación debe guardar:

- `documentoId` principal si existe un soporte;
- `adjuntos[]` si hay más de un archivo;
- trazabilidad de quién lo cargó o desde qué fuente llegó;
- estado visible para cliente y operativo cuando aplique.

## 9. Regla para Portal

Cuando un cliente reporta un pago y adjunta soporte:

1. se crea gestión/log de solicitud;
2. se crea o referencia documento soporte;
3. se crea registro `conciliacionBanco` en `pendiente_conciliacion`;
4. Cobros/Operativo debe poder ver el adjunto;
5. el cliente debe ver estado de recepción y revisión;
6. no se marca recibo como pagado sin validación.

## 10. Acciones permitidas después de conciliar

Solo después de revisión autorizada:

- aplicar pago a recibo/cobro;
- marcar coincidencia como rechazada;
- pedir información adicional al cliente;
- crear actividad o gestión interna;
- enviar notificación.

## 11. Anti-contaminación

Desde `conciliacionBanco` no se permite crear automáticamente:

- clientes;
- pólizas;
- cartera;
- producción;
- comisiones;
- `finmovs`.

Si se requiere un movimiento financiero contable posterior, debe generarse por flujo explícito y no por importación directa del banco.

## 12. Estado

Contrato documental listo. No autoriza carga LAB ni Firestore. Debe usarse para próximos validadores, smoke de Portal/Cobros y revisión de adjuntos.
