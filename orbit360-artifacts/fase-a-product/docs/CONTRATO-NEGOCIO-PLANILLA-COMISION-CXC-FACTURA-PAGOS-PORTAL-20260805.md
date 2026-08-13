# CONTRATO DE NEGOCIO — PLANILLAS DE COMISIÓN, CxC, FACTURAS Y PAGOS REPORTADOS

Fecha: 2026-08-05  
RC: `RC-AYS-LAB-CANONICA-01`  
Estado: requisito vinculante registrado; implementación incremental no bloqueante para la recuperación de acceso

## 1. Evento económico primario

La **planilla de comisiones de la aseguradora** es el evento económico primario. No debe esperar a que A&S emita o cargue una factura para producir efectos operativos y financieros.

Cuando una planilla detallada sea confirmada, debe generar de forma idempotente y trazable:

1. reconocimiento de la comisión causada por póliza, recibo o cuota;
2. conciliación de la liquidación de comisiones con la aseguradora;
3. base de liquidación de comisiones a asesores, según reglas y porcentajes vigentes;
4. cuenta por cobrar a la aseguradora por el valor reconocido a favor de A&S;
5. propuestas de conciliación de cobros de primas cuando la planilla aporte evidencia suficiente, como carril separado;
6. auditoría por archivo, hoja, bloque, fila, país, moneda y periodo.

La planilla no crea automáticamente un cobro de prima cuando falte contraparte suficiente. La conciliación de primas y la causación de comisión son efectos relacionados, pero independientes.

## 2. Factura posterior

La factura emitida por A&S es un soporte fiscal y de trazabilidad posterior. Debe vincularse inteligentemente con la cuenta por cobrar ya originada por la planilla mediante:

- aseguradora;
- periodo;
- moneda;
- valor;
- rango de fechas;
- referencia de planilla;
- número de factura;
- diferencias o notas crédito/débito.

La factura debe completar la CxC con número, fecha, valor facturado, documento y estado de conciliación. No debe originar nuevamente la CxC ni duplicar el ingreso causado por la planilla.

Si existe factura sin planilla, queda en `REQUIERE_VALIDACION` o soporte pendiente de contraparte. Si existe planilla sin factura, la CxC permanece causada y pendiente de facturación/vinculación.

## 3. Cuentas por pagar y liquidación a asesores

La planilla confirmada debe alimentar la liquidación de asesores según:

- asesor de la póliza o regla de asignación aprobada;
- prima neta recaudada;
- comisión reconocida por la aseguradora;
- porcentaje o tarifa vigente;
- país, moneda y periodo;
- HOLD por vendedor, póliza, comisión o contraparte ambigua.

La CxP al asesor no se genera desde la factura de A&S. Se origina desde la planilla y su liquidación aprobada.

## 4. Pago reportado por el cliente

El Portal debe permitir que el cliente reporte un pago y adjunte soporte. El reporte debe:

1. quedar en su ficha e historial documental;
2. intentar vincularse al requerimiento activo más antiguo elegible, respetando póliza, aseguradora, moneda, monto, fecha y vigencia;
3. crear una propuesta, nunca una aplicación automática definitiva;
4. generar una gestión para Carlos u otro responsable operativo configurado;
5. permitir aprobar, poner en HOLD, rechazar o marcar `aplicado_en_aseguradora`;
6. preservar antes/después, motivo, actor y fecha;
7. reflejar el estado al cliente sin exponer información interna.

Si el cliente tiene pólizas en varias aseguradoras, el motor debe ponderar póliza, aseguradora, requerimiento, monto, fecha y documento; una coincidencia ambigua queda en validación.

## 5. Pago recibido o gestionado internamente

Carlos u otro usuario autorizado debe poder registrar o aplicar el pago:

- desde el listado de Cobros/Pagos;
- desde la ficha Cliente 360;
- desde el requerimiento o recibo;
- desde Conciliaciones.

La aplicación debe conservar evidencia y no saltarse la validación de póliza, aseguradora, cuota, moneda y monto.

## 6. Factura o recibo emitido por aseguradora

El documento emitido por la aseguradora para el pago de prima es opcional como requisito operativo, pero debe poder adjuntarse:

- al pago;
- al recibo/requerimiento;
- a la póliza;
- al expediente documental visible para el cliente cuando corresponda.

También debe existir una categoría de importación para facturas/documentos de cobro de aseguradora. El motor propondrá la contraparte por cliente, póliza, aseguradora, fecha, moneda, monto y requerimiento. Una coincidencia no determinística exige confirmación.

## 7. Importador inteligente transversal

El importador inteligente futuro y reusable debe servir para clientes, pólizas, vehículos, recibos, cartera, pagos, planillas, facturas, comisiones, banco y documentos. Debe:

- aceptar Excel, CSV, PDF, Word e imagen;
- detectar estructura, encabezados y sinónimos;
- proponer mapeo corregible y aprender perfiles reutilizables por tenant/fuente;
- extraer documentos no tabulares mediante backend inteligente;
- deduplicar por hash y claves de dominio;
- calcular calidad y contradicciones;
- producir dry-run crear/actualizar/omitir/requiere validación;
- conservar diff, trazabilidad, confirmación, auditoría y rollback;
- nunca escribir banco → cobro ni documento → entidad definitiva sin conciliación.

## 8. Orden operativo canónico

```text
planilla confirmada
  → comisión causada
  → CxC aseguradora
  → base liquidación asesores / CxP condicionada
  → evidencia para conciliación de primas

factura A&S posterior
  → vincula número, fecha, valor y soporte fiscal a la CxC existente
  → no duplica causación

pago aseguradora a A&S
  → concilia banco + CxC + factura + planilla
  → marca recaudo financiero confirmado
```

## 9. Clasificación para implementación

- Planilla como evento primario CxC/CxP: `FUNCTIONAL_DEFECT` si la lógica vigente depende de factura.
- Vinculación planilla ↔ factura: `DATA_CONTRACT_FAILURE` si faltan claves o estados.
- Pago Portal → propuesta → gestión operativa: `REPLICABLE_CLAUDE_ACUMULADO` + backend durable.
- Factura de aseguradora opcional y visible al cliente: `REPLICABLE_CLAUDE_ACUMULADO` + contrato documental.
- Importador universal inteligente: `REPLICABLE_CLAUDE_ACUMULADO`, `ACADEMIA_ACTUALIZAR` y backend protegido.

## 10. Frontera actual

Este registro no autoriza escrituras financieras ni despliegues adicionales. El Bloque 4 continúa read-only y la recuperación de acceso se ejecuta por un gate separado. Ningún requisito aquí se pierde ni se convierte en bloqueo artificial del acceso LAB.
