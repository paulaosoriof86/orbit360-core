# Errata auditoria v1.80 - Recaudo no es finmov real

Fecha: 2026-07-02
Estado: CORRECCION SOBRE AUDITORIA PROFUNDA V1.80

## Correccion

La auditoria profunda describio como mejora que `Orbit.q.postRecaudo` llevara pagos aplicados a `finmovs`. Esa interpretacion queda corregida.

Un pago aplicado por cliente a una poliza no es ingreso financiero real de A&S. Usualmente es prima pagada a la aseguradora.

## Regla actualizada

Pago aplicado debe afectar:

- cartera del cliente,
- estado de cuenta,
- recaudo comercial,
- metas de recaudo,
- produccion recaudada,
- comision estimada,
- liquidacion esperada de aseguradora,
- analitica comercial.

Pago aplicado no debe crear movimiento financiero real en `finmovs`.

`finmovs` se reserva para ingresos y egresos reales de la empresa: comision recibida, factura cobrada, liquidacion pagada por aseguradora, pago real a asesor, gasto operativo, proveedor o movimiento bancario.

## Pendiente para Claude

Corregir el prototipo base para que aplicar pago no registre ingreso en Finanzas como movimiento real. Debe mostrarse como recaudo/estimado y como base de comision esperada.

## Pendiente para backend

Separar colecciones y estados:

- recaudos o carteraEventos,
- comisionesEstimadas,
- liquidacionesEsperadas,
- cuentas por cobrar a aseguradora,
- finmovs solo para movimientos reales.

## Relacion con documentos

Complementa y corrige cualquier frase previa que indique pago aplicado directo a `finmovs`.
Ver tambien `docs/DECISION-RECAUDO-VS-FINMOVS-20260702.md`.
