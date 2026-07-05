# Contrato Cobros — facturas, soportes, Cliente360 y Portal

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: contrato funcional/backend. Sin Firestore real. Sin Storage real. Sin deploy. Sin merge. Sin datos reales.

## 1. Objetivo

Permitir que en Cobros se adjunte factura, recibo, comprobante o soporte al cliente y al recibo/cobro correspondiente, para apoyar conciliación y trazabilidad.

## 2. Regla principal

Todo documento adjunto a un cobro debe quedar relacionado con:

- tenantId;
- clienteId;
- polizaId;
- cobroId o reciboId;
- documentoId;
- tipoDocumento;
- monto;
- moneda;
- fecha;
- estado de pago;
- estado de conciliación;
- visibilidad para cliente;
- trazabilidad.

## 3. Tipos de documento

- factura;
- recibo;
- comprobante_pago;
- soporte_pago;
- nota_credito;
- estado_cuenta_aseguradora;
- planilla_comisiones;
- otro_validado.

## 4. Cliente360

Cliente360 debe mostrar en la sección de pagos/cobros:

- factura o documento adjunto;
- datos del documento;
- estado de pago;
- estado de conciliación;
- póliza relacionada;
- historial de cambios;
- usuario/proceso que adjuntó;
- si es visible para cliente.

## 5. Portal Cliente

El cliente puede visualizar documentos marcados como visibles para cliente:

- factura;
- recibo;
- soporte asociado;
- estado de pago;
- estado de conciliación en lenguaje simple.

No debe ver documentos internos o privados.

## 6. Conciliación

Un documento adjunto puede alimentar conciliación, pero no debe aplicar pago por sí solo sin regla o validación.

Estados sugeridos:

- pendiente_revision;
- pendiente_conciliacion;
- conciliado;
- rechazado;
- requiere_validacion;
- aplicado;
- anulado.

## 7. Reglas de seguridad

No guardar archivos reales en seed.
No exponer links públicos sin control de permisos.
No mostrar documentos privados al portal cliente.
No marcar como pagado sin validación o fuente confiable.

## 8. Impacto transversal

Cuando se adjunta o valida factura/soporte, puede impactar:

- Cobros;
- Cliente360;
- Portal Cliente;
- Notificaciones;
- Ops;
- Analíticas;
- producción/metas si aplica pago;
- comisiones/liquidaciones si corresponde.

## 9. Academia y manuales

Actualizar:

- manual Cobros;
- manual Cliente360;
- manual Portal Cliente;
- ruta Administrativo/Operativo;
- ruta Cobros;
- evaluación sobre conciliación y documentos.

## 10. Estado

Contrato creado. Debe guiar frontend, backend y validadores futuros.
