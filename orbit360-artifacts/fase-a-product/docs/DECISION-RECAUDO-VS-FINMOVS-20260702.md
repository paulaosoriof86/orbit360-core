# Decision negocio/backend - Recaudo vs movimientos financieros

Fecha: 2026-07-02
Estado: DECISION APLICABLE A PROTOTIPO BASE Y BACKEND

## Decision

Un pago aplicado por el cliente a una poliza NO debe registrarse como movimiento financiero real de la empresa.

Ese pago normalmente corresponde a prima pagada a la aseguradora. Para A&S representa recaudo comercial, cartera al dia, base para metas de recaudo y estimacion de comision, pero no es ingreso de caja/banco de la empresa.

## Regla correcta

### Pago aplicado de cliente

Debe impactar:

- estado de cuenta del cliente,
- cartera,
- recaudo,
- metas de recaudo,
- produccion recaudada,
- estimado de comision,
- liquidacion esperada de aseguradora,
- analitica comercial.

No debe crear movimiento financiero real en `finmovs`.

### Movimiento financiero real

Solo debe registrarse en `finmovs` cuando existe impacto directo en dinero de la empresa, por ejemplo:

- ingreso real por comision recibida,
- pago de factura emitida a aseguradora,
- liquidacion pagada por aseguradora,
- egreso real a asesor,
- pago a proveedor,
- gasto operativo,
- transferencia bancaria,
- ajuste financiero real.

## Correccion sobre v1.80

La mejora descrita como `postRecaudo` hacia `finmovs` debe reclasificarse.

No debe interpretarse como ingreso financiero real. El helper debe cambiar de enfoque:

- de `postRecaudo` a `registrarRecaudoComercial`, o
- mantener nombre solo si escribe en una coleccion no contable como `recaudos`, `carteraEventos`, `comisionesEstimadas` o `liquidacionesEsperadas`.

## Accion para Claude

Claude debe corregir el prototipo base para que aplicar pago no cree un movimiento financiero real. Debe reflejarse como recaudo/estimado, no como ingreso de empresa.

## Accion para ChatGPT/Codex

Backend debe separar:

- recaudo comercial,
- comision estimada,
- cuenta por cobrar a aseguradora,
- movimiento financiero real.

`finmovs` queda reservado para ingresos y egresos reales de la empresa.
